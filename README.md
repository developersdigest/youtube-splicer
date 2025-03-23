# YouTube Video Splicer API

A Node.js API that allows you to download YouTube videos and split them into clips based on timestamps.

## Features

- Download YouTube videos using yt-dlp
- Split videos into clips based on timestamps
- Store metadata about processed videos and clips
- Stream clips back to clients
- RESTful API endpoints

## Prerequisites

- Node.js 18 or higher
- FFmpeg
- yt-dlp

## API Endpoints

### Health Check
```
GET /
```

### Process Video
```
POST /process-video
Content-Type: application/json

{
  "videoUrl": "https://www.youtube.com/watch?v=...",
  "timestamps": [
    {
      "start": 0,
      "end": 30,
      "label": "intro"
    },
    {
      "start": 60,
      "end": 90,
      "label": "highlight"
    }
  ]
}
```

### Get Clip
```
GET /clips/:filename
```

### Get Metadata
```
GET /metadata/:requestId
```

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The server will start on port 3000 by default.

## Deployment

This application is configured for deployment on Railway. The `Dockerfile` includes all necessary dependencies (FFmpeg and yt-dlp).

1. Push your code to a Git repository
2. Connect your repository to Railway
3. Railway will automatically detect the Dockerfile and deploy your application

## Environment Variables

- `PORT`: The port the server will listen on (default: 3000)
- `NODE_ENV`: The environment (development/production)

## License

MIT 