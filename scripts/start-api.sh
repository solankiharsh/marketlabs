#!/bin/bash
# Zing Python API starter (run from repo root or scripts/)

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/server"

# Activate venv if present
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install deps if needed
if ! python -c "import flask" 2>/dev/null; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

echo "Starting Zing Python API..."
echo "Service: http://0.0.0.0:5000"

mkdir -p logs

# Development
python run.py

# Production (uncomment to use gunicorn):
# gunicorn -w 4 -b 0.0.0.0:5000 --timeout 120 --access-logfile logs/access.log --error-logfile logs/error.log "run:create_app()"
