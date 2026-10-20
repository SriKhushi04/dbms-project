const pool = require('../config/db');

// GET /api/dashboard/stats
// Calculates real-time system counts strictly from MySQL database
exports.getDashboardStats = async (req, res) => {
  try {
    // 1. Overall counts
    const [overallCounts] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM hostels) AS totalHostels,
        (SELECT COUNT(*) FROM blocks) AS totalBlocks,
        (SELECT COUNT(*) FROM rooms) AS totalRooms,
        (SELECT COUNT(*) FROM rooms WHERE status = 'AVAILABLE') AS availableRooms,
        (SELECT COUNT(*) FROM rooms WHERE status = 'FULL') AS fullRooms,
        (SELECT COUNT(*) FROM rooms WHERE status = 'MAINTENANCE') AS maintenanceRooms,
        (SELECT COALESCE(SUM(capacity), 0) FROM rooms) AS totalCapacity,
        (SELECT COALESCE(SUM(occupied_count), 0) FROM rooms) AS totalOccupiedBeds,
        (SELECT COALESCE(SUM(CASE WHEN status != 'MAINTENANCE' THEN (capacity - occupied_count) ELSE 0 END), 0) FROM rooms) AS totalAvailableBeds,
        (SELECT COUNT(*) FROM students) AS totalStudents,
        (SELECT COUNT(*) FROM students WHERE allocation_status = 'ALLOCATED') AS allocatedStudents,
        (SELECT COUNT(*) FROM students WHERE allocation_status = 'NOT_ALLOCATED') AS unallocatedStudents
    `);

    const stats = overallCounts[0];
    const totalCapacity = Number(stats.totalCapacity) || 0;
    const totalOccupiedBeds = Number(stats.totalOccupiedBeds) || 0;
    stats.occupancyRate = totalCapacity > 0 ? Number(((totalOccupiedBeds / totalCapacity) * 100).toFixed(1)) : 0;

    // 2. Per-Hostel summary breakdown
    const [hostelBreakdown] = await pool.query(`
      SELECT 
        h.id,
        h.name,
        h.type,
        COUNT(DISTINCT b.id) AS blockCount,
        COUNT(r.id) AS roomCount,
        COALESCE(SUM(r.capacity), 0) AS totalCapacity,
        COALESCE(SUM(r.occupied_count), 0) AS occupiedBeds,
        COALESCE(SUM(CASE WHEN r.status != 'MAINTENANCE' THEN (r.capacity - r.occupied_count) ELSE 0 END), 0) AS availableBeds,
        CASE 
          WHEN COALESCE(SUM(r.capacity), 0) > 0 THEN 
            ROUND((SUM(r.occupied_count) / SUM(r.capacity)) * 100, 1)
          ELSE 0 
        END AS occupancyRate
      FROM hostels h
      LEFT JOIN blocks b ON h.id = b.hostel_id
      LEFT JOIN rooms r ON b.id = r.block_id
      GROUP BY h.id, h.name, h.type
      ORDER BY h.id ASC
    `);

    // 3. Per-Room-Type breakdown
    const [roomTypeBreakdown] = await pool.query(`
      SELECT 
        room_type AS roomType,
        COUNT(*) AS totalRooms,
        COALESCE(SUM(capacity), 0) AS totalCapacity,
        COALESCE(SUM(occupied_count), 0) AS occupiedCount,
        COALESCE(SUM(capacity - occupied_count), 0) AS availableBeds
      FROM rooms
      GROUP BY room_type
      ORDER BY totalRooms DESC
    `);

    // 4. Recent allocations
    const [recentAllocations] = await pool.query(`
      SELECT 
        a.id,
        a.allocated_date,
        a.academic_year,
        s.registration_number,
        s.name AS student_name,
        s.gender,
        s.branch,
        r.room_number,
        r.room_type,
        b.block_name,
        h.name AS hostel_name
      FROM allocations a
      JOIN students s ON a.student_id = s.id
      JOIN rooms r ON a.room_id = r.id
      JOIN blocks b ON r.block_id = b.id
      JOIN hostels h ON b.hostel_id = h.id
      WHERE a.status = 'ACTIVE'
      ORDER BY a.allocated_date DESC
      LIMIT 6
    `);

    res.json({
      success: true,
      data: {
        summary: stats,
        hostelBreakdown,
        roomTypeBreakdown,
        recentAllocations
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard metrics from database', error: error.message });
  }
};

