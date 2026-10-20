// ============================================================================
// MERIT-BASED ALLOCATION ENGINE (Pure Algorithm + MySQL Transaction Runner)
// Fully deterministic, transaction-safe, idempotent, with preference fallback
// ============================================================================

import pool from '../config/db.js';
import { logAudit } from './auditService.js';

/**
 * PURE ALLOCATION ALGORITHM
 * Independent of DB calls - easy to unit test and verify all edge cases.
 * 
 * @param {Array} applications - Array of applications with group and preference info
 * @param {Array} rooms - Array of all rooms in inventory
 * @param {Set} initialOccupiedRoomIds - Set of room IDs already occupied
 * @returns {Object} { allocations, unallocated, summary }
 */
export function runPureAllocation(applications, rooms, initialOccupiedRoomIds = new Set()) {
  const roomMap = new Map(rooms.map(r => [r.id, r]));
  const occupiedRoomIds = new Set(initialOccupiedRoomIds);
  const allocatedStudentIds = new Set();

  // 1. Sort applications strictly by leader merit rank ascending (Rank 1 highest)
  // Deterministic tie-breaker: application id
  const sortedApps = [...applications].sort((a, b) => {
    if (a.leader_rank !== b.leader_rank) {
      return a.leader_rank - b.leader_rank;
    }
    return a.id - b.id;
  });

  const allocations = [];
  const unallocated = [];
  const prefCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalAllocatedStudents = 0;

  for (const app of sortedApps) {
    const { id: appId, group_id: groupId, target_capacity, member_student_ids, preferences } = app;

    // Validate member list matches capacity
    if (!member_student_ids || member_student_ids.length !== target_capacity) {
      unallocated.push({
        application_id: appId,
        group_id: groupId,
        reason: 'INVALID_APPLICATION',
        notes: `Member count (${member_student_ids ? member_student_ids.length : 0}) does not match target capacity (${target_capacity})`
      });
      continue;
    }

    // Check if any member was already allocated in this run (invariant guard)
    const alreadyAllocatedMember = member_student_ids.find(sId => allocatedStudentIds.has(sId));
    if (alreadyAllocatedMember) {
      unallocated.push({
        application_id: appId,
        group_id: groupId,
        reason: 'INVALID_APPLICATION',
        notes: `Student ID ${alreadyAllocatedMember} was already allocated in another group`
      });
      continue;
    }

    let allocatedRoom = null;
    let satisfiedPrefRank = null;

    // Try preferences strictly in order: 1 -> 2 -> 3 -> 4 -> 5
    // Preferences array should be sorted by preference_rank ascending
    const sortedPrefs = [...(preferences || [])].sort((p1, p2) => p1.preference_rank - p2.preference_rank);

    for (const pref of sortedPrefs) {
      const room = roomMap.get(pref.room_id);

      // Verify room exists and is active
      if (!room || room.is_active === false) continue;

      // Verify room capacity strictly matches group capacity
      if (room.capacity !== target_capacity) continue;

      // Verify room is not yet reserved/occupied in current batch
      if (occupiedRoomIds.has(room.id)) continue;

      // Room is available and eligible!
      allocatedRoom = room;
      satisfiedPrefRank = pref.preference_rank;
      break;
    }

    if (allocatedRoom) {
      // Reserve room exclusively for this entire group
      occupiedRoomIds.add(allocatedRoom.id);
      member_student_ids.forEach(sId => allocatedStudentIds.add(sId));

      allocations.push({
        application_id: appId,
        group_id: groupId,
        room_id: allocatedRoom.id,
        room_number: allocatedRoom.room_number,
        block_id: allocatedRoom.block_id,
        preference_rank_satisfied: satisfiedPrefRank,
        member_student_ids: [...member_student_ids],
        target_capacity
      });

      prefCounts[satisfiedPrefRank] = (prefCounts[satisfiedPrefRank] || 0) + 1;
      totalAllocatedStudents += member_student_ids.length;
    } else {
      // None of the 5 preferences was available
      unallocated.push({
        application_id: appId,
        group_id: groupId,
        reason: 'NO_PREFERENCE_AVAILABLE',
        notes: 'All 5 ranked preferences were either already occupied by higher-merit groups or unavailable',
        leader_rank: app.leader_rank
      });
    }
  }

  return {
    allocations,
    unallocated,
    summary: {
      totalApplicationsProcessed: sortedApps.length,
      totalAllocatedGroups: allocations.length,
      totalAllocatedStudents,
      totalWaitlistedGroups: unallocated.length,
      pref1Count: prefCounts[1] || 0,
      pref2Count: prefCounts[2] || 0,
      pref3Count: prefCounts[3] || 0,
      pref4Count: prefCounts[4] || 0,
      pref5Count: prefCounts[5] || 0
    }
  };
}

/**
 * DATABASE TRANSACTION RUNNER
 * Executes allocation within an ACID transaction with row locks and idempotency.
 */
export async function executeBatchAllocation(batchId, adminId, ipAddress = null) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Verify batch exists and is in CLOSED status (Submissions ended)
    const [batches] = await connection.query(
      'SELECT id, batch_name, status FROM batches WHERE id = ? FOR UPDATE',
      [batchId]
    );

    if (batches.length === 0) {
      throw new Error(`Batch ID ${batchId} not found`);
    }

    const batch = batches[0];
    if (batch.status === 'OPEN') {
      throw new Error('Application submissions are still OPEN. You must close submissions before triggering allocation.');
    }
    if (batch.status === 'PUBLISHED') {
      throw new Error('Batch results are already PUBLISHED. Cannot re-run allocation on a published batch.');
    }

    // 2. Mark previous run for this batch as SUPERSEDED if re-running draft allocation
    await connection.query(
      "UPDATE allocation_runs SET status = 'SUPERSEDED' WHERE batch_id = ? AND status = 'COMPLETED'",
      [batchId]
    );
    // Delete draft allocations from superseded run
    await connection.query('DELETE FROM room_allocations WHERE batch_id = ? AND status = "ACTIVE"', [batchId]);
    await connection.query('DELETE FROM allocations WHERE batch_id = ? AND status = "ACTIVE"', [batchId]);
    await connection.query('DELETE FROM unallocated_records WHERE batch_id = ?', [batchId]);

    // 3. Create new allocation_runs record
    const [runResult] = await connection.query(`
      INSERT INTO allocation_runs (batch_id, initiated_by_admin_id, started_at, status)
      VALUES (?, ?, NOW(), 'RUNNING')
    `, [batchId, adminId]);
    const runId = runResult.insertId;

    // 4. Load all active physical rooms
    const [rooms] = await connection.query(`
      SELECT id, block_id, room_number, capacity, room_type, is_active 
      FROM rooms 
      WHERE is_active = TRUE
      FOR UPDATE
    `);

    // 5. Load all eligible submitted applications with calculated leader and preferences
    const [appsData] = await connection.query(`
      SELECT 
        a.id AS application_id,
        a.group_id,
        g.target_capacity,
        g.calculated_leader_id,
        g.leader_rank
      FROM applications a
      JOIN application_groups g ON a.group_id = g.id
      WHERE a.batch_id = ? AND a.status = 'SUBMITTED'
      ORDER BY g.leader_rank ASC, a.id ASC
    `, [batchId]);

    // 6. Load group members for these applications
    const [membersData] = await connection.query(`
      SELECT group_id, student_id
      FROM group_members
      WHERE batch_id = ?
    `, [batchId]);

    const membersByGroup = new Map();
    for (const m of membersData) {
      if (!membersByGroup.has(m.group_id)) membersByGroup.set(m.group_id, []);
      membersByGroup.get(m.group_id).push(m.student_id);
    }

    // 7. Load 5 preferences for each application
    const [prefsData] = await connection.query(`
      SELECT rp.application_id, rp.preference_rank, rp.room_id
      FROM room_preferences rp
      JOIN applications a ON rp.application_id = a.id
      WHERE a.batch_id = ?
      ORDER BY rp.application_id ASC, rp.preference_rank ASC
    `, [batchId]);

    const prefsByApp = new Map();
    for (const p of prefsData) {
      if (!prefsByApp.has(p.application_id)) prefsByApp.set(p.application_id, []);
      prefsByApp.get(p.application_id).push({
        preference_rank: p.preference_rank,
        room_id: p.room_id
      });
    }

    // Prepare inputs for pure allocation engine
    const preparedApps = appsData.map(app => ({
      id: app.application_id,
      group_id: app.group_id,
      target_capacity: app.target_capacity,
      leader_rank: app.leader_rank,
      member_student_ids: membersByGroup.get(app.group_id) || [],
      preferences: prefsByApp.get(app.application_id) || []
    }));

    // 8. Execute Pure Merit Allocation Algorithm
    const { allocations, unallocated, summary } = runPureAllocation(preparedApps, rooms);

    // 9. Persist Allocation Records (Enforces uk_batch_room and uk_batch_student at DB level)
    for (const alloc of allocations) {
      // Application-level room reservation (enforces uk_batch_room)
      await connection.query(`
        INSERT INTO room_allocations (run_id, batch_id, application_id, group_id, room_id, preference_rank_satisfied, status)
        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
      `, [runId, batchId, alloc.application_id, alloc.group_id, alloc.room_id, alloc.preference_rank_satisfied]);

      // Student-level allocation assignment (enforces uk_batch_student)
      for (const studentId of alloc.member_student_ids) {
        await connection.query(`
          INSERT INTO allocations (run_id, batch_id, application_id, group_id, student_id, room_id, preference_rank_satisfied, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
        `, [runId, batchId, alloc.application_id, alloc.group_id, studentId, alloc.room_id, alloc.preference_rank_satisfied]);
      }

      await connection.query(`
        UPDATE applications SET status = 'ALLOCATED' WHERE id = ?
      `, [alloc.application_id]);
    }

    // 10. Persist Unallocated/Waitlisted Records
    for (const unalloc of unallocated) {
      await connection.query(`
        INSERT INTO unallocated_records (run_id, batch_id, application_id, group_id, reason, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [runId, batchId, unalloc.application_id, unalloc.group_id, unalloc.reason, unalloc.notes]);

      await connection.query(`
        UPDATE applications SET status = 'WAITLISTED' WHERE id = ?
      `, [unalloc.application_id]);
    }

    // 11. Update allocation run record and batch status
    await connection.query(`
      UPDATE allocation_runs
      SET 
        status = 'COMPLETED',
        completed_at = NOW(),
        total_applications_processed = ?,
        total_allocated_groups = ?,
        total_allocated_students = ?,
        total_waitlisted_groups = ?,
        pref_1_count = ?,
        pref_2_count = ?,
        pref_3_count = ?,
        pref_4_count = ?,
        pref_5_count = ?,
        summary_notes = ?
      WHERE id = ?
    `, [
      summary.totalApplicationsProcessed,
      summary.totalAllocatedGroups,
      summary.totalAllocatedStudents,
      summary.totalWaitlistedGroups,
      summary.pref1Count,
      summary.pref2Count,
      summary.pref3Count,
      summary.pref4Count,
      summary.pref5Count,
      `Allocated ${summary.totalAllocatedGroups} groups (${summary.totalAllocatedStudents} scholars). ${summary.totalWaitlistedGroups} waitlisted.`,
      runId
    ]);

    await connection.query(`
      UPDATE batches SET status = 'ALLOCATED' WHERE id = ?
    `, [batchId]);

    // 12. Write Audit Log
    await logAudit({
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'TRIGGER_ALLOCATION',
      entityType: 'BATCH',
      entityId: batchId,
      details: { runId, summary },
      ipAddress,
      connection
    });

    await connection.commit();

    return {
      success: true,
      runId,
      batchId,
      summary,
      allocationsCount: allocations.length,
      waitlistedCount: unallocated.length
    };
  } catch (error) {
    await connection.rollback();
    console.error('Batch allocation transaction failed, rolled back:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * PUBLISH ALLOCATION RESULTS
 * Changes batch status to PUBLISHED so students can view their room results.
 */
export async function publishBatchAllocation(batchId, adminId, ipAddress = null) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [batches] = await connection.query('SELECT status FROM batches WHERE id = ? FOR UPDATE', [batchId]);
    if (batches.length === 0) throw new Error('Batch not found');
    if (batches[0].status !== 'ALLOCATED') {
      throw new Error(`Cannot publish batch in status ${batches[0].status}. Must be ALLOCATED first.`);
    }

    await connection.query("UPDATE batches SET status = 'PUBLISHED' WHERE id = ?", [batchId]);

    await logAudit({
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'PUBLISH_ALLOCATION_RESULTS',
      entityType: 'BATCH',
      entityId: batchId,
      ipAddress,
      connection
    });

    await connection.commit();
    return { success: true, message: 'Batch allocation results published successfully.' };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * VACATE BATCH ROOMS
 * Marks active allocations as VACATED so rooms become reusable in subsequent batches
 * while preserving complete historical audit records.
 */
export async function vacateBatchRooms(batchId, adminId, ipAddress = null) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [batches] = await connection.query('SELECT status FROM batches WHERE id = ? FOR UPDATE', [batchId]);
    if (batches.length === 0) throw new Error('Batch not found');

    await connection.query(`
      UPDATE room_allocations 
      SET status = 'VACATED', vacated_at = NOW() 
      WHERE batch_id = ? AND status = 'ACTIVE'
    `, [batchId]);

    const [updateResult] = await connection.query(`
      UPDATE allocations 
      SET status = 'VACATED', vacated_at = NOW() 
      WHERE batch_id = ? AND status = 'ACTIVE'
    `, [batchId]);

    await connection.query("UPDATE batches SET status = 'ARCHIVED' WHERE id = ?", [batchId]);

    await logAudit({
      actorType: 'ADMIN',
      actorId: adminId,
      action: 'VACATE_BATCH_ROOMS',
      entityType: 'BATCH',
      entityId: batchId,
      details: { vacatedAllocations: updateResult.affectedRows },
      ipAddress,
      connection
    });

    await connection.commit();
    return {
      success: true,
      message: `Successfully vacated ${updateResult.affectedRows} allocations. Rooms are now reusable for subsequent batches.`,
      vacatedCount: updateResult.affectedRows
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

