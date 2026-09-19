from datetime import datetime, timezone


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_config(role: str, jd: dict, resume: dict, total: int) -> dict:
    skills = sorted(jd.get("skills", []), key=lambda s: s.get("required", 0), reverse=True)
    return {
        "role": role,
        "total_questions": total,
        "skills": [s["name"] for s in skills[:8] if "name" in s],
        "focus": jd.get("interview_focus", []),
        "background": resume.get("experience_summary", ""),
        "projects": [p["name"] for p in resume.get("projects", []) if "name" in p][:4],
    }


def system_prompt(cfg: dict, question_no: int) -> str:
    return f"""You are a friendly but professional interviewer conducting a mock job interview for the role: {cfg['role']}.
Candidate background: {cfg.get('background') or 'not provided'}
Candidate projects: {', '.join(cfg.get('projects', [])) or 'not provided'}
Skills to test: {', '.join(cfg.get('skills', [])) or 'general skills for the role'}
Likely focus areas: {', '.join(cfg.get('focus', [])) or 'general'}

Rules:
- You are asking question {question_no} of {cfg['total_questions']}. Ask exactly ONE question per message.
- Keep each message under 60 words. It will be spoken aloud, so use natural spoken sentences.
- After the candidate answers, react in one short sentence (acknowledge or gently probe), then ask the next question.
- Do not reveal correct answers or give long feedback during the interview.
- Mix technical questions on the skills above with questions about the candidate's projects and behaviour.
- Never repeat a question that was already asked.
- Plain text only. No markdown, no bullet points, no emojis."""


def to_messages(transcript: list[dict]) -> list[dict]:
    msgs = [{"role": "user", "content": "Start the interview: greet me in one short sentence and ask the first question."}]
    for m in transcript:
        msgs.append({"role": "assistant" if m["role"] == "ai" else "user", "content": m["text"]})
    return msgs