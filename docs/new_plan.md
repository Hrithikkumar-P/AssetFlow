# IT Asset Management System — Revised Plan
**Version:** 2.0 | **Date:** June 4, 2026 | **Status:** Draft — Pending Review

---

## 1. What Changed from v1.0

| Area | v1.0 (Old) | v2.0 (New) |
|------|-----------|-----------|
| Asset fields | Fixed fields for every asset | Dynamic fields per asset type |
| Asset types | Hardcoded (Laptop, Monitor, etc.) | Created manually by IT Admin |
| Pricing | Embedded in asset record | Separate dedicated menu |
| Repairs | Part of maintenance tickets | Dedicated Repairs menu |
| Field structure | Same columns for all assets | Each asset type has its own schema |
| History | Basic audit log | Full activity history table per action |

---

## 2. Core Concept — Dynamic Asset Types

The key idea is a **two-layer model**:

```
Layer 1 — Asset Type Definition (the template)
  └── Asset Type: "Laptop"
        ├── Field: RAM             (type: Text,    e.g. "16 GB DDR5")
        ├── Field: Storage Type    (type: Dropdown, options: SSD / HDD / NVMe)
        ├── Field: Storage Size    (type: Number,  e.g. 512)
        ├── Field: Processor       (type: Text,    e.g. "Intel i7-13th Gen")
        └── Field: Screen Size     (type: Number,  e.g. 15.6)

Layer 2 — Asset Record (an actual item)
  └── Asset: "Ravi's Dell XPS 15"  (type: Laptop)
        ├── RAM            → "16 GB DDR5"
        ├── Storage Type   → "NVMe"
        ├── Storage Size   → 512
        ├── Processor      → "Intel i7-13th Gen"
        └── Screen Size    → 15.6
```

This means:
- IT Admin creates an Asset Type called "Laptop" and defines its fields once.
- Every laptop asset created after that uses those fields.
- New fields can be added to a type at any time (existing records show "—" for that field).
- Different types have completely independent field sets.

---

## 3. Modules

### 3.1 Asset Type Manager
**Where:** Settings → Asset Types

**Purpose:** Define what types of assets exist and what fields they have.

**Actions:**
- Create a new Asset Type (name + optional description)
- Add fields to an Asset Type
  - Field Name (label shown to user)
  - Data Type: `Text` | `Number` | `Date` | `Yes/No` | `Dropdown`
  - For Dropdown: define the list of options (e.g. SSD, HDD, NVMe)
  - Mark as Required (yes/no)
  - Set display order
- Edit or remove fields
- Deactivate an Asset Type (hides it from new asset creation but keeps historical records)

**Example Asset Types and their Fields:**

| Type | Fields |
|------|--------|
| Laptop | Brand, Model, Processor, RAM, Storage Type, Storage Size (GB), Screen Size (inches), OS, Serial Number |
| Desktop | Brand, Model, Processor, RAM, Storage Type, Storage Size (GB), OS, Serial Number |
| Mouse | Brand, Model, DPI, Wireless (Yes/No), Color, Serial Number |
| Keyboard | Brand, Model, Layout, Mechanical (Yes/No), Backlit (Yes/No), Wireless (Yes/No) |
| Monitor | Brand, Model, Size (inches), Resolution, Panel Type, Refresh Rate (Hz) |
| Headphones | Brand, Model, Type (Over-Ear/On-Ear/In-Ear), Wireless (Yes/No), Noise Cancelling (Yes/No) |
| Chair | Brand, Model, Adjustable Height (Yes/No), Lumbar Support (Yes/No), Color |
| UPS | Brand, Model, Capacity (VA), Battery Backup (mins) |

---

### 3.2 Create / Edit Asset Page
**Where:** Assets → New Asset

**Purpose:** Register an actual physical item of a given type.

**Flow:**
1. User selects an Asset Type from a dropdown (e.g. "Laptop")
2. System loads that type's field definitions dynamically
3. User fills in the values for each field
4. On save:
   - Asset record is created
   - An entry is written to the **Activity History** table with `activity = Asset Created`

**Core fields on every asset (regardless of type):**

| Field | Description |
|-------|-------------|
| Asset Name / Label | Human-friendly name (e.g. "Ravi's Dell Laptop") |
| Asset Type | Selected type (Laptop, Mouse, etc.) |
| Serial Number | Optional — can also be a type-level field |
| Status | Available / Assigned / In Repair / Retired |
| Location | Office / Remote / Warehouse / Sent for Repair |
| Assigned To | Employee (optional) |
| Notes | Free text |

**Dynamic fields** are rendered below the core fields, based on the selected Asset Type.

**Editing an Asset:**
- All fields editable
- Every save triggers a history entry with `activity = Asset Modified`, recording what changed (old value → new value)

---

### 3.3 Activity History
**Where:** Assets → [Asset Name] → History tab  |  Also: a global History log

**Purpose:** Full traceable log of every action taken on every asset.

**Recorded for:**
- Asset Created
- Asset Modified (which field, old value, new value)
- Asset Assigned (to whom, when)
- Asset Returned
- Asset Sent for Repair
- Asset Retired / Disposed
- Price Record Added
- Repair Record Added / Updated

**History record structure:**

| Column | Description |
|--------|-------------|
| Activity ID | Auto-generated |
| Asset ID | Which asset |
| Activity Type | Asset Created / Modified / Assigned / Returned / Repair Added / Price Added / Retired |
| Performed By | Logged-in user who made the change |
| Timestamp | Date and time |
| Field Changed | (for modifications) Which field was changed |
| Old Value | Previous value |
| New Value | New value |
| Notes | Optional context |

---

### 3.4 Price Management
**Where:** Pricing (separate sidebar menu)

**Purpose:** Track purchase cost of every asset independently from the asset's technical details.

**Price record fields:**

| Field | Description |
|-------|-------------|
| Asset | Link to the asset record |
| Purchase Price | Amount paid |
| Currency | INR / USD / EUR |
| Purchase Date | When it was bought |
| Vendor / Supplier | Who it was purchased from |
| Invoice Number | Reference |
| Invoice File | Upload (PDF / image) |
| Warranty Start | Optional — can be recorded here |
| Warranty End | Optional |
| Notes | Any additional info |

**Scope:** Purchase cost only. Any money spent after the initial purchase (repairs, parts, servicing) is recorded in the Repairs module, not here.

**Features:**
- Each asset has one price record (its original purchase details)
- Currency is selected per record — INR, USD, EUR, GBP, or AED
- No automatic currency conversion; amounts are stored and displayed in their original currency
- Total spend summary: total purchase value of all assets, filterable by type, currency

---

### 3.5 Repairs
**Where:** Repairs (separate sidebar menu)

**Purpose:** Track every repair or service event for any asset.

**Repair record fields:**

| Field | Description |
|-------|-------------|
| Repair ID | Auto-generated (e.g. RPR-2026-0001) |
| Asset | Which asset was repaired |
| Asset Model | Auto-filled from the asset's type fields |
| Asset Owner (User) | Employee the asset belongs to at time of repair |
| Issue Description | What went wrong |
| Reported Date | When the issue was reported |
| Sent to Repair Date | When it was sent out |
| Returned Date | When it came back |
| Time Taken | Auto-calculated (Sent → Returned), or manually entered |
| Repair Vendor | Who did the repair |
| Repair Cost | Total expenditure for this repair (parts + labour) |
| Currency | INR / USD / EUR / GBP / AED |
| Under Warranty | Yes / No (if yes, cost = 0) |
| Status | Open / In Progress / Completed / Cancelled |
| Resolution Notes | What was done |

**Features:**
- Asset status automatically changes to `In Repair` when a repair is opened
- Asset status changes back to `Available` or `Assigned` when repair is marked Completed
- Each repair logs an entry in the Activity History table

---

## 4. Database Schema (v2.0)

### 4.1 Asset Types

```
asset_types
  id               SERIAL PK
  name             VARCHAR(100) UNIQUE NOT NULL    -- "Laptop", "Mouse", etc.
  description      TEXT
  is_active        BOOLEAN DEFAULT TRUE
  created_by       VARCHAR(255)
  created_at       TIMESTAMPTZ DEFAULT NOW()
```

### 4.2 Asset Type Fields (the dynamic field definitions)

```
asset_type_fields
  id               SERIAL PK
  asset_type_id    FK → asset_types.id
  field_key        VARCHAR(100)     -- internal key, e.g. "ram_size"
  field_label      VARCHAR(150)     -- shown to user, e.g. "RAM Size"
  data_type        VARCHAR(30)      -- text | number | date | boolean | dropdown
  dropdown_options TEXT             -- JSON array for dropdown, e.g. ["SSD","HDD","NVMe"]
  is_required      BOOLEAN DEFAULT FALSE
  display_order    INTEGER DEFAULT 0
  is_visible       BOOLEAN DEFAULT TRUE  -- FALSE = hidden from UI, data retained
  created_at       TIMESTAMPTZ DEFAULT NOW()
```

> Fields are never deleted. Setting `is_visible = FALSE` removes the field from all UI views
> while preserving every stored value in `asset_field_values`. Visibility can be restored.

### 4.3 Asset Types — Approval Flow

```
asset_type_change_requests
  id               SERIAL PK
  asset_type_id    FK → asset_types.id (nullable for new-type requests)
  change_type      VARCHAR(30)      -- Create Type | Add Field | Edit Field | Hide Field
  requested_by     VARCHAR(255)     -- IT Admin email
  requested_at     TIMESTAMPTZ DEFAULT NOW()
  payload          TEXT             -- JSON snapshot of the proposed change
  status           VARCHAR(20)      -- Pending | Approved | Rejected
  reviewed_by      VARCHAR(255)     -- Super Admin email
  reviewed_at      TIMESTAMPTZ
  review_notes     TEXT
```

> Super Admin changes bypass this table and apply directly.
> IT Admin changes create a row here; the asset type / field is not updated until a Super Admin approves.

### 4.4 Asset Records

```
assets
  id               SERIAL PK
  asset_id         VARCHAR(10) UNIQUE NOT NULL  -- system-generated "AST-XXXXX"
  description      TEXT                          -- "Ravi Kumar — Dell XPS 15 Laptop"
  asset_type_id    FK → asset_types.id
  status           VARCHAR(30)      -- Available | Assigned | In Repair | Retired
  location         VARCHAR(50)
  assigned_to      FK → employees.id (nullable)
  assignment_date  TIMESTAMPTZ
  notes            TEXT
  created_by       VARCHAR(255)
  created_at       TIMESTAMPTZ DEFAULT NOW()
  updated_at       TIMESTAMPTZ
```

### 4.5 Asset Field Values (dynamic field values per asset)

```
asset_field_values
  id               SERIAL PK
  asset_id         FK → assets.id
  field_id         FK → asset_type_fields.id
  value            TEXT             -- all values stored as text, cast by app
  created_at       TIMESTAMPTZ DEFAULT NOW()
  updated_at       TIMESTAMPTZ

  UNIQUE (asset_id, field_id)
```

### 4.6 Activity History

```
asset_history
  id               BIGSERIAL PK
  asset_id         FK → assets.id
  activity_type    VARCHAR(50)
                   -- Asset Created | Asset Modified | Asset Assigned |
                   -- Asset Returned | Repair Added | Price Added |
                   -- Asset Retired | Field Added to Type
  performed_by     VARCHAR(255)     -- logged-in user email
  timestamp        TIMESTAMPTZ DEFAULT NOW()
  field_changed    VARCHAR(150)     -- NULL for non-modification events
  old_value        TEXT
  new_value        TEXT
  notes            TEXT
```

### 4.7 Price Records

```
asset_prices
  id               SERIAL PK
  asset_id         FK → assets.id
  purchase_price   NUMERIC(12,2)
  currency         VARCHAR(10)      -- INR | USD | EUR | GBP | AED
  purchase_date    DATE
  vendor           VARCHAR(150)
  invoice_number   VARCHAR(100)
  warranty_start   DATE
  warranty_end     DATE
  notes            TEXT
  created_by       VARCHAR(255)
  created_at       TIMESTAMPTZ DEFAULT NOW()
```

> Covers purchase cost only. Post-purchase expenditure (service, parts, labour) belongs in `repairs`.

### 4.8 Repairs

```
repairs
  id               SERIAL PK
  repair_id        VARCHAR(30) UNIQUE    -- RPR-2026-0001
  asset_id         FK → assets.id
  asset_owner_id   FK → employees.id (nullable)  -- who owns it at repair time
  issue_description TEXT
  reported_date    DATE
  sent_date        DATE
  returned_date    DATE
  time_taken_days  INTEGER              -- auto-calculated (sent → returned) or manual
  repair_vendor    VARCHAR(150)
  repair_cost      NUMERIC(12,2)        -- all post-purchase expenditure goes here
  repair_currency  VARCHAR(10)          -- INR | USD | EUR | GBP | AED
  under_warranty   BOOLEAN DEFAULT FALSE
  status           VARCHAR(30)          -- Open | In Progress | Completed | Cancelled
  resolution_notes TEXT
  created_by       VARCHAR(255)
  created_at       TIMESTAMPTZ DEFAULT NOW()
  updated_at       TIMESTAMPTZ
```

---

## 5. UI Pages Summary

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/dashboard` | KPIs, recent activity, asset stats |
| Asset List | `/assets` | All asset records, filter by type/status |
| Create Asset | `/assets/new` | Select type → dynamic form renders |
| Asset Detail | `/assets/:id` | View all fields + history tab |
| Edit Asset | `/assets/:id/edit` | Edit any field, saves to history |
| Asset Types | `/settings/asset-types` | Manage types and their fields |
| Pricing | `/pricing` | All price records, add/edit per asset |
| Repairs | `/repairs` | All repair records, add/edit |
| Employees | `/employees` | Manage employee records |
| History (global) | `/history` | Full activity log across all assets |

---

## 6. Design Decisions (Confirmed)

1. **Pricing scope** — The Price module covers only the **purchase price** of an asset. Any expenditure incurred after purchase (parts, labour, service) is tracked under **Repairs** as repair cost. The two modules are kept fully separate.

2. **Who can manage Asset Types** — Both Super Admins and IT Admins can create and edit Asset Types. However, IT Admin actions (create or edit a type) require **Super Admin approval** before they take effect. Super Admin actions apply immediately.

3. **Field visibility, not deletion** — Fields on an Asset Type can never be permanently deleted. Instead, a field can be marked **hidden**, which removes it from the UI (create form, edit form, detail view, list columns) but keeps all historical values intact in the database. A hidden field can be made visible again at any time.

4. **Asset identification** — Every asset gets a system-generated ID in the format **`AST-XXXXX`** (5 alphanumeric characters, e.g. `AST-A1B2C`). The asset's description field holds a human-readable summary of the owner and the product they have (e.g. *"Ravi Kumar — Dell XPS 15 Laptop"*).

5. **Multi-currency** — All monetary amounts (purchase price, repair cost) support multiple currencies. Supported currencies at launch: INR, USD, EUR, GBP, AED. The currency is selected per record; no automatic conversion is performed — amounts are stored and displayed in their original currency.

---

## 7. Development Phases

### Phase 1 — Core (Implement first)
- Asset Type Manager (create types + define fields)
- Create/Edit Asset page with dynamic form
- Asset list and detail view
- Activity History (auto-logged on every save)

### Phase 2
- Pricing module
- Repairs module
- Dashboard updated with new stats

### Phase 3 (Future)
- Global history log page
- Reports (spend by type, repair costs, etc.)
- Export to Excel/PDF

---

## 8. Security Roadmap

### 8.1 Data Encryption Plan *(planned — not yet implemented)*

Certain fields in the database carry financially or personally sensitive values and should be
encrypted at rest before the system is used in a production environment.

#### Fields targeted for encryption

| Table | Column(s) | Sensitivity |
|-------|-----------|-------------|
| `asset_prices` | `purchase_price`, `vendor`, `invoice_number` | Financial — purchase cost and supplier identity |
| `repairs` | `repair_cost`, `repair_vendor` | Financial — post-purchase expenditure |
| `asset_field_values` | `value` (where the parent field is flagged `is_sensitive`) | Variable — depends on asset type |
| `users` | `email`, `username` | PII — login identity |
| `employees` | `email`, `phone` | PII — personal contact information |

> `hashed_password` is already irreversibly hashed with bcrypt and is **not** a target for
> encryption (hashing is the correct control for passwords).

#### Proposed approach

| Concern | Decision |
|---------|----------|
| **Algorithm** | AES-256-GCM (authenticated encryption — provides both confidentiality and integrity) |
| **Key storage** | Master key loaded from an environment variable (`FIELD_ENCRYPTION_KEY`). Never stored in the database or committed to source control. Rotate via re-encryption script. |
| **Scope** | Application-layer encryption only (the database sees ciphertext). PostgreSQL TDE or disk encryption may be added at the infrastructure level independently. |
| **Searchability** | Encrypted columns cannot be queried with `LIKE` or indexed for fast lookup. Where search is needed (e.g. vendor name), a deterministic HMAC-SHA256 blind index will be stored alongside the ciphertext. |
| **Library** | Python: `cryptography` package (`Fernet` for simplicity, or raw AES-GCM for AEAD). |
| **Migration** | A one-time migration script will read existing plaintext rows, encrypt in-place, and mark the schema version. A rollback script decrypts back to plaintext (for dev/test environments only). |

#### Implementation steps (when prioritised)

1. Add `FIELD_ENCRYPTION_KEY` to the environment / secrets manager.
2. Create `backend/app/encryption.py` — `encrypt(value)` / `decrypt(ciphertext)` helpers using AES-256-GCM.
3. Add SQLAlchemy `TypeDecorator` (`EncryptedString`) that transparently encrypts on write and decrypts on read.
4. Apply `EncryptedString` to the targeted columns in `models.py`.
5. Write and run the one-time data migration.
6. Add a `is_sensitive` boolean flag to `asset_type_fields` — when `True`, that field's values in `asset_field_values` are stored encrypted.
7. Update the `serializers.py` to never expose raw ciphertext if decryption fails (return `"[encrypted]"` as a fallback).

#### Out of scope for this plan
- Hardware Security Modules (HSMs) — considered for a future enterprise tier.
- End-to-end encryption of API responses.
- Per-user encryption keys (all records share one application key for now).

---

### 8.2 Authentication & Password Security (implemented)

| Control | Implementation |
|---------|---------------|
| Password hashing | bcrypt (cost factor 12) via passlib |
| Session tokens | JWT (HS256, 8-hour expiry) |
| Forgot password — OTP | 6-digit secret, 60-second TTL, single-use, logged to server console |
| Forgot password — Admin | Super Admin sets new password; request visible only to Super Admins |
| Enumeration protection | Forgot-password endpoints always return HTTP 200 regardless of account existence |
| Role enforcement | Backend checks on every protected endpoint; IT Admin cannot escalate to Super Admin |
- QR code per asset
