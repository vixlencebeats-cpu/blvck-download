#!/bin/bash

echo ""
echo "========================================"
echo "  BLVCK-DOWNLOAD Installation"
echo "========================================"
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please download from: https://nodejs.org/"
    exit 1
fi

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python is not installed!"
    echo "Please download from: https://www.python.org/"
    exit 1
fi

# Check for FFmpeg
if ! command -v ffmpeg &> /dev/null; then
    echo "ERROR: FFmpeg is not installed!"
    echo "Please download from: https://ffmpeg.org/download.html"
    exit 1
fi

echo "✅ All prerequisites found!"
echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Installing yt-dlp..."
pip3 install yt-dlp requests

echo ""
echo "========================================"
echo "  Installation Complete!"
echo "========================================"
echo ""
echo "To start BLVCK-DOWNLOAD, run:"
echo "  npm start"
echo ""
echo "Then open: http://localhost:5000"
echo ""
