@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Start-GymApp.ps1" -OpenBrowser
if errorlevel 1 pause
