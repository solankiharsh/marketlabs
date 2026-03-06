"""
Gunicorn config (production).
Railway injects PORT; bind to it so healthchecks and proxy reach the app.
"""
import os

# Server socket
_port = os.environ.get("PORT", "5000")
bind = f"0.0.0.0:{_port}"
backlog = 2048

# Workers: use WEB_CONCURRENCY if set (Railway), otherwise 2.
# Keep low to avoid multiplied background threads and DB connections.
workers = int(os.environ.get("WEB_CONCURRENCY", 2))
worker_class = "sync"
timeout = 120
keepalive = 5

# Logging: stdout/stderr (Railway captures these automatically)
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s %(D)s'

# Process
proc_name = "marketlabs_python_api"
daemon = False

# Don't preload — background threads (portfolio monitor, order worker) must start
# in the worker process, not the master. With WEB_CONCURRENCY=1 on Railway this is fine.
