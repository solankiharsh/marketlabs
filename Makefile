# MarketLabs — Local Development
# Quick start: make dev

BACKEND_ENV := server/.env
BACKEND_ENV_EXAMPLE := server/env.example

# Homebrew Postgres paths (auto-detect version)
PG_BIN := $(shell for v in 17 16 15 14; do p="/opt/homebrew/opt/postgresql@$$v/bin"; [ -x "$$p/pg_isready" ] && echo "$$p" && break; done)

.PHONY: help setup dev dev-backend dev-web build-web postgres-start postgres-stop postgres-status postgres-create-db migrate seed-default-avatar rename-admin-username

help:
	@echo "MarketLabs — AI-Native Quantitative Trading Platform"
	@echo ""
	@echo "  make dev          — Start backend + frontend (all-in-one)"
	@echo "  make dev-backend  — Start Python backend on http://localhost:5000"
	@echo "  make dev-web      — Start Vue frontend on http://localhost:8000"
	@echo ""
	@echo "  make postgres-start  — Start Homebrew PostgreSQL"
	@echo "  make postgres-stop   — Stop Homebrew PostgreSQL"
	@echo "  make postgres-status — Check PostgreSQL status"
	@echo "  make postgres-create-db — Create marketlabs user + database"
	@echo ""
	@echo "  make build-web    — Build Vue frontend into server/dist/"
	@echo ""
	@echo "  make setup        — Copy env.example → .env (if missing)"
	@echo "  make seed-default-avatar   — Set default avatar in DB"
	@echo "  make rename-admin-username — Update legacy admin username"

# --- Setup ---

setup:
	@if [ ! -f "$(BACKEND_ENV)" ]; then \
		cp "$(BACKEND_ENV_EXAMPLE)" "$(BACKEND_ENV)"; \
		echo "Created $(BACKEND_ENV) from env.example — edit it for API keys, etc."; \
	else \
		echo "$(BACKEND_ENV) already exists."; \
	fi

# --- PostgreSQL (Homebrew) ---

postgres-start:
	@if [ -z "$(PG_BIN)" ]; then \
		echo "No Homebrew PostgreSQL found. Install with: brew install postgresql@15"; \
		exit 1; \
	fi
	@PG_VER=$$(basename $$(dirname $(PG_BIN))); \
	if $(PG_BIN)/pg_isready -q 2>/dev/null; then \
		echo "PostgreSQL already running."; \
	else \
		echo "Starting $$PG_VER..."; \
		brew services start $$PG_VER 2>/dev/null || $(PG_BIN)/pg_ctl -D $(shell brew --prefix $$(basename $$(dirname $(PG_BIN))))/var start -l /tmp/pg.log; \
		for i in 1 2 3 4 5 6 7 8 9 10; do \
			$(PG_BIN)/pg_isready -q 2>/dev/null && break; \
			sleep 1; \
		done; \
		if $(PG_BIN)/pg_isready -q 2>/dev/null; then \
			echo "PostgreSQL ready."; \
		else \
			echo "Failed to start PostgreSQL."; exit 1; \
		fi; \
	fi

postgres-stop:
	@if [ -z "$(PG_BIN)" ]; then echo "No Homebrew PostgreSQL found."; exit 1; fi
	@PG_VER=$$(basename $$(dirname $(PG_BIN))); \
	brew services stop $$PG_VER 2>/dev/null || true
	@echo "PostgreSQL stopped."

postgres-status:
	@if [ -z "$(PG_BIN)" ]; then echo "No Homebrew PostgreSQL found."; exit 1; fi
	@if $(PG_BIN)/pg_isready -q 2>/dev/null; then \
		echo "PostgreSQL is running on port 5432."; \
	else \
		echo "PostgreSQL is NOT running. Start with: make postgres-start"; \
	fi

postgres-create-db:
	@if [ -z "$(PG_BIN)" ]; then echo "No Homebrew PostgreSQL found."; exit 1; fi
	@$(MAKE) postgres-start
	@echo "Creating marketlabs user and database..."
	@$(PG_BIN)/psql postgres -c "CREATE USER marketlabs WITH PASSWORD 'marketlabs123' CREATEDB;" 2>/dev/null || echo "  User 'marketlabs' already exists."
	@$(PG_BIN)/psql postgres -c "CREATE DATABASE marketlabs OWNER marketlabs;" 2>/dev/null || echo "  Database 'marketlabs' already exists."
	@$(PG_BIN)/psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE marketlabs TO marketlabs;" 2>/dev/null || true
	@$(PG_BIN)/psql marketlabs -c "GRANT ALL ON SCHEMA public TO marketlabs;" 2>/dev/null || true
	@echo "Done. DATABASE_URL=postgresql://marketlabs:marketlabs123@127.0.0.1:5432/marketlabs"

# --- Development ---

dev-backend: setup
	@if [ ! -x server/venv/bin/python ]; then \
		echo "Creating venv and installing dependencies..."; \
		cd server && python3 -m venv venv && ./venv/bin/pip install -q -r requirements.txt; \
	fi
	@$(MAKE) postgres-start
	@$(MAKE) postgres-create-db 2>/dev/null
	@if ! $(PG_BIN)/psql -U marketlabs -d marketlabs -c "SELECT 1 FROM ml_users LIMIT 1" >/dev/null 2>&1; then \
		echo "Tables not found — running migrations..."; \
		$(PG_BIN)/psql -U marketlabs -d marketlabs -f server/migrations/init.sql >/dev/null 2>&1; \
		echo "Migrations complete."; \
	fi
	@echo "Starting Python backend on http://localhost:5000..."
	@-lsof -ti:5000 | xargs kill -9 2>/dev/null || true
	@sleep 1
	@cd server && ./venv/bin/python run.py

dev-web:
	@echo "Starting Vue frontend on http://localhost:8000"
	@echo "  API proxy → http://localhost:5000"
	@if [ ! -d web/node_modules ]; then \
		echo "Installing web dependencies..."; \
		cd web && . $$HOME/.nvm/nvm.sh && nvm use 20 && npm install; \
	fi
	@cd web && . $$HOME/.nvm/nvm.sh && nvm use 20 && npm run serve

dev: setup
	@if [ ! -x server/venv/bin/python ]; then \
		echo "Creating venv and installing dependencies..."; \
		cd server && python3 -m venv venv && ./venv/bin/pip install -q -r requirements.txt; \
	fi
	@$(MAKE) postgres-start
	@$(MAKE) postgres-create-db 2>/dev/null
	@if ! $(PG_BIN)/psql -U marketlabs -d marketlabs -c "SELECT 1 FROM ml_users LIMIT 1" >/dev/null 2>&1; then \
		echo "Tables not found — running migrations..."; \
		$(PG_BIN)/psql -U marketlabs -d marketlabs -f server/migrations/init.sql >/dev/null 2>&1; \
		echo "Migrations complete."; \
	fi
	@-lsof -ti:5000 | xargs kill -9 2>/dev/null || true
	@sleep 1
	@echo "Starting backend (background) + frontend. Backend: http://localhost:5000  Web: http://localhost:8000"
	@(cd server && ./venv/bin/python run.py) & BACKEND_PID=$$!; \
		trap "kill $$BACKEND_PID 2>/dev/null || true; exit 0" INT TERM; \
		sleep 2; \
		. $$HOME/.nvm/nvm.sh && nvm use 20; \
		if [ ! -d web/node_modules ]; then (cd web && npm install); fi; \
		(cd web && npm run serve); \
		kill $$BACKEND_PID 2>/dev/null || true

# --- Build ---

build-web:
	@echo "Building Vue frontend..."
	@if [ ! -d web/node_modules ]; then \
		echo "Installing web dependencies..."; \
		cd web && . $$HOME/.nvm/nvm.sh && nvm use 20 && npm install --legacy-peer-deps; \
	fi
	@cd web && . $$HOME/.nvm/nvm.sh && nvm use 20 && npm run build
	@echo "Copying dist to server/ for deployment..."
	@rm -rf server/dist
	@cp -r web/dist server/dist
	@echo "Build complete. server/dist/ ready for deployment."

# --- DB Migrations ---

migrate: setup
	@$(MAKE) postgres-start
	@echo "Running database migrations..."
	@$(PG_BIN)/psql -U marketlabs -d marketlabs -f server/migrations/init.sql
	@echo "Migrations complete."

# --- DB Maintenance ---

seed-default-avatar: setup
	@echo "Setting default avatar for users with null/empty avatar..."
	@cd server && (test -x venv/bin/python && ./venv/bin/python scripts/seed_default_avatar.py || python3 scripts/seed_default_avatar.py)
	@echo "Done."

rename-admin-username: setup
	@echo "Updating legacy admin username in DB..."
	@cd server && (test -x venv/bin/python && ./venv/bin/python scripts/rename_admin_username.py || python3 scripts/rename_admin_username.py)
	@echo "Done."
