FROM ubuntu:22.04

# Set non-interactive mode
ENV DEBIAN_FRONTEND=noninteractive

# Update and install all dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-distutils \
    nodejs \
    npm \
    ffmpeg \
    curl \
    git \
    ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp using pip3
RUN pip3 install --upgrade pip && \
    pip3 install yt-dlp requests

# Verify installations
RUN which yt-dlp && \
    yt-dlp --version && \
    node --version && \
    npm --version && \
    ffmpeg -version | head -1

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
