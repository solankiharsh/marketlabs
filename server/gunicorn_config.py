"""
Gunicorn config (production).
"""
import multiprocessing

# Server socket
bind = "0.0.0.0:5000"
backlog = 2048

# Workers
workers = multiprocessing.cpu_count() * 2 + 1
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

