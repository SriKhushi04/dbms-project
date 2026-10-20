// ============================================================================
// Group Management Controller
// ============================================================================

import pool from '../config/db.js';
import crypto from 'crypto';

// POST /api/groups
export const createGroup = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const studentId = req.user.id;
    const { target_capacity } = req.body;

    const capacityNum = parseInt(target_capacity, 10);
    if (![1, 2, 4].includes(capacityNum)) {
      return res.status(400).json({ success: false, message: 'Invalid target capacity. Allowed sizes: 1 (Single), 2 (Double), 4 (Quad).' });
    }

    await connection.beginTransaction();

    // 1. Get current OPEN batch
    const [batches] = await connection.query("SELECT * FROM batches WHERE status = 'OPEN' ORDER BY id DESC LIMIT 1 FOR UPDATE");
    if (batches.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'No open batch available for group formation. Submissions may be closed.' });
    }
    const batchId = batches[0].id;

    // 2. Check if student already belongs to a group in this batch
    const [existing] = await connection.query(
      'SELECT id FROM group_members WHERE student_id = ? AND batch_id = ?',
      [studentId, batchId]
    );
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'You already belong to an active group in this batch.' });
    }

    // 3. Get student's rank
    const [students] = await connection.query('SELECT merit_rank FROM students WHERE id = ?', [studentId]);
    const studentRank = students[0].merit_rank;

    // 4. Create Group
    const groupCode = `GRP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const [groupResult] = await connection.query(`
      INSERT INTO application_groups (batch_id, group_code, target_capacity, calculated_leader_id, leader_rank, is_locked)
      VALUES (?, ?, ?, ?, ?, FALSE)
    `, [batchId, groupCode, capacityNum, studentId, studentRank]);

    const groupId = groupResult.insertId;

    // 5. Add student as member
    await connection.query(`
      INSERT INTO group_members (group_id, batch_id, student_id)
      VALUES (?, ?, ?)
    `, [groupId, batchId, studentId]);

    // 6. Create Application record in DRAFT
    const [appResult] = await connection.query(`
      INSERT INTO applications (batch_id, group_id, status)
      VALUES (?, ?, 'DRAFT')
    `, [batchId, groupId]);

    await connection.commit();

    res.status(201).json({
      success: true,
      message: `Group created successfully. Group Code: ${groupCode}`,
      group: {
        id: groupId,
        group_code: groupCode,
        target_capacity: capacityNum,
        calculated_leader_id: studentId,
        leader_rank: studentRank
      },
      applicationId: appResult.insertId
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// POST /api/groups/join
export const joinGroup = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const studentId = req.user.id;
    const { group_code } = req.body;

    if (!group_code) {
      return res.status(400).json({ success: false, message: 'Group code is required' });
    }

    await connection.beginTransaction();

    // 1. Find group by code
    const [groups] = await connection.query(`
      SELECT ag.*, b.status AS batch_status
      FROM application_groups ag
      JOIN batches b ON ag.batch_id = b.id
      WHERE ag.group_code = ? FOR UPDATE
    `, [group_code.trim().toUpperCase()]);

    if (groups.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Group code not found' });
    }

    const group = groups[0];
    if (group.batch_status !== 'OPEN') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Group batch is closed for modifications.' });
    }
    if (group.is_locked) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Group application has already been submitted and locked.' });
    }

    // 2. Check if student already in a group in this batch
    const [existing] = await connection.query(
      'SELECT id FROM group_members WHERE student_id = ? AND batch_id = ?',
      [studentId, group.batch_id]
    );
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'You already belong to a group in this batch.' });
    }

    // 3. Check current member count against target capacity
    const [members] = await connection.query(
      'SELECT gm.student_id, s.merit_rank FROM group_members gm JOIN students s ON gm.student_id = s.id WHERE gm.group_id = ?',
      [group.id]
    );

    if (members.length >= group.target_capacity) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Group is already at maximum capacity (${group.target_capacity} members).`
      });
    }

    // 4. Add student to group
    await connection.query(
      'INSERT INTO group_members (group_id, batch_id, student_id) VALUES (?, ?, ?)',
      [group.id, group.batch_id, studentId]
    );

    // 5. Recalculate group leader based on best merit rank
    const [studentInfo] = await connection.query('SELECT merit_rank FROM students WHERE id = ?', [studentId]);
    const allMembers = [...members, { student_id: studentId, merit_rank: studentInfo[0].merit_rank }];

    let bestMember = allMembers[0];
    for (const m of allMembers) {
      if (m.merit_rank < bestMember.merit_rank) {
        bestMember = m;
      }
    }

    await connection.query(`
      UPDATE application_groups 
      SET calculated_leader_id = ?, leader_rank = ? 
      WHERE id = ?
    `, [bestMember.student_id, bestMember.merit_rank, group.id]);

    await connection.commit();

    res.json({
      success: true,
      message: `Successfully joined group ${group.group_code}. Group now has ${allMembers.length}/${group.target_capacity} members.`,
      groupId: group.id,
      calculatedLeaderId: bestMember.student_id,
      leaderRank: bestMember.merit_rank
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
};

// GET /api/groups/:id
export const getGroupDetails = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const [groups] = await pool.query('SELECT * FROM application_groups WHERE id = ?', [groupId]);
    if (groups.length === 0) return res.status(404).json({ success: false, message: 'Group not found' });

    const [members] = await pool.query(`
      SELECT s.id, s.registration_number, s.full_name, s.email, s.merit_rank, s.gender, s.academic_branch
      FROM group_members gm
      JOIN students s ON gm.student_id = s.id
      WHERE gm.group_id = ?
      ORDER BY s.merit_rank ASC
    `, [groupId]);

    res.json({
      success: true,
      group: {
        ...groups[0],
        members
      }
    });
  } catch (err) {
    next(err);
  }
};

