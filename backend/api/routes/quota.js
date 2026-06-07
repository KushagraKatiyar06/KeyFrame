const express = require('express');
const router = express.Router();
const { client: redis } = require('../redis');

const DAILY_LIMIT = parseInt(process.env.DAILY_QUOTA || '20', 10);
const USER_DAILY_LIMIT = 2;

function todayKey() {
  return `quota:${new Date().toISOString().slice(0, 10)}`;
}

function userKey(token) {
  return `quota:user:${new Date().toISOString().slice(0, 10)}:${token}`;
}

function secondsUntilMidnightUTC() {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.floor((midnight - now) / 1000);
}

// GET /api/v1/quota
router.get('/', async (req, res) => {
  try {
    const token = req.headers['x-user-token'] || '';
    const [globalUsed, userUsed] = await Promise.all([
      redis.get(todayKey()).then(v => parseInt(v || '0', 10)),
      token ? redis.get(userKey(token)).then(v => parseInt(v || '0', 10)) : Promise.resolve(0),
    ]);
    res.json({
      used: globalUsed,
      limit: DAILY_LIMIT,
      remaining: Math.max(0, DAILY_LIMIT - globalUsed),
      userUsed,
      userLimit: USER_DAILY_LIMIT,
      userRemaining: Math.max(0, USER_DAILY_LIMIT - userUsed),
      resetsInSeconds: secondsUntilMidnightUTC()
    });
  } catch (error) {
    console.error('Quota check error:', error.message);
    res.json({ used: 0, limit: DAILY_LIMIT, remaining: DAILY_LIMIT, userUsed: 0, userLimit: USER_DAILY_LIMIT, userRemaining: USER_DAILY_LIMIT, resetsInSeconds: 86400 });
  }
});

module.exports = { router, DAILY_LIMIT, USER_DAILY_LIMIT, todayKey, userKey, secondsUntilMidnightUTC };
