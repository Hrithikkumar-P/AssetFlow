# Workflow & Operations Guide
## IT Asset Management System (AssetFlow)
**Version:** 2.0 | **Updated:** June 2026

---

## 1. Prerequisites

| Tool | Purpose |
|------|---------|
| Docker Desktop | Run all services |
| Node.js 20+ | Local frontend dev |
| Python 3.11+ | Local backend dev |
| PostgreSQL 15 (or Docker) | Database on `localhost:5432` |

---

## 2. Database Setup (Run Once)

The application **does not auto-create tables**. You apply the schema yourself before
starting the backend.

### Step 1 — Create the database and the app user

Connect as the PostgreSQL **superuser** (`postgres`) and run:

```sql
-- CREATE DATABASE assetmanager;            -- skip if it already exists
CREATE USER itams WITH PASSWORD 'itams123';
GRANT ALL PRIVILEGES ON DATABASE assetmanager TO itams;

\c assetmanager
CREATE SCHEMA IF NOT EXISTS asset_mgr AUTHORIZATION itams;
GRANT ALL ON SCHEMA asset_mgr TO itams;
```

### Step 2 — Apply the v2 schema

```bash
psql -U postgres -d assetmanager -f docs/database_schema.sql
```

> **Run as a superuser (`postgres`).** The script **drops the old v1 tables** (which may be
> owned by `postgres`), creates the v2 tables, **grants** them to `itams`, and seeds the first
> Super Admin. Running it as `itams` will fail if the old tables are owned by `postgres`.
> If you are starting from a brand-new schema that `itams` owns, you can run it as `itams` instead.

The script creates these tables under `asset_mgr`:
`users`, `employees`, `asset_types`, `asset_type_fields`, `assets`,
`asset_field_values`, `asset_history`, `asset_prices`, `repairs`.

### Step 3 — First login

The schema seeds a Super Admin automatically:

- **Email:** `admin@itams.com`
- **Password:** `Admin@123`

(Re-running the script keeps the existing user — the insert is `ON CONFLICT DO NOTHING`.)

---

## 3. Running Locally (Hot Reload)

### Backend
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
$env:DATABASE_URL = "postgresql://itams:itams123@localhost:5432/assetmanager"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Backend: http://localhost:8000  ·  Swagger: http://localhost:8000/docs

### Frontend
```powershell
cd frontend
npm install
npm run dev
```
Frontend: http://localhost:5173 (Vite proxies `/api` → `http://localhost:8000`).

---

## 4. Running with Docker

```bash
docker compose up --build      # db + backend + frontend
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8000 |
| Swagger | http://localhost:8000/docs |

> Apply `docs/database_schema.sql` to the `db` container's database once before logging in
> (the backend does not create tables). Example:
> `docker exec -i itams_db psql -U postgres -d assetmanager < docs/database_schema.sql`

Stop: `docker compose down` · Reset DB volume: `docker compose down -v`

---

## 5. Application Workflows

### 5.1 Create an Asset Type
1. Sidebar → **Asset Types** → **+ New Asset Type**.
2. Enter a name (e.g. *Laptop*), pick an icon, optional description.
3. Add fields — each has a **name**, a **data type** (Text / Number / Date / Yes-No / Dropdown),
   an optional **required** flag, and (for dropdowns) a comma-separated option list.
4. **Super Admin** → the type is active immediately.
   **IT Admin** → the type is submitted for approval (see 5.6).

### 5.2 Manage a type — fields & owners
1. **Asset Types** → click a type card. The modal has two tabs:
   - **Fields** — **+ Add a new field**, or toggle a field's **Visible / Hidden** chip.
     Fields are never deleted — hiding only removes them from the UI; stored values are kept.
   - **Users & Assets** — every asset of this type, **grouped by owner**
     (e.g. *Laptops → each user with their laptops*), plus an *Unassigned* group.

> The inverse view lives on **Employees → View**, which lists all assets a given employee holds.

### 5.3 Register an Asset
1. **Assets** → **+ New Asset**.
2. Choose the **Asset Type** — the form renders that type's fields dynamically.
3. Fill the **description** (owner & product, e.g. *"Ravi Kumar — Dell XPS 15"*), status,
   location, owner, and the custom fields.
4. Save → the asset gets an `AST-XXXXX` ID and an *Asset Created* history entry.

### 5.4 Record a Price
**Assets** → **View** on any asset → **Pricing tab** → fill in purchase price + currency,
vendor, invoice, warranty dates, then save. One price record per asset (purchase cost only).

### 5.5 Log a Repair
**Repairs** → **+ New Repair** → pick an asset (owner auto-fills), describe the issue, set
vendor, cost + currency (or tick *Under warranty*), and dates. Turnaround days are computed
from Sent → Returned. Opening a repair sets the asset to **In Repair**; marking it
**Completed** returns it to service.

### 5.6 Approvals (Super Admin)
**Approvals** lists pending asset-type and field requests from IT Admins.
Approve to activate, or reject to discard. The sidebar shows a live pending count.

### 5.7 Manage Users (login accounts)
**Users** → **+ Add User**: full name, username (optional), email, password, role. These are
the accounts that log into the manager (separate from Employees).
- Login accepts **email or username** — either can be used on the sign-in screen.
- **Super Admin** manages everyone (any role, reset passwords, activate/deactivate, delete).
- **IT Admin** can add/manage **IT Admin** accounts only — the role dropdown hides Super Admin,
  and Super Admin rows show no actions.
- You can't change your own role, deactivate/delete yourself, or delete the last Super Admin.

### 5.8a Forgot Password — OTP path
1. Click **Forgot password?** on the login screen.
2. Select the **Get OTP** tab, enter your email or username, and click **Generate OTP**.
3. Check the backend server console — the 6-digit OTP appears in a labelled block.
4. Enter the OTP and your new password within **60 seconds**.
5. Sign in with the new password.

> The OTP is single-use. A new request immediately invalidates any pending OTP for that account.

### 5.8b Forgot Password — Admin Approval path
1. Click **Forgot password?** on the login screen.
2. Select the **Ask Admin** tab, enter your email or username, and click **Request Reset**.
3. A Super Admin sees the pending request in **Users → Password Reset Requests**.
4. Super Admin clicks **Approve**, enters a new password, and saves.
5. User signs in with the new password (or Super Admin communicates it out-of-band).

Super Admin can also **Reject** a request if it is invalid.

### 5.8 History
**History** is the global activity log (search by asset, user, or activity).
Each asset also has its own **History** tab in its detail view.

---

## 6. Roles

| Role | Capabilities |
|------|--------------|
| `super_admin` | Everything: instant type/field changes, the Approvals queue, and managing **all** users. |
| `it_admin` | Full asset/price/repair management; can add/manage **IT Admin** users; type & field changes need Super Admin approval. |

Manage users from the **Users** menu (both roles), or the API `POST /api/users/`.
IT Admins cannot create or manage Super Admins.

---

## 7. Troubleshooting

**Login fails / 500 on login** — Ensure the schema was applied and `itams` has table grants.
Re-running `docs/database_schema.sql` as `postgres` re-grants everything.

**`permission denied for table …`** — Tables are owned by `postgres` but `itams` lacks grants.
Run, as `postgres`:
```sql
GRANT ALL ON ALL TABLES IN SCHEMA asset_mgr TO itams;
GRANT ALL ON ALL SEQUENCES IN SCHEMA asset_mgr TO itams;
```

**"Network Error" in the UI** — Backend not running on :8000, or the schema wasn't applied.
Check `uvicorn` output / `docker compose logs backend`.

**Port 8000 already in use (Windows)**
```powershell
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

**Can't create an asset** — Create (and, for IT Admins, get approval for) an Asset Type first;
the asset form needs at least one active type.

---

## 8. Where to make changes

| Change | File(s) |
|--------|---------|
| New API endpoint | `backend/app/routers/<module>.py` (+ register in `main.py`) |
| New table / column | `backend/app/models.py` + `docs/database_schema.sql` |
| Request/response shape | `backend/app/schemas.py` / `backend/app/serializers.py` |
| New page | `frontend/src/pages/*.jsx` + route in `App.jsx` + nav in `components/Layout.jsx` |
| Shared UI (modal, badge, button) | `frontend/src/components/ui.jsx` |
| Theme (colors, glass, animation) | `frontend/tailwind.config.js` + `frontend/src/index.css` |

> When behavior or schema changes, also update `docs/functional_specification.md`,
> `docs/technical_specification.md`, and `docs/database_schema.sql`.
