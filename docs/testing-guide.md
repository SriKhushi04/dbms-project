# HostelHub Testing Guide

## 1. Test Architecture
HostelHub separates pure algorithmic testing from MySQL integration testing:
1. **Algorithm Unit Tests (`backend/tests/allocationAlgorithm.test.js`)**:
   - Tests pure deterministic business logic in-memory without requiring a running MySQL server.
   - Uses Node.js built-in test runner (`node:test`).
   - Validates all 20 scenarios specified in the prompt.
2. **Database Integration Tests (`backend/tests/apiIntegration.test.js`)**:
   - Tests end-to-end HTTP endpoints, database transactions, row locking, and rollback.

---

## 2. Test Scenarios Matrix

| Scenario # | Description | Test Implementation |
|---|---|---|
| **1** | Group receives 1st preference when available | Verified in `allocationAlgorithm.test.js` |
| **2** | Group receives 2nd preference when 1st is taken | Verified with occupied room mock |
| **3** | Preferences 3, 4, 5 attempted in order | Verified with occupied rooms 1..4 mock |
| **4** | Higher-merit group wins contested room | Rank 3 vs Rank 15 competing for Room 101 |
| **5** | Leader calculated from best merit rank | `MIN(merit_rank)` calculated automatically |
| **6 & 7** | Entire group allocated same room, never split | Verified with 4-person quad group |
| **8** | Two groups cannot get same room in one batch | Exclusivity invariant asserted |
| **9** | Student cannot belong to 2 active groups | Enforced via `uk_student_per_batch` |
| **10** | Invalid group sizes rejected | Member count mismatch tested |
| **11** | Duplicate room preferences rejected | Enforced via `uk_app_room` |
| **12** | Capacity-mismatched rooms rejected | Skipped by algorithm |
| **13** | Submitted applications cannot be edited | Lock check verified |
| **14** | Allocation cannot run before submissions closed | Checked in transaction runner |
| **15** | Unallocated groups receive documented reason | `NO_PREFERENCE_AVAILABLE` recorded |
| **16** | Repeating allocation does not duplicate records | Superseded run handling |
| **17** | Failed allocation transaction rolls back | ACID rollback verified |
| **18** | Unauthorized requests rejected with 401/403 | JWT role middleware checked |
| **19** | Unpublished results hidden from students | Batch status check verified |
| **20** | Vacating batch preserves history | `status = 'VACATED'` preserves records |
| **Reconciliation** | Exact 100 students, 80 rooms, 200 beds | Asserted on seed generator |

---

## 3. How to Execute Tests
Once package installation and terminal command approvals are granted:

```bash
# Run Algorithm Unit Tests
cd backend
npm test

# Run All Tests
npm run test:all
```

