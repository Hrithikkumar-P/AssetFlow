# AssetFlow — IT Asset Management System (v2)

A full-stack web app for IT teams to manage hardware assets with **fully dynamic, per-type custom fields**. Define your own asset types (Laptop, Mouse, Chair…), give each its own field set, then track ownership, pricing, repairs, and a complete activity history.

**Stack:** React + Vite + Tailwind (orange / glassmorphism UI) · FastAPI + SQLAlchemy · PostgreSQL · Docker

---

## What's in v2

| Module | Description |
|--------|-------------|
| **Asset Types** | Create categories and define their custom fields (text, number, date, yes/no, dropdown). Fields are hidden, never deleted. |
| **Assets** | Register items under a type with `AST-XXXXX` IDs; the form renders that type's fields dynamically. |
| **Pricing** | Purchase cost per asset, multi-currency (INR/USD/EUR/GBP/AED). Accessed from the **Pricing** tab inside each asset's detail view. |
| **Repairs** | Post-purchase expenditure — issue, vendor, cost, owner, turnaround days. Auto-moves the asset to *In Repair*. |
| **History** | Every create/modify/assign/price/repair action, timestamped and attributed. |
| **Users** | Manage login accounts & roles. Both admins can add users; IT Admins can't create or touch Super Admins. |
| **Approvals** | IT Admin type/field requests require Super Admin approval; Super Admin changes apply instantly. |

See [docs/new_plan.md](docs/new_plan.md) for the full v2 design.

---

## Quick Start (Docker)

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| App (Frontend) | http://localhost:3000 |
| API (Backend) | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

**Default login:** `admin@itams.com` / `Admin@123`

> The app does **not** auto-create tables. Run [docs/database_schema.sql](docs/database_schema.sql) once
> against the `assetmanager` database **as a superuser** first — see [docs/workflow.md](docs/workflow.md).

---

## Project Structure

```
Asset_Manager/
├── docs/                  # Design, schema & workflow docs
├── backend/               # FastAPI + SQLAlchemy
│   └── app/
│       ├── models.py      # asset_types, asset_type_fields, assets,
│       │                  # asset_field_values, asset_history, asset_prices, repairs
│       ├── routers/       # auth, users, asset_types, assets, prices, repairs, history, approvals…
│       ├── serializers.py # ORM → JSON for dynamic shapes
│       └── activity.py    # history logging helper
├── frontend/              # React + Vite + Tailwind
│   └── src/
│       ├── components/ui.jsx   # shared glass UI kit
│       └── pages/         # Dashboard, AssetTypes, Assets, Pricing, Repairs, Employees, Users, History, Approvals…
└── docker-compose.yml
```

## Docs

- [v2 Design Plan](docs/new_plan.md)
- [Functional Specification](docs/functional_specification.md)
- [Technical Specification](docs/technical_specification.md)
- [Workflow & Operations Guide](docs/workflow.md)
- [Database Schema (SQL)](docs/database_schema.sql)

---

## Development (Local)

```bash
# 1. Database (Docker) — or use your local Postgres on :5432
docker compose up db -d

# 2. Apply the schema once (as a superuser, see workflow.md)
psql -U postgres -d assetmanager -f docs/database_schema.sql

# 3. Backend
cd backend
python -m venv venv && venv\Scripts\activate     # Windows
pip install -r requirements.txt
$env:DATABASE_URL = "postgresql://itams:itams123@localhost:5432/assetmanager"
uvicorn app.main:app --reload --port 8000

# 4. Frontend (new terminal)
cd frontend
npm install
npm run dev   # http://localhost:5173  (proxies /api → :8000)
```

---

## Common Commands

```bash
docker compose up --build        # Start everything (rebuild images)
docker compose down              # Stop all containers
docker compose down -v           # Stop + delete database volume
docker compose logs -f backend   # Watch backend logs
docker exec -it itams_db psql -U itams -d assetmanager   # Enter database
```
