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

# Install yt-dlp
RUN pip install --no-cache-dir yt-dlp requests

# Verify everything works
RUN echo "Verifying installations..." && \
    which yt-dlp && yt-dlp --version && \
    node --version && \
    npm --version && \
    ffmpeg -version | head -1 && \
    echo "All systems ready!"

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

# Start with verification
CMD sh -c "yt-dlp --version && echo 'Starting server...' && npm start"
