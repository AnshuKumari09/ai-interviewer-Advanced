from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from app.db import supabase
from app.deps import get_current_user, new_auth_client, set_auth_cookies

router = APIRouter(prefix="/api/auth", tags=["auth"])


class Credentials(BaseModel):
    email: str
    password: str = Field(min_length=6)


def _user_dict(user):
    md = user.user_metadata or {}
    return {"id": user.id, "email": user.email, "name": md.get("full_name", "")}


@router.post("/signup")
def signup(body: Credentials, response: Response):
    try:
        supabase.auth.admin.create_user(
            {"email": body.email, "password": body.password, "email_confirm": True}
        )
        res = new_auth_client().auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception as e:
        raise HTTPException(400, getattr(e, "message", str(e)))
    set_auth_cookies(response, res.session)
    return _user_dict(res.user)


@router.post("/login")
def login(body: Credentials, response: Response):
    try:
        res = new_auth_client().auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception as e:
        raise HTTPException(401, getattr(e, "message", str(e)))
    set_auth_cookies(response, res.session)
    return _user_dict(res.user)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(
        "access_token",
        path="/",
        samesite="none",
        secure=True,
    )
    response.delete_cookie(
        "refresh_token",
        path="/",
        samesite="none",
        secure=True,
    )
    return {"ok": True}


@router.get("/me")
def me(user=Depends(get_current_user)):
    return _user_dict(user)
