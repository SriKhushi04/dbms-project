// ============================================================================
// Room Inventory Controller
// ============================================================================

import pool from '../config/db.js';

// GET /api/rooms
export const getAllRooms = async (req, res, next) => {
  try {
    const { block_id, capacity, room_type, batch_id } = req.query;

    let query = `
      SELECT 
        r.id,
        r.block_id,
        r.room_number,
        r.capacity,
        r.room_type,
        r.floor,
        r.is_active,
        hb.block_name,
        hb.gender_policy,
        COUNT(DISTINCT al.id) AS current_occupants_count,
        CASE 
          WHEN COUNT(DISTINCT al.id) >= r.capacity THEN 'OCCUPIED'
          WHEN COUNT(DISTINCT al.id) > 0 THEN 'PARTIAL'
          ELSE 'AVAILABLE'
        END AS occupancy_status
      FROM rooms r
      JOIN hostel_blocks hb ON r.block_id = hb.id
      LEFT JOIN allocations al ON r.id = al.room_id AND al.status = 'ACTIVE'
    `;
    const params = [];

    query += ` WHERE 1=1`;

    if (block_id) {
      query += ` AND r.block_id = ?`;
      params.push(block_id);
    }
    if (capacity) {
      query += ` AND r.capacity = ?`;
      params.push(parseInt(capacity, 10));
    }
    if (room_type) {
      query += ` AND r.room_type = ?`;
      params.push(room_type);
    }

    query += ` GROUP BY r.id, hb.id ORDER BY hb.block_name ASC, r.capacity ASC, r.room_number ASC`;

    const [rooms] = await pool.query(query, params);
    res.json({ success: true, count: rooms.length, rooms });
  } catch (err) {
    next(err);
  }
};

// GET /api/rooms/blocks
export const getAllBlocks = async (req, res, next) => {
  try {
    const [blocks] = await pool.query(`
      SELECT 
        hb.*,
        COUNT(DISTINCT r.id) AS total_rooms,
        COALESCE(SUM(r.capacity), 0) AS total_beds
      FROM hostel_blocks hb
      LEFT JOIN rooms r ON hb.id = r.block_id AND r.is_active = TRUE
      GROUP BY hb.id
      ORDER BY hb.block_name ASC
    `);
    res.json({ success: true, blocks });
  } catch (err) {
    next(err);
  }
};

