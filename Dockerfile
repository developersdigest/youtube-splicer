FROM node:18-slim

# Install FFmpeg and yt-dlp dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN pip3 install --no-cache-dir yt-dlp

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app source
COPY . .

# Create directories for downloads and clips
RUN mkdir -p downloads clips

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"] 