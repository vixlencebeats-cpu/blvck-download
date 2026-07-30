const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');
const youtubeDl = require('youtube-dl-exec');
const ffmpegPath = require('ffmpeg-static');
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

// Helper function to format bytes nicely
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return 'Unknown size';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Estimate file size based on duration (seconds) and format/bitrate
function getEstimatedSize(durationSec, type, quality) {
  if (!durationSec) return 'Size unknown';

  // Average bitrates in Kbps (kilobits per second) including combined audio
  const bitrates = {
    // Video bitrates (video + audio stream combined)
    '1080p': 4500,
    '720p': 2500,
    '480p': 1200,
    '360p': 750,
    // Audio bitrates
    '320kbps': 320,
    '192kbps': 192,
    '128kbps': 128
  };

  const bitrateKbps = bitrates[quality] || (type === 'mp4' ? 2000 : 192);
  // (Bitrate in Kbps * duration) / 8 bits per byte / 1024 to get MB
  const bytes = (bitrateKbps * 1000 / 8) * durationSec;
  return formatBytes(bytes);
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

    const duration = videoInfo.duration || 0;

    // Build real estimated sizes dynamically based on length
    const info = {
      title: videoInfo.title || 'Unknown Title',
      duration: duration,
      channel: videoInfo.uploader || 'Unknown Channel',
      thumbnail: videoInfo.thumbnail || '',
      formats: {
        mp4: [
          { quality: '1080p', size: getEstimatedSize(duration, 'mp4', '1080p') },
          { quality: '720p', size: getEstimatedSize(duration, 'mp4', '720p') },
          { quality: '480p', size: getEstimatedSize(duration, 'mp4', '480p') },
          { quality: '360p', size: getEstimatedSize(duration, 'mp4', '360p') }
        ],
        mp3: [
          { quality: '320kbps', size: getEstimatedSize(duration, 'mp3', '320kbps') },
          { quality: '192kbps', size: getEstimatedSize(duration, 'mp3', '192kbps') },
          { quality: '128kbps', size: getEstimatedSize(duration, 'mp3', '128kbps') }
        ]
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
    const { url, format, quality } = req.body;

    if (!url || !isValidYouTubeURL(url)) {
      return res.status(400).json({ error: 'Valid YouTube URL is required' });
    }

    const timestamp = Date.now();
    const outputFilename = `video_${timestamp}.${format === 'mp3' ? 'mp3' : 'mp4'}`;
    const outputPath = path.join(DOWNLOADS_DIR, outputFilename);

    console.log(`Processing download request: ${format} (${quality})`);

    const options = {
      output: outputPath,
      noCheckCertificates: true,
      noWarnings: true,
      ffmpegLocation: ffmpegPath,
    };

    if (format === 'mp3') {
      options.extractAudio = true;
      options.audioFormat = 'mp3';
      
      // Match quality preference
      if (quality === '320kbps') options.audioQuality = '0';
      else if (quality === '192kbps') options.audioQuality = '2';
      else options.audioQuality = '5';
    } else {
      // Height filter based on selected resolution (e.g., 1080p -> height <= 1080)
      const resNum = parseInt(quality) || 720;
      options.format = `bestvideo[height<=${resNum}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${resNum}][ext=mp4]/best`;
      options.recodeVideo = 'mp4';
    }

    await youtubeDl(url, options);

    if (!fs.existsSync(outputPath)) {
      return res.status(500).json({ error: 'Download output file missing' });
    }

    const actualSizeBytes = fs.statSync(outputPath).size;
    const formattedSize = formatBytes(actualSizeBytes);

    console.log('Download Complete:', outputFilename, `(${formattedSize})`);

    res.json({
      success: true,
      filename: outputFilename,
      downloadUrl: `/downloads/${outputFilename}`,
      size: formattedSize
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
