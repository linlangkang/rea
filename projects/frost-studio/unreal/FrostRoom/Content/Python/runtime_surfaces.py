"""Time-driven display material and an unlit, inward-facing complete sky dome."""
import unreal
actors=unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
edit=unreal.MaterialEditingLibrary
for a in actors.get_all_level_actors():
    label=a.get_actor_label()
    is_screen=label.startswith('Frost_DynamicScreen');is_sky=label.startswith('Frost_PanoramaFullSky')
    if not(is_screen or is_sky):continue
    comp=a.get_component_by_class(unreal.StaticMeshComponent)
    if not comp:continue
    source=comp.get_material(0)
    tex=edit.get_material_instance_texture_parameter_value(source,'BaseColorTexture')
    if not tex:continue
    name='M_Runtime_'+label.replace('.','_')
    folder='/Game/LocalOnly/RuntimeSurfaces';path=folder+'/'+name
    mat=unreal.load_asset(path) if unreal.EditorAssetLibrary.does_asset_exist(path) else unreal.AssetToolsHelpers.get_asset_tools().create_asset(name,folder,unreal.Material,unreal.MaterialFactoryNew())
    edit.delete_all_material_expressions(mat);mat.set_editor_property('two_sided',True)
    mat.set_editor_property('shading_model',unreal.MaterialShadingModel.MSM_UNLIT)
    if is_sky:mat.set_editor_property('is_sky',True);comp.set_cast_shadow(False)
    sample=edit.create_material_expression(mat,unreal.MaterialExpressionTextureSample);sample.texture=tex
    if is_screen:
        panner=edit.create_material_expression(mat,unreal.MaterialExpressionPanner);panner.set_editor_property('speed_x',.001);panner.set_editor_property('speed_y',0)
        edit.connect_material_expressions(panner,'',sample,'UVs')
    edit.connect_material_property(sample,'RGB',unreal.MaterialProperty.MP_EMISSIVE_COLOR)
    edit.recompile_material(mat);unreal.EditorAssetLibrary.save_loaded_asset(mat);comp.set_material(0,mat)
