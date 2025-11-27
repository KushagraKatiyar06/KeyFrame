const redis = require('redis');
const { v4: uuidv4 } = require('uuid');

//connects to redis using environment variable
const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

//logs in when we successfully connect
client.on('connect', () => {
  console.log('Connected to Redis');
});
client.on('error', (err) => {
  console.error('Redis connection error:', err);
});

//connects to redis when the app starts
client.connect().catch((err) => {
  console.error('Failed to connect to Redis:', err);
  process.exit(1);
});

//helper function to push a job to the queue in celery format
async function pushJob(jobData) {
  try {
     const taskId =uuidv4();
    const celeryMessage= {
      body: Buffer.from(JSON.stringify([[jobData], {}, {}])).toString('base64'),
      'content-encoding': 'utf-8',
      'content-type': 'application/json',
      headers: {
        lang:'js',
        task: 'orchestrator.process_video_job',
        id: taskId,
        root_id: taskId,
        parent_id: null,
        group: null
      },
      properties: {
        correlation_id: taskId,
        reply_to:taskId,
        delivery_mode: 2,
        delivery_info: {
          exchange: '',
          routing_key: 'celery'
        },
        priority: 0,
        body_encoding: 'base64',
        delivery_tag: taskId
      }
    };
    
    //pushses to the celery queue
    await client.lPush('celery', JSON.stringify(celeryMessage));
    console.log('Job pushed to Redis queue:', jobData.id);
  } catch (error) {
    console.error('Error pushing job to Redis:', error);
    throw error;
  }
}

//helper function to get a job from the queue
async function getJob() {
  try {
    const job = await client.blPop('celery', 0);
    if (job) {
      return JSON.parse(job.element);
    }
    return null;
  } catch (error) {
    console.error('Error getting job from Redis:', error);
    throw error;
  }
}

module.exports = {
  client,
  pushJob,
  getJob
};

// helper to set job status (hash) and publish an event
async function setJobStatus(jobId, data) {
  try {
    const key = `job:${jobId}`;
    // data is an object
    await client.hSet(key, data);
    // publish the event
    await client.publish(`job_events:${jobId}`, JSON.stringify(data));
  } catch (err) {
    console.error('Error setting job status:', err);
    throw err;
  }
}

async function getJobStatus(jobId) {
  try {
    const key = `job:${jobId}`;
    const res = await client.hGetAll(key);
    return res; // object (empty if not found)
  } catch (err) {
    console.error('Error getting job status:', err);
    throw err;
  }
}

module.exports.setJobStatus = setJobStatus;
module.exports.getJobStatus = getJobStatus;
