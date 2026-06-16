import secrets
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import User, PasswordResetOTP, PasswordResetRequest
from app.schemas import (
    Token, LoginRequest, UserResponse, UserCreate,
    OTPRequest, OTPVerify, ForgotPasswordAdminRequest,
)
from app.auth import verify_password, get_password_hash, create_access_token
from app.deps import get_db, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


def _find_user(db: Session, identifier: str):
    """Look up a user by email or username."""
    return db.query(User).filter(
        or_(User.email == identifier, User.username == identifier)
    ).first()


@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = _find_user(db, request.email)
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )
    token = create_access_token({"sub": user.email})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/register", response_model=UserResponse)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can create users")

    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    if user_data.username and db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        email=user_data.email,
        username=user_data.username or None,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ── Forgot Password — OTP path ────────────────────────────────────────────────
@router.post("/request-otp")
def request_otp(payload: OTPRequest, db: Session = Depends(get_db)):
    """
    Generate a 6-digit OTP valid for 60 seconds and write it to the server logs.
    Always returns 200 to avoid revealing whether an account exists.
    """
    user = _find_user(db, payload.email)
    if user and user.is_active:
        otp = f"{secrets.randbelow(1_000_000):06d}"
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=60)

        # Invalidate any existing unused OTPs for this user
        db.query(PasswordResetOTP).filter(
            PasswordResetOTP.user_id == user.id,
            PasswordResetOTP.used.is_(False),
        ).update({"used": True})

        db.add(PasswordResetOTP(user_id=user.id, otp=otp, expires_at=expires_at, used=False))
        db.commit()

        logger.warning(
            "\n" + "=" * 60 +
            f"\n[PASSWORD RESET OTP]"
            f"\n  User    : {user.email}"
            f"\n  OTP     : {otp}"
            f"\n  Expires : {expires_at.strftime('%H:%M:%S UTC')}  (valid 60 s)"
            "\n" + "=" * 60
        )

    return {
        "message": (
            "If this account exists, an OTP has been written to the server logs. "
            "Check the backend console. Valid for 60 seconds."
        )
    }


@router.post("/reset-password-otp")
def reset_password_otp(payload: OTPVerify, db: Session = Depends(get_db)):
    """Verify the 6-digit OTP and set a new password."""
    user = _find_user(db, payload.email)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid OTP or expired.")

    now = datetime.now(timezone.utc)
    otp_record = db.query(PasswordResetOTP).filter(
        PasswordResetOTP.user_id == user.id,
        PasswordResetOTP.otp == payload.otp,
        PasswordResetOTP.used.is_(False),
        PasswordResetOTP.expires_at > now,
    ).first()

    if not otp_record:
        raise HTTPException(status_code=400, detail="Invalid OTP or expired.")

    otp_record.used = True
    user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Password reset successfully. You can now sign in."}


# ── Forgot Password — Admin Approval path ────────────────────────────────────
@router.post("/forgot-password-admin")
def forgot_password_admin(payload: ForgotPasswordAdminRequest, db: Session = Depends(get_db)):
    """
    Create a pending password-reset request visible to Super Admins in the Users page.
    Always returns 200 to avoid revealing whether an account exists.
    """
    user = _find_user(db, payload.email)
    if user and user.is_active:
        # Cancel any existing pending requests for this user
        db.query(PasswordResetRequest).filter(
            PasswordResetRequest.user_id == user.id,
            PasswordResetRequest.status == "pending",
        ).update({"status": "cancelled"})

        db.add(PasswordResetRequest(user_id=user.id, status="pending"))
        db.commit()

    return {
        "message": (
            "If this account exists, a reset request has been sent to a Super Admin. "
            "They will set a new password and notify you."
        )
    }
