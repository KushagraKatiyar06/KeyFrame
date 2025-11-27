KeyFrame — Local Dev README

This README provides quick steps to run KeyFrame end-to-end locally (backend API, worker, Redis, and frontend) for testing and development. It assumes you're on Windows (PowerShell) as in the project context.

Prerequisites

- Node.js (16+)
- Python 3.10+
- Redis (local or Docker)
- FFmpeg (available on PATH)
- Git

Recommended: install Redis with Docker:

```powershell
docker run --name keyframe-redis -p 6379:6379 -d redis:7
```

Start the backend API (Node)

The API lives in `backend/` and exposes endpoints used by the frontend and the worker.

```powershell
cd backend
npm install
# start the API (assuming package.json has a start script)
npm start
```

Start the Celery worker (Python)

Worker code is in `backend/worker`. It uses Redis as broker/backplane.

```powershell
cd backend\worker
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# start the celery worker (solo pool is convenient for Windows)
celery -A app worker --loglevel=info --pool=solo
```

Start the frontend (Next.js)

```powershell
cd frontend
npm install
npm run dev
# frontend should be available at http://localhost:3000 (or the port Next reports)
```

How to test

- Create a job via the frontend UI or using PowerShell:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/v1/generate" -Method POST -ContentType "application/json" -Body '{"prompt":"A sample prompt","style":"Storytelling"}'
```

- Note: the backend publishes progress messages to Redis. The frontend subscribes to `GET /api/v1/events/{jobId}` (SSE) and will show live progress. Once the worker finishes, the video is available at `/api/v1/videos/{jobId}` and can be streamed/downloaded.

Troubleshooting

- If you see CORS or connection issues, ensure the backend and frontend ports are reachable and any proxy configuration (if present) is set up.
- If the worker fails due to external API credentials (OpenAI, Polly, Nebius), confirm environment variables are set for the worker process.
- FFmpeg must be on PATH. Verify by running `ffmpeg -version`.

Notes

- This repo currently supports a local-only flow: job state is kept in Redis and the final MP4 is served by the backend streaming endpoint (no Cloudflare/Postgres required).
- For production deployments, consider securing endpoints, adding rate limits, and using cloud storage (R2/S3) for final assets.

If you'd like, I can add a small PowerShell script to start the stack (dev mode) or add a docker-compose for Redis + backend + worker.

powershell -ExecutionPolicy Bypass -File .\scripts\start-dev.ps1
