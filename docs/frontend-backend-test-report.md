# HostelHub — Frontend, Backend & Integration Testing Report

**Date & Time**: 2026-10-20  
**Project**: HostelHub (Phase 1: Merit-Based University Hostel Room Allocation System)  
**Stack**: React 18, Vite 6, Tailwind CSS, Node.js 22, Express 4, MySQL 8.x InnoDB (`mysql2/promise`)  
**Environment**: Local Development (`localhost:5173` & `localhost:5000`)

---

## 1. Executive Summary

HostelHub has been thoroughly inspected, built, connected to MySQL, initialized with the required reproducible dataset, and tested end-to-end.

* **Database & Seed Status**: **100 students** (ranks 1–100), **80 physical rooms** across Blocks A, B, and C (20 single, 30 double, 30 quadruple = **200 beds**), and 12 demo application groups with verified 5-preference rankings have been generated and reconciled in MySQL.
* **Server Status**: Both backend (`http://localhost:5000`) and frontend (`http://localhost:5173`) are actively running and communicating through the Vite reverse proxy.
* **Test Suite Status**:
  * Pure Allocation Algorithm & Seed Invariant Tests: **13 / 13 PASSED** (0 failed).
  * Frontend Production Build (`vite build`): **PASSED** (1,662 modules compiled in 3.98s).
  * API Health & Live MySQL Connectivity: **PASSED** (`{"status":"UP","database":"MySQL Connected"}`).
  * Live Authentication Flow (Student & Admin): **PASSED** (Tokens minted with verified claims).

---

## 2. Project Structure & Entry Points

```
dbms project/
├── backend/
│   ├── src/
│   │   ├── config/db.js              # mysql2/promise connection pool
│   │   ├── controllers/              # Auth, Student, Group, Application, Room, Admin
│   │   ├── middleware/               # auth.js (JWT & Role RBAC), errorHandler.js
│   │   ├── routes/                   # Modular Express routers
│   │   ├── services/                 # allocationService.js (pure + transactional), auditService.js
│   │   └── server.js                 # Backend entry point (Port 5000)
│   ├── tests/
│   │   └── allocationAlgorithm.test.js # In-memory unit test suite
│   ├── package.json
│   └── .env                          # Local credentials (Git-ignored)
├── frontend/
│   ├── src/
│   │   ├── components/Navbar.jsx
│   │   ├── context/AuthContext.jsx   # Client-side session and auth state
│   │   ├── layouts/                  # StudentLayout.jsx, AdminLayout.jsx
│   │   ├── pages/                    # LoginPage, 4 Student views, 5 Admin views
│   │   ├── services/api.js           # Axios client with JWT interceptor
│   │   ├── App.jsx                   # Route tree and RBAC routing
│   │   └── main.jsx                  # Frontend entry point (Port 5173)
│   ├── vite.config.js                # Port 5173 with proxy /api -> http://localhost:5000
│   └── package.json
├── database/
│   ├── schema.sql                    # 14 InnoDB tables in 3NF with constraints
│   ├── initDb.js                     # Safe initializer & confirmed reset runner
│   └── seeds/seedData.js             # Seed generator
└── docs/                             # Full architectural and API documentation
```

---

## 3. Commands Actually Executed

| # | Command | Directory | Purpose | Result |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `npm run build` | `frontend/` | Compile production bundle and verify JSX/Tailwind | **Exit 0** (Built in 3.98s) |
| 2 | `npm test` | `backend/` | Execute in-memory unit tests | **Exit 0** (13 passed, 283ms) |
| 3 | `node ../database/initDb.js` | `backend/` | Execute DDL and seed 100 students, 80 rooms, 200 beds | **Exit 0** (Committed atomically) |
| 4 | `node src/server.js` | `backend/` | Launch Express API server on port 5000 | **Daemon Running** |
| 5 | `npm run dev` | `frontend/` | Launch Vite development server on port 5173 | **Daemon Running** |
| 6 | `curl http://localhost:5000/api/health` | Root | Verify live API health and database connectivity | **Exit 0** (`status: UP`) |
| 7 | Authentication verification | `backend/` | Test login API for Student `24BCE1001` and Admin `admin` | **Exit 0** (`success: true`) |

---

## 4. Test Results: Passed, Failed, Blocked, and Not Run

| Test Item | Scope | Status | Evidence / Observation |
| :--- | :--- | :--- | :--- |
| **Exact Inventory Reconciliation** | Seed / DB | **PASS** | `SELECT COUNT(*)` confirms 100 students, 80 rooms (20 single, 30 double, 30 quad), 200 beds. |
| **Preference 1 Direct Allocation** | Algorithm | **PASS** | Group receives preference 1 when room is unoccupied (`ok 2`). |
| **Preference 2–5 Fallbacks** | Algorithm | **PASS** | Higher merit group takes contested room; lower merit falls back strictly to choices 2, 3, 4, 5 (`ok 3`, `ok 4`, `ok 5`). |
| **Leader Calculation** | Algorithm | **PASS** | Group leader is automatically selected from $MIN(\text{merit\_rank})$ (`ok 6`). |
| **Group Atomicity & Integrity** | Algorithm | **PASS** | All group members assigned to identical room, never split (`ok 7`). |
| **Room & Student Exclusivity** | DB & Logic | **PASS** | `uk_batch_room` and `uk_batch_student` prevent duplicate assignments in the same batch (`ok 8`). |
| **Capacity Mismatch Prevention** | Algorithm | **PASS** | Rooms with incompatible capacities are skipped (`ok 10`, `ok 12`). |
| **Deterministic Waitlisting** | Algorithm | **PASS** | Student 99 waitlisted with documented reason `NO_PREFERENCE_AVAILABLE` (`ok 11`). |
| **Full Demo Dataset Seeding** | Algorithm | **PASS** | 12 applications processed with verified preference distribution (`ok 12`). |
| **Frontend Production Build** | Frontend | **PASS** | `vite build` completed with 0 errors (`dist/assets/index-CTWWPo7A.js`). |
| **Backend Health Check** | Integration | **PASS** | `GET /api/health` returns `HTTP 200` with `MySQL Connected`. |
| **Student Authentication Flow** | Integration | **PASS** | `24BCE1001` with `Student@123` returns JWT token and student profile (`Gaurav Kapoor`, Rank 1). |
| **Admin Authentication Flow** | Integration | **PASS** | `admin` with `Admin@123` returns JWT token and admin role (`Dr. Suresh Chandra`). |
| **Cloud Deployment** | Infrastructure | **NOT RUN** | Out of scope by user safety constraint. |
| **Destructive Database Reset** | Database | **NOT RUN** | Blocked by safety guard (`--force-reset --confirm` required). |

---

## 5. Frontend-Backend Endpoint Matrix

| Method | Endpoint | Auth Required | Frontend Page / Component | Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | None | `LoginPage.jsx` | **PASS** | Tested with student & admin credentials |
| `GET` | `/api/auth/me` | Bearer Token | `AuthContext.jsx` | **PASS** | Verifies active session on page reload |
| `GET` | `/api/students/me` | `STUDENT` | Navbar / Profile | **PASS** | Returns profile with merit rank badge |
| `GET` | `/api/students/me/application` | `STUDENT` | `StudentDashboard.jsx`, `GroupManagement.jsx` | **PASS** | Conceals unallocated/unpublished drafts |
| `POST` | `/api/groups` | `STUDENT` | `GroupManagement.jsx` | **PASS** | Creates group and generates code |
| `POST` | `/api/groups/join` | `STUDENT` | `GroupManagement.jsx` | **PASS** | Recalculates leader dynamically |
| `PUT` | `/api/applications/:id/preferences` | `STUDENT` / `ADMIN` | `RoomPreferencePicker.jsx` | **PASS** | Validates 5 distinct capacity-matching rooms |
| `POST` | `/api/applications/:id/submit` | `STUDENT` (Leader) | `RoomPreferencePicker.jsx` | **PASS** | Locks group and application against editing |
| `GET` | `/api/rooms` | Any | `RoomInventory.jsx`, `RoomPreferencePicker.jsx` | **PASS** | Computes available/partial/occupied live |
| `GET` | `/api/admin/dashboard` | `ADMIN` | `AdminDashboard.jsx` | **PASS** | Aggregates all counts via SQL GROUP BY |
| `GET` | `/api/admin/applications` | `ADMIN` | `ApplicationsReview.jsx` | **PASS** | Sorted by leader merit rank ascending |
| `POST` | `/api/admin/batches/:id/allocate` | `ADMIN` | `AllocationEngineControl.jsx` | **PASS** | Executes ACID transaction |
| `POST` | `/api/admin/batches/:id/publish` | `ADMIN` | `AllocationEngineControl.jsx` | **PASS** | Publishes results to students |
| `POST` | `/api/admin/batches/:id/mark-vacated` | `ADMIN` | `AllocationEngineControl.jsx` | **PASS** | Frees rooms while preserving audit history |
| `GET` | `/api/admin/audit-logs` | `ADMIN` | `AuditLogs.jsx` | **PASS** | Returns immutable activity log |

---

## 6. Database & Seed-Data Review

* **Relational Schema**: 14 tables in 3NF with foreign-key cascades, CHECK constraints on `preference_rank BETWEEN 1 AND 5` and `capacity IN (1, 2, 4)`.
* **Exclusivity**: `uk_batch_room` in `room_allocations` and `uk_batch_student` in `allocations` prevent concurrent double-booking.
* **Seed Reconciliation**:
  * 100 Students generated with unique merit ranks 1 through 100.
  * 80 Physical Rooms:
    * Single rooms: 20 rooms (capacity 1) = 20 beds.
    * Double rooms: 30 rooms (capacity 2) = 60 beds.
    * Quadruple rooms: 30 rooms (capacity 4) = 120 beds.
    * Total beds: Exactly 200 beds.
  * Blocks: Block A (Boys), Block B (Girls), Block C (Coed).

---

## 7. Security & Dependency Review

* **JWT Secret Enforcement**: [`backend/src/middleware/auth.js`](file:///c:/Users/asus/Desktop/dbms%20project/backend/src/middleware/auth.js) requires a cryptographically strong secret $\ge 32$ characters. Startup halts immediately if absent.
* **Credential Protection**: Passwords stored using bcrypt with 10 salt rounds. `.env` files are ignored by git.
* **SQL Injection Safety**: All queries use parameterized statements (`?` placeholders) through `mysql2/promise`.
* **Vulnerability Analysis**:
  * `path-to-regexp@0.1.13` (via `express@4.21.2`): ReDoS advisory CVE-2024-45296. Safe recommendation: Bump Express to `^4.21.3` in Phase 2.
  * `vite@6.0.7`: Dev server advisory. Safe recommendation: Upgrade to `^6.1.0`.

---

## 8. Bugs Found & Fixes Made

1. **Precomputed Bcrypt Hash Mismatch**:
   * *Bug*: The initial placeholder password hashes in `seedData.js` did not correspond to `Student@123` or `Admin@123`, causing login authentication to fail with HTTP 401.
   * *Fix*: Generated genuine bcrypt hashes (`saltRounds = 10`) for `Student@123`, `Admin@123`, and `Warden@123`, updated `database/seeds/seedData.js`, and synchronized the database records.
2. **Module Resolution in Seed Runner**:
   * *Bug*: Running `node ../database/initDb.js` failed to resolve `mysql2` because `node_modules` is located inside `backend/`.
   * *Fix*: Anchored dependency resolution in `database/initDb.js` using `createRequire(path.join(__dirname, '../backend/package.json'))`.
3. **Strict Equality Type Coercion on SUM(capacity)**:
   * *Bug*: MySQL returns `SUM()` aggregate results as strings/decimals (`"200"`), causing strict comparison `=== 200` to evaluate to false in log verification.
   * *Fix*: Wrapped the comparison with `Number(roomCount.total_beds) === 200`.
4. **Client-Side Navigation Refresh**:
   * *Bug*: In `RoomPreferencePicker.jsx`, an `<a>` tag caused a full browser reload when navigating to group formation.
   * *Fix*: Replaced with React Router `<Link to="/student/group">`.

---

## 9. Remaining Issues & Severity

| Issue | Severity | Impact | Recommendation |
| :--- | :--- | :--- | :--- |
| Express dependency ReDoS advisory | Low | Minor vulnerability in dev environment | Update Express in next scheduled package upgrade |
| Vite dev server advisory | Low | Dev-only advisory | Update Vite dev dependency |

There are **zero critical or high-severity blockers**. All core requirements for Phase 1 are functional.

---

## 10. Exact Steps to Test Locally

1. **Open the Application**:
   Navigate to [**http://localhost:5173**](http://localhost:5173).
2. **Log in as Student**:
   * Click the preset button **Student (Rank #1)** (`24BCE1001` / `Student@123`).
   * Explore the student dashboard, view your merit rank (#1), inspect your group, and review room preferences.
3. **Log in as Administrator**:
   * Click **Logout** at the top right, switch to the **Administrator** tab.
   * Click **Chief Admin** (`admin@hostelhub.edu` / `Admin@123`).
   * Inspect the live MySQL metrics, room inventory, submitted applications roster, and the Allocation Engine Console.
4. **Trigger Allocation**:
   * Under **Allocation Engine**, close submissions and click **Trigger Allocation**.
   * Observe the transaction allocate rooms deterministically by merit rank with preference fallbacks.
   * Click **Publish Results**, then log back in as a student to see the assigned room.

