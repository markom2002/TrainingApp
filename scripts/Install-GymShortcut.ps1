$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$shell = New-Object -ComObject WScript.Shell
$desktopPath = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Gym App.lnk'
$desktop = $shell.CreateShortcut($desktopPath)
$desktop.TargetPath = Join-Path $projectRoot 'Gym App.cmd'
$desktop.WorkingDirectory = $projectRoot
$desktop.Description = 'Start Gym App for your laptop and phone'
$desktop.IconLocation = (Join-Path $projectRoot 'FE/training-app-frontend/public/icons/gym-app.ico') + ',0'
$desktop.Save()
$setupPath = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Gym App - podesavanje.lnk'
if (Test-Path -LiteralPath $setupPath) { Remove-Item -LiteralPath $setupPath -Force }
if (-not (Test-Path -LiteralPath $desktopPath)) { throw 'Windows did not save the desktop shortcut.' }
Write-Host "Desktop shortcut: $desktopPath"
