FROM ubuntu:22.04

# Install Python, pip, Node.js, and ffmpeg in one go
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    nodejs \
    npm \
    ffmpeg \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN pip3 install --no-cache-dir yt-dlp requests

# Verify installation
RUN yt-dlp --version && node --version && npm --version && ffmpeg -version | head -1

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
