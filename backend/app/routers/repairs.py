from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.deps import get_db, get_current_user
from app.models import Repair, Asset, User
from app.schemas import RepairCreate, RepairUpdate
from app.serializers import repair_to_dict
from app.utils import repair_year_prefix
from app.activity import log_activity

router = APIRouter()


def _generate_repair_id(db: Session) -> str:
    prefix = repair_year_prefix()
    count = db.query(Repair).filter(Repair.repair_id.like(f"{prefix}%")).count() + 1
    return f"{prefix}{count:04d}"


def _compute_days(sent, returned):
    if sent and returned:
        return max((returned - sent).days, 0)
    return None


@router.get("/")
def list_repairs(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Repair).join(Asset, Repair.asset_id == Asset.id)
    if status:
        query = query.filter(Repair.status == status)
    if search:
        like = f"%{search}%"
        query = query.filter(
            Repair.repair_id.ilike(like)
            | Asset.asset_id.ilike(like)
            | Asset.description.ilike(like)
            | Repair.repair_vendor.ilike(like)
        )
    repairs = query.order_by(Repair.created_at.desc()).all()
    return [repair_to_dict(r) for r in repairs]


@router.post("/", status_code=201)
def create_repair(
    payload: RepairCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=400, detail="Invalid asset")

    data = payload.model_dump()
    if data.get("time_taken_days") is None:
        data["time_taken_days"] = _compute_days(data.get("sent_date"), data.get("returned_date"))
    # default owner to the asset's current holder
    if not data.get("asset_owner_id"):
        data["asset_owner_id"] = asset.employee_id

    repair = Repair(
        **data,
        repair_id=_generate_repair_id(db),
        created_by=current_user.email,
    )
    db.add(repair)

    # Move the asset into "In Repair" while the repair is open
    if repair.status in ("Open", "In Progress"):
        asset.status = "In Repair"

    log_activity(
        db,
        activity_type="Repair Added",
        performed_by=current_user.email,
        asset_id=asset.id,
        asset_code=asset.asset_id,
        notes=payload.issue_description,
        new_value=f"{payload.repair_currency} {payload.repair_cost}" if payload.repair_cost else None,
    )
    db.commit()
    db.refresh(repair)
    return repair_to_dict(repair)


@router.put("/{repair_id}")
def update_repair(
    repair_id: int,
    payload: RepairUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repair = db.query(Repair).filter(Repair.id == repair_id).first()
    if not repair:
        raise HTTPException(status_code=404, detail="Repair not found")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(repair, k, v)

    # recompute duration if dates present and not explicitly provided
    if "time_taken_days" not in data:
        computed = _compute_days(repair.sent_date, repair.returned_date)
        if computed is not None:
            repair.time_taken_days = computed

    # When a repair completes, return the asset to service
    if repair.status in ("Completed", "Cancelled") and repair.asset:
        if repair.asset.status == "In Repair":
            repair.asset.status = "Assigned" if repair.asset.employee_id else "Available"

    log_activity(
        db,
        activity_type="Repair Updated",
        performed_by=current_user.email,
        asset_id=repair.asset_id,
        asset_code=repair.asset.asset_id if repair.asset else None,
        new_value=repair.status,
    )
    db.commit()
    db.refresh(repair)
    return repair_to_dict(repair)


@router.delete("/{repair_id}")
def delete_repair(
    repair_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repair = db.query(Repair).filter(Repair.id == repair_id).first()
    if not repair:
        raise HTTPException(status_code=404, detail="Repair not found")
    db.delete(repair)
    db.commit()
    return {"message": "Repair deleted"}
