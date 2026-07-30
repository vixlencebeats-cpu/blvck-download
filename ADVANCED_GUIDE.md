# Advanced YouTube Downloader Guide

## Table of Contents
1. FFmpeg Setup
2. Advanced yt-dlp Options
3. Performance Optimization
4. Deployment
5. Security Hardening
6. Database Integration
7. Monitoring & Logging

---

## 1. FFmpeg Setup (Required for some formats)

### Why FFmpeg?
yt-dlp uses FFmpeg to merge video and audio streams, and for format conversion.

### Installation

**Windows:**
```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Linux (CentOS/RHEL):**
```bash
sudo yum install ffmpeg
```

### Verify Installation:
```bash
ffmpeg -version
```

---

## 2. Advanced yt-dlp Options

### Common yt-dlp Commands

```bash
# Get video info (what our backend uses)
yt-dlp -j "URL"

# List all available formats
yt-dlp -F "URL"

# Download best quality
yt-dlp -f "bestvideo+bestaudio" "URL"

# Download with custom output template
yt-dlp -o "%(title)s-%(id)s.%(ext)s" "URL"

# Download only audio as MP3
yt-dlp -f "bestaudio/best" -x --audio-format mp3 "URL"

# Download with subtitles
yt-dlp --write-subs --write-auto-subs "URL"

# Download playlist
yt-dlp -o "%(playlist)s/%(playlist_index)s - %(title)s.%(ext)s" "PLAYLIST_URL"

# Download with metadata
yt-dlp -f "best" --write-info-json "URL"

# Limit file size
yt-dlp -f "best" -o "%(title)s.%(ext)s" "URL" 2>&1 | head -20
```

### Custom Format Codes

In `server.js`, you can add more sophisticated format selection:

```javascript
// Advanced format selection
function getAdvancedFormatCode(quality, videoOnly = false) {
  const formats = {
    '4K': {
      video: 'bestvideo[height<=2160][ext=mp4]',
      audio: 'bestaudio[ext=m4a]',
      fallback: 'bestvideo[height<=2160]+bestaudio/best'
    },
    '1080p': {
      video: 'bestvideo[height<=1080][ext=mp4]',
      audio: 'bestaudio[ext=m4a]',
      fallback: 'bestvideo[height<=1080]+bestaudio/best'
    },
    '720p': {
      video: 'bestvideo[height<=720][ext=mp4]',
      audio: 'bestaudio[ext=m4a]',
      fallback: 'bestvideo[height<=720]+bestaudio/best'
    }
  };

  const fmt = formats[quality] || formats['720p'];
  
  if (videoOnly) {
    return fmt.video;
  }
  
  return `${fmt.video}+${fmt.audio}/${fmt.fallback}`;
}
```

---

## 3. Performance Optimization

### Improve Download Speed

**Option 1: Parallel Downloads**
```javascript
// In server.js - download multiple videos simultaneously
const MAX_CONCURRENT_DOWNLOADS = 3;
let activeDownloads = 0;

async function queueDownload(url, format, quality) {
  if (activeDownloads >= MAX_CONCURRENT_DOWNLOADS) {
    // Queue for later
    return new Promise(resolve => {
      setTimeout(() => {
        activeDownloads++;
        resolve(performDownload(url, format, quality));
      }, 1000);
    });
  }
  
  activeDownloads++;
  try {
    return await performDownload(url, format, quality);
  } finally {
    activeDownloads--;
  }
}
```

**Option 2: Caching Downloaded Videos**
```javascript
const downloadCache = new Map();

function getCachedDownload(url, quality) {
  const key = `${url}-${quality}`;
  if (downloadCache.has(key)) {
    return downloadCache.get(key);
  }
  return null;
}

function cacheDownload(url, quality, filename) {
  const key = `${url}-${quality}`;
  downloadCache.set(key, filename);
  
  // Auto-cleanup cache after 24 hours
  setTimeout(() => {
    downloadCache.delete(key);
  }, 24 * 60 * 60 * 1000);
}
```

### Memory Optimization

```javascript
// Increase max buffer for large videos
const { stdout } = await execPromise(command, { 
  maxBuffer: 50 * 1024 * 1024, // 50MB instead of 10MB
  timeout: 600000 // 10 minutes
});
```

---

## 4. Deployment

### Deploy to Heroku

1. Create `Procfile`:
```
web: node server.js
```

2. Create `buildpacks.txt`:
```
python-3.11.0
ffmpeg-6.0
```

3. Deploy:
```bash
heroku login
heroku create your-app-name
git push heroku main
```

### Deploy to Railway.app (Recommended)

1. Push to GitHub
2. Go to railway.app
3. Connect your GitHub repo
4. Add "FFmpeg" plugin
5. Deploy automatically!

### Deploy to DigitalOcean App Platform

```bash
# Create doctl config
doctl auth init

# Create app
doctl apps create --spec app.yaml
```

`app.yaml`:
```yaml
name: youtube-downloader
services:
- name: backend
  github:
    repo: your-username/youtube-downloader
    branch: main
  build_command: npm install
  run_command: npm start
  http_port: 5000
```

### Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:18

RUN apt-get update && apt-get install -y \
    python3 \
    pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN pip install yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t youtube-downloader .
docker run -p 5000:5000 -v $(pwd)/downloads:/app/downloads youtube-downloader
```

---

## 5. Security Hardening

### Add Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// Limit downloads to 10 per hour per IP
const downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many downloads, try again later'
});

app.post('/api/download', downloadLimiter, async (req, res) => {
  // ... download logic
});
```

Install: `npm install express-rate-limit`

### Add Input Validation

```javascript
const validator = require('express-validator');

app.post('/api/download', [
  body('url').isURL().trim(),
  body('format').isIn(['mp4', 'mp3']),
  body('quality').matches(/^[0-9]+p|[0-9]+kbps$/)
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // ... proceed with download
});
```

Install: `npm install express-validator`

### Add HTTPS

```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem')
};

https.createServer(options, app).listen(PORT, () => {
  console.log(`Secure server running on port ${PORT}`);
});
```

---

## 6. Database Integration

### Add MongoDB Support

```bash
npm install mongoose
```

`models/Download.js`:
```javascript
const mongoose = require('mongoose');

const downloadSchema = new mongoose.Schema({
  videoUrl: String,
  videoTitle: String,
  format: String,
  quality: String,
  filename: String,
  fileSize: Number,
  downloadedAt: { type: Date, default: Date.now },
  ipAddress: String,
  status: { type: String, enum: ['success', 'failed'], default: 'success' }
});

module.exports = mongoose.model('Download', downloadSchema);
```

```javascript
// In server.js
const Download = require('./models/Download');

app.post('/api/download', async (req, res) => {
  // ... download logic
  
  // Save to database
  const download = new Download({
    videoUrl: url,
    videoTitle: currentVideo.title,
    format: format,
    quality: quality,
    filename: data.filename,
    fileSize: data.size,
    ipAddress: req.ip
  });
  
  await download.save();
  res.json(data);
});
```

---

## 7. Monitoring & Logging

### Add Winston Logging

```bash
npm install winston
```

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Use in your routes
logger.info(`Download started: ${url}`);
logger.error(`Download failed: ${error.message}`);
```

### Add Sentry Error Tracking

```bash
npm install @sentry/node
```

```javascript
const Sentry = require("@sentry/node");

Sentry.init({ dsn: "your-sentry-dsn" });

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

---

## Maintenance Checklist

- [ ] Update yt-dlp weekly: `pip install --upgrade yt-dlp`
- [ ] Clean old downloads: `find downloads -mtime +7 -delete`
- [ ] Monitor disk usage: `du -sh downloads/`
- [ ] Check error logs: `tail -f error.log`
- [ ] Update Node dependencies: `npm update`
- [ ] Test with various video types monthly

---

## Useful Resources

- yt-dlp GitHub: https://github.com/yt-dlp/yt-dlp
- Express.js Docs: https://expressjs.com/
- Node.js Best Practices: https://github.com/goldbergyoni/nodebestpractices
- Railway Docs: https://docs.railway.app/
- Docker Docs: https://docs.docker.com/

