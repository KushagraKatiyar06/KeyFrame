require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
//log all incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

//imports route files
const generateRoute=require('./routes/generate');
const statusRoute =require('./routes/status');
const feedRoute = require('./routes/feed');
const eventsRoute = require('./routes/events');
const videosRoute = require('./routes/videos');
const videosMetaRoute = require('./routes/videos_meta');

//mounts the routes
app.use('/api/v1/generate',generateRoute);
app.use('/api/v1/status',statusRoute);
app.use('/api/v1/feed',feedRoute);
app.use('/api/v1/events', eventsRoute);
app.use('/api/v1/videos', videosRoute);
app.use('/api/v1/videos', videosMetaRoute);
app.get('/', (req, res)=>{
  res.json({ message: 'KeyFrame API is running', status: 'ok' });
});

//handles 404 errors
app.use((req, res)=>{
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next)=>{
  console.error('Error:', err.message);
  res.status(500).json({ error:'Something went wrong on the server' });
});

//starts the server
app.listen(PORT, async()=>{
  console.log(`Server running on port ${PORT}`);
  
  //creates the videos table if it doesn't exist
  try {
    await db.createVideosTable();
    console.log('Database ready');
  } catch (error) {
    console.error('Failed to initialize database:',error);
  }
});

//shutdown
process.on('SIGINT', async () =>{
  console.log('\nShutting down...');
  await db.closePool();
  process.exit(0);
});