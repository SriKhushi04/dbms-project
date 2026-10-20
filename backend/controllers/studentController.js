const pool = require('../config/db');

// GET /api/students
exports.getAllStudents = async (req, res) => {
  try {
    const { status, gender, branch, search } = req.query;

    let query = `
      SELECT 
        s.*,
        r.room_number,
        r.room_type,
        b.block_name,
        h.name AS hostel_name
      FROM students s
      LEFT JOIN rooms r ON s.current_room_id = r.id
      LEFT JOIN blocks b ON r.block_id = b.id
      LEFT JOIN hostels h ON b.hostel_id = h.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ` AND s.allocation_status = ?`;
      params.push(status);
    }
    if (gender) {
      query += ` AND s.gender = ?`;
      params.push(gender);
    }
    if (branch) {
      query += ` AND s.branch LIKE ?`;
      params.push(`%${branch}%`);
    }
    if (search) {
      query += ` AND (s.registration_number LIKE ? OR s.name LIKE ? OR s.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY s.id ASC`;

    const [students] = await pool.query(query, params);
    res.json({ success: true, count: students.length, data: students });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ success: false, message: 'Database error fetching students', error: error.message });
  }
};

// GET /api/students/:id
exports.getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    const [students] = await pool.query(`
      SELECT 
        s.*,
        r.room_number,
        r.room_type,
        r.fee_per_semester,
        b.block_name,
        h.name AS hostel_name,
        h.type AS hostel_type
      FROM students s
      LEFT JOIN rooms r ON s.current_room_id = r.id
      LEFT JOIN blocks b ON r.block_id = b.id
      LEFT JOIN hostels h ON b.hostel_id = h.id
      WHERE s.id = ?
    `, [id]);

    if (students.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Allocation history
    const [history] = await pool.query(`
      SELECT 
        a.*,
        r.room_number,
        r.room_type,
        b.block_name,
        h.name AS hostel_name
      FROM allocations a
      JOIN rooms r ON a.room_id = r.id
      JOIN blocks b ON r.block_id = b.id
      JOIN hostels h ON b.hostel_id = h.id
      WHERE a.student_id = ?
      ORDER BY a.allocated_date DESC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...students[0],
        history
      }
    });
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.status(500).json({ success: false, message: 'Database error fetching student', error: error.message });
  }
};

// POST /api/students
exports.createStudent = async (req, res) => {
  try {
    const { registration_number, name, email, phone, gender, branch, year_of_study } = req.body;

    if (!registration_number || !name || !email || !gender || !branch) {
      return res.status(400).json({ success: false, message: 'Required student fields missing' });
    }

    const [result] = await pool.query(`
      INSERT INTO students (registration_number, name, email, phone, gender, branch, year_of_study, allocation_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'NOT_ALLOCATED')
    `, [registration_number.toUpperCase().trim(), name.trim(), email.trim(), phone || '', gender, branch, year_of_study || 1]);

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: { id: result.insertId, registration_number, name, email }
    });
  } catch (error) {
    console.error('Error registering student:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Registration number or email already exists' });
    }
    res.status(500).json({ success: false, message: 'Database error registering student', error: error.message });
  }
};

