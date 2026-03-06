"""
PostgreSQL Database Connection Utility

Supports multi-user mode with connection pooling and SQLite compatibility layer.
"""
import os
import threading
import time
from typing import Optional, Any, List, Dict
from contextlib import contextmanager
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Try to import psycopg2
try:
    import psycopg2
    from psycopg2 import pool
    from psycopg2.extras import RealDictCursor
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False
    logger.warning("psycopg2 not installed. PostgreSQL support disabled.")

# Retry pool creation when Postgres is briefly unreachable (e.g. Colima port forward not ready).
PG_CONNECT_RETRIES = 5
PG_CONNECT_RETRY_DELAY = 2.0

# Connection pool (global singleton)
_connection_pool: Optional[Any] = None
_pool_lock = threading.Lock()


def _get_database_url() -> str:
    """Get database connection URL from environment"""
    return os.getenv('DATABASE_URL', '').strip()


def _parse_database_url(url: str) -> Dict[str, Any]:
    """
    Parse DATABASE_URL format: postgresql://user:password@host:port/dbname
    """
    if not url:
        return {}
    
    # Remove protocol prefix
    if url.startswith('postgresql://'):
        url = url[13:]
    elif url.startswith('postgres://'):
        url = url[11:]
    else:
        return {}
    
    result = {}
    
    # Split user:password@host:port/dbname
    if '@' in url:
        auth, hostpart = url.rsplit('@', 1)
        if ':' in auth:
            result['user'], result['password'] = auth.split(':', 1)
        else:
            result['user'] = auth
    else:
        hostpart = url
    
    # Split host:port/dbname
    if '/' in hostpart:
        hostport, result['dbname'] = hostpart.split('/', 1)
    else:
        hostport = hostpart
    
    if ':' in hostport:
        result['host'], port_str = hostport.split(':', 1)
        result['port'] = int(port_str)
    else:
        result['host'] = hostport
        result['port'] = 5432
    
    return result


def _get_connection_pool():
    """Get or create connection pool"""
    global _connection_pool
    
    if _connection_pool is not None:
        return _connection_pool
    
    with _pool_lock:
        if _connection_pool is not None:
            return _connection_pool
        
        if not HAS_PSYCOPG2:
            raise RuntimeError("psycopg2 is not installed. Cannot use PostgreSQL.")
        
        db_url = _get_database_url()
        if not db_url:
            raise RuntimeError("DATABASE_URL environment variable is not set.")
        
        params = _parse_database_url(db_url)
        if not params:
            raise RuntimeError(f"Invalid DATABASE_URL format: {db_url}")
        
        last_error = None
        for attempt in range(1, PG_CONNECT_RETRIES + 1):
            try:
                _connection_pool = pool.ThreadedConnectionPool(
                    minconn=2,
                    maxconn=20,
                    host=params.get('host', 'localhost'),
                    port=params.get('port', 5432),
                    user=params.get('user', 'marketlabs'),
                    password=params.get('password', ''),
                    dbname=params.get('dbname', 'marketlabs'),
                    connect_timeout=10,
                )
                logger.info(f"PostgreSQL connection pool created: {params.get('host')}:{params.get('port')}/{params.get('dbname')}")
                return _connection_pool
            except Exception as e:
                last_error = e
                if attempt < PG_CONNECT_RETRIES:
                    logger.warning(
                        "PostgreSQL connection attempt %d/%d failed (%s). Retrying in %.1fs...",
                        attempt, PG_CONNECT_RETRIES, e, PG_CONNECT_RETRY_DELAY,
                    )
                    time.sleep(PG_CONNECT_RETRY_DELAY)
                else:
                    logger.error(f"Failed to create PostgreSQL connection pool after {PG_CONNECT_RETRIES} attempts: {e}")
                    raise
        raise last_error


class PostgresCursor:
    """PostgreSQL cursor wrapper with SQLite placeholder compatibility"""
    
    def __init__(self, cursor):
        self._cursor = cursor
        self._last_insert_id = None
    
    def _convert_placeholders(self, query: str) -> str:
        """
        Convert SQLite-style ? placeholders to PostgreSQL %s
        Also handle some SQL syntax differences
        """
        # Replace ? -> %s
        query = query.replace('?', '%s')
        
        # SQLite: INSERT OR IGNORE -> PostgreSQL: INSERT ... ON CONFLICT DO NOTHING
        query = query.replace('INSERT OR IGNORE', 'INSERT')
        
        return query
    
    def execute(self, query: str, args: Any = None):
        """Execute SQL statement"""
        query = self._convert_placeholders(query)
        
        # Check if this is an INSERT and add RETURNING id if not present
        is_insert = query.strip().upper().startswith('INSERT')
        if is_insert and 'RETURNING' not in query.upper():
            query = query.rstrip(';').rstrip() + ' RETURNING id'
        
        if args:
            if not isinstance(args, (tuple, list)):
                args = (args,)
            result = self._cursor.execute(query, args)
        else:
            result = self._cursor.execute(query)
        
        # Capture last insert id for INSERT statements
        if is_insert:
            try:
                row = self._cursor.fetchone()
                if row and 'id' in row:
                    self._last_insert_id = row['id']
            except Exception:
                pass
        
        return result
    
    def fetchone(self) -> Optional[Dict[str, Any]]:
        """Fetch single row"""
        row = self._cursor.fetchone()
        if row is None:
            return None
        return dict(row) if row else None
    
    def fetchall(self) -> List[Dict[str, Any]]:
        """Fetch all rows"""
        rows = self._cursor.fetchall()
        return [dict(row) for row in rows] if rows else []
    
    def close(self):
        """Close cursor"""
        self._cursor.close()
    
    @property
    def lastrowid(self) -> Optional[int]:
        """Get last inserted row ID"""
        return self._last_insert_id
    
    @property
    def rowcount(self) -> int:
        """Get affected row count"""
        return self._cursor.rowcount


class PostgresConnection:
    """PostgreSQL connection wrapper"""
    
    def __init__(self, conn):
        self._conn = conn
        self._pool = _get_connection_pool()
    
    def cursor(self) -> PostgresCursor:
        """Create cursor"""
        return PostgresCursor(self._conn.cursor(cursor_factory=RealDictCursor))
    
    def commit(self):
        """Commit transaction"""
        self._conn.commit()
    
    def rollback(self):
        """Rollback transaction"""
        self._conn.rollback()
    
    def close(self):
        """Return connection to pool"""
        if self._pool and self._conn:
            try:
                self._pool.putconn(self._conn)
            except Exception as e:
                logger.warning(f"Failed to return connection to pool: {e}")


@contextmanager
def get_pg_connection():
    """
    Get PostgreSQL database connection (Context Manager)
    """
    pool = _get_connection_pool()
    conn = None
    try:
        conn = pool.getconn()
        pg_conn = PostgresConnection(conn)
        yield pg_conn
    except Exception as e:
        if conn:
            try:
                conn.rollback()
            except Exception:
                pass
        logger.error(f"PostgreSQL operation error: {e}")
        raise
    finally:
        if conn:
            try:
                pool.putconn(conn)
            except Exception:
                pass


def get_pg_connection_sync() -> PostgresConnection:
    """
    Get connection synchronously (caller must close)
    """
    pool = _get_connection_pool()
    conn = pool.getconn()
    return PostgresConnection(conn)


def execute_sql(sql: str, params: tuple = None) -> List[Dict[str, Any]]:
    """
    Execute SQL and return results (convenience function)
    """
    with get_pg_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        if sql.strip().upper().startswith('SELECT'):
            return cursor.fetchall()
        conn.commit()
        return []


def test_postgres_connection():
    """
    Test PostgreSQL connectivity without creating the global pool.
    Returns (True, "") on success, or (False, "host:port — error_message") on failure.
    Use at startup to log a clear message if the DB is unreachable.
    """
    if not HAS_PSYCOPG2:
        return False, "psycopg2 not installed"
    db_url = _get_database_url()
    if not db_url:
        return False, "DATABASE_URL not set"
    params = _parse_database_url(db_url)
    if not params:
        return False, "Invalid DATABASE_URL format"
    host = params.get("host", "localhost")
    port = params.get("port", 5432)
    addr = f"{host}:{port}"
    try:
        conn = psycopg2.connect(
            host=host,
            port=port,
            user=params.get("user"),
            password=params.get("password", ""),
            dbname=params.get("dbname"),
            connect_timeout=5,
        )
        conn.close()
        return True, ""
    except Exception as e:
        return False, f"{addr} — {e}"


def is_postgres_available() -> bool:
    """Check if PostgreSQL is available"""
    if not HAS_PSYCOPG2:
        return False
    
    db_url = _get_database_url()
    if not db_url:
        return False
    
    try:
        with get_pg_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            return True
    except Exception as e:
        logger.debug(f"PostgreSQL not available: {e}")
        return False


def close_pool():
    """Close connection pool (call on app shutdown)"""
    global _connection_pool
    if _connection_pool:
        try:
            _connection_pool.closeall()
            _connection_pool = None
            logger.info("PostgreSQL connection pool closed")
        except Exception as e:
            logger.warning(f"Error closing connection pool: {e}")
