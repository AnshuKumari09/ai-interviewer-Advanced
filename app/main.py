from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, dashboard, interviews, jd, plan, profile, reports, resume
from app.routers import questions, coding, scheduler
app = FastAPI(title="AI Interviewer API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://ai-interviewer-advanced.vercel.app",
    ],
    allow_origin_regex=r"https://ai-interviewer-advanced-[a-z0-9]+(-[a-z0-9-]+)?\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(resume.router)
app.include_router(jd.router)
app.include_router(plan.router)
app.include_router(interviews.router)
app.include_router(reports.router)
app.include_router(profile.router)
app.include_router(questions.router)
app.include_router(coding.router)
app.include_router(scheduler.router)
@app.get("/api/health")
def health():
    return {"status": "ok"}
