# HostelHub — University Hostel Room Allocation System

A streamlined, minimal full-stack university hostel room allocation web application built with **React**, **Node.js/Express**, and **MySQL 8.x**.

---

## 🚀 Two Core Screens

1. **Screen A: Student Login (`/login`)**
   - Single input: **Student Registration Number** (e.g. `24BCE1001`, `24BCE1002`).
   - Validated directly against MySQL university records.

2. **Screen B: Student Dashboard (`/dashboard`)**
   - **Case 1 (Allocated)**:
     - Prominent green box:
       ```
       You have been allocated ROOM NO - {room_number}
       ```
     - Form is completely hidden.
   - **Case 2 (Not Allocated)**:
     - **Hostel Block Dropdown**: `Block A`, `Block B`, `Block C` (fetched from MySQL).
     - **Room Capacity Dropdown**: `1 Bed`, `2 Beds`, `4 Beds`.
     - **Roommate Registration Numbers**:
       - `1 Bed`: 0 roommates required (Single occupancy).
       - `2 Beds`: 1 roommate registration number field.
       - `4 Beds`: 3 roommate registration number fields (Student is occupant #1).
       - Validates that roommates exist in MySQL, are eligible, distinct, and exclude the logged-in student.
     - **Five Room Preferences (Preference 1 to 5)**:
       - Dropdowns dynamically populated with rooms matching selected Block and Capacity from MySQL.
       - Mutual exclusion: Selecting a room in one dropdown automatically filters it out from the other 4 dropdowns.
     - **Submit Preferences**:
       - Saves preferences and roommates transactionally to MySQL.
       - Displays a clear confirmation and persists across page refreshes.

---

## 🛠️ Quick Local Setup

### 1. Configure Environment
In `backend/.env`:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=hostelhub_db
```

### 2. Initialize Database & Seed
```powershell
cd backend
npm run init-db
```
This sets up:
- **3 Hostel Blocks**: `Block A`, `Block B`, `Block C`
- **80 Physical Rooms**: 20 single (1 bed), 30 double (2 beds), 30 quadruple (4 beds) = **200 Beds**
- **100 Students**: `24BCE1001` through `24BCE1100`
- **Pre-allocated demo**: `24BCE1001` allocated to Room `S-101` in `Block A` (tests Case 1 green box)

### 3. Run Automated Tests
```powershell
cd backend
npm test
```

### 4. Start the Application
- **Backend API Server**:
  ```powershell
  cd backend
  npm start
  ```
  Runs on `http://localhost:5000`

- **Frontend Development Server**:
  ```powershell
  cd frontend
  npm run dev
  ```
  Runs on `http://localhost:5173`

---

## 🧪 Quick Test Demo Credentials

- **Student `24BCE1001`**: Demonstrates **Case 1** (Allocated $\rightarrow$ Prominent Green Box `"You have been allocated ROOM NO - S-101"`).
- **Student `24BCE1002`**: Demonstrates **Case 2** (Not Allocated $\rightarrow$ Block, Bedded, Roommate, and 5-Preference Form).
