FROM node:18-alpine

# Install all dependencies in one go
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    bash \
    curl \
    git \
    && pip install --upgrade pip \
    && pip install yt-dlp requests

# Verify installation BEFORE proceeding
RUN echo "=== Verifying yt-dlp ===" && \
    which yt-dlp && \
    yt-dlp --version && \
    which ffmpeg && \
    ffmpeg -version | head -n 1 && \
    echo "=== All dependencies verified ===" || exit 1

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

# Final verification at startup
CMD sh -c "yt-dlp --version && npm start"
