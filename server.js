const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');
const youtubeDl = require('yt-dlp-exec');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');

app.use(cors({ origin: '*' }));
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

// Healthcheck endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Fetch Real Video Info
app.get('/api/video-info', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url || !isValidYouTubeURL(url)) {
      return res.status(400).json({ error: 'Valid YouTube URL is required' });
    }

    console.log('Fetching info for:', url);

    const videoInfo = await youtubeDl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      extractorArgs: 'youtube:player_client=web_embedded,android'
    });

    // Format real available resolutions/formats safely
    const info = {
      title: videoInfo.title || 'Unknown Title',
      duration: videoInfo.duration || 0,
      channel: videoInfo.uploader || 'Unknown Channel',
      thumbnail: videoInfo.thumbnail || '',
      formats: {
        mp4: ['1080p', '720p', '480p', '360p'],
        mp3: ['320kbps', '192kbps', '128kbps']
      }
    };

    return res.json(info);
  } catch (error) {
    console.error('Info Fetch Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch video details' });
  }
});

// Download API Endpoint
app.post('/api/download', async (req, res) => {
  try {
    const { url, format } = req.body;

    if (!url || !isValidYouTubeURL(url)) {
      return res.status(400).json({ error: 'Valid YouTube URL is required' });
    }

    const timestamp = Date.now();
    const outputFilename = `video_${timestamp}.${format === 'mp3' ? 'mp3' : 'mp4'}`;
    const outputPath = path.join(DOWNLOADS_DIR, outputFilename);

    console.log(`Processing download request: ${format}`);

    const options = {
      output: outputPath,
      noCheckCertificates: true,
      noWarnings: true,
    };

    if (format === 'mp3') {
      options.extractAudio = true;
      options.audioFormat = 'mp3';
      options.audioQuality = '0'; // Best quality
    } else {
      options.format = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
    }

    await youtubeDl(url, options);

    if (!fs.existsSync(outputPath)) {
      return res.status(500).json({ error: 'Download output file missing' });
    }

    const size = Math.round(fs.statSync(outputPath).size / (1024 * 1024)) + ' MB';

    console.log('Download Complete:', outputFilename);

    res.json({
      success: true,
      filename: outputFilename,
      downloadUrl: `/downloads/${outputFilename}`,
      size: size
    });

    // Scheduled cleanup after 5 minutes
    setTimeout(() => {
      try {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
          console.log('Cleaned up file:', outputFilename);
        }
      } catch (e) {
        console.error('Cleanup error:', e.message);
      }
    }, 5 * 60 * 1000);

  } catch (error) {
    console.error('Download Failed:', error.message);
    res.status(500).json({ error: 'Failed to process download request.' });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
