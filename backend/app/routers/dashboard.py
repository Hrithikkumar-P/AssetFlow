from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.deps import get_db, get_current_user
from app.models import (
    Asset, AssetType, Employee, Repair, AssetPrice, AssetHistory, User,
)
from app.serializers import history_to_dict

router = APIRouter()


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_assets = db.query(Asset).count()
    assigned = db.query(Asset).filter(Asset.status == "Assigned").count()
    available = db.query(Asset).filter(Asset.status == "Available").count()
    in_repair = db.query(Asset).filter(Asset.status == "In Repair").count()
    retired = db.query(Asset).filter(Asset.status == "Retired").count()
    total_employees = db.query(Employee).filter(Employee.status == "Active").count()
    total_types = db.query(AssetType).filter(AssetType.status == "active").count()
    open_repairs = db.query(Repair).filter(Repair.status.in_(["Open", "In Progress"])).count()

    # Asset counts grouped by type name
    by_type_rows = (
        db.query(AssetType.name, func.count(Asset.id))
        .outerjoin(Asset, Asset.asset_type_id == AssetType.id)
        .group_by(AssetType.name)
        .all()
    )
    assets_by_type = {name: count for name, count in by_type_rows if count > 0}

    # Purchase value grouped by currency
    purchase_rows = (
        db.query(AssetPrice.currency, func.sum(AssetPrice.purchase_price))
        .group_by(AssetPrice.currency)
        .all()
    )
    purchase_by_currency = [
        {"currency": c or "INR", "total": float(t or 0)} for c, t in purchase_rows
    ]

    # Repair cost grouped by currency
    repair_rows = (
        db.query(Repair.repair_currency, func.sum(Repair.repair_cost))
        .group_by(Repair.repair_currency)
        .all()
    )
    repair_by_currency = [
        {"currency": c or "INR", "total": float(t or 0)} for c, t in repair_rows
    ]

    return {
        "total_assets": total_assets,
        "assigned_assets": assigned,
        "available_assets": available,
        "in_repair_assets": in_repair,
        "retired_assets": retired,
        "total_employees": total_employees,
        "total_asset_types": total_types,
        "open_repairs": open_repairs,
        "assets_by_type": assets_by_type,
        "purchase_by_currency": purchase_by_currency,
        "repair_by_currency": repair_by_currency,
    }


@router.get("/recent-activity")
def get_recent_activity(
    limit: int = 8,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(AssetHistory)
        .order_by(AssetHistory.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [history_to_dict(h) for h in rows]
