# HostelHub — University Hostel Room Allocation & Management System

HostelHub is a full-stack university hostel management platform designed for higher education institutions. The system combines an automated, merit-based room allocation engine with a comprehensive hostel operations suite covering maintenance ticketing, student billing, mess menu scheduling and rebates, and curfew/gate-pass administration.

Built with **React 18**, **Node.js / Express**, and **MySQL 8.x (InnoDB)**.

---

## 🚀 Features

### 1. Merit-Based Room Allocation System (Phase 1)
Designed to provide a transparent, deterministic allocation process based on student academic merit ranks:

- **Student Login Screen (`/allocation/login` or `/login`)**:
  - Single input: **Student Registration Number** (e.g., `24BCE1001`, `24BCE1002`).
  - Validated directly against university student records in MySQL.
- **Student Dashboard (`/allocation/dashboard` or `/dashboard`)**:
  - **Case 1 (Allocated)**:
    - Displays a prominent green confirmation banner:
      ```text
      You have been allocated ROOM NO - {room_number}
      ```
    - The preference submission form is completely hidden.
  - **Case 2 (Not Allocated)**:
    - **Hostel Block Dropdown**: `Block A` (Boys), `Block B` (Girls), `Block C` (Coed) fetched dynamically from MySQL.
    - **Room Capacity Dropdown**: `1 Bed` (Single), `2 Beds` (Double), `4 Beds` (Quadruple).
    - **Roommate Registration Numbers**:
      - `1 Bed`: 0 roommates required (Single occupancy).
      - `2 Beds`: 1 roommate registration number field.
      - `4 Beds`: 3 roommate registration number fields (the applicant is occupant #1).
      - Server and UI validate that roommates exist in MySQL, are eligible, distinct, and exclude the logged-in student.
    - **Five Room Preferences (Preferences 1 to 5)**:
      - Dropdowns dynamically populated with rooms matching selected Block and Capacity.
      - Mutual exclusion: Selecting a room in one dropdown automatically filters it out from the other four.
    - **Preference Submission**:
      - Saves preferences and roommate group atomically to MySQL.
      - Persists across page refreshes.
- **Administrator Allocation Console (`/allocation/admin` or `/admin`)**:
  - Real-time room inventory and allocation status monitoring.
  - One-click trigger for merit-based allocation algorithm execution.

---

### 2. Hostel Management Operations Suite (Phase 2 — `/management`)
A modular portal providing day-to-day administrative and student services across four functional domains:

#### A. Maintenance & Complaints
- **Student Ticketing**: Students log complaints across categories (`ELECTRICAL`, `PLUMBING`, `FURNITURE`, `CLEANLINESS`, `INTERNET`, `OTHER`) with priority levels (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
- **Automated Room Mapping**: Automatically links the student's allocated room and hostel block to the ticket.
- **Warden Workflow**: Wardens can filter tickets by status and category, assign maintenance staff or technicians, and advance tickets through a strict state machine (`PENDING` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `RESOLVED` / `REJECTED`).
- **Resolution Tracking**: Mandatory resolution notes required when marking tickets as resolved.

#### B. Fees & Billing Management
- **Tiered Fee Invoicing**: Generates semester fee invoices based on allocated room capacity tier:
  - Single Bed: ₹45,000 / term
  - Double Bed: ₹30,000 / term
  - Quadruple Bed: ₹20,000 / term
  - Plus fixed mess dues (₹18,000), caution deposit (₹5,000), and utility fee (₹3,000).
- **Payment Processing**: Students make partial or full payments with balance recalculation and automated receipt reference generation (`PAY-XXXXXX-XXXX`).
- **Accountant Directory**: Complete ledger view for hostel finance staff to monitor payment statuses (`PAID`, `PARTIAL`, `UNPAID`, `OVERDUE`).
- *(See [Payment Gateway Disclaimer](#-payment-gateway-disclaimer) below).*

#### C. Mess & Meal Management
- **Weekly Schedule**: 7-day meal schedule display (Monday through Sunday) covering Breakfast, Lunch, Evening Snacks, Dinner, and Chef's Specials.
- **Dietary Preferences**: Students can record and update their meal preferences (`VEGETARIAN`, `NON_VEGETARIAN`, `JAIN`).
- **Mess Rebates (Leave Credit)**: Students can request mess fee rebates for planned leaves.
  - Enforces a minimum leave duration of 3 consecutive days.
  - Automatically calculates rebate credits at ₹150.00/day.
  - Requires Warden / Mess Supervisor approval before credit application.

#### D. Curfew & Gate-Pass Management
- **Digital Pass Requests**:
  - **Day Pass**: Intraday campus exit with strict curfew enforcement (must return by 10:00 PM).
  - **Night Out Pass**: Multi-day leave requiring destination address, emergency parent contact number, departure date/time, and return date/time.
- **Warden Digital Sign-Off**: Wardens review pending requests and approve or reject with recorded decision notes.
- **Security Guard Gate Terminal**: Security guards look up approved passes, log exact check-out and check-in timestamps, and monitor automated overdue flags for students returning past curfew.

---

## 💻 Technology Stack

- **Frontend**:
  - **Framework**: React 18.3 (`react`, `react-dom`)
  - **Routing**: React Router DOM 6.28
  - **Build Tool**: Vite 6.0 / 6.4
  - **Styling**: Tailwind CSS 3.4, PostCSS, Autoprefixer
  - **Icons**: Lucide React (`lucide-react`)
  - **HTTP Client**: Axios 1.7
- **Backend**:
  - **Runtime**: Node.js (ES modules, `type: "module"`)
  - **Web Framework**: Express 4.21
  - **Database Driver**: MySQL2 with Promise API (`mysql2/promise` 3.12)
  - **Security & Authentication**:
    - Bcrypt.js 2.4 (password hashing with salt rounds = 10)
    - JSON Web Token 9.0 (`jsonwebtoken`)
  - **Environment Configuration**: Dotenv 16.4
  - **CORS Handling**: Cors 2.8
  - **Test Runner**: Node.js built-in test runner (`node:test`, `node:assert`)
- **Database**:
  - **Engine**: MySQL 8.x InnoDB (ACID compliant, parameterized queries, relational foreign key constraints)

---

## 📋 Prerequisites

Before setting up HostelHub, verify that your environment has:
- **Node.js**: `v18.0.0` or higher (verified on Node.js `v22.x` and `v24.x`).
- **npm**: `v9.0.0` or higher.
- **MySQL Server**: `8.0.x` or higher running with the InnoDB storage engine.
- **Operating System**: Windows, macOS, or Linux.

---

## 📦 Installation and Setup

Clone the repository and install dependencies in both the `backend` and `frontend` directories:

### 1. Install Backend Dependencies
```powershell
# From the repository root:
cd backend
npm install
```
*(Or from the repository root: `npm install --prefix backend`)*

### 2. Install Frontend Dependencies
```powershell
# From the repository root:
cd frontend
npm install
```
*(Or from the repository root: `npm install --prefix frontend`)*

---

## ⚙️ Environment Configuration

Backend settings are configured using environment variables in `backend/.env`. A template is provided in `backend/.env.example`.

Create `backend/.env` by copying the example template:
```powershell
# On Windows PowerShell:
Copy-Item backend/.env.example backend/.env

# On Linux/macOS:
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your local settings:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | HTTP port for the Express backend API server | `5000` |
| `DB_HOST` | MySQL database hostname or IP address | `localhost` |
| `DB_PORT` | MySQL database port | `3306` |
| `DB_USER` | MySQL database user | `root` |
| `DB_PASSWORD` | MySQL password for the database user | *(Your local password)* |
| `DB_NAME` | Name of the HostelHub database | `hostelhub_db` |
| `JWT_SECRET` | Secret key for signing JSON Web Tokens (**minimum 32 characters**) | *(A long, cryptographically random string)* |
| `JWT_EXPIRES_IN` | JWT token validity duration | `8h` or `7d` |
| `NODE_ENV` | Application environment (`development` or `production`) | `development` |
| `INITIAL_STAFF_SETUP_KEY` | *(Optional)* Secret token required when claiming the first staff account on public/untrusted networks | *(Random secret token)* |

> [!CAUTION]
> Never commit `backend/.env` to source control. Never publish real passwords, production database credentials, or production JWT secrets in public repositories.

---

## 🗄️ Database Setup & Safe Migration

### ⚠️ IMPORTANT WARNING: Preserving Existing Allocation Data
> [!WARNING]
> If your database already contains Phase 1 room allocation data, **DO NOT run `npm run init-db` or `npm run reset-db`**. Those scripts will drop, truncate, or reseed tables and will erase existing student records, preferences, and allocations.
> 
> To add the Management modules to an existing database, follow the **Safe Additive Migration Procedure** below.

---

### A. New / Cold Database Setup (Phase 1 Only)
If you are setting up the project from scratch on an entirely empty MySQL instance:
```powershell
cd backend
npm run init-db
```
This initializes the 7 core allocation tables and populates:
- **3 Hostel Blocks**: Block A (Boys), Block B (Girls), Block C (Coed)
- **80 Physical Rooms**: 20 single, 30 double, 30 quad = **200 Beds**
- **100 Fictional Students**: `24BCE1001` through `24BCE1100` with merit ranks 1–100

---

### B. Safe Additive Migration Procedure (Adding Management to an Existing Database)
To add the Management modules without resetting, truncating, or reseeding your existing allocation database:

#### Step 1: Ensure MySQL is Running
Verify that MySQL is running on `localhost:3306`:
```powershell
# On Windows:
Start-Service MySQL80

# Verify connectivity:
Test-NetConnection -ComputerName localhost -Port 3306
```

#### Step 2: Take a Pre-Migration Backup
Before running any database migration, create a full backup of the existing database:
```powershell
mysqldump -h localhost -P 3306 -u root -p hostelhub_db > hostelhub_db_backup_pre_management.sql
```

#### Step 3: Apply the Additive Migration
Run the non-destructive migration script [`database/migrations/001_management_schema.sql`](database/migrations/001_management_schema.sql):
```powershell
mysql -h localhost -P 3306 -u root -p hostelhub_db < database/migrations/001_management_schema.sql
```

#### Step 4: Verify Migration Output
Confirm that the 9 new management tables were created and that existing allocation rows remain intact:
```sql
USE hostelhub_db;

-- 1. Check all 16 tables exist:
SHOW TABLES;

-- 2. Verify Phase 1 records remain untouched:
SELECT COUNT(*) FROM students;    -- Should equal 100
SELECT COUNT(*) FROM rooms;       -- Should equal 80
SELECT COUNT(*) FROM allocations; -- Pre-existing allocations preserved
```

---

## 👤 Initial Staff Setup

To access the staff side of the Management portal (`WARDEN`, `ACCOUNTANT`, `MESS_SUPERVISOR`, `SECURITY_GUARD`), create a staff account using one of two supported methods:

### Method 1: Server-Side CLI Script (Recommended)
Administrators with server shell access can provision staff accounts directly:
```powershell
# From the repository root:
node backend/src/scripts/createStaff.js <username> <password> <role> "<Full Name>"
```
*Valid roles: `WARDEN`, `ACCOUNTANT`, `MESS_SUPERVISOR`, `SECURITY_GUARD`.*

**Example:**
```powershell
node backend/src/scripts/createStaff.js warden_john MySecurePassword123 WARDEN "John Doe"
```

### Method 2: In-App First-Time Setup Endpoint
On a fresh installation where zero staff accounts exist in `management_staff`, the portal permits claiming the first staff account via `POST /api/management/auth/setup-first-staff`:
- This endpoint is permanently disabled once any staff account exists (`COUNT(*) > 0`).
- If `INITIAL_STAFF_SETUP_KEY` is configured in `backend/.env`, the setup request must include the header `x-setup-key: <your_setup_key>` or include `setup_key` in the request body to prevent unauthorized account claims on public networks.

---

## 🏃 Running the Application

### 1. Start the Backend API Server
```powershell
# From the backend directory:
cd backend
npm start
```
*(Or with live reload for development: `npm run dev`)*
The API server starts on **`http://localhost:5000`**.

### 2. Start the Frontend Development Server
```powershell
# From the frontend directory:
cd frontend
npm run dev
```
The frontend application starts on **`http://localhost:5173`**.

### 3. Application Navigation Routes
- **Root Landing Page**: `http://localhost:5173/` (Choose between Room Allocation or Hostel Management)
- **Room Allocation Portal**:
  - Student Login: `http://localhost:5173/allocation/login` (legacy redirect: `/login`)
  - Student Dashboard: `http://localhost:5173/allocation/dashboard` (legacy redirect: `/dashboard`)
  - Admin Allocation Console: `http://localhost:5173/allocation/admin` (legacy redirect: `/admin`)
- **Hostel Management Portal**:
  - `http://localhost:5173/management`

---

## 🧪 Testing and Verification

### 1. Run Automated Backend Tests
Run the comprehensive Node.js test suite across all allocation and management modules:
```powershell
npm test --prefix backend
```
Expected output: **46 passing tests** across 5 test suites:
1. `allocationEngine.test.js`: 10 tests verifying room allocation engine invariants, rank tie-breaking, and capacity checks.
2. `roommateValidation.test.js`: 8 tests verifying roommate uniqueness, self-inclusion rules, and concurrency guards.
3. `studentWorkflow.test.js`: 6 tests verifying UI state branching, seed counts, and preference mutual exclusion.
4. `managementValidation.test.js`: 8 tests verifying Bcrypt password hashing, JWT verification, RBAC rules, input boundaries, and state machines.
5. `managementIntegration.test.js`: 9 tests (+ 5 subtests) verifying API dispatch, ownership guards, role permissions, and allocation immutability.

### 2. Build Frontend for Production
Verify that the frontend bundles cleanly without compilation errors:
```powershell
npm run build --prefix frontend
```
Expected output: Production bundle built successfully into `frontend/dist/` in ~6–8 seconds with zero warnings or errors.

---

## ⚠️ Known Limitations & Testing Scope

- **Testing Distinctions**:
  - The **46 automated backend tests** and **frontend production build** passed cleanly in latest verification.
  - Integration tests in `managementIntegration.test.js` utilize an **in-memory transactional mock pool** to test Express routing, middleware, and parameterized SQL queries without requiring an active database server.
  - **Live MySQL database queries and browser end-to-end automation remain pending** because MySQL was unavailable on `localhost:3306` during verification. Running the server against live MySQL and manual browser verification across all 4 management tabs should be performed once MySQL is started.

---

## 💳 Payment Gateway Disclaimer

> [!NOTE]
> Fee payment processing in the Fees & Billing module is **simulated in-app**. When a student submits a payment, the application generates a local transactional payment reference (`PAY-XXXXXX-XXXX`), validates against outstanding dues, and updates the database invoice balance inside an atomic SQL transaction.
> 
> The current implementation does **not** connect to live external third-party payment gateways (such as Razorpay, Stripe, or bank APIs). Real gateway integration remains planned for future production deployment.

---

## 🔑 Demo & Test Credentials

### Room Allocation Demo Accounts
- **Allocated Student (`24BCE1001`)**:
  - Demonstrates **Case 1** (Allocated $\rightarrow$ Prominent Green Box `"You have been allocated ROOM NO - S-101"`).
- **Unallocated Student (`24BCE1002`)**:
  - Demonstrates **Case 2** (Not Allocated $\rightarrow$ Block, Bed Capacity, Roommate, and 5-Preference Form).

### Management Portal Student Access
- Students log in using their Registration Number (`24BCE1001` through `24BCE1100`).
- First-time student management users click **"Register Password"** in the Management login modal to create their password. Passwords are salted and hashed using Bcrypt.
