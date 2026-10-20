const pool = require('../config/db');

// GET /api/rooms
// Supports filtering by hostelId, blockId, status, roomType, minCapacity, floor
exports.getAllRooms = async (req, res) => {
  try {
    const { hostelId, blockId, status, roomType, floor, availableOnly } = req.query;

    let query = `
      SELECT 
        r.id,
        r.block_id,
        r.room_number,
        r.floor,
        r.room_type,
        r.capacity,
        r.occupied_count,
        (r.capacity - r.occupied_count) AS available_beds,
        r.fee_per_semester,
        r.status,
        r.created_at,
        b.block_name,
        h.id AS hostel_id,
        h.name AS hostel_name,
        h.type AS hostel_type
      FROM rooms r
      JOIN blocks b ON r.block_id = b.id
      JOIN hostels h ON b.hostel_id = h.id
      WHERE 1=1
    `;
    const params = [];

    if (hostelId) {
      query += ` AND h.id = ?`;
      params.push(hostelId);
    }
    if (blockId) {
      query += ` AND b.id = ?`;
      params.push(blockId);
    }
    if (status) {
      query += ` AND r.status = ?`;
      params.push(status);
    }
    if (roomType) {
      query += ` AND r.room_type = ?`;
      params.push(roomType);
    }
    if (floor) {
      query += ` AND r.floor = ?`;
      params.push(floor);
    }
    if (availableOnly === 'true' || availableOnly === true) {
      query += ` AND r.status = 'AVAILABLE' AND (r.capacity - r.occupied_count) > 0`;
    }

    query += ` ORDER BY h.name ASC, b.block_name ASC, r.floor ASC, r.room_number ASC`;

    const [rooms] = await pool.query(query, params);
    res.json({ success: true, count: rooms.length, data: rooms });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ success: false, message: 'Database error fetching rooms', error: error.message });
  }
};

// GET /api/rooms/:id
exports.getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rooms] = await pool.query(`
      SELECT 
        r.*,
        (r.capacity - r.occupied_count) AS available_beds,
        b.block_name,
        h.id AS hostel_id,
        h.name AS hostel_name,
        h.type AS hostel_type
      FROM rooms r
      JOIN blocks b ON r.block_id = b.id
      JOIN hostels h ON b.hostel_id = h.id
      WHERE r.id = ?
    `, [id]);

    if (rooms.length === 0) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Get current occupants allocated in this room
    const [occupants] = await pool.query(`
      SELECT 
        s.id,
        s.registration_number,
        s.name,
        s.email,
        s.phone,
        s.gender,
        s.branch,
        s.year_of_study,
        a.allocated_date,
        a.academic_year
      FROM students s
      JOIN allocations a ON s.id = a.student_id
      WHERE a.room_id = ? AND a.status = 'ACTIVE'
    `, [id]);

    res.json({
      success: true,
      data: {
        ...rooms[0],
        occupants
      }
    });
  } catch (error) {
    console.error('Error fetching room by ID:', error);
    res.status(500).json({ success: false, message: 'Database error fetching room details', error: error.message });
  }
};

// POST /api/rooms
exports.createRoom = async (req, res) => {
  try {
    const { block_id, room_number, floor, room_type, capacity, fee_per_semester, status } = req.body;

    if (!block_id || !room_number || !room_type || !capacity) {
      return res.status(400).json({ success: false, message: 'Missing required room fields' });
    }

    const roomStatus = status || 'AVAILABLE';

    const [result] = await pool.query(`
      INSERT INTO rooms (block_id, room_number, floor, room_type, capacity, occupied_count, fee_per_semester, status)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?)
    `, [block_id, room_number, floor || 1, room_type, capacity, fee_per_semester || 0.00, roomStatus]);

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: { id: result.insertId, block_id, room_number, room_type, capacity, status: roomStatus }
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ success: false, message: 'Database error creating room', error: error.message });
  }
};

// PUT /api/rooms/:id/status
exports.updateRoomStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, fee_per_semester } = req.body;

    if (!status && fee_per_semester === undefined) {
      return res.status(400).json({ success: false, message: 'Status or fee must be provided' });
    }

    let updateFields = [];
    let params = [];

    if (status) {
      updateFields.push('status = ?');
      params.push(status);
    }
    if (fee_per_semester !== undefined) {
      updateFields.push('fee_per_semester = ?');
      params.push(fee_per_semester);
    }

    params.push(id);
    await pool.query(`UPDATE rooms SET ${updateFields.join(', ')} WHERE id = ?`, params);

    res.json({ success: true, message: 'Room updated successfully' });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ success: false, message: 'Database error updating room', error: error.message });
  }
};

