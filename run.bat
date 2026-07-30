@echo off
title BLVCK-DOWNLOAD Server
echo Starting BLVCK-DOWNLOAD local server...

:: Navigate to project directory
cd /d "%~dp0"

:: Open the web browser to localhost:5000 in the background
start http://localhost:5000

:: Start the server
node server.js

:: If the server crashes, keep terminal open to show the error
pause
