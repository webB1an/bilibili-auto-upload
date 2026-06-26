# Sync wallpaper download scripts from Hermes upstream
# Source: https://github.com/webB1an/hermes-tencent-channel-profiles

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Dest = Join-Path $Root "scripts"
$Temp = Join-Path $env:TEMP "hermes-live-wallpaper-sync"

if (Test-Path $Temp) {
  Remove-Item -Recurse -Force $Temp
}

Write-Host "Cloning Hermes scripts..."
git clone --depth 1 --filter=blob:none --sparse `
  https://github.com/webB1an/hermes-tencent-channel-profiles.git $Temp | Out-Null
Push-Location $Temp
git sparse-checkout set tencent-channel-live-wallpaper/scripts/live-wallpaper-download/scripts | Out-Null
Pop-Location

$Src = Join-Path $Temp "tencent-channel-live-wallpaper/scripts/live-wallpaper-download/scripts"
$Files = Get-ChildItem $Src -Filter "download-*.mjs"

foreach ($file in $Files) {
  if ($file.Name -eq "download-moewalls-first-page.mjs") {
    Write-Host "Skip $($file.Name) (local dry-run patch)"
    continue
  }
  Copy-Item $file.FullName (Join-Path $Dest $file.Name) -Force
  Write-Host "Synced $($file.Name)"
}

Remove-Item -Recurse -Force $Temp
Write-Host "Done. Review moewalls dry-run patch if upstream adds --dry-run."
