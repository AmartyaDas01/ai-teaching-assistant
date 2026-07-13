"""Password hashing and JWT helpers."""
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": str(user_id), "typ": "access", "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> int | None:
    """Return the user id from a valid access token, or None if invalid/expired."""
    return _decode(token, expected_type="access")


def create_verification_token(user_id: int) -> str:
    """Short-lived token emailed as a signup confirmation link."""
    expire = datetime.now(timezone.utc) + timedelta(
        hours=settings.verification_token_expire_hours
    )
    payload = {"sub": str(user_id), "typ": "verify", "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_verification_token(token: str) -> int | None:
    """Return the user id from a valid verification token, or None."""
    return _decode(token, expected_type="verify")


def _decode(token: str, expected_type: str) -> int | None:
    """Decode a token and enforce its purpose.

    The `typ` claim keeps the two token kinds separate: without it, an email
    verification link would be a usable API bearer token (and vice versa).
    Tokens issued before `typ` existed are treated as access tokens.
    """
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
        if payload.get("typ", "access") != expected_type:
            return None
        sub = payload.get("sub")
        return int(sub) if sub is not None else None
    except (JWTError, ValueError):
        return None
