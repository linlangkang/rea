"""Remove project-local character actors and assets while preserving room maps."""
import gc
import json
from pathlib import Path
import unreal

root = Path(unreal.Paths.project_dir()).resolve()
content = root / 'Content'
report_path = root / 'Saved/character-removal-report.json'
report = {'maps': [], 'deletedAssets': [], 'failures': []}
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)

def clean_map(package):
    gc.collect()
    if not levels.load_level(package):
        raise RuntimeError('Cannot load map: ' + package)
    removed = []
    for actor in actors.get_all_level_actors():
        label = actor.get_actor_label()
        meshes = actor.get_components_by_class(unreal.SkeletalMeshComponent)
        is_character = 'RuanMei' in label or label.startswith('Frost_Character_')
        for component in meshes:
            mesh = component.get_editor_property('skeletal_mesh')
            if mesh and 'RuanMei' in mesh.get_path_name():
                is_character = True
        if is_character:
            if not actors.destroy_actor(actor):
                raise RuntimeError('Cannot remove actor: ' + label)
            removed.append(label)
    if removed and not levels.save_current_level():
        raise RuntimeError('Cannot save map: ' + package)
    return removed

maps = sorted(content.rglob('*.umap'))
for path in maps:
    package = '/Game/' + path.relative_to(content).with_suffix('').as_posix()
    removed = clean_map(package)
    report['maps'].append({'path': package, 'removed': removed})
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    unreal.log('Character cleanup: ' + package + ' removed=' + str(len(removed)))

# Unload every map before deleting shared character packages.
gc.collect()
levels.new_level('/Temp/FrostCharacterRemoval')
gc.collect()
library = unreal.EditorAssetLibrary
for folder in sorted((content / 'LocalOnly').glob('RuanMei*')):
    package = '/Game/' + folder.relative_to(content).as_posix()
    if library.delete_directory(package):
        report['deletedAssets'].append(package)
    else:
        report['failures'].append(package)
for path in sorted(content.rglob('M_Character_*.uasset')):
    package = '/Game/' + path.relative_to(content).with_suffix('').as_posix()
    if library.delete_asset(package):
        report['deletedAssets'].append(package)
    else:
        report['failures'].append(package)
for path in maps:
    if path.stem.startswith('Character_'):
        package = '/Game/' + path.relative_to(content).with_suffix('').as_posix()
        if library.delete_asset(package):
            report['deletedAssets'].append(package)
        else:
            report['failures'].append(package)
report['complete'] = not report['failures']
report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
if report['failures']:
    raise RuntimeError('Character asset deletion failed; inspect character-removal-report.json')
