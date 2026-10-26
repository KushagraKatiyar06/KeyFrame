# KeyFrame Deployment Guide

## Architecture Overview

KeyFrame consists of 3 services, all deployed on **Railway**:
1. **Frontend (Next.js)** — `frontend/`
2. **Backend API (Express/Node.js)** — `backend/api/`
3. **Celery Worker (Python)** — `backend/worker/`

Each service is its own Railway service with its own root directory and its own Procfile — Railway's Nixpacks builder auto-detects and runs them (the worker's `nixpacks.toml` also installs `ffmpeg` at build time). There are legacy `Dockerfile.*` files in the repo from an earlier deploy attempt; they are not currently used by any service and are safe to ignore (or delete, if nothing still points at them).

## Prerequisites

- GitHub repository access (contributor or owner)
- Accounts on:
  - Railway (frontend + backend + worker + Postgres + Redis)
  - OpenAI API (script + visual bible generation, gpt-4o-mini)
  - Replicate (Flux-Schnell image generation)
  - AWS (Polly text-to-speech)
  - Cloudflare (R2 — video/thumbnail storage)

## Deployment Steps

### 1. Create the Railway project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Connect your GitHub repository

### 2. Add managed databases

1. Click "New" → "Database" → "PostgreSQL" — note the connection string from the "Connect" tab
2. Click "New" → "Database" → "Redis" — note the connection string

### 3. Deploy the Backend API

1. Click "New" → "GitHub Repo" → select the KeyFrame repository
2. Set **Root Directory**: `backend/api`
3. Railway will detect `Procfile` (`web: node index.js`) via Nixpacks — no Dockerfile needed
4. Add environment variables (see reference below)
5. Deploy and note the public URL — this is `BACKEND_URL` for the frontend

### 4. Deploy the Celery Worker

1. Click "New" → "GitHub Repo" → select the KeyFrame repository again
2. Set **Root Directory**: `backend/worker`
3. Railway will detect `Procfile` (`worker: celery -A app worker --loglevel=info --concurrency=1`) and `nixpacks.toml` (installs `ffmpeg`)
4. Add environment variables (see reference below)
5. Deploy

### 5. Deploy the Frontend

1. Click "New" → "GitHub Repo" → select the KeyFrame repository again
2. Set **Root Directory**: `frontend`
3. Railway will detect `Procfile` (`web: node .next/standalone/server.js`) and build with `npm run build` (standalone output)
4. Add environment variables (see reference below) — `BACKEND_URL` should point at the backend API service's Railway URL
5. Deploy and note the public URL — this is the live site

## Environment Variables Reference

### Backend API (`backend/api`)
```bash
DATABASE_URL=<Railway Postgres connection string>
REDIS_URL=<Railway Redis connection string>
PORT=3002
ADMIN_PASSWORD=<shared admin secret — must match frontend's ADMIN_PASSWORD>
DAILY_QUOTA=20                       # optional, defaults to 20
CLOUDFLARE_ACCOUNT_ID=<your account id>
CLOUDFLARE_ACCESS_KEY_ID=<R2 access key>
CLOUDFLARE_SECRET_ACCESS_KEY=<R2 secret key>
R2_BUCKET_NAME=<your bucket>
R2_PUBLIC_DOMAIN=<your public R2 domain>
```

### Celery Worker (`backend/worker`)
```bash
DATABASE_URL=<same Railway Postgres connection string>
REDIS_URL=<same Railway Redis connection string>
OPENAI_API_KEY=<your OpenAI key>              # script + visual bible (gpt-4o-mini)
REPLICATE_API_TOKEN=<your Replicate token>    # Flux-Schnell image generation
AWS_ACCESS_KEY_ID=<your AWS key>
AWS_SECRET_ACCESS_KEY=<your AWS secret>
AWS_REGION=us-east-1
CLOUDFLARE_ACCOUNT_ID=<your account id>
CLOUDFLARE_ACCESS_KEY_ID=<R2 access key>
CLOUDFLARE_SECRET_ACCESS_KEY=<R2 secret key>
R2_BUCKET_NAME=<your bucket>
R2_PUBLIC_DOMAIN=<your public R2 domain>
```
`ffmpeg` is installed automatically at build time via `nixpacks.toml` — no `FFMPEG_PATH`/`FFPROBE_PATH` needed on Railway (those env vars only matter for local Windows dev, see root `CLAUDE.md`).

### Frontend (`frontend`)
```bash
NEXT_PUBLIC_BACKEND_URL=<backend API Railway URL>
BACKEND_URL=<backend API Railway URL>
ADMIN_PASSWORD=<same value as backend API's ADMIN_PASSWORD>
SESSION_SECRET=<any long random string>   # signs the admin session cookie
```

## Testing Deployment

1. Visit your frontend's Railway URL
2. Try generating a video
3. Check Railway logs to ensure:
   - API receives the request
   - Worker picks up the job and runs through Watchman → Director → Continuity Artist → Auditor
   - Video uploads to Cloudflare R2
   - Database updates with the video URL

## Troubleshooting

### Common Issues

**Worker not processing jobs:**
- Check Redis connection in Railway logs
- Verify the Celery worker service is running
- Check `REDIS_URL`/`DATABASE_URL` match between API and Worker

**Videos not uploading:**
- Verify `CLOUDFLARE_*`/`R2_*` credentials
- Check the R2 bucket's public domain is configured in the Cloudflare dashboard
- Confirm the bucket name matches `R2_BUCKET_NAME`

**Frontend can't reach backend:**
- Verify `BACKEND_URL` / `NEXT_PUBLIC_BACKEND_URL` in the frontend's Railway environment variables
- Check the backend API service is running
- Ensure no CORS issues (already configured in `backend/api`)

**Database connection errors:**
- Verify `DATABASE_URL` is set correctly on both API and worker services
- Check the PostgreSQL service is running on Railway
- The `videos` table is created automatically on first API start

**Admin login not working across services:**
- `ADMIN_PASSWORD` must be identical on the frontend and backend API services
- Set `SESSION_SECRET` on the frontend so the admin session cookie isn't signed with a fallback

## Scaling Considerations

- **Railway**: auto-scales each service based on traffic/usage
- **Worker**: can be scaled horizontally by adding more worker service instances
- **Database**: Railway provides automatic backups for managed Postgres

## Cost Estimates

### Railway (frontend + backend + worker + Postgres + Redis)
- Free tier: $5 credit/month
- Usage-based beyond that: roughly $5–20/month for light traffic

### Cloudflare R2 (video/thumbnail storage)
- No egress fees
- ~$0.015/GB-month storage

### API Costs
- OpenAI (gpt-4o-mini): pay per token, a few cents per script + visual bible
- Replicate (Flux-Schnell): pay per image, ~10–16 images/video
- AWS Polly (generative engine): pay per character synthesized

Target all-in cost is roughly **$0.20/video** — see root `CLAUDE.md` for the full cost/architecture breakdown.
