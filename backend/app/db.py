"""
Database configuration and helper utilities.

This module centralizes the logic for connecting to the MySQL database.
Using a connection pool improves performance by re‑using existing
connections instead of creating new ones on every request. The
connection parameters are read from environment variables to avoid
hard‑coding secrets in the source code. When the application starts,
``init_pool`` should be called to set up the pool; subsequent calls
to ``get_connection`` will return a connection from the pool. If
``init_pool`` has not been called the first call to ``get_connection``
will automatically initialize the pool with sane defaults.
"""

import os
from typing import Optional

import mysql.connector
from mysql.connector import errors, pooling


#: Global variable holding the connection pool instance. It is set by
#: :func:`init_pool` and used by :func:`get_connection`.
_POOL: Optional[pooling.MySQLConnectionPool] = None
_POOL_ADMIN: Optional[pooling.MySQLConnectionPool] = None
_POOL_SPIE: Optional[pooling.MySQLConnectionPool] = None


def _get_base_config() -> dict:
    return {
        "host":     os.getenv("DB_HOST", "localhost"),
        "port":     int(os.getenv("DB_PORT", "3306")),
        "user":     os.getenv("DB_USER", "root"),
        "password": os.getenv("DB_PASSWORD", ""),
        "pool_size": int(os.getenv("DB_POOL_SIZE", "20")),
        "autocommit": True,
        "consume_results": True,
    }


def _create_database_if_missing(cfg: dict, database: str) -> None:
    """Conecta sin seleccionar database y la crea si no existe."""
    conn = mysql.connector.connect(
        host=cfg["host"],
        port=cfg["port"],
        user=cfg["user"],
        password=cfg["password"],
        autocommit=True,
    )
    try:
        cur = conn.cursor()
        cur.execute(
            f"CREATE DATABASE IF NOT EXISTS `{database}` "
            "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        )
        cur.close()
    finally:
        conn.close()


def _make_pool(pool_name: str, cfg: dict, database: str) -> pooling.MySQLConnectionPool:
    """Crea el pool; si la base no existe (errno 1049) la crea y reintenta."""
    kwargs = dict(
        pool_name=pool_name,
        pool_size=cfg["pool_size"],
        host=cfg["host"],
        port=cfg["port"],
        database=database,
        user=cfg["user"],
        password=cfg["password"],
        autocommit=cfg["autocommit"],
        consume_results=cfg["consume_results"],
    )
    try:
        return mysql.connector.pooling.MySQLConnectionPool(**kwargs)
    except errors.ProgrammingError as e:
        if getattr(e, "errno", None) != 1049:
            raise
        _create_database_if_missing(cfg, database)
        return mysql.connector.pooling.MySQLConnectionPool(**kwargs)


def _init_main_pool() -> None:
    global _POOL
    cfg = _get_base_config()
    _POOL = _make_pool("fastapi_pool", cfg, os.getenv("DB_NAME", "ecosound"))


def _init_admin_pool() -> None:
    global _POOL_ADMIN
    cfg = _get_base_config()
    _POOL_ADMIN = _make_pool("fastapi_admin_pool", cfg, os.getenv("DB_ADMIN_NAME", "administrador"))


def _init_spie_pool() -> None:
    global _POOL_SPIE
    cfg = _get_base_config()
    _POOL_SPIE = _make_pool("fastapi_spie_pool", cfg, os.getenv("DB_SPIE_NAME", "spie"))


def init_pool() -> None:
    """Initialize all MySQL connection pools independently."""
    _init_main_pool()
    try:
        _init_admin_pool()
    except Exception:
        pass
    try:
        _init_spie_pool()
    except Exception:
        pass


def get_admin_connection() -> mysql.connector.connection.MySQLConnection:
    """Get a connection from the admin pool (database: administrador)."""
    global _POOL_ADMIN
    if _POOL_ADMIN is None:
        _init_admin_pool()
    assert _POOL_ADMIN is not None
    return _POOL_ADMIN.get_connection()


def get_spie_connection() -> mysql.connector.connection.MySQLConnection:
    """Get a connection from the spie pool (database: spie — módulo Evaluation)."""
    global _POOL_SPIE
    if _POOL_SPIE is None:
        _init_spie_pool()
    assert _POOL_SPIE is not None
    return _POOL_SPIE.get_connection()


def get_connection() -> mysql.connector.connection.MySQLConnection:
    """Get a connection from the pool.

    If the pool has not been initialized yet this function will call
    :func:`init_pool` automatically. The caller is responsible for
    closing the returned connection when done. The returned
    connection is configured to autocommit by default.

    Returns:
        mysql.connector.connection.MySQLConnection: a connection from
        the pool ready for use.
    """
    global _POOL
    if _POOL is None:
        _init_main_pool()
    assert _POOL is not None  # mypy/linters
    return _POOL.get_connection()
