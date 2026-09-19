import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.db import supabase
from app.deps import get_current_user
from app.services.llm import chat_json
from app.services.resume import SYSTEM, extract_text

router = APIRouter(prefix="/api/resume", tags=["resume"])
log = logging.getLogger("uvicorn.error")

MAX_SIZE = 5 * 1024 * 1024


def _out(row: dict) -> dict:
    return {
        "id": row["id"],
        "filename": row["filename"],
        "analysis": row["analysis"],
        "created_at": row["created_at"],
    }


@router.get("")
def latest_resume(user=Depends(get_current_user)):
    rows = (
        supabase.table("resumes")
        .select("id,filename,analysis,created_at")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
        .data
    )
    return _out(rows[0]) if rows else None


@router.post("")
def upload_resume(file: UploadFile = File(...), user=Depends(get_current_user)):
    data = file.file.read(MAX_SIZE + 1)
    if len(data) > MAX_SIZE:
        raise HTTPException(413, "File is too large (max 5MB)")

    try:
        text = extract_text(file.filename or "", data)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception:
        raise HTTPException(400, "Could not read this file")
    if len(text) < 50:
        raise HTTPException(400, "No readable text found (is it a scanned PDF?)")

    try:
        analysis = chat_json(SYSTEM, text[:12000])
    except Exception:
        log.exception("resume analysis failed")
        raise HTTPException(502, "AI analysis failed, please try again")

    row = (
        supabase.table("resumes")
        .insert({"user_id": user.id, "filename": file.filename, "text_content": text, "analysis": analysis})
        .execute()
        .data[0]
    )
    return _out(row)