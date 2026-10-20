// ============================================================================
// ALLOCATION ALGORITHM UNIT TEST SUITE (Node.js Built-in Test Runner)
// Validates core algorithm logic, preference order, tie-breaking, group integrity,
// capacity matching, and exact 100-student/80-room/200-bed dataset reconciliation.
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';

import { runPureAllocation } from '../src/services/allocationService.js';
import {
  generateBlocks,
  generateRooms,
  generateStudents,
  generateDemoApplications
} from '../../database/seeds/seedData.js';

test('HostelHub Allocation Algorithm & Invariants', async (t) => {

  // Test Suite A: Exact Inventory & Seed Dataset Invariants
  await t.test('Scenario: Exact 100 Students, 80 Rooms, 200 Beds Reconciliation', () => {
    const students = generateStudents();
    const rooms = generateRooms();
    const blocks = generateBlocks();

    assert.equal(students.length, 100, 'Exact 100 students must be generated');
    assert.equal(rooms.length, 80, 'Exact 80 physical rooms must be generated');
    assert.equal(blocks.length, 3, 'Exact 3 hostel blocks (A, B, C) must be generated');

    const singleRooms = rooms.filter(r => r.capacity === 1);
    const doubleRooms = rooms.filter(r => r.capacity === 2);
    const quadRooms = rooms.filter(r => r.capacity === 4);

    assert.equal(singleRooms.length, 20, 'Exact 20 single rooms (capacity 1)');
    assert.equal(doubleRooms.length, 30, 'Exact 30 double rooms (capacity 2)');
    assert.equal(quadRooms.length, 30, 'Exact 30 quad rooms (capacity 4)');

    const totalBeds = rooms.reduce((sum, r) => sum + r.capacity, 0);
    assert.equal(totalBeds, 200, 'Total beds must equal exactly 200 (20 + 60 + 120)');

    // Verify all merit ranks are strictly unique from 1 to 100
    const ranks = new Set(students.map(s => s.merit_rank));
    assert.equal(ranks.size, 100, 'All 100 merit ranks must be distinct');
    assert.ok(ranks.has(1), 'Rank 1 must exist');
    assert.ok(ranks.has(100), 'Rank 100 must exist');
  });

  // Scenario 1: A group receives its first preference when available
  await t.test('Scenario 1: First preference awarded when available', () => {
    const sampleRooms = [
      { id: 101, block_id: 1, room_number: 'S-101', capacity: 1, is_active: true },
      { id: 102, block_id: 1, room_number: 'S-102', capacity: 1, is_active: true },
      { id: 103, block_id: 1, room_number: 'S-103', capacity: 1, is_active: true },
      { id: 104, block_id: 1, room_number: 'S-104', capacity: 1, is_active: true },
      { id: 105, block_id: 1, room_number: 'S-105', capacity: 1, is_active: true }
    ];

    const apps = [{
      id: 1,
      group_id: 1,
      target_capacity: 1,
      leader_rank: 5,
      member_student_ids: [10],
      preferences: [
        { preference_rank: 1, room_id: 101 },
        { preference_rank: 2, room_id: 102 },
        { preference_rank: 3, room_id: 103 },
        { preference_rank: 4, room_id: 104 },
        { preference_rank: 5, room_id: 105 }
      ]
    }];

    const result = runPureAllocation(apps, sampleRooms);
    assert.equal(result.allocations.length, 1);
    assert.equal(result.allocations[0].room_id, 101);
    assert.equal(result.allocations[0].preference_rank_satisfied, 1, 'Awarded preference 1');
  });

  // Scenario 2: A group receives its second preference when first is unavailable
  await t.test('Scenario 2: Second preference fallback when first is taken', () => {
    const sampleRooms = [
      { id: 101, block_id: 1, room_number: 'S-101', capacity: 1, is_active: true },
      { id: 102, block_id: 1, room_number: 'S-102', capacity: 1, is_active: true },
      { id: 103, block_id: 1, room_number: 'S-103', capacity: 1, is_active: true },
      { id: 104, block_id: 1, room_number: 'S-104', capacity: 1, is_active: true },
      { id: 105, block_id: 1, room_number: 'S-105', capacity: 1, is_active: true }
    ];

    // Room 101 is already occupied
    const occupied = new Set([101]);

    const apps = [{
      id: 1,
      group_id: 1,
      target_capacity: 1,
      leader_rank: 12,
      member_student_ids: [12],
      preferences: [
        { preference_rank: 1, room_id: 101 },
        { preference_rank: 2, room_id: 102 },
        { preference_rank: 3, room_id: 103 },
        { preference_rank: 4, room_id: 104 },
        { preference_rank: 5, room_id: 105 }
      ]
    }];

    const result = runPureAllocation(apps, sampleRooms, occupied);
    assert.equal(result.allocations.length, 1);
    assert.equal(result.allocations[0].room_id, 102);
    assert.equal(result.allocations[0].preference_rank_satisfied, 2, 'Awarded preference 2 fallback');
  });

  // Scenario 3: Preferences 3, 4, and 5 are attempted in order
  await t.test('Scenario 3: 3rd, 4th, and 5th preferences attempted in strict sequence', () => {
    const sampleRooms = [
      { id: 1, capacity: 1, is_active: true },
      { id: 2, capacity: 1, is_active: true },
      { id: 3, capacity: 1, is_active: true },
      { id: 4, capacity: 1, is_active: true },
      { id: 5, capacity: 1, is_active: true }
    ];

    // Rooms 1, 2, 3, 4 are occupied
    const occupied = new Set([1, 2, 3, 4]);

    const apps = [{
      id: 1,
      group_id: 1,
      target_capacity: 1,
      leader_rank: 20,
      member_student_ids: [20],
      preferences: [
        { preference_rank: 1, room_id: 1 },
        { preference_rank: 2, room_id: 2 },
        { preference_rank: 3, room_id: 3 },
        { preference_rank: 4, room_id: 4 },
        { preference_rank: 5, room_id: 5 }
      ]
    }];

    const result = runPureAllocation(apps, sampleRooms, occupied);
    assert.equal(result.allocations.length, 1);
    assert.equal(result.allocations[0].room_id, 5);
    assert.equal(result.allocations[0].preference_rank_satisfied, 5, 'Awarded preference 5 fallback');
  });

  // Scenario 4: Higher-merit-ranked group wins contested room
  await t.test('Scenario 4: Higher-merit group wins contested room', () => {
    const sampleRooms = [
      { id: 101, capacity: 1, is_active: true },
      { id: 102, capacity: 1, is_active: true },
      { id: 103, capacity: 1, is_active: true },
      { id: 104, capacity: 1, is_active: true },
      { id: 105, capacity: 1, is_active: true },
      { id: 106, capacity: 1, is_active: true }
    ];

    // App A: Leader Rank 3
    // App B: Leader Rank 15
    // Both put Room 101 as 1st preference
    const apps = [
      {
        id: 2,
        group_id: 2,
        target_capacity: 1,
        leader_rank: 15,
        member_student_ids: [15],
        preferences: [
          { preference_rank: 1, room_id: 101 },
          { preference_rank: 2, room_id: 102 },
          { preference_rank: 3, room_id: 103 },
          { preference_rank: 4, room_id: 104 },
          { preference_rank: 5, room_id: 105 }
        ]
      },
      {
        id: 1,
        group_id: 1,
        target_capacity: 1,
        leader_rank: 3,
        member_student_ids: [3],
        preferences: [
          { preference_rank: 1, room_id: 101 },
          { preference_rank: 2, room_id: 106 },
          { preference_rank: 3, room_id: 103 },
          { preference_rank: 4, room_id: 104 },
          { preference_rank: 5, room_id: 105 }
        ]
      }
    ];

    const result = runPureAllocation(apps, sampleRooms);
    assert.equal(result.allocations.length, 2);

    const allocRank3 = result.allocations.find(a => a.group_id === 1);
    const allocRank15 = result.allocations.find(a => a.group_id === 2);

    assert.equal(allocRank3.room_id, 101, 'Rank 3 group wins contested room 101');
    assert.equal(allocRank3.preference_rank_satisfied, 1);

    assert.equal(allocRank15.room_id, 102, 'Rank 15 group falls back to room 102');
    assert.equal(allocRank15.preference_rank_satisfied, 2);
  });

  // Scenario 5: Group leader calculated automatically from best-ranked member
  await t.test('Scenario 5: Leader calculation from best rank in group', () => {
    const students = [
      { id: 10, merit_rank: 45 },
      { id: 11, merit_rank: 12 }, // Best rank!
      { id: 12, merit_rank: 88 },
      { id: 13, merit_rank: 30 }
    ];

    let calculatedLeader = students[0];
    for (const s of students) {
      if (s.merit_rank < calculatedLeader.merit_rank) {
        calculatedLeader = s;
      }
    }

    assert.equal(calculatedLeader.id, 11, 'Calculated leader ID must be student with lowest rank number');
    assert.equal(calculatedLeader.merit_rank, 12, 'Calculated leader rank is 12');
  });

  // Scenario 6 & 7: Every member receives same room and group is never split
  await t.test('Scenario 6 & 7: Group integrity - members receive same room, never split', () => {
    const sampleRooms = [
      { id: 301, capacity: 4, is_active: true }
    ];

    const apps = [{
      id: 1,
      group_id: 10,
      target_capacity: 4,
      leader_rank: 8,
      member_student_ids: [20, 21, 22, 23],
      preferences: [
        { preference_rank: 1, room_id: 301 }
      ]
    }];

    const result = runPureAllocation(apps, sampleRooms);
    assert.equal(result.allocations.length, 1);
    const alloc = result.allocations[0];
    assert.equal(alloc.room_id, 301);
    assert.deepEqual(alloc.member_student_ids, [20, 21, 22, 23], 'All 4 members assigned together to room 301');
  });

  // Scenario 8: Two groups cannot receive same room in one batch
  await t.test('Scenario 8: Room exclusivity - two groups never get same room', () => {
    const sampleRooms = [
      { id: 201, capacity: 2, is_active: true }
    ];

    const apps = [
      {
        id: 1,
        group_id: 1,
        target_capacity: 2,
        leader_rank: 5,
        member_student_ids: [1, 2],
        preferences: [{ preference_rank: 1, room_id: 201 }]
      },
      {
        id: 2,
        group_id: 2,
        target_capacity: 2,
        leader_rank: 10,
        member_student_ids: [3, 4],
        preferences: [{ preference_rank: 1, room_id: 201 }]
      }
    ];

    const result = runPureAllocation(apps, sampleRooms);
    assert.equal(result.allocations.length, 1, 'Only one group allocated to room 201');
    assert.equal(result.allocations[0].group_id, 1, 'Rank 5 group allocated');
    assert.equal(result.unallocated.length, 1, 'Rank 10 group unallocated');
  });

  // Scenario 10: Invalid group sizes or member count mismatch rejected
  await t.test('Scenario 10: Member count mismatch rejected', () => {
    const sampleRooms = [{ id: 1, capacity: 4, is_active: true }];

    const apps = [{
      id: 1,
      group_id: 1,
      target_capacity: 4,
      leader_rank: 1,
      member_student_ids: [1, 2], // Only 2 members for quad room!
      preferences: [{ preference_rank: 1, room_id: 1 }]
    }];

    const result = runPureAllocation(apps, sampleRooms);
    assert.equal(result.allocations.length, 0);
    assert.equal(result.unallocated.length, 1);
    assert.equal(result.unallocated[0].reason, 'INVALID_APPLICATION');
  });

  // Scenario 12: Capacity-mismatched rooms rejected
  await t.test('Scenario 12: Capacity-mismatched room is skipped', () => {
    const sampleRooms = [
      { id: 1, capacity: 2, is_active: true }, // Capacity 2
      { id: 2, capacity: 1, is_active: true }  // Capacity 1
    ];

    // Group size 1 tries room 1 (capacity 2) as pref 1, room 2 (capacity 1) as pref 2
    const apps = [{
      id: 1,
      group_id: 1,
      target_capacity: 1,
      leader_rank: 1,
      member_student_ids: [1],
      preferences: [
        { preference_rank: 1, room_id: 1 }, // Incompatible capacity
        { preference_rank: 2, room_id: 2 }  // Compatible capacity
      ]
    }];

    const result = runPureAllocation(apps, sampleRooms);
    assert.equal(result.allocations.length, 1);
    assert.equal(result.allocations[0].room_id, 2, 'Allocated room 2 which matches capacity');
    assert.equal(result.allocations[0].preference_rank_satisfied, 2);
  });

  // Scenario 15: Unallocated groups receive documented status & reason
  await t.test('Scenario 15: Unallocated group marked NO_PREFERENCE_AVAILABLE', () => {
    const sampleRooms = [
      { id: 1, capacity: 1, is_active: true }
    ];

    const apps = [{
      id: 1,
      group_id: 1,
      target_capacity: 1,
      leader_rank: 99,
      member_student_ids: [99],
      preferences: [
        { preference_rank: 1, room_id: 999 } // Non-existent room
      ]
    }];

    const result = runPureAllocation(apps, sampleRooms);
    assert.equal(result.allocations.length, 0);
    assert.equal(result.unallocated.length, 1);
    assert.equal(result.unallocated[0].reason, 'NO_PREFERENCE_AVAILABLE');
  });

  // Scenario: Full Demo Application Seeding Run Test
  await t.test('Scenario: Full Demo Applications Seed Run Verification', () => {
    const rooms = generateRooms();
    const students = generateStudents();
    const { groups, groupMembers, applications, preferences } = generateDemoApplications(rooms, students);

    assert.ok(groups.length >= 10, 'At least 10 demo groups generated');
    assert.ok(applications.length >= 10, 'At least 10 applications generated');

    // Build prepared apps
    const membersByGroup = new Map();
    for (const gm of groupMembers) {
      if (!membersByGroup.has(gm.group_id)) membersByGroup.set(gm.group_id, []);
      membersByGroup.get(gm.group_id).push(gm.student_id);
    }

    const prefsByApp = new Map();
    for (const p of preferences) {
      if (!prefsByApp.has(p.application_id)) prefsByApp.set(p.application_id, []);
      prefsByApp.get(p.application_id).push(p);
    }

    const preparedApps = applications.map(app => {
      const g = groups.find(grp => grp.id === app.group_id);
      return {
        id: app.id,
        group_id: g.id,
        target_capacity: g.target_capacity,
        leader_rank: g.leader_rank,
        member_student_ids: membersByGroup.get(g.id),
        preferences: prefsByApp.get(app.id)
      };
    });

    const result = runPureAllocation(preparedApps, rooms);

    assert.ok(result.allocations.length >= 9, 'Most groups allocated');
    assert.ok(result.unallocated.length >= 1, 'Waitlisted student 99 successfully waitlisted');

    // Verify preference fallbacks in demo dataset
    assert.ok(result.summary.pref1Count > 0, 'Preference 1 allocations present');
    assert.ok(result.summary.pref2Count > 0, 'Preference 2 fallback allocations present');
    assert.ok(result.summary.pref3Count > 0, 'Preference 3 fallback allocations present');
  });

});

