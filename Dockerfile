FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ffmpeg \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp using pip
RUN pip install --no-cache-dir yt-dlp requests

# Verify everything is installed
RUN echo "Checking yt-dlp..." && \
    which yt-dlp && \
    yt-dlp --version && \
    echo "Checking Node..." && \
    node --version && \
    npm --version && \
    echo "Checking ffmpeg..." && \
    ffmpeg -version | head -1 && \
    echo "All dependencies verified!"

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

# Final check before starting
CMD sh -c "yt-dlp --version && echo 'yt-dlp is ready!' && npm start"
