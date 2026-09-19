from fastapi import APIRouter, Depends

from app.db import supabase
from app.deps import get_current_user

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard")
def dashboard(user=Depends(get_current_user)):
    interviews = (
        supabase.table("interviews")
        .select("id,title,status,score,created_at")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .execute()
        .data
    )

    # newest first
    scores = [i["score"] for i in interviews if i["status"] == "completed" and i["score"] is not None]
    avg = round(sum(scores) / len(scores)) if scores else 0
    improvement = scores[0] - scores[-1] if len(scores) >= 2 else 0  # latest - first

    resume = (
        supabase.table("resumes")
        .select("analysis")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
        .data
    )
    skills = (resume[0]["analysis"] or {}).get("skills", []) if resume else []

    return {
        "total_interviews": len(interviews),
        "avg_score": avg,
        "improvement": improvement,
        "skills_tracked": len(skills),
        "recent": interviews[:3],
    }