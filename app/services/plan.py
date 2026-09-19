SYSTEM = """You are an interview preparation coach. Create a 7-day preparation plan for the candidate.
Reply with ONLY a JSON object in exactly this shape:
{
  "days": [
    {
      "title": "short day title, e.g. Python Advanced Concepts + 10 Questions",
      "focus": "3 to 5 specific topics, comma separated",
      "questions": 10,
      "tasks": ["2 to 4 concrete tasks for the day"]
    }
  ]
}
Rules:
- Exactly 7 items in days.
- Start with the skills that have the biggest gap between the required and the candidate level.
- Day 6 is a full mock interview for the target role. Day 7 is revision of weak areas plus a final mock interview.
- "questions" is the number of practice questions for that day (0 to 15).
- Be specific to the skills provided. No generic advice like "practice more"."""


def clean(raw: dict, role: str) -> dict:
    days = []
    for i, d in enumerate((raw.get("days") or [])[:7], start=1):
        try:
            questions = max(0, min(20, int(d.get("questions", 0))))
        except (TypeError, ValueError):
            questions = 0
        days.append(
            {
                "day": i,
                "title": str(d.get("title") or f"Day {i}").strip(),
                "focus": str(d.get("focus") or "").strip(),
                "questions": questions,
                "tasks": [str(t).strip() for t in (d.get("tasks") or [])][:4],
            }
        )
    return {"role": role, "days": days}