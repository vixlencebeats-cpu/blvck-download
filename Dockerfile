FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    bash \
    curl \
    git \
    && pip install --upgrade pip

# Install yt-dlp with a retry mechanism
RUN for i in 1 2 3; do pip install yt-dlp requests && break || sleep 2; done

# Verify everything is installed and working
RUN echo "=== Verifying dependencies ===" && \
    which python3 && python3 --version && \
    which yt-dlp && yt-dlp --version && \
    which ffmpeg && ffmpeg -version | head -n 1 && \
    echo "=== Verification complete ===" || exit 1

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

# Health check to ensure everything works before serving traffic
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD yt-dlp --version > /dev/null 2>&1 || exit 1

# Start server with verification
CMD sh -c "echo 'Verifying yt-dlp before start...' && yt-dlp --version && echo 'Starting server...' && npm start"
