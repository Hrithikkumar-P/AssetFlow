"""Application-layer field encryption (AES-256-GCM).

Sensitive columns (asset prices, vendors, invoice numbers, repair costs) are
encrypted at rest. The database only ever sees ciphertext; encryption and
decryption happen transparently in the app via the ``EncryptedString``
SQLAlchemy type.

Key management
--------------
The 256-bit master key is read from the ``FIELD_ENCRYPTION_KEY`` environment
variable as a URL-safe base64 string of 32 raw bytes. Generate one with::

    python -c "import os,base64; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"

If the variable is **unset**, encryption gracefully degrades to a no-op
(values are stored as plaintext) so local/dev setups work without configuration.
Set the key in any environment that stores real data.

Format
------
Encrypted values are stored as ``enc:<base64(nonce || ciphertext)>``. The
``enc:`` prefix lets us distinguish ciphertext from legacy plaintext, so the
system keeps working during a gradual migration.
"""
import os
import base64
import logging

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from sqlalchemy.types import TypeDecorator, Text

logger = logging.getLogger(__name__)

_PREFIX = "enc:"
_NONCE_BYTES = 12  # 96-bit nonce, recommended for AES-GCM


def _load_key():
    """Return the 32-byte key, or None if encryption is disabled."""
    raw = os.getenv("FIELD_ENCRYPTION_KEY")
    if not raw:
        return None
    try:
        key = base64.urlsafe_b64decode(raw)
    except Exception as exc:  # noqa: BLE001
        raise ValueError("FIELD_ENCRYPTION_KEY is not valid base64") from exc
    if len(key) != 32:
        raise ValueError("FIELD_ENCRYPTION_KEY must decode to exactly 32 bytes (256 bits)")
    return key


def encryption_enabled() -> bool:
    return _load_key() is not None


def encrypt(plaintext) -> str:
    """Encrypt a value. No-op (returns the plaintext) if no key is configured."""
    if plaintext is None:
        return None
    text = str(plaintext)
    key = _load_key()
    if key is None:
        return text  # encryption disabled — store as-is
    aesgcm = AESGCM(key)
    nonce = os.urandom(_NONCE_BYTES)
    ciphertext = aesgcm.encrypt(nonce, text.encode("utf-8"), None)
    return _PREFIX + base64.b64encode(nonce + ciphertext).decode("ascii")


def decrypt(value):
    """Decrypt a value. Returns plaintext unchanged for legacy/unencrypted data."""
    if value is None:
        return None
    if not isinstance(value, str) or not value.startswith(_PREFIX):
        return value  # legacy plaintext or non-string — return as-is
    key = _load_key()
    if key is None:
        # Data is encrypted but we have no key to read it.
        return "[encrypted]"
    try:
        blob = base64.b64decode(value[len(_PREFIX):])
        nonce, ciphertext = blob[:_NONCE_BYTES], blob[_NONCE_BYTES:]
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ciphertext, None).decode("utf-8")
    except Exception:  # noqa: BLE001 — wrong key, tampering, corruption
        logger.warning("Failed to decrypt a field value (wrong key or tampered data)")
        return "[encrypted]"


def decrypt_float(value):
    """Decrypt and parse a numeric value; returns None if it isn't a number."""
    plain = decrypt(value)
    if plain is None:
        return None
    try:
        return float(plain)
    except (ValueError, TypeError):
        return None


class EncryptedString(TypeDecorator):
    """A Text column whose value is transparently encrypted at rest.

    Works for strings and numbers alike — numbers are encrypted as their string
    form and should be parsed back in the app layer (see ``decrypt_float``).
    """
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return encrypt(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        return decrypt(value)
