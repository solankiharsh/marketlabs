#!/bin/bash
# Simple backend starter script for Zing
# This installs minimal dependencies and starts the Flask server

cd "$(dirname "$0")/../server"

echo "🚀 Starting Zing Backend..."
echo ""

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install dependencies from requirements.txt
echo "📦 Installing dependencies (this may take a minute)..."
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt || {
    echo "⚠️  Full install failed, trying minimal dependencies..."
    pip install --quiet flask flask-cors flask-jwt-extended python-dotenv requests pyyaml sqlalchemy pandas numpy yfinance openai anthropic
}

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env from env.example..."
    cp env.example .env
fi

echo ""
echo "✅ Backend starting on http://localhost:5000"
echo "   Press Ctrl+C to stop"
echo ""

# Start the server
python run.py
