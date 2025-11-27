const express = require('express');
const router = express.Router();
const redis = require('../redis');
const database = require('../database');

// POST /api/v1/videos/:id/title
router.post('/:id/title', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    if (!id || !title) return res.status(400).json({ error: 'Missing id or title' });

    const key = `job:${id}`;
    // update redis hash and publish an event
    await redis.client.hSet(key, { title, updated_at: new Date().toISOString() });
    await redis.client.publish(`job_events:${id}`, JSON.stringify({ title, updated_at: new Date().toISOString() }));

    // best-effort DB update if available
    try {
      await database.update_job_title(id, title);
    } catch (e) {
      // ignore if DB not available
      console.warn('DB update for title failed', e);
    }

    res.status(200).json({ success: true, id, title });
  } catch (err) {
    console.error('Error updating title:', err);
    res.status(500).json({ error: 'Failed to update title' });
  }
});

module.exports = router;
