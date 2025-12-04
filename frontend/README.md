# KeyFrame Frontend

This directory contains the Next.js frontend for KeyFrame. The project includes local mock API routes used during development and also supports pointing at the real backend API.

---

## 1) Prereqs

- Node.js v18+ (recommended)
- `npm` (or `pnpm`/`yarn`) installed

Install dependencies and run the dev server:

```powershell
cd frontend
npm install
npm run dev
```

The dev server runs on `http://localhost:3000` by default.

## 2) Assets

Place optional static assets if you want the full visual polish (not required to run):

- `public/assets/Logo_Transparent.png` — site logo
- `public/assets/videos/mock.mp4` — mock demo video used by example pages
- `public/assets/thumbnails/mock.jpg` — mock thumbnail

## 3) Mock API vs Real Backend

- The repo includes simple Next.js API routes under `src/app/api/v1/*` that return mock jobIds and simulated status. These are convenient for local UI development.
- To use the real backend instead, point the frontend to your backend by setting `NEXT_PUBLIC_BACKEND_URL` in `frontend/.env.local`, for example:

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

Then update client fetch calls to use `process.env.NEXT_PUBLIC_BACKEND_URL` (the code already prefers `NEXT_PUBLIC_BACKEND_URL` if present). If you run Next dev and keep the built-in API routes, local routes will take precedence — remove or rename the mock routes if you want all calls to go to the real backend.

## 4) File structure & pages

- `/` — `src/app/page.tsx` (home + prompt form)
- `/status/[jobId]` — `src/app/status/[jobId]/page.tsx` (job progress + playback)
- `/feed` — `src/app/feed/page.tsx` (community thumbnails)

## 5) Linting

Run the linter before creating PRs:

```powershell
cd frontend
npm run lint
# auto-fix
npm run lint -- --fix
```
