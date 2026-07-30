#!/bin/bash
set -e

echo "=== Installing system dependencies ==="
apt-get update
apt-get install -y python3 python3-pip ffmpeg wget

echo "=== Installing yt-dlp ==="
pip3 install --upgrade pip
pip3 install yt-dlp requests

echo "=== Verifying installations ==="
which yt-dlp && yt-dlp --version
which ffmpeg && ffmpeg -version | head -1
which python3 && python3 --version

echo "=== Installing Node dependencies ==="
npm install --production

echo "=== Build complete ==="
