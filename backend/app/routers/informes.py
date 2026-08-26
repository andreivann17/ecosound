# routers/informes.py
from __future__ import annotations
from typing import Any, Dict, List, Optional
from datetime import datetime, date, timedelta
from collections import Counter

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ..deps import get_current_user, get_tenant_filter
from ..db import get_connection

router = APIRouter(prefix="/informes", tags=["Informes"])


def _s(v):
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    return v


def _row(d: dict) -> dict:
    return {k: _s(v) for k, v in d.items()}


# Las gráficas "por mes" solo traían filas de meses con datos (GROUP BY sobre
# filas reales), así que un rango de un año con pocos registros se veía como
# un solo mes suelto en vez de las 12 barras del calendario. Esto rellena con
# ceros cada mes del rango [fi, ff] que no haya salido en la consulta.
def _fill_meses(rows: List[dict], fi: Optional[str], ff: Optional[str], value_keys: List[str]) -> List[dict]:
    if not fi or not ff:
        return rows
    try:
        start = datetime.strptime(fi[:10], "%Y-%m-%d").date().replace(day=1)
        end = datetime.strptime(ff[:10], "%Y-%m-%d").date().replace(day=1)
    except ValueError:
        return rows
    if start > end:
        return rows

    by_key = {r["mes_key"]: r for r in rows}
    out = []
    cur = start
    while cur <= end:
        key = cur.strftime("%Y-%m")
        if key in by_key:
            out.append(by_key[key])
        else:
            filler = {"mes_key": key, "mes_label": cur.strftime("%b %Y")}
            for vk in value_keys:
                filler[vk] = 0
            out.append(filler)
        cur = (cur.replace(day=28) + timedelta(days=4)).replace(day=1)
    return out


def _in_ph(lst: list) -> str:
    return "(" + ",".join(["%s"] * len(lst)) + ")"


# id_servicio (tabla `servicios`, fijo 1..4) -> tabla de paquetes correspondiente.
# Mismo mapeo hardcodeado que usa crearEventoPage.jsx (SERVICIOS) en el frontend.
_PAQUETE_TABLES = {
    1: ("paquetes_sonido", "id_paquete_sonido"),
    2: ("paquetes_fotografia", "id_paquete_fotografia"),
    3: ("paquetes_decoraciones", "id_paquete_decoracion"),
    4: ("paquetes_barra", "id_paquete_barra"),
}

# JOIN reutilizable para resolver el nombre de paquete de una fila de
# eventos_servicios/cotizaciones_servicios (alias `es`), sin importar de cuál
# de las 4 tablas de paquetes provenga (depende de es.id_servicio).
def _paquete_join(alias: str, suffix: str) -> str:
    return f"""
        LEFT JOIN paquetes_sonido pqs{suffix} ON {alias}.id_servicio = 1 AND pqs{suffix}.id_paquete_sonido = {alias}.id_paquete
        LEFT JOIN paquetes_fotografia pqf{suffix} ON {alias}.id_servicio = 2 AND pqf{suffix}.id_paquete_fotografia = {alias}.id_paquete
        LEFT JOIN paquetes_decoraciones pqd{suffix} ON {alias}.id_servicio = 3 AND pqd{suffix}.id_paquete_decoracion = {alias}.id_paquete
        LEFT JOIN paquetes_barra pqb{suffix} ON {alias}.id_servicio = 4 AND pqb{suffix}.id_paquete_barra = {alias}.id_paquete
    """

def _paquete_nombre_expr(suffix: str) -> str:
    return f"COALESCE(pqs{suffix}.nombre, pqf{suffix}.nombre, pqd{suffix}.nombre, pqb{suffix}.nombre)"

# El mismo nombre de paquete puede repetirse entre servicios distintos (o por
# datos capturados con variaciones), así que el valor mostrado/filtrado en el
# select de PAQUETE se combina con el servicio ("Paquete 1 - Sonido") para que
# se pueda distinguir a cuál pertenece cada opción.
def _paquete_combined_expr(suffix: str, sv_alias: str) -> str:
    return f"CONCAT({_paquete_nombre_expr(suffix)}, ' - ', {sv_alias}.nombre)"


# Valor especial del filtro PAQUETE: eventos/cotizaciones cuyos servicios no
# tienen ningún paquete asignado (id_paquete NULL en todas sus filas, o sin
# filas de servicio siquiera).
_SIN_PAQUETE_LABEL = "Sin paquetes"


def _build_paquete_condition(paquetes: list, tabla_servicio: str, fk_col: str, id_expr: str, suffix: str):
    """Arma la condición del filtro PAQUETE (EXISTS por nombre + NOT EXISTS para
    'Sin paquetes'), unidos con OR si se seleccionaron ambos tipos de opción."""
    reales = [p for p in paquetes if p != _SIN_PAQUETE_LABEL]
    sin_paquete = _SIN_PAQUETE_LABEL in paquetes
    params: List[Any] = []
    conds: List[str] = []

    if reales:
        conds.append(f"""EXISTS (
            SELECT 1 FROM {tabla_servicio} es{suffix}
            JOIN servicios sv{suffix} ON sv{suffix}.id_servicio = es{suffix}.id_servicio
            {_paquete_join(f"es{suffix}", suffix)}
            WHERE es{suffix}.{fk_col} = {id_expr}
            AND {_paquete_combined_expr(suffix, f"sv{suffix}")} IN {_in_ph(reales)}
        )""")
        params.extend(reales)
    if sin_paquete:
        conds.append(f"""NOT EXISTS (
            SELECT 1 FROM {tabla_servicio} esn{suffix}
            WHERE esn{suffix}.{fk_col} = {id_expr} AND esn{suffix}.id_paquete IS NOT NULL
        )""")

    return "(" + " OR ".join(conds) + ")", params


# Clasifica CUÁNDO se recibió el anticipo respecto a dos anclas: la fecha de
# celebración del contrato (fecha_creacion_contrato) y la fecha del servicio
# más temprano del evento (MIN de sus eventos_servicios/cotizaciones_servicios,
# o la fecha_evento general si no tiene servicios registrados).
def _momento_pago_expr(alias: str, id_col: str, servicios_table: str, servicios_fk: str) -> str:
    return f"""
        CASE
            WHEN {alias}.fecha_anticipo IS NULL THEN NULL
            WHEN DATE({alias}.fecha_anticipo) = DATE({alias}.fecha_creacion_contrato) THEN 'Al Inicio Del Contrato'
            WHEN DATE({alias}.fecha_anticipo) >= DATE(COALESCE(
                (SELECT MIN(es_mp.fecha_evento) FROM {servicios_table} es_mp WHERE es_mp.{servicios_fk} = {alias}.{id_col}),
                {alias}.fecha_evento
            )) THEN 'Durante El Evento'
            ELSE 'Antes Del Evento'
        END
    """


# Saldo pendiente = importe - anticipo - suma de abonos (nunca negativo)
# (idéntico a estadisticas.py — mismo cálculo, misma tabla contratos)
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

# Fecha de pago = fecha_anticipo del contrato si existe; si no fue capturada
# (bastante común: el monto del anticipo se registra pero no siempre su fecha),
# se usa la fecha del primer abono real en contratos_abonos como respaldo, para
# no dejar la columna/​filtro vacíos cuando sí hay un pago registrado.
_FECHA_PAGO_EXPR = """
    COALESCE(
        c.fecha_anticipo,
        (SELECT MIN(ca_fp.fecha) FROM contratos_abonos ca_fp
         WHERE ca_fp.id_contrato = c.id_contrato AND ca_fp.active = 1)
    )
""".strip()

# Cobrado = anticipo + suma de abonos (dinero realmente recibido de ese
# contrato a la fecha, sin restar nada) — usado en los desgloses del tab Pagos
# (por tipo/ciudad/paquete/usuario), que muestran importe cobrado en vez de
# conteo de eventos.
_COBRADO_EXPR = """
    (
        COALESCE(CAST(NULLIF(TRIM(c.importe_anticipo), '') AS DECIMAL(12,2)), 0)
        + COALESCE((
            SELECT SUM(CAST(ca_sub.importe AS DECIMAL(12,2)))
            FROM contratos_abonos ca_sub
            WHERE ca_sub.id_contrato = c.id_contrato AND ca_sub.active = 1
          ), 0)
    )
""".strip()


# ─────────────────────────────────────────────────────────────────────────────
# GET /informes/catalogos
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/catalogos")
def get_catalogos(
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
) -> Dict[str, Any]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            _cf = " AND id_cliente = %s" if tenant_id is not None else ""
            _tp = (tenant_id,) if tenant_id is not None else ()

            cur.execute(
                f"""
                SELECT DISTINCT cliente_nombre AS nombre FROM contratos
                WHERE active = 1 AND cliente_nombre IS NOT NULL AND cliente_nombre <> ''{_cf}
                UNION
                SELECT DISTINCT cliente_nombre AS nombre FROM cotizaciones
                WHERE active = 1 AND cliente_nombre IS NOT NULL AND cliente_nombre <> ''{_cf}
                ORDER BY nombre ASC
                """,
                _tp + _tp,
            )
            clientes = [r["nombre"] for r in cur.fetchall()]

            cur.execute(
                f"""
                SELECT CONCAT(nombre, ' ', apellido) AS nombre FROM trabajadores
                WHERE active = 1{_cf}
                ORDER BY nombre ASC
                """,
                _tp,
            )
            trabajadores = [r["nombre"] for r in cur.fetchall()]

            cur.execute(
                f"SELECT nombre FROM tipo_eventos WHERE active = 1{_cf} ORDER BY nombre ASC",
                _tp,
            )
            tipos_evento = [r["nombre"] for r in cur.fetchall()]

            cur.execute(
                f"SELECT nombre FROM ciudades WHERE active = 1{_cf} ORDER BY nombre ASC",
                _tp,
            )
            ciudades = [r["nombre"] for r in cur.fetchall()]

            cur.execute(
                f"SELECT nombre FROM tipo_gastos WHERE active = 1{_cf} ORDER BY nombre ASC",
                _tp,
            )
            tipos_gasto = [r["nombre"] for r in cur.fetchall()]

            cur.execute(
                f"SELECT nombre FROM puestos WHERE active = 1{_cf} ORDER BY nombre ASC",
                _tp,
            )
            puestos = [r["nombre"] for r in cur.fetchall()]

            # Catálogo global (no está segmentado por id_cliente)
            cur.execute("SELECT id_servicio, nombre FROM servicios WHERE active = 1 ORDER BY nombre ASC")
            servicios_rows = cur.fetchall()
            servicios = [r["nombre"] for r in servicios_rows]

            # Paquetes por servicio: cada servicio tiene su propia tabla de
            # paquetes (paquetes_sonido, paquetes_fotografia, etc.) — se arma un
            # catálogo global (para cuando no hay servicio seleccionado) y uno
            # agrupado por servicio (para filtrar el select de paquetes según el
            # servicio elegido, igual que autoridades_por_tipo en el módulo legal).
            # El mismo nombre de paquete puede repetirse entre servicios (o por
            # variaciones al capturar los datos), así que cada opción se etiqueta
            # como "Nombre - Servicio" para distinguir a cuál pertenece.
            paquetes_por_servicio: Dict[str, List[str]] = {}
            paquetes_set = set()
            for r in servicios_rows:
                tbl = _PAQUETE_TABLES.get(r["id_servicio"])
                if not tbl:
                    continue
                table, _pk = tbl
                cur.execute(f"SELECT nombre FROM `{table}` WHERE active = 1 ORDER BY nombre ASC")
                etiquetas = [f"{row['nombre']} - {r['nombre']}" for row in cur.fetchall()]
                paquetes_por_servicio[r["nombre"]] = etiquetas
                paquetes_set.update(etiquetas)
            paquetes = sorted(paquetes_set)

            cur.execute(
                f"""
                SELECT DISTINCT celular AS v FROM contratos
                WHERE active = 1 AND celular IS NOT NULL AND celular <> ''{_cf}
                UNION
                SELECT DISTINCT celular AS v FROM cotizaciones
                WHERE active = 1 AND celular IS NOT NULL AND celular <> ''{_cf}
                ORDER BY v ASC
                """,
                _tp + _tp,
            )
            telefonos = [r["v"] for r in cur.fetchall()]

            cur.execute(
                f"""
                SELECT DISTINCT lugar_evento AS v FROM contratos
                WHERE active = 1 AND lugar_evento IS NOT NULL AND lugar_evento <> ''{_cf}
                UNION
                SELECT DISTINCT lugar_evento AS v FROM cotizaciones
                WHERE active = 1 AND lugar_evento IS NOT NULL AND lugar_evento <> ''{_cf}
                ORDER BY v ASC
                """,
                _tp + _tp,
            )
            lugares = [r["v"] for r in cur.fetchall()]

            cur.execute(
                f"""
                SELECT DISTINCT u.name AS nombre FROM contratos c
                JOIN users u ON u.id_user = c.id_user
                WHERE c.active = 1{" AND c.id_cliente = %s" if tenant_id is not None else ""}
                UNION
                SELECT DISTINCT u.name AS nombre FROM cotizaciones q
                JOIN users u ON u.id_user = q.id_user
                WHERE q.active = 1{" AND q.id_cliente = %s" if tenant_id is not None else ""}
                UNION
                SELECT DISTINCT u.name AS nombre FROM gastos g
                JOIN users u ON u.id_user = g.id_user
                WHERE g.active_sistema = 1{" AND g.id_cliente = %s" if tenant_id is not None else ""}
                ORDER BY nombre ASC
                """,
                _tp + _tp + _tp,
            )
            usuarios = [r["nombre"] for r in cur.fetchall()]

        return {
            "clientes": clientes,
            "trabajadores": trabajadores,
            "tipos_evento": tipos_evento,
            "ciudades": ciudades,
            "tipos_gasto": tipos_gasto,
            "puestos": puestos,
            "servicios": servicios,
            "paquetes": paquetes,
            "paquetes_por_servicio": paquetes_por_servicio,
            "telefonos": telefonos,
            "lugares": lugares,
            "usuarios": usuarios,
            "estados_cotizacion": ["pendiente", "aceptada", "rechazada"],
            "momentos_pago": ["Al Inicio Del Contrato", "Antes Del Evento", "Durante El Evento"],
        }
    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# Schema de filtros
# ─────────────────────────────────────────────────────────────────────────────
class FiltrosTabla(BaseModel):
    tipo: str = "eventos-activos"
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    fecha_contrato_inicio: Optional[str] = None
    fecha_contrato_fin: Optional[str] = None
    registro_inicio: Optional[str] = None
    registro_fin: Optional[str] = None
    pago_inicio: Optional[str] = None
    pago_fin: Optional[str] = None
    clientes: Optional[List[str]] = None
    trabajadores: Optional[List[str]] = None
    tipos_evento: Optional[List[str]] = None
    ciudades: Optional[List[str]] = None
    estados: Optional[List[str]] = None
    tipos_gasto: Optional[List[str]] = None
    puestos: Optional[List[str]] = None
    servicios: Optional[List[str]] = None
    paquetes: Optional[List[str]] = None
    momentos_pago: Optional[List[str]] = None
    telefonos: Optional[List[str]] = None
    lugares: Optional[List[str]] = None
    usuarios: Optional[List[str]] = None
    cliente_query: Optional[str] = None
    lugar_query: Optional[str] = None
    limit: int = 500
    offset: int = 0


# ─────────────────────────────────────────────────────────────────────────────
# POST /informes/tabla
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/tabla")
def get_tabla(
    body: FiltrosTabla,
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
) -> Dict[str, Any]:

    tipo         = body.tipo
    fi           = body.fecha_inicio
    ff           = body.fecha_fin
    fci          = body.fecha_contrato_inicio
    fcf          = body.fecha_contrato_fin
    ri           = body.registro_inicio
    rf           = body.registro_fin
    pi           = body.pago_inicio
    pf           = body.pago_fin
    clientes     = [c for c in (body.clientes or []) if c]
    trabajadores = [t for t in (body.trabajadores or []) if t]
    tipos_evento = [t for t in (body.tipos_evento or []) if t]
    ciudades     = [c for c in (body.ciudades or []) if c]
    estados      = [e for e in (body.estados or []) if e]
    tipos_gasto  = [t for t in (body.tipos_gasto or []) if t]
    puestos      = [p for p in (body.puestos or []) if p]
    servicios    = [s for s in (body.servicios or []) if s]
    paquetes     = [p for p in (body.paquetes or []) if p]
    momentos_pago = [m for m in (body.momentos_pago or []) if m]
    telefonos    = [t for t in (body.telefonos or []) if t]
    lugares      = [l for l in (body.lugares or []) if l]
    usuarios     = [u for u in (body.usuarios or []) if u]
    cq           = (body.cliente_query or "").strip()
    lq           = (body.lugar_query or "").strip()

    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:

            if tipo == "eventos-activos":
                rows = _query_eventos(cur, fi, ff, fci, fcf, ri, rf, clientes, trabajadores, tipos_evento, ciudades, servicios, paquetes, momentos_pago, telefonos, lugares, usuarios, True, tenant_id, body.limit, body.offset)

            elif tipo == "eventos-realizados":
                rows = _query_eventos(cur, fi, ff, fci, fcf, ri, rf, clientes, trabajadores, tipos_evento, ciudades, servicios, paquetes, momentos_pago, telefonos, lugares, usuarios, False, tenant_id, body.limit, body.offset)

            elif tipo == "cotizaciones":
                rows = _query_cotizaciones(cur, fi, ff, fci, fcf, ri, rf, clientes, tipos_evento, ciudades, estados, servicios, paquetes, momentos_pago, telefonos, lugares, usuarios, tenant_id, body.limit, body.offset)

            elif tipo == "contratos":
                rows = _query_contratos_pagos(cur, fi, ff, fci, fcf, ri, rf, pi, pf, clientes, ciudades, servicios, paquetes, momentos_pago, telefonos, lugares, usuarios, tenant_id, body.limit, body.offset)
                for r in rows:
                    saldo   = float(r.get("saldo_pendiente") or 0)
                    cobrado = float(r.get("anticipo") or 0) + float(r.get("abonos") or 0)
                    r["estado_pago"] = "Pagado" if saldo <= 0 else ("Parcial" if cobrado > 0 else "Pendiente")

            elif tipo == "resumen-servicios":
                rows = _query_resumen_servicios(cur, fi, ff, fci, fcf, ri, rf, ciudades, servicios, paquetes, telefonos, usuarios, cq, lq, tenant_id, body.limit, body.offset)

            elif tipo == "resumen-trabajadores":
                rows = _query_resumen_trabajadores(cur, fi, ff, ri, rf, telefonos, cq, lq, trabajadores, ciudades, puestos, usuarios, tenant_id, body.limit, body.offset)

            elif tipo == "gastos":
                rows = _query_gastos(cur, fi, ff, ri, rf, tipos_gasto, usuarios, tenant_id, body.limit, body.offset)

            else:
                rows = []

            return {"items": [_row(r) for r in rows], "total": len(rows)}

    finally:
        conn.close()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers de consulta
# ─────────────────────────────────────────────────────────────────────────────

def _query_eventos(cur, fi, ff, fci, fcf, ri, rf, clientes, trabajadores, tipos_evento, ciudades, servicios, paquetes, momentos_pago, telefonos, lugares, usuarios, activos, tenant_id, limit, offset):
    where: List[str] = ["c.active = 1"]
    params: List[Any] = []

    if tenant_id is not None:
        where.append("c.id_cliente = %s"); params.append(tenant_id)
    if usuarios:
        where.append(f"""EXISTS (
            SELECT 1 FROM users u9 WHERE u9.id_user = c.id_user AND u9.name IN {_in_ph(usuarios)}
        )""")
        params.extend(usuarios)
    if fci:
        where.append("DATE(c.fecha_creacion_contrato) >= %s"); params.append(fci)
    if fcf:
        where.append("DATE(c.fecha_creacion_contrato) <= %s"); params.append(fcf)
    if ri:
        where.append("DATE(c.datetime) >= %s"); params.append(ri)
    if rf:
        where.append("DATE(c.datetime) <= %s"); params.append(rf)
    if clientes:
        where.append(f"c.cliente_nombre IN {_in_ph(clientes)}"); params.extend(clientes)
    if tipos_evento:
        where.append(f"te.nombre IN {_in_ph(tipos_evento)}"); params.extend(tipos_evento)
    if ciudades:
        where.append(f"ci.nombre IN {_in_ph(ciudades)}"); params.extend(ciudades)
    if telefonos:
        where.append(f"c.celular IN {_in_ph(telefonos)}"); params.extend(telefonos)
    if lugares:
        where.append(f"c.lugar_evento IN {_in_ph(lugares)}"); params.extend(lugares)
    if trabajadores:
        where.append(f"""EXISTS (
            SELECT 1 FROM contratos_trabajadores ct3
            JOIN trabajadores t3 ON t3.id_trabajador = ct3.id_trabajador
            WHERE ct3.id_contrato = c.id_contrato AND ct3.active = 1
            AND CONCAT(t3.nombre, ' ', t3.apellido) IN {_in_ph(trabajadores)}
        )""")
        params.extend(trabajadores)
    if paquetes:
        cond, p = _build_paquete_condition(paquetes, "eventos_servicios", "id_evento", "c.id_contrato", "9")
        where.append(cond)
        params.extend(p)
    if momentos_pago:
        mp_expr = _momento_pago_expr("c", "id_contrato", "eventos_servicios", "id_evento")
        where.append(f"({mp_expr}) IN {_in_ph(momentos_pago)}")
        params.extend(momentos_pago)

    # Fecha de referencia para el rango de fechas y para "próximo"/"realizado":
    # por defecto la del contrato (c.fecha_evento). Pero cada servicio contratado
    # (Sonido, Fotografía, Barra, etc.) puede tener su PROPIA fecha en
    # eventos_servicios, distinta a la del contrato general (ej. Barra el
    # 30/jun/2026 mientras Sonido/Fotografía quedaron para el 16/oct/2027) — así
    # que si se filtra por servicio(s), el rango de fechas y la clasificación
    # activo/realizado se evalúan contra la fecha de ESE/ESOS servicio(s), no
    # contra la fecha genérica del contrato.
    if servicios:
        svc_ph  = _in_ph(servicios)
        cmp_op  = ">=" if activos else "<"
        agg     = "MIN" if activos else "MAX"

        exists_conds = [f"DATE(es3.fecha_evento) {cmp_op} CURDATE()"]
        exists_params: List[Any] = list(servicios)
        if fi:
            exists_conds.append("DATE(es3.fecha_evento) >= %s"); exists_params.append(fi)
        if ff:
            exists_conds.append("DATE(es3.fecha_evento) <= %s"); exists_params.append(ff)
        where.append(f"""EXISTS (
            SELECT 1 FROM eventos_servicios es3
            JOIN servicios sv3 ON sv3.id_servicio = es3.id_servicio
            WHERE es3.id_evento = c.id_contrato AND sv3.nombre IN {svc_ph}
            AND {" AND ".join(exists_conds)}
        )""")
        params.extend(exists_params)

        fecha_expr = f"""COALESCE(
            (SELECT {agg}(es6.fecha_evento) FROM eventos_servicios es6
             JOIN servicios sv6 ON sv6.id_servicio = es6.id_servicio
             WHERE es6.id_evento = c.id_contrato AND sv6.nombre IN {svc_ph}
             AND DATE(es6.fecha_evento) {cmp_op} CURDATE()),
            c.fecha_evento
        )"""
        fecha_expr_params: List[Any] = list(servicios)
    else:
        if fi:
            where.append("DATE(c.fecha_evento) >= %s"); params.append(fi)
        if ff:
            where.append("DATE(c.fecha_evento) <= %s"); params.append(ff)
        where.append("DATE(c.fecha_evento) >= CURDATE()" if activos else "DATE(c.fecha_evento) < CURDATE()")
        fecha_expr = "c.fecha_evento"
        fecha_expr_params = []

    where_sql = "WHERE " + " AND ".join(where)

    cur.execute(
        f"""
        SELECT
            c.id_contrato    AS id,
            c.code           AS folio,
            c.cliente_nombre AS cliente,
            COALESCE(te.nombre, 'Sin tipo') AS tipo_evento,
            {fecha_expr}     AS fecha_evento,
            c.fecha_creacion_contrato AS fecha_contrato,
            c.lugar_evento   AS lugar,
            COALESCE(ci.nombre, '') AS ciudad,
            (SELECT GROUP_CONCAT(DISTINCT CONCAT(t2.nombre, ' ', t2.apellido) ORDER BY t2.nombre SEPARATOR ', ')
             FROM contratos_trabajadores ct2
             JOIN trabajadores t2 ON t2.id_trabajador = ct2.id_trabajador
             WHERE ct2.id_contrato = c.id_contrato AND ct2.active = 1) AS trabajadores,
            (SELECT GROUP_CONCAT(DISTINCT {_paquete_nombre_expr("10")} ORDER BY es10.id_servicio SEPARATOR ', ')
             FROM eventos_servicios es10
             {_paquete_join("es10", "10")}
             WHERE es10.id_evento = c.id_contrato) AS paquetes,
            COALESCE(CAST(NULLIF(TRIM(c.importe), '') AS DECIMAL(12,2)), 0) AS importe,
            COALESCE(CAST(NULLIF(TRIM(c.importe_anticipo), '') AS DECIMAL(12,2)), 0) AS anticipo,
            ({_SALDO_EXPR}) AS saldo_pendiente,
            ({_momento_pago_expr("c", "id_contrato", "eventos_servicios", "id_evento")}) AS momento_pago,
            c.celular        AS telefono,
            c.datetime       AS fecha_registro
        FROM contratos c
        LEFT JOIN tipo_eventos te ON te.id_tipo_evento = c.id_tipo_evento
        LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
        {where_sql}
        ORDER BY fecha_evento {"ASC" if activos else "DESC"}
        LIMIT %s OFFSET %s
        """,
        [*fecha_expr_params, *params, limit, offset],
    )
    return cur.fetchall()


def _query_cotizaciones(cur, fi, ff, fci, fcf, ri, rf, clientes, tipos_evento, ciudades, estados, servicios, paquetes, momentos_pago, telefonos, lugares, usuarios, tenant_id, limit, offset):
    where: List[str] = ["q.active = 1"]
    params: List[Any] = []

    if tenant_id is not None:
        where.append("q.id_cliente = %s"); params.append(tenant_id)
    if usuarios:
        where.append(f"""EXISTS (
            SELECT 1 FROM users u9 WHERE u9.id_user = q.id_user AND u9.name IN {_in_ph(usuarios)}
        )""")
        params.extend(usuarios)
    if fi:
        where.append("DATE(q.fecha_evento) >= %s"); params.append(fi)
    if ff:
        where.append("DATE(q.fecha_evento) <= %s"); params.append(ff)
    if fci:
        where.append("DATE(q.fecha_creacion_contrato) >= %s"); params.append(fci)
    if fcf:
        where.append("DATE(q.fecha_creacion_contrato) <= %s"); params.append(fcf)
    if ri:
        where.append("DATE(q.datetime) >= %s"); params.append(ri)
    if rf:
        where.append("DATE(q.datetime) <= %s"); params.append(rf)
    if clientes:
        where.append(f"q.cliente_nombre IN {_in_ph(clientes)}"); params.extend(clientes)
    if tipos_evento:
        where.append(f"te.nombre IN {_in_ph(tipos_evento)}"); params.extend(tipos_evento)
    if ciudades:
        where.append(f"ci.nombre IN {_in_ph(ciudades)}"); params.extend(ciudades)
    if telefonos:
        where.append(f"q.celular IN {_in_ph(telefonos)}"); params.extend(telefonos)
    if lugares:
        where.append(f"q.lugar_evento IN {_in_ph(lugares)}"); params.extend(lugares)
    if estados:
        where.append(f"q.estado IN {_in_ph(estados)}"); params.extend(estados)
    if servicios:
        where.append(f"""EXISTS (
            SELECT 1 FROM cotizaciones_servicios cs3
            JOIN servicios sv3 ON sv3.id_servicio = cs3.id_servicio
            WHERE cs3.id_cotizacion = q.id_cotizacion AND sv3.nombre IN {_in_ph(servicios)}
        )""")
        params.extend(servicios)
    if paquetes:
        cond, p = _build_paquete_condition(paquetes, "cotizaciones_servicios", "id_cotizacion", "q.id_cotizacion", "cq9")
        where.append(cond)
        params.extend(p)
    if momentos_pago:
        mp_expr = _momento_pago_expr("q", "id_cotizacion", "cotizaciones_servicios", "id_cotizacion")
        where.append(f"({mp_expr}) IN {_in_ph(momentos_pago)}")
        params.extend(momentos_pago)

    where_sql = "WHERE " + " AND ".join(where)

    cur.execute(
        f"""
        SELECT
            q.id_cotizacion  AS id,
            q.folio          AS folio,
            q.cliente_nombre AS cliente,
            COALESCE(te.nombre, 'Sin tipo') AS tipo_evento,
            q.fecha_evento   AS fecha_evento,
            COALESCE(ci.nombre, '') AS ciudad,
            COALESCE(CAST(NULLIF(TRIM(q.importe), '') AS DECIMAL(12,2)), 0) AS importe,
            q.estado         AS estado,
            q.datetime       AS fecha_creacion,
            ({_momento_pago_expr("q", "id_cotizacion", "cotizaciones_servicios", "id_cotizacion")}) AS momento_pago,
            q.celular        AS telefono
        FROM cotizaciones q
        LEFT JOIN tipo_eventos te ON te.id_tipo_evento = q.id_tipo_evento
        LEFT JOIN ciudades ci ON ci.id_ciudad = q.id_ciudad
        {where_sql}
        ORDER BY q.fecha_evento DESC
        LIMIT %s OFFSET %s
        """,
        [*params, limit, offset],
    )
    return cur.fetchall()


def _query_contratos_pagos(cur, fi, ff, fci, fcf, ri, rf, pi, pf, clientes, ciudades, servicios, paquetes, momentos_pago, telefonos, lugares, usuarios, tenant_id, limit, offset):
    where: List[str] = ["c.active = 1"]
    params: List[Any] = []

    if tenant_id is not None:
        where.append("c.id_cliente = %s"); params.append(tenant_id)
    if usuarios:
        where.append(f"""EXISTS (
            SELECT 1 FROM users u9 WHERE u9.id_user = c.id_user AND u9.name IN {_in_ph(usuarios)}
        )""")
        params.extend(usuarios)
    if fi:
        where.append("DATE(c.fecha_evento) >= %s"); params.append(fi)
    if ff:
        where.append("DATE(c.fecha_evento) <= %s"); params.append(ff)
    if fci:
        where.append("DATE(c.fecha_creacion_contrato) >= %s"); params.append(fci)
    if fcf:
        where.append("DATE(c.fecha_creacion_contrato) <= %s"); params.append(fcf)
    if ri:
        where.append("DATE(c.datetime) >= %s"); params.append(ri)
    if rf:
        where.append("DATE(c.datetime) <= %s"); params.append(rf)
    if pi:
        where.append(f"({_FECHA_PAGO_EXPR}) IS NOT NULL AND DATE({_FECHA_PAGO_EXPR}) >= %s"); params.append(pi)
    if pf:
        where.append(f"({_FECHA_PAGO_EXPR}) IS NOT NULL AND DATE({_FECHA_PAGO_EXPR}) <= %s"); params.append(pf)
    if clientes:
        where.append(f"c.cliente_nombre IN {_in_ph(clientes)}"); params.extend(clientes)
    if ciudades:
        where.append(f"ci.nombre IN {_in_ph(ciudades)}"); params.extend(ciudades)
    if telefonos:
        where.append(f"c.celular IN {_in_ph(telefonos)}"); params.extend(telefonos)
    if lugares:
        where.append(f"c.lugar_evento IN {_in_ph(lugares)}"); params.extend(lugares)
    if servicios:
        where.append(f"""EXISTS (
            SELECT 1 FROM eventos_servicios es3
            JOIN servicios sv3 ON sv3.id_servicio = es3.id_servicio
            WHERE es3.id_evento = c.id_contrato AND sv3.nombre IN {_in_ph(servicios)}
        )""")
        params.extend(servicios)
    if paquetes:
        cond, p = _build_paquete_condition(paquetes, "eventos_servicios", "id_evento", "c.id_contrato", "9")
        where.append(cond)
        params.extend(p)
    if momentos_pago:
        mp_expr = _momento_pago_expr("c", "id_contrato", "eventos_servicios", "id_evento")
        where.append(f"({mp_expr}) IN {_in_ph(momentos_pago)}")
        params.extend(momentos_pago)

    where_sql = "WHERE " + " AND ".join(where)

    cur.execute(
        f"""
        SELECT
            c.id_contrato    AS id,
            c.code           AS folio,
            c.cliente_nombre AS cliente,
            c.fecha_evento   AS fecha_evento,
            COALESCE(CAST(NULLIF(TRIM(c.importe), '') AS DECIMAL(12,2)), 0) AS importe,
            COALESCE(CAST(NULLIF(TRIM(c.importe_anticipo), '') AS DECIMAL(12,2)), 0) AS anticipo,
            COALESCE((
                SELECT SUM(CAST(ca_sub.importe AS DECIMAL(12,2)))
                FROM contratos_abonos ca_sub
                WHERE ca_sub.id_contrato = c.id_contrato AND ca_sub.active = 1
            ), 0) AS abonos,
            ({_SALDO_EXPR}) AS saldo_pendiente,
            ({_momento_pago_expr("c", "id_contrato", "eventos_servicios", "id_evento")}) AS momento_pago,
            c.celular        AS telefono,
            c.datetime       AS fecha_registro,
            ({_FECHA_PAGO_EXPR}) AS fecha_pago,
            c.lugar_evento   AS lugar
        FROM contratos c
        LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
        {where_sql}
        ORDER BY saldo_pendiente DESC, c.fecha_evento DESC
        LIMIT %s OFFSET %s
        """,
        [*params, limit, offset],
    )
    return cur.fetchall()


def _query_resumen_servicios(cur, fi, ff, fci, fcf, ri, rf, ciudades, servicios, paquetes, telefonos, usuarios, cq, lq, tenant_id, limit, offset):
    # Cada servicio (Sonido, Fotografía, Barra, etc.) tiene su PROPIA fecha en
    # eventos_servicios (es.fecha_evento), distinta a la del contrato general —
    # el rango de fechas y la clasificación activo/realizado se evalúan contra
    # esa fecha propia del servicio, igual que en _query_eventos.
    where: List[str] = ["c.active = 1"]
    params: List[Any] = []

    if tenant_id is not None:
        where.append("c.id_cliente = %s"); params.append(tenant_id)
    if usuarios:
        where.append(f"""EXISTS (
            SELECT 1 FROM users u9 WHERE u9.id_user = c.id_user AND u9.name IN {_in_ph(usuarios)}
        )""")
        params.extend(usuarios)
    if fi:
        where.append("DATE(es.fecha_evento) >= %s"); params.append(fi)
    if ff:
        where.append("DATE(es.fecha_evento) <= %s"); params.append(ff)
    if fci:
        where.append("DATE(c.fecha_creacion_contrato) >= %s"); params.append(fci)
    if fcf:
        where.append("DATE(c.fecha_creacion_contrato) <= %s"); params.append(fcf)
    if ri:
        where.append("DATE(c.datetime) >= %s"); params.append(ri)
    if rf:
        where.append("DATE(c.datetime) <= %s"); params.append(rf)
    if telefonos:
        where.append(f"c.celular IN {_in_ph(telefonos)}"); params.extend(telefonos)
    if cq:
        where.append("c.cliente_nombre LIKE %s"); params.append(f"%{cq}%")
    if lq:
        where.append("c.lugar_evento LIKE %s"); params.append(f"%{lq}%")
    if ciudades:
        where.append(f"ci.nombre IN {_in_ph(ciudades)}"); params.extend(ciudades)
    if servicios:
        where.append(f"sv.nombre IN {_in_ph(servicios)}"); params.extend(servicios)
    if paquetes:
        reales = [p for p in paquetes if p != _SIN_PAQUETE_LABEL]
        sin_paquete = _SIN_PAQUETE_LABEL in paquetes
        conds: List[str] = []
        if reales:
            conds.append(f"{_paquete_combined_expr('0', 'sv')} IN {_in_ph(reales)}")
            params.extend(reales)
        if sin_paquete:
            conds.append("es.id_paquete IS NULL")
        where.append("(" + " OR ".join(conds) + ")")

    where_sql = "WHERE " + " AND ".join(where)

    cur.execute(
        f"""
        SELECT
            sv.nombre AS servicio,
            COUNT(DISTINCT CASE WHEN DATE(es.fecha_evento) >= CURDATE() THEN es.id_evento END) AS eventos_activos,
            COUNT(DISTINCT CASE WHEN DATE(es.fecha_evento) <  CURDATE() THEN es.id_evento END) AS eventos_realizados,
            COUNT(DISTINCT es.id_evento) AS total_eventos
        FROM eventos_servicios es
        JOIN servicios sv ON sv.id_servicio = es.id_servicio
        JOIN contratos c ON c.id_contrato = es.id_evento
        LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
        {_paquete_join("es", "0")}
        {where_sql}
        GROUP BY sv.id_servicio, sv.nombre
        ORDER BY total_eventos DESC
        LIMIT %s OFFSET %s
        """,
        [*params, limit, offset],
    )
    return cur.fetchall()


def _query_resumen_trabajadores(cur, fi, ff, ri, rf, telefonos, cq, lq, trabajadores, ciudades, puestos, usuarios, tenant_id, limit, offset):
    where: List[str] = ["ct.active = 1", "c.active = 1"]
    params: List[Any] = []

    if tenant_id is not None:
        where.append("t.id_cliente = %s"); params.append(tenant_id)
    if usuarios:
        where.append(f"""EXISTS (
            SELECT 1 FROM users u9 WHERE u9.id_user = c.id_user AND u9.name IN {_in_ph(usuarios)}
        )""")
        params.extend(usuarios)
    if fi:
        where.append("DATE(c.fecha_evento) >= %s"); params.append(fi)
    if ff:
        where.append("DATE(c.fecha_evento) <= %s"); params.append(ff)
    if ri:
        where.append("DATE(ct.datetime) >= %s"); params.append(ri)
    if rf:
        where.append("DATE(ct.datetime) <= %s"); params.append(rf)
    if telefonos:
        where.append(f"c.celular IN {_in_ph(telefonos)}"); params.extend(telefonos)
    if cq:
        where.append("c.cliente_nombre LIKE %s"); params.append(f"%{cq}%")
    if lq:
        where.append("c.lugar_evento LIKE %s"); params.append(f"%{lq}%")
    if trabajadores:
        where.append(f"CONCAT(t.nombre, ' ', t.apellido) IN {_in_ph(trabajadores)}"); params.extend(trabajadores)
    if ciudades:
        where.append(f"ci.nombre IN {_in_ph(ciudades)}"); params.extend(ciudades)
    if puestos:
        where.append(f"p.nombre IN {_in_ph(puestos)}"); params.extend(puestos)

    where_sql = "WHERE " + " AND ".join(where)

    cur.execute(
        f"""
        SELECT
            CONCAT(t.nombre, ' ', t.apellido) AS trabajador,
            GROUP_CONCAT(DISTINCT COALESCE(p.nombre, 'Sin puesto') ORDER BY p.nombre SEPARATOR ', ') AS puesto,
            COUNT(DISTINCT CASE WHEN DATE(c.fecha_evento) >= CURDATE() THEN c.id_contrato END) AS eventos_activos,
            COUNT(DISTINCT CASE WHEN DATE(c.fecha_evento) <  CURDATE() THEN c.id_contrato END) AS eventos_realizados,
            COUNT(DISTINCT c.id_contrato) AS total_eventos,
            CASE WHEN MIN(ct.fecha_inicio) IS NULL THEN NULL
                 ELSE CONCAT(DATE_FORMAT(MIN(ct.fecha_inicio), '%d/%m/%Y'), ' - ', DATE_FORMAT(MAX(ct.fecha_final), '%d/%m/%Y'))
            END AS rango_fechas,
            CASE WHEN MIN(ct.hora_inicio) IS NULL THEN NULL
                 ELSE CONCAT(DATE_FORMAT(MIN(ct.hora_inicio), '%H:%i'), ' - ', DATE_FORMAT(MAX(ct.hora_final), '%H:%i'))
            END AS rango_horario
        FROM contratos_trabajadores ct
        JOIN trabajadores t ON t.id_trabajador = ct.id_trabajador
        JOIN contratos c ON c.id_contrato = ct.id_contrato
        LEFT JOIN puestos p ON p.id_puesto = ct.id_puesto
        LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
        {where_sql}
        GROUP BY t.id_trabajador, t.nombre, t.apellido
        ORDER BY total_eventos DESC
        LIMIT %s OFFSET %s
        """,
        [*params, limit, offset],
    )
    return cur.fetchall()


def _query_gastos(cur, fi, ff, ri, rf, tipos_gasto, usuarios, tenant_id, limit, offset):
    where: List[str] = ["g.active_sistema = 1"]
    params: List[Any] = []

    if tenant_id is not None:
        where.append("g.id_cliente = %s"); params.append(tenant_id)
    if fi:
        where.append("g.fecha >= %s"); params.append(fi)
    if ff:
        where.append("g.fecha <= %s"); params.append(ff)
    if ri:
        where.append("DATE(g.datetime) >= %s"); params.append(ri)
    if rf:
        where.append("DATE(g.datetime) <= %s"); params.append(rf)
    if tipos_gasto:
        where.append(f"tg.nombre IN {_in_ph(tipos_gasto)}"); params.extend(tipos_gasto)
    if usuarios:
        where.append(f"u.name IN {_in_ph(usuarios)}"); params.extend(usuarios)

    where_sql = "WHERE " + " AND ".join(where)

    cur.execute(
        f"""
        SELECT
            g.id_gasto      AS id,
            g.descripcion    AS descripcion,
            COALESCE(tg.nombre, 'Sin tipo') AS tipo_gasto,
            g.monto          AS monto,
            g.fecha          AS fecha,
            u.name           AS usuario
        FROM gastos g
        LEFT JOIN tipo_gastos tg ON tg.id_tipo_gasto = g.id_tipo_gasto
        LEFT JOIN users u ON u.id_user = g.id_user
        {where_sql}
        ORDER BY g.fecha DESC
        LIMIT %s OFFSET %s
        """,
        [*params, limit, offset],
    )
    return cur.fetchall()


# ─────────────────────────────────────────────────────────────────────────────
# POST /informes/graficas
# Panel fijo de gráficas basado en contratos + gastos (independiente del tab activo)
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/graficas")
def get_graficas(
    body: FiltrosTabla,
    current_user: Dict[str, Any] = Depends(get_current_user),
    tenant_id: Optional[int] = Depends(get_tenant_filter),
) -> Dict[str, Any]:
    tipo         = body.tipo
    fi           = body.fecha_inicio
    ff           = body.fecha_fin
    fci          = body.fecha_contrato_inicio
    fcf          = body.fecha_contrato_fin
    ri           = body.registro_inicio
    rf           = body.registro_fin
    pi           = body.pago_inicio
    pf           = body.pago_fin
    clientes     = [c for c in (body.clientes or []) if c]
    trabajadores = [t for t in (body.trabajadores or []) if t]
    ciudades     = [c for c in (body.ciudades or []) if c]
    servicios    = [s for s in (body.servicios or []) if s]
    tipos_evento = [t for t in (body.tipos_evento or []) if t]
    paquetes     = [p for p in (body.paquetes or []) if p]
    momentos_pago = [m for m in (body.momentos_pago or []) if m]
    telefonos    = [t for t in (body.telefonos or []) if t]
    lugares      = [l for l in (body.lugares or []) if l]
    usuarios     = [u for u in (body.usuarios or []) if u]
    tipos_gasto  = [t for t in (body.tipos_gasto or []) if t]
    puestos      = [p for p in (body.puestos or []) if p]

    def _cotizaciones_where():
        w: List[str] = ["q.active = 1"]
        p: List[Any] = []
        if tenant_id is not None:
            w.append("q.id_cliente = %s"); p.append(tenant_id)
        if fi:
            w.append("DATE(q.fecha_evento) >= %s"); p.append(fi)
        if ff:
            w.append("DATE(q.fecha_evento) <= %s"); p.append(ff)
        if clientes:
            w.append(f"q.cliente_nombre IN {_in_ph(clientes)}"); p.extend(clientes)
        if tipos_evento:
            w.append(f"te.nombre IN {_in_ph(tipos_evento)}"); p.extend(tipos_evento)
        if ciudades:
            w.append(f"ci.nombre IN {_in_ph(ciudades)}"); p.extend(ciudades)
        if usuarios:
            w.append(f"""EXISTS (
                SELECT 1 FROM users u9 WHERE u9.id_user = q.id_user AND u9.name IN {_in_ph(usuarios)}
            )""")
            p.extend(usuarios)
        if servicios:
            w.append(f"""EXISTS (
                SELECT 1 FROM cotizaciones_servicios cs4
                JOIN servicios sv4 ON sv4.id_servicio = cs4.id_servicio
                WHERE cs4.id_cotizacion = q.id_cotizacion AND sv4.nombre IN {_in_ph(servicios)}
            )""")
            p.extend(servicios)
        return w, p

    def _contratos_where():
        w: List[str] = ["c.active = 1"]
        p: List[Any] = []
        if tenant_id is not None:
            w.append("c.id_cliente = %s"); p.append(tenant_id)
        if fi:
            w.append("DATE(c.fecha_evento) >= %s"); p.append(fi)
        if ff:
            w.append("DATE(c.fecha_evento) <= %s"); p.append(ff)
        if clientes:
            w.append(f"c.cliente_nombre IN {_in_ph(clientes)}"); p.extend(clientes)
        if ciudades:
            w.append(f"ci.nombre IN {_in_ph(ciudades)}"); p.extend(ciudades)
        if usuarios:
            w.append(f"""EXISTS (
                SELECT 1 FROM users u9 WHERE u9.id_user = c.id_user AND u9.name IN {_in_ph(usuarios)}
            )""")
            p.extend(usuarios)
        if servicios:
            w.append(f"""EXISTS (
                SELECT 1 FROM eventos_servicios es4
                JOIN servicios sv4 ON sv4.id_servicio = es4.id_servicio
                WHERE es4.id_evento = c.id_contrato AND sv4.nombre IN {_in_ph(servicios)}
            )""")
            p.extend(servicios)
        return w, p

    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:

            is_cotizaciones = tipo == "cotizaciones"

            if is_cotizaciones:
                w, p = _cotizaciones_where()
            else:
                w, p = _contratos_where()
            where_sql = "WHERE " + " AND ".join(w)

            if is_cotizaciones:
                cur.execute(f"""
                    SELECT COALESCE(te.nombre, 'Sin tipo') AS tipo, COUNT(*) AS total
                    FROM cotizaciones q
                    LEFT JOIN tipo_eventos te ON te.id_tipo_evento = q.id_tipo_evento
                    LEFT JOIN ciudades ci ON ci.id_ciudad = q.id_ciudad
                    {where_sql}
                    GROUP BY tipo ORDER BY total DESC
                """, p)
            elif tipo == "contratos":
                # Pagos: importe cobrado por tipo de evento, no conteo.
                cur.execute(f"""
                    SELECT COALESCE(te.nombre, 'Sin tipo') AS tipo, COALESCE(SUM({_COBRADO_EXPR}), 0) AS total
                    FROM contratos c
                    LEFT JOIN tipo_eventos te ON te.id_tipo_evento = c.id_tipo_evento
                    LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                    {where_sql}
                    GROUP BY tipo ORDER BY total DESC
                """, p)
            else:
                cur.execute(f"""
                    SELECT COALESCE(te.nombre, 'Sin tipo') AS tipo, COUNT(*) AS total
                    FROM contratos c
                    LEFT JOIN tipo_eventos te ON te.id_tipo_evento = c.id_tipo_evento
                    LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                    {where_sql}
                    GROUP BY tipo ORDER BY total DESC
                """, p)
            por_tipo_evento = cur.fetchall()

            if is_cotizaciones:
                cur.execute(f"""
                    SELECT COALESCE(ci.nombre, 'Sin ciudad') AS ciudad, COUNT(*) AS total
                    FROM cotizaciones q
                    LEFT JOIN tipo_eventos te ON te.id_tipo_evento = q.id_tipo_evento
                    LEFT JOIN ciudades ci ON ci.id_ciudad = q.id_ciudad
                    {where_sql}
                    GROUP BY ciudad ORDER BY total DESC LIMIT 10
                """, p)
            elif tipo == "contratos":
                # Pagos: importe cobrado por ciudad, no conteo.
                cur.execute(f"""
                    SELECT COALESCE(ci.nombre, 'Sin ciudad') AS ciudad, COALESCE(SUM({_COBRADO_EXPR}), 0) AS total
                    FROM contratos c
                    LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                    {where_sql}
                    GROUP BY ciudad ORDER BY total DESC LIMIT 10
                """, p)
            else:
                cur.execute(f"""
                    SELECT COALESCE(ci.nombre, 'Sin ciudad') AS ciudad, COUNT(*) AS total
                    FROM contratos c
                    LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                    {where_sql}
                    GROUP BY ciudad ORDER BY total DESC LIMIT 10
                """, p)
            por_ciudad = cur.fetchall()

            if is_cotizaciones:
                cur.execute(f"""
                    SELECT q.cliente_nombre AS nombre, COUNT(*) AS total
                    FROM cotizaciones q
                    LEFT JOIN tipo_eventos te ON te.id_tipo_evento = q.id_tipo_evento
                    LEFT JOIN ciudades ci ON ci.id_ciudad = q.id_ciudad
                    {where_sql}
                    GROUP BY q.cliente_nombre ORDER BY total DESC LIMIT 10
                """, p)
            else:
                cur.execute(f"""
                    SELECT c.cliente_nombre AS nombre, COUNT(*) AS total
                    FROM contratos c
                    LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                    {where_sql}
                    GROUP BY c.cliente_nombre ORDER BY total DESC LIMIT 10
                """, p)
            top_clientes = cur.fetchall()

            if is_cotizaciones:
                # Las cotizaciones no muestran desglose por trabajador asignado.
                top_trabajadores = []
            else:
                w2, p2 = _contratos_where()
                if trabajadores:
                    w2.append(f"CONCAT(t.nombre, ' ', t.apellido) IN {_in_ph(trabajadores)}"); p2.extend(trabajadores)
                where_sql2 = "WHERE ct.active = 1 AND " + " AND ".join(w2)

                cur.execute(f"""
                    SELECT CONCAT(t.nombre, ' ', t.apellido) AS nombre, COUNT(DISTINCT c.id_contrato) AS total
                    FROM contratos_trabajadores ct
                    JOIN trabajadores t ON t.id_trabajador = ct.id_trabajador
                    JOIN contratos c ON c.id_contrato = ct.id_contrato
                    LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                    {where_sql2}
                    GROUP BY t.id_trabajador, t.nombre, t.apellido
                    ORDER BY total DESC LIMIT 10
                """, p2)
                top_trabajadores = cur.fetchall()

            if is_cotizaciones:
                cur.execute(f"""
                    SELECT {_paquete_combined_expr('0', 'sv')} AS paquete, COUNT(DISTINCT cs.id_cotizacion) AS total
                    FROM cotizaciones_servicios cs
                    JOIN servicios sv ON sv.id_servicio = cs.id_servicio
                    JOIN cotizaciones q ON q.id_cotizacion = cs.id_cotizacion
                    LEFT JOIN tipo_eventos te ON te.id_tipo_evento = q.id_tipo_evento
                    LEFT JOIN ciudades ci ON ci.id_ciudad = q.id_ciudad
                    {_paquete_join("cs", "0")}
                    {where_sql}
                    AND cs.id_paquete IS NOT NULL
                    GROUP BY paquete
                    ORDER BY total DESC LIMIT 10
                """, p)
            elif tipo == "contratos":
                # Pagos: importe cobrado por paquete contratado, no conteo. El
                # DISTINCT en la subconsulta evita sumar el cobrado del mismo
                # contrato más de una vez si tuviera varias filas para el mismo
                # paquete (mismo criterio de deduplicación que el COUNT DISTINCT
                # de la rama de conteo).
                cur.execute(f"""
                    SELECT paquete, COALESCE(SUM(cobrado), 0) AS total
                    FROM (
                        SELECT DISTINCT es.id_evento, {_paquete_combined_expr('0', 'sv')} AS paquete,
                               {_COBRADO_EXPR} AS cobrado
                        FROM eventos_servicios es
                        JOIN servicios sv ON sv.id_servicio = es.id_servicio
                        JOIN contratos c ON c.id_contrato = es.id_evento
                        LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                        {_paquete_join("es", "0")}
                        {where_sql}
                        AND es.id_paquete IS NOT NULL
                    ) t
                    GROUP BY paquete
                    ORDER BY total DESC LIMIT 10
                """, p)
            else:
                cur.execute(f"""
                    SELECT {_paquete_combined_expr('0', 'sv')} AS paquete, COUNT(DISTINCT es.id_evento) AS total
                    FROM eventos_servicios es
                    JOIN servicios sv ON sv.id_servicio = es.id_servicio
                    JOIN contratos c ON c.id_contrato = es.id_evento
                    LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                    {_paquete_join("es", "0")}
                    {where_sql}
                    AND es.id_paquete IS NOT NULL
                    GROUP BY paquete
                    ORDER BY total DESC LIMIT 10
                """, p)
            por_paquete = cur.fetchall()

            if is_cotizaciones:
                cur.execute(f"""
                    SELECT COALESCE(u.name, 'Sin usuario') AS nombre, COUNT(*) AS total
                    FROM cotizaciones q
                    LEFT JOIN tipo_eventos te ON te.id_tipo_evento = q.id_tipo_evento
                    LEFT JOIN ciudades ci ON ci.id_ciudad = q.id_ciudad
                    LEFT JOIN users u ON u.id_user = q.id_user
                    {where_sql}
                    GROUP BY u.name
                    ORDER BY total DESC LIMIT 10
                """, p)
            elif tipo == "contratos":
                # Pagos: cuántas veces ha subido/registrado un pago cada usuario
                # (un anticipo cuenta como uno, cada abono cuenta como uno) —
                # conteo, no importe, a diferencia de los otros desgloses de
                # este tab. El anticipo se atribuye al usuario dueño del
                # contrato (no hay un id_user propio para el anticipo); cada
                # abono se atribuye a quien lo registró en contratos_abonos.
                cur.execute(f"""
                    SELECT nombre, COUNT(*) AS total
                    FROM (
                        SELECT COALESCE(u.name, 'Sin usuario') AS nombre
                        FROM contratos c
                        LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                        LEFT JOIN users u ON u.id_user = c.id_user
                        {where_sql}
                        AND c.fecha_anticipo IS NOT NULL
                        AND COALESCE(CAST(NULLIF(TRIM(c.importe_anticipo), '') AS DECIMAL(12,2)), 0) > 0
                        UNION ALL
                        SELECT COALESCE(u2.name, 'Sin usuario') AS nombre
                        FROM contratos_abonos ca
                        JOIN contratos c ON c.id_contrato = ca.id_contrato
                        LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                        LEFT JOIN users u2 ON u2.id_user = ca.id_user
                        {where_sql}
                        AND ca.active = 1
                    ) t
                    GROUP BY nombre
                    ORDER BY total DESC LIMIT 10
                """, [*p, *p])
            else:
                cur.execute(f"""
                    SELECT COALESCE(u.name, 'Sin usuario') AS nombre, COUNT(*) AS total
                    FROM contratos c
                    LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                    LEFT JOIN users u ON u.id_user = c.id_user
                    {where_sql}
                    GROUP BY u.name
                    ORDER BY total DESC LIMIT 10
                """, p)
            top_usuarios = cur.fetchall()

            if is_cotizaciones:
                cur.execute(f"""
                    SELECT estados.estado, COALESCE(cnt.total, 0) AS total
                    FROM (
                        SELECT 'Pendiente' AS estado, 1 AS ord
                        UNION ALL SELECT 'Aceptada', 2
                        UNION ALL SELECT 'Rechazada', 3
                    ) estados
                    LEFT JOIN (
                        SELECT
                            CASE
                                WHEN LOWER(q.estado) = 'aceptada'  THEN 'Aceptada'
                                WHEN LOWER(q.estado) = 'rechazada' THEN 'Rechazada'
                                ELSE 'Pendiente'
                            END AS estado,
                            COUNT(*) AS total
                        FROM cotizaciones q
                        LEFT JOIN tipo_eventos te ON te.id_tipo_evento = q.id_tipo_evento
                        LEFT JOIN ciudades ci ON ci.id_ciudad = q.id_ciudad
                        {where_sql}
                        GROUP BY estado
                    ) cnt ON cnt.estado = estados.estado
                    ORDER BY estados.ord
                """, p)
                por_estado = cur.fetchall()
            else:
                cur.execute(f"""
                    SELECT estados.estado, COALESCE(cnt.total, 0) AS total
                    FROM (
                        SELECT 'Pago completado' AS estado, 1 AS ord
                        UNION ALL SELECT 'Pendiente de pago', 2
                        UNION ALL SELECT 'Sin anticipo', 3
                    ) estados
                    LEFT JOIN (
                        SELECT
                            CASE
                                WHEN ({_SALDO_EXPR}) <= 0 THEN 'Pago completado'
                                WHEN COALESCE(CAST(NULLIF(TRIM(c.importe_anticipo), '') AS DECIMAL(12,2)), 0) = 0 THEN 'Sin anticipo'
                                ELSE 'Pendiente de pago'
                            END AS estado,
                            COUNT(*) AS total
                        FROM contratos c
                        LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                        {where_sql}
                        GROUP BY estado
                    ) cnt ON cnt.estado = estados.estado
                    ORDER BY estados.ord
                """, p)
                por_estado = cur.fetchall()

            if is_cotizaciones:
                cur.execute(f"""
                    SELECT sv.nombre AS servicio, COUNT(DISTINCT ev.id_cotizacion) AS total
                    FROM servicios sv
                    LEFT JOIN (
                        SELECT cs.id_servicio, q.id_cotizacion
                        FROM cotizaciones_servicios cs
                        JOIN cotizaciones q ON q.id_cotizacion = cs.id_cotizacion
                        LEFT JOIN tipo_eventos te ON te.id_tipo_evento = q.id_tipo_evento
                        LEFT JOIN ciudades ci ON ci.id_ciudad = q.id_ciudad
                        {where_sql}
                    ) ev ON ev.id_servicio = sv.id_servicio
                    WHERE sv.active = 1
                    GROUP BY sv.id_servicio, sv.nombre
                    ORDER BY total DESC
                """, p)
            else:
                cur.execute(f"""
                    SELECT sv.nombre AS servicio, COUNT(DISTINCT ev.id_contrato) AS total
                    FROM servicios sv
                    LEFT JOIN (
                        SELECT es.id_servicio, c.id_contrato
                        FROM eventos_servicios es
                        JOIN contratos c ON c.id_contrato = es.id_evento
                        LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                        {where_sql}
                    ) ev ON ev.id_servicio = sv.id_servicio
                    WHERE sv.active = 1
                    GROUP BY sv.id_servicio, sv.nombre
                    ORDER BY total DESC
                """, p)
            por_servicio = cur.fetchall()

            if is_cotizaciones:
                # Momento de pago de las cotizaciones: una sola serie (no hay
                # distinción próximos/realizados como en eventos/contratos).
                rows_cotizaciones_mp = _query_cotizaciones(
                    cur, fi, ff, fci, fcf, ri, rf, clientes, tipos_evento,
                    ciudades, [], servicios, paquetes, momentos_pago, telefonos, lugares, usuarios,
                    tenant_id, 100000, 0,
                )
                cnt_cotizaciones = Counter(r["momento_pago"] for r in rows_cotizaciones_mp if r["momento_pago"])
                por_momento_pago = [
                    {"momento_pago": m, "proximos": cnt_cotizaciones.get(m, 0), "realizados": 0}
                    for m in ["Al Inicio Del Contrato", "Antes Del Evento", "Durante El Evento"]
                ]
            else:
                # Momento de pago por tab: se reutiliza _query_eventos (la misma
                # función/filtros que alimenta la tabla de "Eventos Próximos" y
                # "Eventos Realizados") para que el conteo coincida exactamente
                # con lo que se ve en esas tablas, en vez de una agregación aparte.
                rows_activos = _query_eventos(
                    cur, fi, ff, fci, fcf, ri, rf, clientes, trabajadores, tipos_evento,
                    ciudades, servicios, paquetes, momentos_pago, telefonos, lugares, usuarios,
                    True, tenant_id, 100000, 0,
                )
                rows_realizados = _query_eventos(
                    cur, fi, ff, fci, fcf, ri, rf, clientes, trabajadores, tipos_evento,
                    ciudades, servicios, paquetes, momentos_pago, telefonos, lugares, usuarios,
                    False, tenant_id, 100000, 0,
                )
                cnt_activos = Counter(r["momento_pago"] for r in rows_activos if r["momento_pago"])
                cnt_realizados = Counter(r["momento_pago"] for r in rows_realizados if r["momento_pago"])
                por_momento_pago = [
                    {"momento_pago": m, "proximos": cnt_activos.get(m, 0), "realizados": cnt_realizados.get(m, 0)}
                    for m in ["Al Inicio Del Contrato", "Antes Del Evento", "Durante El Evento"]
                ]

            if is_cotizaciones:
                # Las cotizaciones no tienen saldo pendiente (no son un cobro en curso).
                cur.execute(f"""
                    SELECT DATE_FORMAT(q.fecha_evento, '%Y-%m') AS mes_key,
                           DATE_FORMAT(q.fecha_evento, '%b %Y') AS mes_label,
                           COALESCE(SUM(CAST(NULLIF(TRIM(q.importe),'') AS DECIMAL(12,2))), 0) AS importe_total,
                           0 AS saldo_total
                    FROM cotizaciones q
                    LEFT JOIN tipo_eventos te ON te.id_tipo_evento = q.id_tipo_evento
                    LEFT JOIN ciudades ci ON ci.id_ciudad = q.id_ciudad
                    {where_sql}
                    GROUP BY mes_key, mes_label ORDER BY mes_key ASC
                """, p)
                por_mes = _fill_meses(cur.fetchall(), fi, ff, ["importe_total", "saldo_total"])

                cur.execute(f"""
                    SELECT DATE_FORMAT(q.fecha_evento, '%Y-%m') AS mes_key,
                           DATE_FORMAT(q.fecha_evento, '%b %Y') AS mes_label,
                           COUNT(*) AS total
                    FROM cotizaciones q
                    LEFT JOIN tipo_eventos te ON te.id_tipo_evento = q.id_tipo_evento
                    LEFT JOIN ciudades ci ON ci.id_ciudad = q.id_ciudad
                    {where_sql}
                    GROUP BY mes_key, mes_label ORDER BY mes_key ASC
                """, p)
                eventos_por_mes_servicio = _fill_meses(cur.fetchall(), fi, ff, ["total"])

            elif tipo == "contratos":
                # Pagos (tab Pagos): "Ingresos por mes" y el conteo de abajo se
                # basan en la fecha REAL de cada pago (fecha_anticipo del contrato
                # + fecha de cada abono en contratos_abonos) en vez de fecha_evento
                # — mismo criterio de "cobrado" que usa EstadisticasPage. El filtro
                # de fecha de pago (pi/pf) acota los pagos individuales; el resto
                # de filtros (ciudad, servicio, cliente, etc.) siguen acotando
                # sobre el contrato dueño del pago.
                pago_conds: List[str] = []
                pago_params: List[Any] = []
                if pi:
                    pago_conds.append("DATE(fecha_pago) >= %s"); pago_params.append(pi)
                if pf:
                    pago_conds.append("DATE(fecha_pago) <= %s"); pago_params.append(pf)
                pago_where_sql = ("WHERE " + " AND ".join(pago_conds)) if pago_conds else ""

                cur.execute(f"""
                    SELECT id_contrato, cliente_nombre, fecha_pago, importe_pago
                    FROM (
                        SELECT c.id_contrato, c.cliente_nombre,
                               DATE(c.fecha_anticipo) AS fecha_pago,
                               CAST(NULLIF(TRIM(c.importe_anticipo), '') AS DECIMAL(12,2)) AS importe_pago
                        FROM contratos c
                        LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                        {where_sql}
                        AND c.fecha_anticipo IS NOT NULL
                        AND COALESCE(CAST(NULLIF(TRIM(c.importe_anticipo), '') AS DECIMAL(12,2)), 0) > 0
                        UNION ALL
                        SELECT c.id_contrato, c.cliente_nombre,
                               DATE(ca.fecha) AS fecha_pago,
                               CAST(ca.importe AS DECIMAL(12,2)) AS importe_pago
                        FROM contratos_abonos ca
                        JOIN contratos c ON c.id_contrato = ca.id_contrato
                        LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                        {where_sql}
                        AND ca.active = 1
                    ) pagos
                    {pago_where_sql}
                """, [*p, *p, *pago_params])
                pagos_rows = cur.fetchall()

                meses_importe: Dict[str, Dict[str, Any]] = {}
                clientes_por_mes: Dict[str, set] = {}
                for r in pagos_rows:
                    fp = r["fecha_pago"]
                    if not fp:
                        continue
                    mes_key = fp.strftime("%Y-%m")
                    mes_label = fp.strftime("%b %Y")
                    agg = meses_importe.setdefault(mes_key, {
                        "mes_key": mes_key, "mes_label": mes_label,
                        "importe_total": 0.0, "saldo_total": 0,
                    })
                    agg["importe_total"] += float(r["importe_pago"] or 0)
                    clientes_por_mes.setdefault(mes_key, set()).add(r["cliente_nombre"])

                por_mes_raw = [meses_importe[k] for k in sorted(meses_importe)]
                eventos_por_mes_servicio_raw = [
                    {"mes_key": k, "mes_label": meses_importe[k]["mes_label"], "total": len(v)}
                    for k, v in sorted(clientes_por_mes.items())
                ]
                por_mes = _fill_meses(por_mes_raw, pi or fi, pf or ff, ["importe_total", "saldo_total"])
                eventos_por_mes_servicio = _fill_meses(eventos_por_mes_servicio_raw, pi or fi, pf or ff, ["total"])

            else:
                cur.execute(f"""
                    SELECT DATE_FORMAT(c.fecha_evento, '%Y-%m') AS mes_key,
                           DATE_FORMAT(c.fecha_evento, '%b %Y') AS mes_label,
                           COALESCE(SUM(CAST(NULLIF(TRIM(c.importe),'') AS DECIMAL(12,2))), 0) AS importe_total,
                           COALESCE(SUM({_SALDO_EXPR}), 0) AS saldo_total
                    FROM contratos c
                    {where_sql}
                    GROUP BY mes_key, mes_label ORDER BY mes_key ASC
                """, p)
                por_mes = _fill_meses(cur.fetchall(), fi, ff, ["importe_total", "saldo_total"])

                cur.execute(f"""
                    SELECT DATE_FORMAT(c.fecha_evento, '%Y-%m') AS mes_key,
                           DATE_FORMAT(c.fecha_evento, '%b %Y') AS mes_label,
                           COUNT(*) AS total
                    FROM contratos c
                    LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                    {where_sql}
                    GROUP BY mes_key, mes_label ORDER BY mes_key ASC
                """, p)
                eventos_por_mes_servicio = _fill_meses(cur.fetchall(), fi, ff, ["total"])

            if is_cotizaciones:
                cur.execute(f"""
                    SELECT DATE_FORMAT(q.fecha_creacion_contrato, '%Y-%m') AS mes_key,
                           DATE_FORMAT(q.fecha_creacion_contrato, '%b %Y') AS mes_label,
                           COUNT(*) AS total
                    FROM cotizaciones q
                    LEFT JOIN tipo_eventos te ON te.id_tipo_evento = q.id_tipo_evento
                    LEFT JOIN ciudades ci ON ci.id_ciudad = q.id_ciudad
                    {where_sql}
                    AND q.fecha_creacion_contrato IS NOT NULL
                    GROUP BY mes_key, mes_label ORDER BY mes_key ASC
                """, p)
            else:
                cur.execute(f"""
                    SELECT DATE_FORMAT(c.fecha_creacion_contrato, '%Y-%m') AS mes_key,
                           DATE_FORMAT(c.fecha_creacion_contrato, '%b %Y') AS mes_label,
                           COUNT(*) AS total
                    FROM contratos c
                    LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                    {where_sql}
                    AND c.fecha_creacion_contrato IS NOT NULL
                    GROUP BY mes_key, mes_label ORDER BY mes_key ASC
                """, p)
            eventos_por_mes_contrato = _fill_meses(cur.fetchall(), fci or fi, fcf or ff, ["total"])

            # Tab "Servicios" (resumen-servicios): desglose de cuántas veces se
            # pidió cada servicio (Sonido, Fotografía, Decoración, Barra, ...)
            # en cada mes — en vez de dinero. Se filtra por la fecha propia de
            # cada servicio (es.fecha_evento), igual que la tabla de este tab.
            if tipo == "resumen-servicios":
                sw: List[str] = ["c.active = 1"]
                sp: List[Any] = []
                if tenant_id is not None:
                    sw.append("c.id_cliente = %s"); sp.append(tenant_id)
                if fi:
                    sw.append("DATE(es.fecha_evento) >= %s"); sp.append(fi)
                if ff:
                    sw.append("DATE(es.fecha_evento) <= %s"); sp.append(ff)
                if clientes:
                    sw.append(f"c.cliente_nombre IN {_in_ph(clientes)}"); sp.extend(clientes)
                if ciudades:
                    sw.append(f"ci.nombre IN {_in_ph(ciudades)}"); sp.extend(ciudades)
                if usuarios:
                    sw.append(f"""EXISTS (
                        SELECT 1 FROM users u9 WHERE u9.id_user = c.id_user AND u9.name IN {_in_ph(usuarios)}
                    )""")
                    sp.extend(usuarios)
                sw_sql = "WHERE " + " AND ".join(sw)

                cur.execute(f"""
                    SELECT DATE_FORMAT(es.fecha_evento, '%Y-%m') AS mes_key,
                           DATE_FORMAT(es.fecha_evento, '%b %Y') AS mes_label,
                           sv.nombre AS servicio,
                           COUNT(DISTINCT es.id_evento) AS total
                    FROM eventos_servicios es
                    JOIN servicios sv ON sv.id_servicio = es.id_servicio
                    JOIN contratos c ON c.id_contrato = es.id_evento
                    LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                    {sw_sql}
                    GROUP BY mes_key, mes_label, sv.id_servicio, sv.nombre
                    ORDER BY mes_key ASC
                """, sp)
                servicios_por_mes = cur.fetchall()

                # Desglose por sección de servicio (una sección por servicio en
                # el frontend): a qué ciudades fue, con qué paquetes se pidió,
                # e ingreso por mes atribuido a ese servicio. El "ingreso" usa
                # el mismo criterio que "Importe de pagos por paquete" del tab
                # Pagos: el cobrado (anticipo + abonos) del contrato completo
                # se atribuye entero a cada servicio que ese contrato incluye
                # (no se divide entre servicios, porque no hay precio por
                # servicio en el modelo de datos).
                cur.execute(f"""
                    SELECT sv.nombre AS servicio, COALESCE(ci.nombre, 'Sin ciudad') AS ciudad,
                           COUNT(DISTINCT es.id_evento) AS total
                    FROM eventos_servicios es
                    JOIN servicios sv ON sv.id_servicio = es.id_servicio
                    JOIN contratos c ON c.id_contrato = es.id_evento
                    LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                    {sw_sql}
                    GROUP BY sv.id_servicio, sv.nombre, ciudad
                    ORDER BY sv.nombre, total DESC
                """, sp)
                servicios_por_ciudad = cur.fetchall()

                cur.execute(f"""
                    SELECT sv.nombre AS servicio, {_paquete_nombre_expr('0')} AS paquete,
                           COUNT(DISTINCT es.id_evento) AS total
                    FROM eventos_servicios es
                    JOIN servicios sv ON sv.id_servicio = es.id_servicio
                    JOIN contratos c ON c.id_contrato = es.id_evento
                    LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                    {_paquete_join("es", "0")}
                    {sw_sql}
                    AND es.id_paquete IS NOT NULL
                    GROUP BY sv.id_servicio, sv.nombre, paquete
                    ORDER BY sv.nombre, total DESC
                """, sp)
                servicios_por_paquete = cur.fetchall()

                cur.execute(f"""
                    SELECT servicio, mes_key, mes_label, COALESCE(SUM(cobrado), 0) AS total
                    FROM (
                        SELECT DISTINCT es.id_evento, sv.id_servicio, sv.nombre AS servicio,
                               DATE_FORMAT(es.fecha_evento, '%Y-%m') AS mes_key,
                               DATE_FORMAT(es.fecha_evento, '%b %Y') AS mes_label,
                               {_COBRADO_EXPR} AS cobrado
                        FROM eventos_servicios es
                        JOIN servicios sv ON sv.id_servicio = es.id_servicio
                        JOIN contratos c ON c.id_contrato = es.id_evento
                        LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                        {sw_sql}
                    ) t
                    GROUP BY servicio, mes_key, mes_label
                    ORDER BY servicio, mes_key ASC
                """, sp)
                servicios_por_mes_ingreso = cur.fetchall()
            else:
                servicios_por_mes = []
                servicios_por_ciudad = []
                servicios_por_paquete = []
                servicios_por_mes_ingreso = []

            gw = ["g.active_sistema = 1"]
            gp: List[Any] = []
            if tenant_id is not None:
                gw.append("g.id_cliente = %s"); gp.append(tenant_id)
            if fi:
                gw.append("g.fecha >= %s"); gp.append(fi)
            if ff:
                gw.append("g.fecha <= %s"); gp.append(ff)
            if ri:
                gw.append("DATE(g.datetime) >= %s"); gp.append(ri)
            if rf:
                gw.append("DATE(g.datetime) <= %s"); gp.append(rf)
            if tipos_gasto:
                gw.append(f"tg.nombre IN {_in_ph(tipos_gasto)}"); gp.extend(tipos_gasto)
            if usuarios:
                gw.append(f"u.name IN {_in_ph(usuarios)}"); gp.extend(usuarios)
            gwhere_sql = "WHERE " + " AND ".join(gw)

            cur.execute(f"""
                SELECT COALESCE(tg.nombre, 'Sin tipo') AS tipo, COALESCE(SUM(g.monto), 0) AS total
                FROM gastos g
                LEFT JOIN tipo_gastos tg ON tg.id_tipo_gasto = g.id_tipo_gasto
                LEFT JOIN users u ON u.id_user = g.id_user
                {gwhere_sql}
                GROUP BY tipo ORDER BY total DESC
            """, gp)
            gastos_por_tipo = cur.fetchall()

            cur.execute(f"""
                SELECT COALESCE(u.name, 'Sin usuario') AS nombre, COALESCE(SUM(g.monto), 0) AS total
                FROM gastos g
                LEFT JOIN tipo_gastos tg ON tg.id_tipo_gasto = g.id_tipo_gasto
                LEFT JOIN users u ON u.id_user = g.id_user
                {gwhere_sql}
                GROUP BY nombre ORDER BY total DESC LIMIT 10
            """, gp)
            gastos_por_usuario = cur.fetchall()

            cur.execute(f"""
                SELECT DATE_FORMAT(g.fecha, '%Y-%m') AS mes_key,
                       DATE_FORMAT(g.fecha, '%b %Y') AS mes_label,
                       COALESCE(SUM(g.monto), 0) AS total
                FROM gastos g
                LEFT JOIN tipo_gastos tg ON tg.id_tipo_gasto = g.id_tipo_gasto
                LEFT JOIN users u ON u.id_user = g.id_user
                {gwhere_sql}
                GROUP BY mes_key, mes_label ORDER BY mes_key ASC
            """, gp)
            gastos_por_mes = _fill_meses(cur.fetchall(), fi, ff, ["total"])

            # Tab "Trabajadores" (resumen-trabajadores): horas trabajadas por
            # tipo de puesto, calculadas a partir de hora_inicio/hora_final de
            # cada asignación en contratos_trabajadores (no por mes, como el
            # resto de tabs — aquí lo relevante es la carga de trabajo por puesto).
            tw = ["ct.active = 1", "c.active = 1", "ct.hora_inicio IS NOT NULL", "ct.hora_final IS NOT NULL"]
            twp: List[Any] = []
            if tenant_id is not None:
                tw.append("t.id_cliente = %s"); twp.append(tenant_id)
            if fi:
                tw.append("DATE(c.fecha_evento) >= %s"); twp.append(fi)
            if ff:
                tw.append("DATE(c.fecha_evento) <= %s"); twp.append(ff)
            if ri:
                tw.append("DATE(ct.datetime) >= %s"); twp.append(ri)
            if rf:
                tw.append("DATE(ct.datetime) <= %s"); twp.append(rf)
            if trabajadores:
                tw.append(f"CONCAT(t.nombre, ' ', t.apellido) IN {_in_ph(trabajadores)}"); twp.extend(trabajadores)
            if ciudades:
                tw.append(f"ci.nombre IN {_in_ph(ciudades)}"); twp.extend(ciudades)
            if puestos:
                tw.append(f"p.nombre IN {_in_ph(puestos)}"); twp.extend(puestos)
            if usuarios:
                tw.append(f"""EXISTS (
                    SELECT 1 FROM users u9 WHERE u9.id_user = c.id_user AND u9.name IN {_in_ph(usuarios)}
                )""")
                twp.extend(usuarios)
            tw_sql = "WHERE " + " AND ".join(tw)

            cur.execute(f"""
                SELECT COALESCE(p.nombre, 'Sin puesto') AS puesto,
                       COALESCE(SUM(
                           ROUND((TIME_TO_SEC(TIMEDIFF(ct.hora_final, ct.hora_inicio)) + 86400) % 86400 / 3600, 2)
                       ), 0) AS horas
                FROM contratos_trabajadores ct
                JOIN trabajadores t ON t.id_trabajador = ct.id_trabajador
                JOIN contratos c ON c.id_contrato = ct.id_contrato
                LEFT JOIN puestos p ON p.id_puesto = ct.id_puesto
                LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                {tw_sql}
                GROUP BY puesto ORDER BY horas DESC
            """, twp)
            puestos_horas = cur.fetchall()

            # Desglose por trabajador (una sección por trabajador en el frontend,
            # igual que el tab Servicios): puesto, horas por mes, ciudades,
            # tipos de evento, paquetes y servicios en los que participó.
            cur.execute(f"""
                SELECT CONCAT(t.nombre, ' ', t.apellido) AS trabajador,
                       COALESCE(p.nombre, 'Sin puesto') AS puesto,
                       COALESCE(SUM(
                           ROUND((TIME_TO_SEC(TIMEDIFF(ct.hora_final, ct.hora_inicio)) + 86400) % 86400 / 3600, 2)
                       ), 0) AS horas
                FROM contratos_trabajadores ct
                JOIN trabajadores t ON t.id_trabajador = ct.id_trabajador
                JOIN contratos c ON c.id_contrato = ct.id_contrato
                LEFT JOIN puestos p ON p.id_puesto = ct.id_puesto
                LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                {tw_sql}
                GROUP BY trabajador, puesto
                ORDER BY trabajador, horas DESC
            """, twp)
            trabajadores_por_puesto = cur.fetchall()

            cur.execute(f"""
                SELECT CONCAT(t.nombre, ' ', t.apellido) AS trabajador,
                       DATE_FORMAT(c.fecha_evento, '%Y-%m') AS mes_key,
                       DATE_FORMAT(c.fecha_evento, '%b %Y') AS mes_label,
                       COALESCE(SUM(
                           ROUND((TIME_TO_SEC(TIMEDIFF(ct.hora_final, ct.hora_inicio)) + 86400) % 86400 / 3600, 2)
                       ), 0) AS horas
                FROM contratos_trabajadores ct
                JOIN trabajadores t ON t.id_trabajador = ct.id_trabajador
                JOIN contratos c ON c.id_contrato = ct.id_contrato
                LEFT JOIN puestos p ON p.id_puesto = ct.id_puesto
                LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                {tw_sql}
                GROUP BY trabajador, mes_key, mes_label
                ORDER BY trabajador, mes_key ASC
            """, twp)
            trabajadores_por_mes = cur.fetchall()

            cur.execute(f"""
                SELECT CONCAT(t.nombre, ' ', t.apellido) AS trabajador,
                       COALESCE(ci.nombre, 'Sin ciudad') AS ciudad,
                       COUNT(DISTINCT c.id_contrato) AS total
                FROM contratos_trabajadores ct
                JOIN trabajadores t ON t.id_trabajador = ct.id_trabajador
                JOIN contratos c ON c.id_contrato = ct.id_contrato
                LEFT JOIN puestos p ON p.id_puesto = ct.id_puesto
                LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                {tw_sql}
                GROUP BY trabajador, ciudad
                ORDER BY trabajador, total DESC
            """, twp)
            trabajadores_por_ciudad = cur.fetchall()

            cur.execute(f"""
                SELECT CONCAT(t.nombre, ' ', t.apellido) AS trabajador,
                       COALESCE(te.nombre, 'Sin tipo') AS tipo,
                       COUNT(DISTINCT c.id_contrato) AS total
                FROM contratos_trabajadores ct
                JOIN trabajadores t ON t.id_trabajador = ct.id_trabajador
                JOIN contratos c ON c.id_contrato = ct.id_contrato
                LEFT JOIN puestos p ON p.id_puesto = ct.id_puesto
                LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                LEFT JOIN tipo_eventos te ON te.id_tipo_evento = c.id_tipo_evento
                {tw_sql}
                GROUP BY trabajador, tipo
                ORDER BY trabajador, total DESC
            """, twp)
            trabajadores_por_tipo_evento = cur.fetchall()

            cur.execute(f"""
                SELECT CONCAT(t.nombre, ' ', t.apellido) AS trabajador,
                       {_paquete_combined_expr('0', 'sv')} AS paquete,
                       COUNT(DISTINCT es.id_evento) AS total
                FROM contratos_trabajadores ct
                JOIN trabajadores t ON t.id_trabajador = ct.id_trabajador
                JOIN contratos c ON c.id_contrato = ct.id_contrato
                LEFT JOIN puestos p ON p.id_puesto = ct.id_puesto
                LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                JOIN eventos_servicios es ON es.id_evento = c.id_contrato
                JOIN servicios sv ON sv.id_servicio = es.id_servicio
                {_paquete_join("es", "0")}
                {tw_sql}
                AND es.id_paquete IS NOT NULL
                GROUP BY trabajador, paquete
                ORDER BY trabajador, total DESC
            """, twp)
            trabajadores_por_paquete = cur.fetchall()

            cur.execute(f"""
                SELECT CONCAT(t.nombre, ' ', t.apellido) AS trabajador,
                       sv.nombre AS servicio,
                       COUNT(DISTINCT c.id_contrato) AS total
                FROM contratos_trabajadores ct
                JOIN trabajadores t ON t.id_trabajador = ct.id_trabajador
                JOIN contratos c ON c.id_contrato = ct.id_contrato
                LEFT JOIN puestos p ON p.id_puesto = ct.id_puesto
                LEFT JOIN ciudades ci ON ci.id_ciudad = c.id_ciudad
                JOIN eventos_servicios es ON es.id_evento = c.id_contrato
                JOIN servicios sv ON sv.id_servicio = es.id_servicio
                {tw_sql}
                GROUP BY trabajador, servicio
                ORDER BY trabajador, total DESC
            """, twp)
            trabajadores_por_servicio = cur.fetchall()

        return {
            "por_tipo_evento":   [_row(r) for r in por_tipo_evento],
            "por_ciudad":        [_row(r) for r in por_ciudad],
            "top_clientes":      [_row(r) for r in top_clientes],
            "top_trabajadores":  [_row(r) for r in top_trabajadores],
            "por_paquete":       [_row(r) for r in por_paquete],
            "top_usuarios":      [_row(r) for r in top_usuarios],
            "por_estado":        [_row(r) for r in por_estado],
            "por_momento_pago":  por_momento_pago,
            "por_servicio":      [_row(r) for r in por_servicio],
            "por_mes":           [_row(r) for r in por_mes],
            "eventos_por_mes_servicio": [_row(r) for r in eventos_por_mes_servicio],
            "eventos_por_mes_contrato": [_row(r) for r in eventos_por_mes_contrato],
            "servicios_por_mes": [_row(r) for r in servicios_por_mes],
            "servicios_por_ciudad": [_row(r) for r in servicios_por_ciudad],
            "servicios_por_paquete": [_row(r) for r in servicios_por_paquete],
            "servicios_por_mes_ingreso": [_row(r) for r in servicios_por_mes_ingreso],
            "gastos_por_tipo":   [_row(r) for r in gastos_por_tipo],
            "gastos_por_usuario": [_row(r) for r in gastos_por_usuario],
            "gastos_por_mes":    [_row(r) for r in gastos_por_mes],
            "puestos_horas":     [_row(r) for r in puestos_horas],
            "trabajadores_por_puesto":      [_row(r) for r in trabajadores_por_puesto],
            "trabajadores_por_mes":         [_row(r) for r in trabajadores_por_mes],
            "trabajadores_por_ciudad":      [_row(r) for r in trabajadores_por_ciudad],
            "trabajadores_por_tipo_evento": [_row(r) for r in trabajadores_por_tipo_evento],
            "trabajadores_por_paquete":     [_row(r) for r in trabajadores_por_paquete],
            "trabajadores_por_servicio":    [_row(r) for r in trabajadores_por_servicio],
        }
    finally:
        conn.close()
