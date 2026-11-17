$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$shell = New-Object -ComObject WScript.Shell
$desktopPath = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Gym App.lnk'
$desktop = $shell.CreateShortcut($desktopPath)
$desktop.TargetPath = Join-Path $projectRoot 'Gym App.cmd'
$desktop.WorkingDirectory = $projectRoot
$desktop.Description = 'Start Gym App for your laptop and phone'
$desktop.IconLocation = "$env:SystemRoot\System32\shell32.dll,20"
$desktop.Save()
$setupPath = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Gym App - podesavanje.lnk'
$setup = $shell.CreateShortcut($setupPath)
$setup.TargetPath = Join-Path $projectRoot 'Podesi-Gym-App.cmd'
$setup.WorkingDirectory = $projectRoot
$setup.Description = 'Run as administrator once to enable phone access and automatic startup'
$setup.IconLocation = "$env:SystemRoot\System32\shell32.dll,20"
$setup.Save()
if (-not (Test-Path -LiteralPath $desktopPath) -or -not (Test-Path -LiteralPath $setupPath)) { throw 'Windows did not save the desktop shortcuts.' }
Write-Host "Desktop shortcut: $desktopPath"
Write-Host "One-time setup (run as administrator): $setupPath"
