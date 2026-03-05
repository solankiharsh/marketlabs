"""
Gunicorn configuration file (production environment)
"""
import os
import multiprocessing

# Server socket (Railway sets PORT)
_port = int(os.environ.get("PORT", 5000))
bind = f"0.0.0.0:{_port}"
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 600  # 10 minutes for long-running backtests (in seconds)
keepalive = 5

# Logs (use - for stdout/stderr when logs/ not writable, e.g. Railway)
_log_dir = "logs"
if os.path.isdir(_log_dir) and os.access(_log_dir, os.W_OK):
    accesslog = f"{_log_dir}/access.log"
    errorlog = f"{_log_dir}/error.log"
    pidfile = f"{_log_dir}/gunicorn.pid"
else:
    accesslog = "-"
    errorlog = "-"
    pidfile = None
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "qd_python_api"

# Server mode
daemon = False
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL (if needed)
# keyfile = None
# certfile = None

