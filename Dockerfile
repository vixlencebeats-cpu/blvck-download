# Build stage
FROM node:18-alpine AS base

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    bash \
    curl \
    git

# Set pip to have no cache and install yt-dlp
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir yt-dlp requests

# Verify yt-dlp is installed and working
RUN which yt-dlp && yt-dlp --version

# Production stage
FROM node:18-alpine

# Copy yt-dlp and python from base
COPY --from=base /usr/bin/python3 /usr/bin/python3
COPY --from=base /usr/bin/yt-dlp /usr/bin/yt-dlp
COPY --from=base /usr/bin/ffmpeg /usr/bin/ffmpeg
COPY --from=base /usr/bin/ffprobe /usr/bin/ffprobe
COPY --from=base /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=base /usr/local/bin/pip /usr/local/bin/pip

# Verify yt-dlp in final stage
RUN yt-dlp --version

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
