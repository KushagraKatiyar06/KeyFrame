const express = require('express');
const router = express.Router();
const db = require('../database');
const redis = require('../redis');

//POST /api/v1/generate
router.post('/', async (req,res) =>{
  try {
    const { prompt, style } = req.body;
    
    //check that prompt and style are provided
    if (!prompt || !style){
      return res.status(400).json({ 
        error: 'Missing required fields: prompt and style' 
      });
    }
    
    // check that style is one of the allowed options
    const validStyles = ['Educational','Storytelling','Meme'];
    if (!validStyles.includes(style)) {
      return res.status(400).json({ 
        error: 'Invalid style. Must be Educational, Storytelling, or Meme' 
      });
    }
    
    //make sures prompt isn't too long
    if (prompt.length > 500) {
      return res.status(400).json({ 
        error: 'Prompt is too long. Maximum 500 characters' 
      });
    }
    
    //this line inserts the job into postgres
    const jobId = await db.insertJob(prompt, style);
    
    //pushs the job to redis queue for the worker to pick up
    const jobData = {
      id: jobId,
      prompt: prompt,
      style: style
    };
    await redis.pushJob(jobData);
    
    //sends the response with the job id
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