from sqlalchemy import (
    Column, Integer, BigInteger, String, DateTime, Date,
    ForeignKey, Text, Boolean, Numeric, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

SCHEMA = "asset_mgr"


# ── Users (app login accounts) ───────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=True)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="it_admin")  # super_admin | it_admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── Employees (asset owners) ─────────────────────────────────────────────────
class Employee(Base):
    __tablename__ = "employees"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, unique=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=True)
    department = Column(String, nullable=True)
    designation = Column(String, nullable=True)
    work_location = Column(String, default="Office")
    phone = Column(String, nullable=True)
    status = Column(String, default="Active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── Asset Types (dynamic templates) ──────────────────────────────────────────
class AssetType(Base):
    __tablename__ = "asset_types"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(20), nullable=True)            # emoji icon
    status = Column(String(20), default="active")       # active | pending | rejected
    is_active = Column(Boolean, default=True)           # FALSE = retired/hidden
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    fields = relationship(
        "AssetTypeField",
        back_populates="asset_type",
        cascade="all, delete-orphan",
    )


# ── Asset Type Fields (dynamic field definitions) ────────────────────────────
class AssetTypeField(Base):
    __tablename__ = "asset_type_fields"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    asset_type_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.asset_types.id", ondelete="CASCADE"),
        nullable=False,
    )
    field_key = Column(String(100), nullable=False)
    field_label = Column(String(150), nullable=False)
    data_type = Column(String(30), default="text")      # text|number|date|boolean|dropdown
    dropdown_options = Column(Text, nullable=True)       # JSON array string
    is_required = Column(Boolean, default=False)
    display_order = Column(Integer, default=0)
    is_visible = Column(Boolean, default=True)           # FALSE = hidden in UI, data kept
    status = Column(String(20), default="active")        # active | pending
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    asset_type = relationship("AssetType", back_populates="fields")


# ── Assets (actual items) ────────────────────────────────────────────────────
class Asset(Base):
    __tablename__ = "assets"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(String(10), unique=True, index=True, nullable=False)  # AST-XXXXX
    description = Column(Text, nullable=True)            # "Ravi Kumar — Dell XPS 15"
    asset_type_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.asset_types.id"),
        nullable=False,
    )
    status = Column(String(30), default="Available")    # Available|Assigned|In Repair|Retired
    location = Column(String(50), default="Office")
    employee_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.employees.id"),
        nullable=True,
    )
    assignment_date = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    asset_type = relationship("AssetType")
    employee = relationship("Employee")
    field_values = relationship(
        "AssetFieldValue",
        back_populates="asset",
        cascade="all, delete-orphan",
    )


# ── Asset Field Values (per-asset dynamic values) ────────────────────────────
class AssetFieldValue(Base):
    __tablename__ = "asset_field_values"
    __table_args__ = (
        UniqueConstraint("asset_id", "field_id", name="uq_asset_field"),
        {"schema": SCHEMA},
    )

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.assets.id", ondelete="CASCADE"),
        nullable=False,
    )
    field_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.asset_type_fields.id"),
        nullable=False,
    )
    value = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    asset = relationship("Asset", back_populates="field_values")
    field = relationship("AssetTypeField")


# ── Activity History ─────────────────────────────────────────────────────────
class AssetHistory(Base):
    __tablename__ = "asset_history"
    __table_args__ = {"schema": SCHEMA}

    id = Column(BigInteger, primary_key=True, index=True)
    asset_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.assets.id", ondelete="SET NULL"),
        nullable=True,
    )
    asset_code = Column(String(10), nullable=True)       # AST-XXXXX kept for display
    activity_type = Column(String(50), nullable=False)
    performed_by = Column(String(255), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    field_changed = Column(String(150), nullable=True)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)


# ── Asset Prices (purchase cost only) ────────────────────────────────────────
class AssetPrice(Base):
    __tablename__ = "asset_prices"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.assets.id", ondelete="CASCADE"),
        nullable=False,
    )
    purchase_price = Column(Numeric(12, 2), nullable=True)
    currency = Column(String(10), default="INR")         # INR|USD|EUR|GBP|AED
    purchase_date = Column(Date, nullable=True)
    vendor = Column(String(150), nullable=True)
    invoice_number = Column(String(100), nullable=True)
    warranty_start = Column(Date, nullable=True)
    warranty_end = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    asset = relationship("Asset")


# ── Repairs (post-purchase expenditure) ──────────────────────────────────────
class Repair(Base):
    __tablename__ = "repairs"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    repair_id = Column(String(30), unique=True, index=True)   # RPR-2026-0001
    asset_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.assets.id", ondelete="CASCADE"),
        nullable=False,
    )
    asset_owner_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.employees.id"),
        nullable=True,
    )
    issue_description = Column(Text, nullable=True)
    reported_date = Column(Date, nullable=True)
    sent_date = Column(Date, nullable=True)
    returned_date = Column(Date, nullable=True)
    time_taken_days = Column(Integer, nullable=True)
    repair_vendor = Column(String(150), nullable=True)
    repair_cost = Column(Numeric(12, 2), nullable=True)
    repair_currency = Column(String(10), default="INR")
    under_warranty = Column(Boolean, default=False)
    status = Column(String(30), default="Open")          # Open|In Progress|Completed|Cancelled
    resolution_notes = Column(Text, nullable=True)
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    asset = relationship("Asset")
    owner = relationship("Employee")


# ── Password Reset — OTP (60-second window, logged to console) ───────────────
class PasswordResetOTP(Base):
    __tablename__ = "password_reset_otps"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    otp = Column(String(6), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


# ── Password Reset — Admin Approval Request ──────────────────────────────────
class PasswordResetRequest(Base):
    __tablename__ = "password_reset_requests"
    __table_args__ = {"schema": SCHEMA}

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey(f"{SCHEMA}.users.id", ondelete="CASCADE"),
        nullable=False,
    )
    status = Column(String(20), default="pending")   # pending | approved | rejected | cancelled
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_by = Column(String(255), nullable=True)  # email of admin who acted
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User")
