const pool = require('../config/db');

// GET /api/hostels
exports.getAllHostels = async (req, res) => {
  try {
    const [hostels] = await pool.query(`
      SELECT 
        h.id,
        h.name,
        h.type,
        h.description,
        h.warden_name,
        h.warden_contact,
        h.created_at,
        COUNT(DISTINCT b.id) AS total_blocks,
        COUNT(DISTINCT r.id) AS total_rooms,
        COALESCE(SUM(r.capacity), 0) AS total_capacity,
        COALESCE(SUM(r.occupied_count), 0) AS total_occupied,
        COALESCE(SUM(CASE WHEN r.status != 'MAINTENANCE' THEN (r.capacity - r.occupied_count) ELSE 0 END), 0) AS available_beds
      FROM hostels h
      LEFT JOIN blocks b ON h.id = b.hostel_id
      LEFT JOIN rooms r ON b.id = r.block_id
      GROUP BY h.id
      ORDER BY h.id ASC
    `);

    res.json({ success: true, data: hostels });
  } catch (error) {
    console.error('Error fetching hostels:', error);
    res.status(500).json({ success: false, message: 'Database error fetching hostels', error: error.message });
  }
};

// GET /api/hostels/:id
exports.getHostelById = async (req, res) => {
  try {
    const { id } = req.params;
    const [hostel] = await pool.query('SELECT * FROM hostels WHERE id = ?', [id]);
    if (hostel.length === 0) {
      return res.status(404).json({ success: false, message: 'Hostel not found' });
    }

    const [blocks] = await pool.query(`
      SELECT 
        b.*,
        COUNT(r.id) AS room_count,
        COALESCE(SUM(r.capacity), 0) AS total_capacity,
        COALESCE(SUM(r.occupied_count), 0) AS total_occupied
      FROM blocks b
      LEFT JOIN rooms r ON b.id = r.block_id
      WHERE b.hostel_id = ?
      GROUP BY b.id
    `, [id]);

    res.json({ success: true, data: { ...hostel[0], blocks } });
  } catch (error) {
    console.error('Error fetching hostel details:', error);
    res.status(500).json({ success: false, message: 'Database error fetching hostel details', error: error.message });
  }
};

// POST /api/hostels
exports.createHostel = async (req, res) => {
  try {
    const { name, type, description, warden_name, warden_contact } = req.body;
    if (!name || !type) {
      return res.status(400).json({ success: false, message: 'Hostel name and type are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO hostels (name, type, description, warden_name, warden_contact) VALUES (?, ?, ?, ?, ?)',
      [name, type, description || '', warden_name || '', warden_contact || '']
    );

    res.status(201).json({
      success: true,
      message: 'Hostel created successfully',
      data: { id: result.insertId, name, type, description, warden_name, warden_contact }
    });
  } catch (error) {
    console.error('Error creating hostel:', error);
    res.status(500).json({ success: false, message: 'Database error creating hostel', error: error.message });
  }
};

// POST /api/hostels/:id/blocks
exports.createBlock = async (req, res) => {
  try {
    const hostel_id = req.params.id;
    const { block_name, total_floors } = req.body;

    if (!block_name) {
      return res.status(400).json({ success: false, message: 'Block name is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO blocks (hostel_id, block_name, total_floors) VALUES (?, ?, ?)',
      [hostel_id, block_name, total_floors || 1]
    );

    res.status(201).json({
      success: true,
      message: 'Block added successfully',
      data: { id: result.insertId, hostel_id, block_name, total_floors: total_floors || 1 }
    });
  } catch (error) {
    console.error('Error adding block:', error);
    res.status(500).json({ success: false, message: 'Database error adding block', error: error.message });
  }
};

// GET /api/hostels/blocks/all
exports.getAllBlocks = async (req, res) => {
  try {
    const [blocks] = await pool.query(`
      SELECT b.*, h.name AS hostel_name, h.type AS hostel_type
      FROM blocks b
      JOIN hostels h ON b.hostel_id = h.id
      ORDER BY b.hostel_id ASC, b.block_name ASC
    `);
    res.json({ success: true, data: blocks });
  } catch (error) {
    console.error('Error fetching all blocks:', error);
    res.status(500).json({ success: false, message: 'Database error fetching blocks', error: error.message });
  }
};

