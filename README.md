# KeyFrame

An agentic AI slideshow generator. Submit a prompt and pick a style, get back a ~1 minute video with AI-generated images, voiceover, and captions, for about **$0.05/video**. Generation runs through four specialized agents — a pre-flight checker, a scriptwriter, an image artist that keeps every slide visually consistent, and a validator — with live progress streamed to the screen the whole way.

![Landing page](Screenshots/landing-hero.png)

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.10+">
  <img src="https://img.shields.io/badge/Celery-37814A?style=for-the-badge&logo=celery&logoColor=white" alt="Celery">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis">
  <img src="https://img.shields.io/badge/OpenAI-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI">
  <img src="https://img.shields.io/badge/Replicate-000000?style=for-the-badge&logoColor=white" alt="Replicate">
  <img src="https://img.shields.io/badge/AWS%20Polly-FF9900?style=for-the-badge&logo=amazonwebservices&logoColor=white" alt="AWS Polly">
  <img src="https://img.shields.io/badge/FFmpeg-007808?style=for-the-badge&logo=ffmpeg&logoColor=white" alt="FFmpeg">
  <img src="https://img.shields.io/badge/Cloudflare%20R2-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare R2">
  <img src="https://img.shields.io/badge/Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white" alt="Railway">
</p>

Deployment: https://keyframe-frontend-production.up.railway.app/
> If generation fails on the live site, the free tiers for Redis or Postgres may have expired — see the Deployment note below. The Community tab shows videos other users have generated.

## What it does

1. **Describe the video** you want and pick a style — Educational, Storytelling, or Meme.

![Generate a video](Screenshots/generate-prompt.png)

2. **Watch it build in real time.** A console shows each stage of the pipeline as it happens — pre-flight checks, script + art direction, slide-by-slide image and voice generation, validation, and final assembly — instead of a single spinning loader.

![Agent console](Screenshots/agent-console.png)

3. **Preview and name the finished video**, download it, or post it straight to the community feed.

![Finished video](Screenshots/result-post.png)

4. **Browse the community feed** to see (and search) what everyone else has generated.

![Community feed](Screenshots/community-feed.png)

## Features

- **Specialized agents, not a single script** — pre-flight checks, scripting, image/voice generation, and validation are handled by distinct roles, each with its own retries, so one bad step doesn't silently corrupt the whole video.
- **Visual continuity across slides** — every slide shares the same art direction and a consistent "look," so characters and style don't drift from one slide to the next.
- **Live progress, not a black box** — a real-time console shows exactly which stage is running and streams a log as it happens.
- **Segmented progress bar** — Setup → Scripting → Generating → Stitching.
- **Community feed** — a searchable gallery of everything the community has generated, with the original prompt visible for each video.
- **Admin controls** — upload, rename, hide, or delete videos in the feed behind a password.
- **Daily quotas** — global and per-user generation limits to keep costs predictable.

## Tech Stack

**Frontend**
- Next.js, React, TypeScript

**Backend**
- Express for job intake, Postgres for job/video records, Redis for the task queue
- A Python task worker runs the generation pipeline
- OpenAI for script + art direction
- Replicate for image generation
- Amazon Polly for voiceover
- FFmpeg for final video assembly
- Cloudflare R2 for video/thumbnail storage

**Dev Ops**
- Docker (optional, for local Redis/Postgres)
- Railway — frontend, backend API, and worker each hosted as their own service

## Project Structure

```
frontend/          Next.js UI — prompt form, status page, community feed, admin
backend/api/        Job intake, Postgres, Redis queue
backend/worker/      Generation pipeline — script, images, voice, assembly, upload
bin/                 FFmpeg binaries (local Windows dev only)
```

## Setup

### Prerequisites

- Node.js v18+ and Python 3.10+
- Docker (optional but recommended) or Redis + Postgres installed locally
- FFmpeg installed and configured (see FFmpeg section below)
- `.env` files in `backend/api/` and `backend/worker/` (templates below)

**No extra pip installs needed beyond `requirements.txt`** — all dependencies (`celery`, `openai`, `boto3`, `mutagen`, `psycopg2-binary`, `python-dotenv`, `redis`, `requests`) are already listed.

### `.env` files

There are two separate `.env` files — one for the API, one for the worker. **Do not use the same file for both.**

**`backend/api/.env`**

```
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://keyframe_user:password@localhost:5432/keyframe_db
PORT=3002
ADMIN_PASSWORD=your-admin-password
DAILY_QUOTA=20
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_ACCESS_KEY_ID=
CLOUDFLARE_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_DOMAIN=
```

**`backend/worker/.env`**

```
# Redis (must match the API's REDIS_URL — Celery uses this as both broker and result backend)
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=postgresql://keyframe_user:password@localhost:5432/keyframe_db

# Third-party API keys
OPENAI_API_KEY=
REPLICATE_API_TOKEN=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1

# Cloudflare R2 (for video/thumbnail storage)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_ACCESS_KEY_ID=
CLOUDFLARE_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_DOMAIN=

# FFmpeg paths (optional — overrides the default bin/ fallback)
FFMPEG_PATH=
FFPROBE_PATH=
```

> FFmpeg path is configurable via `FFMPEG_PATH` and `FFPROBE_PATH`. If unset, the worker falls back to `<repo-root>/bin/ffmpeg.exe`.

**API keys required** (all have free tiers):

| Key | Service | Where to get it |
|---|---|---|
| `OPENAI_API_KEY` | Script + art direction generation | platform.openai.com |
| `REPLICATE_API_TOKEN` | Image generation (10–16 images/video) | replicate.com |
| `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | Voiceover (Amazon Polly) | console.aws.amazon.com → IAM |
| `CLOUDFLARE_*` + `R2_*` | Video/thumbnail storage | dash.cloudflare.com → R2 |
| `ADMIN_PASSWORD` | Admin UI (upload/delete/rename videos in feed) | — set your own value, same in `backend/api` and `frontend` |
| `SESSION_SECRET` | Signs the admin session cookie (frontend only) | — set your own value; falls back to `ADMIN_PASSWORD` if unset |
| `DAILY_QUOTA` | Global daily generation cap (`backend/api`, optional, default 20) | — set your own value |

> **AWS note:** Create an IAM user with `AmazonPollyFullAccess` attached — no extra setup needed beyond that.

### Quick Docker Compose (start Redis/Postgres locally)

If you don't want to install Redis/Postgres system-wide, create a `docker-compose.yml` in the repo root with the following services and run `docker compose up -d`:

```yaml
version: '3.8'
services:
  redis:
    image: redis:7
    ports:
      - "6379:6379"

  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: keyframe_user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: keyframe_db
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### FFmpeg (Windows guidance)

The worker reads `FFMPEG_PATH` and `FFPROBE_PATH` from the `.env` file. If unset, it falls back to `<repo-root>/bin/ffmpeg.exe`.

**Recommended: install via winget (handles updates and PATH automatically)**

```powershell
winget install Gyan.FFmpeg
where ffmpeg   # copy the output path
```

Then set in `backend/worker/.env`:
```
FFMPEG_PATH=C:\Users\<you>\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_...\ffmpeg-...\bin\ffmpeg.exe
FFPROBE_PATH=C:\Users\<you>\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_...\ffmpeg-...\bin\ffprobe.exe
```

**Alternative: manual install**

1. Download a Windows build from [gyan.dev/ffmpeg/builds](https://www.gyan.dev/ffmpeg/builds/) (the "essentials" release build)
2. Extract `ffmpeg.exe` and `ffprobe.exe` into a `bin/` folder at the repository root
3. Verify: `./bin/ffmpeg.exe -version`

**Windows Smart App Control / AppLocker note (I had this problem)**

If the worker gets blocked trying to run FFmpeg, Windows Smart App Control is likely the cause. Fix: **Settings → Windows Security → App & Browser Control → Smart App Control → Off**, then restart. On a managed/enterprise machine, ask IT to allowlist the FFmpeg binary instead.

### Install & run

**Backend API**

```powershell
cd backend/api
npm install       # skip if node_modules already exists
node index.js     # PORT is read from backend/api/.env (default 3000)
```

**Python worker** (Windows recommended steps)

```powershell
cd backend/worker
python -m venv .venv            # skip if .venv already exists
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt # skip if already installed
celery -A app worker --loglevel=info --pool=solo   # --pool=solo required on Windows
```

**Frontend**

```powershell
cd frontend
npm install       # skip if node_modules already exists
npm run dev       # http://localhost:3000
```

Create `frontend/.env.local`:

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3002
BACKEND_URL=http://localhost:3002
ADMIN_PASSWORD=your-admin-password
SESSION_SECRET=any-long-random-string
```

> `ADMIN_PASSWORD` and `SESSION_SECRET` have no `NEXT_PUBLIC_` prefix — they're server-side only and never sent to the browser. Logging in sets an httpOnly session cookie signed with `SESSION_SECRET` (not the password itself), so a leaked cookie can't be used to derive your admin password. To log in as admin, click the logo on any page and enter the password.

**Optional static assets** (not required to run, needed for full visual polish):
- `public/assets/Logo_Transparent.png` — site logo
- `public/assets/videos/mock.mp4` — mock demo video used by example pages
- `public/assets/thumbnails/mock.jpg` — mock thumbnail

Run the linter before creating PRs:

```powershell
cd frontend
npm run lint
npm run lint -- --fix   # auto-fix
```

## Deployment

Hosted on [Railway](https://railway.app) — frontend, backend API, and worker each run as their own service, all auto-deploying on push to `main`. Postgres is hosted on [Neon](https://neon.tech) and Redis on [Redis Cloud](https://redis.io/cloud) — both free tiers, both liable to expire, which is the most common cause of a broken live deploy.

### Developed by Kushagra Katiyar
