@echo off
echo Gym App: run this setup as administrator once.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Enable-GymAutoStart.ps1"
if errorlevel 1 (
  echo Setup failed. Right-click this shortcut and choose Run as administrator.
  pause
  exit /b 1
)
echo Phone access and Windows automatic startup are ready.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Start-GymApp.ps1" -OpenBrowser
if errorlevel 1 pause
