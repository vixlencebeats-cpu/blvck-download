const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');
const { URL } = require('url');

const execPromise = util.promisify(exec);
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');

console.log('🚀 Starting server...');
console.log('PORT:', PORT);
console.log('DOWNLOADS_DIR:', DOWNLOADS_DIR);

// Middleware
app.use(cors({
  origin: ['https://blvck-download.onrender.com', 'http://localhost:3000', 'http://localhost:5000'],
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));
app.use(express.json());

// CREATE DOWNLOADS DIRECTORY IF IT DOESN'T EXIST
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

// Serve downloaded files statically
app.use('/downloads', express.static(DOWNLOADS_DIR));

// Serve static files and index.html
app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * Validate YouTube URL
 */
function isValidYouTubeURL(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    return hostname.includes('youtube.com') || hostname.includes('youtu.be') || hostname.includes('youtube-nocookie.com');
  } catch {
    return false;
  }
}

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', async (req, res) => {
  try {
    const { stdout: version } = await execPromise('yt-dlp --version');
    res.json({ 
      status: 'Server is running',
      ytdlpVersion: version.trim(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'Server error',
      error: 'yt-dlp not found',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/video-info
 * Fetches video metadata (title, duration, available formats)
 */
app.get('/api/video-info', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      console.error('❌ No URL provided');
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('📥 Fetching info for:', url);

    // Validate YouTube URL
    if (!isValidYouTubeURL(url)) {
      console.error('❌ Invalid YouTube URL:', url);
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    // Check if yt-dlp exists
    console.log('🔍 Checking for yt-dlp...');
    try {
      const { stdout: version } = await execPromise('yt-dlp --version', { timeout: 5000 });
      console.log('✅ yt-dlp found:', version.trim());
    } catch (e) {
      console.error('❌ yt-dlp not found:', e.message);
      return res.status(500).json({ error: 'Server error: yt-dlp not installed' });
    }

    // Get video info in JSON format with anti-bot workarounds
    const command = `yt-dlp -j --extractor-args youtube:player_client=web --socket-timeout 30 "${url}"`;
    console.log('⚙️ Running command with anti-bot measures...');
    
    const { stdout, stderr } = await execPromise(command, { 
      maxBuffer: 10 * 1024 * 1024,
      timeout: 45000 
    });
    
    if (stderr) console.log('⚠️ yt-dlp stderr:', stderr);
    
    console.log('✅ Got response, parsing JSON...');
    const videoInfo = JSON.parse(stdout);

    // Extract relevant information
    const info = {
      title: videoInfo.title || 'Unknown Title',
      duration: videoInfo.duration || 0,
      channel: videoInfo.uploader || 'Unknown Channel',
      thumbnail: videoInfo.thumbnail || '',
      formats: getAvailableFormats(videoInfo)
    };

    console.log('✅ Successfully fetched:', info.title);
    res.json(info);
    
  } catch (error) {
    console.error('❌ ERROR in /api/video-info:');
    console.error('   Message:', error.message);
    
    let errorMsg = 'Failed to fetch video information. Check URL and try again.';
    if (error.message.includes('Sign in to confirm')) {
      errorMsg = 'YouTube blocked the request. Please try again in a few moments.';
    } else if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
      errorMsg = 'Too many requests to YouTube. Please wait a moment and try again.';
    } else if (error.message.includes('yt-dlp')) {
      errorMsg = 'yt-dlp is not installed on server';
    } else if (error.message.includes('JSON')) {
      errorMsg = 'Invalid response from yt-dlp - video might be unavailable';
    } else if (error.message.includes('timeout')) {
      errorMsg = 'Request timeout - try a different video';
    } else if (error.message.includes('404')) {
      errorMsg = 'Video not found - check the URL';
    }
    
    res.status(500).json({ error: errorMsg });
  }
});

/**
 * POST /api/download
 * Downloads video in specified format and quality
 */
app.post('/api/download', async (req, res) => {
  try {
    const { url, format, quality } = req.body;

    if (!url || !format) {
      return res.status(400).json({ error: 'URL and format are required' });
    }

    if (!isValidYouTubeURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    if (!['mp4', 'mp3'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Use mp4 or mp3' });
    }

    console.log(`📥 Downloading: ${url} as ${format} quality: ${quality}`);

    let command = '';
    const timestamp = Date.now();
    const outputTemplate = path.join(DOWNLOADS_DIR, `%(title)s_${timestamp}.%(ext)s`);

    if (format === 'mp3') {
      const audioQuality = quality === '320kbps' ? '192' : quality === '192kbps' ? '192' : '128';
      command = `yt-dlp --extractor-args youtube:player_client=web --socket-timeout 30 -f "bestaudio/best" -x --audio-format mp3 --audio-quality ${audioQuality} -o "${outputTemplate}" "${url}"`;
    } else if (format === 'mp4') {
      const formatCode = getFormatCode(quality);
      command = `yt-dlp --extractor-args youtube:player_client=web --socket-timeout 30 -f "${formatCode}" --merge-output-format mp4 -o "${outputTemplate}" "${url}"`;
    }

    console.log('⚙️ Executing download command with anti-bot measures');

    const { stdout, stderr } = await execPromise(command, { 
      maxBuffer: 10 * 1024 * 1024,
      timeout: 600000
    });

    console.log('✅ Download completed');

    const files = fs.readdirSync(DOWNLOADS_DIR)
      .filter(f => f.includes(timestamp))
      .sort((a, b) => fs.statSync(path.join(DOWNLOADS_DIR, b)).mtime - fs.statSync(path.join(DOWNLOADS_DIR, a)).mtime);

    if (files.length === 0) {
      return res.status(500).json({ error: 'Download completed but file not found' });
    }

    const downloadedFile = path.join(DOWNLOADS_DIR, files[0]);
    const fileSize = fs.statSync(downloadedFile).size;
    const filename = files[0];

    console.log('✅ File ready for download:', filename);

    res.json({
      success: true,
      filename: filename,
      downloadUrl: `/downloads/${filename}`,
      size: formatBytes(fileSize)
    });

    // Auto-delete file after 5 minutes to save storage
    setTimeout(() => {
      if (fs.existsSync(downloadedFile)) {
        fs.unlinkSync(downloadedFile);
        console.log(`🗑️ Auto-deleted after 5 minutes: ${filename}`);
      }
    }, 5 * 60 * 1000);

  } catch (error) {
    console.error('❌ ERROR in /api/download:', error.message);
    
    let errorMsg = 'Download failed';
    if (error.message.includes('Sign in to confirm')) {
      errorMsg = 'YouTube blocked the request. Please try again in a few moments.';
    } else if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
      errorMsg = 'Too many requests to YouTube. Please wait a moment and try again.';
    } else if (error.message.includes('timeout')) {
      errorMsg = 'Download took too long. Video might be too large or connection is slow';
    } else if (error.message.includes('not found')) {
      errorMsg = 'Video not found or is unavailable';
    }

    res.status(500).json({ error: errorMsg });
  }
});

/**
 * GET /api/version
 * Check yt-dlp version
 */
app.get('/api/version', async (req, res) => {
  try {
    const { stdout } = await execPromise('yt-dlp --version');
    res.json({ version: stdout.trim() });
  } catch (error) {
    res.status(500).json({ error: 'yt-dlp not installed or not in PATH' });
  }
});

// Helper Functions

function getAvailableFormats(videoInfo) {
  const formats = {
    mp4: [],
    mp3: []
  };

  try {
    if (videoInfo.formats && Array.isArray(videoInfo.formats)) {
      const uniqueHeights = new Set();
      
      videoInfo.formats.forEach(fmt => {
        if (fmt.height && fmt.height > 0 && !uniqueHeights.has(fmt.height)) {
          uniqueHeights.add(fmt.height);
        }
      });

      const resolutions = [
        { height: 2160, label: '4K (2160p)' },
        { height: 1080, label: '1080p' },
        { height: 720, label: '720p' },
        { height: 480, label: '480p' },
        { height: 360, label: '360p' }
      ];

      resolutions.forEach(res => {
        if (uniqueHeights.has(res.height)) {
          const sizeEst = estimateSize(videoInfo.duration, res.height);
          formats.mp4.push({
            quality: res.label,
            size: sizeEst,
            bitrate: getBitrate(res.height)
          });
        }
      });
    }

    if (formats.mp4.length === 0) {
      formats.mp4 = [
        { quality: '1080p', size: '145 MB', bitrate: '8 Mbps' },
        { quality: '720p', size: '78 MB', bitrate: '4 Mbps' },
        { quality: '480p', size: '42 MB', bitrate: '2 Mbps' }
      ];
    }

    formats.mp3 = [
      { quality: '320kbps', size: '55 MB', bitrate: '320 kbps' },
      { quality: '192kbps', size: '33 MB', bitrate: '192 kbps' },
      { quality: '128kbps', size: '22 MB', bitrate: '128 kbps' }
    ];
  } catch (error) {
    console.error('Error parsing formats:', error);
  }

  return formats;
}

function getFormatCode(quality) {
  const codes = {
    '2160': 'bestvideo[height<=2160]+bestaudio/best',
    '4K': 'bestvideo[height<=2160]+bestaudio/best',
    '1080': 'bestvideo[height<=1080]+bestaudio/best',
    '720': 'bestvideo[height<=720]+bestaudio/best',
    '480': 'bestvideo[height<=480]+bestaudio/best',
    '360': 'bestvideo[height<=360]+bestaudio/best'
  };
  
  const match = quality.match(/\d+/);
  const number = match ? match[0] : '720';
  
  return codes[number] || codes['720'];
}

function estimateSize(duration, height) {
  if (!duration) return 'Unknown';
  
  const bitrate = getBitrate(height);
  const bitsPerSecond = parseInt(bitrate) * 1000000;
  const totalBits = bitsPerSecond * duration;
  const bytes = totalBits / 8;
  return formatBytes(bytes);
}

function getBitrate(height) {
  const bitrates = {
    2160: '25 Mbps',
    1080: '8 Mbps',
    720: '4 Mbps',
    480: '2 Mbps',
    360: '1 Mbps'
  };
  return bitrates[height] || '4 Mbps';
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   BLVCK-DOWNLOAD Backend Started       ║
╠════════════════════════════════════════╣
║ Server: http://localhost:${PORT}         ║
║ Health: /health                        ║
║ Downloads: ${DOWNLOADS_DIR}              ║
╚════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});
