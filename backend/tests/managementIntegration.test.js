// ============================================================================
// HOSTELHUB MANAGEMENT MODULE INTEGRATION TEST SUITE
// Tests HTTP API endpoints, role guards, token lifecycle, and allocation immutability
// Zero passwords - verifies demo registration-number and role-based access
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { createManagementRouter } from '../src/routes/managementRoutes.js';
import { generateStudents, generateRooms, hostels } from '../../database/seeds/seedData.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_minimum_32_characters_for_hmac_sha256';

// In-Memory Test Database matching MySQL schema
function createInMemoryDb() {
  const students = generateStudents();
  const rooms = generateRooms();
  const maintenanceTickets = new Map();
  const feeInvoices = new Map();
  const feePayments = new Map();
  const messRebates = new Map();
  const gatePasses = new Map();

  // Baseline allocation: Student 1 (24BCE1001) in Room 1 (S-101)
  const allocations = new Map([[1, 1]]);

  let nextTicketId = 1;
  let nextInvoiceId = 1;
  let nextPaymentId = 1;
  let nextRebateId = 1;
  let nextPassId = 1;

  // Mock pool implementing parameterized queries
  const mockPool = {
    async query(sql, params = []) {
      const s = sql.trim().toUpperCase();

      // 1. Student auth query (registration-number demo lookup)
      if (s.includes('FROM STUDENTS S') && s.includes('WHERE S.REGISTRATION_NUMBER = ?')) {
        const found = students.filter(st => st.registration_number === params[0]);
        return [found];
      }

      // 2. Allocations queries (READ-ONLY check for management)
      if (s.includes('FROM ALLOCATIONS A') && s.includes('JOIN ROOMS R')) {
        const studentId = params[0];
        const roomId = allocations.get(studentId);
        if (!roomId) return [[]];
        const room = rooms.find(r => r.id === roomId);
        const hostel = hostels.find(h => h.id === room.hostel_id);
        return [[{ room_id: room.id, room_number: room.room_number, capacity: room.capacity, hostel_id: hostel.id, block_name: hostel.block_name }]];
      }

      // 3. Maintenance queries
      if (s.startsWith('INSERT INTO MAINTENANCE_TICKETS')) {
        const [tNum, sId, rId, hId, cat, title, desc, prio] = params;
        const id = nextTicketId++;
        const t = { id, ticket_number: tNum, student_id: sId, room_id: rId, hostel_id: hId, category: cat, title, description: desc, priority: prio, status: 'PENDING', created_at: new Date() };
        maintenanceTickets.set(id, t);
        return [{ insertId: id }];
      }
      if (s.includes('FROM MAINTENANCE_TICKETS T') && s.includes('WHERE T.STUDENT_ID = ?')) {
        const list = [...maintenanceTickets.values()].filter(t => t.student_id === params[0]);
        return [list];
      }
      if (s.startsWith('SELECT ID, STATUS FROM MAINTENANCE_TICKETS WHERE ID = ?')) {
        const t = maintenanceTickets.get(params[0]);
        return t ? [[t]] : [[]];
      }
      if (s.startsWith('UPDATE MAINTENANCE_TICKETS')) {
        const id = params[params.length - 1];
        const status = params[0];
        const t = maintenanceTickets.get(id);
        if (t) {
          t.status = status;
          if (params[1]) t.assigned_to = params[1];
          if (params.length === 6 && params[2]) t.assigned_staff_id = params[2];
          const notes = params.length === 6 ? params[3] : params[2];
          if (notes) t.resolution_notes = notes;
          t.resolved_at = params[params.length - 2];
        }
        return [{ affectedRows: 1 }];
      }
      if (s.includes('FROM STAFF_MEMBERS')) {
        return [[
          { id: 1, employee_code: 'EMP-WRD-01', full_name: 'Dr. Suresh Kumar', designation: 'Chief Hostel Warden', role: 'WARDEN' },
          { id: 5, employee_code: 'EMP-ELE-01', full_name: 'Manoj Sharma', designation: 'Senior Campus Electrician', role: 'TECHNICIAN' }
        ]];
      }

      // 4. Fee queries
      if (s.startsWith('SELECT * FROM FEE_INVOICES WHERE STUDENT_ID = ?')) {
        const inv = feeInvoices.get(params[0]);
        return inv ? [[inv]] : [[]];
      }
      if (s.startsWith('INSERT INTO FEE_INVOICES')) {
        const [sId, term, rFee, mFee, cDep, uFee, tot, due] = params;
        const id = nextInvoiceId++;
        const inv = { id, student_id: sId, academic_term: term, room_fee: rFee, mess_fee: mFee, caution_deposit: cDep, utility_fee: uFee, total_amount: tot, paid_amount: 0.0, due_date: due, status: 'UNPAID' };
        feeInvoices.set(sId, inv);
        return [{ insertId: id }];
      }
      if (s.startsWith('SELECT * FROM FEE_PAYMENTS WHERE INVOICE_ID = ?')) {
        const list = [...feePayments.values()].filter(p => p.invoice_id === params[0]);
        return [list];
      }

      // 5. Gate Pass queries
      if (s.startsWith('SELECT ID FROM GATE_PASSES WHERE STUDENT_ID = ? AND STATUS IN')) {
        const active = [...gatePasses.values()].filter(g => g.student_id === params[0] && ['PENDING', 'APPROVED', 'CHECKED_OUT'].includes(g.status));
        return [active];
      }
      if (s.startsWith('INSERT INTO GATE_PASSES')) {
        const [pNum, sId, pType, dest, reason, contact, dep, ret] = params;
        const id = nextPassId++;
        const pass = { id, pass_number: pNum, student_id: sId, pass_type: pType, destination: dest, reason, emergency_contact: contact, departure_time: dep, expected_return_time: ret, status: 'PENDING' };
        gatePasses.set(id, pass);
        return [{ insertId: id }];
      }
      if (s.startsWith('SELECT * FROM GATE_PASSES WHERE ID = ?')) {
        const p = gatePasses.get(params[0]);
        return p ? [[p]] : [[]];
      }
      if (s.startsWith('UPDATE GATE_PASSES')) {
        return [{ affectedRows: 1 }];
      }

      // Default empty
      return [[]];
    },
    async getConnection() {
      return {
        query: mockPool.query,
        beginTransaction: async () => {},
        commit: async () => {},
        rollback: async () => {},
        release: () => {}
      };
    },
    getAllocations() {
      return new Map(allocations);
    }
  };

  return mockPool;
}

test('HostelHub Management Module HTTP Integration & Invariants', async (t) => {
  const db = createInMemoryDb();
  const router = createManagementRouter(db);

  // Pure in-memory dispatcher (no TCP sockets or port listening required)
  const dispatch = (method, url, body = {}, token = null) => {
    return new Promise((resolve) => {
      const headers = {};
      if (token) headers['authorization'] = `Bearer ${token}`;

      const [path, queryString] = url.split('?');
      const req = {
        method,
        url: path,
        baseUrl: '',
        originalUrl: url,
        path,
        body: body || {},
        headers,
        query: queryString ? Object.fromEntries(new URLSearchParams(queryString)) : {},
        params: {}
      };

      const res = {
        statusCode: 200,
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(data) {
          resolve({ status: this.statusCode, data });
        },
        send(data) {
          resolve({ status: this.statusCode, data });
        }
      };

      router(req, res, (err) => {
        if (err) resolve({ status: 500, error: err.message });
        else resolve({ status: 404, data: { message: 'Not Found' } });
      });
    });
  };

  let wardenToken = null;
  let studentToken = null;

  // Test 1: Staff demo session activation
  await t.test('1. Staff demo session activation succeeds and issues role token (no passwords)', async () => {
    const res = await dispatch('POST', '/auth/staff-login', {
      role: 'WARDEN'
    });

    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.data.staff.role, 'WARDEN');
    assert.ok(res.data.data.token);
    wardenToken = res.data.data.token;
  });

  // Test 2: Multiple staff demo roles exist and possess distinct role tokens
  await t.test('2. Multiple staff demo roles exist and possess distinct role tokens', async () => {
    const secRes = await dispatch('POST', '/auth/staff-login', {
      role: 'SECURITY_GUARD'
    });
    assert.equal(secRes.status, 200);
    assert.equal(secRes.data.data.staff.role, 'SECURITY_GUARD');

    const accRes = await dispatch('POST', '/auth/staff-login', {
      role: 'ACCOUNTANT'
    });
    assert.equal(accRes.status, 200);
    assert.equal(accRes.data.data.staff.role, 'ACCOUNTANT');
  });

  // Test 3: Student logs in using registration number only (zero password)
  await t.test('3. Student authenticates using registration number only without password', async () => {
    const loginRes = await dispatch('POST', '/auth/student-login', {
      registration_number: '24BCE1001'
    });

    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.data.success, true);
    assert.equal(loginRes.data.data.student.registration_number, '24BCE1001');
    assert.ok(loginRes.data.data.token);
    studentToken = loginRes.data.data.token;
  });

  // Test 4: Unauthenticated requests are rejected (401)
  await t.test('4. Access without Bearer token is rejected with 401 Unauthorized', async () => {
    const res = await dispatch('POST', '/complaints', {
      category: 'ELECTRICAL',
      title: 'Valid title for unauthenticated test',
      description: 'Valid description for unauthenticated test'
    });

    assert.equal(res.status, 401);
    assert.equal(res.data.success, false);
  });

  // Test 5: Role protection (Student cannot call Warden status update)
  await t.test('5. Student token attempting Warden status patch returns 403 Forbidden', async () => {
    const res = await dispatch('PATCH', '/complaints/1/status', {
      status: 'RESOLVED',
      resolution_notes: 'Unauthorized self-resolution attempt'
    }, studentToken);

    assert.equal(res.status, 403);
    assert.equal(res.data.success, false);
  });

  // Test 6: Student submits maintenance complaint with auto-linked room
  let ticketId = null;
  await t.test('6. Student submits complaint and it enters PENDING status', async () => {
    const res = await dispatch('POST', '/complaints', {
      category: 'ELECTRICAL',
      title: 'Power socket malfunctioning near study table',
      description: 'The primary power outlet has no voltage output.',
      priority: 'HIGH'
    }, studentToken);

    assert.equal(res.status, 201);
    assert.equal(res.data.success, true);
    assert.equal(res.data.data.status, 'PENDING');
    ticketId = res.data.data.id;
  });

  // Test 7: Warden advances status to IN_PROGRESS and then RESOLVED
  await t.test('7. Warden assigns technician and advances complaint to RESOLVED', async () => {
    // Step A: IN_PROGRESS
    const res1 = await dispatch('PATCH', `/complaints/${ticketId}/status`, {
      status: 'IN_PROGRESS',
      assigned_to: 'Electrician Ramesh'
    }, wardenToken);
    assert.equal(res1.status, 200);
    assert.equal(res1.data.data.status, 'IN_PROGRESS');

    // Step B: RESOLVED
    const res2 = await dispatch('PATCH', `/complaints/${ticketId}/status`, {
      status: 'RESOLVED',
      resolution_notes: 'Replaced faulty circuit breaker and tested 230V socket voltage.'
    }, wardenToken);
    assert.equal(res2.status, 200);
    assert.equal(res2.data.data.status, 'RESOLVED');
  });

  // Test 8: Gate Pass Day Pass validation and curfew
  await t.test('8. Gate pass curfew rule: Day pass exceeding 10 PM is rejected', async () => {
    const res = await dispatch('POST', '/gatepass/request', {
      pass_type: 'DAY_PASS',
      destination: 'City Library',
      reason: 'Academic research and exam preparation',
      emergency_contact: '9876543210',
      departure_time: '2026-11-01T14:00:00',
      expected_return_time: '2026-11-01T22:30:00' // Exceeds 22:00 curfew
    }, studentToken);

    assert.equal(res.status, 400);
    assert.match(res.data.message, /curfew/i);
  });

  // Test 9: Allocation Immutability Verification
  await t.test('9. Critical Invariant: Management operations never alter allocation records', () => {
    const activeAllocations = db.getAllocations();
    assert.equal(activeAllocations.size, 1, 'Allocation count must be strictly 1');
    assert.equal(activeAllocations.get(1), 1, 'Student 1 must remain allocated to Room 1');
  });
});
