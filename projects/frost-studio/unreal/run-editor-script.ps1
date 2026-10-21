param(
  [ValidateSet('import_layout','import_room','room_sample')][string]$Script='import_layout',
  [string]$EngineRoot='C:\Program Files\Epic Games\UE_5.7'
)
$ErrorActionPreference='Stop'
$existing=Get-CimInstance Win32_Process | Where-Object {$_.Name -like 'UnrealEditor*' -and $_.CommandLine -like '*FrostRoom.uproject*'}
if ($existing) {throw "FrostRoom is already open. Run py $Script.py in the existing editor console; do not launch another instance."}
$project=(Join-Path $PSScriptRoot 'FrostRoom/FrostRoom.uproject').Replace('\','/')
$python=(Join-Path $PSScriptRoot "FrostRoom/Content/Python/$Script.py").Replace('\','/')
$editor=Join-Path $EngineRoot 'Engine/Binaries/Win64/UnrealEditor-Cmd.exe'
if (!(Test-Path -LiteralPath $editor)) {throw "Unreal editor missing: $editor"}
$ErrorActionPreference='Continue' # Native Chromium diagnostic stderr is not a process failure.
if ($Script -in @('room_sample')) {
  & $editor $project "-ExecCmds=py $Script.py" -unattended -nosplash -dx11 -windowed -ResX=1280 -ResY=720
} elseif ($Script -in @('import_room')) {
  # Interchange GLB importer requires Slate; commandlet mode can assert in UE 5.7.
  & $editor $project "-ExecutePythonScript=$python" -unattended -nosplash -nullrhi
} else {
  & $editor $project -run=pythonscript "-script=$python" -unattended -nosplash -nullrhi
}
if ($LASTEXITCODE -ne 0) {throw "UE failed with exit code $LASTEXITCODE; inspect FrostRoom/Saved/Logs"}
