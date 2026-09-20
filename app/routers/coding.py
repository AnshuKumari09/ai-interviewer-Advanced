import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.db import supabase
from app.deps import get_current_user
from app.services.llm import chat_text

router = APIRouter(prefix="/api/coding-problems", tags=["coding"])
log = logging.getLogger("uvicorn.error")


class FeedbackIn(BaseModel):
    code: str
    language: str
    passed: bool
    failing_output: str | None = None


@router.get("")
def list_problems(
    topic: str | None = Query(None),
    difficulty: str | None = Query(None),
    user=Depends(get_current_user),
):
    # Lean columns for the list view — no starter_code/tests payload here.
    q = supabase.table("coding_problems").select("id,slug,title,difficulty,topic")
    if topic:
        q = q.eq("topic", topic)
    if difficulty:
        q = q.eq("difficulty", difficulty)
    problems = q.order("title").execute().data

    solved_ids = {
        r["problem_id"]
        for r in supabase.table("coding_progress").select("problem_id").eq("user_id", user.id).execute().data
    }
    for p in problems:
        p["solved"] = p["id"] in solved_ids
    return problems


@router.get("/{slug}")
def get_problem(slug: str, user=Depends(get_current_user)):
    rows = supabase.table("coding_problems").select("*").eq("slug", slug).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Problem not found")
    # Execution is entirely client-side (Pyodide/JS worker), so `tests` is
    # intentionally included here — the browser needs it to grade locally.
    return rows[0]


@router.post("/{slug}/complete")
def mark_complete(slug: str, language: str = Query(...), user=Depends(get_current_user)):
    rows = supabase.table("coding_problems").select("id").eq("slug", slug).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Problem not found")
    supabase.table("coding_progress").upsert(
        {"user_id": user.id, "problem_id": rows[0]["id"], "status": "solved", "best_language": language}
    ).execute()
    return {"ok": True}


@router.post("/{slug}/feedback")
def ai_feedback(slug: str, body: FeedbackIn, user=Depends(get_current_user)):
    """Optional: short AI code-review comment, shown after a run — not required to solve the problem."""
    rows = supabase.table("coding_problems").select("title,description").eq("slug", slug).limit(1).execute().data
    if not rows:
        raise HTTPException(404, "Problem not found")
    problem = rows[0]

    outcome = "passed all test cases" if body.passed else f"failed with: {body.failing_output}"
    prompt = (
        f"A candidate is solving the coding problem \"{problem['title']}\": {problem['description']}\n\n"
        f"Their {body.language} solution {outcome}.\n\n"
        "Give 2-3 sentences of feedback: if it passed, briefly note the time/space complexity and one "
        "possible improvement if any; if it failed, give a hint toward the bug without revealing the fix "
        "outright. Keep it concise and encouraging."
    )
    try:
        text = chat_text(prompt, [{"role": "user", "content": body.code}])
    except Exception:
        log.exception("coding feedback LLM call failed")
        raise HTTPException(502, "AI is unavailable, please try again")
    return {"feedback": text}