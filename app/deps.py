from fastapi import HTTPException, Request, Response
from supabase import create_client

from app.config import settings
from app.db import supabase


def new_auth_client():
    # Har auth call ke liye naya client. Shared client par sign-in karne se uska
    # session badal jata hai aur baad ki DB queries service role ki jagah user ke
    # token se chalne lagti hain.
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def set_auth_cookies(response: Response, session) -> None:
    response.set_cookie(
        "access_token", session.access_token,
        httponly=True, samesite="lax", max_age=session.expires_in, path="/",
    )
    response.set_cookie(
        "refresh_token", session.refresh_token,
        httponly=True, samesite="lax", max_age=60 * 60 * 24 * 7, path="/",
    )


def get_current_user(request: Request, response: Response):
    token = request.cookies.get("access_token")
    if token:
        try:
            return supabase.auth.get_user(token).user
        except Exception:
            pass

    # access token (1 ghante ka) expire ho gaya to refresh token se naya le lo,
    # taaki demo ke beech me logout na ho
    refresh = request.cookies.get("refresh_token")
    if refresh:
        try:
            session = new_auth_client().auth.refresh_session(refresh).session
            set_auth_cookies(response, session)
            return session.user
        except Exception:
            pass

    raise HTTPException(status_code=401, detail="Not authenticated")