FROM node:18-alpine

RUN apk add --no-cache python3 py3-pip ffmpeg

RUN pip install --upgrade pip
RUN pip install yt-dlp requests

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
