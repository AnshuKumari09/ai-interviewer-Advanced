import logging

from fastapi import APIRouter, Depends, HTTPException

from app.db import supabase
from app.deps import get_current_user
from app.services.llm import chat_json
from app.services.plan import SYSTEM, clean

router = APIRouter(prefix="/api/plan", tags=["plan"])
log = logging.getLogger("uvicorn.error")


def _out(row: dict) -> dict:
    return {"id": row["id"], "plan": row["plan"], "created_at": row["created_at"]}


@router.get("")
def latest_plan(user=Depends(get_current_user)):
    rows = (
        supabase.table("prep_plans")
        .select("id,plan,created_at")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
        .data
    )
    return _out(rows[0]) if rows else None


@router.post("")
def generate_plan(user=Depends(get_current_user)):
    rows = (
        supabase.table("job_descriptions")
        .select("title,analysis")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
        .data
    )
    if not rows or not rows[0]["analysis"]:
        raise HTTPException(400, "Analyze a job description first (JD Analysis page)")

    a = rows[0]["analysis"]
    role = a.get("role") or rows[0]["title"] or "the target role"
    skills = sorted(a.get("skills", []), key=lambda s: s["required"] - s["current"], reverse=True)
    lines = "\n".join(f"- {s['name']}: required {s['required']}/10, candidate {s['current']}/10" for s in skills)
    prompt = (
        f"Target role: {role}\n"
        f"Skills (biggest gaps first):\n{lines}\n"
        f"Likely interview topics: {', '.join(a.get('interview_focus', []))}\n"
        f"Gap summary: {a.get('gap_summary', '')}"
    )

    try:
        plan = clean(chat_json(SYSTEM, prompt, temperature=0.4), role)
    except Exception:
        log.exception("plan generation failed")
        raise HTTPException(502, "AI plan generation failed, please try again")

    if len(plan["days"]) < 7:
        raise HTTPException(502, "AI returned an incomplete plan, please try again")

    row = supabase.table("prep_plans").insert({"user_id": user.id, "plan": plan}).execute().data[0]
    return _out(row)