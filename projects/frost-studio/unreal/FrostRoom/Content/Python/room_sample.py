"""UE room baseline without character assets."""
import json, math, time
from pathlib import Path
import unreal
root=Path(unreal.Paths.project_dir()).resolve();out=root.parent.parent/'output/unreal'
room=json.loads((out/'room-import-report.json').read_text(encoding='utf-8'))
snapshot=json.loads((root/'Saved/frost-unreal.json').read_text(encoding='utf-8'))
levels=unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
actors=unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
if not levels.load_level(room['level']): raise RuntimeError('Cannot open imported baseline')
original_actors=list(actors.get_all_level_actors())
scene_root=next(a for a in original_actors if a.get_actor_label()=='AuxScene')
# Interchange maps glTF to (webX,webZ,webY). Rotate the imported hierarchy once
# into the shared protocol (-webZ,webX,webY). Cameras never move furniture.
scene_root.set_actor_rotation(unreal.Rotator(yaw=90),False)
checks=[]
for inst in snapshot['instances']:
    if inst['id'] not in ['desk','chair','monitor','monitor-2','laptop','case','bed','sofa','tv','fridge']:continue
    actor=next((a for a in original_actors if a.get_actor_label()=='instance_'+inst['id']),None)
    if actor:
        actual=actor.get_actor_location(); expected=inst['locationCm']
        error=sum((v-e)**2 for v,e in zip([actual.x,actual.y,actual.z],expected))**.5
        checks.append({'id':inst['id'],'errorCm':error})
if any(c['errorCm']>.1 for c in checks):
    (out/'room-coordinate-failure.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
    raise RuntimeError('Imported room axes do not match snapshot; do not fake camera compensation')

sun=actors.spawn_actor_from_class(unreal.DirectionalLight,unreal.Vector(300,-300,400),unreal.Rotator(pitch=-35,yaw=135))
sun.light_component.set_intensity(1.5)
sky=actors.spawn_actor_from_class(unreal.SkyLight,unreal.Vector(0,0,300))
sky.light_component.set_mobility(unreal.ComponentMobility.MOVABLE)
sky.light_component.set_editor_property('source_type',unreal.SkyLightSourceType.SLS_SPECIFIED_CUBEMAP)
sky.light_component.set_editor_property('cubemap',unreal.load_asset('/Game/Frost/Lighting/environment.environment'))
sky.light_component.set_intensity(.8)
cameras={}
def web_position(p):return [-p[2]*100,p[0]*100,p[1]*100]
snapshot['cameras']['keyboard']={'locationCm':web_position([-2.63,1.07,-.56]),'targetCm':web_position([-2.95,.80,-.67])}
snapshot['cameras']['pc']={'locationCm':web_position([-2.65,1.22,-2.43]),'targetCm':web_position([-3.23,1.03,-1.75])}
for name in ['default','desk','room','keyboard','pc']:
    pose=snapshot['cameras'][name];loc=unreal.Vector(*pose['locationCm']);target=unreal.Vector(*pose['targetCm'])
    camera=actors.spawn_actor_from_class(unreal.CameraActor,loc,unreal.MathLibrary.find_look_at_rotation(loc,target))
    camera.set_actor_label('FrostCamera_'+name);camera.camera_component.set_field_of_view(40 if name in ['keyboard','pc'] else 70)
    pp=unreal.PostProcessSettings()
    for key,value in {'override_auto_exposure_method':True,'auto_exposure_method':unreal.AutoExposureMethod.AEM_MANUAL,
       'override_auto_exposure_apply_physical_camera_exposure':True,'auto_exposure_apply_physical_camera_exposure':False,
       'override_bloom_intensity':True,'bloom_intensity':.05}.items():pp.set_editor_property(key,value)
    camera.camera_component.set_editor_property('post_process_settings',pp)
    cameras[name]=camera
camera=cameras['default']
unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).set_level_viewport_camera_info(camera.get_actor_location(),camera.get_actor_rotation())
sample_level='/Game/LocalOnly/Validation/Room_'+time.strftime('%Y%m%d_%H%M%S')
world=unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
if not unreal.EditorLoadingAndSavingUtils.save_map(world,sample_level):raise RuntimeError('Sample save failed')
(out/'room-sample.json').write_text(json.dumps({'level':sample_level,'coordinateChecks':checks,'actorCount':len(original_actors),
    'limitations':['Web baseline furniture','DX11 HDRI lighting, not Lumen','No runtime configuration bridge']},indent=2),encoding='utf-8')
if not globals().get('FROST_SKIP_CAPTURE', False):
    capture=actors.spawn_actor_from_class(unreal.SceneCapture2D,camera.get_actor_location(),camera.get_actor_rotation())
    capture_component=capture.get_component_by_class(unreal.SceneCaptureComponent2D)
    target=unreal.RenderingLibrary.create_render_target2d(world,1280,720,unreal.TextureRenderTargetFormat.RTF_RGBA8)
    capture_component.set_editor_property('texture_target',target)
    capture_component.set_editor_property('capture_source',unreal.SceneCaptureSource.SCS_FINAL_COLOR_LDR)
    capture_component.set_editor_property('capture_every_frame',False)
    capture_component.set_editor_property('capture_on_movement',False)
    start=time.monotonic();state={'captured':set(),'exported':set()}
    def tick(dt):
        elapsed=time.monotonic()-start
        for name,second in [('desk',30),('keyboard',42),('pc',54)]:
            if elapsed>second and name not in state['captured']:
                state['captured'].add(name)
                c=cameras[name]
                capture.set_actor_location(c.get_actor_location(),False,True)
                capture.set_actor_rotation(c.get_actor_rotation(),False)
                capture_component.set_editor_property('fov_angle',c.camera_component.field_of_view)
                capture_component.set_editor_property('post_process_settings',c.camera_component.get_editor_property('post_process_settings'))
                capture_component.capture_scene()
            if elapsed>second+3 and name not in state['exported']:
                state['exported'].add(name)
                unreal.RenderingLibrary.export_render_target(world,target,str(out),'room-'+name+'.png')
        if elapsed>68:
            unreal.unregister_slate_post_tick_callback(handle)
    handle=unreal.register_slate_post_tick_callback(tick)
