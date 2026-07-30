const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');
const { URL } = require('url');
const https = require('https');
const http = require('http');

const execPromise = util.promisify(exec);
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const DOWNLOADS_DIR = path.join(__dirname, 'downloads');

console.log('🚀 NUCLEAR MODE ACTIVATED - DEPLOYING ALL WEAPONS');

app.use(cors({
  origin: ['*'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['*'],
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

// NUCLEAR USER AGENTS - Browser imitation
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 OPR/107.0.0.0",
];

const ACCEPT_LANGUAGES = [
  "en-US,en;q=0.9",
  "en-GB,en;q=0.8,en;q=0.7",
  "en;q=0.9,en-US;q=0.8",
  "en-US;q=0.9,en;q=0.8,de;q=0.7",
  "fr-FR,fr;q=0.9,en;q=0.8",
];

let requestCount = 0;

function getRandomHeaders() {
  requestCount++;
  return {
    userAgent: USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    language: ACCEPT_LANGUAGES[Math.floor(Math.random() * ACCEPT_LANGUAGES.length)],
  };
}

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

    console.log('📥 NUCLEAR FETCHING:', url);

    // STRATEGY 1: Try multiple yt-dlp strategies
    const strategies = [
      // Strategy 1: web_embedded player
      () => {
        const headers = getRandomHeaders();
        return `yt-dlp -j \
          --extractor-args "youtube:player_client=web_embedded" \
          --user-agent "${headers.userAgent}" \
          --http-header "Accept-Language: ${headers.language}" \
          --http-header "Accept-Encoding: gzip, deflate" \
          --http-header "DNT: 1" \
          --http-header "Upgrade-Insecure-Requests: 1" \
          "${url}"`;
      },
      // Strategy 2: android player
      () => {
        const headers = getRandomHeaders();
        return `yt-dlp -j \
          --extractor-args "youtube:player_client=android" \
          --user-agent "${headers.userAgent}" \
          --http-header "Accept-Language: ${headers.language}" \
          "${url}"`;
      },
      // Strategy 3: ios player
      () => {
        const headers = getRandomHeaders();
        return `yt-dlp -j \
          --extractor-args "youtube:player_client=ios" \
          --user-agent "${headers.userAgent}" \
          "${url}"`;
      },
      // Strategy 4: tv player
      () => {
        const headers = getRandomHeaders();
        return `yt-dlp -j \
          --extractor-args "youtube:player_client=tv_embedded" \
          --user-agent "${headers.userAgent}" \
          "${url}"`;
      },
      // Strategy 5: pure web with skip
      () => {
        const headers = getRandomHeaders();
        return `yt-dlp -j \
          --extractor-args "youtube:player_client=web,skip=webpage" \
          --user-agent "${headers.userAgent}" \
          --http-header "Accept-Language: ${headers.language}" \
          "${url}"`;
      },
    ];

    let lastError;
    for (let strategyIdx = 0; strategyIdx < strategies.length; strategyIdx++) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const command = strategies[strategyIdx]();
          console.log(`⚙️ Strategy ${strategyIdx + 1}, Attempt ${attempt}...`);
          
          const { stdout } = await execPromise(command, { 
            maxBuffer: 50 * 1024 * 1024,
            timeout: 60000,
            env: { ...process.env, LANG: 'en_US.UTF-8' }
          });
          
          const videoInfo = JSON.parse(stdout);

          const info = {
            title: videoInfo.title || 'Unknown',
            duration: videoInfo.duration || 0,
            channel: videoInfo.uploader || 'Unknown',
            thumbnail: videoInfo.thumbnail || '',
            formats: {
              mp4: [
                { quality: '1080p', size: '145 MB' },
                { quality: '720p', size: '78 MB' },
                { quality: '480p', size: '42 MB' }
              ],
              mp3: [
                { quality: '320kbps', size: '55 MB' },
                { quality: '192kbps', size: '33 MB' }
              ]
            }
          };

          console.log('✅✅✅ SUCCESS WITH STRATEGY', strategyIdx + 1);
          return res.json(info);
          
        } catch (error) {
          lastError = error;
          console.error(`Strategy ${strategyIdx + 1} Attempt ${attempt} failed:`, error.message.slice(0, 50));
          
          if (attempt === 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (strategyIdx + 1)));
          }
        }
      }
    }
    
    console.error('❌ ALL STRATEGIES EXHAUSTED');
    res.status(500).json({ 
      error: 'YouTube blocking all strategies. Solutions: 1) Wait 30min 2) Use VPN 3) Try different video 4) Upgrade server',
      debug: lastError?.message?.slice(0, 100)
    });
    
  } catch (error) {
    console.error('💥 FATAL:', error.message);
    res.status(500).json({ error: 'Critical error: ' + error.message.slice(0, 100) });
  }
});

app.post('/api/download', async (req, res) => {
  try {
    const { url, format, quality } = req.body;

    if (!url || !format) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    console.log(`📥 NUCLEAR DOWNLOAD: ${format}`);

    const timestamp = Date.now();
    const outputTemplate = path.join(DOWNLOADS_DIR, `%(title)s_${timestamp}.%(ext)s`);
    const headers = getRandomHeaders();

    let command;
    const baseArgs = `--user-agent "${headers.userAgent}" \
      --http-header "Accept-Language: ${headers.language}" \
      --socket-timeout 60 \
      --extractor-args "youtube:player_client=web"`;

    if (format === 'mp3') {
      command = `yt-dlp ${baseArgs} \
        -f "bestaudio[ext=m4a]/bestaudio/best" \
        -x --audio-format mp3 --audio-quality 192 \
        -o "${outputTemplate}" \
        "${url}"`;
    } else {
      command = `yt-dlp ${baseArgs} \
        -f "best[height<=720]/best" \
        -o "${outputTemplate}" \
        "${url}"`;
    }

    console.log('⚙️ Executing download...');
    await execPromise(command, { 
      maxBuffer: 50 * 1024 * 1024,
      timeout: 600000,
      env: { ...process.env, LANG: 'en_US.UTF-8' }
    });

    const files = fs.readdirSync(DOWNLOADS_DIR)
      .filter(f => f.includes(timestamp))
      .sort((a, b) => fs.statSync(path.join(DOWNLOADS_DIR, b)).mtime - fs.statSync(path.join(DOWNLOADS_DIR, a)).mtime);

    if (!files.length) {
      return res.status(500).json({ error: 'Download failed - file not found' });
    }

    const file = path.join(DOWNLOADS_DIR, files[0]);
    const size = Math.round(fs.statSync(file).size / (1024 * 1024)) + ' MB';

    console.log('✅ Download complete:', files[0]);
    res.json({
      success: true,
      filename: files[0],
      downloadUrl: `/downloads/${files[0]}`,
      size: size
    });

    // Aggressive cleanup
    setTimeout(() => {
      try {
        if (fs.existsSync(file)) fs.unlinkSync(file);
        console.log('🗑️ Cleaned up:', files[0]);
      } catch (e) {
        console.error('Cleanup failed:', e.message);
      }
    }, 3 * 60 * 1000);

  } catch (error) {
    console.error('💥 DOWNLOAD FAILED:', error.message.slice(0, 100));
    res.status(500).json({ error: 'Download failed: ' + error.message.slice(0, 80) });
  }
});

app.get('/api/test-strategies', async (req, res) => {
  res.json({
    strategies: [
      'web_embedded',
      'android',
      'ios',
      'tv_embedded',
      'web with skip'
    ],
    status: 'Testing all strategies on next request'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('💥 APP ERROR:', err.message);
  res.status(500).json({ error: 'Server error' });
});

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║  🚀 BLVCK-DOWNLOAD NUCLEAR MODE 🚀    ║
║  Deploying 5 yt-dlp strategies        ║
║  Header rotation enabled              ║
║  Maximum compatibility mode           ║
╚═══════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  server.close(() => process.exit(0));
});
