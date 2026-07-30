# YouTube Downloader - Quick Start Guide (5 Minutes)

## Prerequisites
- **Node.js** installed (download from nodejs.org)
- **Python 3.6+** installed
- **yt-dlp** installed

---

## Step 1: Install yt-dlp (1 minute)

Open your terminal/command prompt and run:

```bash
pip install yt-dlp
```

Verify it worked:
```bash
yt-dlp --version
```

You should see a version number like: `2024.01.16`

---

## Step 2: Set Up the Backend (2 minutes)

### Create project folder:
```bash
mkdir youtube-downloader
cd youtube-downloader
```

### Initialize Node project:
```bash
npm init -y
```

### Install dependencies:
```bash
npm install express cors dotenv
```

### Create these files:

**server.js** - Copy the `server.js` file I provided above into this folder

**package.json** - Add these scripts to your `package.json`:
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "npm install -g nodemon && nodemon server.js"
  }
}
```

### Create downloads folder:
```bash
mkdir downloads
```

---

## Step 3: Start the Backend (1 minute)

```bash
npm start
```

You should see:
```
╔════════════════════════════════════════╗
║   YouTube Downloader Backend Started   ║
╠════════════════════════════════════════╣
║ Server: http://localhost:5000         ║
║ Downloads: /path/to/downloads/        ║
╚════════════════════════════════════════╝
```

The server is now running!

---

## Step 4: Open the Frontend (1 minute)

1. Save the `index.html` file I provided in your project folder
2. Open it in your browser: Double-click `index.html` or use `python -m http.server 8000` and navigate to `http://localhost:8000`

---

## Step 5: Test It!

1. Paste a YouTube URL (example: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`)
2. Click "Download"
3. Select format (MP4 or MP3)
4. Select quality
5. Click "Download Now"
6. File will download to your `downloads` folder!

---

## Troubleshooting

### Problem: "yt-dlp command not found"
```bash
python3 -m pip install --upgrade yt-dlp
```

### Problem: Port 5000 already in use
Change port in `server.js` (line 13):
```javascript
const PORT = process.env.PORT || 3000; // Changed from 5000
```

And in `index.html` (line 179):
```javascript
const API_URL = 'http://localhost:3000';
```

### Problem: CORS errors
Make sure `cors()` is in your `server.js` - it already is!

### Problem: Downloads not working
1. Check the console in browser (F12 → Console)
2. Check server terminal for errors
3. Make sure `downloads` folder exists
4. Check file permissions on downloads folder

---

## File Structure

```
youtube-downloader/
├── server.js          (backend)
├── index.html         (frontend)
├── package.json
├── downloads/         (where files go)
└── node_modules/
```

---

## Next Steps

### Want to make it fancier?
- Add a database to track downloads
- Implement user authentication
- Deploy to Heroku or AWS
- Add playlist support
- Add subtitle downloading

### Want to deploy?

**For local network sharing:**
```bash
# Find your local IP
ipconfig (Windows)
ifconfig (Mac/Linux)

# In server.js, change:
app.listen(PORT, '0.0.0.0');

# Then access from other devices at: http://YOUR_IP:5000
```

**For internet deployment:**
- Use **Heroku** (free tier available)
- Use **Railway** (modern Heroku alternative)
- Use **DigitalOcean** (cheap VPS)

---

## Commands Cheat Sheet

```bash
# Start backend
npm start

# Start with auto-reload (requires nodemon)
npm run dev

# Test backend
curl http://localhost:5000/health

# Check yt-dlp
yt-dlp --version

# Update yt-dlp
pip install --upgrade yt-dlp
```

---

## Common Port Numbers
- **3000** - Node.js default
- **5000** - Flask/backend
- **8000** - Python HTTP server
- **8080** - Alternative web port

If you get "port already in use" error, try a different port!

---

That's it! You're all set. Happy downloading!
