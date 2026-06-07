const express = require('express');
const router = express.Router();
const db = require('../database');
const redis = require('../redis');
const { DAILY_LIMIT, USER_DAILY_LIMIT, todayKey, userKey, secondsUntilMidnightUTC } = require('./quota');

//POST /api/v1/generate
router.post('/', async (req,res) =>{
  try {
    const { prompt, style } = req.body;

    if (!prompt){
      return res.status(400).json({
        error: 'Missing required field: prompt'
      });
    }

    if (prompt.length > 500) {
      return res.status(400).json({
        error: 'Prompt is too long. Maximum 500 characters'
      });
    }

    const userToken = req.headers['x-user-token'] || '';

    // check per-user daily quota (2/day per browser UUID)
    if (userToken) {
      try {
        const uKey = userKey(userToken);
        const userCount = await redis.client.incr(uKey);
        if (userCount === 1) {
          await redis.client.expire(uKey, secondsUntilMidnightUTC() + 60);
        }
        if (userCount > USER_DAILY_LIMIT) {
          await redis.client.decr(uKey);
          return res.status(429).json({
            error: `You've reached your daily limit of ${USER_DAILY_LIMIT} videos. Check back tomorrow!`,
            userRemaining: 0,
            resetsInSeconds: secondsUntilMidnightUTC()
          });
        }
      } catch (quotaErr) {
        console.error('User quota Redis error (failing open):', quotaErr.message);
      }
    }

    // check global daily quota
    try {
      const key = todayKey();
      const count = await redis.client.incr(key);
      if (count === 1) {
        await redis.client.expire(key, secondsUntilMidnightUTC() + 60);
      }
      if (count > DAILY_LIMIT) {
        await redis.client.decr(key);
        // also roll back user count if we had incremented it
        if (userToken) {
          await redis.client.decr(userKey(userToken)).catch(() => {});
        }
        return res.status(429).json({
          error: `Daily generation limit of ${DAILY_LIMIT} reached. Check back tomorrow.`,
          remaining: 0,
          resetsInSeconds: secondsUntilMidnightUTC()
        });
      }
    } catch (quotaErr) {
      console.error('Quota Redis error (failing open):', quotaErr.message);
    }


    const resolvedStyle = style || 'Default';

    const jobId = await db.insertJob(prompt, resolvedStyle);

    const jobData = {
      id: jobId,
      prompt: prompt,
      style: resolvedStyle
    };
    await redis.pushJob(jobData);
    

    res.status(202).json({
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