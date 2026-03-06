# MarketLabs Backend API Dockerfile
FROM python:3.12-slim-bookworm

# Set working directory
WORKDIR /app

# Use HTTPS mirror and install minimal runtime dependencies.
# Keep image lean to avoid long downloads of full compiler toolchains.
RUN sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/*.sources 2>/dev/null || true \
    && apt-get update \
    && apt-get install -y --no-install-recommends --fix-missing \
    curl \
    # Build deps (needed for some pyproject-based packages like ed25519-blake2b)
    build-essential \
    python3-dev \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --prefer-binary --timeout 120 -r requirements.txt \
    # Remove build deps to keep image small
    && apt-get purge -y --auto-remove build-essential python3-dev libffi-dev libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p data/memory

# Expose port (Railway sets PORT at runtime; app binds to 0.0.0.0:$PORT)
EXPOSE 5000

# Environment variables (do not set PORT here; Railway injects it)
ENV PYTHONUNBUFFERED=1
ENV PYTHON_API_HOST=0.0.0.0

# Production: gunicorn binds to 0.0.0.0:$PORT so Railway's proxy can reach the app.
# Using run.py alone can cause 502/TCP abort if PORT or binding is wrong.
CMD ["gunicorn", "-c", "gunicorn_config.py", "run:app"]
