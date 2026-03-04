# MarketLabs - Market Intelligence Platform

A proactive market intelligence platform for Deriv assets that transforms single-ticker analysis into a multi-asset scanning system with ranked setup detection, composite scoring, and Telegram-ready partner signals.

## Overview

MarketLabs is built on top of the supermolt-mono tech stack (Hono backend + Next.js frontend) and adapts satori-x's market analysis concepts for human users. The platform proactively scans 20+ Deriv assets, detects ranked setups with composite scoring, and provides compact indicator tables with bite-size/full analysis toggle.

## Features

- ✅ **Proactive Asset Scanning**: Automatically scans 20+ Deriv assets (Forex, Crypto, Commodities, Indices) every 5 minutes
- ✅ **Composite Scoring**: Ranked setup detection with 0-100 composite score combining technical indicators, patterns, momentum, and volatility
- ✅ **Compact Indicator Tables**: Display indicators in compact table format (not verbose paragraphs)
- ✅ **Bite-size vs Full Analysis Toggle**: Switch between compact summary and detailed analysis
- ✅ **Partner Signal Generation**: Generate Telegram-ready signals for top-ranked setups

## Tech Stack

- **Backend**: Hono, TypeScript, Prisma, PostgreSQL, Privy auth
- **Frontend**: Next.js 16, React 19, Tailwind CSS, shadcn/ui, Zustand
- **External APIs**: Deriv WebSocket/REST API
- **Deployment**: Railway (backend) / Vercel (frontend)

## Project Structure

```
marketlabs/
├── backend/              # Hono + TypeScript backend
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── lib/          # Utilities (Privy, DB, etc.)
│   │   └── index.ts      # Hono app entry
│   └── prisma/           # Database schema
└── web/                  # Next.js frontend
    ├── app/              # Next.js pages
    ├── components/       # React components
    ├── lib/              # API client, utilities
    └── store/            # Zustand state
```

## Setup

### Backend

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up environment variables (create `.env` file in the `backend` directory):
```bash
# Create .env file from example (or create manually)
cd backend
cp .env.example .env  # If .env.example exists, or create manually
```

Then edit `.env` and set the required variables:
```env
PORT=3002
NODE_ENV=development
PRIVY_APP_ID=dev-privy-app-id
PRIVY_APP_SECRET=dev-privy-app-secret
JWT_SECRET=your_jwt_secret_minimum_32_characters_long_please_change_this
DATABASE_URL=postgresql://user:password@localhost:5432/marketlabs
DERIV_APP_ID=1089
DERIV_WS_URL=wss://ws.binaryws.com/websockets/v3
OPENAI_API_KEY=optional_for_ai_analysis
```

**Important**: 
- `JWT_SECRET` must be at least 32 characters long
- `DATABASE_URL` must point to a valid PostgreSQL database
- For local development, you can use a local PostgreSQL instance or a service like [Supabase](https://supabase.com) (free tier available)

**DATABASE_URL Format:**
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE
```

Examples:
- Local with password: `postgresql://postgres:mypassword@localhost:5432/marketlabs`
- Local without password: `postgresql://postgres@localhost:5432/marketlabs`
- Supabase: `postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`

**Test your connection:**
```bash
cd backend
npm run db:test  # Tests database connection
```

3. Set up database:

First, ensure the `marketlabs` database exists. You have a few options:

**Option A: Use the provided script (recommended)**
```bash
cd backend
npm run db:create  # Creates the database if it doesn't exist
npx prisma generate
npx prisma db push
```

**Option B: Create database manually**

If you have PostgreSQL CLI access:
```bash
# Connect to PostgreSQL and create the database
psql -U postgres -h localhost -c "CREATE DATABASE marketlabs;"
```

If using Docker:
```bash
docker exec -it <postgres-container-name> psql -U postgres -c "CREATE DATABASE marketlabs;"
```

Or use a GUI tool like pgAdmin, DBeaver, or TablePlus to create the database.

**Then run Prisma:**

**Option A: Use migrations (recommended - won't drop existing tables)**
```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

**Option B: Use db push (will drop tables not in schema - use with caution)**
```bash
cd backend
npx prisma generate
npx prisma db push --accept-data-loss
```

⚠️ **Important**: If you're using the `supermolt` database, use **Option A (migrations)** to avoid dropping existing tables. Only use `db push` if you want a fresh database.

4. Start the server:
```bash
npm run dev
```

Backend runs at: `http://localhost:3002`

### Frontend

1. Install dependencies:
```bash
cd web
npm install
```

2. Set up environment variables (create `.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

3. Start the development server:
```bash
npm run dev
```

Frontend runs at: `http://localhost:3000`

## API Endpoints

### Market
- `GET /api/market/assets` - List all tracked assets
- `GET /api/market/scans` - Latest scans with rankings
- `GET /api/market/rankings` - Top-ranked setups
- `GET /api/market/asset/:symbol` - Asset details with full analysis
- `POST /api/market/scan` - Trigger manual scan

### Partner Signals
- `GET /api/partner-signals` - Get Telegram-ready signals
- `POST /api/partner-signals/generate` - Generate new signals

### Auth
- `POST /auth/login` - Login with Privy token
- `POST /auth/refresh` - Refresh JWT token
- `GET /auth/me` - Get current user (protected)

## Database Schema

- `MarketAsset` - Tracked Deriv assets
- `MarketScan` - Historical scans with technical indicators and scores
- `PartnerSignal` - Generated Telegram-ready signals
- `User` - User accounts (Privy auth)

## Success Criteria (Beta - 2 weeks)

- ✅ Proactive scanning of 20+ Deriv assets
- ✅ Ranked setup detection with composite scoring
- ✅ Compact indicator tables (not verbose paragraphs)
- ✅ Bite-size vs. Full analysis toggle
- ✅ Partner signal generation (Telegram-ready output)

## License

Private and proprietary.

