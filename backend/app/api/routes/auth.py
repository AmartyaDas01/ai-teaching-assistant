"""Authentication endpoints — register, verify, login, current user."""
from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas import (
    EmailCheckRequest,
    EmailCheckResponse,
    RegisterResponse,
    ResendRequest,
    Token,
    UserCreate,
    UserLogin,
    UserOut,
    VerifyRequest,
)
from app.security import (
    create_access_token,
    create_verification_token,
    decode_verification_token,
    hash_password,
    verify_password,
)
from app.services import email_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _token_for(user: User) -> Token:
    return Token(
        access_token=create_access_token(user.id),
        user=UserOut.model_validate(user),
    )


def _assert_deliverable(email: str) -> str:
    """Normalize the address and reject domains that can't receive mail.

    Pydantic's EmailStr only checks syntax, so "prof@gmial.con" passes. This does a
    DNS/MX lookup to reject typos and made-up domains before we try to email them.
    """
    if not settings.check_email_deliverability:
        return email.lower()
    try:
        result = validate_email(email, check_deliverability=True)
    except EmailNotValidError as exc:
        raise HTTPException(
            status_code=400, detail=f"That email address isn't deliverable: {exc}"
        ) from exc
    return result.normalized.lower()


def _send_verification(background: BackgroundTasks, user: User) -> None:
    token = create_verification_token(user.id)
    verify_url = f"{settings.frontend_origin.rstrip('/')}/verify?token={token}"
    # Backgrounded so a slow SMTP handshake never delays the signup response.
    background.add_task(
        email_service.send_verification_email, user.email, user.name, verify_url
    )


@router.post("/check-email", response_model=EmailCheckResponse)
def check_email(payload: EmailCheckRequest):
    """Is this address real? Used by the signup form while the user types.

    Runs the same validation signup does — including the MX lookup — so a bad domain
    is caught at the keystroke rather than after a failed submit.

    It deliberately does NOT report whether the address is already registered. That
    would turn this into an account-enumeration oracle: anyone could probe for valid
    accounts at will.
    """
    email = payload.email.strip()
    if not email:
        return EmailCheckResponse(valid=False, detail="Enter an email address.")
    try:
        validate_email(
            email, check_deliverability=settings.check_email_deliverability
        )
    except EmailNotValidError as exc:
        return EmailCheckResponse(valid=False, detail=str(exc))
    return EmailCheckResponse(valid=True)


@router.post("/register", response_model=RegisterResponse, status_code=201)
def register(
    payload: UserCreate, background: BackgroundTasks, db: Session = Depends(get_db)
):
    email = _assert_deliverable(payload.email)
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        name=payload.name,
        email=email,
        password_hash=hash_password(payload.password),
        # No SMTP configured => nothing could ever verify them, so don't lock them out.
        is_verified=not settings.email_enabled,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if not settings.email_enabled:
        return RegisterResponse(
            verification_required=False,
            message="Account created.",
            token=_token_for(user),
        )

    _send_verification(background, user)
    return RegisterResponse(
        verification_required=True,
        message=f"We sent a confirmation link to {user.email}. Click it to activate your account.",
    )


@router.post("/verify", response_model=Token)
def verify(payload: VerifyRequest, db: Session = Depends(get_db)):
    user_id = decode_verification_token(payload.token)
    if user_id is None:
        raise HTTPException(
            status_code=400,
            detail="This link is invalid or has expired. Request a new one.",
        )
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=400, detail="Account no longer exists.")

    if not user.is_verified:
        user.is_verified = True
        db.commit()
        db.refresh(user)
    # Verifying signs them straight in — clicking the link is proof enough.
    return _token_for(user)


@router.post("/resend-verification", status_code=202)
def resend_verification(
    payload: ResendRequest, background: BackgroundTasks, db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    # Always answer the same way: revealing whether an address is registered would
    # turn this into an account-enumeration oracle.
    if user is not None and not user.is_verified and settings.email_enabled:
        _send_verification(background, user)
    return {"message": "If that account needs verifying, a new link is on its way."}


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Please confirm your email first — check your inbox for the link.",
        )
    return _token_for(user)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user
