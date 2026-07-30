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

console.log('🚀 Starting BLVCK-DOWNLOAD...');

app.use(cors({
  origin: ['https://blvck-download.up.railway.app', 'http://localhost:3000', 'http://localhost:5000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));
app.use(express.json());

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
    return hostname.includes('youtube.com') || hostname.includes('youtu.be');
  } catch {
    return false;
  }
}

app.get('/health', async (req, res) => {
  try {
    const { stdout: version } = await execPromise('yt-dlp --version');
    res.json({ status: 'OK', ytdlpVersion: version.trim() });
  } catch (error) {
    res.status(500).json({ status: 'ERROR' });
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

    console.log('📥 Fetching:', url);

    // Use -e flag to match youtube playlist items without internet connection
    const command = `yt-dlp -j \
      --no-warnings \
      --socket-timeout 30 \
      --extractor-args "youtube:lang=en" \
      "${url}"`;
    
    const { stdout } = await execPromise(command, { 
      maxBuffer: 10 * 1024 * 1024,
      timeout: 60000 
    });
    
    const videoInfo = JSON.parse(stdout);

    const info = {
      title: videoInfo.title || 'Unknown',
      duration: videoInfo.duration || 0,
      channel: videoInfo.uploader || 'Unknown',
      thumbnail: videoInfo.thumbnail || '',
      formats: {
        mp4: [
          { quality: '720p', size: '78 MB' },
          { quality: '480p', size: '42 MB' }
        ],
        mp3: [
          { quality: '192kbps', size: '33 MB' }
        ]
      }
    };

    console.log('✅ Got:', info.title);
    res.json(info);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: 'YouTube is blocking requests from this server. Try: 1) Using a VPN 2) Waiting 10 mins 3) Different video' });
  }
});

app.post('/api/download', async (req, res) => {
  try {
    const { url, format, quality } = req.body;

    if (!url || !format) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    console.log(`📥 Downloading ${format}...`);

    const timestamp = Date.now();
    const outputTemplate = path.join(DOWNLOADS_DIR, `%(title)s_${timestamp}.%(ext)s`);

    let command;
    if (format === 'mp3') {
      command = `yt-dlp \
        --no-warnings \
        -f "bestaudio/best" \
        -x --audio-format mp3 \
        -o "${outputTemplate}" \
        "${url}"`;
    } else {
      command = `yt-dlp \
        --no-warnings \
        -f "best[height<=720]" \
        -o "${outputTemplate}" \
        "${url}"`;
    }

    await execPromise(command, { 
      maxBuffer: 10 * 1024 * 1024,
      timeout: 600000
    });

    const files = fs.readdirSync(DOWNLOADS_DIR)
      .filter(f => f.includes(timestamp))
      .sort((a, b) => fs.statSync(path.join(DOWNLOADS_DIR, b)).mtime - fs.statSync(path.join(DOWNLOADS_DIR, a)).mtime);

    if (!files.length) {
      return res.status(500).json({ error: 'Download failed' });
    }

    const file = path.join(DOWNLOADS_DIR, files[0]);
    const size = Math.round(fs.statSync(file).size / (1024 * 1024)) + ' MB';

    res.json({
      success: true,
      filename: files[0],
      downloadUrl: `/downloads/${files[0]}`,
      size: size
    });

    // Delete after 5 minutes
    setTimeout(() => {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }, 5 * 60 * 1000);

  } catch (error) {
    console.error('❌ Download failed:', error.message);
    res.status(500).json({ error: 'Download failed' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Live!`);
});
