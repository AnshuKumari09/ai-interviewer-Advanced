import logging
from datetime import date as date_cls

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator

from app.db import supabase
from app.deps import get_current_user

router = APIRouter(prefix="/api", tags=["scheduler"])
log = logging.getLogger("uvicorn.error")

# Fixed daily template for now — swap for real interviewer/calendar availability later.
FIXED_SLOTS = ["10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "04:00 PM", "06:00 PM"]

INTERVIEW_TYPES = {"technical", "behavioral", "both"}


def _valid_date(v: str) -> str:
    try:
        date_cls.fromisoformat(v)
    except ValueError:
        raise HTTPException(400, "date must be YYYY-MM-DD")
    return v


class BookIn(BaseModel):
    date: str  # "YYYY-MM-DD"
    slot: str  # display label shown in the UI, e.g. "10:00 AM" or a formatted custom time
    custom_time: str | None = None  # raw "HH:MM[:SS]" from the <input type="time">, if any
    type: str

    @field_validator("type")
    @classmethod
    def _check_type(cls, v: str) -> str:
        if v not in INTERVIEW_TYPES:
            raise ValueError(f"type must be one of {sorted(INTERVIEW_TYPES)}")
        return v


@router.get("/interview-slots")
def get_slots(date: str = Query(...), user=Depends(get_current_user)):
    _valid_date(date)

    # Slots this user has already booked (and not cancelled) that day are removed
    # from what's offered — same user can't double-book the same time.
    taken = (
        supabase.table("interview_bookings")
        .select("slot")
        .eq("user_id", user.id)
        .eq("scheduled_date", date)
        .neq("status", "cancelled")
        .execute()
        .data
    )
    taken_slots = {r["slot"] for r in taken}
    return {"slots": [s for s in FIXED_SLOTS if s not in taken_slots]}


@router.post("/mock-interviews/book")
def book(body: BookIn, user=Depends(get_current_user)):
    _valid_date(body.date)

    existing = (
        supabase.table("interview_bookings")
        .select("id")
        .eq("user_id", user.id)
        .eq("scheduled_date", body.date)
        .eq("slot", body.slot)
        .neq("status", "cancelled")
        .execute()
        .data
    )
    if existing:
        raise HTTPException(409, "You already have a booking at that time")

    try:
        row = (
            supabase.table("interview_bookings")
            .insert(
                {
                    "user_id": user.id,
                    "scheduled_date": body.date,
                    "slot": body.slot,
                    "custom_time": body.custom_time,
                    "interview_type": body.type,
                    "status": "scheduled",
                }
            )
            .execute()
            .data[0]
        )
    except Exception:
        log.exception("booking insert failed")
        raise HTTPException(502, "Could not save the booking, please try again")

    return {"ok": True, "booking": row}


@router.get("/mock-interviews")
def list_bookings(user=Depends(get_current_user)):
    return (
        supabase.table("interview_bookings")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .order("scheduled_date")
        .execute()
        .data
    )