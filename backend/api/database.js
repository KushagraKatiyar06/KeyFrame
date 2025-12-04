const {Pool} = require('pg');

//setup postgres connection with environment variables
const pool =new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`
});

//log when we connect successfully
pool.on('connect',() => {
  console.log('Connected to database');
});

//if connection fails, exit the app
pool.on('error',(err)=>{
  console.error('Database connection error:', err);
  process.exit(-1);
});

//cretes the videos table in postgres
async function createVideosTable() {
  const query=`
    CREATE TABLE IF NOT EXISTS videos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      prompt TEXT NOT NULL,
      style TEXT NOT NULL,
      status TEXT DEFAULT 'queued',
      video_url TEXT,
      thumbnail_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
    CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);
  `;

  try {
    await pool.query(query);
    console.log('Videos table created');
    return { success: true };
  } catch (error) {
    console.error('Error creating table:', error.message);
    throw error;
  }
}

//inserts a new job into the database and returns the job id
async function insertJob(prompt, style) {
  const query =`
    INSERT INTO videos (prompt, style)
    VALUES ($1, $2)
    RETURNING id;
  `;

  try {
    const result = await pool.query(query, [prompt, style]);
    const jobId = result.rows[0].id;
    console.log('Job inserted with ID:', jobId);
    return jobId;
  } catch (error) {
    console.error('Error inserting job:', error.message);
    throw error;
  }
}

//updates the job status and optionally the video/thumbnail urls
async function updateJobStatus(id, status, videoUrl = null, thumbnailUrl = null) {
  const query = `
    UPDATE videos
    SET status = $1,
        video_url = COALESCE($2, video_url),
        thumbnail_url = COALESCE($3, thumbnail_url)
    WHERE id = $4
    RETURNING id;
  `;

  try {
    const result = await pool.query(query, [status, videoUrl, thumbnailUrl, id]);
    
    if (result.rowCount === 0) {
      throw new Error('Job not found');
    }
    console.log('Job status updated:', id);
    return { success: true };
  } catch (error) {
    console.error('Error updating job:', error.message);
    throw error;
  }
}

//gets a single job by its id
async function getJobById(id){
  const query = `
    SELECT id, prompt, style, status, video_url, thumbnail_url, created_at
    FROM videos
    WHERE id = $1;
  `;

  try {
    const result = await pool.query(query, [id]);
    
    //return null if no job found
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  } catch (error) {
    console.error('Error getting job:', error.message);
    throw error;
  }
}
//gets the last 15 completed videos for the feed (5 from each category)
async function getRecentCompletedVideos() {
  const query = `
    (SELECT id, prompt, style, video_url, thumbnail_url, created_at
     FROM videos
     WHERE status = 'done' AND style = 'Educational'
     ORDER BY created_at DESC
     LIMIT 5)
    UNION ALL
    (SELECT id, prompt, style, video_url, thumbnail_url, created_at
     FROM videos
     WHERE status = 'done' AND style = 'Meme'
     ORDER BY created_at DESC
     LIMIT 5)
    UNION ALL
    (SELECT id, prompt, style, video_url, thumbnail_url, created_at
     FROM videos
     WHERE status = 'done' AND style = 'Storytelling'
     ORDER BY created_at DESC
     LIMIT 5)
    ORDER BY created_at DESC;
  `;

  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Error getting completed videos:', error.message);
    throw error;
  }
}

//cleanup function to close the database connection
async function closePool() {
  try {
    await pool.end();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing connection:', error.message);
  }
}

module.exports = {
  pool,
  createVideosTable,
  insertJob,
  updateJobStatus,
  getJobById,
  getRecentCompletedVideos,
  closePool
};