param([string]$EngineRoot='C:\Program Files\Epic Games\UE_5.7')
$ErrorActionPreference='Stop'
$report=Join-Path $PSScriptRoot '../output/unreal/room-sample.json'
if (!(Test-Path -LiteralPath $report)) {throw 'Run room_sample first; no validated room sample exists.'}
$level=(Get-Content -LiteralPath $report -Raw -Encoding UTF8 | ConvertFrom-Json).level
if ($level -notmatch '^/Game/LocalOnly/Validation/Room_[0-9_]+$') {throw 'Invalid local sample map path'}
$project=Join-Path $PSScriptRoot 'FrostRoom/FrostRoom.uproject'
$editor=Join-Path $EngineRoot 'Engine/Binaries/Win64/UnrealEditor.exe'
if (!(Test-Path -LiteralPath $editor)) {throw "Editor missing: $editor"}
# This is the interactive editor requested by the user, not a background service.
Start-Process -FilePath $editor -ArgumentList @(('"'+$project+'"'),$level,'-dx11')
