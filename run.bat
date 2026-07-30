@echo off
title BLVCK Downloader Server
echo Starting server and launching browser...

:: Start the Express server in the background
start /min node server.js

:: Wait 2 seconds for Express to boot up
timeout /t 2 /nobreak > nul

:: Open the website in your default browser
start http://localhost:5000