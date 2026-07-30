@echo off
echo Creating blvck-download desktop shortcut...
powershell -ExecutionPolicy Bypass -File "%~dp0create_shortcut.ps1"
pause