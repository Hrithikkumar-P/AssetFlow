from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user, require_super_admin
from app.models import AssetType, AssetTypeField, User
from app.serializers import asset_type_to_dict, field_to_dict
from app.activity import log_activity

router = APIRouter()


@router.get("/pending")
def list_pending(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Pending asset-type and field requests awaiting Super Admin approval."""
    pending_types = (
        db.query(AssetType).filter(AssetType.status == "pending").order_by(AssetType.created_at).all()
    )
    # fields pending on an already-active type (newly requested fields)
    pending_fields = (
        db.query(AssetTypeField)
        .join(AssetType, AssetTypeField.asset_type_id == AssetType.id)
        .filter(AssetTypeField.status == "pending", AssetType.status == "active")
        .all()
    )
    return {
        "types": [asset_type_to_dict(t, include_hidden=True) for t in pending_types],
        "fields": [
            {**field_to_dict(f), "asset_type_name": f.asset_type.name}
            for f in pending_fields
        ],
        "count": len(pending_types) + len(pending_fields),
    }


@router.post("/types/{type_id}/approve")
def approve_type(
    type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    t = db.query(AssetType).filter(AssetType.id == type_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Asset type not found")
    t.status = "active"
    for f in t.fields:
        if f.status == "pending":
            f.status = "active"
    log_activity(
        db, activity_type="Asset Type Approved",
        performed_by=current_user.email, notes=f"Type '{t.name}' approved",
    )
    db.commit()
    return asset_type_to_dict(t, include_hidden=True)


@router.post("/types/{type_id}/reject")
def reject_type(
    type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    t = db.query(AssetType).filter(AssetType.id == type_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Asset type not found")
    log_activity(
        db, activity_type="Asset Type Rejected",
        performed_by=current_user.email, notes=f"Type '{t.name}' rejected",
    )
    db.delete(t)
    db.commit()
    return {"message": "Asset type request rejected"}


@router.post("/fields/{field_id}/approve")
def approve_field(
    field_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    f = db.query(AssetTypeField).filter(AssetTypeField.id == field_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Field not found")
    f.status = "active"
    log_activity(
        db, activity_type="Field Approved",
        performed_by=current_user.email, field_changed=f.field_label,
    )
    db.commit()
    return field_to_dict(f)


@router.post("/fields/{field_id}/reject")
def reject_field(
    field_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    f = db.query(AssetTypeField).filter(AssetTypeField.id == field_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Field not found")
    log_activity(
        db, activity_type="Field Rejected",
        performed_by=current_user.email, field_changed=f.field_label,
    )
    db.delete(f)
    db.commit()
    return {"message": "Field request rejected"}
