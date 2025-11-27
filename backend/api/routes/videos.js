const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const redis = require('../redis');

// GET /api/v1/videos/:id - stream the generated video file for job id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'Missing job id' });

  try {
    const state = await redis.getJobStatus(id);
    let videoUrl = state && state.video_url ? state.video_url : null;

    // fallback to database not implemented for now
    if (!videoUrl) {
      return res.status(404).json({ error: 'Video not found for this job' });
    }

    // strip file:// if present
    if (videoUrl.startsWith('file://')) {
      videoUrl = videoUrl.replace(/^file:\/\//, '');
    }

    // ensure path exists
    if (!fs.existsSync(videoUrl)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    const stat = fs.statSync(videoUrl);
    const fileSize = stat.size;
    const range = req.headers.range;

    const wantsDownload = req.query && (req.query.download === '1' || req.query.download === 'true');

    if (wantsDownload) {
      // Suggest browser download with a filename
      const filename = `keyframe-video-${id}.mp4`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;

      const file = fs.createReadStream(videoUrl, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4'
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4'
      };
      // Ensure content-disposition (download) header is preserved for full responses
      if (wantsDownload) {
        // already set above
      }
      res.writeHead(200, head);
      fs.createReadStream(videoUrl).pipe(res);
    }

  } catch (err) {
    console.error('Video stream error:', err);
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

module.exports = router;
