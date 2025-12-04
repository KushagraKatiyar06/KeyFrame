# KeyFrame Deployment Guide

## Architecture Overview

KeyFrame consists of 3 main components:
1. **Frontend (Next.js)** - Deployed on Vercel
2. **Backend API (Express/Node.js)** - Deployed on Railway/Render
3. **Celery Worker (Python)** - Deployed on Railway/Render

## Prerequisites

- GitHub repository access (contributor or owner)
- Accounts on:
  - Vercel (for frontend)
  - Railway or Render (for backend + worker)
  - AWS S3 (for video storage)
  - OpenAI API (for GPT-4 and DALL-E)
  - AWS Polly (for text-to-speech)
  - Nebius API (for Flux image generation)

## Deployment Steps

### 1. Deploy Backend Services (Railway - Recommended)

#### Step 1.1: Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Connect your GitHub repository

#### Step 1.2: Deploy PostgreSQL
1. Click "New" → "Database" → "PostgreSQL"
2. Railway will automatically provision the database
3. Note the connection string from the "Connect" tab

#### Step 1.3: Deploy Redis
1. Click "New" → "Database" → "Redis"
2. Railway will automatically provision Redis
3. Note the connection string

#### Step 1.4: Deploy Backend API
1. Click "New" → "GitHub Repo"
2. Select KeyFrame repository
3. Set root directory: `backend`
4. Set Dockerfile path: `Dockerfile.api`
5. Add environment variables:
   ```
   DB_HOST=<from Railway Postgres>
   DB_PORT=5432
   DB_NAME=<from Railway Postgres>
   DB_USER=<from Railway Postgres>
   DB_PASSWORD=<from Railway Postgres>
   REDIS_URL=<from Railway Redis>
   OPENAI_API_KEY=<your key>
   AWS_ACCESS_KEY_ID=<your key>
   AWS_SECRET_ACCESS_KEY=<your key>
   AWS_REGION=us-east-1
   S3_BUCKET_NAME=<your bucket>
   NEBIUS_API_KEY=<your key>
   ```
6. Deploy and note the public URL

#### Step 1.5: Deploy Celery Worker
1. Click "New" → "GitHub Repo"
2. Select KeyFrame repository again
3. Set root directory: `backend`
4. Set Dockerfile path: `Dockerfile.worker`
5. Add the same environment variables as API
6. Deploy

### 2. Deploy Frontend (Vercel)

#### Step 2.1: Connect Repository
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository

#### Step 2.2: Configure Project
- **Framework Preset**: Next.js
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

#### Step 2.3: Add Environment Variables
```
BACKEND_URL=<Railway API URL from step 1.4>
```

#### Step 2.4: Deploy
Click "Deploy" and wait for build to complete

### 3. Alternative: Deploy Everything on Railway

If you want everything on one platform:

1. Create Railway project
2. Add PostgreSQL database
3. Add Redis database
4. Add 3 services from GitHub:
   - Service 1: Backend API (Dockerfile.api)
   - Service 2: Celery Worker (Dockerfile.worker)
   - Service 3: Frontend (auto-detected Next.js)

## Environment Variables Reference

### Backend API & Worker
```bash
# Database
DB_HOST=<postgres host>
DB_PORT=5432
DB_NAME=<database name>
DB_USER=<database user>
DB_PASSWORD=<database password>

# Redis
REDIS_URL=redis://<redis-host>:6379

# AI Services
OPENAI_API_KEY=<your openai key>
NEBIUS_API_KEY=<your nebius key>

# AWS Services
AWS_ACCESS_KEY_ID=<your aws key>
AWS_SECRET_ACCESS_KEY=<your aws secret>
AWS_REGION=us-east-1
S3_BUCKET_NAME=<your s3 bucket>
```

### Frontend
```bash
BACKEND_URL=<backend api url>
```

## Testing Deployment

1. Visit your Vercel URL
2. Try generating a video
3. Check Railway logs to ensure:
   - API receives the request
   - Worker processes the job
   - Video uploads to S3
   - Database updates with video URL

## Troubleshooting

### Common Issues

**Worker not processing jobs:**
- Check Redis connection in Railway logs
- Verify Celery worker is running
- Check environment variables match between API and Worker

**Videos not uploading:**
- Verify AWS credentials
- Check S3 bucket permissions
- Ensure bucket is in correct region

**Frontend can't reach backend:**
- Verify BACKEND_URL in Vercel environment variables
- Check Railway API service is running
- Ensure no CORS issues (already configured in backend)

**Database connection errors:**
- Verify DATABASE_URL or individual DB variables
- Check PostgreSQL service is running on Railway
- Ensure database table is created (runs automatically on first API start)

## Scaling Considerations

- **Railway**: Auto-scales based on traffic
- **Vercel**: Auto-scales frontend globally
- **Worker**: Can be scaled horizontally by adding more worker services
- **Database**: Railway provides automatic backups and scaling

## Cost Estimates

### Railway (Backend + Worker + DB)
- Free tier: $5 credit/month
- Pro: ~$20-50/month depending on usage

### Vercel (Frontend)
- Free tier: Generous limits for personal projects
- Pro: $20/month if needed

### AWS S3
- ~$0.023 per GB storage
- ~$0.09 per GB transfer

### API Costs
- OpenAI: Pay per token
- AWS Polly: $4 per 1M characters
- Nebius: Varies by usage
