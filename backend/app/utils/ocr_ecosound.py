"""
Pipeline OCR para extracción de campos de contratos EcoSound.
Acepta: imagen (jpg/jpeg/png/gif/webp), PDF.
"""
from __future__ import annotations

import io
import re
import platform
from typing import Any, Dict, List, Optional

from PIL import Image
from pdf2image import convert_from_bytes

if platform.system() == "Windows":
    import pytesseract as _tess_cfg
    import os
    _tess_cfg.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    os.environ.setdefault("TESSDATA_PREFIX", r"C:\Users\andre\tessdata")

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
PDF_EXT    = ".pdf"

CAMPO_LABELS: Dict[str, str] = {
    "cliente":        "Cliente",
    "telefono":       "Teléfono",
    "paquete_numero": "Número de paquete",
    "paquete_detalle":"Detalle de paquete",
    "fecha_evento":   "Fecha del evento",
    "lugar_evento":   "Lugar del evento",
    "hora_inicio":    "Hora inicio",
    "hora_fin":       "Hora fin",
    "importe_total":  "Importe total",
    "importe_letra":  "Importe en letra",
    "fecha_anticipo": "Fecha anticipo",
    "monto_anticipo": "Monto anticipo",
    "anticipo_letra": "Anticipo en letra",
    "resta_pagar":    "Resta por pagar",
    "resta_letra":    "Resta en letra",
}


def _limpiar(texto: str) -> str:
    texto = re.sub(r"_+", "", texto)
    texto = re.sub(r"\s{2,}", " ", texto)
    return texto.strip()


def extraer_campos(texto: str) -> Dict[str, Optional[str]]:
    """
    Extrae campos del contrato EcoSound a partir del texto OCR.

    Notas sobre los patrones:
    - Los contratos tienen underscores como espaciadores: "día _7__ de__ FEBRERO"
    - [_\s]* absorbe cualquier mezcla de underscores y espacios
    - resta_letra usa re.DOTALL para cruzar saltos de línea anclado a "Resta por pagar"
    """
    campos: Dict[str, Optional[str]] = {}

    # Flags estándar (sin DOTALL para no cruzar líneas en patrones normales)
    F = re.IGNORECASE | re.MULTILINE

    patrones = {
        # "el Sr.(a) ARACELY AYALA con domicilio en"
        "cliente":          r"el Sr\.\(a\)\s+(.+?)\s+con domicilio",

        # "con teléfono y celular: 6531018255"
        "telefono":         r"con tel[eé]fono y celular:\s*([\d]+)",

        # "NUMERO DE PAQUETE : XV KIMBERLY"
        "paquete_numero":   r"NUMERO DE PAQUETE\s*:\s*([^\n]+)",

        # "FOTOGRAFIA PAQUETE 3 CON FOTO LIBRO, SONIDO 5 ROBOTS Y SHOTS"
        "paquete_detalle":  r"FOTOGRAFIA\s+([^\n]+)",

        # "Fecha del evento, el día _7__ de__ FEBRERO  de_ 2026 :"
        # [_\s]* absorbe underscores y espacios intercalados
        "fecha_evento":     r"Fecha del evento.*?d[ií]a\s*[_\s]*(\d{1,2})[_\s]*de[_\s]+([A-ZÁÉÍÓÚÑ]+)[_\s]*de[_\s]*(\d{4})",

        # "Lugar del even _CHIHUAHUA Y 6 #600 - CASA PARTICULAR"
        "lugar_evento":     r"Lugar del even[^\n]*?_([^_\n]+?)(?:\n|$)",

        # "Hora de inicio del evento 8:00 PM __ hrs."
        "hora_inicio":      r"Hora de inicio del evento\s*([\d:]+\s*[APMapm]{2})",

        # "Hora de finalización del evento __ 2:00 AM _ hrs."
        # [_\s]* absorbe los underscores antes del horario
        "hora_fin":         r"Hora de finalizaci[oó]n del evento\s*[_\s]*([\d:]+\s*[APMapm]{2})",

        # "Importe del presente contrato de $ 23,000 .00"
        # \s* antes de \$ por el espacio "de $"
        "importe_total":    r"Importe del presente contrato de\s*\$\s*([\d,]+)",

        # "con ( VEINTE Y TRES MIL )"
        "importe_letra":    r"con\s*\(\s*([^)]+?)\s*\)",

        # "anticipo el día_2_ de__ ENERO del__ 2026"
        "fecha_anticipo":   r"anticipo el d[ií]a[_\s]*(\d{1,2})[_\s]*de[_\s]+([A-ZÁÉÍÓÚÑ]+)[_\s]*del[_\s]*(\d{4})",

        # "cantidad de $ 5,000___.00"
        "monto_anticipo":   r"cantidad de\s*\$\s*([\d,]+)",

        # "con letra CINCO MIL a cuenta."
        "anticipo_letra":   r"con letra\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]*?)\s+a cuenta",

        # "Resta por pagar 2 semanas antes del evento $ 18,000 -00"
        "resta_pagar":      r"Resta por pagar[^\$]+\$\s*([\d,]+)",
    }

    for campo, patron in patrones.items():
        match = re.search(patron, texto, F)
        if match:
            grupos = [g for g in match.groups() if g]
            valor = " ".join(g.strip() for g in grupos)
            campos[campo] = _limpiar(valor)
        else:
            campos[campo] = None

    # resta_letra necesita DOTALL (cruza dos saltos de línea entre el monto y "con letra")
    # y se ancora a "Resta por pagar" para no confundirse con anticipo_letra
    m = re.search(
        r"Resta por pagar.*?con letra\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ,\s]*?)(?:,|\n|\x0c)",
        texto,
        re.IGNORECASE | re.DOTALL,
    )
    campos["resta_letra"] = _limpiar(m.group(1)) if m else None

    meses = {
        "enero": "01", "febrero": "02", "marzo": "03", "abril": "04",
        "mayo": "05", "junio": "06", "julio": "07", "agosto": "08",
        "septiembre": "09", "octubre": "10", "noviembre": "11", "diciembre": "12",
    }
    for campo_fecha in ("fecha_evento", "fecha_anticipo"):
        if campos.get(campo_fecha):
            partes = campos[campo_fecha].split()
            if len(partes) == 3:
                dia, mes, anio = partes
                mes_num = meses.get(mes.lower(), mes)
                campos[campo_fecha] = f"{dia.zfill(2)}/{mes_num}/{anio}"

    return campos


def _ocr_pil_image(img: Image.Image) -> str:
    import pytesseract
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    return pytesseract.image_to_string(img, lang="spa+eng")


def _ocr_image_bytes(data: bytes) -> str:
    img = Image.open(io.BytesIO(data))
    return _ocr_pil_image(img)


def _ocr_pdf_bytes(data: bytes, dpi: int = 200) -> str:
    pages = convert_from_bytes(data, dpi=dpi)
    return " ".join(_ocr_pil_image(p) for p in pages)


def _ext(name: str) -> str:
    return ("." + name.rsplit(".", 1)[-1].lower()) if "." in name else ""


def _process_single(data: bytes, name: str) -> Dict[str, Any]:
    ext = _ext(name)
    try:
        if ext in IMAGE_EXTS:
            texto = _ocr_image_bytes(data)
        elif ext == PDF_EXT:
            texto = _ocr_pdf_bytes(data)
        else:
            return {
                "archivo": name,
                "error": f"Formato '{ext}' no soportado",
                "campos": {},
                "labels": CAMPO_LABELS,
            }
        campos = extraer_campos(texto)
        return {"archivo": name, "campos": campos, "labels": CAMPO_LABELS, "error": None}
    except Exception as exc:
        return {"archivo": name, "error": str(exc), "campos": {}, "labels": CAMPO_LABELS}


def process_upload(data: bytes, filename: str) -> List[Dict[str, Any]]:
    return [_process_single(data, filename)]
