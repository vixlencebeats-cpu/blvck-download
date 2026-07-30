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

console.log('🚀 Starting BLVCK-DOWNLOAD server...');
console.log('PORT:', PORT);

// Middleware
app.use(cors({
  origin: ['https://blvck-download.onrender.com', 'https://blvck-download.up.railway.app', 'http://localhost:3000', 'http://localhost:5000'],
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));
app.use(express.json());

// CREATE DOWNLOADS DIRECTORY
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

app.use('/downloads', express.static(DOWNLOADS_DIR));
app.use(express.static(__dirname));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

function isValidYouTubeURL(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    return hostname.includes('youtube.com') || hostname.includes('youtu.be') || hostname.includes('youtube-nocookie.com');
  } catch {
    return false;
  }
}

app.get('/health', async (req, res) => {
  try {
    const { stdout: version } = await execPromise('yt-dlp --version');
    res.json({ status: 'OK', ytdlpVersion: version.trim() });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', error: 'yt-dlp not found' });
  }
});

app.get('/api/video-info', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!isValidYouTubeURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    console.log('📥 Fetching info for:', url);

    // Retry logic for YouTube blocks
    let lastError;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`⚙️ Attempt ${attempt}/2 - fetching video info...`);
        
        // Command with comprehensive anti-bot measures
        const command = `yt-dlp -j \\
          --extractor-args youtube:player_client=web,skip=webpage \\
          --socket-timeout 30 \\
          --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \\
          --http-header "Accept-Language: en-US,en;q=0.9" \\
          --http-header "Accept-Encoding: gzip, deflate" \\
          --http-header "DNT: 1" \\
          --http-header "Sec-Fetch-Dest: document" \\
          --http-header "Sec-Fetch-Mode: navigate" \\
          --http-header "Sec-Fetch-Site: none" \\
          "${url}"`;
        
        const { stdout, stderr } = await execPromise(command, { 
          maxBuffer: 10 * 1024 * 1024,
          timeout: 45000 
        });
        
        if (stderr) console.log('⚠️ yt-dlp stderr:', stderr);
        
        console.log('✅ Got response, parsing JSON...');
        const videoInfo = JSON.parse(stdout);

        const info = {
          title: videoInfo.title || 'Unknown Title',
          duration: videoInfo.duration || 0,
          channel: videoInfo.uploader || 'Unknown Channel',
          thumbnail: videoInfo.thumbnail || '',
          formats: getAvailableFormats(videoInfo)
        };

        console.log('✅ Successfully fetched:', info.title);
        return res.json(info);
        
      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${attempt} failed:`, error.message);
        
        if ((error.message.includes('429') || error.message.includes('Sign in')) && attempt < 2) {
          console.log('⏳ Rate limited, waiting 5 seconds before retry...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        } else {
          break;
        }
      }
    }
    
    console.error('❌ All retries failed');
    let errorMsg = 'Failed to fetch video information. YouTube may be blocking requests.';
    if (lastError.message.includes('Sign in')) {
      errorMsg = 'YouTube requires authentication. Try again in a moment.';
    } else if (lastError.message.includes('429')) {
      errorMsg = 'Too many requests to YouTube. Wait a few minutes and try again.';
    }
    
    res.status(500).json({ error: errorMsg });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/download', async (req, res) => {
  try {
    const { url, format, quality } = req.body;

    if (!url || !format) {
      return res.status(400).json({ error: 'URL and format required' });
    }

    if (!isValidYouTubeURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    console.log(`📥 Downloading: ${format} quality: ${quality}`);

    let command = '';
    const timestamp = Date.now();
    const outputTemplate = path.join(DOWNLOADS_DIR, `%(title)s_${timestamp}.%(ext)s`);

    const baseArgs = `--extractor-args youtube:player_client=web,skip=webpage \\
      --socket-timeout 30 \\
      --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \\
      --http-header "Accept-Language: en-US,en;q=0.9" \\
      --http-header "Accept-Encoding: gzip, deflate"`;

    if (format === 'mp3') {
      const audioQuality = quality === '320kbps' ? '192' : '128';
      command = `yt-dlp ${baseArgs} -f "bestaudio/best" -x --audio-format mp3 --audio-quality ${audioQuality} -o "${outputTemplate}" "${url}"`;
    } else {
      const formatCode = getFormatCode(quality);
      command = `yt-dlp ${baseArgs} -f "${formatCode}" --merge-output-format mp4 -o "${outputTemplate}" "${url}"`;
    }

    const { stdout, stderr } = await execPromise(command, { 
      maxBuffer: 10 * 1024 * 1024,
      timeout: 600000
    });

    const files = fs.readdirSync(DOWNLOADS_DIR)
      .filter(f => f.includes(timestamp))
      .sort((a, b) => fs.statSync(path.join(DOWNLOADS_DIR, b)).mtime - fs.statSync(path.join(DOWNLOADS_DIR, a)).mtime);

    if (files.length === 0) {
      return res.status(500).json({ error: 'Download failed' });
    }

    const downloadedFile = path.join(DOWNLOADS_DIR, files[0]);
    const fileSize = fs.statSync(downloadedFile).size;
    const filename = files[0];

    res.json({
      success: true,
      filename: filename,
      downloadUrl: `/downloads/${filename}`,
      size: formatBytes(fileSize)
    });

    // Auto-delete after 5 minutes
    setTimeout(() => {
      if (fs.existsSync(downloadedFile)) {
        fs.unlinkSync(downloadedFile);
      }
    }, 5 * 60 * 1000);

  } catch (error) {
    console.error('❌ Download error:', error.message);
    res.status(500).json({ error: 'Download failed' });
  }
});

function getAvailableFormats(videoInfo) {
  const formats = {
    mp4: [
      { quality: '1080p', size: '145 MB', bitrate: '8 Mbps' },
      { quality: '720p', size: '78 MB', bitrate: '4 Mbps' },
      { quality: '480p', size: '42 MB', bitrate: '2 Mbps' }
    ],
    mp3: [
      { quality: '320kbps', size: '55 MB', bitrate: '320 kbps' },
      { quality: '192kbps', size: '33 MB', bitrate: '192 kbps' },
      { quality: '128kbps', size: '22 MB', bitrate: '128 kbps' }
    ]
  };
  return formats;
}

function getFormatCode(quality) {
  const codes = {
    '1080': 'bestvideo[height<=1080]+bestaudio/best',
    '720': 'bestvideo[height<=720]+bestaudio/best',
    '480': 'bestvideo[height<=480]+bestaudio/best',
  };
  const match = quality.match(/\d+/);
  const number = match ? match[0] : '720';
  return codes[number] || codes['720'];
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`✅ BLVCK-DOWNLOAD is live at http://localhost:${PORT}`);
});
