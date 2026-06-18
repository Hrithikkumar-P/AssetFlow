from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException
import os
import re

SECRET_KEY = os.getenv("SECRET_KEY", "assetmanager-dev-secret-key-change-in-production-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── Password policy ───────────────────────────────────────────────────────────
PASSWORD_MIN_LENGTH = 12
PASSWORD_RULE = (
    "Password must be at least 12 characters and include "
    "at least one uppercase letter and one special character."
)


def validate_password_strength(password: str) -> None:
    """Raise HTTP 400 if the password fails the policy. No-op if it passes."""
    if (
        not password
        or len(password) < PASSWORD_MIN_LENGTH
        or not re.search(r"[A-Z]", password)
        or not re.search(r"[^A-Za-z0-9]", password)
    ):
        raise HTTPException(status_code=400, detail=PASSWORD_RULE)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
