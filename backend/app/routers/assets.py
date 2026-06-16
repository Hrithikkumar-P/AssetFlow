from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.deps import get_db, get_current_user
from app.models import Asset, AssetType, AssetTypeField, AssetFieldValue, User
from app.schemas import AssetCreate, AssetUpdate
from app.serializers import asset_to_dict, history_to_dict
from app.models import AssetHistory
from app.utils import random_asset_code
from app.activity import log_activity

router = APIRouter()


def _generate_asset_code(db: Session) -> str:
    for _ in range(50):
        code = random_asset_code()
        if not db.query(Asset).filter(Asset.asset_id == code).first():
            return code
    raise HTTPException(status_code=500, detail="Could not generate a unique asset ID")


def _field_label_map(db: Session, asset_type_id: int) -> dict:
    fields = db.query(AssetTypeField).filter(
        AssetTypeField.asset_type_id == asset_type_id
    ).all()
    return {f.id: f.field_label for f in fields}


@router.get("/")
def list_assets(
    status: Optional[str] = Query(None),
    asset_type_id: Optional[int] = Query(None),
    employee_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 300,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Asset)
    if status:
        query = query.filter(Asset.status == status)
    if asset_type_id:
        query = query.filter(Asset.asset_type_id == asset_type_id)
    if employee_id:
        query = query.filter(Asset.employee_id == employee_id)
    if search:
        like = f"%{search}%"
        query = query.filter(
            Asset.asset_id.ilike(like) | Asset.description.ilike(like)
        )
    assets = query.order_by(Asset.created_at.desc()).offset(skip).limit(limit).all()
    return [asset_to_dict(a) for a in assets]


@router.post("/", status_code=201)
def create_asset(
    payload: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset_type = db.query(AssetType).filter(AssetType.id == payload.asset_type_id).first()
    if not asset_type:
        raise HTTPException(status_code=400, detail="Invalid asset type")
    if asset_type.status != "active":
        raise HTTPException(status_code=400, detail="This asset type is not yet approved")

    asset = Asset(
        asset_id=_generate_asset_code(db),
        description=payload.description,
        asset_type_id=payload.asset_type_id,
        status=payload.status,
        location=payload.location,
        employee_id=payload.employee_id,
        assignment_date=datetime.utcnow() if payload.employee_id else None,
        notes=payload.notes,
        created_by=current_user.email,
    )
    db.add(asset)
    db.flush()

    valid_field_ids = {f.id for f in asset_type.fields}
    for fv in payload.field_values:
        if fv.field_id in valid_field_ids and fv.value not in (None, ""):
            db.add(AssetFieldValue(
                asset_id=asset.id,
                field_id=fv.field_id,
                value=str(fv.value),
            ))

    log_activity(
        db,
        activity_type="Asset Created",
        performed_by=current_user.email,
        asset_id=asset.id,
        asset_code=asset.asset_id,
        notes=f"{asset_type.name}" + (f" — {payload.description}" if payload.description else ""),
    )
    db.commit()
    db.refresh(asset)
    return asset_to_dict(asset)


@router.get("/{asset_id}")
def get_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset_to_dict(asset, include_hidden=True)


@router.get("/{asset_id}/history")
def get_asset_history(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    rows = (
        db.query(AssetHistory)
        .filter(AssetHistory.asset_id == asset_id)
        .order_by(AssetHistory.timestamp.desc())
        .all()
    )
    return [history_to_dict(h) for h in rows]


@router.put("/{asset_id}")
def update_asset(
    asset_id: int,
    payload: AssetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    data = payload.model_dump(exclude_unset=True)
    field_values = data.pop("field_values", None)

    # ── Core field changes (logged individually) ──
    label_for_core = {
        "description": "Description",
        "status": "Status",
        "location": "Location",
        "employee_id": "Assigned To",
        "notes": "Notes",
    }
    for key, value in data.items():
        old = getattr(asset, key)
        if old == value:
            continue
        setattr(asset, key, value)
        if key == "employee_id":
            asset.assignment_date = datetime.utcnow() if value else None
            activity = "Asset Assigned" if value else "Asset Returned"
        else:
            activity = "Asset Modified"
        log_activity(
            db,
            activity_type=activity,
            performed_by=current_user.email,
            asset_id=asset.id,
            asset_code=asset.asset_id,
            field_changed=label_for_core.get(key, key),
            old_value=str(old) if old is not None else None,
            new_value=str(value) if value is not None else None,
        )

    # ── Dynamic field value changes ──
    if field_values is not None:
        labels = _field_label_map(db, asset.asset_type_id)
        existing = {
            fv.field_id: fv for fv in
            db.query(AssetFieldValue).filter(AssetFieldValue.asset_id == asset.id).all()
        }
        for fv in field_values:
            fid = fv["field_id"]
            new_val = fv.get("value")
            new_val = str(new_val) if new_val not in (None, "") else None
            row = existing.get(fid)
            old_val = row.value if row else None
            if old_val == new_val:
                continue
            if row:
                row.value = new_val
            elif new_val is not None:
                db.add(AssetFieldValue(asset_id=asset.id, field_id=fid, value=new_val))
            log_activity(
                db,
                activity_type="Asset Modified",
                performed_by=current_user.email,
                asset_id=asset.id,
                asset_code=asset.asset_id,
                field_changed=labels.get(fid, "Field"),
                old_value=old_val,
                new_value=new_val,
            )

    asset.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(asset)
    return asset_to_dict(asset)


@router.delete("/{asset_id}")
def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    code = asset.asset_id
    log_activity(
        db,
        activity_type="Asset Deleted",
        performed_by=current_user.email,
        asset_code=code,
        notes=asset.description,
    )
    db.delete(asset)
    db.commit()
    return {"message": "Asset deleted successfully"}
