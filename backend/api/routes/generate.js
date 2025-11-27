const express = require('express');
const router = express.Router();
const db = require('../database');
const redis = require('../redis');

//POST /api/v1/generate
router.post('/', async (req,res) =>{
  try {
    const { prompt, style } = req.body;
    
    //validate that prompt and style are provided
    if (!prompt || !style){
      return res.status(400).json({ 
        error: 'Missing required fields: prompt and style' 
      });
    }
    
    // validate style is one of the allowed options
    const validStyles = ['Educational','Storytelling','Meme'];
    if (!validStyles.includes(style)) {
      return res.status(400).json({ 
        error: 'Invalid style. Must be Educational, Storytelling, or Meme' 
      });
    }
    
    //validates prompt isn't too long
    if (prompt.length > 500) {
      return res.status(400).json({ 
        error: 'Prompt is too long. Maximum 500 characters' 
      });
    }
    
    // generate a job id and push to redis queue (skip DB insertion for now)
    const { v4: uuidv4 } = require('uuid');
    const jobId = uuidv4();

    const jobData = {
      id: jobId,
      prompt: prompt,
      style: style
    };

    // set initial job state in redis and push to queue
    await redis.setJobStatus(jobId, { status: 'queued', progress: '0', prompt, style });
    await redis.pushJob(jobData);

    // respond with job id
    res.status(201).json({ 
      success: true,
      jobId: jobId,
      message:'Video generation job created and queued'
    });
  } catch (error) {
    console.error('Error in generate route:',error);
    res.status(500).json({ 
      error: 'Failed to create video generation job' 
    });
  }
});
module.exports = router;