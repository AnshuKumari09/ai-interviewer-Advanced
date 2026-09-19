import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import Column, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


def _now():
    return datetime.now(timezone.utc)


def _created():
    return Field(default_factory=_now, sa_type=DateTime(timezone=True))


class Resume(SQLModel, table=True):
    __tablename__ = "resumes"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(index=True)
    filename: Optional[str] = None
    text_content: Optional[str] = None
    analysis: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    created_at: datetime = _created()


class JobDescription(SQLModel, table=True):
    __tablename__ = "job_descriptions"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(index=True)
    title: Optional[str] = None
    text_content: Optional[str] = None
    analysis: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    created_at: datetime = _created()


class Interview(SQLModel, table=True):
    __tablename__ = "interviews"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(index=True)
    title: Optional[str] = None
    status: str = "scheduled"
    score: Optional[int] = None
    transcript: list[Any] = Field(default_factory=list, sa_column=Column(JSONB))
    report: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    created_at: datetime = _created()


class PrepPlan(SQLModel, table=True):
    __tablename__ = "prep_plans"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(index=True)
    plan: Optional[dict[str, Any]] = Field(default=None, sa_column=Column(JSONB))
    created_at: datetime = _created()