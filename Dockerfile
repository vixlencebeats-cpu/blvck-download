FROM node:18-alpine

# Install Python and pip (needed for yt-dlp)
RUN apk add --no-cache python3 py3-pip ffmpeg

# Install/upgrade yt-dlp with latest requests
RUN pip install --upgrade pip && pip install --upgrade yt-dlp requests

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

# Start the application
CMD ["npm", "start"]
