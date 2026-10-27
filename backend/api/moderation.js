// simple bad-word filter applied to user-submitted titles and author names
// words are base64-encoded so the literal terms aren't sitting in plaintext in a public repo
const BLOCKED_B64 = [
  'bmlnZ2Vy','bmlnZ2E=','ZmFnZ290','Y2hpbms=','c3BpYw==','a2lrZQ==','d2V0YmFjaw==','dHJhbm55',
  'Y3VudA==','Yml0Y2g=','Y29jaw==','cHVzc3k=','d2hvcmU=','c2x1dA==','cmV0YXJk','cmFwZQ==','bmF6aQ==',
  'aGl0bGVy','cGVkbw==','cGVkb3BoaWxl','cG9ybg==','cG9ybm8=','amlnYWJvbw==','Z29vaw==',
];
const BLOCKED = BLOCKED_B64.map(w => Buffer.from(w, 'base64').toString('utf8'));

function isBlocked(text) {
  if (!text || typeof text !== 'string') return false;
  return BLOCKED.some(word => {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    return re.test(text);
  });
}

module.exports = { isBlocked };
