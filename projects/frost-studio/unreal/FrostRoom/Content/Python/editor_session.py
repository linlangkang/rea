"""Local file queue for the already-open editor; no network listener."""
import json, os, time, gc
from pathlib import Path
import unreal

session_root=Path(unreal.Paths.project_dir()).resolve()
session_saved=session_root/'Saved'
session_request=session_saved/'frost-editor-request.json'
session_status=session_saved/'frost-editor-session.json'
session_seen=session_request.stat().st_mtime_ns if session_request.exists() else None
session_jobs=[]
def session_tick(dt):
    global session_seen
    if not session_request.exists():return
    stamp=session_request.stat().st_mtime_ns
    if stamp==session_seen:return
    session_seen=stamp
    namespace=None
    try:
        req=json.loads(session_request.read_text(encoding='utf-8-sig'))
        if req.get('script')!='cinematic_room':raise RuntimeError('Only cinematic_room is allowed')
        if any(not job.get('report',{}).get('captureComplete',False) for job in session_jobs):
            raise RuntimeError('A cinematic job is already active; wait for its captures.')
        # Completed script globals retain World/Actor wrappers and prevent UE map cleanup.
        for completed in session_jobs:
            previous_report=completed.get('report',{})
            completed.clear();completed['report']=previous_report
        gc.collect()
        if unreal.EditorLoadingAndSavingUtils.get_dirty_map_packages():
            raise RuntimeError('Current map has unsaved edits. Save it in UE before requesting a new stage.')
        namespace={'__name__':'__frost_editor_job__'};session_jobs.append(namespace)
        exec(compile((session_root/'Content/Python/cinematic_room.py').read_text(encoding='utf-8'),'cinematic_room.py','exec'),namespace)
        session_status.write_text(json.dumps({'pid':os.getpid(),'state':'running','request':req.get('id'),'time':time.time()}),encoding='utf-8')
    except Exception as exc:
        if namespace is not None:
            namespace['report']={'captureComplete':True,'failed':True,'error':str(exc)}
        unreal.log_error(str(exc))
        session_status.write_text(json.dumps({'pid':os.getpid(),'state':'error','error':str(exc),'time':time.time()}),encoding='utf-8')
session_handle=unreal.register_slate_post_tick_callback(session_tick)
session_status.write_text(json.dumps({'pid':os.getpid(),'state':'ready','time':time.time()}),encoding='utf-8')
unreal.log('Frost editor session ready; automatic exit is disabled.')
