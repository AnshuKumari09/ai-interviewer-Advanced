import re

CATEGORIES = [
    ("technical", "Technical Knowledge"),
    ("problem_solving", "Problem Solving"),
    ("communication", "Communication"),
    ("projects", "Project Understanding"),
    ("fundamentals", "Fundamentals"),
]

_CAT_SHAPE = (
    '{"score": 0-10, "feedback": "2-3 sentences", '
    '"evidence": [{"quote": "exact words from the candidate", "note": "what it shows"}], '
    '"focus": ["1 to 3 topics to study"]}'
)

SYSTEM = f"""You are a senior interviewer writing an honest evaluation of a mock interview.
You get the target role, the skills tested and the full transcript.
Reply with ONLY a JSON object in exactly this shape:
{{
  "summary": "2-3 sentence overall assessment",
  "categories": {{
    "technical": {_CAT_SHAPE},
    "problem_solving": {_CAT_SHAPE},
    "communication": {_CAT_SHAPE},
    "projects": {_CAT_SHAPE},
    "fundamentals": {_CAT_SHAPE}
  }},
  "strengths": ["3 to 4 short skill or topic names"],
  "improvements": ["3 to 4 short skill or topic names"],
  "recommended_learning": [{{"topic": "topic to learn", "why": "one sentence"}}]
}}
Rules:
- Judge only what the candidate actually said. Short, vague or missing answers must score low. Do not be generous.
- If the candidate answered very few questions, say so in the summary and score conservatively.
- Every quote must be copied word for word from the candidate's answers (max 25 words). Give 1 or 2 per category, or an empty list if nothing is worth quoting.
- Never invent facts about the candidate.
- Give at most 5 items in recommended_learning."""


def transcript_text(transcript: list[dict]) -> str:
    lines = [("Interviewer" if m["role"] == "ai" else "Candidate") + ": " + m["text"] for m in transcript]
    return "\n".join(lines)[:30000]


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9 ]+", "", re.sub(r"\s+", " ", str(s).lower())).strip()


def _strings(items, limit: int) -> list[str]:
    return [str(x).strip() for x in (items or []) if str(x).strip()][:limit]


def clean(raw: dict, transcript: list[dict]) -> dict:
    said = _norm(" ".join(m["text"] for m in transcript if m["role"] == "candidate"))

    cats = []
    for key, label in CATEGORIES:
        c = (raw.get("categories") or {}).get(key) or {}
        try:
            score = round(max(0.0, min(10.0, float(c.get("score", 0)))), 1)
        except (TypeError, ValueError):
            score = 0.0

        evidence = []
        for e in (c.get("evidence") or [])[:2]:
            if not isinstance(e, dict):
                continue
            quote = str(e.get("quote", "")).strip()
            if len(_norm(quote)) >= 8 and _norm(quote) in said:  # sirf asli quotes
                evidence.append({"quote": quote, "note": str(e.get("note", "")).strip()})

        cats.append(
            {
                "key": key,
                "label": label,
                "score": score,
                "feedback": str(c.get("feedback", "")).strip(),
                "evidence": evidence,
                "focus": _strings(c.get("focus"), 3),
            }
        )

    learning = [
        {"topic": str(x.get("topic", "")).strip(), "why": str(x.get("why", "")).strip()}
        for x in (raw.get("recommended_learning") or [])
        if isinstance(x, dict) and str(x.get("topic", "")).strip()
    ][:5]

    return {
        "overall_score": round(sum(c["score"] for c in cats) / len(cats) * 10),
        "summary": str(raw.get("summary", "")).strip(),
        "categories": cats,
        "strengths": _strings(raw.get("strengths"), 4),
        "improvements": _strings(raw.get("improvements"), 4),
        "recommended_learning": learning,
    }