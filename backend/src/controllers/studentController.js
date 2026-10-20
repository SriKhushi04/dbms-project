// ============================================================================
// Student Controller
// ============================================================================

import pool from '../config/db.js';

// GET /api/students/me
export const getMyProfile = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const [students] = await pool.query(
      'SELECT id, registration_number, full_name, email, gender, academic_branch, year_of_study, merit_rank FROM students WHERE id = ?',
      [studentId]
    );

    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student profile not found' });
    }

    res.json({ success: true, student: students[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/students/me/application
// Loads active batch, student's group, members, preferences, and published allocation outcome
export const getMyApplication = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    // 1. Get latest active batch
    const [batches] = await pool.query('SELECT * FROM batches ORDER BY id DESC LIMIT 1');
    if (batches.length === 0) {
      return res.json({ success: true, batch: null, application: null });
    }
    const batch = batches[0];

    // 2. Find group membership in current batch
    const [memberships] = await pool.query(`
      SELECT gm.group_id, ag.group_code, ag.target_capacity, ag.calculated_leader_id, ag.leader_rank, ag.is_locked
      FROM group_members gm
      JOIN application_groups ag ON gm.group_id = ag.id
      WHERE gm.student_id = ? AND gm.batch_id = ?
    `, [studentId, batch.id]);

    if (memberships.length === 0) {
      return res.json({
        success: true,
        batch,
        group: null,
        application: null
      });
    }

    const groupMeta = memberships[0];

    // 3. Get all group members with merit ranks
    const [groupMembers] = await pool.query(`
      SELECT s.id, s.registration_number, s.full_name, s.email, s.academic_branch, s.merit_rank, s.gender
      FROM group_members gm
      JOIN students s ON gm.student_id = s.id
      WHERE gm.group_id = ?
      ORDER BY s.merit_rank ASC
    `, [groupMeta.group_id]);

    // 4. Find Application
    const [apps] = await pool.query(`
      SELECT * FROM applications WHERE group_id = ? AND batch_id = ?
    `, [groupMeta.group_id, batch.id]);

    let application = null;
    let preferences = [];
    let allocationResult = null;

    if (apps.length > 0) {
      application = apps[0];

      // Get 5 preferences with room details
      const [prefs] = await pool.query(`
        SELECT 
          rp.preference_rank,
          r.id AS room_id,
          r.room_number,
          r.capacity,
          r.room_type,
          r.floor,
          hb.block_name,
          hb.gender_policy
        FROM room_preferences rp
        JOIN rooms r ON rp.room_id = r.id
        JOIN hostel_blocks hb ON r.block_id = hb.id
        WHERE rp.application_id = ?
        ORDER BY rp.preference_rank ASC
      `, [application.id]);
      preferences = prefs;

      // Check allocation outcome
      // STRICT REQUIREMENT: Only expose results if batch is PUBLISHED!
      if (batch.status === 'PUBLISHED') {
        const [allocs] = await pool.query(`
          SELECT 
            al.id AS allocation_id,
            al.preference_rank_satisfied,
            al.status AS allocation_status,
            al.allocated_at,
            r.room_number,
            r.room_type,
            r.capacity,
            r.floor,
            hb.block_name
          FROM allocations al
          JOIN rooms r ON al.room_id = r.id
          JOIN hostel_blocks hb ON r.block_id = hb.id
          WHERE al.student_id = ? AND al.batch_id = ? AND al.status = 'ACTIVE'
        `, [studentId, batch.id]);

        if (allocs.length > 0) {
          allocationResult = {
            status: 'ALLOCATED',
            details: allocs[0]
          };
        } else {
          // Check if waitlisted
          const [unallocs] = await pool.query(`
            SELECT reason, notes, created_at
            FROM unallocated_records
            WHERE application_id = ? AND batch_id = ?
          `, [application.id, batch.id]);

          if (unallocs.length > 0) {
            allocationResult = {
              status: 'WAITLISTED',
              reason: unallocs[0].reason,
              notes: unallocs[0].notes
            };
          }
        }
      }
    }

    res.json({
      success: true,
      batch,
      group: {
        ...groupMeta,
        members: groupMembers
      },
      application,
      preferences,
      allocationResult
    });
  } catch (err) {
    next(err);
  }
};

