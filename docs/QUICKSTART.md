# Zing - Quick Start Guide

## Prerequisites

Choose ONE of the following:

### Option A: Docker (Recommended - Easiest)
- Install Docker Desktop from https://www.docker.com/products/docker-desktop
- Start Docker Desktop
- Run: `make up`

### Option B: Manual Setup (For Development)
- Python 3.9+ with pip
- PostgreSQL (optional, SQLite will be used as fallback)

## Getting Started

### Using Docker (Recommended)

```bash
cd /Users/harshsolanki/Developer/Zing

# 1. Setup environment
make setup

# 2. Start backend + database
make up

# 3. API at http://localhost:5000
```

### Manual Development Setup

#### 1. Start Backend (Python)

**Important**: The backend has many Python dependencies. Install them carefully:

```bash
cd server

# Create virtual environment (first time only)
python3 -m venv venv

# Activate it
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Try full install
pip install -r requirements.txt

# If that fails (common with coincurve), install core deps manually:
pip install flask flask-cors flask-jwt-extended python-dotenv requests pyyaml
pip install sqlalchemy pandas numpy yfinance openai anthropic
pip install ta-lib  # Technical analysis (may need brew install ta-lib first)

# Copy .env if needed
cp env.example .env

# Set at least one LLM API key for AI analysis (e.g. OpenRouter)
# Get a key at https://openrouter.ai/
# In .env: OPENROUTER_API_KEY=sk-...

# Start backend
python run.py
```

Backend will run on `http://localhost:5000`

**Note:** Without PostgreSQL (e.g. no Docker), the app still runs but:
- Pending order worker is skipped (no log spam).
- Polymarket markets and batch analysis are not persisted to DB (in-memory only).
- **AI / Fast analysis** and **Polymarket batch analysis** require an LLM API key: set `OPENROUTER_API_KEY` in `server/.env` (or another provider key). Without it, batch Polymarket analysis falls back to rule-based only.

## Using the API

Use the backend API at `http://localhost:5000`. Authenticate with `POST /api/user/login` (see [Default Credentials](#default-credentials)). Key endpoints include market data, fast analysis, backtest, and strategy APIs — see `server/app/routes/` and the main README for the full list.

## Features

- ✨ **Quick AI Analysis**: Instant BUY/SELL/HOLD signals
- 📊 **Multi-Factor Analysis**: Technical, fundamental, sentiment
- 🎯 **Trading Plans**: Entry/exit prices, stop loss, take profit
- ⚡ **Real-Time Data**: Live market data integration

## Troubleshooting

### "psycopg2 is not installed" / "PostgreSQL not available"
- **Option 1 (recommended):** Use Docker: `make up` — PostgreSQL runs in a container.
- **Option 2:** Run PostgreSQL locally (see [Setting up PostgreSQL locally](#setting-up-postgresql-locally) below), then `pip install psycopg2-binary` and set `DATABASE_URL` in `server/.env`.
- The app runs without PostgreSQL; the pending order worker, portfolio monitor, and DB persistence are skipped, and you won't see repeated connection errors.

### "API key not configured for provider: openrouter"
- Set an LLM API key in `server/.env`:
  - **OpenRouter (recommended):** `OPENROUTER_API_KEY=sk-...` — get a key at https://openrouter.ai/
  - Or set another provider: `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `GOOGLE_API_KEY`, etc.
- Without any key, AI fast analysis and Polymarket batch analysis will fail or use fallbacks.

### Backend won't start
- Check Python version: `python3 --version` (need 3.9+)
- Make sure virtual environment is activated: `source venv/bin/activate`
- Install dependencies one by one if bulk install fails
- Check `.env` file exists in `server/`

### API connection errors
- Verify backend is running: `curl http://localhost:5000/api/health` or `curl http://localhost:5000/api/market/types`
- Check backend logs for errors
- Ensure port 5000 is not in use

### Docker issues
- Start Docker Desktop
- Run `docker ps` to verify it's working
- Try `make clean && make up` to rebuild

## Setting up PostgreSQL locally

Use this when you run the backend on your machine (e.g. `make dev-backend` or `./scripts/start-backend-simple.sh`) and want a real database.

### Option A: Homebrew PostgreSQL (no Docker)

If Docker/Colima is not available or not working:

```bash
brew install postgresql@16
brew services start postgresql@16

export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
psql -d postgres -c "CREATE ROLE zing WITH LOGIN PASSWORD 'zing123';"
psql -d postgres -c "CREATE DATABASE zing OWNER zing;"

PGPASSWORD=zing123 psql -h 127.0.0.1 -U zing -d zing \
  -f server/migrations/init.sql
```

Set in `server/.env`: `DATABASE_URL=postgresql://zing:zing123@127.0.0.1:5432/zing`, then restart the backend.

### Option B: PostgreSQL with Docker

**If you use Docker Desktop:** run `make postgres-up`.

**If you use Colima (and see "Docker daemon not running"):** run `make postgres-up-colima` instead. This uses Colima's Docker socket so the PostgreSQL container starts correctly.

```bash
cd /Users/harshsolanki/Developer/Zing
make postgres-up          # Docker Desktop
# OR
make postgres-up-colima   # Colima (when Docker daemon not running)
```

This starts a single PostgreSQL 16 container on `127.0.0.1:5432` with:
- Database: `zing`
- User: `zing`
- Password: `zing123`

Schema is applied automatically from `server/migrations/init.sql`.

### 2. Configure the backend

In `server/.env` add or set:

```env
DATABASE_URL=postgresql://zing:zing123@127.0.0.1:5432/zing
DB_TYPE=postgresql
```

### 3. Install the PostgreSQL driver

```bash
cd server
source venv/bin/activate
pip install psycopg2-binary
```

### 4. Restart the backend

Start the backend as usual (`python run.py` or `make dev-backend`). It will connect to the local PostgreSQL.

### Stop PostgreSQL

```bash
make postgres-down
```

## Default Credentials

- Username: `zing`
- Password: `123456`

(Can be changed in `server/.env`)

## Architecture

- **Backend**: Python Flask API on port 5000
- **Database**: PostgreSQL (Docker) or SQLite (manual setup)
