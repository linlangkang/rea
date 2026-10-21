param([string]$EngineRoot='C:\Program Files\Epic Games\UE_5.7')
$ErrorActionPreference='Stop'
$saved=Join-Path $PSScriptRoot 'FrostRoom/Saved'
$existing=Get-CimInstance Win32_Process | Where-Object {$_.Name -like 'UnrealEditor*' -and $_.CommandLine -like '*FrostRoom.uproject*'}
if (!$existing) {& (Join-Path $PSScriptRoot 'open-cinematic-room.ps1') -EngineRoot $EngineRoot}
$sessionPath=Join-Path $saved 'frost-editor-session.json'
$ready=$false
for ($i=0;$i -lt 90;$i++) {
  if (Test-Path -LiteralPath $sessionPath) {
    $session=Get-Content -LiteralPath $sessionPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $proc=Get-Process -Id $session.pid -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -like 'UnrealEditor*') {$ready=$true;break}
  }
  Start-Sleep -Seconds 1
}
if (!$ready) {throw 'Existing UE has no Frost session. Run py editor_session.py in its console. The editor was not closed.'}
$started=Get-Date
$requestId=[guid]::NewGuid().ToString()
@{id=$requestId;script='cinematic_room'} | ConvertTo-Json | Set-Content (Join-Path $saved 'frost-editor-request.json') -Encoding UTF8
$report=Join-Path $PSScriptRoot '../output/unreal/cinematic/report.json'
for ($i=0;$i -lt 900;$i++) {
  Start-Sleep -Seconds 1
  $session=Get-Content -LiteralPath $sessionPath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($session.state -eq 'error' -and $session.time -gt ([DateTimeOffset]$started).ToUnixTimeSeconds()) {throw $session.error}
  if ((Test-Path -LiteralPath $report) -and (Get-Item -LiteralPath $report).LastWriteTime -gt $started) {
    $result=Get-Content -LiteralPath $report -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($result.captureComplete) {Write-Output "Captured $($result.level); UE remains open."; return}
  }
}
throw 'Capture timeout; UE has been left running. Inspect its Output Log.'
