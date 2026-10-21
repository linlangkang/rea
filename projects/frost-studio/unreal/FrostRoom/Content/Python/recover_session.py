import gc, types, unreal
from pathlib import Path
callbacks=[f for f in gc.get_objects() if isinstance(f,types.FunctionType) and f.__name__=='session_tick']
assert len(callbacks)==1, 'Expected one Frost session callback'
scope=callbacks[0].__globals__
for job in scope['session_jobs']:
    if not job.get('report',{}).get('captureComplete',False):
        job['report']={'captureComplete':True,'failed':True}
world=unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
assert unreal.EditorLoadingAndSavingUtils.save_map(world,'/Game/LocalOnly/Recovery/Failed_20261001_1425')
unreal.unregister_slate_post_tick_callback(scope['session_handle'])
path=Path(unreal.Paths.project_dir())/'Content/Python/editor_session.py'
exec(compile(path.read_text(encoding='utf-8'),str(path),'exec'),scope)
unreal.log('Frost session repaired without restarting editor')
