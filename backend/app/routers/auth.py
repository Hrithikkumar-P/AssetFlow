import secrets
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import User, PasswordResetOTP, PasswordResetRequest, LoginAttempt
from app.schemas import (
    Token, LoginRequest, UserResponse, UserCreate, SetupRequest,
    OTPRequest, OTPVerify, ForgotPasswordAdminRequest,
)
from app.auth import (
    verify_password, get_password_hash, create_access_token,
    validate_password_strength,
)
from app.deps import get_db, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Failed-login lockout policy ──────────────────────────────────────────────
# Up to MAX_FAILED_ATTEMPTS wrong tries are allowed; the next one ("more than 5
# times") locks the account for LOCKOUT_MINUTES. Failures are also counted over
# the same trailing window, so the lock clears automatically once that long has
# passed since the last failed attempt (or sooner via an OTP/admin reset).
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 10


def _find_user(db: Session, identifier: str):
    """Look up a user by email or username."""
    return db.query(User).filter(
        or_(User.email == identifier, User.username == identifier)
    ).first()


def _recent_failed_query(db: Session, user_id: int):
    since = datetime.now(timezone.utc) - timedelta(minutes=LOCKOUT_MINUTES)
    return db.query(LoginAttempt).filter(
        LoginAttempt.user_id == user_id,
        LoginAttempt.successful.is_(False),
        LoginAttempt.attempted_at > since,
    )


def _recent_failed_attempts(db: Session, user_id: int) -> int:
    return _recent_failed_query(db, user_id).count()


def _is_locked(db: Session, user_id: int) -> bool:
    # Locked once failures exceed the allowance (i.e. "more than 5 times").
    return _recent_failed_attempts(db, user_id) > MAX_FAILED_ATTEMPTS


def _lock_remaining_minutes(db: Session, user_id: int) -> int:
    """Whole minutes (rounded up, min 1) until the lock expires."""
    last = (
        _recent_failed_query(db, user_id)
        .order_by(LoginAttempt.attempted_at.desc())
        .first()
    )
    if not last:
        return 0
    unlock_at = last.attempted_at + timedelta(minutes=LOCKOUT_MINUTES)
    seconds = (unlock_at - datetime.now(timezone.utc)).total_seconds()
    return max(1, -(-int(seconds) // 60))  # ceil division, floored at 1


def _locked_detail(db: Session, user_id: int) -> str:
    mins = _lock_remaining_minutes(db, user_id)
    return (
        f"Too many failed login attempts. Password sign-in is locked for about "
        f"{mins} more minute(s). Use 'Forgot password → Get OTP' to reset your "
        f"password and sign in now."
    )


def _clear_login_attempts(db: Session, user_id: int):
    db.query(LoginAttempt).filter(LoginAttempt.user_id == user_id).delete()


@router.get("/setup-status")
def setup_status(db: Session = Depends(get_db)):
    """Public. Returns whether first-run setup is needed (no users exist yet)."""
    return {"needs_setup": db.query(User).count() == 0}


@router.post("/setup", response_model=Token, status_code=201)
def setup_first_admin(payload: SetupRequest, db: Session = Depends(get_db)):
    """
    Public — but only works while the database has zero users. Creates the very
    first Super Admin and logs them in. Once any user exists, this returns 403.
    """
    if db.query(User).count() > 0:
        raise HTTPException(
            status_code=403,
            detail="Setup has already been completed. Please sign in.",
        )

    validate_password_strength(payload.password)
    user = User(
        email=payload.email,
        username=payload.username or None,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role="super_admin",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.email})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


INVALID_CREDENTIALS = "Invalid email/username or password."


@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = _find_user(db, request.email)

    # Unknown identifier → generic 401 (no per-user lockout, avoids enumeration).
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS,
        )

    # If already locked, block password sign-in entirely — OTP is the only way in.
    if _is_locked(db, user.id):
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED, detail=_locked_detail(db, user.id)
        )

    if not verify_password(request.password, user.hashed_password):
        db.add(LoginAttempt(user_id=user.id, successful=False))
        db.commit()
        # If that failure just tripped the lockout, tell the user how to recover.
        if _is_locked(db, user.id):
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED, detail=_locked_detail(db, user.id)
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS,
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled",
        )

    # Successful password login clears the failed-attempt counter.
    _clear_login_attempts(db, user.id)
    db.commit()

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

    validate_password_strength(user_data.password)
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

    validate_password_strength(payload.new_password)
    otp_record.used = True
    user.hashed_password = get_password_hash(payload.new_password)
    # A successful OTP reset lifts any failed-login lockout.
    _clear_login_attempts(db, user.id)
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
