const express = require('express');
const router = express.Router();
const redis = require('../redis');
const { URL } = require('url');

// SSE endpoint: /api/v1/events/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).end('Missing job id');

  // set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  try {
    // send initial state if available
    const state = await redis.getJobStatus(id);
    if (state && Object.keys(state).length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'init', data: state })}\n\n`);
    }

    // duplicate client for subscription
    const sub = redis.client.duplicate();
    await sub.connect();

    // subscribe to channel
    await sub.subscribe(`job_events:${id}`, (message) => {
      // forward message to client
      res.write(`data: ${message}\n\n`);
    });

    // cleanup on client disconnect
    req.on('close', async () => {
      try {
        await sub.unsubscribe(`job_events:${id}`);
      } catch (e) {
        // ignore
      }
      try { await sub.quit(); } catch (e) {}
    });

  } catch (err) {
    console.error('SSE error:', err);
    res.status(500).end();
  }
});

module.exports = router;
