# Zing — Local run via Docker Compose
# Prerequisites: Docker (or Podman/Colima with docker-compose) installed and running
# Quick start: make setup && make up
# Colima:      make colima-up   (uses Colima's Docker socket; see COLIMA_* below)

BACKEND_ENV := server/.env
BACKEND_ENV_EXAMPLE := server/env.example

# Colima: socket and Docker CLI path (Homebrew docker ignores podman-docker in PATH)
COLIMA_SOCKET := unix://$(HOME)/.colima/default/docker.sock
DOCKER_CLI_PATH := /opt/homebrew/opt/docker/bin

.PHONY: help setup up run down logs ps restart build clean check colima-start colima-stop colima-up colima-down colima-logs dev-backend dev-web postgres-up postgres-down postgres-up-colima postgres-down-colima postgres-reset postgres-reset-colima

help:
	@echo "Zing — AI-Native Quantitative Trading Platform"
	@echo ""
	@echo "Local development (no Docker/Podman):"
	@echo "  make setup       — Copy server/env.example → .env (if missing)"
	@echo "  make dev         — Run backend + web together (one command)"
	@echo "  make dev-backend — Run Python backend on http://localhost:5000"
	@echo "  make dev-web     — Run Next.js web on http://localhost:3000 (run dev-backend first)"
	@echo ""
	@echo "First time: cd server && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt"
	@echo ""
	@echo "Optional — Docker (Postgres + backend in containers):"
	@echo "  make up      — Start postgres + backend (uses docker/podman)"
	@echo "  make down    — Stop containers"
	@echo "  make logs    — Follow logs (SERVICE=backend|postgres)"
	@echo "  make check   — Verify Docker/Podman is running (required for 'make up')"
	@echo ""
	@echo "Optional — PostgreSQL only in Docker (backend on host):"
	@echo "  make postgres-up   — Start PostgreSQL (port 5432); set DATABASE_URL in .env"
	@echo "  make postgres-down — Stop PostgreSQL"
	@echo ""
	@echo "Deploy: See docs/RAILWAY_DEPLOY.md"
	@echo "Edit $(BACKEND_ENV) for ADMIN_PASSWORD, DATABASE_URL, API keys, etc."

# Ensure backend .env exists from env.example (idempotent)
setup:
	@if [ ! -f "$(BACKEND_ENV)" ]; then \
		cp "$(BACKEND_ENV_EXAMPLE)" "$(BACKEND_ENV)"; \
		echo "Created $(BACKEND_ENV) from env.example. Edit it to set ADMIN_PASSWORD, API keys, etc."; \
	else \
		echo "$(BACKEND_ENV) already exists; skipping."; \
	fi

check:
	@command -v docker >/dev/null 2>&1 || (echo "Error: docker not found. Install Docker Desktop or Podman."; exit 1)
	@docker info >/dev/null 2>&1 || (echo ""; echo "Error: Docker/Podman daemon not running."; echo "  - Using Docker Desktop? Start the app and ensure the whale icon is active."; echo "  - Using Podman? Run: podman machine init && podman machine start"; echo ""; exit 1)
	@echo "Docker/Podman OK"

# Use Colima's Docker for compose commands (set by colima-* targets or export in shell)
DOCKER_COMPOSE := DOCKER_HOST=$(COLIMA_SOCKET) PATH="$(DOCKER_CLI_PATH):$$PATH" docker compose

up run: setup check
	docker compose up -d --build

down:
	docker compose down

# Start only PostgreSQL for local dev (backend runs on host; set DATABASE_URL in .env)
postgres-up: check
	@echo "Starting PostgreSQL only (for local backend)..."
	docker compose -f docker-compose.postgres.yml up -d
	@echo "PostgreSQL at 127.0.0.1:5432"
	@echo "In server/.env set:"
	@echo "  DATABASE_URL=postgresql://zing:zing123@127.0.0.1:5432/zing"
	@echo "  DB_TYPE=postgresql"
	@echo "Then: pip install psycopg2-binary (if not installed)"

# Use Colima's Docker socket (when Docker Desktop is not running)
postgres-up-colima: colima-start
	@echo "Starting PostgreSQL via Colima..."
	$(DOCKER_COMPOSE) -f docker-compose.postgres.yml up -d
	@echo "PostgreSQL at 127.0.0.1:5432"
	@echo "In server/.env set:"
	@echo "  DATABASE_URL=postgresql://zing:zing123@127.0.0.1:5432/zing"
	@echo "  DB_TYPE=postgresql"

postgres-down:
	docker compose -f docker-compose.postgres.yml down

postgres-down-colima:
	$(DOCKER_COMPOSE) -f docker-compose.postgres.yml down

# Remove Postgres volume and start fresh so init creates zing user (fixes "role zing does not exist")
postgres-reset: check
	@echo "Stopping Postgres and removing volume..."
	docker compose -f docker-compose.postgres.yml down -v
	@echo "Starting Postgres (fresh init will create user zing)..."
	docker compose -f docker-compose.postgres.yml up -d
	@echo "PostgreSQL reset. Set DATABASE_URL in server/.env and restart the backend."

postgres-reset-colima: colima-start
	@echo "Stopping Postgres and removing volume..."
	$(DOCKER_COMPOSE) -f docker-compose.postgres.yml down -v
	@echo "Starting Postgres (fresh init will create user zing)..."
	$(DOCKER_COMPOSE) -f docker-compose.postgres.yml up -d
	@echo "PostgreSQL reset. Set DATABASE_URL in server/.env and restart the backend."

logs:
	docker compose logs -f $${SERVICE:-backend}

# Colima: ensure VM is running then start stack with Colima's Docker
colima-start:
	colima status || colima start

colima-up: setup colima-start
	$(DOCKER_COMPOSE) up -d --build

colima-down:
	$(DOCKER_COMPOSE) down

colima-logs:
	$(DOCKER_COMPOSE) logs -f $${SERVICE:-backend}

colima-ps:
	$(DOCKER_COMPOSE) ps

ps:
	docker compose ps

restart: down up

build: setup
	docker compose build

# Stop and remove containers + volumes (database data will be lost)
clean:
	docker compose down -v

# Development (no Docker). Uses server/venv if present.
dev-backend: setup
	@echo "🚀 Starting Python backend on http://localhost:5000..."
	@if [ ! -x server/venv/bin/python ]; then \
		echo ""; \
		echo "⚠️  No venv found. Run once:"; \
		echo "   cd server && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt"; \
		echo ""; \
	fi
	@cd server && (test -x venv/bin/python && ./venv/bin/python run.py || python3 run.py)

# Web app (Next.js). Backend must be running on port 5000.
dev-web:
	@echo "🌐 Starting Next.js web app on http://localhost:3000"
	@echo "   Set web/.env.local with NEXT_PUBLIC_API_URL=http://localhost:5000 (optional, default)"
	@if [ ! -d web/node_modules ]; then echo "Run: cd web && npm install"; cd web && npm install; fi
	cd web && npm run dev

# Run backend and web together: backend in background, web in foreground. Ctrl+C stops web; kill backend manually if needed (pkill -f "run.py").
dev:
	@$(MAKE) setup
	@if [ ! -x server/venv/bin/python ]; then \
		echo "Creating venv and installing deps (first time)..."; \
		cd server && python3 -m venv venv && ./venv/bin/pip install -q -r requirements.txt && cd ..; \
	else \
		echo "Ensuring server dependencies are installed..."; \
		cd server && ./venv/bin/pip install -q -r requirements.txt && cd ..; \
	fi
	@echo "Starting backend (background) + web (foreground). Backend: http://localhost:5000  Web: http://localhost:3000"
	@(cd server && ./venv/bin/python run.py) & BACKEND_PID=$$!; \
		trap "kill $$BACKEND_PID 2>/dev/null || true; exit 0" INT TERM; \
		if [ ! -d web/node_modules ]; then (cd web && npm install); fi; \
		(cd web && npm run dev); \
		kill $$BACKEND_PID 2>/dev/null || true
