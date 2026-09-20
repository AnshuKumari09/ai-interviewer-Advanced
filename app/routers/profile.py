from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.db import supabase
from app.deps import get_current_user, new_auth_client

router = APIRouter(prefix="/api/profile", tags=["profile"])


class ProfileIn(BaseModel):
    full_name: str = ""
    target_role: str = ""
    bio: str = ""


class PasswordIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)


def _profile(user) -> dict:
    md = user.user_metadata or {}
    return {
        "email": user.email,
        "full_name": md.get("full_name", ""),
        "target_role": md.get("target_role", ""),
        "bio": md.get("bio", ""),
    }


@router.get("")
def get_profile(user=Depends(get_current_user)):
    return _profile(user)


@router.put("")
def update_profile(body: ProfileIn, user=Depends(get_current_user)):
    md = {
        **(user.user_metadata or {}),
        "full_name": body.full_name.strip()[:80],
        "target_role": body.target_role.strip()[:80],
        "bio": body.bio.strip()[:500],
    }
    try:
        res = supabase.auth.admin.update_user_by_id(user.id, {"user_metadata": md})
    except Exception as e:
        raise HTTPException(400, getattr(e, "message", str(e)))
    return _profile(res.user)


@router.post("/password")
def change_password(body: PasswordIn, user=Depends(get_current_user)):
    try:  # purana password sahi hai ya nahi
        new_auth_client().auth.sign_in_with_password({"email": user.email, "password": body.current_password})
    except Exception:
        raise HTTPException(400, "Current password is incorrect")
    try:
        supabase.auth.admin.update_user_by_id(user.id, {"password": body.new_password})
    except Exception as e:
        raise HTTPException(400, getattr(e, "message", str(e)))
    return {"ok": True}