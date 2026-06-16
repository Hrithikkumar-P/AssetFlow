# IT Asset Management System — Design Document
**Comprehensive Feature Design & Data Architecture**
Version: v1.0 | Date: June 3, 2026 | Prepared for: IT Team

---

> ⚠️ **Superseded by v2.0.** The system was redesigned around **dynamic, per-type custom fields**.
> The v1 modules below (software licenses, subscriptions, procurement, warranty tickets, disposals)
> are **not** part of the current build. For the implemented design see
> [`docs/new_plan.md`](docs/new_plan.md), [`docs/functional_specification.md`](docs/functional_specification.md),
> and [`docs/technical_specification.md`](docs/technical_specification.md).

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Core Modules](#3-core-modules)
   - 3.1 [Asset Registry (Hardware)](#31-asset-registry-hardware)
   - 3.2 [Device Technical Specifications](#32-device-technical-specifications)
   - 3.3 [Warranty Management](#33-warranty-management)
   - 3.4 [Software License Management](#34-software-license-management)
   - 3.5 [Subscription Management](#35-subscription-management)
   - 3.6 [Employee Asset Portal](#36-employee-asset-portal)
   - 3.7 [Procurement & Purchase Orders](#37-procurement--purchase-orders)
   - 3.8 [Maintenance & Repair Tracking](#38-maintenance--repair-tracking)
   - 3.9 [Audit & Compliance](#39-audit--compliance)
   - 3.10 [Reports & Dashboard](#310-reports--dashboard)
4. [Notification & Alert System](#4-notification--alert-system)
5. [Asset Hierarchy (Parent–Child)](#5-asset-hierarchy-parentchild)
6. [Data Entities & Key Fields](#6-data-entities--key-fields)
7. [Access Roles & Permissions](#7-access-roles--permissions)
8. [Future Enhancements (Phase 2)](#8-future-enhancements-phase-2)

---

## 1. Executive Summary

The IT Asset Management System (ITAMS) is a centralized platform built for IT teams to track, manage, and optimize every asset across the organization — from physical hardware (laptops, monitors, keyboards, headphones) to software licenses, SaaS subscriptions, warranties, and vendor contracts.

**The core problem it solves:**
- IT teams today rely on spreadsheets that go out of date, lack alerts, and cannot handle relationships between assets, employees, and licenses.
- Warranties expire silently, licenses are over-purchased or under-utilized, and there is no single source of truth for IT spend.

**What ITAMS delivers:**
- A single registry for all physical and digital assets
- Automated expiry alerts for warranties, licenses, and subscriptions
- Asset lifecycle tracking from purchase to retirement
- Role-based access so each stakeholder sees only what they need
- Dashboards and reports for informed decision-making

---

## 2. System Overview

### 2.1 Purpose & Goals

| Goal | Description |
|------|-------------|
| Eliminate spreadsheets | Replace manual tracking with a structured, searchable database |
| Prevent surprise expirations | Automated alerts for warranties and licenses before they lapse |
| Track IT spend | Know the exact cost of every asset, license, and subscription |
| Manage asset lifecycle | Unassigned → Assigned → In Repair → Retired, with full history |
| Enable compliance | Audit trails, disposal records, and compliance tagging |

### 2.2 Target Users

| User Role | Primary Use |
|-----------|-------------|
| IT Administrator | Day-to-day asset, license, and warranty management |
| IT Manager | Oversight, approvals, and reporting |
| Finance / Procurement | Cost tracking, PO management, subscription billing |
| Employee | View their own assigned assets and licenses (read-only) |

### 2.3 High-Level Module Map

```
ITAMS
├── Asset Registry (Hardware)
│   └── Device Technical Specifications
├── Warranty Management
├── Software License Management
├── Subscription Management
├── Employee Asset Portal
├── Procurement & Purchase Orders
├── Maintenance & Repair Tracking
├── Audit & Compliance
└── Reports & Dashboard
```

---

## 3. Core Modules

---

### 3.1 Asset Registry (Hardware)

The Asset Registry is the foundation of the system. Every physical IT asset — from a laptop to a network cable — is recorded here with a unique identifier and full lifecycle details.

#### Asset Record Fields

| Field | Type | Description |
|-------|------|-------------|
| Asset ID | Auto-generated | Unique ID, e.g., `ASSET-2026-0001` |
| Parent Asset ID | Reference | Links child asset to its parent (see Section 5) |
| Child Asset IDs | Reference list | List of child assets linked to this one |
| Asset Type | Dropdown | Laptop, Desktop, Monitor, Mouse, Keyboard, Headphones, Webcam, Printer, Server, Network Switch, Router, UPS, Docking Station, USB Hub, Laptop Bag, etc. |
| Brand / Manufacturer | Text | e.g., Dell, HP, Apple, Logitech, Sony |
| Model Name | Text | e.g., Dell XPS 15, Apple MacBook Pro 14" |
| Model Number | Text | Official manufacturer model number |
| Serial Number | Text (Unique) | Mandatory; scanned or typed |
| Asset Photo | Image upload | Photo of the physical device |
| Purchase Date | Date | Date of purchase |
| Purchase Price | Currency | Unit cost at time of purchase |
| Vendor / Supplier | Text | Who it was bought from |
| Invoice / PO Number | Reference | Linked to Procurement module |
| Condition | Dropdown | New, Good, Fair, Damaged, Retired |
| Status | Dropdown | Available, Assigned, In Repair, Retired, Lost/Stolen |
| Location | Dropdown | Office, Remote, Warehouse, Sent for Repair |
| Assigned To | Employee reference | Employee Name + Employee ID |
| Assignment Date | Date | When it was assigned to current user |
| Return Date | Date | When it was returned (if applicable) |
| Department | Text | Department currently responsible |
| Notes / Remarks | Long text | Free-form notes |
| Created By | System | User who added the record |
| Last Updated | System | Timestamp + user of last change |

#### Asset Type Categories

| Category | Examples |
|----------|---------|
| Computing | Laptop, Desktop, Workstation, Thin Client, Mini PC |
| Display | Monitor, Projector, Smart TV |
| Peripherals | Mouse, Keyboard, Headphones, Webcam, Microphone, Speakers |
| Connectivity | Router, Network Switch, Ethernet Cable, WiFi Adapter |
| Power | UPS, Power Strip, Adapter/Charger |
| Storage | External HDD, USB Drive, NAS Device |
| Printing | Printer, Scanner, Photocopier |
| Mobile | Mobile Phone, Tablet |
| Accessories | Laptop Bag, Docking Station, USB Hub, Cable |
| Server/Infra | Server, Rack, NAS, Firewall |

---

### 3.2 Device Technical Specifications

For computing assets (Laptops, Desktops, Servers, Workstations), a detailed technical spec sheet is linked to the asset record.

#### Specification Fields

| Specification | Fields |
|---------------|--------|
| **Processor (CPU)** | Brand (Intel/AMD/Apple), Model, No. of Cores, Clock Speed (GHz), Generation |
| **RAM** | Total Size (GB), Type (DDR4/DDR5/LPDDR5), Speed (MHz), No. of Slots, Upgradeable (Yes/No) |
| **Storage** | Type (SSD/HDD/NVMe/eMMC), Capacity (GB/TB), No. of Slots, Upgradeable (Yes/No) |
| **Display** | Screen Size (inches), Resolution (e.g., 1920×1080), Panel Type (IPS/OLED/TN/VA), Refresh Rate (Hz), Touch Screen (Yes/No) |
| **Operating System** | OS Name, Version, Architecture (64-bit), License Type (OEM/Retail/Volume) |
| **Graphics (GPU)** | Integrated/Dedicated, Brand, Model, VRAM (GB) |
| **Connectivity** | WiFi Standard (Wi-Fi 6/6E), Bluetooth Version, Ethernet (Gigabit/2.5G), Ports (USB-A, USB-C, HDMI, Thunderbolt) |
| **Battery** | Capacity (Wh), Battery Health % (updated periodically), Estimated Life (hours) |
| **Network IDs** | WiFi MAC Address, Ethernet MAC Address |
| **System Info** | BIOS Version, Hostname/Computer Name, Domain/Workgroup |
| **Security** | Antivirus Software, Antivirus Status (Active/Inactive), Last Scan Date |
| **Updates** | Last OS Update Date, Windows Update / macOS Update Status |

---

### 3.3 Warranty Management

Every asset with a warranty is tracked here. The system auto-calculates warranty status and sends alerts before expiry.

#### Warranty Record Fields

| Field | Description |
|-------|-------------|
| Warranty ID | Auto-generated, linked to Asset ID |
| Asset ID | Reference to the asset |
| Warranty Provider | Manufacturer (Dell ProSupport, Apple Care) or Third-Party |
| Warranty Type | On-Site, Carry-In, Accidental Damage Protection (ADP), Extended |
| Warranty Start Date | Usually = Purchase Date |
| Warranty Expiry Date | Calculated or entered |
| Warranty Duration | Auto-calculated (Start to Expiry) |
| Warranty Status | Active / Expiring Soon / Expired (auto-updated daily) |
| Warranty Reference # | Serial or case number for the warranty |
| AMC (Annual Maintenance Contract) | Yes / No |
| AMC Vendor | Vendor providing AMC |
| AMC Start / End Date | Contract period |
| AMC Cost (Annual) | Cost for AMC |
| Claim History | List of past claims (Date, Issue, Resolution, Cost) |

#### Warranty Alert Schedule

| Alert | Trigger |
|-------|---------|
| Early Warning | 90 days before expiry |
| Standard Warning | 30 days before expiry |
| Urgent Warning | 7 days before expiry |
| Expiry Notice | On the day of expiry |

---

### 3.4 Software License Management

All software purchased by the organization is tracked here. This module manages how many seats are purchased vs. how many are actually in use, preventing both over-spending and compliance violations.

#### License Record Fields

| Field | Description |
|-------|-------------|
| License ID | Auto-generated, e.g., `LIC-2026-0001` |
| Parent License ID | For enterprise/volume licenses with child allocations |
| Software Name | e.g., Microsoft Office 365, Adobe Creative Cloud, AutoCAD |
| Software Category | Productivity, Design, Security, Development, Communication, Finance |
| Publisher / Vendor | Microsoft, Adobe, Autodesk, JetBrains, etc. |
| License Type | Per User, Per Device, Concurrent, Site License, Open Source, Freeware |
| License Key | Stored encrypted / masked in UI |
| Total Seats Purchased | Number of licenses bought |
| Assigned Seats | Number currently assigned to employees (auto-counted) |
| Available Seats | Total − Assigned (auto-calculated) |
| License Validity Start | Start date of license period |
| License Validity End | Expiry date |
| License Status | Active / Expiring Soon / Expired |
| Purchase Price (per seat) | Cost per individual license |
| Total Purchase Price | Per seat × Total seats |
| Invoice / PO Number | Reference to Procurement |
| Renewal Type | Manual / Auto-Renew |
| Notes | Special terms, restrictions |

#### License Assignment Sub-Table

Each license record has an assignment table showing which employee holds which seat:

| Employee Name | Employee ID | Department | Assigned Date | Device Assigned To |
|---------------|-------------|------------|---------------|-------------------|
| Ravi Kumar | EMP-001 | Engineering | 2026-01-15 | ASSET-2026-0012 |
| Priya Nair | EMP-002 | Design | 2026-02-01 | ASSET-2026-0034 |

#### License Alert Schedule

| Alert | Trigger |
|-------|---------|
| Early Warning | 60 days before expiry |
| Standard Warning | 30 days before expiry |
| Urgent Warning | 7 days before expiry |

#### License Utilization Summary (visible on dashboard)

| Software | Total | Used | Available | Utilization % |
|----------|-------|------|-----------|---------------|
| MS Office 365 | 50 | 47 | 3 | 94% |
| Adobe CC | 10 | 6 | 4 | 60% |
| Zoom Pro | 25 | 25 | 0 | 100% (at limit) |

---

### 3.5 Subscription Management

Unlike one-time license purchases, SaaS subscriptions recur on a monthly or annual billing cycle. This module tracks all active subscriptions and their renewal dates.

#### Subscription Record Fields

| Field | Description |
|-------|-------------|
| Subscription ID | Auto-generated |
| Service Name | e.g., AWS, Google Workspace, Zoom, GitHub, Slack, Figma, Jira, Confluence, Notion |
| Category | Cloud Infra, Communication, Design, DevOps, HR Tools, Finance Tools, Security |
| Plan Name / Tier | e.g., Business Pro, Enterprise, Team |
| Billing Cycle | Monthly / Annual |
| Billing Amount | Amount charged per cycle |
| Currency | INR / USD / EUR |
| Next Billing Date | When the next charge will hit |
| Payment Method | Credit Card, Bank Transfer, Purchase Order |
| Card / Account Details | Last 4 digits or account reference (masked) |
| Account Owner | Internal person responsible for this subscription |
| Number of Seats / Users | How many employees use this service |
| Status | Active / Paused / Cancelled |
| Auto-Renewal | Yes / No |
| Subscription Start Date | When the subscription began |
| Cancellation Date | If cancelled |
| Usage Notes | Internal notes on usage |
| Annual Cost | Auto-calculated (Billing Amount × 12 for monthly) |

#### Renewal Alert Schedule

| Alert | Trigger |
|-------|---------|
| Standard Warning | 30 days before billing date |
| Urgent Warning | 7 days before billing date |

---

### 3.6 Employee Asset Portal

Every employee gets a personal view showing all assets and licenses assigned to them. This replaces the "who has what" spreadsheet.

#### Employee Profile Fields

| Field | Description |
|-------|-------------|
| Employee ID | Unique ID (synced with HR system) |
| Full Name | Employee full name |
| Designation / Title | Job role |
| Department | Engineering, Design, HR, Finance, Sales, etc. |
| Reporting Manager | Direct manager |
| Work Location | Office / Remote / Hybrid |
| Joining Date | Employment start date |
| Email | Corporate email address |
| Phone | Contact number |
| Status | Active / On Leave / Resigned |

#### Employee Asset View

- **Currently Assigned Assets** — list of all assets currently with this employee, with serial numbers, condition, and assignment date
- **License Assignments** — software licenses assigned to this employee
- **Assignment History** — all assets ever issued to this employee (with return dates)
- **Acknowledgement** — digital sign-off checkbox or e-signature when an asset is handed over

#### Offboarding Checklist

When an employee is marked as Resigned/Terminated:
- System auto-generates a list of all assets to be returned
- IT Admin confirms return of each item
- Licenses are auto-released back to the available pool
- Status of all assets changes to "Available"

---

### 3.7 Procurement & Purchase Orders

Tracks purchases from the moment a request is raised to final delivery and invoice reconciliation.

#### Purchase Order Fields

| Field | Description |
|-------|-------------|
| PO Number | Unique identifier, e.g., `PO-2026-0045` |
| Vendor / Supplier Name | Who the order is placed with |
| Vendor Contact | Contact person and phone/email |
| Order Date | Date PO was raised |
| Expected Delivery Date | Promised delivery date |
| Actual Delivery Date | When items were received |
| Items Ordered | Line items: Asset Type, Quantity, Unit Price, Total |
| Sub-Total | Sum of all line items |
| Tax / GST | Tax applicable |
| Total Cost | Sub-total + Tax |
| Status | Draft / Pending Approval / Approved / Ordered / Partially Received / Fully Received / Cancelled |
| Approved By | Manager who approved the PO |
| Budget Code / Cost Center | For finance allocation |
| Payment Status | Unpaid / Partially Paid / Paid |
| Invoice Number | Vendor invoice reference |
| Invoice Document | File upload (PDF/image) |
| Notes | Special instructions or notes |

#### PO Status Flow

```
Draft → Pending Approval → Approved → Ordered → Partially Received → Fully Received
                                                                    ↘ Cancelled
```

When items are received, each item is linked to a new Asset record in the Asset Registry.

---

### 3.8 Maintenance & Repair Tracking

Tracks every repair or maintenance activity for any asset, whether under warranty or paid.

#### Maintenance Ticket Fields

| Field | Description |
|-------|-------------|
| Ticket ID | Auto-generated, e.g., `MNT-2026-0078` |
| Asset ID | Reference to the asset being repaired |
| Asset Serial Number | Auto-filled from Asset ID |
| Issue Title | Short description of the problem |
| Issue Description | Detailed description |
| Reported By | Employee who reported it |
| Reported Date | Date of report |
| Priority | Low / Medium / High / Critical |
| Assigned Technician | Internal IT staff member |
| Status | Open / In Progress / Sent to Vendor / Awaiting Parts / Resolved / Closed |
| Under Warranty? | Yes / No (auto-flagged based on Warranty module) |
| Vendor (if sent out) | Repair vendor name |
| Repair Start Date | When repair began |
| Repair Completion Date | When repair was completed |
| Turnaround Time | Auto-calculated (days) |
| Resolution Summary | What was done to fix it |
| Repair Cost | Cost of repair (0 if under warranty) |
| Replaced Parts | List of parts replaced |
| Follow-up Required | Yes / No |
| Notes | Additional notes |

---

### 3.9 Audit & Compliance

Ensures the system data matches physical reality, and maintains a full audit trail for compliance.

#### Physical Audit

- **Scheduled Audits** — IT Admin schedules quarterly or annual audits
- **Audit Checklist** — system generates a list of all assets by location; auditor checks each one
- **Verification Status** — each asset is marked: Verified / Not Found / Condition Changed / Discrepancy
- **Discrepancy Report** — auto-generated report of mismatches between system records and physical count

#### Audit Log (Change History)

Every change to any record is logged:

| Timestamp | User | Module | Record ID | Field Changed | Old Value | New Value |
|-----------|------|--------|-----------|---------------|-----------|-----------|
| 2026-06-01 10:22 | admin@company.com | Asset | ASSET-2026-0012 | Status | Available | Assigned |
| 2026-06-01 10:23 | admin@company.com | Asset | ASSET-2026-0012 | Assigned To | — | EMP-001 |

#### Asset Disposal

When an asset is retired:

| Field | Description |
|-------|-------------|
| Disposal Date | Date of disposal |
| Disposal Method | Sold / Donated / E-Waste / Scrapped / Traded-In |
| Disposal Value | Amount received (if sold or traded) |
| Disposal Vendor | Who it was disposed to |
| Authorization | Who approved the disposal |
| Certificate | Upload disposal/e-waste certificate |

#### Compliance Tags

Assets and records can be tagged for compliance frameworks:

| Tag | Meaning |
|-----|---------|
| ISO 27001 | Information security asset control |
| SOC 2 | System and organization controls |
| GDPR | Personal data handling compliance |
| PCI-DSS | Payment card security |

---

### 3.10 Reports & Dashboard

#### Dashboard KPIs (Real-Time)

| KPI | Description |
|-----|-------------|
| Total Assets | Count of all assets in the system |
| Assets by Type | Breakdown: Laptops, Monitors, Peripherals, etc. |
| Assets by Status | Available / Assigned / In Repair / Retired |
| Total IT Spend | Sum of all asset purchase prices + subscriptions + licenses |
| Warranties Expiring | Count expiring in next 30 / 60 / 90 days |
| Licenses Expiring | Count expiring in next 30 / 60 / 90 days |
| License Utilization | % of seats in use vs. total purchased |
| Open Maintenance Tickets | Count of unresolved tickets |
| Subscriptions Due | Subscriptions billing in next 30 days |

#### Available Reports

| Report | Description |
|--------|-------------|
| Full Asset Inventory | All assets with all fields |
| Asset Assignment Report | Who has which asset, with duration |
| Warranty Expiry Report | Assets with warranties expiring in a given period |
| License Usage Report | Utilization per software (used vs. total) |
| License Expiry Report | Licenses expiring in a given period |
| Subscription Cost Report | Monthly/annual cost per subscription |
| Maintenance History Report | All repair tickets with cost and resolution |
| Procurement Spend Report | PO history, vendor spend, delivery times |
| Asset Lifecycle Report | Purchase → Assignment → Repair → Retirement timeline |
| Department-wise Asset Report | Assets grouped by department |
| Cost by Category | Spend on Laptops vs. Software vs. Subscriptions |
| Unassigned Assets Report | Available inventory sitting idle |
| Disposed Assets Report | All retired/disposed assets with disposal details |

All reports are exportable to **PDF, Excel (XLSX), and CSV**.

---

## 4. Notification & Alert System

All alerts are configurable by the IT Admin. Each alert type has default thresholds that can be customized.

### Alert Types

| Alert Type | Default Triggers | Who Gets It |
|------------|-----------------|-------------|
| Warranty Expiry | 90 days, 30 days, 7 days before expiry | IT Admin, IT Manager |
| License Expiry | 60 days, 30 days, 7 days before expiry | IT Admin, IT Manager |
| Subscription Renewal | 30 days, 7 days before billing date | IT Admin, Finance |
| Asset Assignment | On assignment | Assigned Employee |
| Asset Return Request | On request | Employee, IT Admin |
| Maintenance Ticket Opened | On creation | Assigned Technician |
| Maintenance Ticket Updated | On status change | Reporter, Technician |
| Maintenance Ticket Resolved | On resolution | Reporter |
| Audit Reminder | 14 days before scheduled audit | IT Admin |
| Low License Availability | When available seats < 10% | IT Admin |
| Asset Not Found (Audit) | During physical audit | IT Admin, IT Manager |

### Notification Channels

| Channel | Description |
|---------|-------------|
| In-App | Bell icon with notification feed inside ITAMS |
| Email | HTML email to the recipient's corporate email |
| Slack | Message posted to a configured Slack channel or DM |
| Microsoft Teams | Message posted to a configured Teams channel |

---

## 5. Asset Hierarchy (Parent–Child)

Assets can be linked in a parent–child hierarchy. This is useful when a set of accessories is always assigned together with a primary device.

### How It Works

- A **Parent Asset** (e.g., a laptop) can have one or more **Child Assets** (e.g., its bag, docking station, external mouse)
- When the parent asset is assigned to an employee, child assets can be auto-assigned together
- When the parent is returned, the system prompts to return all children too

### Example Hierarchy

```
ASSET-2026-0001 (Laptop — Dell XPS 15)
├── ASSET-2026-0045 (Docking Station — Dell WD19)
├── ASSET-2026-0067 (External Monitor — LG 27" 4K)
├── ASSET-2026-0089 (Laptop Bag — Dell Briefcase)
└── ASSET-2026-0102 (USB Hub — Anker 7-in-1)

ASSET-2026-0055 (Desktop — HP Z4 Workstation)
├── ASSET-2026-0056 (Monitor 1 — Dell 27" IPS)
├── ASSET-2026-0057 (Monitor 2 — Dell 27" IPS)
├── ASSET-2026-0058 (Keyboard — Logitech MX Keys)
└── ASSET-2026-0059 (Mouse — Logitech MX Master 3)
```

### Rules

- A child can only have one parent at a time
- A child can be un-linked from a parent and re-linked to another
- Parent–child relationships are preserved in the audit log

---

## 6. Data Entities & Key Fields

Summary of all data entities in the system and their most important fields.

| Entity | Key Fields |
|--------|-----------|
| **Asset** | Asset ID, Asset Type, Brand, Model, Serial Number, Status, Condition, Purchase Price, Assigned To, Location |
| **Device Specifications** | Asset ID (ref), CPU, RAM, Storage, OS, GPU, Battery Health, MAC Address, BIOS Version |
| **Warranty** | Warranty ID, Asset ID (ref), Provider, Type, Start Date, Expiry Date, Status, AMC details |
| **Software License** | License ID, Software Name, License Type, Total Seats, Assigned Seats, Expiry Date, Status, Price |
| **License Assignment** | License ID (ref), Employee ID (ref), Asset ID (ref), Assigned Date |
| **Subscription** | Subscription ID, Service Name, Category, Plan, Billing Cycle, Amount, Next Billing Date, Status |
| **Employee** | Employee ID, Name, Department, Designation, Email, Status, Join Date |
| **Purchase Order** | PO Number, Vendor, Order Date, Total Cost, Status, Budget Code, Invoice |
| **Maintenance Ticket** | Ticket ID, Asset ID (ref), Issue, Priority, Status, Technician, Repair Cost, Resolution |
| **Audit Record** | Audit ID, Timestamp, User, Module, Record ID, Field, Old Value, New Value |
| **Asset Disposal** | Asset ID (ref), Disposal Date, Method, Value, Vendor, Authorized By |

---

## 7. Access Roles & Permissions

| Permission | Super Admin | IT Admin | IT Manager | Finance | Employee |
|------------|:-----------:|:--------:|:----------:|:-------:|:--------:|
| View all assets | ✅ | ✅ | ✅ | ✅ | ❌ (own only) |
| Add / Edit assets | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete assets | ✅ | ❌ | ❌ | ❌ | ❌ |
| Assign assets to employees | ✅ | ✅ | ❌ | ❌ | ❌ |
| View device specs | ✅ | ✅ | ✅ | ❌ | ❌ (own only) |
| Manage warranties | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage licenses | ✅ | ✅ | ❌ | ❌ | ❌ |
| View license costs | ✅ | ✅ | ✅ | ✅ | ❌ |
| Manage subscriptions | ✅ | ✅ | ❌ | ✅ | ❌ |
| View subscription costs | ✅ | ✅ | ✅ | ✅ | ❌ |
| Create / Approve POs | ✅ | ✅ (create) | ✅ (approve) | ✅ (view) | ❌ |
| Manage maintenance tickets | ✅ | ✅ | ✅ (view) | ❌ | ✅ (report) |
| Run / Schedule audits | ✅ | ✅ | ❌ | ❌ | ❌ |
| View audit log | ✅ | ✅ | ✅ | ❌ | ❌ |
| Dispose assets | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage users & roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| View all reports | ✅ | ✅ | ✅ | ✅ (cost only) | ❌ |
| Configure notifications | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 8. Future Enhancements (Phase 2)

| Feature | Description |
|---------|-------------|
| **QR Code / Barcode Scanning** | Each asset gets a printed QR code sticker. During physical audits, IT staff scan the code using a phone camera to instantly locate and verify the asset in the system. |
| **Mobile App** | A companion mobile app for IT field audits — scan assets, update conditions, and mark discrepancies on the go without needing a laptop. |
| **AI Lifecycle Predictions** | Based on asset age, usage patterns, and maintenance history, the system predicts when an asset is likely to fail — enabling proactive replacement before productivity is impacted. |
| **HR System Integration** | When a new employee is onboarded in the HR system, ITAMS auto-creates their profile and triggers an asset allocation workflow. When they leave, all assets are auto-flagged for return. |
| **Procurement System Integration** | Two-way sync with SAP, Odoo, or Zoho Books so Purchase Orders created in ITAMS flow into the financial system automatically. |
| **MDM Integration** | Integration with Mobile Device Management tools (Jamf, Intune, SOTI) to auto-pull device specs, OS versions, antivirus status, and battery health directly from enrolled devices — eliminating manual data entry. |
| **Asset Depreciation Calculator** | Track asset book value over time using straight-line or reducing balance depreciation methods, with annual depreciation reports for finance and tax purposes. |
| **Budget Planning Module** | Allow IT Managers to set annual budgets per category (Hardware, Software, Subscriptions) and track actual spend vs. budget in real time. |
| **Vendor Management** | A dedicated vendor database with contact details, past order history, SLAs, and performance ratings. |
| **Self-Service Request Portal** | Employees can raise requests for new assets or software licenses. Requests go through an approval workflow before IT Admin fulfills them. |

---

## Appendix A: Asset Status Flow

```
Purchase Received
      ↓
  [Available]
      ↓
  [Assigned] ──────────────→ [In Repair] ──→ [Available]
      ↓                              ↓
  [Returned]                   [Retired/Disposed]
      ↓
  [Available]
      ↓
  [Retired/Disposed]
```

## Appendix B: Suggested Tech Stack (for implementation reference)

| Layer | Suggested Options |
|-------|------------------|
| Frontend | React.js / Next.js, Tailwind CSS |
| Backend | Node.js (Express) / Django / Laravel |
| Database | PostgreSQL (relational, strong for joins) |
| File Storage | AWS S3 / Azure Blob (for photos, invoices) |
| Authentication | OAuth 2.0 / SSO (Google Workspace / Azure AD) |
| Notifications | SendGrid (email), Slack API, MS Teams Webhook |
| Hosting | AWS / Azure / GCP |
| Reports Export | jsPDF, SheetJS (xlsx export) |

---

*Document prepared for internal design and planning purposes.*
*IT Asset Management System — v1.0 — June 2026*
