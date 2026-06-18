"""Helpers that turn ORM objects into JSON-ready dicts.

Dynamic fields (dropdown options stored as JSON text, per-asset values stored
in a separate table) make the response shapes awkward for plain ORM-mode Pydantic,
so we build the dicts explicitly here.
"""
from app.utils import parse_options


def _to_float(value):
    """Parse a value that may be a decrypted string, Decimal, or None."""
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def field_to_dict(field) -> dict:
    return {
        "id": field.id,
        "asset_type_id": field.asset_type_id,
        "field_key": field.field_key,
        "field_label": field.field_label,
        "data_type": field.data_type,
        "dropdown_options": parse_options(field.dropdown_options),
        "is_required": field.is_required,
        "display_order": field.display_order,
        "is_visible": field.is_visible,
        "status": field.status,
    }


def asset_type_to_dict(at, include_hidden: bool = True) -> dict:
    fields = sorted(at.fields, key=lambda x: (x.display_order, x.id))
    if not include_hidden:
        fields = [f for f in fields if f.is_visible]
    visible_count = len([f for f in fields if f.is_visible])
    return {
        "id": at.id,
        "name": at.name,
        "description": at.description,
        "icon": at.icon,
        "status": at.status,
        "is_active": at.is_active,
        "created_by": at.created_by,
        "created_at": at.created_at,
        "field_count": visible_count,
        "fields": [field_to_dict(f) for f in fields],
    }


def asset_to_dict(asset, include_hidden: bool = False) -> dict:
    values = {fv.field_id: fv.value for fv in asset.field_values}
    fields = []
    if asset.asset_type:
        fields = sorted(asset.asset_type.fields, key=lambda x: (x.display_order, x.id))
        if not include_hidden:
            fields = [f for f in fields if f.is_visible]
    return {
        "id": asset.id,
        "asset_id": asset.asset_id,
        "description": asset.description,
        "asset_type_id": asset.asset_type_id,
        "asset_type_name": asset.asset_type.name if asset.asset_type else None,
        "asset_type_icon": asset.asset_type.icon if asset.asset_type else None,
        "status": asset.status,
        "location": asset.location,
        "employee_id": asset.employee_id,
        "employee_name": asset.employee.full_name if asset.employee else None,
        "assignment_date": asset.assignment_date,
        "notes": asset.notes,
        "created_by": asset.created_by,
        "created_at": asset.created_at,
        "updated_at": asset.updated_at,
        "fields": [
            {
                "field_id": f.id,
                "field_key": f.field_key,
                "field_label": f.field_label,
                "data_type": f.data_type,
                "dropdown_options": parse_options(f.dropdown_options),
                "is_required": f.is_required,
                "value": values.get(f.id),
            }
            for f in fields
        ],
    }


def history_to_dict(h) -> dict:
    return {
        "id": h.id,
        "asset_id": h.asset_id,
        "asset_code": h.asset_code,
        "activity_type": h.activity_type,
        "performed_by": h.performed_by,
        "timestamp": h.timestamp,
        "field_changed": h.field_changed,
        "old_value": h.old_value,
        "new_value": h.new_value,
        "notes": h.notes,
    }


def price_to_dict(p) -> dict:
    return {
        "id": p.id,
        "asset_id": p.asset_id,
        "asset_code": p.asset.asset_id if p.asset else None,
        "asset_description": p.asset.description if p.asset else None,
        "purchase_price": _to_float(p.purchase_price),
        "currency": p.currency,
        "purchase_date": p.purchase_date,
        "vendor": p.vendor,
        "invoice_number": p.invoice_number,
        "warranty_start": p.warranty_start,
        "warranty_end": p.warranty_end,
        "notes": p.notes,
        "created_by": p.created_by,
        "created_at": p.created_at,
    }


def repair_to_dict(r) -> dict:
    return {
        "id": r.id,
        "repair_id": r.repair_id,
        "asset_id": r.asset_id,
        "asset_code": r.asset.asset_id if r.asset else None,
        "asset_type_name": r.asset.asset_type.name if r.asset and r.asset.asset_type else None,
        "asset_description": r.asset.description if r.asset else None,
        "asset_owner_id": r.asset_owner_id,
        "asset_owner_name": r.owner.full_name if r.owner else None,
        "issue_description": r.issue_description,
        "reported_date": r.reported_date,
        "sent_date": r.sent_date,
        "returned_date": r.returned_date,
        "time_taken_days": r.time_taken_days,
        "repair_vendor": r.repair_vendor,
        "repair_cost": _to_float(r.repair_cost),
        "repair_currency": r.repair_currency,
        "under_warranty": r.under_warranty,
        "status": r.status,
        "resolution_notes": r.resolution_notes,
        "created_by": r.created_by,
        "created_at": r.created_at,
        "updated_at": r.updated_at,
    }
