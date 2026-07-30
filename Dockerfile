FROM node:18-alpine

# Install Python and pip (needed for yt-dlp)
RUN apk add --no-cache python3 py3-pip ffmpeg

# Install yt-dlp
RUN pip install yt-dlp

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
