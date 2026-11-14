@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Start-PersonalApp.ps1"
if errorlevel 1 pause
