from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.deps import get_db, get_current_user
from app.models import AssetHistory, User
from app.serializers import history_to_dict

router = APIRouter()


@router.get("/")
def list_history(
    activity_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(AssetHistory)
    if activity_type:
        query = query.filter(AssetHistory.activity_type == activity_type)
    if search:
        like = f"%{search}%"
        query = query.filter(
            AssetHistory.asset_code.ilike(like)
            | AssetHistory.performed_by.ilike(like)
            | AssetHistory.notes.ilike(like)
            | AssetHistory.field_changed.ilike(like)
        )
    rows = query.order_by(AssetHistory.timestamp.desc()).limit(limit).all()
    return [history_to_dict(h) for h in rows]
