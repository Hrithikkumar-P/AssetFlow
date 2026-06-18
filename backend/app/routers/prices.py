from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.deps import get_db, get_current_user
from app.models import AssetPrice, Asset, User
from app.schemas import PriceCreate, PriceUpdate
from app.serializers import price_to_dict, _to_float
from app.activity import log_activity

router = APIRouter()


@router.get("/")
def list_prices(
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # vendor / invoice_number are encrypted at rest, so they can't be filtered
    # with SQL ILIKE. We fetch (joined with Asset) and filter in the app layer.
    prices = (
        db.query(AssetPrice)
        .join(Asset, AssetPrice.asset_id == Asset.id)
        .order_by(AssetPrice.created_at.desc())
        .all()
    )
    if search:
        s = search.lower()

        def matches(p):
            haystay = [
                p.asset.asset_id if p.asset else None,
                p.asset.description if p.asset else None,
                p.vendor,           # already decrypted by the ORM type
                p.invoice_number,   # already decrypted by the ORM type
            ]
            return any(h and s in h.lower() for h in haystay)

        prices = [p for p in prices if matches(p)]
    return [price_to_dict(p) for p in prices]


@router.get("/summary")
def price_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # purchase_price is encrypted, so SUM is computed in the app layer.
    # The ORM type already decrypts p.purchase_price to its plaintext string.
    totals = {}
    for p in db.query(AssetPrice).all():
        cur = p.currency or "INR"
        amount = _to_float(p.purchase_price) or 0.0
        bucket = totals.setdefault(cur, {"currency": cur, "total": 0.0, "count": 0})
        bucket["total"] += amount
        bucket["count"] += 1
    return {"by_currency": list(totals.values())}


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
        # Avoid writing the (sensitive) amount into the plaintext history log.
        new_value=f"{payload.currency} purchase price recorded",
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
