# Local PostgreSQL Setup with Colima

## Prerequisites

- **Colima**: `brew install colima`
- **Docker CLI** (real binary, not Podman shim): `brew install docker`
- **docker-compose plugin**: `brew install docker-compose`

## The Podman Shim Problem

On this machine, `~/bin/docker` is a shell script that redirects all `docker` calls to `podman`. Colima shells out to `docker` during provisioning, so it hits Podman instead and fails with:

```
Error: "colima" destination is not defined.
FATA error provisioning docker: exit status 125
```

### Permanent Fix (already applied)

Replace the dumb shim at `~/bin/docker` with a smart one that detects Colima:

```bash
#!/bin/bash
# Uses Colima's real Docker when Colima is running, otherwise falls back to Podman
if [ -S "$HOME/.colima/default/docker.sock" ]; then
  exec /opt/homebrew/bin/docker "$@"
else
  exec podman "$@"
fi
```

This way:
- When Colima is running, `docker` uses the real Docker CLI via Colima's socket
- When Colima is stopped, `docker` falls back to Podman as before

## Step-by-Step: From Zero to Running Postgres

### 1. Start Colima

```bash
# First time or after a broken state:
colima delete -f
colima start --runtime docker

# Normal start (subsequent times):
colima start
```

If you see "empty value" errors, always do `colima delete -f` first.

### 2. Verify Colima + Docker

```bash
colima status
# Should show: colima is running, runtime: docker

docker ps
# Should show containers (or empty list), NOT a Podman error
```

### 3. Start PostgreSQL Container

From the marketlabs project root:

```bash
# Option A: Using the Makefile (recommended)
make postgres-up-colima

# Option B: Manually with docker compose
docker compose -f docker-compose.postgres.yml up -d
```

This starts a `postgres:16-alpine` container named `marketlabs-db` on **port 5433** (mapped from container port 5432).

### 4. Verify PostgreSQL is Reachable

```bash
# Quick port check
nc -z 127.0.0.1 5433 && echo "OK" || echo "FAIL"

# Full connectivity test via docker exec
docker exec marketlabs-db psql -U marketlabs -d marketlabs -c "SELECT 1 AS connected;"

# Python socket test (if nc not available)
python3 -c "import socket; s=socket.socket(); s.settimeout(2); s.connect(('127.0.0.1', 5433)); s.close(); print('OK')"
```

### 5. Configure server/.env

Ensure these are set in `server/.env`:

```env
DATABASE_URL=postgresql://marketlabs:marketlabs123@127.0.0.1:5433/marketlabs
DB_TYPE=postgresql
```

### 6. Run the App

```bash
make dev
```

This runs `postgres-ensure` (checks if port 5433 is open), then starts:
- Python backend on http://localhost:5000
- Vue web app on http://localhost:8000

## Daily Workflow

```bash
# Start of day
colima start                    # Start the VM (containers auto-resume)
cd /path/to/marketlabs
make dev                        # Backend + web, Postgres auto-detected

# End of day
colima stop                     # Stops VM + all containers
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `colima start` | Start Colima VM (containers auto-resume) |
| `colima stop` | Stop Colima VM and all containers |
| `colima status` | Check if Colima is running |
| `colima delete -f` | Nuclear option: destroy VM and start fresh |
| `make postgres-up-colima` | Start only the PostgreSQL container |
| `make postgres-down-colima` | Stop the PostgreSQL container |
| `make postgres-reset-colima` | Wipe Postgres data and recreate from scratch |
| `make dev` | Start backend + web (auto-starts Postgres if possible) |

## Connection Details

| Parameter | Value |
|-----------|-------|
| Host | `127.0.0.1` |
| Port | `5433` |
| User | `marketlabs` |
| Password | `marketlabs123` |
| Database | `marketlabs` |
| Full URL | `postgresql://marketlabs:marketlabs123@127.0.0.1:5433/marketlabs` |

## Troubleshooting

### "empty value" error on colima status/stop
Colima's state is corrupted. Delete and recreate:
```bash
colima delete -f
colima start --runtime docker
```

### Port 5432 forwarding warning (negligible)
```
failed to set up forwarding tcp port 5432
```
This is expected if Homebrew Postgres is already on 5432. The marketlabs-db container uses **5433**, so this warning is harmless.

### "Connection refused" on port 5433
Postgres container isn't running. Check:
```bash
docker ps | grep marketlabs-db
```
If not listed, start it:
```bash
make postgres-up-colima
```

### "role marketlabs does not exist"
The init script didn't run (usually because the volume already existed from a previous run with different config):
```bash
make postgres-reset-colima
```
This removes the volume and recreates the container fresh.

### `docker` command shows Podman errors even with Colima running
Your `~/bin/docker` shim isn't detecting Colima. Verify the socket exists:
```bash
ls -la ~/.colima/default/docker.sock
```
If missing, Colima isn't fully started. Run `colima stop && colima start`.
