from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime, date


# ── Auth ──────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: Optional[str] = None
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    email: str
    username: Optional[str] = None
    full_name: str
    password: str
    role: str = "it_admin"


class SetupRequest(BaseModel):
    """First-run creation of the very first Super Admin."""
    email: str
    username: Optional[str] = None
    full_name: str
    password: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


# ── Password Reset ────────────────────────────────────────────────────────────
class OTPRequest(BaseModel):
    email: str          # accepts email or username


class OTPVerify(BaseModel):
    email: str          # accepts email or username
    otp: str
    new_password: str


class ForgotPasswordAdminRequest(BaseModel):
    email: str          # accepts email or username


class PasswordResetApprove(BaseModel):
    new_password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# ── Employee ──────────────────────────────────────────────────────────────────
class EmployeeBase(BaseModel):
    full_name: str
    email: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    work_location: Optional[str] = "Office"
    phone: Optional[str] = None
    status: str = "Active"


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeResponse(EmployeeBase):
    id: int
    employee_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ── Asset Type Fields ─────────────────────────────────────────────────────────
class FieldCreate(BaseModel):
    field_label: str
    data_type: str = "text"                     # text|number|date|boolean|dropdown
    dropdown_options: Optional[List[str]] = None
    is_required: bool = False
    display_order: int = 0


class FieldUpdate(BaseModel):
    field_label: Optional[str] = None
    data_type: Optional[str] = None
    dropdown_options: Optional[List[str]] = None
    is_required: Optional[bool] = None
    display_order: Optional[int] = None
    is_visible: Optional[bool] = None


# ── Asset Types ───────────────────────────────────────────────────────────────
class AssetTypeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    fields: List[FieldCreate] = []


class AssetTypeUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None


# ── Assets ────────────────────────────────────────────────────────────────────
class FieldValueInput(BaseModel):
    field_id: int
    value: Optional[str] = None


class AssetCreate(BaseModel):
    description: Optional[str] = None
    asset_type_id: int
    status: str = "Available"
    location: str = "Office"
    employee_id: Optional[int] = None
    notes: Optional[str] = None
    field_values: List[FieldValueInput] = []


class AssetUpdate(BaseModel):
    description: Optional[str] = None
    status: Optional[str] = None
    location: Optional[str] = None
    employee_id: Optional[int] = None
    notes: Optional[str] = None
    field_values: Optional[List[FieldValueInput]] = None


# ── Prices ────────────────────────────────────────────────────────────────────
class PriceCreate(BaseModel):
    asset_id: int
    purchase_price: Optional[float] = None
    currency: str = "INR"
    purchase_date: Optional[date] = None
    vendor: Optional[str] = None
    invoice_number: Optional[str] = None
    warranty_start: Optional[date] = None
    warranty_end: Optional[date] = None
    notes: Optional[str] = None


class PriceUpdate(BaseModel):
    purchase_price: Optional[float] = None
    currency: Optional[str] = None
    purchase_date: Optional[date] = None
    vendor: Optional[str] = None
    invoice_number: Optional[str] = None
    warranty_start: Optional[date] = None
    warranty_end: Optional[date] = None
    notes: Optional[str] = None


# ── Repairs ───────────────────────────────────────────────────────────────────
class RepairCreate(BaseModel):
    asset_id: int
    asset_owner_id: Optional[int] = None
    issue_description: Optional[str] = None
    reported_date: Optional[date] = None
    sent_date: Optional[date] = None
    returned_date: Optional[date] = None
    time_taken_days: Optional[int] = None
    repair_vendor: Optional[str] = None
    repair_cost: Optional[float] = None
    repair_currency: str = "INR"
    under_warranty: bool = False
    status: str = "Open"
    resolution_notes: Optional[str] = None


class RepairUpdate(BaseModel):
    asset_owner_id: Optional[int] = None
    issue_description: Optional[str] = None
    reported_date: Optional[date] = None
    sent_date: Optional[date] = None
    returned_date: Optional[date] = None
    time_taken_days: Optional[int] = None
    repair_vendor: Optional[str] = None
    repair_cost: Optional[float] = None
    repair_currency: Optional[str] = None
    under_warranty: Optional[bool] = None
    status: Optional[str] = None
    resolution_notes: Optional[str] = None
