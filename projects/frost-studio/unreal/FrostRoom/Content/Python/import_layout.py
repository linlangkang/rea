"""Editor-only layout handoff. No runtime streaming or character rig is implied.
Place the exported frost-unreal.json in the project Saved folder, then execute.
Creates a NEW level each run, preserving artist work in earlier levels.
"""
import json
import math
from pathlib import Path
from datetime import datetime
import unreal

def vector(values):
    if len(values) != 3 or not all(isinstance(v, (float, int)) and math.isfinite(v) for v in values):
        raise ValueError('Invalid coordinate')
    return unreal.Vector(*values)

def run():
    root = Path(unreal.Paths.project_dir())
    source = root / 'Saved' / 'frost-unreal.json'
    if source.stat().st_size > 8_000_000:
        raise ValueError('Snapshot exceeds 8 MB')
    data = json.loads(source.read_text(encoding='utf-8-sig'))
    if (data.get('protocol'), data.get('version'), data.get('units')) != ('frost.unreal.snapshot', 1, 'centimeters'):
        raise ValueError('Unsupported snapshot protocol')
    instances = data['instances']
    if len(instances) > 100 or len({i['id'] for i in instances}) != len(instances):
        raise ValueError('Invalid instance list')
    for item in instances:
        vector(item['locationCm'])
        if not math.isfinite(item['yawDegrees']):
            raise ValueError('Invalid rotation')
    actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
    levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    level = '/Game/Frost/Imports/Layout_' + datetime.now().strftime('%Y%m%d_%H%M%S_%f')
    if not levels.new_level(level):
        raise RuntimeError('Cannot create isolated import level')
    for item in instances:
        actor = actors.spawn_actor_from_class(unreal.Actor, vector(item['locationCm']), unreal.Rotator(yaw=item['yawDegrees']))
        actor.set_actor_label('Anchor_' + item['id'])
        actor.tags = [unreal.Name('frost.instance.' + item['id']), unreal.Name('frost.sku.' + item['skuId'])]
    for name, pose in data['cameras'].items():
        location, target = vector(pose['locationCm']), vector(pose['targetCm'])
        camera = actors.spawn_actor_from_class(unreal.CameraActor, location, unreal.MathLibrary.find_look_at_rotation(location,target))
        camera.set_actor_label('Camera_' + name)
    if not levels.save_current_level():
        raise RuntimeError('Level save failed')
    report = {'stage':'layout-anchors-only', 'level':level, 'instances':len(instances),
              'characterImported':False, 'materialsValidated':False, 'runtimeStreaming':False}
    (root / 'Saved' / 'frost-import-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    unreal.log('Frost layout imported. Anchors only; mesh/rig/lighting validation pending.')

run()
