from __future__ import annotations

import datetime as dt
from typing import Any, Dict, List, Optional, Set


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


# ================== EVALUATORS (auth) ==================

def get_evaluator_by_email(conn, email: str) -> Optional[Dict[str, Any]]:
    with conn.cursor(dictionary=True) as cur:
        cur.execute(
            """
            SELECT id_evaluator, name, email, password
            FROM evaluators
            WHERE email = %s AND active = 1
            LIMIT 1
            """,
            (email,),
        )
        return cur.fetchone()


def create_evaluator(conn, name: str, email: str, password_hash: str) -> int:
    now = dt.datetime.now()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO evaluators (name, email, password, active, datetime)
            VALUES (%s, %s, %s, 1, %s)
            """,
            (name, email, password_hash, now),
        )
        return cur.lastrowid


# ================== EVALUATIONS (results) ==================

def get_evaluations_for_evaluator(conn, id_evaluator: int) -> List[Dict[str, Any]]:
    with conn.cursor(dictionary=True) as cur:
        cur.execute(
            """
            SELECT id_retinal_image, classification, notes
            FROM evaluations
            WHERE id_evaluator = %s AND active = 1
            """,
            (id_evaluator,),
        )
        return cur.fetchall()


def upsert_evaluation(
    conn,
    id_evaluator: int,
    id_retinal_image: int,
    classification: str,
    notes: str,
) -> None:
    now = dt.datetime.now()
    with conn.cursor(dictionary=True) as cur:
        cur.execute(
            """
            SELECT id_evaluation FROM evaluations
            WHERE id_evaluator = %s AND id_retinal_image = %s
            LIMIT 1
            """,
            (id_evaluator, id_retinal_image),
        )
        existing = cur.fetchone()

    with conn.cursor() as cur:
        if existing:
            cur.execute(
                """
                UPDATE evaluations
                SET classification = %s, notes = %s, evaluated_at = %s
                WHERE id_evaluation = %s
                """,
                (classification, notes, now, existing["id_evaluation"]),
            )
        else:
            cur.execute(
                """
                INSERT INTO evaluations
                    (active, datetime, id_retinal_image, classification, notes, evaluated_at, id_evaluator, id_user)
                VALUES (1, %s, %s, %s, %s, %s, %s, %s)
                """,
                (now, id_retinal_image, classification, notes, now, id_evaluator, id_evaluator),
            )
