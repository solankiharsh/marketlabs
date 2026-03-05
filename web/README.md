# Zing Web

Next.js frontend for the Zing platform (Dashboard, AI Asset Analysis, Indicator Analysis, Indicator Market, etc.).

## Local development

1. **Backend** must be running (e.g. `make dev-backend` or `python run.py` in `server`) on port 5000.
2. From repo root: `make dev-web`  
   Or from here: `npm install && npm run dev`  
3. Open [http://localhost:3000](http://localhost:3000).

Optional: copy `web/.env.example` to `web/.env.local` and set `NEXT_PUBLIC_API_URL=http://localhost:5000` (this is the default).

## Build & run (production)

```bash
npm ci
npm run build
npm start
```

Set `NEXT_PUBLIC_API_URL` to your backend URL before building (e.g. for Railway or Docker).

## Deploy (Railway)

See [../docs/RAILWAY_DEPLOY.md](../docs/RAILWAY_DEPLOY.md). Use **Root Directory** `web` and set `NEXT_PUBLIC_API_URL` to the backend service URL.
