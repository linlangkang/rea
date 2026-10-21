"""Create an independent UE lighting stage from the validated shared layout.
Does not overwrite imported geometry or move furniture; records actual captures.
"""
import json, time, math
from pathlib import Path
import unreal

root=Path(unreal.Paths.project_dir()).resolve()
# A requested asset refresh runs inside the existing editor, preserving old assets/maps.
request_path=root/'Saved/frost-editor-request.json'
request=json.loads(request_path.read_text(encoding='utf-8-sig')) if request_path.exists() else {}
if request.get('refreshGeometry',False):
    for script in ['import_room.py','room_sample.py']:
        scope={'__name__':'__frost_refresh__','FROST_SKIP_CAPTURE':True}
        exec(compile((root/'Content/Python'/script).read_text(encoding='utf-8'),script,'exec'),scope)
out=root.parent.parent/'output/unreal/cinematic'
out.mkdir(parents=True,exist_ok=True)
source=json.loads((out.parent/'room-sample.json').read_text(encoding='utf-8'))
actors=unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
levels=unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
if not levels.load_level(source['level']):raise RuntimeError('Validated room missing')
world=unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
original=list(actors.get_all_level_actors())
fridge_doors=[]
for a in original:
    if a.get_actor_label().startswith('fridge_door_'):
        a.set_actor_relative_rotation(unreal.Rotator(yaw=-math.degrees(1.65) if request.get('fridgeOpen',False) else 0),False,False)
        fridge_doors.append(a.get_actor_label())
positions={a.get_actor_label():[a.get_actor_location().x,a.get_actor_location().y,a.get_actor_location().z] for a in original if a.get_actor_label().startswith('instance_')}
for a in original:
    if isinstance(a,unreal.Light):actors.destroy_actor(a)

# Keep original imported materials intact. Replace only leather slot overrides.
mel=unreal.MaterialEditingLibrary
tools=unreal.AssetToolsHelpers.get_asset_tools()
maps={}
for channel in ['nor_dx','Rough']:
    name='leather_white_'+channel
    path='/Game/Frost/Cinematic/Textures/'+name
    if not unreal.EditorAssetLibrary.does_asset_exist(path):
        task=unreal.AssetImportTask();task.filename=str(root.parent.parent/'public/materials'/('leather_white-'+channel+'.jpg'))
        task.destination_path='/Game/Frost/Cinematic/Textures';task.destination_name=name;task.automated=True;task.save=True
        tools.import_asset_tasks([task])
    texture=unreal.load_asset(path)
    texture.set_editor_property('srgb',False)
    texture.set_editor_property('compression_settings',unreal.TextureCompressionSettings.TC_NORMALMAP if channel=='nor_dx' else unreal.TextureCompressionSettings.TC_MASKS)
    unreal.EditorAssetLibrary.save_loaded_asset(texture);maps[channel]=texture
replacement={};glass_count=0;leather_count=0
for a in original:
    component=a.get_component_by_class(unreal.StaticMeshComponent)
    if not component:continue
    for index,old in enumerate(component.get_materials()):
        if not old:continue
        blend=old.get_base_material().get_editor_property('blend_mode')
        if isinstance(old,unreal.MaterialInstanceConstant):
            overrides=old.get_editor_property('base_property_overrides')
            if overrides.get_editor_property('override_blend_mode'):blend=overrides.get_editor_property('blend_mode')
        if 'glass' in old.get_name().lower() or blend==unreal.BlendMode.BLEND_TRANSLUCENT:
            component.set_editor_property('disallow_nanite',True);glass_count+=1
        if old.get_name().startswith('surface_foliage'):
            path='/Game/Frost/Cinematic/Materials/M_Foliage'
            foliage=unreal.load_asset(path) if unreal.EditorAssetLibrary.does_asset_exist(path) else tools.create_asset('M_Foliage','/Game/Frost/Cinematic/Materials',unreal.Material,unreal.MaterialFactoryNew())
            if 'foliage' not in replacement:
                mel.delete_all_material_expressions(foliage);foliage.set_editor_property('two_sided',True)
                base=mel.create_material_expression(foliage,unreal.MaterialExpressionConstant3Vector);base.constant=unreal.LinearColor(.12,.25,.065,1)
                mel.connect_material_property(base,'',unreal.MaterialProperty.MP_BASE_COLOR)
                rough=mel.create_material_expression(foliage,unreal.MaterialExpressionConstant);rough.r=.78
                mel.connect_material_property(rough,'',unreal.MaterialProperty.MP_ROUGHNESS)
                mel.recompile_material(foliage);unreal.EditorAssetLibrary.save_loaded_asset(foliage);replacement['foliage']=foliage
            component.set_material(index,foliage)
        if not old.get_name().startswith('surface_leather'):continue
        key=old.get_path_name()
        if key not in replacement:
            name='M_'+old.get_name();path='/Game/Frost/Cinematic/Materials/'+name
            mat=unreal.load_asset(path) if unreal.EditorAssetLibrary.does_asset_exist(path) else tools.create_asset(name,'/Game/Frost/Cinematic/Materials',unreal.Material,unreal.MaterialFactoryNew())
            mel.delete_all_material_expressions(mat)
            color=unreal.LinearColor(.75,.78,.82,1)
            for parameter in mel.get_vector_parameter_names(old):
                if 'basecolor' in str(parameter).lower().replace('_',''):
                    color=mel.get_material_instance_vector_parameter_value(old,parameter);break
            base=mel.create_material_expression(mat,unreal.MaterialExpressionConstant3Vector);base.constant=color
            mel.connect_material_property(base,'',unreal.MaterialProperty.MP_BASE_COLOR)
            uv=mel.create_material_expression(mat,unreal.MaterialExpressionTextureCoordinate)
            # Imported furniture uses metric UV; source scan spans 3 meters.
            uv.set_editor_property('u_tiling',1/3);uv.set_editor_property('v_tiling',1/3)
            for channel,prop in [('nor_dx',unreal.MaterialProperty.MP_NORMAL),('Rough',unreal.MaterialProperty.MP_ROUGHNESS)]:
                sample=mel.create_material_expression(mat,unreal.MaterialExpressionTextureSample);sample.texture=maps[channel]
                sample.set_editor_property('sampler_type',unreal.MaterialSamplerType.SAMPLERTYPE_NORMAL if channel=='nor_dx' else unreal.MaterialSamplerType.SAMPLERTYPE_MASKS)
                mel.connect_material_expressions(uv,'',sample,'UVs');mel.connect_material_property(sample,'RGB' if channel=='nor_dx' else 'R',prop)
            mel.recompile_material(mat);unreal.EditorAssetLibrary.save_loaded_asset(mat);replacement[key]=mat
        component.set_material(index,replacement[key]);leather_count+=1

def vec(p):return unreal.Vector(-p[2]*100,p[0]*100,p[1]*100)

# Shoes rest on the room floor; never recreate the old foot platform.
for a in actors.get_all_level_actors():
    if a.get_actor_label()=='Frost_Character_FootSupport':actors.destroy_actor(a)

def rect(name,p,target,intensity,width,height,color):
    a=actors.spawn_actor_from_class(unreal.RectLight,vec(p),unreal.MathLibrary.find_look_at_rotation(vec(p),vec(target)))
    a.set_actor_label(name)
    c=a.light_component;c.set_mobility(unreal.ComponentMobility.MOVABLE)
    c.set_editor_property('intensity_units',unreal.LightUnits.LUMENS)
    c.set_intensity(intensity);c.set_light_color(unreal.LinearColor(*color))
    c.set_editor_property('source_width',width);c.set_editor_property('source_height',height)
    c.set_editor_property('attenuation_radius',900)
    return a

sun=actors.spawn_actor_from_class(unreal.DirectionalLight,unreal.Vector(0,0,400),unreal.Rotator(pitch=-24,yaw=90))
sun.set_actor_label('Frost_LateAfternoon_Key')
sun.light_component.set_mobility(unreal.ComponentMobility.MOVABLE)
sun.light_component.set_intensity(1.1)
sun.light_component.set_light_color(unreal.LinearColor(1,.86,.70,1))
sun.light_component.set_editor_property('light_source_angle',2.0)
sky=actors.spawn_actor_from_class(unreal.SkyLight,unreal.Vector(0,0,300))
sky.set_actor_label('Frost_HDRI_Fill')
sky.light_component.set_mobility(unreal.ComponentMobility.MOVABLE)
sky.light_component.set_editor_property('source_type',unreal.SkyLightSourceType.SLS_SPECIFIED_CUBEMAP)
sky.light_component.set_editor_property('cubemap',unreal.load_asset('/Game/Frost/Lighting/environment.environment'))
sky.light_component.set_intensity(.85)
rect('Frost_Window_Softbox',[-3.48,2.15,-.7],[-1.5,1,-.7],50,280,180,(.8,.9,1,1))
rect('Frost_Warm_Interior_Bounce',[-.6,2.55,.1],[-2.7,1,-.8],25,190,100,(1,.86,.73,1))
rect('Frost_Ceiling_ReadingFill',[1.4,2.78,0],[1.45,.4,-.2],35,75,75,(1,.92,.8,1))
rect('Frost_Ceiling_ConsoleFill',[1.4,2.78,2.6],[3,.6,1.65],60,75,75,(1,.92,.8,1))
fridge_light=rect('Frost_Fridge_Interior',[3.16,1.55,-2.95],[3.60,.72,-2.95],3,46,8,(.87,.94,1,1))
fridge_light.light_component.set_editor_property('attenuation_radius',145)

pp=unreal.PostProcessSettings()
for key,val in {'override_auto_exposure_method':True,'auto_exposure_method':unreal.AutoExposureMethod.AEM_MANUAL,
 'override_auto_exposure_apply_physical_camera_exposure':True,'auto_exposure_apply_physical_camera_exposure':False,
 'override_bloom_intensity':True,'bloom_intensity':.08,
 'override_dynamic_global_illumination_method':True,'dynamic_global_illumination_method':unreal.DynamicGlobalIlluminationMethod.LUMEN,
 'override_reflection_method':True,'reflection_method':unreal.ReflectionMethod.LUMEN}.items():pp.set_editor_property(key,val)
volume=actors.spawn_actor_from_class(unreal.PostProcessVolume,unreal.Vector())
volume.set_actor_label('Frost_Cinematic_Exposure');volume.set_editor_property('unbound',True);volume.set_editor_property('settings',pp)

cameras={}
for name,p,t,fov in [('hero',[-1.1,1.45,-2.9],[-2.94,1,-.66],58),('pc',[-2.65,1.22,-2.43],[-3.23,1.03,-1.75],48),('keyboard',[-2.55,1.1,-.5],[-2.95,.8,-.67],48)]:
    p[0]-=1;t[0]-=1
    c=actors.spawn_actor_from_class(unreal.CameraActor,vec(p),unreal.MathLibrary.find_look_at_rotation(vec(p),vec(t)))
    c.set_actor_label('Frost_Cinematic_'+name)
    c.camera_component.set_field_of_view(fov)
    c.camera_component.set_editor_property('post_process_settings',pp)
    cameras[name]=c
exec(compile((root/'Content/Python/runtime_surfaces.py').read_text(encoding='utf-8'),'runtime_surfaces.py','exec'),{'__name__':'__frost_surfaces__'})
camera=cameras['hero']
for name,p,t in [('headset',[-2.9,1.13,-1.18],[-3.29,1,-1.42]),('sofa',[1.7,1.25,1.35],[-.05,.58,-.45]),('coffee',[2.8,1.05,.6],[1.58,.42,-.4]),('feet',[-2.9,.36,.0],[-2.74,.12,-.63]),('hands',[-2.88,1.20,.05],[-2.84,.8,-.52]),('plant',[1.9,1.2,3.05],[3.3,.68,1.65]),('fridge',[.9,1.38,-3.6],[3.43,.92,-2.95]),('snacks',[.9,1.55,-1.8],[3.64,1.24,-1.88])]:
    if name in ['headset','feet','hands']:p[0]-=1;t[0]-=1
    if name in ['fridge','snacks']:p[0]+=1;t[0]+=1;p[2]-=.5;t[2]-=.5
    c=actors.spawn_actor_from_class(unreal.CameraActor,vec(p),unreal.MathLibrary.find_look_at_rotation(vec(p),vec(t)))
    c.set_actor_label('Frost_Cinematic_'+name);c.camera_component.set_field_of_view(40)
    if name=='plant':c.camera_component.set_field_of_view(58)
    if name in ['fridge','snacks']:c.camera_component.set_field_of_view(48)
    cameras[name]=c
unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).set_level_viewport_camera_info(camera.get_actor_location(),camera.get_actor_rotation())
level='/Game/LocalOnly/Cinematic/Frost_'+time.strftime('%Y%m%d_%H%M%S')
if not unreal.EditorLoadingAndSavingUtils.save_map(world,level):raise RuntimeError('Cannot save cinematic level')
after={a.get_actor_label():[a.get_actor_location().x,a.get_actor_location().y,a.get_actor_location().z] for a in actors.get_all_level_actors() if a.get_actor_label().startswith('instance_')}
if positions!=after:raise RuntimeError('Furniture placement changed')
audit=[]
for a in actors.get_all_level_actors():
    c=a.get_component_by_class(unreal.StaticMeshComponent)
    if c:
        for m in c.get_materials():
            if m and m.get_path_name() not in [v['path'] for v in audit]:
                audit.append({'path':m.get_path_name(),'name':m.get_name()})
report={'level':level,'sourceLevel':source['level'],'layoutUnchanged':True,'captureComplete':False,'materials':audit,'glassNaniteOverrides':glass_count,'leatherSlotsRebuilt':leather_count,
 'foliageMaterialRebuilt':'foliage' in replacement,'fridgeDoors':fridge_doors,'fridgeRequestedOpen':request.get('fridgeOpen',False),
 'cameras':{name:{'positionCm':[c.get_actor_location().x,c.get_actor_location().y,c.get_actor_location().z],'fov':c.camera_component.field_of_view} for name,c in cameras.items()},
 'rendering':'DX12 SM6, software Lumen requested; confirm engine log',
 'cvars':{k:unreal.SystemLibrary.get_console_variable_int_value(k) for k in ['r.DynamicGlobalIlluminationMethod','r.ReflectionMethod','r.GenerateMeshDistanceFields','r.Lumen.HardwareRayTracing','r.RayTracing']},
 'limits':['Existing parameterized furniture geometry','No claim of reference-image parity','No browser streaming','No measured real-time FPS']}
(out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
capture=actors.spawn_actor_from_class(unreal.SceneCapture2D,camera.get_actor_location(),camera.get_actor_rotation())
component=capture.get_component_by_class(unreal.SceneCaptureComponent2D)
target=unreal.RenderingLibrary.create_render_target2d(world,1600,900,unreal.TextureRenderTargetFormat.RTF_RGBA8)
component.set_editor_property('texture_target',target)
component.set_editor_property('capture_source',unreal.SceneCaptureSource.SCS_FINAL_COLOR_LDR)
component.set_editor_property('capture_every_frame',False)
component.set_editor_property('always_persist_rendering_state',True)
component.set_editor_property('post_process_settings',pp)
# Block asset/shader completion before starting the measured warm-up schedule.
unreal.AutomationLibrary.finish_loading_before_screenshot()
start=time.monotonic();state=set()
def tick(dt):
    elapsed=time.monotonic()-start
    for index,name in enumerate(cameras):
        second=10+index*12
        if elapsed>second and name not in state:
            state.add(name);c=cameras[name]
            capture.set_actor_location(c.get_actor_location(),False,True)
            capture.set_actor_rotation(c.get_actor_rotation(),False)
            component.set_editor_property('fov_angle',c.camera_component.field_of_view)
        if name in state and second<elapsed<second+8:
            component.capture_scene()
        if elapsed>second+8 and name+'saved' not in state:
            state.add(name+'saved');unreal.RenderingLibrary.export_render_target(world,target,str(out),name+'.png')
    if elapsed>10+len(cameras)*12:
        report['captureComplete']=all(name+'saved' in state for name in cameras)
        (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
        unreal.unregister_slate_post_tick_callback(handle)
        actors.destroy_actor(capture)
        levels.save_current_level()
        unreal.log('Frost captures finished. Editor stays open for continued work.')
handle=unreal.register_slate_post_tick_callback(tick)
