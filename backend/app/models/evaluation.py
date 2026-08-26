from __future__ import annotations

import datetime as dt
from typing import Any, Dict, List, Set


def get_existing_names(conn, names: List[str]) -> Set[str]:
    if not names:
        return set()
    placeholders = ", ".join(["%s"] * len(names))
    with conn.cursor() as cur:
        cur.execute(
            f"SELECT name FROM retinal_images WHERE name IN ({placeholders})",
            tuple(names),
        )
        return {row[0] for row in cur.fetchall()}


def list_active_images(conn) -> List[Dict[str, Any]]:
    with conn.cursor(dictionary=True) as cur:
        cur.execute(
            """
            SELECT id_retinal_image, name
            FROM retinal_images
            WHERE active = 1
            ORDER BY id_retinal_image ASC
            """
        )
        return cur.fetchall()


def bulk_insert_retinal_images(conn, rows: List[Dict[str, Any]]) -> int:
    if not rows:
        return 0
    now = dt.datetime.now()
    values = [
        (r["name"], r["hidden_name"], r["is_real"], r["stage"], 1, now)
        for r in rows
    ]
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO retinal_images (name, hidden_name, is_real, stage, active, datetime)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            values,
        )
    return len(values)
