const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', async (req,res) =>{
  try {
    const search = req.query.search || null;
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    const isAdmin = !!process.env.ADMIN_PASSWORD && token === process.env.ADMIN_PASSWORD;
    const videos = await db.getRecentCompletedVideos(search, isAdmin);

    //return the videos array
    res.status(200).json({
      success: true,
      count: videos.length,
      videos: videos
    });
    
  } catch (error) {
    console.error('Error in feed route:',error);
    res.status(500).json({ 
      error: 'Failed to get video feed' 
    });}
});

module.exports = router;