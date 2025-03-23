// index.js - Main application entry point
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Promisify exec for cleaner async/await usage
const execAsync = promisify(exec);

// Create storage directories if they don't exist
const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads');
const CLIPS_DIR = path.join(process.cwd(), 'clips');

if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

if (!fs.existsSync(CLIPS_DIR)) {
  fs.mkdirSync(CLIPS_DIR, { recursive: true });
}

// Initialize Hono app
const app = new Hono();

// Health check endpoint
app.get('/', (c) => {
  return c.text('YouTube Video Splicing API');
});

// Process video endpoint
app.post('/process-video', async (c) => {
  try {
    const { videoUrl, timestamps } = await c.req.json();
    
    if (!videoUrl) {
      return c.json({ error: 'Video URL is required' }, 400);
    }
    
    if (!timestamps || !Array.isArray(timestamps) || timestamps.length === 0) {
      return c.json({ error: 'Valid timestamps array is required' }, 400);
    }
    
    // Generate a unique ID for this request
    const requestId = uuidv4();
    const videoPath = path.join(DOWNLOADS_DIR, `${requestId}.mp4`);
    
    // Download the video using yt-dlp
    console.log(`Downloading video: ${videoUrl}`);
    await execAsync(`yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4" "${videoUrl}" -o "${videoPath}"`);
    
    // Process each timestamp pair to create clips
    const clipPaths = [];
    for (let i = 0; i < timestamps.length; i++) {
      const { start, end, label } = timestamps[i];
      
      if (typeof start !== 'number' || typeof end !== 'number' || start >= end) {
        return c.json({ error: `Invalid timestamp pair at index ${i}` }, 400);
      }
      
      const clipName = label ? `${requestId}_${label}_${i}.mp4` : `${requestId}_clip_${i}.mp4`;
      const clipPath = path.join(CLIPS_DIR, clipName);
      
      // Use FFmpeg to extract the clip based on start and end times
      console.log(`Creating clip from ${start}s to ${end}s`);
      await execAsync(`ffmpeg -i "${videoPath}" -ss ${start} -to ${end} -c:v libx264 -c:a aac "${clipPath}"`);
      
      clipPaths.push({
        index: i,
        label: label || `clip_${i}`,
        path: clipPath,
        filename: clipName
      });
    }
    
    // Store metadata about the processed video and clips
    const metadata = {
      requestId,
      originalUrl: videoUrl,
      processedAt: new Date().toISOString(),
      clips: clipPaths.map(clip => ({
        index: clip.index,
        label: clip.label,
        filename: clip.filename
      }))
    };
    
    const metadataPath = path.join(CLIPS_DIR, `${requestId}_metadata.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    
    return c.json({
      success: true,
      requestId,
      message: `Successfully processed ${clipPaths.length} clips`,
      clips: clipPaths.map(clip => ({
        index: clip.index,
        label: clip.label,
        filename: clip.filename
      }))
    });
  } catch (error) {
    console.error('Error processing video:', error);
    return c.json({ error: 'Failed to process video', details: error.message }, 500);
  }
});

// Get clip endpoint
app.get('/clips/:filename', (c) => {
  const filename = c.req.param('filename');
  const filePath = path.join(CLIPS_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    return c.json({ error: 'Clip not found' }, 404);
  }
  
  // Stream the file back to the client
  const stream = fs.createReadStream(filePath);
  return new Response(stream, {
    headers: {
      'Content-Type': 'video/mp4'
    }
  });
});

// Get metadata endpoint
app.get('/metadata/:requestId', (c) => {
  const requestId = c.req.param('requestId');
  const metadataPath = path.join(CLIPS_DIR, `${requestId}_metadata.json`);
  
  if (!fs.existsSync(metadataPath)) {
    return c.json({ error: 'Metadata not found' }, 404);
  }
  
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  return c.json(metadata);
});

// Start the server
const port = process.env.PORT || 3000;
console.log(`Server is running on port ${port}`);

// For Bun
export default {
  port,
  fetch: app.fetch
};

// For Node.js (if not using Bun)
if (process.env.NODE_ENV !== 'bun') {
  serve({
    fetch: app.fetch,
    port
  });
} 