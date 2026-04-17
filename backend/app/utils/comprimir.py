# app/utils/comprimir.py
import os
import shutil
import subprocess
from pathlib import Path
from typing import Optional


def _resolve_gs_path() -> str:
    """
    Resuelve el binario de Ghostscript para Windows/Linux.

    Prioridad:
    1) ENV: GS_PATH
    2) PATH: gswin64c / gswin32c / gs
    """
    env = os.getenv("GS_PATH")
    if env:
        p = Path(env)
        if p.exists():
            return str(p)

    for name in ("gswin64c", "gswin32c", "gs"):
        found = shutil.which(name)
        if found:
            return found

    raise FileNotFoundError(
        "Ghostscript no encontrado. Instala Ghostscript o define GS_PATH apuntando al ejecutable."
    )


def compress_pdf_inplace(
    input_pdf: str | Path,
    quality: str = "ebook",
    gs_path: Optional[str] = None,
) -> Path:
    """
    Comprime un PDF y reemplaza el archivo original (in-place) sin cambiar el nombre.

    - Genera un temporal en la misma carpeta para hacer replace atómico.
    - Si Ghostscript falla, levanta excepción.
    """
    in_path = Path(input_pdf)
    if not in_path.exists():
        raise FileNotFoundError(in_path)

    presets = {
        "screen": "/screen",
        "ebook": "/ebook",
        "printer": "/printer",
        "prepress": "/prepress",
        "default": "/default",
    }
    preset = presets.get(quality, "/ebook")

    gs = gs_path or _resolve_gs_path()

    tmp_path = in_path.with_suffix(in_path.suffix + ".tmp")

    cmd = [
        gs,
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        f"-dPDFSETTINGS={preset}",
        "-dNOPAUSE",
        "-dBATCH",
        "-dQUIET",
        f"-sOutputFile={str(tmp_path)}",
        str(in_path),
    ]

    # Ejecuta compresión
    subprocess.run(cmd, check=True)

    # Validación mínima: que el temporal exista y no esté vacío
    if not tmp_path.exists() or tmp_path.stat().st_size == 0:
        try:
            tmp_path.unlink(missing_ok=True)  # py3.8+ en adelante
        except Exception:
            pass
        raise RuntimeError("Ghostscript generó un archivo temporal inválido.")

    # Reemplazo atómico (misma ruta final)
    tmp_path.replace(in_path)

    return in_path


def compress_pdf_best_effort_inplace(
    input_pdf: str | Path,
    quality: str = "ebook",
    gs_path: Optional[str] = None,
) -> Path:
    """
    Igual que compress_pdf_inplace, pero si falla NO revienta:
    deja el PDF original y regresa la ruta original.
    """
    in_path = Path(input_pdf)
    try:
        return compress_pdf_inplace(in_path, quality=quality, gs_path=gs_path)
    except Exception as e:
        print("WARN compress_pdf_best_effort_inplace:", e)
        return in_path
