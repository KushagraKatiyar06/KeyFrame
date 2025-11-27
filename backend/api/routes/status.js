const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/:id',async(req, res) => {
  try {
    const {id} = req.params;
    
//validates that id is provided
    if (!id){
      return res.status(400).json({ 
        error: 'Job ID is required' 
      });}

    // first try to read from redis job state (fast, no DB required)
    const jobState = await redis.getJobStatus(id);
    // if redis has data, return that
    if (jobState && Object.keys(jobState).length > 0) {
      return res.status(200).json({
        id: id,
        prompt: jobState.prompt || null,
        style: jobState.style || null,
        status: jobState.status || 'queued',
        progress: jobState.progress || '0',
        video_url: jobState.video_url || null,
        thumbnail_url: jobState.thumbnail_url || null,
        updated_at: jobState.updated_at || null
      });
    }

    // fallback: get the job from postgres if present
    const job = await db.getJobById(id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.status(200).json({
      id: job.id,
      prompt: job.prompt,
      style: job.style,
      status: job.status,
      video_url: job.video_url,
      thumbnail_url: job.thumbnail_url,
      created_at: job.created_at
    });
    
  } catch (error) {
    console.error('Error in status route:', error);
    res.status(500).json({ 
      error: 'Failed to get job status' 
    });
  }
});

module.exports = router;