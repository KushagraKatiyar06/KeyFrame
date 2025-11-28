const express = require('express');
const router = express.Router();
const db = require('../database');
const fs = require('fs');
const path = require('path');

// Helper: discover public video folders and return entries
function discoverPublicVideos(req) {
  const publicVideosRoot = path.join(__dirname, '..', 'public', 'videos');
  const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
  const results = [];

  if (!fs.existsSync(publicVideosRoot)) return results;

  const entries = fs.readdirSync(publicVideosRoot, { withFileTypes: true });
  for (const dirent of entries) {
    if (!dirent.isDirectory()) continue;
    const jobId = dirent.name;
    const folder = path.join(publicVideosRoot, jobId);
    const thumbName = `thumbnail${jobId}.jpg`;
    const videoName = `final_video${jobId}.mp4`;
    const thumbPath = path.join(folder, thumbName);
    const videoPath = path.join(folder, videoName);

    const hasThumb = fs.existsSync(thumbPath);
    const hasVideo = fs.existsSync(videoPath);
    const thumbUrl = hasThumb ? `${baseUrl}/public/videos/${jobId}/${thumbName}` : null;
    const videoUrl = hasVideo ? `${baseUrl}/public/videos/${jobId}/${videoName}` : null;

    // determine a timestamp for ordering: prefer final video mtime, else thumbnail mtime, else folder mtime
    let mtime = 0;
    try {
      if (hasVideo) mtime = fs.statSync(videoPath).mtimeMs;
      else if (hasThumb) mtime = fs.statSync(thumbPath).mtimeMs;
      else mtime = fs.statSync(folder).mtimeMs;
    } catch (e) {
      mtime = Date.now();
    }

    results.push({ id: jobId, title: `Video ${jobId.slice(0,8)}`, thumbnailUrl: thumbUrl, videoUrl: videoUrl, mtime });
  }

  return results;
}

router.get('/', async (req,res) =>{
  try {
    //get DB videos (best-effort)
    let videos = [];
    try {
      videos = await db.getRecentCompletedVideos();
    } catch (e) {
      console.warn('DB feed unavailable, falling back to filesystem scan');
    }

    // Discover any public videos on disk and merge (avoid duplicates by id)
    const publicVideos = discoverPublicVideos(req);
    const mergedById = new Map();

    for (const v of videos) mergedById.set(v.id, v);
    for (const pv of publicVideos) {
      if (mergedById.has(pv.id)) {
        const existing = mergedById.get(pv.id);
        existing.thumbnailUrl = existing.thumbnailUrl || pv.thumbnailUrl;
        existing.videoUrl = existing.videoUrl || pv.videoUrl;
      } else {
        mergedById.set(pv.id, pv);
      }
    }

    // sort by mtime (newest first) if available
    const out = Array.from(mergedById.values()).sort((a,b) => (b.mtime || 0) - (a.mtime || 0));

    res.status(200).json({ success: true, count: out.length, videos: out });
  } catch (error) {
    console.error('Error in feed route:',error);
    res.status(500).json({ error: 'Failed to get video feed' });
  }
});

module.exports = router;