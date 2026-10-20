// ============================================================================
// Application & Preferences Controller
// ============================================================================

import pool from '../config/db.js';
import { logAudit } from '../services/auditService.js';

// PUT /api/applications/:id/preferences
// Saves or reorders exactly 5 distinct, capacity-matching room preferences
export const savePreferences = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const applicationId = req.params.id;
    const studentId = req.user.id;
    const { room_ids } = req.body; // Array of 5 room IDs in ranked order [rank1, rank2, rank3, rank4, rank5]

    if (!Array.isArray(room_ids) || room_ids.length !== 5) {
      return res.status(400).json({
        success: false,
        message: 'Exactly five (5) ranked room preferences are required.'
      });
    }

    // Check for duplicate room IDs
    const distinctRooms = new Set(room_ids);
    if (distinctRooms.size !== 5) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate room selections are not allowed. All five preferences must be distinct.'
      });
    }

    await connection.beginTransaction();

    // 1. Fetch application, group, and batch details
    const [apps] = await connection.query(`
      SELECT 
        a.id, a.status, a.batch_id,
        ag.id AS group_id, ag.target_capacity, ag.calculated_leader_id, ag.is_locked,
        b.status AS batch_status
      FROM applications a
      JOIN application_groups ag ON a.group_id = ag.id
      JOIN batches b ON a.batch_id = b.id
      WHERE a.id = ? FOR UPDATE
    `, [applicationId]);

    if (apps.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const app = apps[0];

    // Check submission permissions
    if (app.batch_status !== 'OPEN') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Application deadline passed. Submissions are closed.' });
    }
    if (app.status === 'SUBMITTED' || app.is_locked) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Application is locked against modification after submission.' });
    }

    // Ensure requester is a member of the group
    const [membership] = await connection.query(
      'SELECT id FROM group_members WHERE group_id = ? AND student_id = ?',
      [app.group_id, studentId]
    );
    if (membership.length === 0 && req.user.role !== 'ADMIN') {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'Unauthorized. You are not a member of this application group.' });
    }

    // 2. Validate all 5 rooms exist, are active, and match group's target capacity
    const [rooms] = await connection.query(`
      SELECT id, room_number, capacity, is_active 
      FROM rooms 
      WHERE id IN (?, ?, ?, ?, ?)
    `, room_ids);

    if (rooms.length !== 5) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'One or more selected rooms do not exist in the active inventory.' });
    }

    for (const r of rooms) {
      if (!r.is_active) {
        await connection.rollback();
        return res.status(400).json({ success: false, message: `Room ${r.room_number} is currently marked inactive.` });
      }
      if (r.capacity !== app.target_capacity) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Capacity mismatch: Room ${r.room_number} has capacity ${r.capacity}, but group target is ${app.target_capacity}.`
        });
      }
    }

    // 3. Atomically replace preferences
    await connection.query('DELETE FROM room_preferences WHERE application_id = ?', [applicationId]);

    for (let rank = 1; rank <= 5; rank++) {
      const roomId = room_ids[rank - 1];
      await connection.query(`
        INSERT INTO room_preferences (application_id, preference_rank, room_id)
        VALUES (?, ?, ?)
      `, [applicationId, rank, roomId]);
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Five ranked room preferences saved successfully.',
      preferences: room_ids.map((roomId, index) => ({
        preference_rank: index + 1,
        room_id: roomId
      }))
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// POST /api/applications/:id/submit
// Locks the application against editing. Does NOT trigger immediate allocation.
export const submitApplication = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const applicationId = req.params.id;
    const studentId = req.user.id;

    await connection.beginTransaction();

    const [apps] = await connection.query(`
      SELECT 
        a.id, a.status, a.batch_id,
        ag.id AS group_id, ag.target_capacity, ag.calculated_leader_id, ag.is_locked,
        b.status AS batch_status
      FROM applications a
      JOIN application_groups ag ON a.group_id = ag.id
      JOIN batches b ON a.batch_id = b.id
      WHERE a.id = ? FOR UPDATE
    `, [applicationId]);

    if (apps.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    const app = apps[0];

    if (app.batch_status !== 'OPEN') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Application window is closed.' });
    }
    if (app.status === 'SUBMITTED' || app.is_locked) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Application has already been submitted and locked.' });
    }

    // Only group leader can submit on behalf of group
    if (app.calculated_leader_id !== studentId && req.user.role !== 'ADMIN') {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Only the calculated group leader (member with highest merit rank) can submit the application.'
      });
    }

    // 1. Verify group has required member count for target capacity
    const [members] = await connection.query('SELECT student_id FROM group_members WHERE group_id = ?', [app.group_id]);
    if (members.length !== app.target_capacity) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Incomplete group. Group currently has ${members.length} member(s), but requires exactly ${app.target_capacity}.`
      });
    }

    // 2. Verify exactly 5 preferences are saved
    const [prefs] = await connection.query(
      'SELECT id FROM room_preferences WHERE application_id = ?',
      [applicationId]
    );
    if (prefs.length !== 5) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Application must have exactly 5 saved preferences before submission. Currently has ${prefs.length}.`
      });
    }

    // 3. Mark SUBMITTED and lock group
    await connection.query(`
      UPDATE applications 
      SET status = 'SUBMITTED', submitted_at = NOW() 
      WHERE id = ?
    `, [applicationId]);

    await connection.query(`
      UPDATE application_groups 
      SET is_locked = TRUE 
      WHERE id = ?
    `, [app.group_id]);

    await logAudit({
      actorType: 'STUDENT',
      actorId: studentId,
      action: 'SUBMIT_APPLICATION',
      entityType: 'APPLICATION',
      entityId: applicationId,
      details: { groupId: app.group_id, memberCount: members.length },
      ipAddress: req.ip,
      connection
    });

    await connection.commit();

    res.json({
      success: true,
      message: 'Application submitted and locked successfully. Room allocation will be processed after submissions close.',
      applicationId,
      status: 'SUBMITTED'
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// GET /api/applications/:id/result
export const getApplicationResult = async (req, res, next) => {
  try {
    const applicationId = req.params.id;

    // Check batch status
    const [apps] = await pool.query(`
      SELECT a.*, b.status AS batch_status
      FROM applications a
      JOIN batches b ON a.batch_id = b.id
      WHERE a.id = ?
    `, [applicationId]);

    if (apps.length === 0) return res.status(404).json({ success: false, message: 'Application not found' });
    const app = apps[0];

    // Students cannot view unpublished results!
    if (app.batch_status !== 'PUBLISHED' && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Allocation results have not yet been published by the administration.'
      });
    }

    const [allocations] = await pool.query(`
      SELECT 
        al.id, al.preference_rank_satisfied, al.status, al.allocated_at,
        r.room_number, r.room_type, r.capacity, r.floor,
        hb.block_name,
        s.id AS student_id, s.full_name AS student_name, s.registration_number, s.merit_rank
      FROM allocations al
      JOIN rooms r ON al.room_id = r.id
      JOIN hostel_blocks hb ON r.block_id = hb.id
      JOIN students s ON al.student_id = s.id
      WHERE al.application_id = ? AND al.status = 'ACTIVE'
    `, [applicationId]);

    if (allocations.length > 0) {
      return res.json({
        success: true,
        status: 'ALLOCATED',
        preferenceRankSatisfied: allocations[0].preference_rank_satisfied,
        room: {
          room_number: allocations[0].room_number,
          block_name: allocations[0].block_name,
          room_type: allocations[0].room_type,
          capacity: allocations[0].capacity,
          floor: allocations[0].floor
        },
        allocatedMembers: allocations.map(a => ({
          student_id: a.student_id,
          name: a.student_name,
          registration_number: a.registration_number,
          merit_rank: a.merit_rank
        }))
      });
    }

    // Check waitlisted
    const [unalloc] = await pool.query(`
      SELECT reason, notes, created_at FROM unallocated_records WHERE application_id = ?
    `, [applicationId]);

    if (unalloc.length > 0) {
      return res.json({
        success: true,
        status: 'WAITLISTED',
        reason: unalloc[0].reason,
        notes: unalloc[0].notes
      });
    }

    res.json({
      success: true,
      status: app.status,
      message: 'No final allocation record found for this application.'
    });
  } catch (err) {
    next(err);
  }
};

