# Use official Node.js runtime as base image
FROM node:18-alpine

# Install system dependencies including Python and ffmpeg
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    bash \
    curl \
    && rm -rf /var/cache/apk/*

# Upgrade pip
RUN python3 -m pip install --upgrade pip setuptools wheel

# Install yt-dlp and requests
RUN pip install yt-dlp requests

# Verify installation
RUN which yt-dlp && yt-dlp --version

# Set work directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Run the app
CMD ["npm", "start"]
