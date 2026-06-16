import random
import re
import string
import json
from datetime import datetime


def slugify(text: str) -> str:
    """Turn a human label into a snake_case field key."""
    s = re.sub(r"[^a-z0-9]+", "_", (text or "").lower()).strip("_")
    return s or "field"


def random_asset_code(k: int = 5) -> str:
    """Generate an AST-XXXXX code (5 alphanumeric chars)."""
    chars = string.ascii_uppercase + string.digits
    return "AST-" + "".join(random.choices(chars, k=k))


def dump_options(options) -> str | None:
    """Serialize a dropdown options list to a JSON string for storage."""
    if not options:
        return None
    return json.dumps(options)


def parse_options(raw):
    """Parse a stored JSON options string back to a list."""
    if not raw:
        return None
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return None


def repair_year_prefix() -> str:
    return f"RPR-{datetime.now().year}-"
