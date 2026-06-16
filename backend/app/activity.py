"""Central helper for writing entries to the activity history log.

Callers are responsible for committing the surrounding transaction.
"""
from app.models import AssetHistory


def log_activity(
    db,
    *,
    activity_type: str,
    performed_by: str | None = None,
    asset_id: int | None = None,
    asset_code: str | None = None,
    field_changed: str | None = None,
    old_value: str | None = None,
    new_value: str | None = None,
    notes: str | None = None,
):
    entry = AssetHistory(
        asset_id=asset_id,
        asset_code=asset_code,
        activity_type=activity_type,
        performed_by=performed_by,
        field_changed=field_changed,
        old_value=old_value,
        new_value=new_value,
        notes=notes,
    )
    db.add(entry)
    return entry
