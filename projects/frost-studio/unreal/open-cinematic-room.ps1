param([string]$EngineRoot='C:\Program Files\Epic Games\UE_5.7')
$ErrorActionPreference='Stop'
$report=Join-Path $PSScriptRoot '../output/unreal/cinematic/report.json'
if (!(Test-Path -LiteralPath $report)) {throw 'Render the cinematic room first.'}
$result=Get-Content -LiteralPath $report -Raw -Encoding UTF8 | ConvertFrom-Json
if (!$result.captureComplete) {throw 'Cinematic capture did not complete; inspect the UE log.'}
$level=$result.level
if ($level -notmatch '^/Game/LocalOnly/Cinematic/Frost_[0-9_]+$') {throw 'Invalid cinematic map path'}
$project=Join-Path $PSScriptRoot 'FrostRoom/FrostRoom.uproject'
$editor=Join-Path $EngineRoot 'Engine/Binaries/Win64/UnrealEditor.exe'
if (!(Test-Path -LiteralPath $editor)) {throw 'UE editor missing'}
# User-facing editable project, not a background helper. G toggles editor icons.
$existing=Get-CimInstance Win32_Process | Where-Object {$_.Name -like 'UnrealEditor*' -and $_.CommandLine -like '*FrostRoom.uproject*'}
if ($existing) {Write-Output 'FrostRoom is already open; leaving the existing editor running.'; return}
Start-Process -FilePath $editor -ArgumentList @(('"'+$project+'"'),$level,'-dx12','-sm6','"-ExecCmds=py editor_session.py"')
