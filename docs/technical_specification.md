# Technical Specification
## IT Asset Management System (AssetFlow) — v2.0
**Updated:** June 2026

---

## 1. Architecture

```
React (Vite, Tailwind)  ──/api──▶  FastAPI (SQLAlchemy)  ──▶  PostgreSQL 15
      :5173 dev / :3000 nginx           :8000                  :5432 (schema asset_mgr)
```

- **Frontend** — React 18 + React Router 6, Tailwind CSS (orange/white/black glassmorphism),
  Axios. Dev server proxies `/api` → `:8000`; production build served by nginx which proxies
  `/api/` → backend.
- **Backend** — FastAPI, SQLAlchemy 2.x ORM, Pydantic v2 schemas, JWT auth (python-jose +
  passlib/bcrypt). All tables live in the `asset_mgr` schema; `search_path` is set per connection.
- **Database** — PostgreSQL 15. Schema applied manually from `docs/database_schema.sql`
  (no auto-create / no auto-seed in app code).

---

## 2. Core Design — Dynamic Asset Types (EAV)

Asset shape is **not** fixed in code. It is data-driven:

| Layer | Table | Role |
|-------|-------|------|
| Template | `asset_types` | A category (Laptop, Mouse…) |
| Template fields | `asset_type_fields` | The custom fields for that type |
| Instance | `assets` | An actual item (`AST-XXXXX`) |
| Instance values | `asset_field_values` | One row per (asset, field) — the value |

All values are stored as `TEXT` and cast/validated in the app layer by `data_type`
(`text | number | date | boolean | dropdown`). Dropdown option lists are stored as a JSON
string in `asset_type_fields.dropdown_options`.

---

## 3. Data Model (schema `asset_mgr`)

| Table | Key columns |
|-------|-------------|
| `users` | id, email (uniq), **username** (uniq, nullable), full_name, hashed_password, role (`super_admin`/`it_admin`), is_active |
| `password_reset_otps` | id, user_id→, otp (6-digit), expires_at (+60 s), used |
| `password_reset_requests` | id, user_id→, status (`pending`/`approved`/`rejected`/`cancelled`), requested_at, resolved_by, resolved_at |
| `employees` | id, employee_id (`EMP-NNN`), full_name, email, department, designation, work_location, status |
| `asset_types` | id, name (uniq), description, icon, **status** (`active`/`pending`/`rejected`), is_active, created_by |
| `asset_type_fields` | id, asset_type_id→, field_key, field_label, data_type, dropdown_options (JSON), is_required, display_order, **is_visible**, status |
| `assets` | id, **asset_id** (`AST-XXXXX`, uniq), description, asset_type_id→, status, location, employee_id→, assignment_date, notes, created_by, created_at, updated_at |
| `asset_field_values` | id, asset_id→ (cascade), field_id→, value; **unique(asset_id, field_id)** |
| `asset_history` | id (bigserial), asset_id→ (set null), asset_code, activity_type, performed_by, timestamp, field_changed, old_value, new_value, notes |
| `asset_prices` | id, asset_id→ (cascade), purchase_price, currency, purchase_date, vendor, invoice_number, warranty_start/end, notes, created_by |
| `repairs` | id, repair_id (`RPR-YYYY-NNNN`), asset_id→, asset_owner_id→, issue_description, reported/sent/returned_date, time_taken_days, repair_vendor, repair_cost, repair_currency, under_warranty, status, resolution_notes |

Full DDL: [`database_schema.sql`](database_schema.sql).

### Notable rules
- **Fields are never deleted** — `is_visible=false` hides them from the UI; values are retained.
- **Asset IDs** are random 5-char `AST-XXXXX`, uniqueness-checked on insert.
- **Multi-currency** (`INR/USD/EUR/GBP/AED`) stored per record; no auto-conversion.
- **Approval flow** uses the `status` column on `asset_types` / `asset_type_fields`:
  Super Admin → `active`; IT Admin → `pending` until approved.

---

## 4. API Endpoints

Base path `/api`. All except `/auth/login` require `Authorization: Bearer <jwt>`.

### Auth
| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/login` | → `{ access_token, user }` |
| GET | `/auth/me` | current user |
| POST | `/auth/register` | Super Admin only (legacy; prefer `/users/`) |

### Users (login accounts)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/users/` | list all users |
| POST | `/users/` | create; Super Admin **or** IT Admin. IT Admin **cannot** assign `super_admin`. |
| PUT | `/users/{id}` | update name/username/role/active/password |
| DELETE | `/users/{id}` | delete; blocks self, last super_admin, IT Admin → super_admin |
| GET | `/users/password-reset-requests` | pending reset requests (Super Admin only) |
| POST | `/users/password-reset-requests/{id}/approve` | set new password + mark approved (Super Admin only) |
| POST | `/users/password-reset-requests/{id}/reject` | mark rejected (Super Admin only) |

### Auth — Forgot Password
| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/login` | accepts email **or** username in the `email` field |
| POST | `/auth/request-otp` | generate 6-digit OTP logged to server console; valid 60 s |
| POST | `/auth/reset-password-otp` | verify OTP + set new password |
| POST | `/auth/forgot-password-admin` | create a pending admin-approval reset request |

### Asset Types
| Method | Path | Notes |
|--------|------|-------|
| GET | `/asset-types/?only_active=` | list (only_active for the asset form) |
| GET | `/asset-types/{id}` | one type + its fields |
| POST | `/asset-types/` | create (+ initial fields); IT Admin ⇒ pending |
| PUT | `/asset-types/{id}` | update name/description/icon/is_active |
| POST | `/asset-types/{id}/fields` | add a field |
| PUT | `/asset-types/fields/{field_id}` | edit a field |
| PATCH | `/asset-types/fields/{field_id}/visibility` | toggle hide/show |

### Assets
| Method | Path | Notes |
|--------|------|-------|
| GET | `/assets/?status=&asset_type_id=&employee_id=&search=` | list (filterable by owner / type) |
| POST | `/assets/` | create with `field_values:[{field_id,value}]` |
| GET | `/assets/{id}` | detail incl. fields (with values) |
| GET | `/assets/{id}/history` | per-asset history |
| PUT | `/assets/{id}` | update core + field values (diffs logged) |
| DELETE | `/assets/{id}` | delete |

### Repairs · History · Approvals · Dashboard
| Method | Path |
|--------|------|
| GET/POST | `/prices/` · GET `/prices/summary` · PUT/DELETE `/prices/{id}` *(used by the Pricing tab inside the asset detail view)* |
| GET/POST | `/repairs/?status=&search=` · PUT/DELETE `/repairs/{id}` |
| GET | `/history/?activity_type=&search=` |
| GET | `/approvals/pending` · POST `/approvals/{types\|fields}/{id}/{approve\|reject}` (Super Admin) |
| GET | `/dashboard/stats` · `/dashboard/recent-activity` |

---

## 5. Activity Logging

`app/activity.py:log_activity(...)` writes an `asset_history` row inside the caller's
transaction. Logged events include: Asset Created/Modified/Assigned/Returned/Deleted,
Price Added/Updated, Repair Added/Updated, Asset Type Created/Requested/Approved/Rejected,
Field Added/Hidden/Shown/Approved. On asset update, each changed core field and each changed
dynamic value is logged individually with `old_value → new_value`.

---

## 6. Backend Layout

```
backend/app/
├── main.py          # FastAPI app + router registration
├── database.py      # engine, SessionLocal, search_path=asset_mgr
├── models.py        # SQLAlchemy ORM models
├── schemas.py       # Pydantic request models
├── serializers.py   # ORM → dict for dynamic response shapes
├── activity.py      # history logging helper
├── utils.py         # slugify, AST code gen, JSON option (de)serialize
├── auth.py          # JWT + password hashing
├── deps.py          # get_db, get_current_user, require_super_admin
└── routers/         # auth, users, asset_types, assets, employees, prices, repairs, history, approvals, dashboard
```

## 7. Frontend Layout

```
frontend/src/
├── api/axios.js            # baseURL /api, Bearer interceptor, 401 → /login
├── context/AuthContext.jsx # user/token in localStorage
├── components/
│   ├── Layout.jsx          # dark-glass sidebar, nav, pending-approvals badge
│   ├── PrivateRoute.jsx
│   └── ui.jsx              # Modal, ConfirmDialog, Badge, Field, Spinner, EmptyState, formatMoney
└── pages/                  # Login, Dashboard, Assets, AssetTypes, Repairs, Employees, Users, History, Approvals
```

### Theme
- `tailwind.config.js` — `brand` (orange) + `ink` (near-black) palettes, glass/glow shadows,
  `fade-in` / `slide-up` / `scale-in` / `float` keyframes.
- `index.css` — `@layer components` utilities: `.glass`, `.glass-dark`, `.btn-primary`,
  `.input`, `.nav-link`, etc.; warm radial-gradient page background.
