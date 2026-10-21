import gc, types, time, unreal
session=next(f.__globals__ for f in gc.get_objects() if isinstance(f,types.FunctionType) and f.__name__=='session_tick')
job=session['session_jobs'][-1]
for a in job['actors'].get_all_level_actors():
    if a.get_actor_label()=='Frost_Fridge_Interior':a.light_component.set_intensity(3)
c=job['cameras']['fridge']
cap=job['actors'].spawn_actor_from_class(unreal.SceneCapture2D,c.get_actor_location(),c.get_actor_rotation())
comp=cap.capture_component2d
comp.set_editor_property('texture_target',job['target'])
comp.set_editor_property('capture_source',unreal.SceneCaptureSource.SCS_FINAL_COLOR_LDR)
comp.set_editor_property('capture_every_frame',False)
comp.set_editor_property('always_persist_rendering_state',True)
comp.set_editor_property('post_process_settings',job['pp'])
comp.set_editor_property('fov_angle',c.camera_component.field_of_view)
begin=time.monotonic()
def finish_fridge(dt):
    comp.capture_scene()
    if time.monotonic()-begin>8:
        unreal.RenderingLibrary.export_render_target(job['world'],job['target'],str(job['out']),'fridge.png')
        unreal.unregister_slate_post_tick_callback(fridge_handle)
        job['actors'].destroy_actor(cap)
        job['levels'].save_current_level()
fridge_handle=unreal.register_slate_post_tick_callback(finish_fridge)
