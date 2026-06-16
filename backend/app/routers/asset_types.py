from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.deps import get_db, get_current_user
from app.models import AssetType, AssetTypeField, Asset, User
from app.schemas import AssetTypeCreate, AssetTypeUpdate, FieldCreate, FieldUpdate
from app.serializers import asset_type_to_dict, field_to_dict
from app.utils import slugify, dump_options
from app.activity import log_activity

router = APIRouter()


def _unique_field_key(existing_keys: set, label: str) -> str:
    base = slugify(label)
    key = base
    i = 2
    while key in existing_keys:
        key = f"{base}_{i}"
        i += 1
    existing_keys.add(key)
    return key


@router.get("/")
def list_asset_types(
    only_active: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List asset types. only_active=true returns just approved, active types
    (used by the asset create form); otherwise returns all (used by the manager)."""
    query = db.query(AssetType)
    if only_active:
        query = query.filter(AssetType.status == "active", AssetType.is_active == True)  # noqa: E712
    types = query.order_by(AssetType.name).all()
    return [asset_type_to_dict(t, include_hidden=not only_active) for t in types]


@router.get("/{type_id}")
def get_asset_type(
    type_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(AssetType).filter(AssetType.id == type_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Asset type not found")
    return asset_type_to_dict(t, include_hidden=True)


@router.post("/", status_code=201)
def create_asset_type(
    payload: AssetTypeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = db.query(AssetType).filter(AssetType.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="An asset type with this name already exists")

    # IT Admin changes need Super Admin approval; Super Admin changes apply immediately.
    is_super = current_user.role == "super_admin"
    type_status = "active" if is_super else "pending"

    asset_type = AssetType(
        name=payload.name,
        description=payload.description,
        icon=payload.icon,
        status=type_status,
        is_active=True,
        created_by=current_user.email,
    )
    db.add(asset_type)
    db.flush()  # get id

    keys: set = set()
    for idx, fld in enumerate(payload.fields):
        db.add(AssetTypeField(
            asset_type_id=asset_type.id,
            field_key=_unique_field_key(keys, fld.field_label),
            field_label=fld.field_label,
            data_type=fld.data_type,
            dropdown_options=dump_options(fld.dropdown_options),
            is_required=fld.is_required,
            display_order=fld.display_order if fld.display_order else idx,
            is_visible=True,
            status="active" if is_super else "pending",
        ))

    log_activity(
        db,
        activity_type="Asset Type Created" if is_super else "Asset Type Requested",
        performed_by=current_user.email,
        notes=f"Type '{payload.name}'" + ("" if is_super else " — awaiting Super Admin approval"),
    )
    db.commit()
    db.refresh(asset_type)
    return asset_type_to_dict(asset_type, include_hidden=True)


@router.put("/{type_id}")
def update_asset_type(
    type_id: int,
    payload: AssetTypeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(AssetType).filter(AssetType.id == type_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Asset type not found")

    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] != t.name:
        dup = db.query(AssetType).filter(
            AssetType.name == data["name"], AssetType.id != type_id
        ).first()
        if dup:
            raise HTTPException(status_code=400, detail="An asset type with this name already exists")

    for k, v in data.items():
        setattr(t, k, v)

    log_activity(
        db,
        activity_type="Asset Type Modified",
        performed_by=current_user.email,
        notes=f"Type '{t.name}' updated",
    )
    db.commit()
    db.refresh(t)
    return asset_type_to_dict(t, include_hidden=True)


# ── Field management ─────────────────────────────────────────────────────────
@router.post("/{type_id}/fields", status_code=201)
def add_field(
    type_id: int,
    fld: FieldCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    t = db.query(AssetType).filter(AssetType.id == type_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Asset type not found")

    is_super = current_user.role == "super_admin"
    keys = {f.field_key for f in t.fields}
    max_order = max([f.display_order for f in t.fields], default=-1)

    field = AssetTypeField(
        asset_type_id=type_id,
        field_key=_unique_field_key(keys, fld.field_label),
        field_label=fld.field_label,
        data_type=fld.data_type,
        dropdown_options=dump_options(fld.dropdown_options),
        is_required=fld.is_required,
        display_order=fld.display_order if fld.display_order else max_order + 1,
        is_visible=True,
        status="active" if is_super else "pending",
    )
    db.add(field)
    log_activity(
        db,
        activity_type="Field Added to Type" if is_super else "Field Add Requested",
        performed_by=current_user.email,
        field_changed=fld.field_label,
        notes=f"On type '{t.name}'" + ("" if is_super else " — awaiting approval"),
    )
    db.commit()
    db.refresh(field)
    return field_to_dict(field)


@router.put("/fields/{field_id}")
def update_field(
    field_id: int,
    payload: FieldUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    field = db.query(AssetTypeField).filter(AssetTypeField.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    data = payload.model_dump(exclude_unset=True)
    if "dropdown_options" in data:
        field.dropdown_options = dump_options(data.pop("dropdown_options"))
    for k, v in data.items():
        setattr(field, k, v)

    db.commit()
    db.refresh(field)
    return field_to_dict(field)


@router.patch("/fields/{field_id}/visibility")
def toggle_field_visibility(
    field_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fields are never deleted — only hidden/shown. Data is always retained."""
    field = db.query(AssetTypeField).filter(AssetTypeField.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")

    field.is_visible = not field.is_visible
    log_activity(
        db,
        activity_type="Field Hidden" if not field.is_visible else "Field Shown",
        performed_by=current_user.email,
        field_changed=field.field_label,
    )
    db.commit()
    db.refresh(field)
    return field_to_dict(field)
