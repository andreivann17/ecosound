from __future__ import annotations

import io
import os
import zipfile
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple

import bcrypt
import jwt
import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Security, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr

from ..db import get_spie_connection
from ..models import evaluation as evaluation_model
from ..utils.email import get_users_contact_info, send_email_bg

router = APIRouter(prefix="/evaluation", tags=["evaluation"])

RETINAL_IMAGES_DIR = Path(__file__).resolve().parents[2] / "uploads" / "evaluation" / "retinal_images"
RETINAL_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

REQUIRED_CSV_COLUMNS = {"nombre_original", "ruta_original", "nombre_generado"}

EVAL_SECRET_KEY = os.getenv("SECRET_KEY", "herrsoft-ecosound-jwt-secret-key-change-in-prod-2026")
EVAL_ALGORITHM = "HS256"
EVAL_TOKEN_MINUTES = 60 * 24 * 30  # 30 días: los evaluadores vuelven en días distintos

_eval_security = HTTPBearer(auto_error=False)


class EvaluatorRegister(BaseModel):
    name: str
    email: EmailStr
    password: str


class EvaluatorLogin(BaseModel):
    email: EmailStr
    password: str


class EvaluationSubmit(BaseModel):
    id_retinal_image: int
    classification: str
    notes: str = ""


def _create_evaluator_token(id_evaluator: int, name: str) -> str:
    payload = {
        "id_evaluator": id_evaluator,
        "name": name,
        "scope": "evaluation",
        "exp": datetime.utcnow() + timedelta(minutes=EVAL_TOKEN_MINUTES),
    }
    return jwt.encode(payload, EVAL_SECRET_KEY, algorithm=EVAL_ALGORITHM)


def get_current_evaluator(
    credentials: HTTPAuthorizationCredentials = Security(_eval_security),
) -> Dict:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    try:
        payload = jwt.decode(credentials.credentials, EVAL_SECRET_KEY, algorithms=[EVAL_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid session")
    if payload.get("scope") != "evaluation":
        raise HTTPException(status_code=401, detail="Invalid session")
    return {"id_evaluator": payload["id_evaluator"], "name": payload.get("name", "")}


@router.post("/auth/register", status_code=status.HTTP_200_OK)
def register_evaluator(payload: EvaluatorRegister):
    name = payload.name.strip()
    email = payload.email.lower().strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")

    conn = get_spie_connection()
    try:
        if evaluation_model.get_evaluator_by_email(conn, email):
            raise HTTPException(status_code=400, detail="An account with this email already exists")
        password_hash = bcrypt.hashpw(payload.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        id_evaluator = evaluation_model.create_evaluator(conn, name, email, password_hash)
    finally:
        conn.close()

    token = _create_evaluator_token(id_evaluator, name)
    return {"access_token": token, "evaluator": {"id": id_evaluator, "name": name}}


@router.post("/auth/login", status_code=status.HTTP_200_OK)
def login_evaluator(payload: EvaluatorLogin):
    email = payload.email.lower().strip()
    conn = get_spie_connection()
    try:
        row = evaluation_model.get_evaluator_by_email(conn, email)
    finally:
        conn.close()

    if not row:
        raise HTTPException(status_code=401, detail="Email not registered")

    stored = (row.get("password") or "").strip()
    try:
        password_ok = bool(stored) and bcrypt.checkpw(payload.password.encode("utf-8"), stored.encode("utf-8"))
    except ValueError:
        password_ok = False
    if not password_ok:
        raise HTTPException(status_code=401, detail="Incorrect password")

    token = _create_evaluator_token(row["id_evaluator"], row["name"])
    return {"access_token": token, "evaluator": {"id": row["id_evaluator"], "name": row["name"]}}


@router.get("/evaluations/mine", status_code=status.HTTP_200_OK)
def get_my_evaluations(evaluator: Dict = Depends(get_current_evaluator)):
    conn = get_spie_connection()
    try:
        rows = evaluation_model.get_evaluations_for_evaluator(conn, evaluator["id_evaluator"])
    finally:
        conn.close()
    return {"evaluations": rows}


def _notify_evaluation_completed(evaluator_name: str, images_count: int, notify_user_ids: List[int]) -> None:
    """Email the subscribed users (spie.correo_users) that an evaluator finished the dataset."""
    recipients = get_users_contact_info(notify_user_ids)
    to_emails = [r["email"] for r in recipients if r.get("email")]
    if not to_emails:
        return

    subject = f"Retinal Evaluation completed by {evaluator_name}"
    html = f"""
    <div style="font-family: Arial, Helvetica, sans-serif; color: #1f2937; line-height: 1.6;">
      <h2 style="margin: 0 0 12px; color: #01369e;">Retinal Evaluation completed</h2>
      <p>Hello,</p>
      <p>
        <strong>{evaluator_name}</strong> has just finished evaluating all
        <strong>{images_count}</strong> images in the Retinal Evaluation dataset.
      </p>
      <p>No further action is required. This is an automated notification.</p>
      <p style="margin-top: 24px; color: #6b7280; font-size: 12px;">
        Retinal Evaluation &mdash; automated notification
      </p>
    </div>
    """
    send_email_bg(to_emails, subject, html)


@router.post("/evaluations", status_code=status.HTTP_200_OK)
def submit_evaluation(payload: EvaluationSubmit, evaluator: Dict = Depends(get_current_evaluator)):
    classification = payload.classification.strip()
    if not classification:
        raise HTTPException(status_code=400, detail="Classification is required")

    just_completed = False
    notify_user_ids: List[int] = []
    total = 0

    conn = get_spie_connection()
    try:
        total = evaluation_model.count_active_images(conn)
        before = evaluation_model.count_evaluations_for_evaluator(conn, evaluator["id_evaluator"])

        evaluation_model.upsert_evaluation(
            conn,
            evaluator["id_evaluator"],
            payload.id_retinal_image,
            classification,
            payload.notes or "",
        )
        conn.commit()

        after = evaluation_model.count_evaluations_for_evaluator(conn, evaluator["id_evaluator"])
        # Fires exactly once: the request whose upsert pushes this evaluator's
        # count from "not yet done" to "done" (re-editing an already-evaluated
        # image never re-crosses the threshold, so this can't double-notify).
        just_completed = total > 0 and before < total <= after
        if just_completed:
            notify_user_ids = evaluation_model.list_notification_user_ids(conn)
    finally:
        conn.close()

    if just_completed and notify_user_ids:
        _notify_evaluation_completed(evaluator.get("name") or "An evaluator", total, notify_user_ids)

    return {"message": "Saved"}


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
