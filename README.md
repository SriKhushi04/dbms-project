# HostelHub — University Merit-Based Hostel Allocation System

A complete academic DBMS full-stack web application for merit-based university hostel room allocation.

Built with **React 18 + Vite + Tailwind CSS**, **Node.js + Express (ES Modules)**, and **MySQL 8.x (InnoDB)**.

---

## 1. Key Invariants & Inventory Reconciliation
- **Exact Inventory**:
  - **20 Single Rooms** (Capacity 1) = **20 Beds**
  - **30 Double Rooms** (Capacity 2) = **60 Beds**
  - **30 Quadruple Rooms** (Capacity 4) = **120 Beds**
  - **Reconciliation Total**: $20 + 30 + 30 = \mathbf{80\text{ rooms}}$, $20 + 60 + 120 = \mathbf{200\text{ beds}}$ distributed across **Block A, Block B, and Block C**.
- **Student Population**: Exactly **100 fictional students** with strictly unique merit ranks $1$ through $100$ (Rank 1 highest).
- **Group Rules**: Size 1 (Single Room), Size 2 (Double Room), Size 4 (Quad Room). Group leader is automatically computed from the member with $MIN(\text{merit\_rank})$.
- **Five Ranked Preferences**: Exactly 5 distinct, capacity-matching room preferences required per application.
- **Admin-Triggered Allocation**: Deterministic merit-based allocation runs inside an ACID database transaction.
- **Batch Lifecycle**: $\text{OPEN} \rightarrow \text{CLOSED} \rightarrow \text{ALLOCATED} \rightarrow \text{PUBLISHED} \rightarrow \text{ARCHIVED}$. Students only see results when PUBLISHED.
- **Controlled Vacancy**: Marks rooms reusable for subsequent batches while preserving historical audit records.

---

## 2. Seed Demo Credentials

| Role | Username / Identifier | Password | Description |
|---|---|---|---|
| **Chief Admin** | `admin@hostelhub.edu` | `Admin@123` | Full administrative control, allocation trigger & publication |
| **Resident Warden** | `warden@hostelhub.edu` | `Warden@123` | Warden administrative account |
| **Top Merit Student** | `24BCE1001` | `Student@123` | Merit Rank #1 (Demonstrates 1st preference win) |
| **Contested Student** | `24BCE1004` | `Student@123` | Merit Rank #4 (Demonstrates 2nd preference fallback) |
| **Waitlist Demo Student** | `24BCE1099` | `Student@123` | Merit Rank #99 (Demonstrates waitlist when all 5 choices are taken) |
| **Any Other Student** | `24BCE1001` - `24BCE1100` | `Student@123` | All 100 students share password `Student@123` |

---

## 3. Project File Tree
```
HostelHub/
├── backend/
│   ├── src/
│   │   ├── config/db.js             # MySQL2 promise connection pool
│   │   ├── middleware/auth.js       # JWT auth & role authorization
│   │   ├── middleware/errorHandler.js
│   │   ├── services/allocationService.js # Pure algorithm + transaction runner
│   │   ├── services/auditService.js # Immutable audit logging
│   │   ├── controllers/             # Auth, Student, Group, App, Room, Admin
│   │   ├── routes/                  # Express route modules
│   │   └── server.js                # Express app entry point
│   ├── tests/
│   │   └── allocationAlgorithm.test.js # Node.js test runner unit tests (all 20 scenarios)
│   ├── .env.example
│   └── package.json
├── database/
│   ├── schema.sql                   # Normalized 3NF DDL schema
│   ├── seeds/seedData.js            # Deterministic generator (100 students, 80 rooms, 200 beds)
│   └── initDb.js                    # Database setup & seed runner
├── frontend/
│   ├── src/
│   │   ├── components/Navbar.jsx
│   │   ├── context/AuthContext.jsx  # User auth context
│   │   ├── layouts/                 # StudentLayout & AdminLayout
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── student/             # Dashboard, Group, Preferences, Results
│   │   │   └── admin/               # Dashboard, Rooms, Applications, Engine, Audit
│   │   ├── services/api.js          # Axios client with JWT interceptor
│   │   ├── App.jsx                  # React Router routes
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── docs/
│   ├── architecture.md
│   ├── database-design.md           # ER Diagram & normalization
│   ├── allocation-algorithm.md      # Algorithm pseudocode & proof
│   ├── api-documentation.md         # Full REST API contracts
│   ├── testing-guide.md             # Automated test matrix
│   └── viva-questions.md            # Academic DBMS viva defense questions
├── .gitignore
└── README.md
```

---

## 4. Setup & Running Instructions

### Step 1: Configure Environment Variables
Open `backend/.env` (or copy from `backend/.env.example`) and verify your local MySQL credentials:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=hostelhub_db
JWT_SECRET=super_secret_hostelhub_jwt_key_2026_academic_project
```

### Step 2: Install Dependencies
```bash
# In backend directory
cd backend
npm install

# In frontend directory
cd ../frontend
npm install
```

### Step 3: Initialize & Seed MySQL Database
```bash
cd backend
npm run init-db
```
This executes `database/schema.sql` and `database/initDb.js`, creating the normalized tables and seeding the exact inventory: 100 students (ranks 1–100), 80 rooms (20 single, 30 double, 30 quad), and 200 beds.

### Step 4: Run Automated Tests
```bash
cd backend
npm test
```
Executes the in-memory allocation test suite verifying all 20 scenarios, preference fallbacks, group integrity, and inventory reconciliations.

### Step 5: Start the Application
- **Start Backend** (Port 5000):
  ```bash
  cd backend
  npm start
  ```
- **Start Frontend** (Port 5173):
  ```bash
  cd frontend
  npm run dev
  ```
- Open **`http://localhost:5173`** in your browser.
