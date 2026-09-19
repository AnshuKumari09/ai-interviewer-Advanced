CATEGORIES = {"technical", "tools", "soft"}

SYSTEM = """You are a technical recruiter comparing a candidate's resume with a job description.
Reply with ONLY a JSON object in exactly this shape:
{
  "role": "job title from the JD",
  "skills": [
    {"name": "short normalized skill name", "category": "technical | tools | soft", "required": 1-10, "current": 0-10}
  ],
  "gap_summary": "2 sentences about the biggest gaps and what to focus on",
  "interview_focus": ["3 to 5 topics the interviewer will likely ask about"]
}
Rules:
- List 8 to 14 skills that the job description asks for. Include soft skills only if the JD mentions them.
- category: technical = languages, concepts, frameworks; tools = platforms, databases, DevOps, cloud; soft = communication, teamwork, etc.
- required: how important and deep the skill is for this job, from 1 to 10.
- current: the candidate's level judged ONLY from evidence in the resume, from 0 (no evidence at all) to 10 (expert).
- Never give credit for skills that the resume does not show."""


def enrich(raw: dict) -> dict:
    skills = []
    for s in raw.get("skills", []):
        try:
            name = str(s["name"]).strip()
            required = max(1, min(10, int(s["required"])))
            current = max(0, min(10, int(s["current"])))
        except (KeyError, TypeError, ValueError):
            continue
        if not name:
            continue
        category = s.get("category") if s.get("category") in CATEGORIES else "technical"
        if current == 0:
            status = "missing"
        elif current >= required - 1:
            status = "matched"
        else:
            status = "partial"
        skills.append(
            {"name": name, "category": category, "required": required, "current": current, "status": status}
        )

    total = sum(s["required"] for s in skills) or 1
    match_score = round(100 * sum(min(s["current"], s["required"]) for s in skills) / total)

    return {
        "role": str(raw.get("role") or "").strip(),
        "match_score": match_score,
        "skills": skills,
        "gap_summary": str(raw.get("gap_summary") or ""),
        "interview_focus": [str(x) for x in (raw.get("interview_focus") or [])][:5],
    }