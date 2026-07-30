# Use an image that already has yt-dlp pre-installed
FROM jauderho/yt-dlp:latest

# Install Node.js on top of the yt-dlp image
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Verify everything works
RUN yt-dlp --version && node --version && npm --version

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
