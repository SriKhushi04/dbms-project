// ============================================================================
// HOSTELHUB STREAMLINED BACKEND SERVER
// ============================================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

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
// 2. GET STUDENT DETAILS
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
       HAVING current_occupants < r.capacity
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

    // 2. Validate student exists and is eligible
    const [students] = await connection.query(
      'SELECT id, registration_number, is_eligible FROM students WHERE registration_number = ?',
      [regNo]
    );
    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    const currentStudent = students[0];

    // Check if student is already allocated
    const [alreadyAlloc] = await connection.query(
      'SELECT id FROM allocations WHERE student_id = ?',
      [currentStudent.id]
    );
    if (alreadyAlloc.length > 0) {
      return res.status(400).json({ success: false, message: 'You have already been allocated a room and cannot submit new preferences.' });
    }

    // 3. Roommate validation based on capacity
    const requiredRoommates = capNum - 1;
    const cleanRoommates = Array.isArray(roommates)
      ? roommates.map(r => (typeof r === 'string' ? r.trim().toUpperCase() : '')).filter(Boolean)
      : [];

    if (cleanRoommates.length !== requiredRoommates) {
      return res.status(400).json({
        success: false,
        message: `For a ${capNum}-bedded room, exactly ${requiredRoommates} roommate(s) must be specified (you are occupant 1).`
      });
    }

    // Ensure student didn't enter their own registration number
    if (cleanRoommates.includes(regNo)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot include your own registration number in the roommate list.'
      });
    }

    // Ensure roommates are distinct
    const uniqueRoommates = new Set(cleanRoommates);
    if (uniqueRoommates.size !== cleanRoommates.length) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate roommate registration numbers are not allowed.'
      });
    }

    // Verify all roommates exist, are eligible, and are not already allocated
    let roommateStudentIds = [];
    if (cleanRoommates.length > 0) {
      const placeholders = cleanRoommates.map(() => '?').join(',');
      const [foundRoommates] = await connection.query(
        `SELECT id, registration_number, is_eligible FROM students WHERE registration_number IN (${placeholders})`,
        cleanRoommates
      );

      if (foundRoommates.length !== cleanRoommates.length) {
        const foundRegs = new Set(foundRoommates.map(r => r.registration_number));
        const missing = cleanRoommates.filter(r => !foundRegs.has(r));
        return res.status(400).json({
          success: false,
          message: `The following roommate registration number(s) do not exist: ${missing.join(', ')}`
        });
      }

      for (const rm of foundRoommates) {
        if (!rm.is_eligible) {
          return res.status(400).json({
            success: false,
            message: `Roommate ${rm.registration_number} is not eligible for hostel allocation.`
          });
        }
      }

      roommateStudentIds = foundRoommates.map(rm => rm.id);

      // Check if any roommate is already allocated
      const [rmAlloc] = await connection.query(
        `SELECT s.registration_number FROM allocations a JOIN students s ON a.student_id = s.id WHERE a.student_id IN (${roommateStudentIds.join(',')})`
      );
      if (rmAlloc.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Roommate ${rmAlloc[0].registration_number} has already been allocated a room.`
        });
      }
    }

    // 4. Validate Preferences (Must be distinct, capacity-matching, and available)
    if (!Array.isArray(preferences) || preferences.length !== 5) {
      return res.status(400).json({
        success: false,
        message: 'Exactly five (5) distinct room preferences are required.'
      });
    }

    const uniqueRooms = new Set(preferences);
    if (uniqueRooms.size !== 5) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate room selections are not allowed. All five preferences must be distinct.'
      });
    }

    // Verify all 5 rooms exist in DB, match block and capacity
    const [hostelRows] = await connection.query('SELECT id FROM hostels WHERE block_name = ?', [block.trim()]);
    if (hostelRows.length === 0) {
      return res.status(400).json({ success: false, message: `Block "${block}" does not exist.` });
    }
    const hostelId = hostelRows[0].id;

    const [rooms] = await connection.query(
      `SELECT r.id, r.room_number, r.capacity, r.hostel_id
       FROM rooms r
       WHERE r.id IN (?, ?, ?, ?, ?)`,
      preferences
    );

    if (rooms.length !== 5) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected rooms were not found in the database.'
      });
    }

    for (const r of rooms) {
      if (r.hostel_id !== hostelId) {
        return res.status(400).json({
          success: false,
          message: `Room ${r.room_number} does not belong to ${block}.`
        });
      }
      if (r.capacity !== capNum) {
        return res.status(400).json({
          success: false,
          message: `Room ${r.room_number} capacity (${r.capacity}) does not match your chosen capacity (${capNum}).`
        });
      }
    }

    // 5. Atomic transaction to save preferences
    await connection.beginTransaction();

    const allMemberIds = [currentStudent.id, ...roommateStudentIds];

    // Remove any existing active group memberships for these students so preferences can be updated
    const memberPlaceholders = allMemberIds.map(() => '?').join(',');
    const [existingMemberships] = await connection.query(
      `SELECT DISTINCT group_id FROM group_members WHERE student_id IN (${memberPlaceholders})`,
      allMemberIds
    );

    for (const em of existingMemberships) {
      await connection.query('DELETE FROM roommate_groups WHERE id = ?', [em.group_id]);
    }

    // Create roommate group
    const [groupRes] = await connection.query(
      'INSERT INTO roommate_groups (primary_student_id, hostel_id, capacity, status) VALUES (?, ?, ?, "SUBMITTED")',
      [currentStudent.id, hostelId, capNum]
    );
    const groupId = groupRes.insertId;

    // Insert all members into group_members
    for (const sId of allMemberIds) {
      await connection.query(
        'INSERT INTO group_members (group_id, student_id) VALUES (?, ?)',
        [groupId, sId]
      );
    }

    // Insert 5 preferences in ranked order
    for (let i = 0; i < 5; i++) {
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
// 8. PRESERVED ALLOCATION ENGINE (Trigger Room Assignment)
// Assigns rooms based on merit rank and 5 preferences without splitting groups
// ----------------------------------------------------------------------------
app.post('/api/admin/allocate', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get all submitted groups ordered by best student rank in group
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
      ORDER BY best_rank ASC
    `);

    let allocatedCount = 0;
    let waitlistedCount = 0;

    for (const grp of groups) {
      // Get group members
      const [members] = await connection.query(
        'SELECT student_id FROM group_members WHERE group_id = ?',
        [grp.group_id]
      );
      const studentIds = members.map(m => m.student_id);

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
           GROUP BY r.id`,
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
        allocatedCount++;
      } else {
        await connection.query(
          'UPDATE roommate_groups SET status = "WAITLISTED" WHERE id = ?',
          [grp.group_id]
        );
        waitlistedCount++;
      }
    }

    await connection.commit();
    res.json({
      success: true,
      message: `Allocation completed! Allocated ${allocatedCount} group(s). Waitlisted ${waitlistedCount} group(s).`,
      allocatedCount,
      waitlistedCount
    });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ success: false, message: err.message });
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
