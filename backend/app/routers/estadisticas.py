from __future__ import annotations

import datetime as dt
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query

from ..deps import get_current_user
from ..db import get_connection

router = APIRouter(prefix="/estadisticas", tags=["estadisticas"])

MESES_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun",
            "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

# Saldo pendiente por contrato
_SALDO_EXPR = """
    GREATEST(
        COALESCE(CAST(NULLIF(TRIM(c.importe), '') AS DECIMAL(12,2)), 0)
        - COALESCE(CAST(NULLIF(TRIM(c.importe_anticipo), '') AS DECIMAL(12,2)), 0)
        - COALESCE((
            SELECT SUM(CAST(ca_sub.importe AS DECIMAL(12,2)))
            FROM contratos_abonos ca_sub
            WHERE ca_sub.id_contrato = c.id_contrato AND ca_sub.active = 1
          ), 0),
        0
    )
""".strip()


def _period_dates(
    periodo: str,
    date_from_custom: Optional[str],
    date_to_custom: Optional[str],
):
    today = dt.date.today()

    if periodo == "semana":
        monday = today - dt.timedelta(days=today.weekday())
        sunday = monday + dt.timedelta(days=6)
        return str(monday), str(sunday)

    if periodo == "quincena":
        if today.day <= 15:
            start = today.replace(day=1)
            end = today.replace(day=15)
        else:
            start = today.replace(day=16)
            if today.month == 12:
                end = dt.date(today.year, 12, 31)
            else:
                end = dt.date(today.year, today.month + 1, 1) - dt.timedelta(days=1)
        return str(start), str(end)

    if periodo == "custom":
        df = date_from_custom or str(today.replace(day=1))
        dt_ = date_to_custom or str(today)
        return df, dt_

    # mes (default)
    start = today.replace(day=1)
    if today.month == 12:
        end = dt.date(today.year, 12, 31)
    else:
        end = dt.date(today.year, today.month + 1, 1) - dt.timedelta(days=1)
    return str(start), str(end)


def _month_range(year: int, month: int):
    start = dt.date(year, month, 1)
    if month == 12:
        end = dt.date(year, 12, 31)
    else:
        end = dt.date(year, month + 1, 1) - dt.timedelta(days=1)
    return str(start), str(end)


def _scalar(cur, sql: str, params=()):
    cur.execute(sql, params)
    row = cur.fetchone()
    if not row:
        return 0
    return list(row.values())[0]


@router.get("")
def get_estadisticas(
    periodo: str = Query("mes"),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    if periodo not in ("semana", "quincena", "mes", "custom"):
        periodo = "mes"

    p_from, p_to = _period_dates(periodo, date_from, date_to)
    today = dt.date.today()
    conn = get_connection()

    try:
        with conn.cursor(dictionary=True) as cur:

            # ── KPIs del período ─────────────────────────────────────────────

            contratos_count = int(_scalar(cur,
                "SELECT COUNT(*) AS cnt FROM contratos "
                "WHERE active = 1 AND DATE(fecha_evento) BETWEEN %s AND %s",
                (p_from, p_to),
            ))

            ing_anticipo = float(_scalar(cur,
                "SELECT COALESCE(SUM(CAST(NULLIF(TRIM(importe_anticipo),'') AS DECIMAL(12,2))),0) AS t "
                "FROM contratos WHERE active=1 AND fecha_anticipo IS NOT NULL "
                "AND DATE(fecha_anticipo) BETWEEN %s AND %s",
                (p_from, p_to),
            ))
            ing_abonos = float(_scalar(cur,
                "SELECT COALESCE(SUM(CAST(ca.importe AS DECIMAL(12,2))),0) AS t "
                "FROM contratos_abonos ca "
                "WHERE ca.active=1 AND DATE(ca.fecha) BETWEEN %s AND %s",
                (p_from, p_to),
            ))
            ingresos_cobrados = ing_anticipo + ing_abonos

            ticket_promedio = float(_scalar(cur,
                "SELECT COALESCE(AVG(CAST(NULLIF(TRIM(importe),'') AS DECIMAL(12,2))),0) AS avg_i "
                "FROM contratos WHERE active=1 AND importe IS NOT NULL AND importe != '' "
                "AND DATE(fecha_evento) BETWEEN %s AND %s",
                (p_from, p_to),
            ))

            # Saldo pendiente GLOBAL (no filtrado por periodo)
            saldo_pendiente_total = float(_scalar(cur,
                f"SELECT COALESCE(SUM({_SALDO_EXPR}),0) AS t "
                "FROM contratos c "
                "WHERE c.active=1 AND c.importe IS NOT NULL AND c.importe != ''",
            ))

            # ── Ingresos por mes — últimos 12 meses ──────────────────────────

            ingresos_por_mes = []
            for i in range(11, -1, -1):
                m = today.month - i
                y = today.year
                while m <= 0:
                    m += 12
                    y -= 1
                mf, mt = _month_range(y, m)

                cob_ant = float(_scalar(cur,
                    "SELECT COALESCE(SUM(CAST(NULLIF(TRIM(importe_anticipo),'') AS DECIMAL(12,2))),0) AS t "
                    "FROM contratos WHERE active=1 AND fecha_anticipo IS NOT NULL "
                    "AND DATE(fecha_anticipo) BETWEEN %s AND %s",
                    (mf, mt),
                ))
                cob_abo = float(_scalar(cur,
                    "SELECT COALESCE(SUM(CAST(ca.importe AS DECIMAL(12,2))),0) AS t "
                    "FROM contratos_abonos ca "
                    "WHERE ca.active=1 AND DATE(ca.fecha) BETWEEN %s AND %s",
                    (mf, mt),
                ))
                cobrado = cob_ant + cob_abo

                pendiente = float(_scalar(cur,
                    f"SELECT COALESCE(SUM({_SALDO_EXPR}),0) AS pend "
                    "FROM contratos c "
                    "WHERE c.active=1 AND c.importe IS NOT NULL AND c.importe != '' "
                    "AND DATE(c.fecha_evento) BETWEEN %s AND %s",
                    (mf, mt),
                ))

                ingresos_por_mes.append({
                    "mes": MESES_ES[m - 1],
                    "year": y,
                    "cobrado": cobrado,
                    "pendiente": pendiente,
                })

            # ── Contratos por tipo de evento (filtrado por periodo) ──────────

            cur.execute(
                "SELECT COALESCE(te.nombre, 'Sin tipo') AS tipo, COUNT(*) AS cantidad "
                "FROM contratos c "
                "LEFT JOIN tipo_eventos te ON te.id_tipo_evento = c.id_tipo_evento "
                "WHERE c.active = 1 AND DATE(c.fecha_evento) BETWEEN %s AND %s "
                "GROUP BY c.id_tipo_evento, te.nombre "
                "ORDER BY cantidad DESC",
                (p_from, p_to),
            )
            por_tipo = [
                {"tipo": r["tipo"], "cantidad": int(r["cantidad"])}
                for r in cur.fetchall()
            ]

            # ── Contratos con saldo pendiente en el período ──────────────────
            # (contratos cuyo evento cae en el período y tienen saldo > 0)

            cur.execute(
                f"SELECT c.id_contrato, c.cliente_nombre, c.fecha_evento, "
                f"COALESCE(te.nombre,'Sin tipo') AS tipo_evento, "
                f"({_SALDO_EXPR}) AS saldo, "
                f"DATEDIFF(%s, c.fecha_evento) AS dias_diff "
                "FROM contratos c "
                "LEFT JOIN tipo_eventos te ON te.id_tipo_evento = c.id_tipo_evento "
                "WHERE c.active=1 AND c.importe IS NOT NULL AND c.importe != '' "
                "AND DATE(c.fecha_evento) BETWEEN %s AND %s "
                f"HAVING saldo > 0 "
                "ORDER BY c.fecha_evento ASC LIMIT 50",
                (str(today), p_from, p_to),
            )
            contratos_pendientes = [
                {
                    "id_contrato": r["id_contrato"],
                    "cliente_nombre": r["cliente_nombre"],
                    "fecha_evento": str(r["fecha_evento"]) if r["fecha_evento"] else None,
                    "tipo_evento": r["tipo_evento"],
                    "saldo": float(r["saldo"]),
                    "dias_diff": int(r["dias_diff"] or 0),
                    # dias_diff > 0 = evento ya pasó (vencido), <= 0 = aún no llega
                }
                for r in cur.fetchall()
            ]

            # ── Contratos del período (todos, para lista derecha) ─────────────

            cur.execute(
                f"SELECT c.id_contrato, c.cliente_nombre, c.fecha_evento, "
                f"c.datetime AS fecha_creacion, "
                f"c.importe, "
                f"COALESCE(te.nombre,'Sin tipo') AS tipo_evento, "
                f"({_SALDO_EXPR}) AS saldo_pendiente "
                "FROM contratos c "
                "LEFT JOIN tipo_eventos te ON te.id_tipo_evento = c.id_tipo_evento "
                "WHERE c.active = 1 AND DATE(c.fecha_evento) BETWEEN %s AND %s "
                "ORDER BY c.fecha_evento ASC LIMIT 100",
                (p_from, p_to),
            )
            contratos_del_periodo = [
                {
                    "id_contrato": r["id_contrato"],
                    "cliente_nombre": r["cliente_nombre"],
                    "fecha_evento": str(r["fecha_evento"]) if r["fecha_evento"] else None,
                    "fecha_creacion": str(r["fecha_creacion"]) if r["fecha_creacion"] else None,
                    "importe": float(r["importe"]) if r["importe"] else 0,
                    "tipo_evento": r["tipo_evento"],
                    "saldo_pendiente": float(r["saldo_pendiente"] or 0),
                }
                for r in cur.fetchall()
            ]

            return {
                "periodo": {
                    "tipo": periodo,
                    "date_from": p_from,
                    "date_to": p_to,
                },
                "kpis": {
                    "ingresos_cobrados": ingresos_cobrados,
                    "saldo_pendiente_total": saldo_pendiente_total,
                    "contratos_count": contratos_count,
                    "ticket_promedio": ticket_promedio,
                },
                "ingresos_por_mes": ingresos_por_mes,
                "por_tipo_evento": por_tipo,
                "cobranza": {
                    "contratos_pendientes": contratos_pendientes,
                },
                "contratos_del_periodo": contratos_del_periodo,
            }
    finally:
        conn.close()
