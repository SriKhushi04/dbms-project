// ============================================================================
// HOSTELHUB ROOMMATE VALIDATION UNIT TEST SUITE (Node.js Built-In Test Runner)
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { generateStudents } from '../../database/seeds/seedData.js';

test('HostelHub Roommate Validation Invariants & Edge Cases', async (t) => {
  const allStudents = generateStudents();
  const studentMap = new Map(allStudents.map(s => [s.registration_number, s]));

  // Mock Active Database State
  const activeAllocations = new Set(['24BCE1001']); // 24BCE1001 already allocated S-101
  const activeGroupMemberships = new Map(); // student_id -> group_id
  // Pre-seed an existing submitted group (Group 10) with member 24BCE1010
  const student10 = studentMap.get('24BCE1010');
  activeGroupMemberships.set(student10.id, 10);

  // Pure validation engine implementing backend & frontend logic
  const validateRoommates = (capacity, roommates, currentReg, existingGroupId = null) => {
    const capNum = parseInt(capacity, 10);
    const required = capNum - 1;

    // Rule 1: Capacity count check
    if (!Array.isArray(roommates) || roommates.length !== required) {
      return {
        valid: false,
        fieldIndex: null,
        message: `For a ${capNum}-bedded room, exactly ${required} roommate registration number(s) must be provided.`
      };
    }

    // Rule 2: Empty or whitespace-only check
    for (let i = 0; i < required; i++) {
      const val = roommates[i];
      if (typeof val !== 'string' || !val.trim()) {
        return {
          valid: false,
          fieldIndex: i,
          message: `Roommate ${i + 1} registration number cannot be empty or contain only whitespace.`
        };
      }
    }

    const cleanRoommates = roommates.map(r => r.trim().toUpperCase());

    // Rule 3: Self-reference check
    const currentClean = currentReg.trim().toUpperCase();
    const selfIdx = cleanRoommates.findIndex(r => r === currentClean);
    if (selfIdx !== -1) {
      return {
        valid: false,
        fieldIndex: selfIdx,
        message: 'You cannot enter your own registration number as a roommate.'
      };
    }

    // Rule 4: Duplicate roommate registrations check
    const seen = new Set();
    for (let i = 0; i < cleanRoommates.length; i++) {
      const r = cleanRoommates[i];
      if (seen.has(r)) {
        return {
          valid: false,
          fieldIndex: i,
          message: `Duplicate roommate registration number "${r}" is not allowed.`
        };
      }
      seen.add(r);
    }

    // Rule 5: Registration number existence check
    for (let i = 0; i < cleanRoommates.length; i++) {
      const r = cleanRoommates[i];
      if (!studentMap.has(r)) {
        return {
          valid: false,
          fieldIndex: i,
          message: `Roommate registration number "${r}" not found in university records.`
        };
      }
    }

    // Rule 6: Eligibility check
    for (let i = 0; i < cleanRoommates.length; i++) {
      const s = studentMap.get(cleanRoommates[i]);
      if (!s.is_eligible) {
        return {
          valid: false,
          fieldIndex: i,
          message: `Roommate ${s.registration_number} (${s.full_name}) is not eligible for hostel allocation.`
        };
      }
    }

    // Rule 7: Roommate already allocated check
    for (let i = 0; i < cleanRoommates.length; i++) {
      const r = cleanRoommates[i];
      if (activeAllocations.has(r)) {
        return {
          valid: false,
          fieldIndex: i,
          message: 'This student has already been allocated a room and cannot be added as a roommate.'
        };
      }
    }

    // Rule 8: Roommate already belonging to another submitted group
    for (let i = 0; i < cleanRoommates.length; i++) {
      const s = studentMap.get(cleanRoommates[i]);
      const existingGid = activeGroupMemberships.get(s.id);
      if (existingGid && existingGid !== existingGroupId) {
        return {
          valid: false,
          fieldIndex: i,
          message: 'This student already belongs to another submitted or active roommate group.'
        };
      }
    }

    return { valid: true, cleanRoommates };
  };

  // Test 1: Empty roommate field
  await t.test('1. Empty or whitespace-only roommate field is rejected with fieldIndex', () => {
    // Empty string in double-bed room
    const res1 = validateRoommates(2, [''], '24BCE1005');
    assert.equal(res1.valid, false);
    assert.equal(res1.fieldIndex, 0);
    assert.match(res1.message, /cannot be empty or contain only whitespace/i);

    // Whitespace only in 4-bed room (second field empty)
    const res2 = validateRoommates(4, ['24BCE1006', '   ', '24BCE1008'], '24BCE1005');
    assert.equal(res2.valid, false);
    assert.equal(res2.fieldIndex, 1);
    assert.match(res2.message, /Roommate 2 registration number cannot be empty/i);
  });

  // Test 2: Duplicate roommate registrations
  await t.test('2. Duplicate roommate registrations are rejected (ignoring case & whitespace)', () => {
    // Exact duplicate
    const res1 = validateRoommates(4, ['24BCE1006', '24BCE1006', '24BCE1008'], '24BCE1005');
    assert.equal(res1.valid, false);
    assert.equal(res1.fieldIndex, 1);
    assert.match(res1.message, /Duplicate roommate registration number/i);

    // Case and whitespace difference duplicate
    const res2 = validateRoommates(4, ['24BCE1006', '  24bce1006  ', '24BCE1008'], '24BCE1005');
    assert.equal(res2.valid, false);
    assert.equal(res2.fieldIndex, 1);
    assert.match(res2.message, /Duplicate roommate registration number "24BCE1006"/i);
  });

  // Test 3: Student entering their own registration number
  await t.test('3. Student entering own registration number is rejected', () => {
    const res = validateRoommates(2, ['24BCE1005'], '24BCE1005');
    assert.equal(res.valid, false);
    assert.equal(res.fieldIndex, 0);
    assert.match(res.message, /cannot enter your own registration number/i);

    // Case insensitive match
    const resUpper = validateRoommates(2, ['  24bce1005 '], '24BCE1005');
    assert.equal(resUpper.valid, false);
    assert.match(resUpper.message, /cannot enter your own registration number/i);
  });

  // Test 4: Registration number not found in MySQL
  await t.test('4. Registration number not found in university records is rejected', () => {
    const res = validateRoommates(2, ['INVALID999'], '24BCE1005');
    assert.equal(res.valid, false);
    assert.equal(res.fieldIndex, 0);
    assert.match(res.message, /not found in university records/i);
  });

  // Test 5: Roommate already allocated a room
  await t.test('5. Roommate who already has an allocated room is blocked', () => {
    // 24BCE1001 is pre-allocated
    const res = validateRoommates(2, ['24BCE1001'], '24BCE1005');
    assert.equal(res.valid, false);
    assert.equal(res.fieldIndex, 0);
    assert.match(res.message, /already been allocated a room and cannot be added/i);
  });

  // Test 6: Roommate already belonging to another submitted group
  await t.test('6. Roommate already belonging to another submitted group is blocked', () => {
    // 24BCE1010 belongs to Group 10
    const res = validateRoommates(2, ['24BCE1010'], '24BCE1005');
    assert.equal(res.valid, false);
    assert.equal(res.fieldIndex, 0);
    assert.match(res.message, /already belongs to another submitted or active roommate group/i);

    // If updating own group (group 10), it should be allowed
    const resOwnGroup = validateRoommates(2, ['24BCE1010'], '24BCE1005', 10);
    assert.equal(resOwnGroup.valid, true);
  });

  // Test 7: Valid roommate submission
  await t.test('7. Valid roommate submission passes validation cleanly', () => {
    // 1-Bed: 0 roommates
    const res1 = validateRoommates(1, [], '24BCE1005');
    assert.equal(res1.valid, true);

    // 2-Bed: 1 valid roommate
    const res2 = validateRoommates(2, ['24BCE1006'], '24BCE1005');
    assert.equal(res2.valid, true);
    assert.deepEqual(res2.cleanRoommates, ['24BCE1006']);

    // 4-Bed: 3 valid roommates
    const res4 = validateRoommates(4, ['24BCE1006', '24BCE1007', '24BCE1008'], '24BCE1005');
    assert.equal(res4.valid, true);
    assert.deepEqual(res4.cleanRoommates, ['24BCE1006', '24BCE1007', '24BCE1008']);
  });

  // Test 8: Two simultaneous submissions attempting to add the same student
  await t.test('8. Two simultaneous submissions attempting to add the same student (Concurrency Invariant)', async () => {
    // Simulated transactional group registry with row locking
    const mockDb = {
      groups: new Map(), // groupId -> [studentIds]
      studentInGroup: new Map(), // studentId -> groupId
      lock: Promise.resolve(),

      async submitGroup(primaryReg, roommateRegs) {
        // Serialized execution matching database transaction FOR UPDATE row locking
        const currentLock = this.lock;
        let releaseLock;
        this.lock = new Promise(resolve => { releaseLock = resolve; });

        await currentLock;
        try {
          const primary = studentMap.get(primaryReg);
          const roommates = roommateRegs.map(r => studentMap.get(r));
          const allMemberIds = [primary.id, ...roommates.map(r => r.id)];

          // Transaction check: Are any members already in an active group?
          for (const sId of allMemberIds) {
            if (this.studentInGroup.has(sId)) {
              throw new Error(`This student already belongs to another submitted or active roommate group.`);
            }
          }

          // Persist atomically
          const newGroupId = this.groups.size + 1;
          this.groups.set(newGroupId, allMemberIds);
          for (const sId of allMemberIds) {
            this.studentInGroup.set(sId, newGroupId);
          }

          return { success: true, groupId: newGroupId };
        } finally {
          releaseLock();
        }
      }
    };

    // Candidate roommate to be competed for: 24BCE1020
    const contestedRoommate = '24BCE1020';

    // Student A (24BCE1021) and Student B (24BCE1022) simultaneously submit preferences with 24BCE1020
    const submissionA = mockDb.submitGroup('24BCE1021', [contestedRoommate]);
    const submissionB = mockDb.submitGroup('24BCE1022', [contestedRoommate]);

    const results = await Promise.allSettled([submissionA, submissionB]);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    // Exactly one submission must succeed, and exactly one must be rejected
    assert.equal(fulfilled.length, 1, 'Exactly one concurrent submission must succeed');
    assert.equal(rejected.length, 1, 'The competing concurrent submission must fail');
    assert.match(
      rejected[0].reason.message,
      /already belongs to another submitted or active roommate group/i,
      'Rejected submission must report prior group membership'
    );
  });
});

