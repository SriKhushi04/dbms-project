# HostelHub Architecture Documentation

## 1. System Overview
**HostelHub** is a production-grade, merit-based university hostel room allocation platform designed as an academic DBMS system. It provides an automated, deterministic, and transaction-safe allocation workflow for students applying either individually or as collaborative groups.

```mermaid
flowchart TD
    subgraph Frontend["React 18 + Vite + Tailwind CSS"]
        LP[Login Page]
        SP[Student Portal]
        AP[Admin Console]
    end

    subgraph Backend["Express.js (ES Modules)"]
        AUTH[JWT & Auth Middleware]
        VAL[Validation Layer]
        ROUTER[API Routers]
        ALLOC[Allocation Engine Service]
        AUDIT[Audit Service]
    end

    subgraph Database["MySQL 8.x InnoDB"]
        BATCH[Batches Table]
        STU[Students Table]
        ROOM[Rooms Table]
        APP[Applications & Groups]
        PREF[Room Preferences 1..5]
        RUNS[Allocation Runs]
        ALLOCS[Allocations Table]
        AUDITLOG[Audit Logs Table]
    end

    LP --> AUTH
    SP --> ROUTER
    AP --> ROUTER
    ROUTER --> AUTH
    AUTH --> VAL
    VAL --> ALLOC
    ALLOC --> RUNS
    ALLOC --> ALLOCS
    ALLOC --> AUDIT
    AUDIT --> AUDITLOG
```

## 2. Monorepo Structure
- **`backend/`**: Express.js server, ES Modules, `mysql2/promise` connection pooling, JWT security, centralized error handling.
- **`frontend/`**: React 18 SPA with Tailwind CSS, React Router v6, Lucide icons, Axios HTTP client with Bearer token interceptor.
- **`database/`**: Relational DDL schema, migrations, and reproducible deterministic seed generator for 100 students, 80 rooms, and 200 beds.
- **`docs/`**: Academic DBMS architecture, normalization proofs, ER diagram, and viva defense guide.

## 3. Extensibility
The routing table explicitly reserves the mount point `/management` for a future Hostel Management Module (e.g. maintenance ticketing, mess billing, curfew log) without disrupting the Phase 1 allocation system.

