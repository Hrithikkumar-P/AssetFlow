-- ============================================================
-- IT Asset Management System — Database Schema (v2.1)
-- Schema: asset_mgr   |   PostgreSQL 15+
-- ============================================================
-- Dynamic asset types + custom fields, activity history,
-- pricing, repairs, and password-reset flows.
--
-- Run against your 'assetmanager' database:
--   psql -U postgres -d assetmanager -f docs/database_schema.sql
--
-- NOTE: The `users` table is preserved across re-runs so
-- existing logins are kept. New columns are added with
-- ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS asset_mgr;
SET search_path TO asset_mgr;


-- ── Drop old v1 tables (procurement / licenses / v1 assets) ──
DROP TABLE IF EXISTS asset_mgr.po_line_items        CASCADE;
DROP TABLE IF EXISTS asset_mgr.purchase_orders      CASCADE;
DROP TABLE IF EXISTS asset_mgr.maintenance_tickets  CASCADE;
DROP TABLE IF EXISTS asset_mgr.warranty_claims      CASCADE;
DROP TABLE IF EXISTS asset_mgr.warranties           CASCADE;
DROP TABLE IF EXISTS asset_mgr.subscriptions        CASCADE;
DROP TABLE IF EXISTS asset_mgr.license_assignments  CASCADE;
DROP TABLE IF EXISTS asset_mgr.software_licenses    CASCADE;
DROP TABLE IF EXISTS asset_mgr.asset_disposals      CASCADE;
DROP TABLE IF EXISTS asset_mgr.audit_log            CASCADE;

-- ── Drop v2 tables so this script is re-runnable ──
DROP TABLE IF EXISTS asset_mgr.password_reset_requests CASCADE;
DROP TABLE IF EXISTS asset_mgr.password_reset_otps     CASCADE;
DROP TABLE IF EXISTS asset_mgr.repairs              CASCADE;
DROP TABLE IF EXISTS asset_mgr.asset_prices         CASCADE;
DROP TABLE IF EXISTS asset_mgr.asset_history        CASCADE;
DROP TABLE IF EXISTS asset_mgr.asset_field_values   CASCADE;
DROP TABLE IF EXISTS asset_mgr.assets               CASCADE;
DROP TABLE IF EXISTS asset_mgr.asset_type_fields    CASCADE;
DROP TABLE IF EXISTS asset_mgr.asset_types          CASCADE;


-- ── 1. USERS (login accounts) ────────────────────────────────
-- Roles: super_admin | it_admin
-- Users table is preserved (CREATE IF NOT EXISTS); new columns
-- are applied below with ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
CREATE TABLE IF NOT EXISTS asset_mgr.users (
    id               SERIAL          PRIMARY KEY,
    email            VARCHAR(255)    NOT NULL UNIQUE,
    username         VARCHAR(100)    UNIQUE,
    full_name        VARCHAR(255)    NOT NULL,
    hashed_password  VARCHAR(255)    NOT NULL,
    role             VARCHAR(50)     NOT NULL DEFAULT 'it_admin',
    is_active        BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Migration: add username to existing installations
ALTER TABLE asset_mgr.users ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE;

CREATE INDEX IF NOT EXISTS ix_users_email    ON asset_mgr.users (email);
CREATE INDEX IF NOT EXISTS ix_users_username ON asset_mgr.users (username);


-- ── 2. EMPLOYEES (asset owners) ──────────────────────────────
CREATE TABLE IF NOT EXISTS asset_mgr.employees (
    id               SERIAL          PRIMARY KEY,
    employee_id      VARCHAR(20)     NOT NULL UNIQUE,
    full_name        VARCHAR(255)    NOT NULL,
    email            VARCHAR(255)    UNIQUE,
    department       VARCHAR(100),
    designation      VARCHAR(100),
    work_location    VARCHAR(50)     NOT NULL DEFAULT 'Office',
    phone            VARCHAR(30),
    status           VARCHAR(30)     NOT NULL DEFAULT 'Active',
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_employees_employee_id ON asset_mgr.employees (employee_id);


-- ── 3. ASSET TYPES (dynamic templates) ───────────────────────
-- status: active | pending | rejected
--   Super Admin create  -> active
--   IT Admin create     -> pending (needs approval)
CREATE TABLE asset_mgr.asset_types (
    id               SERIAL          PRIMARY KEY,
    name             VARCHAR(100)    NOT NULL UNIQUE,
    description      TEXT,
    icon             VARCHAR(20),
    status           VARCHAR(20)     NOT NULL DEFAULT 'active',
    is_active        BOOLEAN         NOT NULL DEFAULT TRUE,
    created_by       VARCHAR(255),
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);


-- ── 4. ASSET TYPE FIELDS (dynamic field definitions) ─────────
-- data_type : text | number | date | boolean | dropdown
-- is_visible: FALSE hides the field from the UI but keeps data
-- Fields are NEVER deleted.
CREATE TABLE asset_mgr.asset_type_fields (
    id               SERIAL          PRIMARY KEY,
    asset_type_id    INTEGER         NOT NULL REFERENCES asset_mgr.asset_types (id) ON DELETE CASCADE,
    field_key        VARCHAR(100)    NOT NULL,
    field_label      VARCHAR(150)    NOT NULL,
    data_type        VARCHAR(30)     NOT NULL DEFAULT 'text',
    dropdown_options TEXT,           -- JSON array string e.g. ["SSD","HDD"]
    is_required      BOOLEAN         NOT NULL DEFAULT FALSE,
    display_order    INTEGER         NOT NULL DEFAULT 0,
    is_visible       BOOLEAN         NOT NULL DEFAULT TRUE,
    status           VARCHAR(20)     NOT NULL DEFAULT 'active',
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_fields_type ON asset_mgr.asset_type_fields (asset_type_id);


-- ── 5. ASSETS (actual items) ─────────────────────────────────
-- asset_id format: AST-XXXXX (5 alphanumeric chars)
CREATE TABLE asset_mgr.assets (
    id               SERIAL          PRIMARY KEY,
    asset_id         VARCHAR(10)     NOT NULL UNIQUE,
    description      TEXT,
    asset_type_id    INTEGER         NOT NULL REFERENCES asset_mgr.asset_types (id),
    status           VARCHAR(30)     NOT NULL DEFAULT 'Available',
    location         VARCHAR(50)     NOT NULL DEFAULT 'Office',
    employee_id      INTEGER         REFERENCES asset_mgr.employees (id) ON DELETE SET NULL,
    assignment_date  TIMESTAMP,
    notes            TEXT,
    created_by       VARCHAR(255),
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ
);
CREATE INDEX ix_assets_asset_id ON asset_mgr.assets (asset_id);
CREATE INDEX ix_assets_type     ON asset_mgr.assets (asset_type_id);
CREATE INDEX ix_assets_status   ON asset_mgr.assets (status);


-- ── 6. ASSET FIELD VALUES (per-asset dynamic values) ─────────
CREATE TABLE asset_mgr.asset_field_values (
    id               SERIAL          PRIMARY KEY,
    asset_id         INTEGER         NOT NULL REFERENCES asset_mgr.assets (id) ON DELETE CASCADE,
    field_id         INTEGER         NOT NULL REFERENCES asset_mgr.asset_type_fields (id),
    value            TEXT,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ,
    CONSTRAINT uq_asset_field UNIQUE (asset_id, field_id)
);
CREATE INDEX ix_field_values_asset ON asset_mgr.asset_field_values (asset_id);


-- ── 7. ASSET HISTORY (activity log) ──────────────────────────
CREATE TABLE asset_mgr.asset_history (
    id               BIGSERIAL       PRIMARY KEY,
    asset_id         INTEGER         REFERENCES asset_mgr.assets (id) ON DELETE SET NULL,
    asset_code       VARCHAR(10),
    activity_type    VARCHAR(50)     NOT NULL,
    performed_by     VARCHAR(255),
    timestamp        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    field_changed    VARCHAR(150),
    old_value        TEXT,
    new_value        TEXT,
    notes            TEXT
);
CREATE INDEX ix_history_timestamp ON asset_mgr.asset_history (timestamp DESC);
CREATE INDEX ix_history_asset     ON asset_mgr.asset_history (asset_id);


-- ── 8. ASSET PRICES (purchase cost only) ─────────────────────
-- currency: INR | USD | EUR | GBP | AED
CREATE TABLE asset_mgr.asset_prices (
    id               SERIAL          PRIMARY KEY,
    asset_id         INTEGER         NOT NULL REFERENCES asset_mgr.assets (id) ON DELETE CASCADE,
    purchase_price   NUMERIC(12, 2),
    currency         VARCHAR(10)     NOT NULL DEFAULT 'INR',
    purchase_date    DATE,
    vendor           VARCHAR(150),
    invoice_number   VARCHAR(100),
    warranty_start   DATE,
    warranty_end     DATE,
    notes            TEXT,
    created_by       VARCHAR(255),
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_prices_asset ON asset_mgr.asset_prices (asset_id);


-- ── 9. REPAIRS (post-purchase expenditure) ───────────────────
-- repair_id format: RPR-2026-0001
CREATE TABLE asset_mgr.repairs (
    id               SERIAL          PRIMARY KEY,
    repair_id        VARCHAR(30)     NOT NULL UNIQUE,
    asset_id         INTEGER         NOT NULL REFERENCES asset_mgr.assets (id) ON DELETE CASCADE,
    asset_owner_id   INTEGER         REFERENCES asset_mgr.employees (id) ON DELETE SET NULL,
    issue_description TEXT,
    reported_date    DATE,
    sent_date        DATE,
    returned_date    DATE,
    time_taken_days  INTEGER,
    repair_vendor    VARCHAR(150),
    repair_cost      NUMERIC(12, 2),
    repair_currency  VARCHAR(10)     NOT NULL DEFAULT 'INR',
    under_warranty   BOOLEAN         NOT NULL DEFAULT FALSE,
    status           VARCHAR(30)     NOT NULL DEFAULT 'Open',
    resolution_notes TEXT,
    created_by       VARCHAR(255),
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ
);
CREATE INDEX ix_repairs_repair_id ON asset_mgr.repairs (repair_id);
CREATE INDEX ix_repairs_asset     ON asset_mgr.repairs (asset_id);
CREATE INDEX ix_repairs_status    ON asset_mgr.repairs (status);


-- ── 10. PASSWORD RESET — OTP (60-second window) ──────────────
-- Generated OTP is written to server logs; user must submit
-- within 60 seconds to reset their password.
CREATE TABLE asset_mgr.password_reset_otps (
    id               SERIAL          PRIMARY KEY,
    user_id          INTEGER         NOT NULL REFERENCES asset_mgr.users (id) ON DELETE CASCADE,
    otp              VARCHAR(6)      NOT NULL,
    expires_at       TIMESTAMPTZ     NOT NULL,
    used             BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_otp_user ON asset_mgr.password_reset_otps (user_id);


-- ── 11. PASSWORD RESET — ADMIN APPROVAL ──────────────────────
-- User submits a request; Super Admin approves (sets new
-- password) or rejects from the Users page.
-- status: pending | approved | rejected | cancelled
CREATE TABLE asset_mgr.password_reset_requests (
    id               SERIAL          PRIMARY KEY,
    user_id          INTEGER         NOT NULL REFERENCES asset_mgr.users (id) ON DELETE CASCADE,
    status           VARCHAR(20)     NOT NULL DEFAULT 'pending',
    requested_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    resolved_by      VARCHAR(255),   -- email of Super Admin who acted
    resolved_at      TIMESTAMPTZ
);
CREATE INDEX ix_reset_req_user   ON asset_mgr.password_reset_requests (user_id);
CREATE INDEX ix_reset_req_status ON asset_mgr.password_reset_requests (status);


-- ── Grants (PostgreSQL 15: superuser-created objects need grants) ──
GRANT ALL ON ALL TABLES    IN SCHEMA asset_mgr TO itams;
GRANT ALL ON ALL SEQUENCES IN SCHEMA asset_mgr TO itams;
ALTER DEFAULT PRIVILEGES IN SCHEMA asset_mgr GRANT ALL ON TABLES    TO itams;
ALTER DEFAULT PRIVILEGES IN SCHEMA asset_mgr GRANT ALL ON SEQUENCES TO itams;


-- ── Seed the first Super Admin (password: Admin@123) ─────────
INSERT INTO asset_mgr.users (email, username, full_name, hashed_password, role, is_active)
VALUES (
  'admin@itams.com',
  'admin',
  'System Administrator',
  '$2b$12$rJRf/jliiW0BVk4phfUY7.fDrR166QQGe/hw1vd2vlE4aTgIN4cEm',
  'super_admin',
  TRUE
)
ON CONFLICT (email) DO NOTHING;

-- Set username for the seeded admin on existing installations
UPDATE asset_mgr.users
SET username = 'admin'
WHERE email = 'admin@itams.com' AND username IS NULL;
