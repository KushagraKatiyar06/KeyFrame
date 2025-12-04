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

    //gets the job from postgres
    const job= await db.getJobById(id);

    //if job doesn't exist, return 404, and frontend will print an error
    if (!job) {
      return res.status(404).json({ 
        error: 'Job not found' 
      });
    }
    //returns the job data
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