"""Import the existing web room as a baseline, preserving the exported hierarchy."""
import json
from pathlib import Path
from datetime import datetime
import unreal
root=Path(unreal.Paths.project_dir()).resolve()
source=root.parent.parent/'local-assets/unreal/room-baseline.glb'
if not source.is_file(): raise RuntimeError('Run scripts/export-unreal-room.mjs first')
levels=unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
actors=unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
stamp=datetime.now().strftime('%Y%m%d_%H%M%S')
level='/Game/Frost/Baselines/Room_'+stamp
if not levels.new_level(level): raise RuntimeError('Cannot create isolated room map')
manager=unreal.InterchangeManager.get_interchange_manager_scripted()
parameters=unreal.ImportAssetParameters()
parameters.is_automated=True
parameters.replace_existing=False
destination='/Game/Frost/WebBaseline_'+stamp
if not manager.import_scene(destination,manager.create_source_data(str(source)),parameters):
    raise RuntimeError('Interchange room scene import failed')
if not unreal.EditorAssetLibrary.save_directory(destination): raise RuntimeError('Room asset save failed')
if not levels.save_current_level(): raise RuntimeError('Room level save failed')
entries=[]
for actor in actors.get_all_level_actors():
    p=actor.get_actor_location(); r=actor.get_actor_rotation()
    entries.append({'label':actor.get_actor_label(),'class':actor.get_class().get_name(),
                    'location':[p.x,p.y,p.z],'rotation':[r.pitch,r.yaw,r.roll]})
report={'level':level,'source':str(source),'destination':destination,'actors':entries,
        'status':'web geometry baseline; not upgraded realism; camera conversion requires validation'}
(root.parent.parent/'output/unreal/room-import-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
if not entries: raise RuntimeError('Room has no actors; import not accepted. Inspect Interchange errors.')
