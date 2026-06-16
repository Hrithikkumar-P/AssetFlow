# Functional Specification
## IT Asset Management System (AssetFlow) — v2.0
**Updated:** June 2026

---

## 1. Purpose

AssetFlow lets an IT team define their own asset categories with custom fields, register and
assign assets, track purchase pricing and repair costs (multi-currency), and review a full
activity history — with an approval workflow for changes made by IT Admins.

---

## 2. Roles

| Role | What they can do |
|------|------------------|
| **Super Admin** | Everything. Create/edit asset types & fields **instantly**. Review the Approvals queue. Manage **all** users, including other Super Admins. |
| **IT Admin** | Manage assets, pricing, repairs, employees. Add and manage **IT Admin** user accounts only. Creating/editing asset types & fields creates a **request that needs Super Admin approval**. |

Both roles can add users; **IT Admins cannot create, edit, or delete Super Admin accounts**,
nor assign the Super Admin role.

---

## 3. Modules

### 3.1 Dashboard
KPI cards (total assets, assigned, available, in-repair, asset types, open repairs, employees,
retired), total purchase value and repair spend **per currency**, an *Assets by Type* bar chart,
and a *Recent Activity* feed.

### 3.2 Asset Types
- Create a type: **name, icon, description**, and a list of **custom fields**.
- Field = **label + data type + required? + (dropdown options)**.
- Data types: **Text, Number, Date, Yes/No, Dropdown**.
- Manage a type: add fields, toggle field **visibility** (hidden, never deleted).
- New fields can be added to any type at any time; existing assets show "—" until filled.
- IT Admin actions are queued for approval; Super Admin actions are immediate.
- A **Users & Assets** tab lists every asset of this type **grouped by owner**
  (e.g. *Laptops → each user with their laptops*), plus an *Unassigned* group.

### 3.3 Assets
- Register an asset under a type → the form renders that type's **visible fields dynamically**.
- Core fields: **Asset ID (`AST-XXXXX`, auto)**, **Description (owner & product)**,
  Type, Status, Location, Assigned To, Notes.
- Statuses: Available · Assigned · In Repair · Retired · Lost/Stolen.
- **View** opens a modal with three tabs:
  - **Details** — all core and custom field values.
  - **Pricing** — add or edit the purchase price record for this asset.
  - **History** — per-asset activity timeline.
- **Edit** logs each changed field individually (old → new). Assigning sets owner + date.

### 3.4 Pricing
- One **purchase price** record per asset, accessed from the **Pricing tab** in the asset's detail view.
- Fields: amount + **currency** (INR/USD/EUR/GBP/AED), vendor, invoice number,
  purchase date, warranty start/end, notes.
- **Purchase cost only** — post-purchase spend lives in Repairs.
- The Dashboard displays a purchase-value summary per currency.

### 3.5 Repairs
- Log a repair: asset, **owner (auto-filled from the asset)**, issue, vendor,
  **cost + currency** (or *Under warranty* → no cost), reported/sent/returned dates.
- **Turnaround days** computed from Sent → Returned.
- Opening a repair sets the asset to **In Repair**; **Completed/Cancelled** returns it to service.
- Statuses: Open · In Progress · Completed · Cancelled.

### 3.6 Employees
CRUD for people who own assets: name, email, department, designation, work location, status.
Auto ID `EMP-NNN`. Deleting an employee unassigns (does not delete) their assets.
**View** opens the list of **all assets that employee currently holds** (the inverse of the
Asset Type → Users & Assets view).

### 3.7 Users
Manage **application login accounts** (distinct from Employees). Fields: full name, **username**
(unique, optional — used for login), email, password, role (Super Admin / IT Admin), active status.
- Login accepts **email or username** interchangeably.
- **Super Admin** sees all users and can create/edit/delete any, reset passwords, and toggle active.
- **IT Admin** can create and manage **IT Admin** accounts only; Super Admin rows are read-only to them.
- Guards: you cannot change your own role, deactivate yourself, delete yourself, or delete the
  last Super Admin. User actions are recorded in History.

### 3.7a Forgot Password
Users who cannot log in have two recovery paths, both accessible from the login screen:

| Path | How it works |
|------|--------------|
| **Get OTP** | Enter email or username → a 6-digit OTP is written to the **server logs** → enter OTP + new password within **60 seconds**. OTP is single-use and invalidated on use or expiry. |
| **Ask Admin** | Enter email or username → a pending reset request appears in the Super Admin's **Users** page → Super Admin sets a new password and the user can sign in. |

Both flows never reveal whether an account exists (always return HTTP 200).

### 3.8 History
Global, searchable activity log of every action — with actor, timestamp, and field-level
before/after values. Includes asset, pricing, repair, asset-type, and **user** events.

### 3.9 Approvals (Super Admin)
Lists pending **asset-type** and **field** requests from IT Admins. Approve → activate;
Reject → discard. The sidebar shows a live pending count.

---

## 4. Business Rules

1. **Fields are never deleted** — only hidden; their stored values are always retained.
2. **Asset IDs** are system-generated `AST-XXXXX` (5 alphanumerics, unique).
3. **One price per asset**; repairs are unlimited per asset.
4. **Multi-currency** values are stored and displayed as entered; no conversion.
5. **Repairs are the only place for post-purchase spend** (parts, labour, service).
6. **IT Admin type/field changes require Super Admin approval** before they take effect.
7. **Required fields** are enforced in the asset form by the field's `required` flag.

---

## 5. Out of Scope (this version)

Software licenses, subscriptions, purchase orders, warranty-claim tickets, asset disposal
records, file/invoice uploads, and reporting exports. (The v1 procurement/license tables were
removed in v2; these can be reintroduced as future modules.)
