// ============================================================================
// Administrator Controller
// ============================================================================

import pool from '../config/db.js';
import {
  executeBatchAllocation,
  publishBatchAllocation,
  vacateBatchRooms
} from '../services/allocationService.js';
import { logAudit } from '../services/auditService.js';

// GET /api/admin/dashboard
// Computes all statistics strictly from MySQL using COUNT, SUM, JOIN, GROUP BY
export const getDashboardMetrics = async (req, res, next) => {
  try {
    // 1. Total counts
    const [overall] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM students) AS totalStudents,
        (SELECT COUNT(*) FROM rooms WHERE is_active = TRUE) AS totalRooms,
        (SELECT COALESCE(SUM(capacity), 0) FROM rooms WHERE is_active = TRUE) AS totalBeds,
        (SELECT COUNT(*) FROM rooms WHERE capacity = 1 AND is_active = TRUE) AS singleRooms,
        (SELECT COUNT(*) FROM rooms WHERE capacity = 2 AND is_active = TRUE) AS doubleRooms,
        (SELECT COUNT(*) FROM rooms WHERE capacity = 4 AND is_active = TRUE) AS quadRooms,
        (SELECT COUNT(*) FROM applications WHERE status = 'SUBMITTED') AS submittedApplications,
        (SELECT COUNT(*) FROM applications WHERE status = 'DRAFT') AS pendingApplications,
        (SELECT COUNT(*) FROM applications WHERE status = 'ALLOCATED') AS allocatedApplications,
        (SELECT COUNT(*) FROM applications WHERE status = 'WAITLISTED') AS waitlistedApplications,
        (SELECT COUNT(DISTINCT room_id) FROM allocations WHERE status = 'ACTIVE') AS occupiedRooms,
        (SELECT COUNT(DISTINCT student_id) FROM allocations WHERE status = 'ACTIVE') AS allocatedStudents
    `);

    const summary = overall[0];
    summary.availableRooms = Math.max(0, summary.totalRooms - summary.occupiedRooms);
    summary.allocationSuccessRate = summary.submittedApplications + summary.allocatedApplications > 0
      ? Number(((summary.allocatedApplications / (summary.allocatedApplications + summary.waitlistedApplications || 1)) * 100).toFixed(1))
      : 0;

    // 2. Counts by Hostel Block
    const [blockMetrics] = await pool.query(`
      SELECT 
        hb.id,
        hb.block_name,
        hb.gender_policy,
        COUNT(DISTINCT r.id) AS totalRooms,
        COALESCE(SUM(r.capacity), 0) AS totalBeds,
        COUNT(DISTINCT al.room_id) AS occupiedRooms,
        COUNT(DISTINCT al.student_id) AS occupiedBeds
      FROM hostel_blocks hb
      LEFT JOIN rooms r ON hb.id = r.block_id AND r.is_active = TRUE
      LEFT JOIN allocations al ON r.id = al.room_id AND al.status = 'ACTIVE'
      GROUP BY hb.id, hb.block_name, hb.gender_policy
      ORDER BY hb.block_name ASC
    `);

    // 3. Counts by Room Capacity
    const [capacityMetrics] = await pool.query(`
      SELECT 
        r.capacity,
        r.room_type,
        COUNT(DISTINCT r.id) AS roomCount,
        COALESCE(SUM(r.capacity), 0) AS bedCount,
        COUNT(DISTINCT al.room_id) AS occupiedRoomCount,
        COUNT(DISTINCT al.student_id) AS occupiedStudentCount
      FROM rooms r
      LEFT JOIN allocations al ON r.id = al.room_id AND al.status = 'ACTIVE'
      WHERE r.is_active = TRUE
      GROUP BY r.capacity, r.room_type
      ORDER BY r.capacity ASC
    `);

    // 4. Distribution of allocations by preference rank (1..5)
    const [prefDistribution] = await pool.query(`
      SELECT 
        preference_rank_satisfied AS preferenceRank,
        COUNT(DISTINCT application_id) AS groupCount,
        COUNT(student_id) AS studentCount
      FROM allocations
      WHERE status = 'ACTIVE'
      GROUP BY preference_rank_satisfied
      ORDER BY preference_rank_satisfied ASC
    `);

    // 5. Active Batch Info
    const [batches] = await pool.query('SELECT * FROM batches ORDER BY id DESC LIMIT 1');

    res.json({
      success: true,
      data: {
        summary,
        blockMetrics,
        capacityMetrics,
        prefDistribution,
        activeBatch: batches[0] || null
      }
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/batches/:id/close
export const closeSubmissions = async (req, res, next) => {
  try {
    const batchId = req.params.id;
    await pool.query("UPDATE batches SET status = 'CLOSED' WHERE id = ?", [batchId]);

    await logAudit({
      actorType: 'ADMIN',
      actorId: req.user.id,
      action: 'CLOSE_SUBMISSIONS',
      entityType: 'BATCH',
      entityId: batchId,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Submissions closed successfully. Batch is now ready for allocation.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/batches/:id/allocate
export const triggerAllocation = async (req, res, next) => {
  try {
    const batchId = req.params.id;
    const result = await executeBatchAllocation(batchId, req.user.id, req.ip);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/batches/:id/allocation-results
export const getAllocationResults = async (req, res, next) => {
  try {
    const batchId = req.params.id;

    // Latest Run
    const [runs] = await pool.query(
      "SELECT * FROM allocation_runs WHERE batch_id = ? AND status = 'COMPLETED' ORDER BY id DESC LIMIT 1",
      [batchId]
    );

    if (runs.length === 0) {
      return res.json({ success: true, run: null, allocations: [], unallocated: [] });
    }

    const run = runs[0];

    // Allocations list
    const [allocations] = await pool.query(`
      SELECT 
        al.id,
        al.application_id,
        al.group_id,
        al.preference_rank_satisfied,
        al.allocated_at,
        r.room_number,
        r.capacity,
        r.room_type,
        r.floor,
        hb.block_name,
        ag.group_code,
        ag.leader_rank,
        s.id AS student_id,
        s.full_name AS student_name,
        s.registration_number,
        s.merit_rank,
        s.academic_branch
      FROM allocations al
      JOIN rooms r ON al.room_id = r.id
      JOIN hostel_blocks hb ON r.block_id = hb.id
      JOIN application_groups ag ON al.group_id = ag.id
      JOIN students s ON al.student_id = s.id
      WHERE al.run_id = ? AND al.status = 'ACTIVE'
      ORDER BY ag.leader_rank ASC, al.group_id ASC, s.merit_rank ASC
    `, [run.id]);

    // Unallocated list
    const [unallocated] = await pool.query(`
      SELECT 
        ur.id,
        ur.application_id,
        ur.group_id,
        ur.reason,
        ur.notes,
        ag.group_code,
        ag.target_capacity,
        ag.leader_rank,
        s.full_name AS leader_name,
        s.registration_number AS leader_reg
      FROM unallocated_records ur
      JOIN application_groups ag ON ur.group_id = ag.id
      JOIN students s ON ag.calculated_leader_id = s.id
      WHERE ur.run_id = ?
      ORDER BY ag.leader_rank ASC
    `, [run.id]);

    res.json({
      success: true,
      run,
      allocations,
      unallocated
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/batches/:id/publish
export const publishResults = async (req, res, next) => {
  try {
    const batchId = req.params.id;
    const result = await publishBatchAllocation(batchId, req.user.id, req.ip);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/batches/:id/mark-vacated
export const markBatchVacated = async (req, res, next) => {
  try {
    const batchId = req.params.id;
    const result = await vacateBatchRooms(batchId, req.user.id, req.ip);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/students
export const getStudentsList = async (req, res, next) => {
  try {
    const [students] = await pool.query(`
      SELECT 
        s.id, s.registration_number, s.full_name, s.email, s.gender, s.academic_branch, s.year_of_study, s.merit_rank,
        gm.group_id, ag.group_code, a.status AS application_status,
        al.room_id, r.room_number, hb.block_name
      FROM students s
      LEFT JOIN group_members gm ON s.id = gm.student_id
      LEFT JOIN application_groups ag ON gm.group_id = ag.id
      LEFT JOIN applications a ON ag.id = a.group_id
      LEFT JOIN allocations al ON s.id = al.student_id AND al.status = 'ACTIVE'
      LEFT JOIN rooms r ON al.room_id = r.id
      LEFT JOIN hostel_blocks hb ON r.block_id = hb.id
      ORDER BY s.merit_rank ASC
    `);
    res.json({ success: true, count: students.length, students });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/applications
export const getApplicationsList = async (req, res, next) => {
  try {
    const [apps] = await pool.query(`
      SELECT 
        a.id, a.batch_id, a.group_id, a.status, a.submitted_at,
        ag.group_code, ag.target_capacity, ag.calculated_leader_id, ag.leader_rank,
        s.full_name AS leader_name, s.registration_number AS leader_reg
      FROM applications a
      JOIN application_groups ag ON a.group_id = ag.id
      JOIN students s ON ag.calculated_leader_id = s.id
      ORDER BY ag.leader_rank ASC
    `);

    // Fetch members for each application
    const [members] = await pool.query(`
      SELECT gm.group_id, s.id, s.full_name, s.registration_number, s.merit_rank, s.gender, s.academic_branch
      FROM group_members gm
      JOIN students s ON gm.student_id = s.id
      ORDER BY s.merit_rank ASC
    `);

    const membersByGroup = new Map();
    for (const m of members) {
      if (!membersByGroup.has(m.group_id)) membersByGroup.set(m.group_id, []);
      membersByGroup.get(m.group_id).push(m);
    }

    const appsWithMembers = apps.map(app => ({
      ...app,
      members: membersByGroup.get(app.group_id) || []
    }));

    res.json({ success: true, applications: appsWithMembers });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/audit-logs
export const getAuditLogs = async (req, res, next) => {
  try {
    const [logs] = await pool.query(`
      SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100
    `);
    res.json({ success: true, logs });
  } catch (err) {
    next(err);
  }
};

