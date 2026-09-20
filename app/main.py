from fastapi import FastAPI

from app.routers import auth, dashboard, interviews, jd, plan, profile, reports, resume
from app.routers import questions
app = FastAPI(title="AI Interviewer API")
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(resume.router)
app.include_router(jd.router)
app.include_router(plan.router)
app.include_router(interviews.router)
app.include_router(reports.router)
app.include_router(profile.router)
app.include_router(questions.router)

@app.get("/api/health")
def health():
    return {"status": "ok"}