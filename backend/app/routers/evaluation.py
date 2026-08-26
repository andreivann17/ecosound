from __future__ import annotations

import io
import zipfile
from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd
from fastapi import APIRouter, File, HTTPException, UploadFile, status

from ..db import get_spie_connection
from ..models import evaluation as evaluation_model

router = APIRouter(prefix="/evaluation", tags=["evaluation"])

RETINAL_IMAGES_DIR = Path(__file__).resolve().parents[2] / "uploads" / "evaluation" / "retinal_images"
RETINAL_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

REQUIRED_CSV_COLUMNS = {"nombre_original", "ruta_original", "nombre_generado"}


def _resolve_is_real_and_stage(ruta_original: str) -> Tuple[int, str]:
    parts = [p for p in str(ruta_original).replace("\\", "/").split("/") if p]
    lowered = [p.lower() for p in parts]
    for i, p in enumerate(lowered):
        if p in ("real", "synthetic"):
            stage = parts[i + 1] if i + 1 < len(parts) else ""
            return (1 if p == "real" else 0), stage
    raise ValueError(f"could not determine real/synthetic from path '{ruta_original}'")


@router.get("/images", status_code=status.HTTP_200_OK)
def list_images():
    """List the active images for the evaluation screen.

    Deliberately does not expose hidden_name/is_real/stage: that is the
    ground truth and must stay hidden from the evaluator.
    """
    conn = get_spie_connection()
    try:
        images = evaluation_model.list_active_images(conn)
    finally:
        conn.close()
    return {"total": len(images), "images": images}


@router.post("/label/import", status_code=status.HTTP_200_OK)
async def import_dataset(
    dataset_zip: UploadFile = File(...),
    labels_csv: UploadFile = File(...),
):
    if not (dataset_zip.filename or "").lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="The dataset must be a .zip file")
    if not (labels_csv.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Labels must be a .csv file")

    csv_bytes = await labels_csv.read()
    try:
        df = pd.read_csv(io.BytesIO(csv_bytes))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read the .csv: {e}")

    missing_cols = REQUIRED_CSV_COLUMNS - set(df.columns)
    if missing_cols:
        raise HTTPException(
            status_code=400,
            detail=f"The .csv is missing required columns: {', '.join(sorted(missing_cols))}",
        )

    df = df.dropna(subset=list(REQUIRED_CSV_COLUMNS))
    if df.empty:
        raise HTTPException(status_code=400, detail="The .csv does not contain any valid rows")

    dup_mask = df["nombre_generado"].duplicated()
    dup_generado = sorted(df.loc[dup_mask, "nombre_generado"].unique().tolist())
    if dup_generado:
        raise HTTPException(
            status_code=400,
            detail=f"The .csv has duplicate 'nombre_generado' values: {', '.join(str(d) for d in dup_generado[:20])}",
        )

    rows: List[Dict] = []
    path_errors: List[str] = []
    for _, r in df.iterrows():
        try:
            is_real, stage = _resolve_is_real_and_stage(r["ruta_original"])
        except ValueError as e:
            path_errors.append(str(e))
            continue
        rows.append({
            "name": str(r["nombre_generado"]).strip(),
            "hidden_name": str(r["nombre_original"]).strip(),
            "is_real": is_real,
            "stage": stage[:50],
        })

    if path_errors:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Could not interpret 'ruta_original' for some rows",
                "errors": path_errors[:50],
            },
        )

    zip_bytes = await dataset_zip.read()
    try:
        zf = zipfile.ZipFile(io.BytesIO(zip_bytes))
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="The .zip is damaged or not a valid ZIP file")

    bad_file = zf.testzip()
    if bad_file:
        raise HTTPException(status_code=400, detail=f"The .zip is corrupted at: {bad_file}")

    members_by_basename: Dict[str, str] = {}
    conflicts: List[str] = []
    for member in zf.namelist():
        if member.endswith("/"):
            continue
        base = Path(member).name
        if base in members_by_basename and members_by_basename[base] != member:
            conflicts.append(base)
        members_by_basename[base] = member

    if conflicts:
        raise HTTPException(
            status_code=400,
            detail=(
                "The .zip has files with the same name in different folders: "
                + ", ".join(sorted(set(conflicts))[:20])
            ),
        )

    expected_names = {r["name"] for r in rows}
    missing_in_zip = sorted(expected_names - set(members_by_basename.keys()))
    if missing_in_zip:
        raise HTTPException(
            status_code=400,
            detail={
                "message": f"{len(missing_in_zip)} file(s) from the .csv are missing inside the .zip",
                "missing": missing_in_zip[:50],
            },
        )

    conn = get_spie_connection()
    try:
        existing_names = evaluation_model.get_existing_names(conn, [r["name"] for r in rows])
    finally:
        conn.close()

    new_rows = [r for r in rows if r["name"] not in existing_names]
    skipped = sorted(existing_names)

    written_paths: List[Path] = []
    try:
        for r in new_rows:
            member = members_by_basename[r["name"]]
            dest = RETINAL_IMAGES_DIR / r["name"]
            with zf.open(member) as src, open(dest, "wb") as out:
                out.write(src.read())
            written_paths.append(dest)
    except Exception as e:
        for p in written_paths:
            p.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Error extracting files from the .zip: {e}")

    conn = get_spie_connection()
    inserted = 0
    try:
        try:
            conn.autocommit = False
        except Exception:
            pass
        try:
            inserted = evaluation_model.bulk_insert_retinal_images(conn, new_rows)
            conn.commit()
        except Exception as e:
            conn.rollback()
            for p in written_paths:
                p.unlink(missing_ok=True)
            raise HTTPException(status_code=500, detail=f"Error saving to the database: {e}")
    finally:
        conn.close()

    return {
        "message": "Import completed",
        "total_csv_rows": int(len(df)),
        "inserted": inserted,
        "skipped_duplicates": skipped,
        "skipped_count": len(skipped),
    }
