FROM node:18-alpine

# Install Python, pip, and ffmpeg
RUN apk add --no-cache python3 py3-pip ffmpeg curl

# Upgrade pip and install yt-dlp with all dependencies
RUN pip install --upgrade pip setuptools wheel
RUN pip install yt-dlp requests

# Verify yt-dlp installation
RUN yt-dlp --version

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy application files
COPY . .

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start the application
CMD ["npm", "start"]
