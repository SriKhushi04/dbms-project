// ============================================================================
// HOSTELHUB STREAMLINED BACKEND SERVER
// ============================================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { createManagementRouter } from './routes/managementRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hostelhub_db',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0
});

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Mount HostelHub Management Module
app.use('/api/management', createManagementRouter(pool));

// Request logger
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'test') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'UP', database: 'MySQL Connected' });
  } catch (err) {
    res.status(500).json({ status: 'DOWN', error: err.message });
  }
});

// ----------------------------------------------------------------------------
// 1. STUDENT LOGIN
// Demo login by registration number. Validates against database.
// ----------------------------------------------------------------------------
app.post('/api/students/login', async (req, res) => {
  try {
    const { registration_number } = req.body;
    if (!registration_number || !registration_number.trim()) {
      return res.status(400).json({ success: false, message: 'Registration number is required.' });
    }

    const trimmed = registration_number.trim().toUpperCase();
    const [students] = await pool.query(
      'SELECT id, registration_number, full_name, merit_rank, is_eligible FROM students WHERE registration_number = ?',
      [trimmed]
    );

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Student with registration number "${trimmed}" not found in university records.`
      });
    }

    const student = students[0];
    if (!student.is_eligible) {
      return res.status(403).json({
        success: false,
        message: 'Student is currently not eligible for hostel room allocation.'
      });
    }

    res.json({ success: true, student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 2. VALIDATE A SINGLE ROOMMATE (For Instant onBlur Feedback)
// Must be defined BEFORE /api/students/:regNo to prevent route shadowing
// ----------------------------------------------------------------------------
app.get('/api/students/validate-roommate', async (req, res) => {
  try {
    const { regNo, currentRegNo } = req.query;
    if (!regNo || !regNo.trim()) {
      return res.status(400).json({ valid: false, message: 'Roommate registration number cannot be empty.' });
    }

    const clean = regNo.trim().toUpperCase();
    if (currentRegNo && clean === currentRegNo.trim().toUpperCase()) {
      return res.status(400).json({ valid: false, message: 'You cannot enter your own registration number as a roommate.' });
    }

    const [students] = await pool.query(
      'SELECT id, registration_number, full_name, is_eligible FROM students WHERE registration_number = ?',
      [clean]
    );

    if (students.length === 0) {
      return res.status(404).json({ valid: false, message: `Roommate registration number "${clean}" not found in university records.` });
    }

    const rm = students[0];
    if (!rm.is_eligible) {
      return res.status(400).json({ valid: false, message: `Roommate ${clean} (${rm.full_name}) is not eligible for hostel allocation.` });
    }

    const [alloc] = await pool.query(
      'SELECT r.room_number FROM allocations a JOIN rooms r ON a.room_id = r.id WHERE a.student_id = ?',
      [rm.id]
    );
    if (alloc.length > 0) {
      return res.status(400).json({ valid: false, message: 'This student has already been allocated a room and cannot be added as a roommate.' });
    }

    const [groups] = await pool.query(`
      SELECT rg.id, ps.registration_number AS primary_reg
      FROM group_members gm
      JOIN roommate_groups rg ON gm.group_id = rg.id
      JOIN students ps ON rg.primary_student_id = ps.id
      WHERE gm.student_id = ? AND rg.status IN ('SUBMITTED', 'ALLOCATED')
    `, [rm.id]);

    const otherGroups = groups.filter(g => !currentRegNo || g.primary_reg !== currentRegNo.trim().toUpperCase());
    if (otherGroups.length > 0) {
      return res.status(400).json({
        valid: false,
        message: 'This student already belongs to another submitted or active roommate group.'
      });
    }

    res.json({
      valid: true,
      student: { id: rm.id, full_name: rm.full_name, registration_number: rm.registration_number }
    });
  } catch (err) {
    res.status(500).json({ valid: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 3. GET STUDENT DETAILS
// ----------------------------------------------------------------------------
app.get('/api/students/:regNo', async (req, res) => {
  try {
    const regNo = req.params.regNo.trim().toUpperCase();
    const [students] = await pool.query(
      'SELECT id, registration_number, full_name, merit_rank, is_eligible FROM students WHERE registration_number = ?',
      [regNo]
    );
    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    res.json({ success: true, student: students[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 3. GET ALLOCATION STATUS
// Case 1: If student already has an allocated room -> returns room number & block
// Case 2: If student has not been allocated -> returns isAllocated: false
// ----------------------------------------------------------------------------
app.get('/api/students/:regNo/allocation', async (req, res) => {
  try {
    const regNo = req.params.regNo.trim().toUpperCase();
    const [rows] = await pool.query(
      `SELECT 
         a.id AS allocation_id,
         a.allocated_at,
         r.room_number,
         r.capacity,
         h.block_name
       FROM allocations a
       JOIN students s ON a.student_id = s.id
       JOIN rooms r ON a.room_id = r.id
       JOIN hostels h ON r.hostel_id = h.id
       WHERE s.registration_number = ?`,
      [regNo]
    );

    if (rows.length > 0) {
      return res.json({
        success: true,
        isAllocated: true,
        room_number: rows[0].room_number,
        block_name: rows[0].block_name,
        capacity: rows[0].capacity,
        allocated_at: rows[0].allocated_at
      });
    }

    res.json({ success: true, isAllocated: false });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 4. GET AVAILABLE BLOCKS
// ----------------------------------------------------------------------------
app.get('/api/hostels', async (req, res) => {
  try {
    const [hostels] = await pool.query('SELECT id, block_name FROM hostels ORDER BY block_name ASC');
    res.json({ success: true, hostels });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 5. GET AVAILABLE ROOMS (Filtered by Block and Capacity)
// Excludes fully occupied/allocated rooms
// ----------------------------------------------------------------------------
app.get('/api/rooms/available', async (req, res) => {
  try {
    const { block, capacity } = req.query;

    if (!block || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'Both "block" and "capacity" parameters are required to fetch available rooms.'
      });
    }

    const capNum = parseInt(capacity, 10);
    if (![1, 2, 4].includes(capNum)) {
      return res.status(400).json({ success: false, message: 'Capacity must be 1, 2, or 4.' });
    }

    const [rooms] = await pool.query(
      `SELECT 
         r.id,
         r.room_number,
         r.capacity,
         h.block_name,
         COUNT(a.id) AS current_occupants
       FROM rooms r
       JOIN hostels h ON r.hostel_id = h.id
       LEFT JOIN allocations a ON r.id = a.room_id
       WHERE h.block_name = ? AND r.capacity = ?
       GROUP BY r.id, h.block_name
       HAVING current_occupants = 0
       ORDER BY r.room_number ASC`,
      [block.trim(), capNum]
    );

    res.json({ success: true, count: rooms.length, rooms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 6. GET STUDENT'S CURRENT PREFERENCES (If already submitted)
// ----------------------------------------------------------------------------
app.get('/api/students/:regNo/preferences', async (req, res) => {
  try {
    const regNo = req.params.regNo.trim().toUpperCase();

    // Check if student is part of any active group
    const [memberships] = await pool.query(
      `SELECT 
         gm.group_id,
         rg.primary_student_id,
         rg.capacity,
         rg.status,
         rg.created_at,
         h.block_name
       FROM group_members gm
       JOIN students s ON gm.student_id = s.id
       JOIN roommate_groups rg ON gm.group_id = rg.id
       JOIN hostels h ON rg.hostel_id = h.id
       WHERE s.registration_number = ?`,
      [regNo]
    );

    if (memberships.length === 0) {
      return res.json({ success: true, hasSubmitted: false });
    }

    const group = memberships[0];

    // Fetch all members of this group
    const [members] = await pool.query(
      `SELECT s.id, s.registration_number, s.full_name, s.merit_rank
       FROM group_members gm
       JOIN students s ON gm.student_id = s.id
       WHERE gm.group_id = ?
       ORDER BY s.id ASC`,
      [group.group_id]
    );

    // Fetch 5 preferences
    const [prefs] = await pool.query(
      `SELECT 
         p.preference_rank,
         r.id AS room_id,
         r.room_number,
         r.capacity,
         h.block_name
       FROM preferences p
       JOIN rooms r ON p.room_id = r.id
       JOIN hostels h ON r.hostel_id = h.id
       WHERE p.group_id = ?
       ORDER BY p.preference_rank ASC`,
      [group.group_id]
    );

    // Identify roommates (excluding current student)
    const roommates = members
      .filter(m => m.registration_number !== regNo)
      .map(m => m.registration_number);

    res.json({
      success: true,
      hasSubmitted: true,
      block_name: group.block_name,
      capacity: group.capacity,
      status: group.status,
      roommates,
      members,
      preferences: prefs
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// 7. SUBMIT STUDENT PREFERENCES & ROOMMATES
// ----------------------------------------------------------------------------
app.post('/api/students/:regNo/preferences', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const regNo = req.params.regNo.trim().toUpperCase();
    const { block, capacity, roommates = [], preferences = [] } = req.body;

    // 1. Basic validation
    if (!block || !block.trim()) {
      return res.status(400).json({ success: false, message: 'Please select a hostel block.' });
    }

    const capNum = parseInt(capacity, 10);
    if (![1, 2, 4].includes(capNum)) {
      return res.status(400).json({ success: false, message: 'Room capacity must be 1, 2, or 4 beds.' });
    }

    const requiredRoommates = capNum - 1;
    if (!Array.isArray(roommates) || roommates.length !== requiredRoommates) {
      return res.status(400).json({
        success: false,
        message: `For a ${capNum}-bedded room, exactly ${requiredRoommates} roommate registration number(s) must be provided.`
      });
    }

    // Check for empty or whitespace-only roommate fields
    for (let i = 0; i < requiredRoommates; i++) {
      const val = roommates[i];
      if (typeof val !== 'string' || !val.trim()) {
        return res.status(400).json({
          success: false,
          fieldIndex: i,
          message: `Roommate ${i + 1} registration number cannot be empty or contain only whitespace.`
        });
      }
    }

    const cleanRoommates = roommates.map(r => r.trim().toUpperCase());

    // Check if any roommate equals the logged-in student
    const selfMatchIdx = cleanRoommates.findIndex(r => r === regNo);
    if (selfMatchIdx !== -1) {
      return res.status(400).json({
        success: false,
        fieldIndex: selfMatchIdx,
        message: 'You cannot enter your own registration number as a roommate.'
      });
    }

    // Check for duplicate roommates (case-insensitive, whitespace-trimmed)
    const seenRoommates = new Set();
    for (let i = 0; i < cleanRoommates.length; i++) {
      const r = cleanRoommates[i];
      if (seenRoommates.has(r)) {
        return res.status(400).json({
          success: false,
          fieldIndex: i,
          message: `Duplicate roommate registration number "${r}" is not allowed.`
        });
      }
      seenRoommates.add(r);
    }

    // Begin atomic transaction with row locking
    await connection.beginTransaction();

    // 2. Validate logged-in student exists, is eligible, and has no active allocation
    const [students] = await connection.query(
      'SELECT id, registration_number, full_name, is_eligible FROM students WHERE registration_number = ? FOR UPDATE',
      [regNo]
    );
    if (students.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: `Student with registration number "${regNo}" was not found.` });
    }
    const currentStudent = students[0];

    if (!currentStudent.is_eligible) {
      await connection.rollback();
      return res.status(403).json({ success: false, message: 'You are currently not eligible for hostel room allocation.' });
    }

    const [alreadyAlloc] = await connection.query(
      'SELECT a.id, r.room_number FROM allocations a JOIN rooms r ON a.room_id = r.id WHERE a.student_id = ? FOR UPDATE',
      [currentStudent.id]
    );
    if (alreadyAlloc.length > 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `You have already been allocated room ${alreadyAlloc[0].room_number} and cannot submit new preferences.`
      });
    }

    // Check existing groups for the logged-in student
    const [currentStudentGroups] = await connection.query(`
      SELECT rg.id, rg.primary_student_id, ps.registration_number AS primary_reg
      FROM group_members gm
      JOIN roommate_groups rg ON gm.group_id = rg.id
      JOIN students ps ON rg.primary_student_id = ps.id
      WHERE gm.student_id = ? AND rg.status IN ('SUBMITTED', 'ALLOCATED')
      FOR UPDATE
    `, [currentStudent.id]);

    let ownExistingGroupId = null;
    for (const g of currentStudentGroups) {
      if (g.primary_student_id === currentStudent.id) {
        ownExistingGroupId = g.id;
      } else {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `You already belong to another submitted roommate group (Application #${g.id} submitted by ${g.primary_reg}).`
        });
      }
    }

    // 3. Roommate validation against database
    let roommateStudentIds = [];
    if (cleanRoommates.length > 0) {
      const placeholders = cleanRoommates.map(() => '?').join(',');
      const [foundRoommates] = await connection.query(
        `SELECT id, registration_number, full_name, is_eligible FROM students WHERE registration_number IN (${placeholders}) FOR UPDATE`,
        cleanRoommates
      );

      // Verify every roommate exists
      const foundMap = new Map(foundRoommates.map(rm => [rm.registration_number, rm]));
      for (let i = 0; i < cleanRoommates.length; i++) {
        const r = cleanRoommates[i];
        if (!foundMap.has(r)) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            fieldIndex: i,
            message: `Roommate registration number "${r}" not found in university records.`
          });
        }
      }

      // Verify every roommate is eligible
      for (let i = 0; i < cleanRoommates.length; i++) {
        const rm = foundMap.get(cleanRoommates[i]);
        if (!rm.is_eligible) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            fieldIndex: i,
            message: `Roommate ${rm.registration_number} (${rm.full_name}) is not eligible for hostel allocation.`
          });
        }
      }

      roommateStudentIds = cleanRoommates.map(r => foundMap.get(r).id);

      // Check if any roommate already has an active room allocation
      const rmPlaceholders = roommateStudentIds.map(() => '?').join(',');
      const [rmAllocations] = await connection.query(`
        SELECT s.registration_number, s.full_name, r.room_number 
        FROM allocations a 
        JOIN students s ON a.student_id = s.id 
        JOIN rooms r ON a.room_id = r.id 
        WHERE a.student_id IN (${rmPlaceholders})
        FOR UPDATE
      `, roommateStudentIds);

      if (rmAllocations.length > 0) {
        await connection.rollback();
        const alloc = rmAllocations[0];
        const matchIdx = cleanRoommates.indexOf(alloc.registration_number);
        return res.status(400).json({
          success: false,
          fieldIndex: matchIdx,
          message: 'This student has already been allocated a room and cannot be added as a roommate.'
        });
      }

      // Check if any roommate already belongs to another submitted or active roommate group
      const [rmGroups] = await connection.query(`
        SELECT gm.student_id, s.registration_number, s.full_name, rg.id AS group_id, ps.registration_number AS primary_reg
        FROM group_members gm
        JOIN students s ON gm.student_id = s.id
        JOIN roommate_groups rg ON gm.group_id = rg.id
        JOIN students ps ON rg.primary_student_id = ps.id
        WHERE gm.student_id IN (${rmPlaceholders})
          AND rg.status IN ('SUBMITTED', 'ALLOCATED')
        FOR UPDATE
      `, roommateStudentIds);

      // Exclude own existing group if student is updating their own submission
      const conflicts = rmGroups.filter(g => g.group_id !== ownExistingGroupId);
      if (conflicts.length > 0) {
        await connection.rollback();
        const conflict = conflicts[0];
        const matchIdx = cleanRoommates.indexOf(conflict.registration_number);
        return res.status(400).json({
          success: false,
          fieldIndex: matchIdx,
          message: 'This student already belongs to another submitted or active roommate group.'
        });
      }
    }

    // 4. Validate Preferences (Must be distinct, capacity-matching, and currently unoccupied)
    const [hostelRows] = await connection.query('SELECT id FROM hostels WHERE block_name = ?', [block.trim()]);
    if (hostelRows.length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: `Block "${block}" does not exist.` });
    }
    const hostelId = hostelRows[0].id;

    // Check how many rooms are physically available (zero current occupants) in this block & capacity
    const [availableRoomsInDb] = await connection.query(`
      SELECT r.id
      FROM rooms r
      LEFT JOIN allocations a ON r.id = a.room_id
      WHERE r.hostel_id = ? AND r.capacity = ?
      GROUP BY r.id
      HAVING COUNT(a.id) = 0
    `, [hostelId, capNum]);

    if (availableRoomsInDb.length === 0) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `No rooms are currently available in ${block} for a ${capNum}-bedded room. Please select another block or room capacity.`
      });
    }

    const expectedPrefCount = Math.min(5, availableRoomsInDb.length);
    if (!Array.isArray(preferences) || preferences.length !== expectedPrefCount) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Please select exactly ${expectedPrefCount} distinct room preference(s) (${availableRoomsInDb.length} available).`
      });
    }

    const uniqueRooms = new Set(preferences);
    if (uniqueRooms.size !== expectedPrefCount) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Duplicate room selections are not allowed. All ${expectedPrefCount} preferences must be distinct.`
      });
    }

    // Verify all selected rooms exist in DB, match block and capacity
    const prefPlaceholders = preferences.map(() => '?').join(',');
    const [rooms] = await connection.query(
      `SELECT r.id, r.room_number, r.capacity, r.hostel_id
       FROM rooms r
       WHERE r.id IN (${prefPlaceholders})`,
      preferences
    );

    if (rooms.length !== expectedPrefCount) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'One or more selected rooms were not found in the database.'
      });
    }

    for (const r of rooms) {
      if (r.hostel_id !== hostelId) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Room ${r.room_number} does not belong to ${block}.`
        });
      }
      if (r.capacity !== capNum) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: `Room ${r.room_number} capacity (${r.capacity}) does not match your chosen capacity (${capNum}).`
        });
      }
    }

    // 5. Clean up existing group if updating
    if (ownExistingGroupId) {
      await connection.query('DELETE FROM roommate_groups WHERE id = ?', [ownExistingGroupId]);
    }

    // Create roommate group
    const [groupRes] = await connection.query(
      'INSERT INTO roommate_groups (primary_student_id, hostel_id, capacity, status) VALUES (?, ?, ?, "SUBMITTED")',
      [currentStudent.id, hostelId, capNum]
    );
    const groupId = groupRes.insertId;

    // Insert all members into group_members
    const allMemberIds = [currentStudent.id, ...roommateStudentIds];
    for (const sId of allMemberIds) {
      await connection.query(
        'INSERT INTO group_members (group_id, student_id) VALUES (?, ?)',
        [groupId, sId]
      );
    }

    // Insert preferences in ranked order
    for (let i = 0; i < preferences.length; i++) {
      await connection.query(
        'INSERT INTO preferences (group_id, preference_rank, room_id) VALUES (?, ?, ?)',
        [groupId, i + 1, preferences[i]]
      );
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Preferences and roommate details saved successfully to MySQL!',
      groupId,
      block,
      capacity: capNum,
      preferencesCount: 5
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
});

// ----------------------------------------------------------------------------
// 8. GET ALL SUBMITTED APPLICATIONS FOR ADMIN ROSTER
// Returns complete applications with members, preferences, status, and rooms
// ----------------------------------------------------------------------------
app.get('/api/admin/applications', async (req, res) => {
  try {
    // 1. Fetch all roommate groups with primary student info and hostel block
    const [groups] = await pool.query(`
      SELECT 
        rg.id AS group_id,
        rg.capacity,
        rg.status,
        rg.created_at,
        h.block_name,
        ps.id AS primary_id,
        ps.full_name AS primary_name,
        ps.registration_number AS primary_reg_no,
        ps.merit_rank AS primary_merit_rank,
        MIN(s.merit_rank) AS best_rank
      FROM roommate_groups rg
      JOIN hostels h ON rg.hostel_id = h.id
      JOIN students ps ON rg.primary_student_id = ps.id
      JOIN group_members gm ON rg.id = gm.group_id
      JOIN students s ON gm.student_id = s.id
      GROUP BY rg.id, rg.capacity, rg.status, rg.created_at, h.block_name, ps.id, ps.full_name, ps.registration_number, ps.merit_rank
      ORDER BY best_rank ASC, rg.created_at ASC
    `);

    if (groups.length === 0) {
      return res.json({ success: true, applications: [] });
    }

    const groupIds = groups.map(g => g.group_id);
    const placeholders = groupIds.map(() => '?').join(',');

    // 2. Fetch all members for these groups
    const [allMembers] = await pool.query(`
      SELECT 
        gm.group_id,
        s.id AS student_id,
        s.full_name,
        s.registration_number,
        s.merit_rank
      FROM group_members gm
      JOIN students s ON gm.student_id = s.id
      WHERE gm.group_id IN (${placeholders})
      ORDER BY s.merit_rank ASC
    `, groupIds);

    // 3. Fetch all 5 preferences for these groups
    const [allPrefs] = await pool.query(`
      SELECT 
        p.group_id,
        p.preference_rank,
        p.room_id,
        r.room_number
      FROM preferences p
      JOIN rooms r ON p.room_id = r.id
      WHERE p.group_id IN (${placeholders})
      ORDER BY p.group_id ASC, p.preference_rank ASC
    `, groupIds);

    // 4. Fetch any active allocation for each group
    const [allAllocations] = await pool.query(`
      SELECT DISTINCT
        gm.group_id,
        r.room_number,
        r.id AS room_id
      FROM group_members gm
      JOIN allocations a ON gm.student_id = a.student_id
      JOIN rooms r ON a.room_id = r.id
      WHERE gm.group_id IN (${placeholders})
    `, groupIds);

    // Group members, preferences, and allocations by group_id
    const membersByGroup = new Map();
    for (const m of allMembers) {
      if (!membersByGroup.has(m.group_id)) membersByGroup.set(m.group_id, []);
      membersByGroup.get(m.group_id).push({
        student_id: m.student_id,
        full_name: m.full_name,
        registration_number: m.registration_number,
        merit_rank: m.merit_rank
      });
    }

    const prefsByGroup = new Map();
    for (const p of allPrefs) {
      if (!prefsByGroup.has(p.group_id)) prefsByGroup.set(p.group_id, []);
      prefsByGroup.get(p.group_id).push({
        preference_rank: p.preference_rank,
        room_id: p.room_id,
        room_number: p.room_number
      });
    }

    const allocByGroup = new Map();
    for (const a of allAllocations) {
      allocByGroup.set(a.group_id, {
        room_id: a.room_id,
        room_number: a.room_number
      });
    }

    // Assemble applications roster
    const applications = groups.map(g => {
      const allocatedRoom = allocByGroup.get(g.group_id) || null;
      let displayStatus = g.status;
      if (allocatedRoom) {
        displayStatus = 'ALLOCATED';
      } else if (g.status === 'WAITLISTED') {
        displayStatus = 'UNALLOCATED';
      }

      return {
        group_id: g.group_id,
        best_rank: g.best_rank,
        capacity: g.capacity,
        block_name: g.block_name,
        status: displayStatus,
        primary_student: {
          id: g.primary_id,
          full_name: g.primary_name,
          registration_number: g.primary_reg_no,
          merit_rank: g.primary_merit_rank
        },
        members: membersByGroup.get(g.group_id) || [],
        preferences: prefsByGroup.get(g.group_id) || [],
        allocated_room: allocatedRoom,
        unallocated_reason: (displayStatus === 'UNALLOCATED' || displayStatus === 'WAITLISTED')
          ? 'All 5 preferred rooms reached full capacity with higher-merit applicants.'
          : null
      };
    });

    res.json({ success: true, applications });
  } catch (err) {
    console.error('Error fetching admin applications from MySQL:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications from MySQL: ' + err.message
    });
  }
});

// ----------------------------------------------------------------------------
// 9. ALLOCATION ENGINE (Trigger Room Assignment)
// Assigns rooms based on merit rank and 5 preferences without splitting groups
// ----------------------------------------------------------------------------
app.post('/api/admin/allocate', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get all submitted groups ordered by best student rank in group (lowest rank number first)
    const [groups] = await connection.query(`
      SELECT 
        rg.id AS group_id,
        rg.capacity,
        rg.hostel_id,
        MIN(s.merit_rank) AS best_rank
      FROM roommate_groups rg
      JOIN group_members gm ON rg.id = gm.group_id
      JOIN students s ON gm.student_id = s.id
      WHERE rg.status = 'SUBMITTED'
      GROUP BY rg.id, rg.capacity, rg.hostel_id
      ORDER BY best_rank ASC, rg.id ASC
      FOR UPDATE
    `);

    let allocatedGroups = 0;
    let allocatedStudents = 0;
    let unallocatedGroups = 0;
    const assignedRoomsSet = new Set();

    for (const grp of groups) {
      // Get all group members and recheck their eligibility
      const [members] = await connection.query(
        'SELECT gm.student_id, s.registration_number, s.full_name, s.is_eligible FROM group_members gm JOIN students s ON gm.student_id = s.id WHERE gm.group_id = ?',
        [grp.group_id]
      );
      const studentIds = members.map(m => m.student_id);

      // Recheck eligibility for each member at allocation time
      const ineligibleMember = members.find(m => !m.is_eligible);
      if (ineligibleMember) {
        await connection.query(
          'UPDATE roommate_groups SET status = "WAITLISTED" WHERE id = ?',
          [grp.group_id]
        );
        unallocatedGroups++;
        continue;
      }

      // Check if any member already has an active allocation
      const memberPlaceholders = studentIds.map(() => '?').join(',');
      const [existingAlloc] = await connection.query(
        `SELECT id FROM allocations WHERE student_id IN (${memberPlaceholders})`,
        studentIds
      );

      if (existingAlloc.length > 0) {
        // Already allocated previously, skip to avoid double allocation
        await connection.query(
          'UPDATE roommate_groups SET status = "ALLOCATED" WHERE id = ?',
          [grp.group_id]
        );
        continue;
      }

      // Get 5 preferences in order
      const [prefs] = await connection.query(
        'SELECT preference_rank, room_id FROM preferences WHERE group_id = ? ORDER BY preference_rank ASC',
        [grp.group_id]
      );

      let allocatedRoomId = null;

      // Check preferences in order
      for (const pref of prefs) {
        // Check if room has space for the whole group
        const [roomCheck] = await connection.query(
          `SELECT r.id, r.capacity, COUNT(a.id) AS occupied
           FROM rooms r
           LEFT JOIN allocations a ON r.id = a.room_id
           WHERE r.id = ?
           GROUP BY r.id
           FOR UPDATE`,
          [pref.room_id]
        );

        if (roomCheck.length > 0) {
          const room = roomCheck[0];
          const remainingBeds = room.capacity - room.occupied;
          if (remainingBeds >= grp.capacity) {
            allocatedRoomId = room.id;
            break;
          }
        }
      }

      if (allocatedRoomId) {
        // Allocate all members to this room
        for (const sId of studentIds) {
          await connection.query(
            'INSERT INTO allocations (student_id, room_id) VALUES (?, ?)',
            [sId, allocatedRoomId]
          );
        }
        await connection.query(
          'UPDATE roommate_groups SET status = "ALLOCATED" WHERE id = ?',
          [grp.group_id]
        );
        allocatedGroups++;
        allocatedStudents += studentIds.length;
        assignedRoomsSet.add(allocatedRoomId);
      } else {
        // All 5 preferences unavailable
        await connection.query(
          'UPDATE roommate_groups SET status = "WAITLISTED" WHERE id = ?',
          [grp.group_id]
        );
        unallocatedGroups++;
      }
    }

    await connection.commit();

    const summary = {
      allocatedGroups,
      allocatedStudents,
      unallocatedGroups,
      roomsAssigned: assignedRoomsSet.size
    };

    res.json({
      success: true,
      message: `Allocation completed! Allocated ${allocatedGroups} group(s) (${allocatedStudents} students) across ${assignedRoomsSet.size} room(s). Unallocated: ${unallocatedGroups} group(s).`,
      summary,
      allocatedCount: allocatedGroups,
      unallocatedCount: unallocatedGroups
    });
  } catch (err) {
    await connection.rollback();
    console.error('Error during room allocation:', err);
    res.status(500).json({ success: false, message: 'Allocation execution failed: ' + err.message });
  } finally {
    connection.release();
  }
});

// Reset allocations for testing
app.post('/api/admin/reset-allocations', async (req, res) => {
  try {
    await pool.query('DELETE FROM allocations');
    await pool.query('UPDATE roommate_groups SET status = "SUBMITTED"');
    // Re-seed Student 1 pre-allocation
    await pool.query('INSERT IGNORE INTO allocations (student_id, room_id) VALUES (1, 1)');
    res.json({ success: true, message: 'Allocations reset to initial demo state.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`HostelHub Backend running on http://localhost:${PORT}`);
});

export default app;
