// simple bad-word filter applied to user-submitted titles and author names
const BLOCKED = [
  'nigger','nigga','faggot','chink','spic','kike','wetback','tranny',
  'cunt','bitch','cock','pussy','whore','slut','retard','rape','nazi',
  'hitler','pedo','pedophile','porn','porno','jigaboo','gook',
];

function isBlocked(text) {
  if (!text || typeof text !== 'string') return false;
  return BLOCKED.some(word => {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    return re.test(text);
  });
}

module.exports = { isBlocked };
