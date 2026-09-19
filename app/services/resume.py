import io

from docx import Document
from pypdf import PdfReader

SYSTEM = """You are an expert technical recruiter and career coach.
Analyze the resume and reply with ONLY a JSON object in exactly this shape:
{
  "skills": ["up to 20 technical skills and tools, normalized names like Python, FastAPI, PostgreSQL"],
  "experience_summary": "2-3 sentence summary of the candidate's experience",
  "projects": [{"name": "project name", "description": "one line"}],
  "strengths": ["up to 4 short points"],
  "improvements": ["up to 4 specific, actionable suggestions to improve the resume"]
}
Use only information present in the resume. Never invent skills, projects or experience.
Return at most 5 projects."""


def extract_text(filename: str, data: bytes) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(data))
        return "\n".join((page.extract_text() or "") for page in reader.pages).strip()
    if name.endswith(".docx"):
        doc = Document(io.BytesIO(data))
        return "\n".join(p.text for p in doc.paragraphs).strip()
    raise ValueError("Only PDF and DOCX files are supported")