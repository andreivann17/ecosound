from __future__ import annotations

import datetime as dt
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query

from ..deps import get_current_user, get_tenant_filter
from ..db import get_connection

router = APIRouter(prefix="/estadisticas", tags=["estadisticas"])

MESES_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun",
            "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

# Saldo pendiente = importe - anticipo - suma de abonos (nunca negativo)
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
    tenant_id: Optional[int] = Depends(get_tenant_filter),
):
    if periodo not in ("semana", "quincena", "mes", "custom"):
        periodo = "mes"

    p_from, p_to = _period_dates(periodo, date_from, date_to)
    today = dt.date.today()

    # tenant filters: _cf for queries with alias c, _nf for queries without alias
    _cf = " AND c.id_cliente = %s" if tenant_id is not None else ""
    _nf = " AND id_cliente = %s" if tenant_id is not None else ""
    _tp = (tenant_id,) if tenant_id is not None else ()

    conn = get_connection()

    try:
        with conn.cursor(dictionary=True) as cur:

            # ── KPIs ─────────────────────────────────────────────────────────

            # Contratos con evento en el período (para saldo y valor total)
            contratos_count = int(_scalar(cur,
                f"SELECT COUNT(*) AS cnt FROM contratos "
                f"WHERE active = 1 AND DATE(fecha_evento) BETWEEN %s AND %s{_nf}",
                (p_from, p_to) + _tp,
            ))

            # Pagos recibidos EN el período (filtrado por fecha del pago, no del evento)
            # — Anticipos cuya fecha_anticipo cae en el período
            ing_anticipo = float(_scalar(cur,
                f"SELECT COALESCE(SUM(CAST(NULLIF(TRIM(importe_anticipo),'') AS DECIMAL(12,2))),0) AS t "
                f"FROM contratos "
                f"WHERE active=1 AND fecha_anticipo IS NOT NULL "
                f"AND DATE(fecha_anticipo) BETWEEN %s AND %s{_nf}",
                (p_from, p_to) + _tp,
            ))
            # — Abonos cuya fecha cae en el período
            ing_abonos = float(_scalar(cur,
                f"SELECT COALESCE(SUM(CAST(ca.importe AS DECIMAL(12,2))),0) AS t "
                f"FROM contratos_abonos ca "
                f"JOIN contratos c ON c.id_contrato = ca.id_contrato "
                f"WHERE ca.active=1 AND c.active=1 "
                f"AND DATE(ca.fecha) BETWEEN %s AND %s{_cf}",
                (p_from, p_to) + _tp,
            ))
            ingresos_cobrados = ing_anticipo + ing_abonos

            # Total de gastos registrados en el período (por fecha del gasto)
            _gf = " AND g.id_cliente = %s" if tenant_id is not None else ""
            gastos_total = float(_scalar(cur,
                f"SELECT COALESCE(SUM(monto), 0) AS t "
                f"FROM gastos g "
                f"WHERE g.active_sistema = 1 AND DATE(g.fecha) BETWEEN %s AND %s{_gf}",
                (p_from, p_to) + _tp,
            ))

            # Gastos agrupados por tipo en el período
            cur.execute(
                f"SELECT COALESCE(tg.nombre, 'Sin tipo') AS tipo, COALESCE(SUM(g.monto), 0) AS total "
                f"FROM gastos g "
                f"LEFT JOIN tipo_gastos tg ON tg.id_tipo_gasto = g.id_tipo_gasto "
                f"WHERE g.active_sistema = 1 AND DATE(g.fecha) BETWEEN %s AND %s{_gf} "
                f"GROUP BY g.id_tipo_gasto, tg.nombre "
                f"ORDER BY total DESC",
                (p_from, p_to) + _tp,
            )
            gastos_por_tipo = [
                {"tipo": r["tipo"], "total": float(r["total"])}
                for r in cur.fetchall()
            ]

            # Saldo pendiente de contratos con evento en el período
            saldo_pendiente_total = float(_scalar(cur,
                f"SELECT COALESCE(SUM({_SALDO_EXPR}),0) AS t "
                f"FROM contratos c "
                f"WHERE c.active=1 AND c.importe IS NOT NULL AND c.importe != '' "
                f"AND DATE(c.fecha_evento) BETWEEN %s AND %s{_cf}",
                (p_from, p_to) + _tp,
            ))

            # Importe total de contratos en el período (alcance máximo)
            importe_total = float(_scalar(cur,
                f"SELECT COALESCE(SUM(CAST(NULLIF(TRIM(importe),'') AS DECIMAL(12,2))),0) AS t "
                f"FROM contratos "
                f"WHERE active=1 AND importe IS NOT NULL AND importe != '' "
                f"AND DATE(fecha_evento) BETWEEN %s AND %s{_nf}",
                (p_from, p_to) + _tp,
            ))

            # ── Ingresos por mes — últimos 12 meses (por fecha_evento) ────────

            ingresos_por_mes = []
            for i in range(11, -1, -1):
                m = today.month - i
                y = today.year
                while m <= 0:
                    m += 12
                    y -= 1
                mf, mt = _month_range(y, m)

                # Anticipos recibidos en ese mes (por fecha_anticipo)
                cob_ant = float(_scalar(cur,
                    f"SELECT COALESCE(SUM(CAST(NULLIF(TRIM(importe_anticipo),'') AS DECIMAL(12,2))),0) AS t "
                    f"FROM contratos "
                    f"WHERE active=1 AND fecha_anticipo IS NOT NULL "
                    f"AND DATE(fecha_anticipo) BETWEEN %s AND %s{_nf}",
                    (mf, mt) + _tp,
                ))
                # Abonos recibidos en ese mes (por fecha del abono)
                cob_abo = float(_scalar(cur,
                    f"SELECT COALESCE(SUM(CAST(ca.importe AS DECIMAL(12,2))),0) AS t "
                    f"FROM contratos_abonos ca "
                    f"JOIN contratos c ON c.id_contrato = ca.id_contrato "
                    f"WHERE ca.active=1 AND c.active=1 "
                    f"AND DATE(ca.fecha) BETWEEN %s AND %s{_cf}",
                    (mf, mt) + _tp,
                ))
                cobrado = cob_ant + cob_abo

                pendiente = float(_scalar(cur,
                    f"SELECT COALESCE(SUM({_SALDO_EXPR}),0) AS pend "
                    f"FROM contratos c "
                    f"WHERE c.active=1 AND c.importe IS NOT NULL AND c.importe != '' "
                    f"AND DATE(c.fecha_evento) BETWEEN %s AND %s{_cf}",
                    (mf, mt) + _tp,
                ))

                ingresos_por_mes.append({
                    "mes": MESES_ES[m - 1],
                    "year": y,
                    "cobrado": cobrado,
                    "pendiente": pendiente,
                })

            # ── Contratos por tipo de evento en el período ───────────────────

            cur.execute(
                f"SELECT COALESCE(te.nombre, 'Sin tipo') AS tipo, COUNT(*) AS cantidad "
                f"FROM contratos c "
                f"LEFT JOIN tipo_eventos te ON te.id_tipo_evento = c.id_tipo_evento "
                f"WHERE c.active = 1 AND DATE(c.fecha_evento) BETWEEN %s AND %s{_cf} "
                f"GROUP BY c.id_tipo_evento, te.nombre "
                f"ORDER BY cantidad DESC",
                (p_from, p_to) + _tp,
            )
            por_tipo = [
                {"tipo": r["tipo"], "cantidad": int(r["cantidad"])}
                for r in cur.fetchall()
            ]

            # ── Contratos por ciudad ─────────────────────────────────────────

            cur.execute(
                f"SELECT COALESCE(ci.nombre, 'Sin ciudad') AS ciudad, COUNT(*) AS cantidad "
                f"FROM contratos c "
                f"LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad "
                f"WHERE c.active = 1 AND DATE(c.fecha_evento) BETWEEN %s AND %s{_cf} "
                f"GROUP BY c.id_ciudad, ci.nombre "
                f"ORDER BY cantidad DESC",
                (p_from, p_to) + _tp,
            )
            por_ciudad = [
                {"ciudad": r["ciudad"], "cantidad": int(r["cantidad"])}
                for r in cur.fetchall()
            ]

            # ── Paquetes: fotografía vs sonido ───────────────────────────────

            count_foto = int(_scalar(cur,
                f"SELECT COUNT(*) AS cnt FROM contratos "
                f"WHERE active=1 AND id_paquete_fotografia IS NOT NULL "
                f"AND DATE(fecha_evento) BETWEEN %s AND %s{_nf}",
                (p_from, p_to) + _tp,
            ))
            count_sonido = int(_scalar(cur,
                f"SELECT COUNT(*) AS cnt FROM contratos "
                f"WHERE active=1 AND id_paquete_sonido IS NOT NULL "
                f"AND DATE(fecha_evento) BETWEEN %s AND %s{_nf}",
                (p_from, p_to) + _tp,
            ))
            por_tipo_paquete = [
                {"tipo": "Fotografía", "cantidad": count_foto},
                {"tipo": "Sonido", "cantidad": count_sonido},
            ]

            # ── Top paquetes fotografía ──────────────────────────────────────

            cur.execute(
                f"SELECT pf.nombre, COUNT(*) AS cantidad "
                f"FROM contratos c "
                f"JOIN paquetes_fotografia pf ON pf.id_paquete_fotografia = c.id_paquete_fotografia "
                f"WHERE c.active = 1 AND c.id_paquete_fotografia IS NOT NULL "
                f"AND DATE(c.fecha_evento) BETWEEN %s AND %s{_cf} "
                f"GROUP BY c.id_paquete_fotografia, pf.nombre "
                f"ORDER BY cantidad DESC LIMIT 10",
                (p_from, p_to) + _tp,
            )
            top_paquetes_foto = [
                {"nombre": r["nombre"], "cantidad": int(r["cantidad"])}
                for r in cur.fetchall()
            ]

            # ── Top paquetes sonido ──────────────────────────────────────────

            cur.execute(
                f"SELECT ps.nombre, COUNT(*) AS cantidad "
                f"FROM contratos c "
                f"JOIN paquetes_sonido ps ON ps.id_paquete_sonido = c.id_paquete_sonido "
                f"WHERE c.active = 1 AND c.id_paquete_sonido IS NOT NULL "
                f"AND DATE(c.fecha_evento) BETWEEN %s AND %s{_cf} "
                f"GROUP BY c.id_paquete_sonido, ps.nombre "
                f"ORDER BY cantidad DESC LIMIT 10",
                (p_from, p_to) + _tp,
            )
            top_paquetes_sonido = [
                {"nombre": r["nombre"], "cantidad": int(r["cantidad"])}
                for r in cur.fetchall()
            ]

            # ── Trabajadores por número de contratos ─────────────────────────

            cur.execute(
                f"""
                SELECT CONCAT(t.nombre, ' ', t.apellido) AS nombre,
                       COALESCE(p.nombre, 'Sin puesto') AS puesto,
                       COUNT(*) AS contratos_count
                FROM contratos_trabajadores ct
                JOIN trabajadores t ON t.id_trabajador = ct.id_trabajador
                LEFT JOIN puestos p ON p.id_puesto = ct.id_puesto
                JOIN contratos c ON c.id_contrato = ct.id_contrato
                WHERE ct.active = 1 AND c.active = 1
                  AND DATE(c.fecha_evento) BETWEEN %s AND %s{_cf}
                GROUP BY ct.id_trabajador, t.nombre, t.apellido, p.nombre
                ORDER BY contratos_count DESC
                LIMIT 20
                """,
                (p_from, p_to) + _tp,
            )
            trabajadores_stats = [
                {
                    "nombre": r["nombre"].strip(),
                    "puesto": r["puesto"],
                    "contratos_count": int(r["contratos_count"]),
                }
                for r in cur.fetchall()
            ]

            # ── Cotizaciones en el período ────────────────────────────────────

            _qf = " AND id_cliente = %s" if tenant_id is not None else ""
            _qfq = " AND q.id_cliente = %s" if tenant_id is not None else ""

            cotizaciones_count = int(_scalar(cur,
                f"SELECT COUNT(*) AS cnt FROM cotizaciones "
                f"WHERE active = 1 AND DATE(fecha_evento) BETWEEN %s AND %s{_qf}",
                (p_from, p_to) + _tp,
            ))

            cotizaciones_importe_total = float(_scalar(cur,
                f"SELECT COALESCE(SUM(CAST(NULLIF(TRIM(importe),'') AS DECIMAL(12,2))),0) AS t "
                f"FROM cotizaciones "
                f"WHERE active=1 AND importe IS NOT NULL AND importe != '' "
                f"AND DATE(fecha_evento) BETWEEN %s AND %s{_qf}",
                (p_from, p_to) + _tp,
            ))

            cur.execute(
                f"SELECT COALESCE(ci.nombre, 'Sin ciudad') AS ciudad, COUNT(*) AS cantidad "
                f"FROM cotizaciones q "
                f"LEFT JOIN ciudades ci ON ci.id_ciudad = q.id_ciudad "
                f"WHERE q.active = 1 AND DATE(q.fecha_evento) BETWEEN %s AND %s{_qfq} "
                f"GROUP BY q.id_ciudad, ci.nombre "
                f"ORDER BY cantidad DESC",
                (p_from, p_to) + _tp,
            )
            cotizaciones_por_ciudad = [
                {"ciudad": r["ciudad"], "cantidad": int(r["cantidad"])}
                for r in cur.fetchall()
            ]

            cur.execute(
                f"SELECT COALESCE(te.nombre, 'Sin tipo') AS tipo, COUNT(*) AS cantidad "
                f"FROM cotizaciones q "
                f"LEFT JOIN tipo_eventos te ON te.id_tipo_evento = q.id_tipo_evento "
                f"WHERE q.active = 1 AND DATE(q.fecha_evento) BETWEEN %s AND %s{_qfq} "
                f"GROUP BY q.id_tipo_evento, te.nombre "
                f"ORDER BY cantidad DESC",
                (p_from, p_to) + _tp,
            )
            cotizaciones_por_tipo = [
                {"tipo": r["tipo"], "cantidad": int(r["cantidad"])}
                for r in cur.fetchall()
            ]

            # ── Contratos con saldo pendiente en el período ──────────────────

            cur.execute(
                f"SELECT c.id_contrato, c.cliente_nombre, c.fecha_evento, "
                f"COALESCE(te.nombre,'Sin tipo') AS tipo_evento, "
                f"({_SALDO_EXPR}) AS saldo, "
                f"DATEDIFF(%s, c.fecha_evento) AS dias_diff "
                f"FROM contratos c "
                f"LEFT JOIN tipo_eventos te ON te.id_tipo_evento = c.id_tipo_evento "
                f"WHERE c.active=1 AND c.importe IS NOT NULL AND c.importe != '' "
                f"AND DATE(c.fecha_evento) BETWEEN %s AND %s{_cf} "
                f"HAVING saldo > 0 "
                f"ORDER BY c.fecha_evento ASC LIMIT 50",
                (str(today), p_from, p_to) + _tp,
            )
            contratos_pendientes = [
                {
                    "id_contrato": r["id_contrato"],
                    "cliente_nombre": r["cliente_nombre"],
                    "fecha_evento": str(r["fecha_evento"]) if r["fecha_evento"] else None,
                    "tipo_evento": r["tipo_evento"],
                    "saldo": float(r["saldo"]),
                    "dias_diff": int(r["dias_diff"] or 0),
                }
                for r in cur.fetchall()
            ]

            # ── Todos los contratos del período ──────────────────────────────

            cur.execute(
                f"SELECT c.id_contrato, c.cliente_nombre, c.fecha_evento, "
                f"c.datetime AS fecha_creacion, "
                f"c.importe, "
                f"COALESCE(te.nombre,'Sin tipo') AS tipo_evento, "
                f"({_SALDO_EXPR}) AS saldo_pendiente "
                f"FROM contratos c "
                f"LEFT JOIN tipo_eventos te ON te.id_tipo_evento = c.id_tipo_evento "
                f"WHERE c.active = 1 AND DATE(c.fecha_evento) BETWEEN %s AND %s{_cf} "
                f"ORDER BY c.fecha_evento ASC LIMIT 100",
                (p_from, p_to) + _tp,
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
                    "importe_total": importe_total,
                    "contratos_count": contratos_count,
                    "gastos_total": gastos_total,
                },
                "gastos_por_tipo": gastos_por_tipo,
                "ingresos_por_mes": ingresos_por_mes,
                "por_tipo_evento": por_tipo,
                "por_ciudad": por_ciudad,
                "por_tipo_paquete": por_tipo_paquete,
                "top_paquetes_foto": top_paquetes_foto,
                "top_paquetes_sonido": top_paquetes_sonido,
                "trabajadores_stats": trabajadores_stats,
                "cotizaciones": {
                    "count": cotizaciones_count,
                    "importe_total": cotizaciones_importe_total,
                    "por_ciudad": cotizaciones_por_ciudad,
                    "por_tipo_evento": cotizaciones_por_tipo,
                },
                "cobranza": {
                    "contratos_pendientes": contratos_pendientes,
                },
                "contratos_del_periodo": contratos_del_periodo,
            }
    finally:
        conn.close()
