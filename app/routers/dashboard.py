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

@router.get("/progress")
def progress(user=Depends(get_current_user)):
    rows = (
        supabase.table("interviews")
        .select("id,title,score,created_at")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("created_at")
        .execute()
        .data
    )
    trend = [
        {"id": r["id"], "title": r["title"], "score": r["score"], "date": r["created_at"]}
        for r in rows
        if r["score"] is not None
    ][-10:]

    jd = (
        supabase.table("job_descriptions")
        .select("analysis")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
        .data
    )
    skills = (jd[0]["analysis"] or {}).get("skills", []) if jd else []
    top_skills = [
        {"name": s["name"], "level": s["current"]}
        for s in sorted(skills, key=lambda s: s.get("current", 0), reverse=True)
        if s.get("current", 0) > 0
    ][:5]

    # next goal: sabse taza report ke "improvements", warna JD ke sabse bade gaps
    reports = (
        supabase.table("interviews")
        .select("report")
        .eq("user_id", user.id)
        .order("created_at", desc=True)
        .limit(5)
        .execute()
        .data
    )
    topics = next(((r["report"] or {}).get("improvements") for r in reports if r["report"]), None) or []
    if not topics:
        gaps = sorted(skills, key=lambda s: s.get("required", 0) - s.get("current", 0), reverse=True)
        topics = [s["name"] for s in gaps if s.get("required", 0) > s.get("current", 0)]
    topics = topics[:2]

    return {
        "trend": trend,
        "top_skills": top_skills,
        "next_goal": f"Improve {' and '.join(topics)}" if topics else None,
    }