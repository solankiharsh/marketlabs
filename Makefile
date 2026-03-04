# MarketLabs — Market Intelligence Platform
# Usage: make [target]

.PHONY: help install dev backend frontend clean kill-ports typecheck db-setup db-push db-fix-url

# Ports
BACKEND_PORT ?= 3002
FRONTEND_PORT ?= 3000

help:
	@echo "MarketLabs — Market Intelligence Platform"
	@echo ""
	@echo "  make install     Install dependencies (backend + frontend)"
	@echo "  make dev        Run both backend and frontend"
	@echo "  make backend    Run backend only (port $(BACKEND_PORT))"
	@echo "  make frontend   Run frontend only (port $(FRONTEND_PORT))"
	@echo "  make db-setup   Create marketlabs DB + run Prisma migrations (run once)"
	@echo "  make db-fix-url Fix DATABASE_URL: change supermolt → marketlabs in backend/.env"
	@echo "  make db-push    Push Prisma schema to database"
	@echo "  make kill-ports Kill processes on ports $(BACKEND_PORT) and $(FRONTEND_PORT)"
	@echo "  make typecheck  Run TypeScript checks for both"
	@echo "  make clean     Remove node_modules and build output"
	@echo ""

install:
	@echo "Installing backend dependencies..."
	cd backend && npm install
	@echo "Installing frontend dependencies..."
	cd web && npm install
	@echo "Done. Run 'make dev' to start."

dev: kill-ports
	@echo "Starting MarketLabs..."
	@echo "  Backend:  http://localhost:$(BACKEND_PORT)"
	@echo "  Frontend: http://localhost:$(FRONTEND_PORT)"
	@echo ""
	@(cd backend && npm run dev) & (cd web && npm run dev)

backend:
	@echo "Starting backend on http://localhost:$(BACKEND_PORT)..."
	cd backend && npm run dev

frontend:
	@echo "Starting frontend on http://localhost:$(FRONTEND_PORT)..."
	cd web && npm run dev

kill-ports:
	@echo "Killing processes on ports $(BACKEND_PORT) and $(FRONTEND_PORT)..."
	@-lsof -ti:$(BACKEND_PORT) | xargs kill -9 2>/dev/null || true
	@-lsof -ti:$(FRONTEND_PORT) | xargs kill -9 2>/dev/null || true
	@sleep 1

# Fix DATABASE_URL if it points to supermolt (run this first if you see "Database supermolt does not exist")
db-fix-url:
	@if [ -f backend/.env ] && grep -q "supermolt" backend/.env; then \
		sed -i '' 's/supermolt/marketlabs/g' backend/.env; \
		echo "✅ Updated DATABASE_URL: supermolt → marketlabs in backend/.env"; \
	else \
		echo "ℹ️  No change needed (supermolt not found in backend/.env)"; \
	fi

# Database setup — run once before first 'make dev'
db-setup:
	@echo "Setting up database..."
	@echo "→ Creating marketlabs database (if needed)..."
	cd backend && npx tsx scripts/create-database.ts
	@echo "→ Pushing Prisma schema..."
	cd backend && npx prisma generate && npx prisma db push
	@echo "✅ Database ready."

db-push:
	cd backend && npx prisma generate && npx prisma db push

typecheck:
	@echo "Typechecking backend..."
	cd backend && npm run typecheck
	@echo "Typechecking frontend..."
	cd web && npm run type-check

clean: kill-ports
	@echo "Cleaning up..."
	rm -rf backend/node_modules web/node_modules backend/dist web/.next
	@echo "Done. Run 'make install' to reinstall."
