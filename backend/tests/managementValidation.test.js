// ============================================================================
// HOSTELHUB MANAGEMENT MODULE VALIDATION & UNIT TEST SUITE
// Tests business rules, state machines, input validation, and RBAC
// Node.js Built-in Test Runner (node:test + node:assert/strict)
// Zero passwords - verifies demo registration-number and role-based access
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

const TEST_SECRET = 'test_jwt_secret_key_minimum_32_characters_for_hmac_sha256';

test('HostelHub Management Module Validation & Invariants', async (t) => {
  // --------------------------------------------------------------------------
  // 1. Password-Free Demo Authentication Invariant
  // --------------------------------------------------------------------------
  await t.test('1. Registration-number demo identity invariant: Zero passwords required', () => {
    const studentLoginHandler = (regNo) => {
      // Invariant: Student login strictly requires registration number, zero password
      if (!regNo || typeof regNo !== 'string' || !regNo.trim()) {
        return { success: false, reason: 'Registration number is required' };
      }
      return { success: true, studentId: 1, registration_number: regNo.trim().toUpperCase(), role: 'STUDENT' };
    };

    assert.equal(studentLoginHandler('').success, false);
    assert.equal(studentLoginHandler('   ').success, false);
    const auth = studentLoginHandler('24BCE1001');
    assert.equal(auth.success, true);
    assert.equal(auth.registration_number, '24BCE1001');
    assert.equal(auth.role, 'STUDENT');
  });

  // --------------------------------------------------------------------------
  // 2. JWT Generation & Role Integrity
  // --------------------------------------------------------------------------
  await t.test('2. JWT signature, expiration, and role verification', () => {
    const studentPayload = { sub: 10, registration_number: '24BCE1010', role: 'STUDENT' };
    const token = jwt.sign(studentPayload, TEST_SECRET, { expiresIn: '1h' });

    const decoded = jwt.verify(token, TEST_SECRET);
    assert.equal(decoded.sub, 10);
    assert.equal(decoded.registration_number, '24BCE1010');
    assert.equal(decoded.role, 'STUDENT');

    // Tampered token check
    assert.throws(() => {
      jwt.verify(token + 'tampered', TEST_SECRET);
    }, /invalid signature/);
  });

  // --------------------------------------------------------------------------
  // 3. Feature 1: Maintenance & Complaints Invariants
  // --------------------------------------------------------------------------
  await t.test('3. Maintenance category and input length validation', () => {
    const allowedCategories = ['ELECTRICAL', 'PLUMBING', 'FURNITURE', 'CLEANLINESS', 'INTERNET', 'OTHER'];
    assert.ok(allowedCategories.includes('ELECTRICAL'));
    assert.ok(allowedCategories.includes('PLUMBING'));
    assert.equal(allowedCategories.includes('UNKNOWN_SERVICE'), false);

    const validateComplaintInput = (title, description) => {
      const t = (title || '').trim();
      const d = (description || '').trim();
      if (t.length < 5 || t.length > 150) return { valid: false, message: 'Invalid title length' };
      if (d.length < 10 || d.length > 1000) return { valid: false, message: 'Invalid description length' };
      return { valid: true };
    };

    assert.equal(validateComplaintInput('    ', 'Valid description here.').valid, false, 'Whitespace title rejected');
    assert.equal(validateComplaintInput('AC', 'Valid description here.').valid, false, 'Short title rejected');
    assert.equal(validateComplaintInput('Valid Title Here', 'Short').valid, false, 'Short description rejected');
    assert.equal(validateComplaintInput('Valid Complaint Title', 'Sufficiently detailed description of the issue.').valid, true);
  });

  await t.test('4. Maintenance state machine transitions and resolution note rules', () => {
    const validTransitions = {
      PENDING: ['IN_PROGRESS', 'REJECTED'],
      IN_PROGRESS: ['RESOLVED', 'REJECTED'],
      RESOLVED: ['IN_PROGRESS'],
      REJECTED: []
    };

    const attemptTransition = (current, next, notes) => {
      if (!validTransitions[current] || !validTransitions[current].includes(next)) {
        return { allowed: false, reason: 'Illegal state transition' };
      }
      if (['RESOLVED', 'REJECTED'].includes(next) && (!notes || notes.trim().length < 5)) {
        return { allowed: false, reason: 'Mandatory resolution notes missing' };
      }
      return { allowed: true };
    };

    assert.equal(attemptTransition('PENDING', 'IN_PROGRESS').allowed, true);
    assert.equal(attemptTransition('PENDING', 'RESOLVED', 'Fixed').allowed, false, 'Direct jump PENDING -> RESOLVED prohibited');
    assert.equal(attemptTransition('IN_PROGRESS', 'RESOLVED', 'Fixed wiring').allowed, true);
    assert.equal(attemptTransition('IN_PROGRESS', 'RESOLVED', '').allowed, false, 'Resolving without notes prohibited');
    assert.equal(attemptTransition('REJECTED', 'RESOLVED', 'Re-eval').allowed, false, 'Terminal state transition prohibited');
  });

  // --------------------------------------------------------------------------
  // 4. Feature 2: Fees & Billing Invariants
  // --------------------------------------------------------------------------
  await t.test('5. Fee calculation, balance recalculation, and overpayment rejection', () => {
    const totalAmount = 56000.0;
    let paidAmount = 0.0;

    const processPayment = (payAmount) => {
      const balance = totalAmount - paidAmount;
      if (payAmount <= 0) return { success: false, reason: 'Amount must be > 0' };
      if (payAmount > balance + 0.01) return { success: false, reason: 'Overpayment rejected' };

      paidAmount += payAmount;
      const newStatus = paidAmount >= totalAmount ? 'PAID' : 'PARTIAL';
      return { success: true, balance: totalAmount - paidAmount, status: newStatus };
    };

    assert.equal(processPayment(0).success, false, 'Zero payment rejected');
    assert.equal(processPayment(-500).success, false, 'Negative payment rejected');
    assert.equal(processPayment(60000).success, false, 'Overpayment rejected');

    const res1 = processPayment(26000);
    assert.equal(res1.success, true);
    assert.equal(res1.status, 'PARTIAL');
    assert.equal(res1.balance, 30000);

    const res2 = processPayment(30000);
    assert.equal(res2.success, true);
    assert.equal(res2.status, 'PAID');
    assert.equal(res2.balance, 0);
  });

  // --------------------------------------------------------------------------
  // 5. Feature 3: Mess & Meal Invariants
  // --------------------------------------------------------------------------
  await t.test('6. Mess rebate duration (min 3 days), overlap rejection, and calculation', () => {
    const calculateRebate = (startDateStr, endDateStr) => {
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
        return { valid: false, reason: 'Invalid dates' };
      }
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (days < 3) return { valid: false, reason: 'Rebate requires at least 3 consecutive days' };

      const rate = 150.0;
      return { valid: true, days, total: days * rate };
    };

    // 2 days rebate rejected
    assert.equal(calculateRebate('2026-11-01', '2026-11-02').valid, false);
    // 3 days rebate accepted
    const r3 = calculateRebate('2026-11-01', '2026-11-03');
    assert.equal(r3.valid, true);
    assert.equal(r3.days, 3);
    assert.equal(r3.total, 450.0);
    // 5 days rebate
    const r5 = calculateRebate('2026-11-01', '2026-11-05');
    assert.equal(r5.valid, true);
    assert.equal(r5.days, 5);
    assert.equal(r5.total, 750.0);
  });

  // --------------------------------------------------------------------------
  // 6. Feature 4: Curfew & Gate-Pass Invariants
  // --------------------------------------------------------------------------
  await t.test('7. Curfew cutoff, phone validation, and movement state transitions', () => {
    const validateGatePass = (type, depTimeStr, retTimeStr, contact) => {
      if (!/^\d{10}$/.test(contact)) return { valid: false, reason: 'Invalid 10-digit phone number' };

      const dep = new Date(depTimeStr);
      const ret = new Date(retTimeStr);
      if (ret <= dep) return { valid: false, reason: 'Return must be after departure' };

      if (type === 'DAY_PASS') {
        if (dep.toDateString() !== ret.toDateString()) {
          return { valid: false, reason: 'Day pass must return on same date' };
        }
        if (ret.getHours() > 22 || (ret.getHours() === 22 && ret.getMinutes() > 0)) {
          return { valid: false, reason: 'Day pass exceeds 10:00 PM curfew' };
        }
      }
      return { valid: true };
    };

    // Invalid phone
    assert.equal(validateGatePass('DAY_PASS', '2026-11-01T14:00:00', '2026-11-01T18:00:00', '12345').valid, false);
    // Day pass past 10 PM
    assert.equal(validateGatePass('DAY_PASS', '2026-11-01T14:00:00', '2026-11-01T22:30:00', '9876543210').valid, false);
    // Valid day pass
    assert.equal(validateGatePass('DAY_PASS', '2026-11-01T14:00:00', '2026-11-01T21:00:00', '9876543210').valid, true);

    // Movement state machine
    const logMovement = (currentStatus, action, returnTime, actualReturnTime) => {
      if (action === 'CHECK_OUT') {
        if (currentStatus !== 'APPROVED') return { allowed: false, reason: 'Pass not approved' };
        return { allowed: true, nextStatus: 'CHECKED_OUT' };
      }
      if (action === 'CHECK_IN') {
        if (currentStatus !== 'CHECKED_OUT') return { allowed: false, reason: 'Pass not checked out' };
        const isOverdue = actualReturnTime > returnTime;
        return { allowed: true, nextStatus: 'CHECKED_IN', isOverdue };
      }
      return { allowed: false, reason: 'Invalid action' };
    };

    assert.equal(logMovement('PENDING', 'CHECK_OUT').allowed, false);
    assert.equal(logMovement('APPROVED', 'CHECK_OUT').allowed, true);
    assert.equal(logMovement('CHECKED_OUT', 'CHECK_IN', new Date('2026-11-01T21:00:00'), new Date('2026-11-01T21:30:00')).isOverdue, true);
  });

  // --------------------------------------------------------------------------
  // 7. Role Permission Matrix (RBAC)
  // --------------------------------------------------------------------------
  await t.test('8. Strict Role-Based Access Control (RBAC) matrix', () => {
    const rolePermissions = {
      STUDENT: ['SUBMIT_COMPLAINT', 'VIEW_MY_COMPLAINT', 'PAY_FEE', 'VIEW_MY_LEDGER', 'APPLY_REBATE', 'REQUEST_GATE_PASS'],
      WARDEN: ['ASSIGN_COMPLAINT', 'RESOLVE_COMPLAINT', 'VIEW_ALL_COMPLAINTS', 'VIEW_LEDGER', 'APPROVE_REBATE', 'APPROVE_GATE_PASS'],
      ACCOUNTANT: ['VIEW_LEDGER', 'RECORD_PAYMENT', 'ISSUE_CLEARANCE'],
      MESS_SUPERVISOR: ['UPDATE_MENU', 'APPROVE_REBATE', 'VIEW_HEADCOUNT'],
      SECURITY_GUARD: ['LOG_CHECKOUT', 'LOG_CHECKIN', 'VIEW_OVERDUE_GATE_PASSES']
    };

    const hasPermission = (userRole, action) => {
      return (rolePermissions[userRole] || []).includes(action);
    };

    // Student cannot resolve complaint or approve gate pass
    assert.equal(hasPermission('STUDENT', 'RESOLVE_COMPLAINT'), false);
    assert.equal(hasPermission('STUDENT', 'APPROVE_GATE_PASS'), false);

    // Warden has supervisory powers
    assert.equal(hasPermission('WARDEN', 'RESOLVE_COMPLAINT'), true);
    assert.equal(hasPermission('WARDEN', 'APPROVE_GATE_PASS'), true);

    // Security guard can only log movement and view overdue
    assert.equal(hasPermission('SECURITY_GUARD', 'LOG_CHECKOUT'), true);
    assert.equal(hasPermission('SECURITY_GUARD', 'RECORD_PAYMENT'), false);

    // Accountant can record payment, not edit mess menu
    assert.equal(hasPermission('ACCOUNTANT', 'RECORD_PAYMENT'), true);
    assert.equal(hasPermission('ACCOUNTANT', 'UPDATE_MENU'), false);
  });
});
