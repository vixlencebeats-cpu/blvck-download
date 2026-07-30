@echo off
echo.
echo ========================================
echo   BLVCK-DOWNLOAD Installation
echo ========================================
echo.

echo Checking for Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please download and install from: https://nodejs.org/
    pause
    exit /b 1
)

echo Checking for Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed!
    echo Please download and install from: https://www.python.org/
    pause
    exit /b 1
)

echo Checking for FFmpeg...
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo ERROR: FFmpeg is not installed!
    echo Please download and install from: https://ffmpeg.org/download.html
    pause
    exit /b 1
)

echo.
echo ✅ All prerequisites found!
echo.
echo Installing dependencies...
call npm install

echo.
echo Installing yt-dlp...
pip install yt-dlp requests

echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo To start BLVCK-DOWNLOAD, run:
echo   npm start
echo.
echo Then open: http://localhost:5000
echo.
pause
