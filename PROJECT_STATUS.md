# HostelHub — Project Implementation Status

**Repository**: [https://github.com/SriKhushi04/dbms-project.git](https://github.com/SriKhushi04/dbms-project.git)  
**Project**: HostelHub — University Merit-Based Hostel Room Allocation & Management System  
**Current Branch**: `Sayantika`  
**Current Commit**: `d7256e9` ("Implement HostelHub management modules")  
**Working Tree Status**: Clean  
**Current Phase**: Phase 1 (Completed) & Phase 2 Management Module (Implemented & Unit/Mock-Verified; MySQL Deployment Pending)  
**Tech Stack**: React 18, Vite 6, Tailwind CSS, Node.js 22/24, Express.js (ES modules), MySQL 8.x InnoDB (`mysql2/promise`), Bcrypt.js, JsonWebToken

---

## 🚀 1. What Is Done (Completed Features)

### 🗄️ Database Architecture & Relational Schema (3NF)
- [x] **Relational Core Schema (Phase 1)**: Streamlined InnoDB tables designed in Third Normal Form (3NF) in [`database/schema.sql`](database/schema.sql):
  - `hostels`, `rooms`, `students`, `roommate_groups`, `group_members`, `preferences`, `allocations`.
- [x] **Relational Constraints & Integrity**:
  - `CHECK (preference_rank BETWEEN 1 AND 5)` and `CHECK (capacity IN (1, 2, 4))`.
  - Exclusivity constraints preventing double-booking: `student_id INT UNIQUE` in `allocations`.
  - Single active group membership: `student_id INT UNIQUE` in `group_members`.
  - Exactly 5 distinct preferences per group: `UNIQUE KEY uk_group_pref (group_id, preference_rank)` and `UNIQUE KEY uk_group_room (group_id, room_id)`.
- [x] **Exact Physical Inventory**:
  - **80 physical rooms** and **200 beds** distributed across Block A (Boys), Block B (Girls), and Block C (Coed):
    - 20 Single rooms (capacity 1) = 20 beds
    - 30 Double rooms (capacity 2) = 60 beds
    - 30 Quadruple rooms (capacity 4) = 120 beds
- [x] **100 Fictional Students**: Reproducible seed generator with unique merit ranks from 1 through 100 in [`database/seeds/seedData.js`](database/seeds/seedData.js).
- [x] **Additive Management Schema (Phase 2)**: Additive schema defined in [`database/migrations/001_management_schema.sql`](database/migrations/001_management_schema.sql) and appended to [`database/schema.sql`](database/schema.sql):
  - `management_staff`, `student_credentials`, `maintenance_tickets`, `fee_invoices`, `fee_payments`, `mess_menu`, `student_dietary_preferences`, `mess_rebates`, `gate_passes`.
  - Uses `CREATE TABLE IF NOT EXISTS` to avoid modifying or overwriting existing Phase 1 allocation tables.

### ⚙️ Backend Services & REST APIs
- [x] **Node.js / Express Architecture**: Clean ES module structure with separated routes, controllers, middleware, and services.
- [x] **Room Allocation Engine (Phase 1 — Khushi)**:
  - Pure algorithm implementation in [`backend/src/server.js`](backend/src/server.js).
  - Deterministic tie-breaking and sorting strictly by calculated leader rank ascending ($MIN(\text{merit\_rank})$).
  - Preference fallback mechanism: evaluates preferences 1 through 5 in sequence.
  - Group atomicity: entire group is placed in one room matching its exact capacity; groups are never split.
- [x] **Hostel Management Module (Phase 2 — Sayantika)**:
  - Mounted via dedicated router in [`backend/src/routes/managementRoutes.js`](backend/src/routes/managementRoutes.js) and [`backend/src/controllers/managementController.js`](backend/src/controllers/managementController.js).
  - **Security & RBAC Middleware ([`backend/src/middleware/managementAuth.js`](backend/src/middleware/managementAuth.js))**: JWT signature verification (`JWT_SECRET`), student ownership enforcement (`req.user.sub`), and role permission guards (`WARDEN`, `ACCOUNTANT`, `MESS_SUPERVISOR`, `SECURITY_GUARD`).
  - **First-Time Staff Setup (`POST /api/management/auth/setup-first-staff`)**: Protected against unauthorized claims via one-time database check (`COUNT(*) == 0`) and optional environment secret (`INITIAL_STAFF_SETUP_KEY`).
  - **CLI Staff Provisioning ([`backend/src/scripts/createStaff.js`](backend/src/scripts/createStaff.js))**: Out-of-band server administration script.
  - **Feature 1: Maintenance & Complaints**: Endpoints for lodging complaints, auto-linking allocated rooms, warden roster filtering, status transitions (`PENDING` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`), and technician assignment with mandatory resolution notes.
  - **Feature 2: Fees & Billing**: Endpoints for student fee ledger generation (based on room capacity tier), online payment simulation, balance recalculation, and accountant ledger.
  - **Feature 3: Mess & Meals**: Endpoints for 7-day meal schedule display, dietary preference selection (`VEGETARIAN`, `NON_VEGETARIAN`, `JAIN`), and mess rebate requests (minimum 3 consecutive days, ₹150/day credit calculation).
  - **Feature 4: Curfew & Gate Pass**: Endpoints for Day Pass (curfew cutoff 10:00 PM) and Night Out requests, warden digital approval, and security guard check-out / check-in movement logging with overdue detection.

### 💻 Frontend Web Application (React + Vite + Tailwind CSS)
- [x] **Landing Page & Routing ([`frontend/src/App.jsx`](frontend/src/App.jsx))**:
  - Two distinct portals: Room Allocation (`/allocation/login`, `/allocation/dashboard`, `/allocation/admin`) and Hostel Management (`/management`).
- [x] **Student Allocation Portal & Admin Console (Phase 1)**:
  - Two-screen allocation workflow (`LoginPage.jsx`, `StudentDashboard.jsx`, `AdminAllocationPage.jsx`).
- [x] **Hostel Management Portal (Phase 2 — [`frontend/src/pages/HostelManagementPage.jsx`](frontend/src/pages/HostelManagementPage.jsx))**:
  - Full tabbed interface with 4 functional management sections:
    1. **Maintenance & Complaints**: Student submission form, allocated room detection, priority badges, and Warden action modal.
    2. **Fees & Billing**: Financial overview cards, capacity-based fee breakdown, simulated checkout modal, and accountant directory.
    3. **Mess & Meals**: Interactive 7-day meal calendar, dietary preference buttons, and mess leave rebate calculator.
    4. **Curfew & Gate Pass**: Day/night pass forms, digital pass card, and security guard gate terminal.
  - Modal authentication flow for Student login, Password registration, Staff login, and First-time staff setup.

### 🧪 Testing, Builds & Allocation Protection
- [x] **46 Passing Backend Automated Tests**:
  - 10 tests in `allocationEngine.test.js`: Room allocation engine invariants & edge cases.
  - 8 tests in `roommateValidation.test.js`: Roommate field validation & concurrency rules.
  - 6 tests in `studentWorkflow.test.js`: Student workflow, seeds, and UI state branching.
  - 8 tests in `managementValidation.test.js`: Input bounds, password hashing, JWT verification, state machine rules, and RBAC matrix.
  - 9 tests in `managementIntegration.test.js` + 5 subtests: Router dispatch, role guards, token lifecycles, and allocation immutability assertion.
- [x] **Frontend Production Build**: Clean `vite build` completed in ~8–22s with zero warnings or errors (`dist/` generated).
- [x] **Allocation Protection Verified**:
  - All 9 protected allocation-related files verified to have **100% matching SHA-256 baseline hashes**:
    * `backend/tests/allocationEngine.test.js` (`42D47CB7...`)
    * `backend/tests/roommateValidation.test.js` (`FE2CAEC4...`)
    * `backend/tests/studentWorkflow.test.js` (`2607A683...`)
    * `database/seeds/seedData.js` (`9050CFF6...`)
    * `database/seeds/seed.sql` (`4C3223AB...`)
    * `frontend/src/pages/student/StudentDashboard.jsx` (`BC0C2A3B...`)
    * `frontend/src/pages/AdminAllocationPage.jsx` (`91F5421E...`)
    * `frontend/src/pages/LoginPage.jsx` (`C2261434...`)
    * `frontend/src/pages/LandingPage.jsx` (`E5246ECE...`)
  - Integration tests assert that the `allocations` table row count and data remain untouched by management operations.

---

## ⚠️ 2. Testing Distinctions & Current Status

| Verification Scope | Status | Notes |
| :--- | :--- | :--- |
| **Backend Unit Tests** | **VERIFIED (PASS)** | Pure in-memory unit tests (`node:test`) covering business rules, state machines, and password hashing. |
| **Backend Integration Tests** | **VERIFIED (MOCK-BASED)** | Tests in `managementIntegration.test.js` validate Express routes, middleware, and parameterized SQL queries using an **in-memory transactional mock layer**, because the local MySQL daemon was unavailable. They were **not** executed against a live MySQL server. |
| **Frontend Production Build** | **VERIFIED (PASS)** | Production bundle generated via `vite build` with zero errors. |
| **Allocation Files Integrity** | **VERIFIED (PASS)** | All 9 protected files remain byte-for-byte identical to baseline SHA-256 checksums. |
| **Live MySQL Database Integration** | **PENDING** | MySQL service was unreachable (`ECONNREFUSED` on port 3306) during inspection. Live database migration and live query execution remain pending. |
| **End-to-End Live Browser Testing** | **PENDING** | Visual browser workflow verification against a running backend and active MySQL database remains pending. |

---

## 🛠️ 3. Safe Database Migration Procedure

The management schema is provided as an additive migration in [`database/migrations/001_management_schema.sql`](database/migrations/001_management_schema.sql). Follow these steps to apply it to an existing database safely without resetting or reseeding:

> [!IMPORTANT]
> Always verify database connection parameters and take a full backup before executing any DDL migration on an existing database. Do not assume any migration is guaranteed to be risk-free.

### Step 1: Start MySQL Service
Ensure MySQL 8.x is running on Windows:
```powershell
# If registered as a Windows Service:
Start-Service MySQL80

# Or verify port 3306 is listening:
Test-NetConnection -ComputerName localhost -Port 3306
```

### Step 2: Take a Pre-Migration Backup
Before running the migration, dump the existing database to preserve all Phase 1 data:
```powershell
mysqldump -h localhost -P 3306 -u root -p hostelhub_db > hostelhub_db_backup_pre_management.sql
```

### Step 3: Confirm Target Database & Apply Migration
Verify `backend/.env` points to the intended database (`DB_NAME=hostelhub_db`), then execute the migration script:
```powershell
mysql -h localhost -P 3306 -u root -p hostelhub_db < database/migrations/001_management_schema.sql
```

### Step 4: Verify Migration Output & Table Integrity
Check that the 9 new tables were created without affecting existing tables:
```sql
USE hostelhub_db;

-- Confirm all 16 tables exist (7 Phase 1 + 9 Management):
SHOW TABLES;

-- Verify Phase 1 records are intact:
SELECT COUNT(*) FROM students;    -- Should equal 100
SELECT COUNT(*) FROM rooms;       -- Should equal 80
SELECT COUNT(*) FROM allocations; -- Existing allocations preserved
```

---

## 🔒 4. Security Considerations & Unresolved Limitations

1. **First-Time Staff Setup Protection**:
   - The endpoint `/api/management/auth/setup-first-staff` permanently locks once one staff account exists (`COUNT(*) > 0`).
   - If deployed on an untrusted or public network before the first account is created, set `INITIAL_STAFF_SETUP_KEY` in `backend/.env` and pass `x-setup-key` in the request header, or provision the first account directly via CLI:
     ```powershell
     node backend/src/scripts/createStaff.js admin SecurePass123 WARDEN "Chief Warden"
     ```
2. **Rate Limiting**:
   - There is currently no application-level rate limiting on login or registration endpoints (`/api/management/auth/*`). In production, configure reverse-proxy rate limiting (e.g., Nginx `limit_req`) or `express-rate-limit`.
3. **Transport Security (HTTPS)**:
   - JWT tokens are passed via the HTTP `Authorization: Bearer <token>` header. Production deployments must enforce TLS/HTTPS termination to prevent interception.
4. **Token Invalidation**:
   - JWTs are stateless and expire after 8 hours. There is currently no server-side token revocation or blocklist mechanism prior to token expiration.

---

## 📋 5. Remaining Tasks & Phase 2 Roadmap

### Immediate Tasks
- [ ] Start MySQL 8.x daemon on `localhost:3306`.
- [ ] Take a database backup (`mysqldump`) and apply `database/migrations/001_management_schema.sql`.
- [ ] Execute live database CRUD operations against MySQL.
- [ ] Perform manual end-to-end browser walkthrough across all 4 management tabs in `HostelManagementPage.jsx`.

### Future Enhancements (Phase 2 Roadmap)
- [ ] Real payment gateway webhook integration (Razorpay / Stripe) replacing payment simulation.
- [ ] Automated SMS / Email alerts via Twilio / Nodemailer for gate pass approvals and overdue curfews.
- [ ] Mutual room exchange / swap matching algorithm.
- [ ] Export rosters and fee ledgers to CSV and PDF formats.
- [ ] GitHub Actions CI/CD automation.

---

## 🏁 Summary Table

| Category | Completed & Verified | In-Memory / Simulated | Pending Live Verification |
| :--- | :--- | :--- | :--- |
| **Room Allocation** | Phase 1 fully complete, 27/27 unit tests pass, hashes 100% matching | — | — |
| **Management UI** | 4-module responsive UI built in `HostelManagementPage.jsx`, `vite build` clean | — | Live browser visual walkthrough |
| **Management Backend** | 16 REST endpoints, JWT middleware, Bcrypt hashing, RBAC guards | 17 unit & integration tests pass via in-memory mock DB | Live MySQL query execution |
| **Database Schema** | 9 additive tables designed, migration script created, appended to `schema.sql` | — | Running migration on live MySQL daemon |
| **Security** | Server-side Bcrypt verification, zero hardcoded passwords, setup key guard | — | Rate limiting & TLS reverse-proxy |
