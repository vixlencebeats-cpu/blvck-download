# YouTube Downloader with yt-dlp - Complete Setup Guide

## Prerequisites
- Node.js (v14 or higher)
- Python 3.6+ (required for yt-dlp)
- npm or yarn

---

## Step 1: Install yt-dlp

### On Windows (via cmd or PowerShell):
```bash
pip install yt-dlp
```

### On macOS:
```bash
brew install yt-dlp
# OR via pip
pip install yt-dlp
```

### On Linux:
```bash
sudo apt-get install yt-dlp
# OR via pip
pip install yt-dlp
```

### Verify Installation:
```bash
yt-dlp --version
```

---

## Step 2: Create Your Node.js Backend

### 2a. Initialize a new Node project:
```bash
mkdir youtube-downloader-backend
cd youtube-downloader-backend
npm init -y
```

### 2b. Install required dependencies:
```bash
npm install express cors dotenv axios fluent-ffmpeg multer
npm install --save-dev nodemon
```

**What each does:**
- `express` - Web framework
- `cors` - Handle cross-origin requests from frontend
- `dotenv` - Environment variables
- `axios` - HTTP requests
- `fluent-ffmpeg` - Video processing (optional, for format conversion)
- `multer` - Handle file uploads
- `nodemon` - Auto-restart server during development

---

## Step 3: Create the Backend Server

Create a file called `server.js`:

```javascript
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');

const execPromise = util.promisify(exec);
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');

// Middleware
app.use(cors());
app.use(express.json());

// Create downloads directory if it doesn't exist
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

// Serve downloaded files
app.use('/downloads', express.static(DOWNLOADS_DIR));

/**
 * GET /api/video-info
 * Fetches video metadata (title, duration, available formats)
 */
app.get('/api/video-info', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Get video info in JSON format
    const command = `yt-dlp -j "${url}"`;
    const { stdout } = await execPromise(command);
    const videoInfo = JSON.parse(stdout);

    // Extract relevant information
    const info = {
      title: videoInfo.title,
      duration: videoInfo.duration,
      channel: videoInfo.uploader,
      thumbnail: videoInfo.thumbnail,
      formats: getAvailableFormats(videoInfo)
    };

    res.json(info);
  } catch (error) {
    console.error('Error fetching video info:', error);
    res.status(500).json({ error: 'Failed to fetch video information' });
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

    // Validate format
    if (!['mp4', 'mp3'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format' });
    }

    // Build yt-dlp command
    let command = '';
    const filename = path.join(DOWNLOADS_DIR, '%(title)s.%(ext)s');

    if (format === 'mp3') {
      // Download as MP3
      command = `yt-dlp -f "bestaudio/best" -x --audio-format mp3 --audio-quality ${quality || '192'} -o "${filename}" "${url}"`;
    } else if (format === 'mp4') {
      // Download as MP4 with specified quality
      const formatCode = getFormatCode(quality);
      command = `yt-dlp -f "${formatCode}" -o "${filename}" "${url}"`;
    }

    // Execute download
    console.log('Executing:', command);
    const { stdout, stderr } = await execPromise(command, { maxBuffer: 10 * 1024 * 1024 });

    // Extract filename from output
    const match = stdout.match(/Destination: (.+)/);
    const downloadedFile = match ? match[1] : null;

    if (!downloadedFile || !fs.existsSync(downloadedFile)) {
      return res.status(500).json({ error: 'Download failed' });
    }

    const fileSize = fs.statSync(downloadedFile).size;
    const filename_only = path.basename(downloadedFile);

    res.json({
      success: true,
      filename: filename_only,
      downloadUrl: `/downloads/${filename_only}`,
      size: formatBytes(fileSize)
    });

  } catch (error) {
    console.error('Error downloading video:', error);
    res.status(500).json({ error: 'Download failed: ' + error.message });
  }
});

/**
 * GET /api/formats
 * Get all available formats for a video
 */
app.get('/api/formats', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const command = `yt-dlp -F "${url}"`;
    const { stdout } = await execPromise(command);

    res.json({ formats: stdout });
  } catch (error) {
    console.error('Error fetching formats:', error);
    res.status(500).json({ error: 'Failed to fetch formats' });
  }
});

/**
 * DELETE /api/download/:filename
 * Delete a downloaded file
 */
app.delete('/api/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(DOWNLOADS_DIR, filename);

    // Security: prevent directory traversal
    if (!filepath.startsWith(DOWNLOADS_DIR)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      res.json({ success: true, message: 'File deleted' });
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Helper functions
function getAvailableFormats(videoInfo) {
  const formats = {
    mp4: [],
    mp3: []
  };

  // Extract video formats
  if (videoInfo.formats) {
    const uniqueHeights = new Set();
    
    videoInfo.formats.forEach(fmt => {
      if (fmt.height && !uniqueHeights.has(fmt.height)) {
        uniqueHeights.add(fmt.height);
      }
    });

    // Add common resolutions
    const resolutions = [2160, 1080, 720, 480, 360];
    resolutions.forEach(height => {
      if (uniqueHeights.has(height)) {
        const sizeEst = estimateSize(videoInfo.duration, height);
        formats.mp4.push({
          quality: `${height}p`,
          size: sizeEst,
          bitrate: getBitrate(height)
        });
      }
    });
  }

  // Audio formats
  formats.mp3 = [
    { quality: '320kbps', size: '55 MB', bitrate: '320 kbps' },
    { quality: '192kbps', size: '33 MB', bitrate: '192 kbps' },
    { quality: '128kbps', size: '22 MB', bitrate: '128 kbps' }
  ];

  return formats;
}

function getFormatCode(quality) {
  const codes = {
    '2160': 'bestvideo[height<=2160]+bestaudio/best',
    '1080': 'bestvideo[height<=1080]+bestaudio/best',
    '720': 'bestvideo[height<=720]+bestaudio/best',
    '480': 'bestvideo[height<=480]+bestaudio/best',
    '360': 'bestvideo[height<=360]+bestaudio/best'
  };
  
  return codes[quality.replace('p', '')] || 'best';
}

function estimateSize(duration, height) {
  // Rough estimation: bitrate * duration / 8
  const bitrate = getBitrate(height);
  const bitsPerSecond = parseInt(bitrate) * 1000;
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
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

---

## Step 4: Update package.json scripts

Modify your `package.json` to add a dev script:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

---

## Step 5: Create .env file

Create a `.env` file in your project root:

```
PORT=5000
NODE_ENV=development
```

---

## Step 6: Run Your Backend Server

```bash
npm run dev
```

You should see:
```
Server running on http://localhost:5000
```

---

## Step 7: Update Your Frontend (HTML/JavaScript)

Replace the mock data section with actual API calls:

```javascript
// In your frontend JavaScript
async function fetchVideo() {
  const url = document.getElementById('urlInput').value.trim();
  const contentDiv = document.getElementById('content');
  const fetchBtn = document.getElementById('fetchBtn');

  if (!url) {
    contentDiv.innerHTML = '<div class="error">Please enter a YouTube URL</div>';
    return;
  }

  fetchBtn.disabled = true;
  fetchBtn.textContent = 'Fetching...';
  contentDiv.innerHTML = '<div class="loading"><span class="spinner"></span> Analyzing video...</div>';

  try {
    // Fetch video info from backend
    const response = await fetch(`http://localhost:5000/api/video-info?url=${encodeURIComponent(url)}`);
    
    if (!response.ok) {
      throw new Error('Invalid YouTube URL');
    }

    const videoData = await response.json();
    currentVideo = videoData;
    selectedFormat = 'mp4';
    selectedResolution = null;
    
    renderContent();
  } catch (error) {
    contentDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.textContent = 'Download';
  }
}

async function startDownload() {
  if (!selectedResolution || !currentVideo) {
    alert('Please select a quality first');
    return;
  }

  const btn = document.querySelector('.download-button');
  btn.disabled = true;
  btn.textContent = 'Downloading...';

  try {
    const response = await fetch('http://localhost:5000/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: document.getElementById('urlInput').value,
        format: selectedFormat,
        quality: selectedResolution.quality.replace(/[^0-9]/g, '')
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Download failed');
    }

    // Trigger download
    const link = document.createElement('a');
    link.href = `http://localhost:5000${data.downloadUrl}`;
    link.download = data.filename;
    link.click();

    alert(`Downloaded!\nFile: ${data.filename}\nSize: ${data.size}`);
  } catch (error) {
    alert('Download error: ' + error.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Download Now';
  }
}
```

---

## Common Issues & Solutions

### Issue 1: "yt-dlp command not found"
**Solution:**
```bash
# Reinstall with pip
pip install --upgrade yt-dlp

# Or try python3
python3 -m pip install yt-dlp
```

### Issue 2: "FFmpeg not found"
**Solution:**
```bash
# Windows
choco install ffmpeg

# macOS
brew install ffmpeg

# Linux
sudo apt-get install ffmpeg
```

### Issue 3: CORS errors in browser
**Solution:** Make sure `cors()` is imported and used in Express (already in the code above)

### Issue 4: Large file downloads timeout
**Solution:** Add timeout settings to your fetch in frontend:
```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 min

fetch(url, { signal: controller.signal });
```

---

## Deployment (Production)

### For production, use:
1. **PM2** - Process manager for Node
2. **Nginx** - Reverse proxy
3. **Environment variables** for security

```bash
npm install pm2 -g
pm2 start server.js --name "youtube-downloader"
pm2 startup
pm2 save
```

---

## Testing

Test your API endpoints:

```bash
# Get video info
curl "http://localhost:5000/api/video-info?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# Health check
curl http://localhost:5000/health
```

---

## Security Considerations

1. **Validate URLs** before processing
2. **Sanitize filenames** to prevent directory traversal
3. **Set download limits** on file size and bandwidth
4. **Rate limiting** to prevent abuse
5. **Authentication** if sharing publicly
6. **Clean up old files** regularly

---

## Next Steps

1. Implement a database to track downloads
2. Add user authentication
3. Set up proper error handling and logging
4. Deploy to a server (Heroku, AWS, DigitalOcean, etc.)
5. Add admin dashboard to monitor downloads

