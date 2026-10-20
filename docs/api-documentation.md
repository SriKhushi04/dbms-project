# HostelHub REST API Documentation

All API endpoints return standard JSON responses with HTTP status codes:
```json
{
  "success": true,
  "message": "Human readable confirmation",
  "data": {}
}
```

## 1. Authentication (`/api/auth`)
- **`POST /api/auth/login`**: Authenticates student or admin.
  - Body: `{ "identifier": "24BCE1001" | "admin@hostelhub.edu", "password": "...", "role": "STUDENT" | "ADMIN" }`
  - Response: `{ "token": "JWT...", "user": { ... } }`
- **`GET /api/auth/me`**: Returns current session profile. Requires Bearer Token.

## 2. Student Portal (`/api/students`)
- **`GET /api/students/me`**: Returns student profile, academic branch, and merit rank.
- **`GET /api/students/me/application`**: Returns active batch, group membership, 5 ranked preferences, and published allocation outcome.

## 3. Group Formation (`/api/groups`)
- **`POST /api/groups`**: Creates new group.
  - Body: `{ "target_capacity": 1 | 2 | 4 }`
- **`POST /api/groups/join`**: Joins existing group.
  - Body: `{ "group_code": "GRP-A1B2C3" }`
- **`GET /api/groups/:id`**: Returns group members and calculated leader.

## 4. Room Preferences & Submissions (`/api/applications`)
- **`PUT /api/applications/:id/preferences`**: Saves/reorders exactly 5 distinct, capacity-matching rooms.
  - Body: `{ "room_ids": [101, 102, 103, 104, 105] }`
- **`POST /api/applications/:id/submit`**: Submits application and locks group against further modification.
- **`GET /api/applications/:id/result`**: Returns room allocation result (only accessible after admin publication).

## 5. Room Inventory (`/api/rooms`)
- **`GET /api/rooms`**: Returns room inventory. Query parameters: `?block_id=1&capacity=2&room_type=DOUBLE`.
- **`GET /api/rooms/blocks`**: Returns the 3 hostel blocks with total rooms and beds.

## 6. Administration Console (`/api/admin`)
Requires role `ADMIN`.
- **`GET /api/admin/dashboard`**: Aggregated live metrics from MySQL.
- **`GET /api/admin/students`**: 100 students directory with merit ranks and allocation status.
- **`GET /api/admin/applications`**: Submitted applications roster.
- **`POST /api/admin/batches/:id/close`**: Closes submissions for the batch.
- **`POST /api/admin/batches/:id/allocate`**: Executes merit allocation engine transaction.
- **`GET /api/admin/batches/:id/allocation-results`**: Returns latest allocation run summary, allocations table, and waitlisted applications.
- **`POST /api/admin/batches/:id/publish`**: Publishes results to students.
- **`POST /api/admin/batches/:id/mark-vacated`**: Frees rooms for subsequent batch while preserving audit history.
- **`GET /api/admin/audit-logs`**: Immutable audit log entries.

