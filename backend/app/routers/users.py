from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.deps import get_db, get_current_user
from app.models import User, PasswordResetRequest, LoginAttempt
from app.schemas import UserCreate, UserUpdate, UserResponse, PasswordResetApprove
from app.auth import get_password_hash, validate_password_strength
from app.activity import log_activity

router = APIRouter()

VALID_ROLES = {"super_admin", "it_admin"}


def _assert_can_assign_role(current_user: User, role: str):
    if role not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    if current_user.role != "super_admin" and role == "super_admin":
        raise HTTPException(
            status_code=403,
            detail="IT Admins cannot create or assign the Super Admin role",
        )


def _assert_can_manage_target(current_user: User, target: User):
    if current_user.role != "super_admin" and target.role == "super_admin":
        raise HTTPException(
            status_code=403,
            detail="IT Admins cannot manage Super Admin accounts",
        )


@router.get("/", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post("/", response_model=UserResponse, status_code=201)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("super_admin", "it_admin"):
        raise HTTPException(status_code=403, detail="Not allowed to create users")

    _assert_can_assign_role(current_user, payload.role)

    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    if payload.username and db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")

    validate_password_strength(payload.password)
    user = User(
        email=payload.email,
        username=payload.username or None,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(user)
    log_activity(
        db,
        activity_type="User Created",
        performed_by=current_user.email,
        new_value=f"{payload.email} ({payload.role})",
    )
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("super_admin", "it_admin"):
        raise HTTPException(status_code=403, detail="Not allowed to manage users")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    _assert_can_manage_target(current_user, user)

    data = payload.model_dump(exclude_unset=True)

    if "username" in data and data["username"] and data["username"] != user.username:
        conflict = db.query(User).filter(
            User.username == data["username"], User.id != user_id
        ).first()
        if conflict:
            raise HTTPException(status_code=400, detail="Username already taken")

    if "role" in data and data["role"] != user.role:
        _assert_can_assign_role(current_user, data["role"])
        if user.id == current_user.id:
            raise HTTPException(status_code=400, detail="You cannot change your own role")

    if "is_active" in data and data["is_active"] is False and user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")

    if data.get("password"):
        validate_password_strength(data["password"])
        user.hashed_password = get_password_hash(data.pop("password"))
    else:
        data.pop("password", None)

    # Convert empty username to None
    if "username" in data and not data["username"]:
        data["username"] = None

    for k, v in data.items():
        setattr(user, k, v)

    log_activity(
        db,
        activity_type="User Updated",
        performed_by=current_user.email,
        new_value=f"{user.email} ({user.role}, {'active' if user.is_active else 'disabled'})",
    )
    db.commit()
    db.refresh(user)
    return user


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("super_admin", "it_admin"):
        raise HTTPException(status_code=403, detail="Not allowed to delete users")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    _assert_can_manage_target(current_user, user)

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    if user.role == "super_admin":
        remaining = db.query(User).filter(
            User.role == "super_admin", User.is_active.is_(True), User.id != user.id
        ).count()
        if remaining == 0:
            raise HTTPException(status_code=400, detail="Cannot delete the last Super Admin")

    log_activity(
        db,
        activity_type="User Deleted",
        performed_by=current_user.email,
        new_value=f"{user.email} ({user.role})",
    )
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}


# ── Password Reset Requests (Super Admin) ────────────────────────────────────

@router.get("/password-reset-requests")
def list_reset_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin only")

    requests = (
        db.query(PasswordResetRequest)
        .filter(PasswordResetRequest.status == "pending")
        .order_by(PasswordResetRequest.requested_at.desc())
        .all()
    )
    result = []
    for r in requests:
        u = db.query(User).filter(User.id == r.user_id).first()
        result.append({
            "id": r.id,
            "user_id": r.user_id,
            "user_email": u.email if u else "Unknown",
            "user_name": u.full_name if u else "Unknown",
            "username": u.username if u else None,
            "requested_at": r.requested_at.isoformat() if r.requested_at else None,
        })
    return result


@router.post("/password-reset-requests/{request_id}/approve")
def approve_reset_request(
    request_id: int,
    payload: PasswordResetApprove,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin only")

    req = db.query(PasswordResetRequest).filter(PasswordResetRequest.id == request_id).first()
    if not req or req.status != "pending":
        raise HTTPException(status_code=404, detail="Request not found or already processed")

    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User no longer exists")

    validate_password_strength(payload.new_password)
    user.hashed_password = get_password_hash(payload.new_password)
    # Lift any failed-login lockout for this user.
    db.query(LoginAttempt).filter(LoginAttempt.user_id == user.id).delete()
    req.status = "approved"
    req.resolved_by = current_user.email
    req.resolved_at = datetime.now(timezone.utc)

    log_activity(
        db,
        activity_type="Password Reset (Admin Approved)",
        performed_by=current_user.email,
        new_value=user.email,
    )
    db.commit()
    return {"message": f"Password reset for {user.email}"}


@router.post("/password-reset-requests/{request_id}/reject")
def reject_reset_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super Admin only")

    req = db.query(PasswordResetRequest).filter(PasswordResetRequest.id == request_id).first()
    if not req or req.status != "pending":
        raise HTTPException(status_code=404, detail="Request not found or already processed")

    req.status = "rejected"
    req.resolved_by = current_user.email
    req.resolved_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Reset request rejected"}
