"""
Gunicorn config (production).
Railway injects PORT; bind to it so healthchecks and proxy reach the app.
"""
import multiprocessing
import os

# Server socket: use PORT from env (Railway) so healthcheck succeeds
_port = os.environ.get("PORT", "5000")
bind = f"0.0.0.0:{_port}"
backlog = 2048

# Workers: cap on Railway to avoid too many Postgres connections (NO_SOCKET / TCP_ABORT)
_workers = multiprocessing.cpu_count() * 2 + 1
if os.environ.get("PORT"):
    _workers = min(_workers, 4)
workers = _workers
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 5

# Logging
accesslog = "logs/access.log"
errorlog = "logs/error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process name
proc_name = "marketlabs_python_api"

# Server
daemon = False
pidfile = "logs/gunicorn.pid"
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL (optional)
# keyfile = None
# certfile = None

