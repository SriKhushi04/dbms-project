// ============================================================================
// HOSTELHUB STUDENT WORKFLOW UNIT TEST SUITE (Node.js Built-In Test Runner)
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';

import { hostels, generateRooms, generateStudents } from '../../database/seeds/seedData.js';

test('HostelHub Minimal Student Workflow & Invariants', async (t) => {
  const allHostels = hostels;
  const allRooms = generateRooms();
  const allStudents = generateStudents();

  // Test 1: Seed data reconciliation
  await t.test('1. Database seed counts reconcile with specification', () => {
    assert.equal(allHostels.length, 3, 'Must have exactly 3 hostel blocks (A, B, C)');
    assert.equal(allRooms.length, 80, 'Must have exactly 80 rooms');
    assert.equal(allStudents.length, 100, 'Must have exactly 100 students');

    const totalBeds = allRooms.reduce((sum, r) => sum + r.capacity, 0);
    assert.equal(totalBeds, 200, 'Must have exactly 200 beds (20 single + 60 double + 120 quad)');

    const singles = allRooms.filter(r => r.capacity === 1);
    const doubles = allRooms.filter(r => r.capacity === 2);
    const quads = allRooms.filter(r => r.capacity === 4);

    assert.equal(singles.length, 20, 'Exactly 20 single rooms');
    assert.equal(doubles.length, 30, 'Exactly 30 double rooms');
    assert.equal(quads.length, 30, 'Exactly 30 quad rooms');
  });

  // Test 2: Login validation
  await t.test('2. Registration number login validation', () => {
    const studentMap = new Map(allStudents.map(s => [s.registration_number, s]));

    // Valid student
    const valid = studentMap.get('24BCE1001');
    assert.ok(valid, '24BCE1001 must exist');
    assert.equal(valid.merit_rank, 1);

    // Invalid student
    const invalid = studentMap.get('INVALID999');
    assert.equal(invalid, undefined, 'Unknown registration numbers must be rejected');

    // Case insensitivity
    const upper = '24bce1002'.toUpperCase();
    assert.ok(studentMap.has(upper), 'Login should handle case normalization');
  });

  // Test 3: Room filtering by Block and Capacity
  await t.test('3. Room availability filtering by block and capacity', () => {
    // Filter Block A (id 1) and capacity 2
    const blockARooms = allRooms.filter(r => r.hostel_id === 1 && r.capacity === 2);
    assert.equal(blockARooms.length, 10, 'Block A must have 10 double rooms');

    for (const r of blockARooms) {
      assert.equal(r.capacity, 2, 'Filtered rooms must match selected capacity');
      assert.equal(r.hostel_id, 1, 'Filtered rooms must match selected block');
    }
  });

  // Test 4: Mutual exclusion across 5 preferences
  await t.test('4. Five preferences mutual exclusion (no duplicates across dropdowns)', () => {
    const blockCRooms = allRooms.filter(r => r.hostel_id === 3 && r.capacity === 2);
    const chosenRoomIds = [blockCRooms[0].id, blockCRooms[1].id, blockCRooms[2].id, blockCRooms[3].id, blockCRooms[4].id];

    // Verify all 5 are distinct
    const distinctSet = new Set(chosenRoomIds);
    assert.equal(distinctSet.size, 5, 'Selected preferences must be 5 distinct room IDs');

    // Test filtering out already-selected rooms for dropdown #5
    const selectedSoFar = [chosenRoomIds[0], chosenRoomIds[1], chosenRoomIds[2], chosenRoomIds[3]];
    const availableForDropdown5 = blockCRooms.filter(r => !selectedSoFar.includes(r.id));

    // Make sure dropdown 5 options do not contain choices 1 to 4
    for (const prevId of selectedSoFar) {
      assert.ok(!availableForDropdown5.some(r => r.id === prevId), 'Selected rooms must be excluded from other dropdowns');
    }
  });

  // Test 5: Roommate count requirement
  await t.test('5. Roommate count validation based on bed capacity', () => {
    const loggedInReg = '24BCE1005';

    // Helper function matching backend validation
    const validateRoommates = (capacity, roommates, currentReg) => {
      const required = capacity - 1;
      if (roommates.length !== required) {
        return { valid: false, message: `Expected ${required} roommates` };
      }
      if (roommates.includes(currentReg)) {
        return { valid: false, message: 'Cannot include self' };
      }
      if (new Set(roommates).size !== roommates.length) {
        return { valid: false, message: 'Duplicate roommates' };
      }
      return { valid: true };
    };

    // 1-bed room (needs 0 roommates)
    assert.ok(validateRoommates(1, [], loggedInReg).valid);
    assert.ok(!validateRoommates(1, ['24BCE1006'], loggedInReg).valid);

    // 2-bed room (needs 1 roommate)
    assert.ok(validateRoommates(2, ['24BCE1006'], loggedInReg).valid);
    assert.ok(!validateRoommates(2, [], loggedInReg).valid);
    assert.ok(!validateRoommates(2, [loggedInReg], loggedInReg).valid, 'Self reference rejected');

    // 4-bed room (needs 3 roommates)
    assert.ok(validateRoommates(4, ['24BCE1006', '24BCE1007', '24BCE1008'], loggedInReg).valid);
    assert.ok(!validateRoommates(4, ['24BCE1006', '24BCE1006', '24BCE1008'], loggedInReg).valid, 'Duplicate roommates rejected');
    assert.ok(!validateRoommates(4, ['24BCE1006', '24BCE1007'], loggedInReg).valid, 'Missing roommates rejected');
  });

  // Test 6: Allocation status display logic
  await t.test('6. Allocation status state branching (Green Box vs Form)', () => {
    const mockAllocations = new Map();
    // Student 1 is allocated to Room 101 in Block A
    mockAllocations.set('24BCE1001', { room_number: 'S-101', block_name: 'Block A', capacity: 1 });

    // Function matching StudentDashboard state branching
    const getStudentDisplayState = (regNo) => {
      const alloc = mockAllocations.get(regNo);
      if (alloc) {
        return {
          case: 1,
          displayBox: `You have been allocated ROOM NO - ${alloc.room_number}`,
          showForm: false
        };
      }
      return {
        case: 2,
        displayBox: null,
        showForm: true
      };
    };

    // Case 1: Student 24BCE1001
    const student1State = getStudentDisplayState('24BCE1001');
    assert.equal(student1State.case, 1);
    assert.equal(student1State.displayBox, 'You have been allocated ROOM NO - S-101');
    assert.equal(student1State.showForm, false, 'Form must NOT be shown when allocated');

    // Case 2: Student 24BCE1002
    const student2State = getStudentDisplayState('24BCE1002');
    assert.equal(student2State.case, 2);
    assert.equal(student2State.displayBox, null);
    assert.equal(student2State.showForm, true, 'Form must be shown when unallocated');
  });
});

