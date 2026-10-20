const pool = require('../config/db');

// POST /api/allocations/allocate
// Transaction-safe room allocation adhering to capacity and gender policy
exports.allocateRoom = async (req, res) => {
  const { student_id, room_id, academic_year, remarks } = req.body;

  if (!student_id || !room_id) {
    return res.status(400).json({ success: false, message: 'student_id and room_id are required' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Fetch student info with row lock
    const [students] = await connection.query(
      'SELECT id, name, gender, allocation_status, current_room_id FROM students WHERE id = ? FOR UPDATE',
      [student_id]
    );

    if (students.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const student = students[0];
    if (student.allocation_status === 'ALLOCATED') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Student ${student.name} is already allocated to Room ID ${student.current_room_id}. Vacate first to re-allocate.`
      });
    }

    // 2. Fetch room and hostel info with row lock
    const [rooms] = await connection.query(`
      SELECT 
        r.id, r.room_number, r.capacity, r.occupied_count, r.status,
        h.id AS hostel_id, h.name AS hostel_name, h.type AS hostel_type
      FROM rooms r
      JOIN blocks b ON r.block_id = b.id
      JOIN hostels h ON b.hostel_id = h.id
      WHERE r.id = ? FOR UPDATE
    `, [room_id]);

    if (rooms.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const room = rooms[0];

    // Check room maintenance
    if (room.status === 'MAINTENANCE') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: `Room ${room.room_number} is currently under MAINTENANCE.` });
    }

    // Check capacity
    if (room.occupied_count >= room.capacity) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Room ${room.room_number} is FULL (Capacity: ${room.capacity}, Occupied: ${room.occupied_count}).`
      });
    }

    // Validate gender policy
    if (room.hostel_type === 'BOYS' && student.gender !== 'MALE') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Gender mismatch: ${room.hostel_name} is a Boys hostel, but student gender is ${student.gender}.`
      });
    }

    if (room.hostel_type === 'GIRLS' && student.gender !== 'FEMALE') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Gender mismatch: ${room.hostel_name} is a Girls hostel, but student gender is ${student.gender}.`
      });
    }

    // 3. Create active allocation entry
    const acadYear = academic_year || '2026-2027';
    const [allocResult] = await connection.query(`
      INSERT INTO allocations (student_id, room_id, academic_year, status, remarks)
      VALUES (?, ?, ?, 'ACTIVE', ?)
    `, [student_id, room_id, acadYear, remarks || 'Standard room allocation']);

    // 4. Update student record
    await connection.query(`
      UPDATE students 
      SET allocation_status = 'ALLOCATED', current_room_id = ? 
      WHERE id = ?
    `, [room_id, student_id]);

    // 5. Update room occupied_count and status
    const newOccupiedCount = room.occupied_count + 1;
    const newStatus = newOccupiedCount >= room.capacity ? 'FULL' : 'AVAILABLE';

    await connection.query(`
      UPDATE rooms 
      SET occupied_count = ?, status = ? 
      WHERE id = ?
    `, [newOccupiedCount, newStatus, room_id]);

    await connection.commit();

    res.status(201).json({
      success: true,
      message: `Successfully allocated Room ${room.room_number} (${room.hostel_name}) to ${student.name}.`,
      data: {
        allocation_id: allocResult.insertId,
        student_id,
        room_id,
        room_number: room.room_number,
        occupied_count: newOccupiedCount,
        capacity: room.capacity,
        room_status: newStatus
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error in allocateRoom transaction:', error);
    res.status(500).json({ success: false, message: 'Transaction failed during room allocation', error: error.message });
  } finally {
    connection.release();
  }
};

// POST /api/allocations/vacate
// Safe de-allocation and room restoration
exports.vacateRoom = async (req, res) => {
  const { student_id, remarks } = req.body;

  if (!student_id) {
    return res.status(400).json({ success: false, message: 'student_id is required' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Fetch student info
    const [students] = await connection.query(
      'SELECT id, name, allocation_status, current_room_id FROM students WHERE id = ? FOR UPDATE',
      [student_id]
    );

    if (students.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const student = students[0];
    if (student.allocation_status !== 'ALLOCATED' || !student.current_room_id) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: `Student ${student.name} is not currently allocated to any room.` });
    }

    const roomId = student.current_room_id;

    // 2. Fetch room info
    const [rooms] = await connection.query(
      'SELECT id, room_number, capacity, occupied_count, status FROM rooms WHERE id = ? FOR UPDATE',
      [roomId]
    );

    // 3. Mark active allocation as VACATED
    await connection.query(`
      UPDATE allocations 
      SET status = 'VACATED', vacated_date = CURRENT_TIMESTAMP, remarks = CONCAT(COALESCE(remarks, ''), ' | Vacated: ', ?)
      WHERE student_id = ? AND room_id = ? AND status = 'ACTIVE'
    `, [remarks || 'Vacated by administrator', student_id, roomId]);

    // 4. Update student status
    await connection.query(`
      UPDATE students 
      SET allocation_status = 'NOT_ALLOCATED', current_room_id = NULL 
      WHERE id = ?
    `, [student_id]);

    // 5. Decrement room occupied count and restore status to AVAILABLE if not under maintenance
    let newOccupied = 0;
    let roomNumber = 'N/A';
    if (rooms.length > 0) {
      const room = rooms[0];
      roomNumber = room.room_number;
      newOccupied = Math.max(0, room.occupied_count - 1);
      const newStatus = room.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'AVAILABLE';

      await connection.query(`
        UPDATE rooms 
        SET occupied_count = ?, status = ? 
        WHERE id = ?
      `, [newOccupied, newStatus, roomId]);
    }

    await connection.commit();

    res.json({
      success: true,
      message: `Successfully vacated ${student.name} from Room ${roomNumber}.`,
      data: {
        student_id,
        room_id: roomId,
        room_number: roomNumber,
        new_occupied_count: newOccupied
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error in vacateRoom transaction:', error);
    res.status(500).json({ success: false, message: 'Transaction failed during room vacation', error: error.message });
  } finally {
    connection.release();
  }
};

// GET /api/allocations/history
exports.getAllocationsHistory = async (req, res) => {
  try {
    const { status, limit } = req.query;

    let query = `
      SELECT 
        a.id,
        a.student_id,
        a.room_id,
        a.academic_year,
        a.allocated_date,
        a.vacated_date,
        a.status,
        a.remarks,
        s.registration_number,
        s.name AS student_name,
        s.gender AS student_gender,
        s.branch AS student_branch,
        s.email AS student_email,
        r.room_number,
        r.room_type,
        r.fee_per_semester,
        b.block_name,
        h.name AS hostel_name
      FROM allocations a
      JOIN students s ON a.student_id = s.id
      JOIN rooms r ON a.room_id = r.id
      JOIN blocks b ON r.block_id = b.id
      JOIN hostels h ON b.hostel_id = h.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND a.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY a.allocated_date DESC`;

    if (limit) {
      query += ` LIMIT ?`;
      params.push(parseInt(limit, 10));
    }

    const [allocations] = await pool.query(query, params);
    res.json({ success: true, count: allocations.length, data: allocations });
  } catch (error) {
    console.error('Error fetching allocations history:', error);
    res.status(500).json({ success: false, message: 'Database error fetching allocation records', error: error.message });
  }
};

