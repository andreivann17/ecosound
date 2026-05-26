# app/utils/comprimir.py
import os
import shutil
import subprocess
from pathlib import Path
from typing import Optional

_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".gif", ".webp"}


def compress_image_inplace(
    input_path: "str | Path",
    max_dimension: int = 1920,
    quality: int = 85,
) -> Path:
    """
    Comprime una imagen en disco usando Pillow.
    - PNG  → optimiza en PNG (preserva transparencia)
    - Resto → convierte a JPEG quality=85 y reemplaza el archivo original.
    Redimensiona si algún lado supera max_dimension (mantiene proporción).
    Retorna el Path final (puede cambiar extensión a .jpg).
    """
    from PIL import Image as _Image

    in_path = Path(input_path)
    ext = in_path.suffix.lower()

    img = _Image.open(in_path)

    w, h = img.size
    if max(w, h) > max_dimension:
        ratio = max_dimension / max(w, h)
        img = img.resize((int(w * ratio), int(h * ratio)), _Image.LANCZOS)

    if ext == ".png":
        if img.mode not in ("RGB", "RGBA", "P", "L"):
            img = img.convert("RGBA")
        img.save(in_path, format="PNG", optimize=True)
        return in_path
    else:
        out_path = in_path.with_suffix(".jpg")
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        img.save(out_path, format="JPEG", quality=quality, optimize=True)
        if out_path != in_path:
            in_path.unlink(missing_ok=True)
        return out_path


def compress_file_best_effort(
    path: "str | Path",
    max_image_dimension: int = 1920,
    image_quality: int = 85,
) -> Path:
    """
    Detecta tipo de archivo y aplica la compresión adecuada (best-effort, nunca revienta).
    - Imagen: Pillow (redimensiona + recomprime)
    - PDF: Ghostscript
    - Otros: sin cambio
    Retorna el Path final (puede diferir si se convirtió a .jpg).
    """
    p = Path(path)
    ext = p.suffix.lower()

    if ext in _IMAGE_EXTS:
        try:
            return compress_image_inplace(p, max_dimension=max_image_dimension, quality=image_quality)
        except Exception as e:
            print(f"WARN compress_image_inplace: {e}")
            return p
    elif ext == ".pdf":
        return compress_pdf_best_effort_inplace(p)

    return p


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
