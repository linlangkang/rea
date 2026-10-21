import unreal,time
world=unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
assert world.get_path_name().startswith(('/Game/LocalOnly/','/Game/Frost/')), 'Unexpected map outside Frost generated folders'
assert unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).save_current_level()
unreal.log('Saved current Frost generated level')
