# HostelHub — Project Implementation Status

**Repository**: [https://github.com/SriKhushi04/dbms-project.git](https://github.com/SriKhushi04/dbms-project.git)  
**Project**: HostelHub — University Merit-Based Hostel Room Allocation System  
**Current Phase**: Phase 1 (Completed)  
**Tech Stack**: React 18, Vite 6, Tailwind CSS, Node.js 22, Express.js (ES modules), MySQL 8.x InnoDB (`mysql2/promise`)

---

## 🚀 1. What Is Done (Completed Features)

### 🗄️ Database Architecture & Relational Schema (3NF)
- [x] **Fully Normalized Schema**: 14 InnoDB tables designed in Third Normal Form (3NF) in [`database/schema.sql`](database/schema.sql):
  - `batches`, `admins`, `hostel_blocks`, `rooms`, `students`, `application_groups`, `group_members`, `applications`, `room_preferences`, `allocation_runs`, `room_allocations`, `allocations`, `unallocated_records`, `audit_logs`.
- [x] **Relational Constraints & Integrity**:
  - `CHECK (preference_rank BETWEEN 1 AND 5)` and `CHECK (capacity IN (1, 2, 4))`.
  - Exclusivity constraints preventing double-booking: `UNIQUE KEY uk_batch_room (batch_id, room_id)` in `room_allocations` and `UNIQUE KEY uk_batch_student (batch_id, student_id)` in `allocations`.
  - Application preference uniqueness: `UNIQUE KEY uk_app_pref_rank (application_id, preference_rank)` and `UNIQUE KEY uk_app_room (application_id, room_id)`.
  - Single active group membership per batch: `UNIQUE KEY uk_student_per_batch (batch_id, student_id)`.
- [x] **Exact Physical Inventory**:
  - **80 physical rooms** and **200 beds** distributed across Block A (Boys), Block B (Girls), and Block C (Coed):
    - 20 Single rooms (capacity 1) = 20 beds
    - 30 Double rooms (capacity 2) = 60 beds
    - 30 Quadruple rooms (capacity 4) = 120 beds
- [x] **100 Fictional Students**: Reproducible seed generator with unique merit ranks from 1 through 100.
- [x] **Safe Database Initializer**: [`database/initDb.js`](database/initDb.js) creates schema idempotently and wraps all seeding inside an atomic MySQL transaction with rollback on failure. Guarded against accidental truncation; destructive resets require `--force-reset --confirm`.

### ⚙️ Backend Services & REST APIs
- [x] **Node.js / Express Architecture**: Clean ES module structure with separated routes, controllers, middleware, and services.
- [x] **Security & Authentication**:
  - Bcrypt password hashing (`saltRounds = 10`) for all student and admin accounts.
  - JWT generation and verification with strict secret enforcement ($\ge 32$ characters) at server startup.
  - Role-based authorization middleware (`STUDENT`, `ADMIN`) guarding protected routes.
  - Parameterized queries throughout to eliminate SQL injection risks.
- [x] **Merit Allocation Algorithm Engine**:
  - Pure algorithm implementation in [`backend/src/services/allocationService.js`](backend/src/services/allocationService.js).
  - Deterministic tie-breaking and sorting strictly by calculated leader rank ascending ($MIN(\text{merit\_rank})$).
  - Preference fallback mechanism: evaluates preferences 1 through 5 in sequence.
  - Group atomicity: entire group is placed in one room matching its exact capacity; groups are never split.
  - ACID transaction execution in MySQL with row-level locks and full rollback on conflict.
- [x] **Batch Lifecycle State Machine**:
  - `OPEN` $\rightarrow$ `CLOSED` $\rightarrow$ `ALLOCATED` $\rightarrow$ `PUBLISHED` $\rightarrow$ `ARCHIVED`.
  - Results are strictly hidden from students until the administrator explicitly clicks **Publish**.
- [x] **Controlled Vacancy & History Preservation**:
  - Archiving/vacating an active batch marks records as `VACATED` with timestamps, freeing rooms for subsequent batches without deleting historical allocation or audit records.
- [x] **Immutable Audit Trail**: [`backend/src/services/auditService.js`](backend/src/services/auditService.js) captures admin and student actions with actor IDs, entity IDs, IP addresses, and JSON metadata.

### 💻 Frontend Web Application (React + Vite + Tailwind CSS)
- [x] **Authentication Experience**:
  - Tabbed role switcher (Student Portal vs. Administration Console).
  - One-click quick local demo login presets for instant evaluation.
- [x] **Student Portal**:
  - **Dashboard**: Welcome banner, live merit rank badge, batch cycle status, and application status overview.
  - **Group Formation & Joining**: Create groups of size 1, 2, or 4; join via group codes; dynamic leader recalculation.
  - **5-Room Preference Picker**: Filter rooms by block and capacity; select, reorder, and submit exactly 5 distinct preferences.
  - **Allocation Result View**: Clear status screen concealing results when in progress/unpublished, and displaying room, block, floor, and roommate assignments upon publication.
- [x] **Administrator Portal**:
  - **Dashboard**: Real-time KPI metrics aggregated directly from MySQL (`totalStudents`, `totalRooms`, `occupiedRooms`, `availableRooms`, distribution by block, and distribution by preference rank satisfied).
  - **Physical Room Inventory**: Filterable table showing real-time occupancy status (`AVAILABLE`, `PARTIAL`, `OCCUPIED`).
  - **Applications Roster**: Complete view of all student groups and individual members ordered by priority.
  - **Allocation Engine Console**: One-click actions to close submissions, trigger the allocation transaction, preview draft assignments, publish to students, and vacate rooms.
  - **Audit Logs**: Visual table displaying immutable system actions and timestamps.

### 🧪 Testing & Verification
- [x] **Automated Unit Tests**: 13/13 passing tests in [`backend/tests/allocationAlgorithm.test.js`](backend/tests/allocationAlgorithm.test.js) covering inventory reconciliation, preference fallbacks, group integrity, capacity matching, and waitlisting.
- [x] **Frontend Production Build**: Zero compilation errors with `vite build`.
- [x] **Live Database Integration Verification**: Verified health check and login endpoints against live MySQL.
- [x] **Full Documentation Suite**:
  - Architecture overview (`docs/architecture.md`)
  - Relational database design & 3NF proofs (`docs/database-design.md`)
  - Allocation algorithm pseudocode & proofs (`docs/allocation-algorithm.md`)
  - API endpoint documentation (`docs/api-documentation.md`)
  - Testing guide (`docs/testing-guide.md`)
  - Full frontend/backend test report (`docs/frontend-backend-test-report.md`)
  - DBMS viva preparation questions & answers (`docs/viva-questions.md`)

---

## 🔮 2. What Is Left (Future Enhancements & Phase 2 Roadmap)

The Phase 1 core hostel allocation system is 100% complete. The following features are planned for future phases:

### Phase 2: Hostel Management Module (`/management`)
- [ ] **Room Maintenance & Complaints System**:
  - Student portal ticketing system for electrical, plumbing, furniture, and cleanliness requests.
  - Warden dashboard to assign maintenance staff and track ticket status (`PENDING` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED`).
- [ ] **Hostel Fee & Billing Management**:
  - Tracking room fee payments, mess dues, utility charges, and caution deposits.
  - Receipt generation and fee clearance verification prior to room occupancy.
- [ ] **Mess & Meal Management**:
  - Daily meal menu display, dietary preferences, and monthly mess rebate applications.
- [ ] **Curfew & Gate Pass Management**:
  - Night-out and leave request approvals with warden digital sign-off and SMS guardian notifications.

### Advanced Allocation & Administrative Features
- [ ] **Mutual Room Exchange / Swapping**:
  - Workflow allowing two allocated students/groups of compatible gender and room type to request a mutual room swap with warden approval.
- [ ] **Automated Email / SMS Notifications**:
  - Trigger email alerts via Nodemailer / Twilio when:
    - An application is submitted and locked.
    - Allocation results are officially published.
    - A student joins or leaves a group.
- [ ] **Reporting & Export Capabilities**:
  - Export allocation rosters, vacant room lists, and student allocations to CSV and PDF formats for printing hostel notice boards.
- [ ] **Multi-Batch Historical Analytics**:
  - Comparative analytics comparing demand curves (single vs. double vs. quad) across multiple academic years.
- [ ] **CI/CD Automation**:
  - GitHub Actions workflow running `npm test` and `vite build` automatically on every push or pull request.

---

## 🏁 Summary Table

| Category | Completed (Phase 1) | Planned / Future (Phase 2+) |
| :--- | :--- | :--- |
| **Database** | 14 Tables (3NF), 80 rooms, 200 beds, 100 students, full constraints | Maintenance tickets, fee ledgers, mess billing tables |
| **Backend API** | Auth, Groups, Applications, 5 Preferences, Allocation Engine, Vacancy | Complaints API, Fee payment webhook, Gate pass API |
| **Algorithm** | $\mathcal{O}(N \log N)$ Deterministic Merit Allocation with 5 fallbacks | Mutual swap matching algorithm |
| **Frontend** | Complete Student Portal (4 pages) & Admin Console (5 pages) | Maintenance ticketing UI, Student Fee portal, Mess menu |
| **Security** | Bcrypt hashing, JWT $\ge 32$ chars, RBAC, Parameterized SQL | Two-factor authentication (2FA), OAuth SSO |
| **Testing** | 13/13 Unit tests, live API health, production build check | End-to-end Cypress/Playwright browser automation |
