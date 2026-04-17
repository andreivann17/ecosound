from __future__ import annotations
from typing import Any, Dict, List, Optional
from pathlib import Path
from datetime import datetime
import secrets, string, shutil, hashlib, os
from pdf2image import convert_from_path  # asegúrate de tenerlo instalado
from pathlib import Path
import subprocess
import shutil
import os
import re  # ✅ necesario para re.fullmatch

from PIL import Image
from ..db import get_connection
import pymysql
import json
# === Generación de CODE (12) ===
_ALPHANUM = string.ascii_uppercase + string.digits
def _generate_code(n: int = 12) -> str:
    return "".join(secrets.choice(_ALPHANUM) for _ in range(n))
def _get_unique_code() -> str:
    return _generate_code(12)


# ==========================
# Formateo de expediente
# ==========================
def _build_expediente_format(raw: Any) -> Optional[str]:
    """
    Recibe el expediente tal como viene del front, por ejemplo:
      'UAC/CI/2025/000961'
    y genera:
      'UAC-CI-2025-000961'
    """
    if raw in (None, ""):
        return None
    s = str(raw).strip().upper()     # normalizamos espacios y mayúsculas
    return s.replace("/", "-")
def _query_conciliacion(
    *,
    expediente: Optional[str] = None,
    id_status: Optional[int] = None,

    id_estado: Optional[int] = None,
    id_ciudad: Optional[int] = None,
    id_autoridad: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    abogado_contrario: Optional[str] = None,
    active: Optional[int] = None,
    search: Optional[str] = None,
    id_empresa: Optional[int] = None,
    nombre_solicitante: Optional[str] = None,
    limit: Optional[int] = None,
    offset: Optional[int] = None,
) -> List[Dict[str, Any]]:

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            params: List[Any] = []

            base = (
               "SELECT "
                "  c.id_conciliacion AS id, "
                "  c.expediente, "
                "  c.expediente_format, "
                "  au.id_competencia, "
                "  au.id_ciudad, "
                "  c.created_at, "
                "  c.fecha_emision_expediente, "
                "  c.code, "
                "  c.abogado_contrario, "
                "  c.id_user_created, "
                "  c.id_user_updated, "
                "  c.updated_at, "
                "  c.id_conciliacion_status, "
                "  ds.status, "
                "  c.active, "
                "  u.name as nombre_usuario, "
                "  c.nombre_trabajador, "
                "  c.tipo_notificado, "
                "  c.tipo_notificado_actuario, "
                "  c.fecha_notificacion, "
                "  c.id_objeto, "
                "  obj.nombre as nombre_objeto, "
                "  emp.nombre AS nombre_empresa, "
                "  emp.nombre_contacto AS nombre_contacto, "
                "  com.nombre AS nombre_competencia, "
                "  ci.nombre AS nombre_ciudad, "
                "  e.nombre AS nombre_estado, "
                "  au.nombre AS nombre_autoridad, "
                "  c.id_empresa, "
                "  c.fecha_egreso, "
                "  c.salario_diario, "
                "  c.motivo_salida, "
                "  c.fecha_ingreso, "
                "  c.propuesta_patron, "
                "  ca.id_conciliacion_audiencia AS id_ultima_audiencia, "
                "  ca.is_constancia_documento,"
                "  c.fecha_proxima_audiencia AS fecha_proxima_audiencia ,"
                "  cd.created_at AS fecha_convenio ,"
                "  c.fecha_audiencia_inicial AS fecha_audiencia_inicial, "
                "  nx.next_fecha_pago AS fecha_proximo_pago, "
                "  ("
                "    SELECT COUNT(*) "
                "    FROM conciliacion_audiencia ca_cnt "
                "    WHERE ca_cnt.id_conciliacion = c.id_conciliacion "
                "  ) AS total_audiencias_prejudiciales "
                "FROM conciliacion c "
                "LEFT JOIN conciliacion_status ds "
                "  ON c.id_conciliacion_status = ds.id_conciliacion_status "
                "LEFT JOIN autoridades au "
                "  ON au.id_autoridad = c.id_autoridad "
                "LEFT JOIN ciudades ci "
                "  ON ci.id_ciudad = au.id_ciudad "
                "LEFT JOIN estados e "
                "  ON e.id_estado = ci.id_estado "
                "LEFT JOIN competencias com "
                "  ON com.id_competencia = au.id_competencia "
                "LEFT JOIN empresas emp "
                "  ON emp.id_empresa = c.id_empresa "
                "LEFT JOIN objetos obj ON obj.id_objeto = c.id_objeto "
                "LEFT JOIN users u ON u.id_user = c.id_user_created "
                "LEFT JOIN conciliacion_audiencia ca "
                "  ON ca.id_conciliacion = c.id_conciliacion "
                " AND ca.id_conciliacion_audiencia = ( "
                "       SELECT MAX(ca2.id_conciliacion_audiencia) "
                "       FROM conciliacion_audiencia ca2 "
                "       WHERE ca2.id_conciliacion = c.id_conciliacion "
                "  ) "
                "LEFT JOIN conciliacion_documentos cd "
                "  ON cd.id_conciliacion_documento = ca.id_constancia_documento "
                "LEFT JOIN ( "
                "   SELECT "
                "     ca3.id_conciliacion, "
                "     MIN(cac3.fecha_pago) AS next_fecha_pago "
                "   FROM conciliacion_audiencia ca3 "
                "   INNER JOIN conciliacion_audiencia_convenio cac3 "
                "     ON cac3.id_conciliacion_audiencia = ca3.id_conciliacion_audiencia "
                "   WHERE cac3.fecha_pago IS NOT NULL "
                "     AND cac3.fecha_pago >= NOW() "
                "   GROUP BY ca3.id_conciliacion "
                ") nx ON nx.id_conciliacion = c.id_conciliacion "
                "WHERE c.active = 1 "
            )

            # ====== FILTROS ======
            if expediente:
                base += " AND c.expediente LIKE %s"
                params.append(f"%{expediente.strip()}%")

            if id_status is not None:
                base += " AND c.id_conciliacion_status = %s"
                params.append(int(id_status))


            if id_estado is not None:
                base += " AND e.id_estado = %s"
                params.append(int(id_estado))

            if id_ciudad is not None:
                base += " AND ci.id_ciudad = %s"
                params.append(int(id_ciudad))

            if id_autoridad is not None:
                base += " AND au.id_autoridad = %s"
                params.append(int(id_autoridad))
            if date_from:
                base += " AND DATE(c.fecha_audiencia_inicial) >= %s"
                params.append(date_from)

            if date_to:
                base += " AND DATE(c.fecha_audiencia_inicial) <= %s"
                params.append(date_to)

            if abogado_contrario:
                base += " AND c.abogado_contrario LIKE %s"
                params.append(f"%{abogado_contrario.strip()}%")

            if active is not None:
                base += " AND c.active = %s"
                params.append(int(active))

            if id_empresa is not None:
                base += " AND c.id_empresa = %s"
                params.append(int(id_empresa))

            if nombre_solicitante and nombre_solicitante.strip():
                base += " AND LOWER(c.nombre_trabajador) LIKE %s"
                params.append(f"%{nombre_solicitante.strip().lower()}%")

            if search and search.strip():
                pat = f"%{search.strip().lower()}%"
                base += (
                    " AND ("
                    "  LOWER(c.expediente) LIKE %s OR "
                    "  LOWER(c.expediente_format) LIKE %s OR "
                    "  LOWER(c.abogado_contrario) LIKE %s OR "
                    "  LOWER(emp.nombre) LIKE %s OR "
                    "  LOWER(emp.nombre_contacto) LIKE %s OR "
                    "  LOWER(c.nombre_trabajador) LIKE %s "
                    ") "
                )
                params.extend([pat, pat, pat, pat, pat, pat])

            base += " order by c.fecha_proxima_audiencia ASC"

            if limit is not None:
                base += " LIMIT %s"
                params.append(int(limit))
                if offset is not None:
                    base += " OFFSET %s"
                    params.append(int(offset))

            # Ejecuta SELECT principal
            cur.execute(base, tuple(params))
            cols = [d[0] for d in cur.description]
            rows = cur.fetchall()

            items = [dict(zip(cols, r)) for r in rows]

            # ===========================================================
            # AGREGAR razones sociales por cada conciliación
            # ===========================================================
            razones_sql = (
                "SELECT "
                "  ce.id_conciliacion_empresa AS id, "
                "  ce.id_razon_social, "
                "  rs.nombre AS razon_social "
                "FROM conciliacion_empresas ce "
                "LEFT JOIN empresas_razon_social rs "
                "  ON rs.id_empresa_razon_social = ce.id_razon_social "
                "WHERE ce.id_conciliacion = %s AND ce.id_empresa = %s and ce.active = 1"
            )

            for item in items:
                id_conc = item["id"]
                id_emp = item.get("id_empresa")

                if not id_emp:
                    item["razones_sociales"] = []
                    continue

                cur.execute(razones_sql, (id_conc, id_emp))
                rs_rows = cur.fetchall()

                razones = []
                for r in rs_rows:
                    razones.append(
                        {
                            "id": r[0],
                            "id_razon_social": r[1],
                            "razon_social": r[2],
                        }
                    )

                item["razones_sociales"] = razones

            return items

    finally:
        conn.close()


def _query_conciliacion_multi(
    *,
    expediente: Optional[str] = None,
    id_status: Optional[int] = None,
    city_ids: Optional[List[int]] = None,
    company_ids: Optional[List[int]] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    abogado_contrario: Optional[str] = None,
    active: Optional[int] = 1,
    search: Optional[str] = None,
    nombre_solicitante: Optional[str] = None,
) -> List[Dict[str, Any]]:

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            params: List[Any] = []

            base = (
                "SELECT "
                "  c.id_conciliacion AS id, "
                "  c.expediente, "
                "  c.expediente_format, "
                "  au.id_competencia, "
                "  au.id_ciudad, "
                "  c.created_at, "
                "  c.fecha_emision_expediente, "
                "  c.code, "
                "  c.abogado_contrario, "
                "  c.id_user_created, "
                "  c.updated_at, "
                "  c.id_conciliacion_status, "
                "  ds.status, "
                "  c.active, "
                "  u.name AS nombre_usuario, "
                "  c.nombre_trabajador, "
                "  emp.nombre AS nombre_empresa, "
                "  emp.nombre_contacto, "
                "  ci.nombre AS nombre_ciudad, "
                "  e.nombre AS nombre_estado, "
                "  au.nombre AS nombre_autoridad, "
                "  c.id_empresa, "
                "  c.fecha_proxima_audiencia "
                "FROM conciliacion c "
                "LEFT JOIN conciliacion_status ds ON ds.id_conciliacion_status = c.id_conciliacion_status "
                "LEFT JOIN autoridades au ON au.id_autoridad = c.id_autoridad "
                "LEFT JOIN ciudades ci ON ci.id_ciudad = au.id_ciudad "
                "LEFT JOIN estados e ON e.id_estado = ci.id_estado "
                "LEFT JOIN empresas emp ON emp.id_empresa = c.id_empresa "
                "LEFT JOIN users u ON u.id_user = c.id_user_created "
                "WHERE c.active = 1 "
            )

            # ====== FILTROS ======

            if expediente:
                base += " AND c.expediente LIKE %s"
                params.append(f"%{expediente.strip()}%")

            if id_status is not None:
                base += " AND c.id_conciliacion_status = %s"
                params.append(int(id_status))

            if city_ids:
                placeholders = ",".join(["%s"] * len(city_ids))
                base += f" AND ci.id_ciudad IN ({placeholders})"
                params.extend(city_ids)

            if company_ids:
                placeholders = ",".join(["%s"] * len(company_ids))
                base += f" AND c.id_empresa IN ({placeholders})"
                params.extend(company_ids)

            if date_from:
                base += " AND DATE(c.created_at) >= %s"
                params.append(date_from)

            if date_to:
                base += " AND DATE(c.created_at) <= %s"
                params.append(date_to)

            if abogado_contrario:
                base += " AND c.abogado_contrario LIKE %s"
                params.append(f"%{abogado_contrario.strip()}%")

            if active is not None:
                base += " AND c.active = %s"
                params.append(int(active))

            if nombre_solicitante:
                base += " AND LOWER(c.nombre_trabajador) LIKE %s"
                params.append(f"%{nombre_solicitante.strip().lower()}%")

            if search:
                pat = f"%{search.strip().lower()}%"
                base += (
                    " AND ("
                    " LOWER(c.expediente) LIKE %s OR "
                    " LOWER(c.expediente_format) LIKE %s OR "
                    " LOWER(c.abogado_contrario) LIKE %s OR "
                    " LOWER(emp.nombre) LIKE %s OR "
                    " LOWER(c.nombre_trabajador) LIKE %s "
                    ") "
                )
                params.extend([pat, pat, pat, pat, pat])

            base += " ORDER BY c.fecha_proxima_audiencia ASC"

            cur.execute(base, tuple(params))
            cols = [d[0] for d in cur.description]
            rows = cur.fetchall()

            items = [dict(zip(cols, r)) for r in rows]

            # ===== razones sociales =====
            razones_sql = (
                "SELECT ce.id_conciliacion_empresa, ce.id_razon_social, rs.nombre "
                "FROM conciliacion_empresas ce "
                "LEFT JOIN empresas_razon_social rs "
                "  ON rs.id_empresa_razon_social = ce.id_razon_social "
                "WHERE ce.id_conciliacion = %s "
                "  AND ce.id_empresa = %s "
                "  AND ce.active = 1"
            )

            for item in items:
                id_conc = item["id"]
                id_emp = item.get("id_empresa")

                if not id_emp:
                    item["razones_sociales"] = []
                    continue

                cur.execute(razones_sql, (id_conc, id_emp))
                rs_rows = cur.fetchall()

                item["razones_sociales"] = [
                    {
                        "id": r[0],
                        "id_razon_social": r[1],
                        "razon_social": r[2],
                    }
                    for r in rs_rows
                ]

            return items

    finally:
        conn.close()

_ALLOWED_CONCILIACION  = {
   
    "id_ciudad",
    "fecha_emision_expediente",
 
    "abogado_contrario",
    "id_conciliacion_status",
    "nombre_patron",
    "fecha_notificacion",
    "id_empresa",
    # ---- NUEVOS ----
    "id_objeto",
    "tipo_notificado",
    "tipo_notificado_actuario",
    "id_autoridad",
    "nombre_trabajador",
    "id_medio_notificacion",   # <--- aquí el nombre REAL de la columna
}


def convertir_a_pdf_or_throw(*, src_path: Path, dst_path: Path) -> None:
    """
    Normaliza un archivo a PDF.

    - Si src_path ya es PDF, lo copia a dst_path.
    - Si es imagen (jpg/png), la convierte a PDF con Pillow.
    - Si es Word (doc/docx/odt), llama a LibreOffice en modo headless.

    Lanza RuntimeError si algo falla.
    """
    src_path = Path(src_path)
    dst_path = Path(dst_path)

    if not src_path.exists():
        raise RuntimeError(f"Archivo origen no existe: {src_path}")

    ext = src_path.suffix.lower()

    # 1) Ya es PDF → copiar
    if ext == ".pdf":
        # si dst_path es distinto, copia; si es igual, no pasa nada
        if src_path.resolve() != dst_path.resolve():
            shutil.copy2(src_path, dst_path)
        return

    # 2) Imagen (jpg, jpeg, png) → PDF con Pillow
    if ext in {".jpg", ".jpeg", ".png", ".jfif", ".webp", ".tiff", ".bmp", ".gif",".heic", ".heif",".svg",".PNG",".JPG",".JPEG",".JFIF",".WEBP",".TIFF",".BMP",".GIF",".HEIC",".HEIF",".SVG"}:
        try:
            with Image.open(src_path) as img:
                # convertimos a RGB para evitar problemas con modos "P", "RGBA", etc.
                if img.mode != "RGB":
                    img = img.convert("RGB")

                dst_path.parent.mkdir(parents=True, exist_ok=True)
                img.save(dst_path, "PDF", resolution=150.0)
        except Exception as e:
            raise RuntimeError(f"Error convirtiendo imagen a PDF: {e}") from e
        return

    # 3) Documentos tipo Word → PDF con LibreOffice
    if ext in {".doc", ".docx", ".odt"}:
        # Comando de LibreOffice (ajusta si no está en PATH)
        # En Linux suele bastar con "soffice"
        # En Windows podrías usar algo como:
        # r"C:\\Program Files\\LibreOffice\\program\\soffice.exe"
        soffice_cmd = r"soffice"

        outdir = dst_path.parent
        outdir.mkdir(parents=True, exist_ok=True)

        # LibreOffice genera el PDF en outdir con el mismo nombre base
        try:
            result = subprocess.run(
                [
                    soffice_cmd,
                    "--headless",
                    "--convert-to",
                    "pdf",
                    "--outdir",
                    str(outdir),
                    str(src_path),
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
                text=True,
            )
        except FileNotFoundError:
            raise RuntimeError(
                "No se encontró LibreOffice (soffice). "
                "Configura la variable de entorno LIBREOFFICE_CMD o agrega LibreOffice al PATH."
            )

        if result.returncode != 0:
            raise RuntimeError(
                f"LibreOffice falló al convertir a PDF.\n"
                f"stdout: {result.stdout}\n"
                f"stderr: {result.stderr}"
            )

        # LibreOffice crea un archivo con el mismo nombre base pero extensión .pdf
        generado = outdir / (src_path.stem + ".pdf")
        if not generado.exists():
            raise RuntimeError(
                f"LibreOffice no generó el PDF esperado: {generado}"
            )

        # Si el nombre generado no coincide con dst_path, lo renombramos/movemos
        if generado.resolve() != dst_path.resolve():
            shutil.move(str(generado), str(dst_path))

        return

    # 4) Si llega aquí, es un tipo no soportado
    raise RuntimeError(f"Tipo de archivo no soportado para conversión a PDF: {ext}")

# === Conjuntos de campos por flujo ===
_BASIC_ALLOWED = {
    "expediente",
    "id_empresa",
    "fecha_emision_expediente",
 
    "abogado_contrario",
    "id_conciliacion_status",
    "tipo_notificado",
    "tipo_notificado_actuario",
    "id_autoridad",
    "nombre_trabajador",
    "id_objeto",
    "fecha_notificacion",
    "id_medio_notificacion",   # <--- nuevo
      "fecha_emision_expediente",
    "fecha_notificacion",
    "fecha_proxima_audiencia",
}



_CHECKLIST_ALLOWED = {
    # Banderas/datos laborales y observaciones
    "nombre_patron", "fecha_ingreso_trabajador", "horario", "dia_descanso", "jornada_semanal",
    "ultimo_dia_laboral", "baja_imss", "fecha_baja_imss", "motivo_baja",
    "puesto_trabajador", "ultimo_salario_diario", "ultimo_salario_integrado", "conceptos_salario",
    "renuncia_firmada_trabajador", "finiquito_firmado",
    "motivo_real_trabajdor", "comentario", "propuesta_conflicto",
    "cantidad_autorizada", "proporcionado_nombre", "proporcionado_puesto", "proporcionado_fecha",
    "rfc_patron", "cantidad_autorizada_opcion",
}

def _parse_dt_basic(value: str) -> datetime:
    """
    Intenta parsear la fecha en formatos típicos:
    - YYYY-MM-DD
    - YYYY-MM-DD HH:MM
    - YYYY-MM-DDTHH:MM
    - YYYY-MM-DD HH:MM:SS
    - YYYY-MM-DDTHH:MM:SS
    """
    if value is None:
        raise ValueError("Fecha inválida (None)")

    s = str(value).strip()
    # Primero intento ISO directo
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        pass

    # Formatos alternativos
    formatos = [
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d",
        "%Y-%m-%d %H:%M:%S",
    ]
    for fmt in formatos:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue

    raise ValueError("Formato de fecha inválido. Usa 'YYYY-MM-DD' o 'YYYY-MM-DD HH:MM'.")
def _parse_dt_historial(value: Any) -> datetime:
    """
    Recibe str/datetime y devuelve datetime.
    Acepta:
      - datetime ya parseado
      - 'YYYY-MM-DD'
      - 'YYYY-MM-DD HH:MM'
      - 'YYYY-MM-DD HH:MM:SS'
    """
    if value is None:
        raise ValueError("Fecha de historial inválida (None).")

    if isinstance(value, datetime):
        return value

    s = str(value).strip()
    # Intento ISO directo
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        pass

    formatos = ["%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"]
    for fmt in formatos:
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue

    raise ValueError(f"Formato de fecha inválido para historial: {s}")
def update_historial_event(
    *,
    id_historial: int,
    fecha: Any,
    titulo: str,
    descripcion: str,
    tipo_evento: Optional[str],
    id_user: int,
    conn,  # <-- viene del router (MISMA conexión)
) -> None:
    """
    Actualiza un evento existente en conciliacion_historial.
    Se usa cuando se modifica la misma audiencia (no se crea acto nuevo).
    """
    dt = _parse_dt_historial(fecha)

    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE conciliacion_historial
            SET descripcion = %s,
                updated_at = NOW(),
                id_user_updated = %s,
                fecha_historial = %s,
                titulo = %s,
                tipo_evento = %s
            WHERE id_conciliacion_historial = %s
            """,
            (
                descripcion,
                id_user,
                dt,
                titulo,
                tipo_evento,
                id_historial,
            ),
        )

def add_historial_event(
    *,
    conn,
    id_conciliacion: int,
    fecha: Any,
    titulo: str,
    descripcion: str,
    tipo_evento: Optional[str],
    tabla_origen: Optional[str],
    id_origen: Optional[int],
    id_user: int,
) -> int:
    """
    Inserta un evento en conciliacion_historial usando la MISMA conexión.
    """

    dt = _parse_dt_historial(fecha)

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO conciliacion_historial
                (
                    id_conciliacion,
                    descripcion,
                    active,
                    created_at,
                    updated_at,
                    id_user_created,
                    id_user_updated,
                    fecha_historial,
                    titulo,
                    tipo_evento,
                    tabla_origen,
                    id_origen
                )
            VALUES
                (%s, %s, 1, NOW(), NOW(), %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                id_conciliacion,
                descripcion,
                id_user,
                id_user,
                dt,
                titulo,
                tipo_evento,
                tabla_origen,
                id_origen,
            ),
        )
        return cur.lastrowid

def create_historial_inicial_conciliacion(
    *,
    conn,
    id_conciliacion: int,
    data: Dict[str, Any],
    id_user: int,
) -> None:
    """
    Crea los eventos iniciales del historial al crear la conciliación.
    """

    # ============================
    # Normalización de fechas
    # ============================
    fecha_emision = data.get("fecha_emision_expediente") or data.get("fecha_creacion_expediente")
    fecha_notificacion = data.get("fecha_notificacion")
    fecha_audiencia = data.get("fecha_audiencia") or data.get("fecha_cita_audiencia")

    # ==========================================
    # 0) Registro en sistema (NOW real)
    # ==========================================
    add_historial_event(
        conn=conn,
        id_conciliacion=id_conciliacion,
        fecha=datetime.now(),
        titulo="Registro en sistema",
        descripcion="Se registró el expediente en el sistema de gestión.",
        tipo_evento="SISTEMA",
        tabla_origen="conciliacion",
        id_origen=id_conciliacion,
        id_user=id_user,
    )

    # ==========================================
    # 1) Emisión de expediente
    # ==========================================
    if fecha_emision:
        add_historial_event(
            conn=conn,
            id_conciliacion=id_conciliacion,
            fecha=fecha_emision,
            titulo="Emisión de expediente",
            descripcion="Se creó el expediente en el Centro de Conciliación (emisión del citatorio).",
            tipo_evento="EXPEDIENTE",
            tabla_origen="conciliacion",
            id_origen=id_conciliacion,
            id_user=id_user,
        )

    # ==========================================
    # 2) Notificación
    # ==========================================
    if fecha_notificacion:
        add_historial_event(
            conn=conn,
            id_conciliacion=id_conciliacion,
            fecha=fecha_notificacion,
            titulo="Notificación",
            descripcion="Se notificó el citatorio al citado.",
            tipo_evento="NOTIFICACION",
            tabla_origen="conciliacion",
            id_origen=id_conciliacion,
            id_user=id_user,
        )

    # ==========================================
    # 3) Audiencia programada
    # ==========================================
    if fecha_audiencia:
        add_historial_event(
            conn=conn,
            id_conciliacion=id_conciliacion,
            fecha=fecha_audiencia,
            titulo="Audiencia programada",
            descripcion="La próxima audiencia tendrá lugar el día "+str(fecha_audiencia)+".",
            tipo_evento="AUDIENCIA",
            tabla_origen="conciliacion_audiencia",
            id_origen=None,
            id_user=id_user,
        )
def _validate_basic_dates(
    fecha_emision: Optional[str],
    fecha_notificacion: Optional[str],
    fecha_audiencia: Optional[str],
) -> None:
    """
    Regla:
      fecha_emision_expediente  <= fecha_notificacion (si existe) <= fecha_audiencia (si existe)
    y nunca se permiten fechas anteriores a la emisión.
    """
    dt_emision = _parse_dt_basic(fecha_emision) if fecha_emision else None
    dt_notif   = _parse_dt_basic(fecha_notificacion) if fecha_notificacion else None
    dt_aud     = _parse_dt_basic(fecha_audiencia) if fecha_audiencia else None

    # Notificación antes de emisión
    if dt_notif and dt_emision and dt_notif < dt_emision:
        raise ValueError("La fecha de notificación no puede ser anterior a la fecha de emisión del expediente.")

    # Audiencia antes de emisión
    if dt_aud and dt_emision and dt_aud < dt_emision:
        raise ValueError("La fecha de la audiencia no puede ser anterior a la fecha de emisión del expediente.")

    # Si hay ambas, notificación no puede ser después de audiencia
    if dt_notif and dt_aud and dt_notif > dt_aud:
        raise ValueError("La fecha de notificación no puede ser posterior a la fecha de la audiencia.")

def _to_int_bool(v: Any) -> Optional[int]:
    if v in (None, ""): return None
    if isinstance(v, bool): return 1 if v else 0
    try:
        return 1 if int(v) else 0
    except Exception:
        s = str(v).strip().lower()
        if s in ("true","si","sí","1","y","yes"): return 1
        if s in ("false","no","0","n"): return 0
        return None

def bulk_insert_conciliacion_empresas(
    *,
    id_conciliacion: int,
    id_empresa: int,
    razones_ids: List[int],
    id_user_created: int,
    conn=None,
) -> None:
    if not razones_ids:
        return

    # evitar duplicados
    unique_ids = sorted(set(razones_ids))

    own_conn = False
    if conn is None:
        conn = get_connection()
        own_conn = True

    try:
        with conn.cursor() as cur:
            for rs_id in unique_ids:
                cur.execute(
                    """
                    INSERT INTO conciliacion_empresas
                        (
                            id_empresa,
                            id_razon_social,
                            id_conciliacion,
                            created_at,
                            updated_at,
                            id_user_created,
                            id_user_updated,
                            active
                        )
                    VALUES
                        (%s, %s, %s, NOW(), NOW(), %s, %s, 1)
                    """,
                    (
                        id_empresa,
                        rs_id,
                        id_conciliacion,
                        id_user_created,
                        id_user_created,
                    ),
                )

        if own_conn:
            conn.commit()

    except Exception:
        if own_conn:
            try:
                conn.rollback()
            except Exception:
                pass
        raise

    finally:
        if own_conn:
            conn.close()

def create_empresa_from_conciliacion(
    *,
    nombre: str,
    cliente_directo: int,
    nombre_corresponsal: Optional[str],
    correo: Optional[str],
    celular: Optional[str],
    conn,
    id_user_created: int,
) -> int:
    """
    Crea una nueva empresa a partir de los datos del formulario de conciliación
    y devuelve el id_empresa generado.
    """
    if not nombre:
        raise ValueError("El nombre de la empresa es obligatorio")

    with conn.cursor(dictionary=True) as cur:
     
        code = _get_unique_code()

        cur.execute(
            """
            INSERT INTO empresas
                (nombre,
                 active,
                 code,
                 created_at,
                 updated_at,
                 id_user_created,
                 id_user_updated,
                 cliente_directo,
                 nombre_contacto,
                 correo,
                 celular)
            VALUES
                (%s, 1, %s, NOW(), NOW(), %s, %s, %s, %s, %s, %s)
            """,
            (
                nombre,
                code,
                id_user_created,
                id_user_created,
                cliente_directo,
                nombre_corresponsal,
                correo,
                celular,
            ),
        )
        return cur.lastrowid


def get_conciliacion_historia_procesal(id_conciliacion: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            params: List[Any] = []

            base = (
                "SELECT "
                "  ch.id_conciliacion_historial AS id_historial, "
                "  ch.id_conciliacion, "
                "  ch.titulo, "
                "  ch.descripcion, "
                "  ch.tipo_evento, "
                "  ch.fecha_historial, "
                "  ch.tabla_origen, "
                "  ch.id_origen, "
                "  ch.active, "
                "  ch.created_at, "
                "  ch.updated_at, "
                "  ch.id_user_created, "
                "  ch.id_user_updated "
                "FROM conciliacion_historial ch "
                "INNER JOIN conciliacion c "
                "  ON c.id_conciliacion = ch.id_conciliacion "
                "WHERE 1=1 "
            )

            # por expediente o expediente_format exacto
            if id_conciliacion:
                base += " AND (c.id_conciliacion = %s) "
                params.extend([id_conciliacion.strip()])

            base += (
                "ORDER BY ch.fecha_historial DESC, "
                "         ch.id_conciliacion_historial DESC"
            )

            cur.execute(base, tuple(params))
            cols = [d[0] for d in cur.description]
            rows = cur.fetchall()

            items = [dict(zip(cols, r)) for r in rows]
            return items

    finally:
        conn.close()

def bulk_create_razones_sociales_nuevas(
    *,
    nombres: List[str],
    id_user_created: int,
    id_empresa: int,
    conn=None,
) -> List[int]:
    """
    Inserta en la tabla empresas_razon_social las razones NUEVAS (texto)
    asociadas a una empresa y devuelve la lista de ids creados.
    """
    cleaned = [n.strip() for n in (nombres or []) if n and str(n).strip()]
    if not cleaned:
        return []

    if not id_empresa:
        raise ValueError("id_empresa es requerido para crear razones sociales nuevas")

    own_conn = False
    if conn is None:
        conn = get_connection()
        own_conn = True

    nuevos_ids: List[int] = []

    try:
        with conn.cursor(dictionary=True) as cur:
            for nombre in cleaned:
                cur.execute(
                    """
                    INSERT INTO empresas_razon_social
                        (
                            nombre,
                            active,
                            id_empresa,
                       
                            created_at,
                            updated_at,
                            id_user_created,
                            id_user_updated
                        )
                    VALUES
                        (%s, 1, %s, NOW(), NOW(), %s, %s)
                    """,
                    (
                        nombre,
                        id_empresa,
                        id_user_created,
                        id_user_created,
                    ),
                )
                nuevos_ids.append(cur.lastrowid)

        if own_conn:
            conn.commit()

        return nuevos_ids

    except Exception:
        if own_conn:
            try:
                conn.rollback()
            except Exception:
                pass
        raise

    finally:
        if own_conn:
            conn.close()

def _sanitize_conciliacion(data: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for k, v in data.items():
        if k not in _ALLOWED_CONCILIACION:
            continue
        
        if v == "":
            v = None

        # aquí agregamos id_medio_notificacion al casteo a int
        if k in (
   
            "id_conciliacion_status",
            "id_empresa",
            "id_razon_social",
            "id_autoridad",
            "id_objeto",
            "id_medio_notificacion",   # <--- NUEVO
        ) and v is not None:
            v = int(v)

        if isinstance(v, str) and k not in (
            "fecha_emision_expediente",
            "fecha_ingreso_trabajador",
            "ultimo_dia_laboral",
            "fecha_baja_imss",
            "proporcionado_fecha",
        ):
            v = v.strip()

        out[k] = v
    return out

def _sanitize_conciliacion_basic(data: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for k, v in data.items():
        if k not in _BASIC_ALLOWED:
            continue
        if v == "":
            v = None

        # ints (agregamos id_medio_notificacion)
        if k in (
        
            "id_conciliacion_status",
            "id_empresa",
            "id_autoridad",
                "id_objeto",              # ✅ AGREGA
            "id_medio_notificacion",   # <--- NUEVO
        ) and v is not None:
            v = int(v)

        # enums/strings; normaliza
        if k in (
            "tipo_notificado",
            "tipo_notificado_actuario",
            "abogado_contrario",
            "nombre_trabajador",
        ) and isinstance(v, str):
            v = v.strip().lower()

            # ahora permitimos trabajador / actuario / solicitante
            if k == "tipo_notificado" and v not in (
                None,
                "",
                "trabajador",
                "actuario",
                "solicitante",
            ):
                raise ValueError("tipo_notificado inválido")

            if k == "tipo_notificado_actuario" and v not in (
                None,
                "",
                "empresa",
                "despacho",
            ):
                raise ValueError("tipo_notificado_actuario inválido")

        # resto strings (fecha_notificacion entra aquí)
        if isinstance(v, str) and k not in ("fecha_emision_expediente",):
            v = v.strip()

        out[k] = v
    return out
def get_conciliacion_by_id_v2(id_conciliacion: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT *
                FROM conciliacion
                WHERE id_conciliacion = %s
                LIMIT 1
                """,
                (id_conciliacion,),
            )
            return cur.fetchone()
    finally:
        conn.close()
def _sanitize_conciliacion_checklist(data: Dict[str, Any]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for k, v in data.items():
        if k not in _CHECKLIST_ALLOWED:  # sólo checklist
            continue
        if v == "":
            v = None
        # flags a 0/1 cuando aplique
        if k in ("baja_imss","renuncia_firmada_trabajador","finiquito_firmado"):
            v = _to_int_bool(v)
        # enteros si los tuvieras aquí (ninguno obligatorio por ahora)
        if isinstance(v, str) and k not in ("fecha_ingreso_trabajador","ultimo_dia_laboral","fecha_baja_imss","proporcionado_fecha"):
            v = v.strip()
        out[k] = v
    return out
def create_conciliacion_basic(*, data: Dict[str, Any], id_user_created: int, conn=None) -> int:
    # Fechas crudas tal como vienen del front (incluye fecha_audiencia solo para validar orden)
    fecha_emision_raw      = data.get("fecha_emision_expediente")
    fecha_notificacion_raw = data.get("fecha_notificacion")
    fecha_audiencia_raw    = data.get("fecha_audiencia")  # NO se guarda en conciliacion, solo se valida

    # Sanitizado básico
    payload = _sanitize_conciliacion_basic(data)

    # ==========================
    # Generar expediente_format
    # ==========================
    raw_exp = payload.get("expediente")
    if raw_exp not in (None, ""):
        exp_format = _build_expediente_format(raw_exp)   # UAC-CI-2025-000961
        payload["expediente"] = str(raw_exp).strip().upper()
        payload["expediente_format"] = exp_format

    missing = []
    for req in ("id_empresa","nombre_trabajador","id_autoridad",):
        
        if payload.get(req) in (None, ""):
            missing.append(req)
    # fecha_audiencia obligatoria
    if not fecha_audiencia_raw:
        missing.append("fecha_audiencia")
    if missing:
        raise ValueError(f"Campos obligatorios faltantes: {', '.join(missing)}")

    # ==========================
    # VALIDAR ORDEN DE FECHAS
    # ==========================
    _validate_basic_dates(
        fecha_emision=fecha_emision_raw,
        fecha_notificacion=fecha_notificacion_raw,
        fecha_audiencia=fecha_audiencia_raw,
    )

    own_conn = False
    if conn is None:
        conn = get_connection()
        own_conn = True

    try:
        with conn.cursor() as cur:
            # ==========================
            # VALIDAR EXPEDIENTE ÚNICO
            # ==========================
            # ==========================
            # VALIDAR EXPEDIENTE ÚNICO (SOLO SI EXISTE)
            # ==========================

            exp_format = payload.get("expediente_format")
            exp_raw = payload.get("expediente")

            if exp_format:
                cur.execute(
                    "SELECT 1 FROM conciliacion WHERE expediente_format=%s AND active = 1 LIMIT 1",
                    (exp_format,),
                )
                if cur.fetchone():
                    raise ValueError("El número de expediente ya existe.")

            elif exp_raw:
                cur.execute(
                    "SELECT 1 FROM conciliacion WHERE expediente=%s AND active = 1 LIMIT 1",
                    (exp_raw,),
                )
                if cur.fetchone():
                    raise ValueError("El número de expediente ya existe.")

            # si no hay expediente, simplemente no valida duplicado

       
            # ===== INSERT conciliacion =====
            cols, vals, params = [], [], []
            for k, v in payload.items():
                cols.append(k)
                vals.append("%s")
                params.append(v)

            cols += [
                "fecha_proxima_audiencia",
                "fecha_audiencia_inicial",
                "created_at",
                "updated_at",
                "id_user_created",
                "id_user_updated",
                "active",
                "code",
            ]
            vals += ["%s", "%s", "NOW()", "NOW()", "%s", "%s", "1", "%s"]

            params += [
                fecha_audiencia_raw,
                fecha_audiencia_raw,
                id_user_created,
                id_user_created,
                _get_unique_code(),
            ]
            

            sql = f"INSERT INTO conciliacion ({', '.join(cols)}) VALUES ({', '.join(vals)})"
            cur.execute(sql, tuple(params))

            conciliacion_id = cur.lastrowid
            changes_json = json.dumps(payload, default=str)
            extra_json = json.dumps(
                {"origen": "centro_conciliacion", "endpoint": "create_conciliacion_basic"},
                default=str,
            )
           
     

            cur.execute(
                """
                INSERT INTO audit_log
                    (action, changes, extra, ip_address, user_agent,
                     id_user, datetime, id_modulo, id_key, message)
                VALUES
                    (%s, %s, %s, %s, %s,
                     %s, NOW(), %s, %s, %s)
                """,
                (
                    "CREATE",
                    changes_json,
                    extra_json,
                    data.get("ip_address", ""),
                    data.get("user_agent", ""),
                    id_user_created,
                    1,
                    conciliacion_id,
                    f"Creación conciliación {payload.get('expediente')}",
                ),
            )
            id_audit_log = cur.lastrowid

            clave_notificacion = _get_unique_code()

            descripcion_notificacion = (
                f"Se creó un expediente en Centro de Conciliación. "
                f"Expediente: {payload.get('expediente_format') or payload.get('expediente') or 'SIN EXPEDIENTE'}. "
                f"Trabajador: {payload.get('nombre_trabajador') or 'N/D'}."
            )

            cur.execute(
                """
                INSERT INTO notificaciones
                    (
                        active,
                        id_tipo_notificacion,
                        datetime,
                        id_modulo,
                        descripcion,
                        id_user,
                        urgente,
                        fecha_notificacion,
                        leido,
                        clave,
                        id_audit_log
                    )
                VALUES
                    (%s, %s, NOW(), %s, %s, %s, %s, NOW(), %s, %s, %s)
                """,
                (
                    1,                      # active
                    6,                      # id_tipo_notificacion -> AJUSTA SI TU CATÁLOGO USA OTRO ID
                    1,                      # id_modulo = 1
                    descripcion_notificacion,
                    id_user_created,        # quién generó la notificación
                    0,                      # urgente
                    0,                      # leido
                    clave_notificacion,
                    id_audit_log,
                ),
            )

        if own_conn:
            conn.commit()

        return {"id_conciliacion": conciliacion_id,"descripcion_notificacion":descripcion_notificacion}

    except Exception:
        if own_conn:
            try:
                conn.rollback()
            except Exception:
                pass
        raise

    finally:
        if own_conn:
            conn.close()
def update_conciliacion_checklist(*, id_conciliacion: int, data: Dict[str, Any], id_user: int) -> int:
    """
    Actualiza ÚNICAMENTE campos de checklist en la tabla conciliacion.
    Úsalo desde /conciliaciones/checklist.
    """
    # No permitas que intenten colar básicos aquí
    payload = _sanitize_conciliacion_checklist(data)
    if not payload:
        return 0

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            sets, params = [], []
            for k, v in payload.items():
                sets.append(f"{k}=%s"); params.append(v)
            sets.append("id_user_updated=%s"); params.append(id_user)
            sets.append("updated_at=NOW()")
            params.append(id_conciliacion)

            sql = f"UPDATE conciliacion SET {', '.join(sets)} WHERE id_conciliacion=%s"
            cur.execute(sql, tuple(params))
            conn.commit()
            return cur.rowcount
    finally:
        conn.close()

def create_conciliacion(*, data: Dict[str, Any], id_user_created: int) -> int:
    payload = _sanitize_conciliacion(data)
    missing = []
    for req in ("id_conciliacion_status","id_empresa","id_razon_social"):
        if payload.get(req) in (None, ""):
            missing.append(req)
    if missing:
        raise ValueError(f"Campos obligatorios faltantes: {', '.join(missing)}")

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cols, vals, params = [], [], []
            for k, v in payload.items():
                cols.append(k); vals.append("%s"); params.append(v)
            cols += ["created_at","updated_at","id_user_created","id_user_updated","active","code"]
            vals += ["NOW()","NOW()","%s","%s", "1", "%s"]
            params += [id_user_created, id_user_created, _get_unique_code()]

            sql = f"INSERT INTO conciliacion ({', '.join(cols)}) VALUES ({', '.join(vals)})"
            cur.execute(sql, tuple(params))
            conn.commit()
            return cur.lastrowid
    finally:
        conn.close()



def get_conciliacion_by_id(id_conciliacion: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # ============================
            # 1) Datos principales
            # ============================
            query = (
                "SELECT "
                "  c.id_conciliacion AS id, "
                "  c.expediente, "
                "  c.expediente_format, "
                "  au.id_competencia, "
                "  au.id_ciudad, "
                "  c.created_at, "
                "  c.fecha_emision_expediente, "
                "  c.code, "
           
                "  c.abogado_contrario, "
                "  c.id_user_created, "
                "  c.id_user_updated, "
                "  c.updated_at, "
                "  c.id_conciliacion_status, "
                "  ds.status, "
                "  c.active, "
                "  u.name as nombre_usuario, "
                "  c.nombre_trabajador, "
                "  c.tipo_notificado, "
                "  c.tipo_notificado_actuario, "
                "  c.fecha_notificacion, "
                "  c.id_objeto, "
                "  obj.nombre as nombre_objeto, "
                "emp.cliente_directo AS cliente_directo_empresa, "
                "  emp.nombre AS nombre_empresa, "
                " emp.nombre_contacto AS nombre_corresponsal_empresa, "
                " emp.correo AS correo_empresa, "
                " emp.celular AS celular_empresa, "
                "  com.nombre AS nombre_competencia, "
                "  ci.nombre AS nombre_ciudad, "
                "  e.nombre AS nombre_estado, "
                "  e.id_estado AS id_estado, "
                "  au.nombre AS nombre_autoridad, "
                " c.id_medio_notificacion, "
                " mn.nombre AS medio_notificacion, "
                " ic.nombre as nombre_identificador,"
                " au.id_autoridad, "
                " c.id_agenda, "
             
        
                "  c.id_empresa, "
                "  c.fecha_egreso, "
                "  c.salario_diario, "
                "  c.motivo_salida, "
                "  c.fecha_ingreso, "
                "  c.propuesta_patron, "
                "  ca.id_conciliacion_audiencia AS id_ultima_audiencia, "
                "  c.fecha_proxima_audiencia AS fecha_proxima_audiencia,"
                "  c.fecha_audiencia_inicial AS fecha_audiencia_inicial "
                "FROM conciliacion c "
                " LEFT JOIN conciliacion_status ds "
                "  ON c.id_conciliacion_status = ds.id_conciliacion_status "
                "left join medio_notificacion mn on mn.id_medio_notificacion = c.id_medio_notificacion "
           
                "LEFT JOIN autoridades au "
                "  ON au.id_autoridad = c.id_autoridad "
                "LEFT JOIN ciudades ci "
                "  ON ci.id_ciudad = au.id_ciudad "
                "LEFT JOIN estados e "
                "  ON e.id_estado = ci.id_estado "
                "LEFT JOIN competencias com "
                "  ON com.id_competencia = au.id_competencia "
                " left join identificacion_ciudad ic on ic.id_ciudad = au.id_ciudad and ic.id_competencia = au.id_competencia "
                "LEFT JOIN empresas emp "
                "  ON emp.id_empresa = c.id_empresa "
                "LEFT JOIN objetos obj ON obj.id_objeto = c.id_objeto "
                "LEFT JOIN users u ON u.id_user = c.id_user_created "
                "LEFT JOIN conciliacion_audiencia ca "
                "  ON ca.id_conciliacion = c.id_conciliacion "
                " AND ca.id_conciliacion_audiencia = ( "
                "       SELECT MAX(ca2.id_conciliacion_audiencia) "
                "       FROM conciliacion_audiencia ca2 "
                "       WHERE ca2.id_conciliacion = c.id_conciliacion "
                "  ) "
                "WHERE c.id_conciliacion = %s "
                "LIMIT 1"
            )

            cur.execute(query, (id_conciliacion,))
            row = cur.fetchone()
            if not row:
                return None

            cols = [d[0] for d in cur.description]
            conciliacion = dict(zip(cols, row))

            # ============================
            # 2) Lista de razones sociales
            #    (conciliacion_empresas + razon_social)
            # ============================
            id_conciliacion = conciliacion.get("id")
            id_empresa = conciliacion.get("id_empresa")

            if id_conciliacion and id_empresa:
                razones_query = (
                    "SELECT "
                    "  ce.id_conciliacion_empresa AS id, "
                    "  ce.id_razon_social, "
                    "  rs.nombre AS razon_social "
                    "FROM conciliacion_empresas ce "
                    "LEFT JOIN empresas_razon_social rs "
                    "  ON rs.id_empresa_razon_social = ce.id_razon_social "
                    "WHERE ce.id_conciliacion = %s AND ce.id_empresa = %s and ce.active = 1"
                )

                cur.execute(razones_query, (id_conciliacion, id_empresa))
                razones_rows = cur.fetchall()

                razones_sociales: List[Dict[str, Any]] = []
                for r in razones_rows:
                    razones_sociales.append(
                        {
                            "id": r[0],
                            "id_razon_social": r[1],
                            "razon_social": r[2],
                        }
                    )
            else:
                razones_sociales = []

            conciliacion["razones_sociales"] = razones_sociales

            return conciliacion
    finally:
        conn.close()
def update_conciliacion_basic(
    *,
    id_conciliacion: int,
    data: Dict[str, Any],
    id_user_updated: int,
    conn=None,
) -> Tuple[int, Optional[str]]:
    """
    - Si conn viene, usa MISMA conexión y NO hace commit/close.
    - Si conn NO viene, abre conexión propia y hace commit/close.
    """
    print("start:")
    print(data)
    
    payload = _sanitize_conciliacion_basic(data)
    print(payload)
    if not payload:
        return 0, None

    new_expediente_format: Optional[str] = None

    raw_exp = payload.get("expediente")
    if raw_exp not in (None, ""):
        exp_format = _build_expediente_format(raw_exp)
        payload["expediente"] = str(raw_exp).strip().upper()
        payload["expediente_format"] = exp_format
        new_expediente_format = exp_format

    owns_conn = conn is None
    if owns_conn:
        conn = get_connection()

    try:
        with conn.cursor() as cur:
            sets, params = [], []
            for k, v in payload.items():
                sets.append(f"{k}=%s")
                params.append(v)

            sets.append("id_user_updated=%s")
            params.append(int(id_user_updated))
            sets.append("updated_at=NOW()")

            params.append(int(id_conciliacion))

            sql = f"UPDATE conciliacion SET {', '.join(sets)} WHERE id_conciliacion=%s"
            print(sql)
            cur.execute(sql, tuple(params))

            # audit: MISMA conexión
            cur.execute(
                """
                INSERT INTO audit_log
                    (action, changes, datetime, id_user, id_modulo, id_key, message)
                VALUES
                    ('UPDATE', %s, NOW(), %s, 1, %s, %s)
                """,
                (
                    json.dumps(payload, default=str),
                    int(id_user_updated),
                    int(id_conciliacion),
                    f"Actualización conciliación {payload.get('expediente','')}",
                ),
            )

        if owns_conn:
            conn.commit()

        return cur.rowcount, new_expediente_format

    finally:
        if owns_conn:
            conn.close()     

def set_conciliacion_id_agenda_conn(conn, *, id_conciliacion: int, id_agenda: int, id_user: int) -> None:
    """
    Asigna conciliacion.id_agenda dentro de una transacción externa.
    NO cierra conn. NO hace commit.
    """
    sql = """
    UPDATE conciliacion
    SET id_agenda = %s,
        id_user_updated = %s,
        updated_at = NOW()
    WHERE id_conciliacion = %s
    """
    with conn.cursor() as cur:
        cur.execute(sql, (id_agenda, id_user, id_conciliacion))

def disable_conciliacion_empresas_all(
    *,
    id_conciliacion: int,
    id_user_updated: int,
    conn,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE conciliacion_empresas
            SET active=0, updated_at=NOW(), id_user_updated=%s
            WHERE id_conciliacion=%s
            """,
            (id_user_updated, id_conciliacion),
        )

import datetime
from typing import Any, Dict

def create_historial_update_conciliacion(
    *,
    conn,
    id_conciliacion: int,
    data: Dict[str, Any],
    id_user: int,
) -> None:
    """
    UPDATE:
    - Crea eventos solo si esos campos vienen en el payload (y no están vacíos)
    - Requiere conn porque add_historial_event lo exige
    """
    fecha_emision = data.get("fecha_emision_expediente")
    fecha_notificacion = data.get("fecha_notificacion")
    fecha_audiencia = data.get("fecha_audiencia")

    if fecha_emision:
        add_historial_event(
            conn=conn,
            id_conciliacion=id_conciliacion,
            fecha=fecha_emision,
            titulo="Actualización de emisión de expediente",
            descripcion="Se actualizó la fecha de emisión del expediente.",
            tipo_evento="EXPEDIENTE",
            tabla_origen="conciliacion",
            id_origen=id_conciliacion,
            id_user=id_user,
        )

    if fecha_notificacion:
        add_historial_event(
            conn=conn,
            id_conciliacion=id_conciliacion,
            fecha=fecha_notificacion,
            titulo="Actualización de notificación",
            descripcion="Se actualizó la fecha y hora de notificación del citatorio.",
            tipo_evento="NOTIFICACION",
            tabla_origen="conciliacion",
            id_origen=id_conciliacion,
            id_user=id_user,
        )

    if fecha_audiencia:
        add_historial_event(
            conn=conn,
            id_conciliacion=id_conciliacion,
            fecha=fecha_audiencia,
            titulo="Actualización de audiencia",
            descripcion="Se actualizó la fecha y hora de la audiencia prejudicial.",
            tipo_evento="AUDIENCIA",
            tabla_origen="conciliacion_audiencia",
            id_origen=None,
            id_user=id_user,
        )

    # evento general (siempre)
    add_historial_event(
        conn=conn,
        id_conciliacion=id_conciliacion,
        fecha=datetime.now(),
        titulo="Actualización en sistema",
        descripcion="Se actualizaron datos generales del expediente.",
        tipo_evento="SISTEMA",
        tabla_origen="conciliacion",
        id_origen=id_conciliacion,
        id_user=id_user,
    )

def update_conciliacion(*, id_conciliacion: int, data: Dict[str, Any], id_user_updated: int) -> int:
    payload = _sanitize_conciliacion(data)
    if not payload: return 0
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            sets, params = [], []
            for k, v in payload.items():
                sets.append(f"{k}=%s"); params.append(v)
            sets.append("id_user_updated=%s"); params.append(id_user_updated)
            sets.append("updated_at=NOW()")
            params.append(id_conciliacion)

            sql = f"UPDATE conciliacion SET {', '.join(sets)} WHERE id_conciliacion=%s"
            cur.execute(sql, tuple(params))
            conn.commit()
            return cur.rowcount
    finally:
        conn.close()

def soft_delete_conciliacion(id_conciliacion: int, *, id_user: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE conciliacion SET active=0, id_user_updated=%s, updated_at=NOW() WHERE id_conciliacion=%s",
                (id_user, id_conciliacion),
            )
            conn.commit()
            return cur.rowcount
    finally:
        conn.close()

def list_conciliacion(**kwargs) -> Dict[str, Any]:
    return _query_conciliacion(**kwargs)
def cards_conciliacion(**kwargs) -> Dict[str, Any]:
    return _query_conciliacion(**kwargs)
def cards_conciliacion_multi(**kwargs):
    return _query_conciliacion_multi(**kwargs)

# ====== Documentos ======
BASE_DIR = Path(__file__).resolve().parents[2]
CONCIL_UPLOAD_DIR = BASE_DIR / "uploads" / "conciliaciones"
CONCIL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def _ensure_dir_for_conciliacion(id_conciliacion: int) -> Path:
    p = CONCIL_UPLOAD_DIR / str(id_conciliacion)
    p.mkdir(parents=True, exist_ok=True)
    return p
from typing import Optional
from pathlib import Path
from datetime import datetime
import shutil
import hashlib
def add_documento_conciliacion(
    *,
    id_conciliacion: int,
    id_tipo_documento: int,
    filename: str,
    fileobj,
    id_user: int,
    conn,  # <-- viene del router (MISMA conexión)
) -> dict:
    # =========================
    # 0) ASEGURAR CONEXIÓN VÁLIDA
    # =========================
    # El error 'NoneType' object has no attribute 'cursor' ocurre cuando:
    # - conn llega como None, o
    # - llega como PooledMySQLConnection ya "cerrada" (su _cnx queda en None).
    close_conn = False
    if conn is None:
        conn = get_connection()
        close_conn = True
    else:
        # Caso mysql.connector.pooling.PooledMySQLConnection con _cnx == None
        try:
            if getattr(conn, "_cnx", "OK") is None:
                conn = get_connection()
                close_conn = True
        except Exception:
            conn = get_connection()
            close_conn = True

        # Si es una conexión real pero desconectada, intenta reconectar
        try:
            if hasattr(conn, "is_connected") and not conn.is_connected():
                if hasattr(conn, "reconnect"):
                    conn.reconnect(attempts=1, delay=0)
        except Exception:
            conn = get_connection()
            close_conn = True

    # =========================
    # 0) OBTENER id_conciliacion DESDE expediente
    # =========================
    # (tu código ya recibe id_conciliacion, aquí no hacía nada real; se deja el bloque)
    try:
        pass
    except Exception:
        raise

    # =========================
    # 1) RUTAS Y ARCHIVO
    # =========================
    folder = _ensure_dir_for_conciliacion(id_conciliacion)
    # carpeta para previews: uploads/conciliaciones/{id_conciliacion}/previews
    preview_folder = folder / "previews"
    preview_folder.mkdir(parents=True, exist_ok=True)

    ts_ms = int(datetime.timestamp(datetime.utcnow()) * 1000)
    ext = Path(filename).suffix.lower() or ".bin"
    new_name = f"{ts_ms}{ext}"
    dest = folder / new_name

    # === GUARDAR ARCHIVO ORIGINAL (NO SE TOCA) ===
    with open(dest, "wb") as f:
        shutil.copyfileobj(fileobj, f)

    size_bytes = dest.stat().st_size
    sha256 = hashlib.sha256(dest.read_bytes()).hexdigest()

    # ===================================
    # NORMALIZAR A PDF
    # ===================================
    # dest  -> archivo original (docx, jpg, pdf, etc.)
    # pdf_path -> archivo PDF que usará TODO el sistema
    if ext == ".pdf":
        pdf_path = dest
        pdf_name = new_name  # mismo nombre que el original
    else:
        # aquí decides el nombre del PDF normalizado
        pdf_name = f"{ts_ms}.pdf"
        pdf_path = folder / pdf_name

        # TODO: implementar esta función según tu stack (LibreOffice, un servicio, etc.)
        convertir_a_pdf_or_throw(src_path=dest, dst_path=pdf_path)

    # ===================================
    # COMPRIMIR PDF FINAL (IN-PLACE, MISMO NOMBRE)
    # - NO cambia pdf_name ni pdf_path
    # - Si falla, sigue con el PDF original
    # ===================================
    try:
        from ..utils.comprimir import compress_pdf_inplace
        compress_pdf_inplace(pdf_path, quality="ebook")
    except Exception as e:
        print(f"WARN compresión PDF conciliación {id_conciliacion}: {e}")

    # ===================================
    # GENERAR PREVIEWS SIEMPRE DESDE PDF
    # ===================================
    preview_urls: list[str] = []
    preview_url_principal: Optional[str] = None

    try:
        pages = convert_from_path(str(pdf_path), dpi=150)
        for idx, page in enumerate(pages, start=1):
            # nombre: {timestamp}_page_1.jpg, {timestamp}_page_2.jpg, ...
            preview_name = f"{ts_ms}_page_{idx}.jpg"
            preview_path = preview_folder / preview_name

            page.save(preview_path, "JPEG")

            # URL pública (ajusta si tu configuración de static cambia)
            url = f"/uploads/conciliaciones/{id_conciliacion}/previews/{preview_name}"
            preview_urls.append(url)

        if preview_urls:
            preview_url_principal = preview_urls[0]
    except Exception as e:
        print(f"Error generando previews PDF para conciliación {id_conciliacion}: {e}")
        preview_urls = []
        preview_url_principal = None

    # =========================
    # 2) INSERTS EN BD
    # =========================
    try:
        with conn.cursor() as cur:
            # === INSERT EN conciliacion_documentos (YA SIN preview_url) ===
            cur.execute(
                """
                INSERT INTO conciliacion_documentos
                    (
                        id_conciliacion,
                        id_conciliacion_tipo_documento,
                        updated_at,
                        created_at,
                        id_user_updated,
                        id_user_created,
                        path,
                        active
                    )
                VALUES
                    (%s, %s, NOW(), NOW(), %s, %s, %s, 1)
                """,
                (
                    id_conciliacion,
                    id_tipo_documento,
                    id_user,
                    id_user,
                    pdf_name,  # ← SIEMPRE el archivo PDF normalizado
                ),
            )

            new_id = cur.lastrowid

            # === INSERT DE TODAS LAS PÁGINAS EN conciliacion_documentos_preview ===
            if preview_urls:
                rows = [
                    # path, num_page, id_conciliacion_documento
                    (url, str(idx + 1), new_id)
                    for idx, url in enumerate(preview_urls)
                ]
                cur.executemany(
                    """
                    INSERT INTO conciliacion_documentos_preview
                        (path, num_page, id_conciliacion_documento)
                    VALUES
                        (%s, %s, %s)
                    """,
                    rows,
                )

        # Si esta función abrió su propia conexión, aquí sí commit.
        if close_conn:
            conn.commit()
    finally:
        if close_conn:
            try:
                conn.close()
            except Exception:
                pass

    return {
        "id_conciliacion_documento": new_id,
        "id_conciliacion": id_conciliacion,
        "id_conciliacion_tipo_documento": id_tipo_documento,
        "path": new_name,
        "size_bytes": size_bytes,
        "sha256": sha256,
        "url": f"/uploads/conciliaciones/{id_conciliacion}/{new_name}",
        # primera página por si la quieres seguir usando en el frontend
        "preview_url": preview_url_principal,
        # todas las páginas generadas
        "preview_urls": preview_urls,
    }

def list_documentos_conciliacion(id_conciliacion: str) -> Dict[str, Any]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:

            # No existe la conciliación para ese expediente
            cur.execute(
                    """
                    SELECT
                        id_conciliacion_tipo_documento AS id,
                        nombre,
           
                        active
                    FROM conciliacion_tipo_documentos
                    WHERE active = 1
                    ORDER BY nombre
                    """
            )
            tipos_documentos = cur.fetchall()
       

            # =========================
            # 1) TRAER DOCUMENTOS
            # =========================
            cur.execute(
                """
                SELECT
                    cd.id_conciliacion_documento AS id,
                    cd.id_conciliacion,
                    cd.id_conciliacion_tipo_documento AS id_conciliacion_tipo_documento,
                    cd.path,
                    cd.created_at,
                    cd.updated_at,
                    cd.id_user_created,
                    cd.id_user_updated,
                    tp.nombre,
           
                    cd.active
                FROM conciliacion_documentos cd 
                LEFT JOIN conciliacion_tipo_documentos tp 
                    ON tp.id_conciliacion_tipo_documento = cd.id_conciliacion_tipo_documento
                WHERE cd.id_conciliacion = %s
                  AND cd.active = 1
                ORDER BY cd.created_at DESC
                """,
                (id_conciliacion,),
            )
            documentos = cur.fetchall()

            if not documentos:
                # Aun así devolvemos tipos_documentos para llenar el select
                cur.execute(
                    """
                    SELECT
                        id_conciliacion_tipo_documento AS id,
                        nombre,
                 
                        active
                    FROM conciliacion_tipo_documentos
                    WHERE active = 1
                    ORDER BY nombre
                    """
                )
                tipos_documentos = cur.fetchall()

                return {
                    "id_conciliacion": id_conciliacion,
                    "count": 0,
                    "items": [],
                    "tipos_documentos": tipos_documentos,
                }

            # Mapa: id_doc -> id_conciliacion (para armar bien la URL del preview)
            doc_conc_map: Dict[int, int] = {
                doc["id"]: doc["id_conciliacion"] for doc in documentos
            }

            # =========================
            # 2) TRAER PREVIEWS
            # =========================
            ids_docs = [doc["id"] for doc in documentos]
            placeholders = ",".join(["%s"] * len(ids_docs))

            cur.execute(
                f"""
                SELECT
                    id_conciliacion_documento AS id_doc,
                    num_page,
                    path
                FROM conciliacion_documentos_preview
                WHERE id_conciliacion_documento IN ({placeholders})
                ORDER BY num_page ASC
                """,
                ids_docs,
            )
            previews = cur.fetchall()

            previews_map: Dict[int, List[Dict[str, Any]]] = {}
            for p in previews:
                doc_id = p["id_doc"]
                filename = p["path"]  # aquí solo viene "0e842d....jpg" o a veces ya URL
                num_page = int(p["num_page"])

                # Id de conciliación del documento
                conc_id = doc_conc_map.get(doc_id)

                # Si path YA es una URL completa (comienza con /uploads), la respetamos
                if isinstance(filename, str) and filename.startswith("/uploads/"):
                    url = filename
                else:
                    # Construimos la URL completa: /uploads/conciliaciones/{id}/previews/{filename}
                    url = f"/uploads/conciliaciones/{conc_id}/previews/{filename}"

                previews_map.setdefault(doc_id, []).append(
                    {
                        "page": num_page,
                        "url": url,
                    }
                )

            # =========================
            # 3) INYECTAR PREVIEWS EN CADA DOCUMENTO
            # =========================
            for doc in documentos:
                doc_id = doc["id"]
                doc["previews"] = previews_map.get(doc_id, [])

            # =========================
            # 4) TRAER TIPOS DE DOCUMENTO (SELECT DEL MODAL)
            # =========================
            cur.execute(
                """
                SELECT
                    id_conciliacion_tipo_documento AS id,
                    nombre,
        
                    active
                FROM conciliacion_tipo_documentos
                WHERE active = 1
                ORDER BY nombre
                """
            )
            tipos_documentos = cur.fetchall()

            # =========================
            # 5) RESPUESTA UNIFICADA
            # =========================
            return {
                "id_conciliacion": id_conciliacion,
                "count": len(documentos),
                "items": documentos,
                "tipos_documentos": tipos_documentos,
            }

    finally:
        conn.close()

from pathlib import Path
from typing import Any, Dict, Optional, Tuple

CHECKLIST_TIPO_ID = 2  # ← ajusta si usas otro id

def get_conciliacion_export_data(expediente_format: str) -> Tuple[Dict[str, Any], Optional[Dict[str, Any]]]:
    """
    Regresa:
      - detalle del expediente (un dict)
      - documento de checklist prejudicial (dict) o None si no existe.
    """
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            # 1) EXPEDIENTE
            cur.execute(
                "SELECT "
                "  c.id_conciliacion AS id, "
                "  c.expediente, "
                "  c.expediente_format, "
                "  au.id_competencia, "
                "  au.id_ciudad, "
                "  c.created_at, "
                "  c.fecha_emision_expediente, "
                "  c.code, "
          
                "  c.abogado_contrario, "
                "  c.id_user_created, "
                "  c.id_user_updated, "
                "  c.updated_at, "
                "  c.id_conciliacion_status, "
                "  ds.status, "
                "  c.active, "
                "  u.name as nombre_usuario, "
                "  c.nombre_trabajador, "
                "  c.tipo_notificado, "
                "  c.tipo_notificado_actuario, "
                "  c.fecha_notificacion, "
                "  c.id_objeto, "
                "  obj.nombre as nombre_objeto, "
                "  emp.nombre AS nombre_empresa, "
                "  com.nombre AS nombre_competencia, "
                "  ci.nombre AS nombre_ciudad, "
                "  e.nombre AS nombre_estado, "
                "  au.nombre AS nombre_autoridad, "
   
                "  c.id_empresa, "
                "  c.fecha_egreso, "
                "  c.salario_diario, "
                "  c.motivo_salida, "
                "  c.fecha_ingreso, "
                "  c.propuesta_patron, "
                "  ca.id_conciliacion_audiencia AS id_ultima_audiencia, "
                "  c.fecha_proxima_audiencia AS fecha_proxima_audiencia "
                "FROM conciliacion c "
                "LEFT JOIN conciliacion_status ds "
                "  ON c.id_conciliacion_status = ds.id_conciliacion_status "
    
                "LEFT JOIN autoridades au "
                "  ON au.id_autoridad = c.id_autoridad "
                "LEFT JOIN ciudades ci "
                "  ON ci.id_ciudad = au.id_ciudad "
                "LEFT JOIN estados e "
                "  ON e.id_estado = ci.id_estado "
                "LEFT JOIN competencias com "
                "  ON com.id_competencia = au.id_competencia "
                "LEFT JOIN empresas emp "
                "  ON emp.id_empresa = c.id_empresa "
                "LEFT JOIN objetos obj ON obj.id_objeto = c.id_objeto "
                "LEFT JOIN users u ON u.id_user = c.id_user_created "
                "LEFT JOIN conciliacion_audiencia ca "
                "  ON ca.id_conciliacion = c.id_conciliacion "
                " AND ca.id_conciliacion_audiencia = ( "
                "       SELECT MAX(ca2.id_conciliacion_audiencia) "
                "       FROM conciliacion_audiencia ca2 "
                "       WHERE ca2.id_conciliacion = c.id_conciliacion "
                "  ) "
                " WHERE c.expediente_format = %s AND "
                " c.active = 1 ",
                       (expediente_format,),
            )
            
        
            detalle = cur.fetchone()
            if not detalle:
                raise ValueError("No se encontró el expediente")

            id_conciliacion = detalle["id"]
            id_empresa = detalle.get("id_empresa")

            # 2) RAZONES SOCIALES
            razones_sociales: List[Dict[str, Any]] = []
            if id_empresa:
                cur.execute(
                    """
                    SELECT
                        ce.id_conciliacion_empresa AS id,
                        ce.id_razon_social,
                        rs.nombre AS razon_social
                    FROM conciliacion_empresas ce
                    LEFT JOIN empresas_razon_social rs
                        ON rs.id_empresa_razon_social = ce.id_razon_social
                    WHERE ce.id_conciliacion = %s
                      AND ce.id_empresa = %s
                    """,
                    (id_conciliacion, id_empresa),
                )
                razones_sociales = cur.fetchall()

            detalle["razones_sociales"] = razones_sociales

            # 3) CHECKLIST PREJUDICIAL (último activo)
            cur.execute(
                """
                SELECT
                    cd.id_conciliacion_documento AS id,
                    cd.id_conciliacion,
                    cd.id_conciliacion_tipo_documento AS id_conciliacion_tipo_documento,
                    cd.path,
                    cd.created_at,
                    cd.active
                FROM conciliacion_documentos cd
                WHERE cd.id_conciliacion = %s
                  AND cd.id_conciliacion_tipo_documento = %s
                  AND cd.active = 1
                ORDER BY cd.created_at DESC
                LIMIT 1
                """,
                (id_conciliacion, CHECKLIST_TIPO_ID),
            )
            checklist = cur.fetchone()  # puede ser None

            return detalle, checklist

    finally:
        conn.close()
def get_documento_conciliacion(id_conciliacion_documento: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute("SELECT * FROM conciliacion_documentos WHERE id_conciliacion_documento=%s",(id_conciliacion_documento,))
            return cur.fetchone()
    finally:
        conn.close()

def update_documento_conciliacion(*, id_conciliacion_documento: int, id_tipo_documento: Optional[int], id_user: int) -> int:
    sets, params = [], []
    if id_tipo_documento is not None:
        sets.append("id_conciliacion_tipo_documento=%s"); params.append(int(id_tipo_documento))
    if not sets: return 0
    sets.append("id_user_updated=%s"); params.append(id_user)
    sets.append("updated_at=NOW()")
    params.append(id_conciliacion_documento)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(f"UPDATE conciliacion_documentos SET {', '.join(sets)} WHERE id_conciliacion_documento=%s", tuple(params))
            conn.commit()
            return cur.rowcount
    finally:
        conn.close()

def soft_delete_documento_conciliacion(*, id_conciliacion_documento: int, id_user: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE conciliacion_documentos SET active=0, id_user_updated=%s, updated_at=NOW() WHERE id_conciliacion_documento=%s",
                (id_user, id_conciliacion_documento),
            )
            conn.commit()
            return cur.rowcount
    finally:
        conn.close()

def resolve_document_path(*, id_conciliacion: int, filename: str) -> Path:
    return (CONCIL_UPLOAD_DIR / str(id_conciliacion) / filename).resolve()
# ================== NOTIFICACIONES ==================
def create_conciliacion_notificacion(
    *,
    id_conciliacion: int,
    id_user: int,
    fecha_notificacion: Optional[str] = None,
) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            if fecha_notificacion:
                cur.execute(
                    """
                    INSERT INTO conciliacion_notificaciones
                        (id_conciliacion, fecha_notificacion, enviado, visto, aceptado,
                         fecha_enviada, fecha_vista, fecha_aceptada, id_user)
                    VALUES
                        (%s, %s, 0, 0, 0, NULL, NULL, NULL, %s)
                    """,
                    (id_conciliacion, fecha_notificacion, id_user),
                )
            else:
                cur.execute(
                    """
                    INSERT INTO conciliacion_notificaciones
                        (id_conciliacion, fecha_notificacion, enviado, visto, aceptado,
                         fecha_enviada, fecha_vista, fecha_aceptada, id_user)
                    VALUES
                        (%s, NOW(), 0, 0, 0, NULL, NULL, NULL, %s)
                    """,
                    (id_conciliacion, id_user),
                )
            conn.commit()
            return cur.lastrowid
    finally:
        conn.close()

def get_conciliacion_notificacion(id_conciliacion_notificacion: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT * FROM conciliacion_notificaciones WHERE id_conciliacion_notificacion=%s",
                (id_conciliacion_notificacion,),
            )
            return cur.fetchone()
    finally:
        conn.close()

def list_conciliacion_notificaciones(id_conciliacion: int) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                """
                SELECT * FROM conciliacion_notificaciones
                WHERE id_conciliacion=%s
                ORDER BY id_conciliacion_notificacion DESC
                """,
                (id_conciliacion,),
            )
            return cur.fetchall()
    finally:
        conn.close()

def mark_notificacion_enviada(*, id_conciliacion_notificacion: int, id_user: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE conciliacion_notificaciones
                SET enviado=1, fecha_enviada=NOW(), id_user=%s
                WHERE id_conciliacion_notificacion=%s
                """,
                (id_user, id_conciliacion_notificacion),
            )
            conn.commit()
            return cur.rowcount
    finally:
        conn.close()

def mark_notificacion_vista(*, id_conciliacion_notificacion: int, id_user: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE conciliacion_notificaciones
                SET visto=1, fecha_vista=NOW(), id_user=%s
                WHERE id_conciliacion_notificacion=%s
                """,
                (id_user, id_conciliacion_notificacion),
            )
            conn.commit()
            return cur.rowcount
    finally:
        conn.close()

def mark_notificacion_aceptada(*, id_conciliacion_notificacion: int, id_user: int) -> int:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE conciliacion_notificaciones
                SET aceptado=1, fecha_aceptada=NOW(), id_user=%s
                WHERE id_conciliacion_notificacion=%s
                """,
                (id_user, id_conciliacion_notificacion),
            )
            conn.commit()
            return cur.rowcount
    finally:
        conn.close()


def list_audiencias_by_conciliacion(id_conciliacion: str) -> List[Dict[str, Any]]:
    # Helper interno para mapear status → resultado legible para el front
    def _map_status_to_resultado(
        status: Optional[int],
        motivo_archivo: Optional[str],
        incomparecencia: Optional[Dict[str, Any]],
    ) -> str:
        """
        Ajusta los IDs a los que tengas realmente en tu tabla conciliacion_status.
        Ejemplo típico:
          2 = convenio
          3 = diferimiento
          4 = archivo solicitante
          5 = archivo patrón
          6 = no conciliación
        """
        if status == 2:
            return "convenio"
        if status == 3:
            return "diferimiento"
        if status == 6:
            return "no_conciliacion"
        if status == 4:
            return "archivo_solicitante"
        if status == 5:
            return "archivo_patron"
        if status == 7:
            return "convenio"

        if incomparecencia:
            return "incomparecencia"

        return "desconocido"

    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:

            # 1) AUDIENCIAS + RESUMEN DE OBJETO DE RECLAMACIÓN
            cur.execute(
                """
                SELECT
                  ca.id_conciliacion_audiencia AS id,
                  ca.id_conciliacion,
                  ca.updated_at,
                  ca.active,
                  ca.created_at,
                  ca.id_user_created,
                  ca.id_user_updated,
                  ca.id_conciliacion_status,
                  ca.riesgos,
                  ca.num_audiencia,
                  ca.fecha_audiencia,
                  ca.id_conciliacion_documento,
                  ca.id_constancia_documento,
                  ca.is_constancia_documento,
                  a.nombre AS nombre_abogado,
                  ca.id_abogado,
                  ca.motivo_archivo,
                  ca.fecha_proxima_audiencia,

                  -- Objeto de reclamación (1 a 1 con la audiencia)
                  o.id_conciliacion_audiencia_objeto_reclamacion AS id_objeto_reclamacion,
                  o.pretension_trabajador,
                  o.propuesta_final_trabajador,
                  o.propuesta_final_patron

                FROM conciliacion_audiencia ca
                JOIN conciliacion c
                  ON c.id_conciliacion = ca.id_conciliacion
                 AND c.active = 1
                LEFT JOIN conciliacion_audiencia_objeto_reclamacion o
                  ON o.id_conciliacion_audiencia = ca.id_conciliacion_audiencia
                LEFT JOIN abogados a
                  ON a.id_abogado = ca.id_abogado
                WHERE c.id_conciliacion = %s
                  AND ca.active = 1
                ORDER BY ca.id_conciliacion_audiencia ASC
                """,
                (id_conciliacion,),
            )

            audiencias = cur.fetchall()
       
            if not audiencias:
                return []

            ids_aud = [row["id"] for row in audiencias]
            placeholders_aud = ",".join(["%s"] * len(ids_aud))

            # ------------------------------------------------------------------
            # 2) PRESTACIONES (tabla dinámica) -> por id_objeto_reclamacion
            # ------------------------------------------------------------------
            objeto_ids = [
                row["id_objeto_reclamacion"]
                for row in audiencias
                if row.get("id_objeto_reclamacion") is not None
            ]

            prestaciones_por_objeto: Dict[int, List[Dict[str, Any]]] = {}
            if objeto_ids:
                placeholders_obj = ",".join(["%s"] * len(objeto_ids))
                cur.execute(
                    f"""
                    SELECT
                      id_conciliacion_audiencia_objeto_reclamacion,
                      prestacion,
                      monto
                    FROM conciliacion_audiencia_prestaciones
                    WHERE id_conciliacion_audiencia_objeto_reclamacion IN ({placeholders_obj})
                    """,
                    objeto_ids,
                )
                for r in cur.fetchall():
                    oid = r["id_conciliacion_audiencia_objeto_reclamacion"]
                    prestaciones_por_objeto.setdefault(oid, []).append(
                        {
                            "prestacion": r["prestacion"],
                            "monto": r["monto"],
                        }
                    )

            # ------------------------------------------------------------------
            # 3) CONVENIO: TODOS LOS PAGOS REGISTRADOS PARA CADA AUDIENCIA
            # ------------------------------------------------------------------
            convenios: Dict[int, List[Dict[str, Any]]] = {}
            cur.execute(
                f"""
                SELECT
                  cac.id_conciliacion_audiencia,
                  cac.monto,
                  cac.id_forma_pago,
                  cac.fecha_pago,
                  cac.tipo_pago
                FROM conciliacion_audiencia_convenio cac
                WHERE cac.id_conciliacion_audiencia IN ({placeholders_aud})
                """,
                ids_aud,
            )
            for r in cur.fetchall():
                aid = r["id_conciliacion_audiencia"]
                convenios.setdefault(aid, []).append(
                    {
                        "monto": r["monto"],
                        "id_forma_pago": r["id_forma_pago"],
                        "fecha_pago": r["fecha_pago"],
                        "tipo_pago": r["tipo_pago"],
                    }
                )

            # ------------------------------------------------------------------
            # 4) INCOMPARECENCIA / ARCHIVO
            # ------------------------------------------------------------------
            incomparecencias: Dict[int, Dict[str, Any]] = {}
            cur.execute(
                f"""
                SELECT
                  id_conciliacion_audiencia,
                  patron,
                  motivo_constancia
                FROM conciliacion_audiencia_incomparecencia
                WHERE id_conciliacion_audiencia IN ({placeholders_aud})
                  AND active = 1
                """,
                ids_aud,
            )
            for r in cur.fetchall():
                incomparecencias[r["id_conciliacion_audiencia"]] = {
                    "patron": r["patron"],
                    "motivo_constancia": r["motivo_constancia"],
                }

            # ------------------------------------------------------------------
            # 5) DOCUMENTOS (principal + constancia) + PREVIEWS
            # ------------------------------------------------------------------
            doc_ids: List[int] = []
            for row in audiencias:
                if row.get("id_conciliacion_documento"):
                    doc_ids.append(int(row["id_conciliacion_documento"]))
                if row.get("id_constancia_documento"):
                    doc_ids.append(int(row["id_constancia_documento"]))

            documentos_map: Dict[int, Dict[str, Any]] = {}
            previews_map: Dict[int, List[Dict[str, Any]]] = {}

            if doc_ids:
                # eliminar duplicados
                doc_ids = list({d for d in doc_ids})
                placeholders_docs = ",".join(["%s"] * len(doc_ids))

                # 5.1 Documentos
                cur.execute(
                    f"""
                    SELECT
                        cd.id_conciliacion_documento AS id,
                        cd.id_conciliacion,
                        cd.id_conciliacion_tipo_documento AS id_conciliacion_tipo_documento,
                        cd.path,
                        cd.created_at,
                        cd.updated_at,
                        cd.id_user_created,
                        cd.id_user_updated,
                        cd.active,
                        tp.nombre
                    FROM conciliacion_documentos cd
                    LEFT JOIN conciliacion_tipo_documentos tp
                      ON tp.id_conciliacion_tipo_documento = cd.id_conciliacion_tipo_documento
                    WHERE cd.id_conciliacion_documento IN ({placeholders_docs})
                      AND cd.active = 1
                    """,
                    doc_ids,
                )
                documentos = cur.fetchall()

                doc_conc_map: Dict[int, int] = {}
                for d in documentos:
                    documentos_map[d["id"]] = {
                        "id": d["id"],
                        "id_conciliacion": d["id_conciliacion"],
                        "id_conciliacion_tipo_documento": d["id_conciliacion_tipo_documento"],
                        "path": d["path"],
                        "created_at": d["created_at"],
                        "updated_at": d["updated_at"],
                        "id_user_created": d["id_user_created"],
                        "id_user_updated": d["id_user_updated"],
                        "active": d["active"],
                        "nombre": d["nombre"],
                    }
                    doc_conc_map[d["id"]] = d["id_conciliacion"]

                # 5.2 Previews
                cur.execute(
                    f"""
                    SELECT
                        id_conciliacion_documento AS id_doc,
                        num_page,
                        path
                    FROM conciliacion_documentos_preview
                    WHERE id_conciliacion_documento IN ({placeholders_docs})
                    ORDER BY num_page ASC
                    """,
                    doc_ids,
                )
                previews = cur.fetchall()

                for p in previews:
                    doc_id = p["id_doc"]
                    filename = p["path"]
                    num_page = int(p["num_page"])
                    conc_id = doc_conc_map.get(doc_id)

                    if isinstance(filename, str) and filename.startswith("/uploads/"):
                        url = filename
                    else:
                        url = f"/uploads/conciliaciones/{conc_id}/previews/{filename}"

                    previews_map.setdefault(doc_id, []).append(
                        {
                            "page": num_page,
                            "url": url,
                        }
                    )

        # ----------------------------------------------------------------------
        # 6) UNIFICAR TODA LA INFORMACIÓN EN CADA AUDIENCIA + NORMALIZAR
        # ----------------------------------------------------------------------
        for row in audiencias:
            oid = row.get("id_objeto_reclamacion")
            aid = row["id"]

            # Prestaciones ligadas al objeto de reclamación
            row["prestaciones"] = prestaciones_por_objeto.get(oid, [])

            # Lista de pagos de convenio (puede estar vacía)
            pagos_convenio_raw = convenios.get(aid, [])
            row["convenio"] = pagos_convenio_raw

            # Datos de incomparecencia (o None)
            row["incomparecencia"] = incomparecencias.get(aid)

            # -------- Documento PRINCIPAL --------
            doc_id_principal = row.get("id_conciliacion_documento")
            if doc_id_principal is not None and doc_id_principal in documentos_map:
                doc_info = dict(documentos_map[doc_id_principal])  # copia
                doc_info["previews"] = previews_map.get(doc_id_principal, [])
                row["documento"] = doc_info
            else:
                row["documento"] = None

            # -------- Constancia de cumplimiento de CONVENIO --------
            doc_id_const = row.get("id_constancia_documento")
            print(row)
            is_const = row.get("is_constancia_documento") == 1

            if is_const and doc_id_const and doc_id_const in documentos_map:
                const_info = dict(documentos_map[doc_id_const])  # copia
                const_info["previews"] = previews_map.get(doc_id_const, [])
                row["documento_constancia"] = const_info
                # alias directo de la fecha para React
                row["fecha_constancia_documento"] = const_info.get("created_at")
            else:
                row["documento_constancia"] = None
                row["fecha_constancia_documento"] = None

            # ============================
            # Campos derivados para el front
            # ============================

            # 1) resultado normalizado
            row["resultado"] = _map_status_to_resultado(
                row.get("id_conciliacion_status"),
                row.get("motivo_archivo"),
                row.get("incomparecencia"),
            )

            # 2) pagos_convenio en el formato que usa React
            row["pagos_convenio"] = [
                {
                    "monto": p["monto"],
                    "forma_pago": p["id_forma_pago"],
                    "fecha": p["fecha_pago"],
                    "tipo_pago": p["tipo_pago"],
                }
                for p in pagos_convenio_raw
            ]

            # 3) monto total del convenio y forma de pago principal
            if pagos_convenio_raw:
                row["monto_convenio"] = sum(
                    float(p["monto"] or 0) for p in pagos_convenio_raw
                )
                row["forma_pago_convenio"] = pagos_convenio_raw[0]["id_forma_pago"]
                row["tipo_pago"] = pagos_convenio_raw[0]["tipo_pago"]
            else:
                row["monto_convenio"] = None
                row["forma_pago_convenio"] = None
                row["tipo_pago"] = None

            # 4) alias de riesgos para la vista
            row["riesgos_detectados"] = row.get("riesgos")

        return audiencias

    finally:
        conn.close()

def get_audiencia(id_conciliacion_audiencia: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        with conn.cursor(dictionary=True) as cur:
            cur.execute(
                "SELECT * FROM conciliacion_audiencia WHERE id_conciliacion_audiencia=%s",
                (id_conciliacion_audiencia,),
            )
            return cur.fetchone()
    finally:
        conn.close()


