"""Shared FastAPI dependencies — the current authenticated user."""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user import User
from app.security import decode_access_token

# tokenUrl is used by Swagger's "Authorize" button; token is read from the header.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

_credentials_error = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    user_id = decode_access_token(token)
    if user_id is None:
        raise _credentials_error
    user = db.get(User, user_id)
    if user is None:
        raise _credentials_error
    # Defense in depth: login already blocks unverified accounts, but this makes an
    # unverified user unusable even if a token were obtained some other way.
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please confirm your email first — check your inbox for the link.",
        )
    return user
