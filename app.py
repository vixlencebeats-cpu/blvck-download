from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import yt_dlp
import os
from pathlib import Path
import json

app = Flask(__name__)

# Enable CORS for all routes
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://blvck-download.onrender.com", "http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Create downloads directory if it doesn't exist
DOWNLOADS_DIR = Path("downloads")
DOWNLOADS_DIR.mkdir(exist_ok=True)

def get_video_info(url):
    """Extract video information using yt-dlp"""
    try:
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Extract formats
            mp4_formats = []
            mp3_formats = []
            
            if 'formats' in info:
                for fmt in info['formats']:
                    # Video formats (MP4)
                    if fmt.get('vcodec') != 'none' and fmt.get('acodec') != 'none':
                        height = fmt.get('height', 'unknown')
                        size = fmt.get('filesize', 0)
                        size_mb = round(size / (1024 * 1024), 2) if size else 'unknown'
                        
                        mp4_formats.append({
                            'quality': f"{height}p",
                            'format_id': fmt.get('format_id'),
                            'size': f"{size_mb}MB" if isinstance(size_mb, float) else 'unknown'
                        })
                    
                    # Audio formats (MP3)
                    elif fmt.get('acodec') != 'none':
                        bitrate = fmt.get('abr', 128)
                        size = fmt.get('filesize', 0)
                        size_mb = round(size / (1024 * 1024), 2) if size else 'unknown'
                        
                        mp3_formats.append({
                            'quality': f"{bitrate}kbps",
                            'format_id': fmt.get('format_id'),
                            'size': f"{size_mb}MB" if isinstance(size_mb, float) else 'unknown'
                        })
            
            # Remove duplicates and sort
            mp4_formats = list({fmt['quality']: fmt for fmt in mp4_formats}.values())
            mp3_formats = list({fmt['quality']: fmt for fmt in mp3_formats}.values())
            
            return {
                'title': info.get('title', 'Unknown'),
                'channel': info.get('uploader', 'Unknown'),
                'duration': info.get('duration', 0),
                'thumbnail': info.get('thumbnail', ''),
                'formats': {
                    'mp4': mp4_formats[:10],  # Limit to 10 formats
                    'mp3': mp3_formats[:5]
                }
            }
    except Exception as e:
        raise Exception(f"Failed to extract video info: {str(e)}")

@app.route('/api/video-info', methods=['GET'])
def video_info():
    """Endpoint to get video information"""
    try:
        url = request.args.get('url')
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        info = get_video_info(url)
        return jsonify(info), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/download', methods=['POST'])
def download():
    """Endpoint to download video or audio"""
    try:
        data = request.get_json()
        url = data.get('url')
        format_type = data.get('format', 'mp4')  # mp4 or mp3
        quality = data.get('quality')
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        # Set up yt-dlp options
        output_template = str(DOWNLOADS_DIR / '%(title)s.%(ext)s')
        
        if format_type == 'mp3':
            ydl_opts = {
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': quality.replace('kbps', '') if quality else '192',
                }],
                'outtmpl': output_template,
                'quiet': False,
                'no_warnings': False,
            }
        else:  # mp4
            ydl_opts = {
                'format': 'best[ext=mp4]/best',
                'outtmpl': output_template,
                'quiet': False,
                'no_warnings': False,
            }
        
        # Download the file
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            
            # Get file size
            file_path = Path(filename)
            if file_path.exists():
                file_size = round(file_path.stat().st_size / (1024 * 1024), 2)
                return jsonify({
                    'success': True,
                    'filename': file_path.name,
                    'size': f"{file_size}MB",
                    'downloadUrl': f'/download/{file_path.name}'
                }), 200
            else:
                return jsonify({'error': 'File download failed'}), 400
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/download/<filename>', methods=['GET'])
def download_file(filename):
    """Endpoint to download the processed file"""
    try:
        file_path = DOWNLOADS_DIR / filename
        if file_path.exists():
            return send_file(file_path, as_attachment=True)
        else:
            return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok'}), 200

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
