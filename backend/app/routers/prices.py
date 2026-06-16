from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

from app.deps import get_db, get_current_user
from app.models import AssetPrice, Asset, User
from app.schemas import PriceCreate, PriceUpdate
from app.serializers import price_to_dict
from app.activity import log_activity

router = APIRouter()


@router.get("/")
def list_prices(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(AssetPrice).join(Asset, AssetPrice.asset_id == Asset.id)
    if search:
        like = f"%{search}%"
        query = query.filter(
            Asset.asset_id.ilike(like)
            | Asset.description.ilike(like)
            | AssetPrice.vendor.ilike(like)
            | AssetPrice.invoice_number.ilike(like)
        )
    prices = query.order_by(AssetPrice.created_at.desc()).all()
    return [price_to_dict(p) for p in prices]


@router.get("/summary")
def price_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(AssetPrice.currency, func.sum(AssetPrice.purchase_price), func.count(AssetPrice.id))
        .group_by(AssetPrice.currency)
        .all()
    )
    return {
        "by_currency": [
            {"currency": c or "INR", "total": float(total or 0), "count": count}
            for c, total, count in rows
        ]
    }


@router.post("/", status_code=201)
def create_price(
    payload: PriceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(status_code=400, detail="Invalid asset")

    existing = db.query(AssetPrice).filter(AssetPrice.asset_id == payload.asset_id).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="A price record already exists for this asset. Edit it instead.",
        )

    price = AssetPrice(**payload.model_dump(), created_by=current_user.email)
    db.add(price)
    log_activity(
        db,
        activity_type="Price Added",
        performed_by=current_user.email,
        asset_id=asset.id,
        asset_code=asset.asset_id,
        new_value=f"{payload.currency} {payload.purchase_price}",
    )
    db.commit()
    db.refresh(price)
    return price_to_dict(price)


@router.put("/{price_id}")
def update_price(
    price_id: int,
    payload: PriceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    price = db.query(AssetPrice).filter(AssetPrice.id == price_id).first()
    if not price:
        raise HTTPException(status_code=404, detail="Price record not found")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(price, k, v)

    log_activity(
        db,
        activity_type="Price Updated",
        performed_by=current_user.email,
        asset_id=price.asset_id,
        asset_code=price.asset.asset_id if price.asset else None,
    )
    db.commit()
    db.refresh(price)
    return price_to_dict(price)


@router.delete("/{price_id}")
def delete_price(
    price_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    price = db.query(AssetPrice).filter(AssetPrice.id == price_id).first()
    if not price:
        raise HTTPException(status_code=404, detail="Price record not found")
    db.delete(price)
    db.commit()
    return {"message": "Price record deleted"}
