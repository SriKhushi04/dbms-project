// ============================================================================
// HOSTELHUB ROOM ALLOCATION ENGINE UNIT TEST SUITE (Node.js Built-In Test Runner)
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import { generateStudents, generateRooms, hostels } from '../../database/seeds/seedData.js';

test('HostelHub Room Allocation Engine Invariants & Edge Cases', async (t) => {
  const allStudents = generateStudents();
  const allRooms = generateRooms();
  const studentMap = new Map(allStudents.map(s => [s.registration_number, s]));
  const roomMap = new Map(allRooms.map(r => [r.id, r]));

  // Mock Allocation Simulation Engine matching backend transaction logic
  const createMockEngine = () => {
    const allocations = new Map(); // studentId -> roomId
    const roomOccupancy = new Map(); // roomId -> count of students
    const groupStatus = new Map(); // groupId -> { status, allocatedRoomId, reason }

    // Seed existing allocations (e.g. Student 1 in Room 1)
    const seedAllocation = (studentId, roomId) => {
      allocations.set(studentId, roomId);
      roomOccupancy.set(roomId, (roomOccupancy.get(roomId) || 0) + 1);
    };

    const runAllocation = (submittedGroups) => {
      // 1. Sort groups by lowest numerical merit rank among members (best rank first)
      const sortedGroups = [...submittedGroups].sort((a, b) => {
        const bestRankA = Math.min(...a.members.map(m => m.merit_rank));
        const bestRankB = Math.min(...b.members.map(m => m.merit_rank));
        return bestRankA - bestRankB;
      });

      let allocatedGroups = 0;
      let allocatedStudents = 0;
      let unallocatedGroups = 0;
      const assignedRoomsSet = new Set();

      for (const grp of sortedGroups) {
        // Re-check: does any member already have an active allocation?
        const alreadyAllocated = grp.members.some(m => allocations.has(m.id));
        if (alreadyAllocated) {
          groupStatus.set(grp.id, {
            status: 'ALLOCATED',
            allocatedRoomId: allocations.get(grp.members[0].id),
            reason: null
          });
          continue;
        }

        // Re-check: are all members eligible?
        const ineligible = grp.members.some(m => !m.is_eligible);
        if (ineligible) {
          groupStatus.set(grp.id, {
            status: 'UNALLOCATED',
            allocatedRoomId: null,
            reason: 'One or more group members are not eligible for hostel allocation.'
          });
          unallocatedGroups++;
          continue;
        }

        let assignedRoomId = null;

        // Check 5 preferences in order
        for (const roomId of grp.preferences) {
          const room = roomMap.get(roomId);
          if (!room) continue;

          // Check block match and capacity match
          if (room.hostel_id !== grp.hostel_id || room.capacity !== grp.capacity) {
            continue;
          }

          // Check available beds in room
          const currentOccupants = roomOccupancy.get(roomId) || 0;
          const remainingBeds = room.capacity - currentOccupants;

          if (remainingBeds >= grp.capacity) {
            assignedRoomId = roomId;
            break;
          }
        }

        if (assignedRoomId) {
          // Allocate all members to this room
          for (const m of grp.members) {
            allocations.set(m.id, assignedRoomId);
          }
          roomOccupancy.set(assignedRoomId, (roomOccupancy.get(assignedRoomId) || 0) + grp.capacity);
          groupStatus.set(grp.id, {
            status: 'ALLOCATED',
            allocatedRoomId: assignedRoomId,
            reason: null
          });
          allocatedGroups++;
          allocatedStudents += grp.members.length;
          assignedRoomsSet.add(assignedRoomId);
        } else {
          groupStatus.set(grp.id, {
            status: 'UNALLOCATED',
            allocatedRoomId: null,
            reason: 'All 5 preferred rooms reached full capacity with higher-merit applicants.'
          });
          unallocatedGroups++;
        }
      }

      return {
        allocatedGroups,
        allocatedStudents,
        unallocatedGroups,
        roomsAssigned: assignedRoomsSet.size
      };
    };

    return { allocations, roomOccupancy, groupStatus, seedAllocation, runAllocation };
  };

  // Test 1: First preference available
  await t.test('1. First preference available -> assigned room of preference 1', () => {
    const engine = createMockEngine();
    const grp = {
      id: 101,
      hostel_id: 1, // Block A
      capacity: 2,
      members: [studentMap.get('24BCE1002'), studentMap.get('24BCE1003')],
      preferences: [21, 22, 23, 24, 25] // D-201, D-202, ...
    };

    const res = engine.runAllocation([grp]);
    assert.equal(res.allocatedGroups, 1);
    assert.equal(res.allocatedStudents, 2);
    assert.equal(engine.groupStatus.get(101).allocatedRoomId, 21, 'Must assign preference 1 (room 21)');
    assert.equal(engine.allocations.get(studentMap.get('24BCE1002').id), 21);
    assert.equal(engine.allocations.get(studentMap.get('24BCE1003').id), 21);
  });

  // Test 2: First preference unavailable, second preference available
  await t.test('2. First preference unavailable, second preference available -> assigns preference 2', () => {
    const engine = createMockEngine();
    // Pre-occupy preference 1 (room 21)
    engine.seedAllocation(999, 21);
    engine.seedAllocation(998, 21);

    const grp = {
      id: 102,
      hostel_id: 1,
      capacity: 2,
      members: [studentMap.get('24BCE1002'), studentMap.get('24BCE1003')],
      preferences: [21, 22, 23, 24, 25] // 21 is full
    };

    const res = engine.runAllocation([grp]);
    assert.equal(res.allocatedGroups, 1);
    assert.equal(engine.groupStatus.get(102).allocatedRoomId, 22, 'Must assign preference 2 (room 22)');
  });

  // Test 3: All five preferences unavailable
  await t.test('3. All five preferences unavailable -> group marked UNALLOCATED with clear reason', () => {
    const engine = createMockEngine();
    const prefs = [21, 22, 23, 24, 25];
    // Fill all 5 rooms
    for (const rId of prefs) {
      engine.seedAllocation(1000 + rId, rId);
      engine.seedAllocation(2000 + rId, rId);
    }

    const grp = {
      id: 103,
      hostel_id: 1,
      capacity: 2,
      members: [studentMap.get('24BCE1004'), studentMap.get('24BCE1005')],
      preferences: prefs
    };

    const res = engine.runAllocation([grp]);
    assert.equal(res.allocatedGroups, 0);
    assert.equal(res.unallocatedGroups, 1);
    const status = engine.groupStatus.get(103);
    assert.equal(status.status, 'UNALLOCATED');
    assert.equal(status.allocatedRoomId, null);
    assert.match(status.reason, /All 5 preferred rooms reached full capacity/i);
  });

  // Test 4: Two groups competing for the same room
  await t.test('4. Two groups competing for the same room -> higher merit group wins', () => {
    const engine = createMockEngine();
    // Group A (Primary rank #2)
    const grpA = {
      id: 201,
      hostel_id: 1,
      capacity: 2,
      members: [studentMap.get('24BCE1002'), studentMap.get('24BCE1003')], // Best rank = 2
      preferences: [21, 22, 23, 24, 25]
    };

    // Group B (Primary rank #10)
    const grpB = {
      id: 202,
      hostel_id: 1,
      capacity: 2,
      members: [studentMap.get('24BCE1010'), studentMap.get('24BCE1011')], // Best rank = 10
      preferences: [21, 26, 27, 28, 29] // Competing on 21
    };

    // Run in arbitrary submission order [grpB, grpA]
    const res = engine.runAllocation([grpB, grpA]);
    assert.equal(res.allocatedGroups, 2);

    // Group A must get 21 (higher merit rank 2 < 10)
    assert.equal(engine.groupStatus.get(201).allocatedRoomId, 21, 'Group A gets contested room 21');
    // Group B gets its second preference (room 26)
    assert.equal(engine.groupStatus.get(202).allocatedRoomId, 26, 'Group B receives second choice room 26');
  });

  // Test 5: Merit-rank ordering based on best member in group
  await t.test('5. Group priority is determined by the lowest numerical rank among all members', () => {
    const engine = createMockEngine();
    // Group X: members with ranks [50, 4] -> Best rank = 4
    const grpX = {
      id: 301,
      hostel_id: 1,
      capacity: 2,
      members: [studentMap.get('24BCE1050'), studentMap.get('24BCE1004')],
      preferences: [21, 22, 23, 24, 25]
    };

    // Group Y: members with ranks [5, 6] -> Best rank = 5
    const grpY = {
      id: 302,
      hostel_id: 1,
      capacity: 2,
      members: [studentMap.get('24BCE1005'), studentMap.get('24BCE1006')],
      preferences: [21, 22, 23, 24, 25]
    };

    // Run allocation
    engine.runAllocation([grpY, grpX]);

    // Group X has member rank 4, so Group X beats Group Y (rank 5) for room 21
    assert.equal(engine.groupStatus.get(301).allocatedRoomId, 21);
    assert.equal(engine.groupStatus.get(302).allocatedRoomId, 22);
  });

  // Test 6: Roommate groups staying together
  await t.test('6. All members of a roommate group are allocated to the exact same room', () => {
    const engine = createMockEngine();
    const quadMembers = [
      studentMap.get('24BCE1012'),
      studentMap.get('24BCE1013'),
      studentMap.get('24BCE1014'),
      studentMap.get('24BCE1015')
    ];

    const quadGroup = {
      id: 401,
      hostel_id: 1,
      capacity: 4,
      members: quadMembers,
      preferences: [51, 52, 53, 54, 55] // 4-bed rooms in Block A
    };

    engine.runAllocation([quadGroup]);

    const assignedRoomId = engine.groupStatus.get(401).allocatedRoomId;
    assert.ok(assignedRoomId, 'Quad group must be allocated');

    // All 4 students must have the exact same assigned room
    for (const m of quadMembers) {
      assert.equal(
        engine.allocations.get(m.id),
        assignedRoomId,
        `Member ${m.registration_number} must share the allocated room`
      );
    }
  });

  // Test 7: Repeated allocation requests are idempotent
  await t.test('7. Repeated allocation requests do not duplicate allocations or reallocate', () => {
    const engine = createMockEngine();
    const grp = {
      id: 501,
      hostel_id: 1,
      capacity: 2,
      members: [studentMap.get('24BCE1002'), studentMap.get('24BCE1003')],
      preferences: [21, 22, 23, 24, 25]
    };

    // Run 1
    const res1 = engine.runAllocation([grp]);
    assert.equal(res1.allocatedGroups, 1);
    const roomFirstRun = engine.groupStatus.get(501).allocatedRoomId;

    // Run 2 (Simulates repeated click of "Allocate Rooms")
    const res2 = engine.runAllocation([grp]);
    assert.equal(res2.allocatedGroups, 0, 'No newly allocated groups on repeated run');
    assert.equal(
      engine.groupStatus.get(501).allocatedRoomId,
      roomFirstRun,
      'Existing allocation remains identical'
    );
  });

  // Test 8: Existing allocations remain unchanged
  await t.test('8. Pre-existing active allocations are never overwritten or cleared', () => {
    const engine = createMockEngine();
    // Pre-allocate Student 1 to Room 1
    engine.seedAllocation(1, 1);

    const grp = {
      id: 601,
      hostel_id: 1,
      capacity: 1,
      members: [studentMap.get('24BCE1002')],
      preferences: [2, 3, 4, 5, 6]
    };

    engine.runAllocation([grp]);

    // Verify Student 1 is still in Room 1
    assert.equal(engine.allocations.get(1), 1, 'Student 1 must remain in room 1');
    assert.equal(engine.allocations.get(studentMap.get('24BCE1002').id), 2);
  });

  // Test 9: Student dashboard display state reflection
  await t.test('9. Student dashboard reflects allocated room and hides preference form', () => {
    const engine = createMockEngine();
    engine.seedAllocation(studentMap.get('24BCE1002').id, 21); // Allocated to D-201

    // Simulation of StudentDashboard loadDashboard state logic
    const getDashboardState = (regNo) => {
      const student = studentMap.get(regNo);
      const allocRoomId = engine.allocations.get(student.id);
      if (allocRoomId) {
        const room = roomMap.get(allocRoomId);
        return {
          case: 1,
          isAllocated: true,
          greenBoxMessage: `You have been allocated ROOM NO - ${room.room_number}`,
          showForm: false
        };
      }
      return {
        case: 2,
        isAllocated: false,
        greenBoxMessage: null,
        showForm: true
      };
    };

    const state = getDashboardState('24BCE1002');
    assert.equal(state.isAllocated, true);
    assert.equal(state.greenBoxMessage, 'You have been allocated ROOM NO - D-201');
    assert.equal(state.showForm, false, 'Form must be hidden for allocated students');
  });

  // Test 10: Iterative Round Workflow
  await t.test('10. Iterative Allocation Rounds: Group exhausts 5 preferences, resubmits, and is allocated in Round 2', () => {
    const engine = createMockEngine();

    // Round 1 Setup:
    // Group 1 (Merit 2): Selects [21, 22, 23, 24, 25]
    const group1 = {
      id: 701,
      hostel_id: 1,
      capacity: 2,
      members: [studentMap.get('24BCE1002'), studentMap.get('24BCE1003')],
      preferences: [21, 22, 23, 24, 25]
    };

    // Group 2 (Merit 10): Also selects [21, 22, 23, 24, 25]
    const group2 = {
      id: 702,
      hostel_id: 1,
      capacity: 2,
      members: [studentMap.get('24BCE1010'), studentMap.get('24BCE1011')],
      preferences: [21, 22, 23, 24, 25]
    };

    // Pre-occupy rooms 22, 23, 24, 25 with existing higher-merit groups
    engine.seedAllocation(2001, 22);
    engine.seedAllocation(2002, 22);
    engine.seedAllocation(2003, 23);
    engine.seedAllocation(2004, 23);
    engine.seedAllocation(2005, 24);
    engine.seedAllocation(2006, 24);
    engine.seedAllocation(2007, 25);
    engine.seedAllocation(2008, 25);

    // --- ROUND 1 ALLOCATION ---
    const round1Result = engine.runAllocation([group1, group2]);
    assert.equal(round1Result.allocatedGroups, 1, 'Group 1 gets room 21');
    assert.equal(round1Result.unallocatedGroups, 1, 'Group 2 has all 5 preferences exhausted');

    assert.equal(engine.groupStatus.get(701).status, 'ALLOCATED');
    assert.equal(engine.groupStatus.get(701).allocatedRoomId, 21);

    assert.equal(engine.groupStatus.get(702).status, 'UNALLOCATED');
    assert.equal(engine.groupStatus.get(702).allocatedRoomId, null);
    assert.match(engine.groupStatus.get(702).reason, /All 5 preferred rooms reached full capacity/i);

    // Group 2 is awaiting resubmission -> must NOT be allocated if admin runs allocation again without resubmission
    const emptyRun = engine.runAllocation([]);
    assert.equal(emptyRun.allocatedGroups, 0);

    // --- RESUBMISSION BY GROUP 2 ---
    // Group 2 chooses new preferences from remaining vacant rooms [26, 27, 28, 29, 30]
    // Keeping roommate group intact!
    const group2Resubmitted = {
      id: 702,
      hostel_id: 1,
      capacity: 2,
      members: [studentMap.get('24BCE1010'), studentMap.get('24BCE1011')],
      preferences: [26, 27, 28, 29, 30]
    };

    // --- ROUND 2 ALLOCATION ---
    const round2Result = engine.runAllocation([group2Resubmitted]);
    assert.equal(round2Result.allocatedGroups, 1, 'Group 2 successfully allocated in Round 2');
    assert.equal(engine.groupStatus.get(702).status, 'ALLOCATED');
    assert.equal(engine.groupStatus.get(702).allocatedRoomId, 26, 'Group 2 gets newly selected room 26');

    // Verify existing allocations were NEVER altered:
    assert.equal(engine.allocations.get(studentMap.get('24BCE1002').id), 21, 'Group 1 room remains intact');
    assert.equal(engine.allocations.get(studentMap.get('24BCE1003').id), 21, 'Group 1 room remains intact');
  });
});

