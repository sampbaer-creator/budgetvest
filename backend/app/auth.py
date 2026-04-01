from fastapi import Header, HTTPException

from .database import get_user_by_token


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Please sign in to continue.")

    token = authorization.replace("Bearer ", "", 1).strip()
    user = get_user_by_token(token)

    if not user:
        raise HTTPException(status_code=401, detail="Your session has expired. Please sign in again.")

    return user


def get_bearer_token(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Please sign in to continue.")

    return authorization.replace("Bearer ", "", 1).strip()
