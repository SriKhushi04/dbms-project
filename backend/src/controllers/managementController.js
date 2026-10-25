// ============================================================================
// HOSTELHUB MANAGEMENT MODULE CONTROLLER
// Complete business logic for Maintenance, Fees, Mess, and Curfew/Gate Pass
// ============================================================================

import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/managementAuth.js';

// Helper to sanitize string inputs
const cleanStr = (val) => (typeof val === 'string' ? val.trim() : '');

export function createManagementController(pool) {
  return {
    // ========================================================================
    // 1. SECURE AUTHENTICATION & STAFF SETUP
    // ========================================================================

    /**
     * Safe first-time staff account setup.
     * Only permitted if zero staff accounts exist.
     */
    async setupFirstStaff(req, res) {
      try {
        const [rows] = await pool.query('SELECT COUNT(*) AS count FROM management_staff');
        if (rows[0].count > 0) {
          return res.status(403).json({
            success: false,
            message: 'First-time staff setup is already complete. Please log in with existing staff credentials.'
          });
        }

        // Security Guard: Check setup key if configured in environment
        const expectedKey = process.env.INITIAL_STAFF_SETUP_KEY;
        const providedKey = req.body.setup_key || req.headers['x-setup-key'];
        if (expectedKey && providedKey !== expectedKey) {
          return res.status(401).json({
            success: false,
            message: 'Unauthorized: Invalid or missing initial staff setup key (x-setup-key).'
          });
        }

        const { username, password, full_name, role = 'WARDEN' } = req.body;
        const cleanUser = cleanStr(username);
        const cleanPass = cleanStr(password);
        const cleanName = cleanStr(full_name);

        if (!cleanUser || cleanUser.length < 3) {
          return res.status(400).json({ success: false, message: 'Username must be at least 3 characters.' });
        }
        if (!cleanPass || cleanPass.length < 8) {
          return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
        }
        if (!cleanName || cleanName.length < 2) {
          return res.status(400).json({ success: false, message: 'Full name is required.' });
        }

        const allowedRoles = ['WARDEN', 'ACCOUNTANT', 'MESS_SUPERVISOR', 'SECURITY_GUARD'];
        if (!allowedRoles.includes(role)) {
          return res.status(400).json({ success: false, message: 'Invalid staff role specified.' });
        }

        const hash = await bcrypt.hash(cleanPass, 10);
        const [result] = await pool.query(
          'INSERT INTO management_staff (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
          [cleanUser, hash, cleanName, role]
        );

        const token = generateToken({
          sub: result.insertId,
          username: cleanUser,
          role,
          full_name: cleanName
        });

        res.status(201).json({
          success: true,
          message: 'Initial staff administrator account setup complete.',
          data: {
            token,
            staff: { id: result.insertId, username: cleanUser, full_name: cleanName, role }
          }
        });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Setup error: ' + err.message });
      }
    },

    /**
     * Authenticate staff (Warden, Accountant, Mess Supervisor, Security)
     */
    async staffLogin(req, res) {
      try {
        const { username, password } = req.body;
        const cleanUser = cleanStr(username);
        const cleanPass = cleanStr(password);

        if (!cleanUser || !cleanPass) {
          return res.status(400).json({ success: false, message: 'Username and password are required.' });
        }

        const [rows] = await pool.query(
          'SELECT id, username, password_hash, full_name, role FROM management_staff WHERE username = ?',
          [cleanUser]
        );

        if (rows.length === 0) {
          return res.status(401).json({ success: false, message: 'Invalid username or password.' });
        }

        const staff = rows[0];
        const match = await bcrypt.compare(cleanPass, staff.password_hash);
        if (!match) {
          return res.status(401).json({ success: false, message: 'Invalid username or password.' });
        }

        const token = generateToken({
          sub: staff.id,
          username: staff.username,
          role: staff.role,
          full_name: staff.full_name
        });

        res.json({
          success: true,
          message: 'Staff authenticated successfully.',
          data: {
            token,
            staff: { id: staff.id, username: staff.username, full_name: staff.full_name, role: staff.role }
          }
        });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Login error: ' + err.message });
      }
    },

    /**
     * Create additional staff accounts (Warden-only)
     */
    async createStaffAccount(req, res) {
      try {
        const { username, password, full_name, role } = req.body;
        const cleanUser = cleanStr(username);
        const cleanPass = cleanStr(password);
        const cleanName = cleanStr(full_name);

        if (!cleanUser || cleanUser.length < 3) {
          return res.status(400).json({ success: false, message: 'Username must be at least 3 characters.' });
        }
        if (!cleanPass || cleanPass.length < 8) {
          return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
        }
        if (!cleanName || cleanName.length < 2) {
          return res.status(400).json({ success: false, message: 'Full name is required.' });
        }

        const allowedRoles = ['WARDEN', 'ACCOUNTANT', 'MESS_SUPERVISOR', 'SECURITY_GUARD'];
        if (!allowedRoles.includes(role)) {
          return res.status(400).json({ success: false, message: 'Invalid staff role specified.' });
        }

        const hash = await bcrypt.hash(cleanPass, 10);
        const [result] = await pool.query(
          'INSERT INTO management_staff (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
          [cleanUser, hash, cleanName, role]
        );

        res.status(201).json({
          success: true,
          message: `Staff account (${role}) created successfully.`,
          data: { id: result.insertId, username: cleanUser, full_name: cleanName, role }
        });
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ success: false, message: 'Username is already in use.' });
        }
        res.status(500).json({ success: false, message: 'Failed to create staff account: ' + err.message });
      }
    },

    /**
     * Student registers or sets their Management password
     */
    async studentRegister(req, res) {
      try {
        const { registration_number, password } = req.body;
        const cleanReg = cleanStr(registration_number).toUpperCase();
        const cleanPass = cleanStr(password);

        if (!cleanReg || !cleanPass) {
          return res.status(400).json({ success: false, message: 'Registration number and password are required.' });
        }
        if (cleanPass.length < 8) {
          return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
        }

        // Verify student exists in students table
        const [students] = await pool.query(
          'SELECT id, registration_number, full_name, merit_rank, is_eligible FROM students WHERE registration_number = ?',
          [cleanReg]
        );

        if (students.length === 0) {
          return res.status(404).json({ success: false, message: 'Registration number not found in university records.' });
        }

        const student = students[0];
        if (!student.is_eligible) {
          return res.status(403).json({ success: false, message: 'Student is not currently eligible for hostel services.' });
        }

        const hash = await bcrypt.hash(cleanPass, 10);

        // Store in student_credentials
        await pool.query(
          'INSERT INTO student_credentials (student_id, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE password_hash = ?',
          [student.id, hash, hash]
        );

        const token = generateToken({
          sub: student.id,
          registration_number: student.registration_number,
          role: 'STUDENT'
        });

        res.status(201).json({
          success: true,
          message: 'Student management password registered successfully.',
          data: {
            token,
            student: {
              id: student.id,
              registration_number: student.registration_number,
              full_name: student.full_name,
              merit_rank: student.merit_rank
            }
          }
        });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Registration error: ' + err.message });
      }
    },

    /**
     * Student logs in to Management
     */
    async studentLogin(req, res) {
      try {
        const { registration_number, password } = req.body;
        const cleanReg = cleanStr(registration_number).toUpperCase();
        const cleanPass = cleanStr(password);

        if (!cleanReg || !cleanPass) {
          return res.status(400).json({ success: false, message: 'Registration number and password are required.' });
        }

        const [rows] = await pool.query(`
          SELECT s.id, s.registration_number, s.full_name, s.merit_rank, s.is_eligible, sc.password_hash
          FROM students s
          LEFT JOIN student_credentials sc ON s.id = sc.student_id
          WHERE s.registration_number = ?
        `, [cleanReg]);

        if (rows.length === 0) {
          return res.status(401).json({ success: false, message: 'Invalid credentials or student record not found.' });
        }

        const student = rows[0];
        if (!student.is_eligible) {
          return res.status(403).json({ success: false, message: 'Student is not eligible for hostel management services.' });
        }

        if (!student.password_hash) {
          return res.status(400).json({
            success: false,
            needsRegistration: true,
            message: 'First-time setup required. Please register your management password.'
          });
        }

        const match = await bcrypt.compare(cleanPass, student.password_hash);
        if (!match) {
          return res.status(401).json({ success: false, message: 'Invalid registration number or password.' });
        }

        // Check allocated room (Read-only query to Phase 1 allocations)
        const [allocRows] = await pool.query(`
          SELECT r.id AS room_id, r.room_number, r.capacity, h.id AS hostel_id, h.block_name
          FROM allocations a
          JOIN rooms r ON a.room_id = r.id
          JOIN hostels h ON r.hostel_id = h.id
          WHERE a.student_id = ?
        `, [student.id]);

        const allocatedRoom = allocRows.length > 0 ? allocRows[0] : null;

        const token = generateToken({
          sub: student.id,
          registration_number: student.registration_number,
          role: 'STUDENT'
        });

        res.json({
          success: true,
          message: 'Student authenticated successfully.',
          data: {
            token,
            student: {
              id: student.id,
              registration_number: student.registration_number,
              full_name: student.full_name,
              merit_rank: student.merit_rank,
              allocated_room: allocatedRoom
            }
          }
        });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Login error: ' + err.message });
      }
    },

    // ========================================================================
    // 2. FEATURE 1: MAINTENANCE & COMPLAINTS SYSTEM
    // ========================================================================

    /**
     * Submit a new maintenance ticket
     */
    async createComplaint(req, res) {
      try {
        const studentId = req.studentId;
        const { category, title, description, priority = 'MEDIUM', scope = 'ROOM', hostel_id } = req.body;

        const allowedCategories = ['ELECTRICAL', 'PLUMBING', 'FURNITURE', 'CLEANLINESS', 'INTERNET', 'OTHER'];
        if (!allowedCategories.includes(category)) {
          return res.status(400).json({ success: false, message: 'Invalid complaint category.' });
        }

        const allowedPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
        if (!allowedPriorities.includes(priority)) {
          return res.status(400).json({ success: false, message: 'Invalid priority level.' });
        }

        const cleanTitle = cleanStr(title);
        const cleanDesc = cleanStr(description);

        if (cleanTitle.length < 5 || cleanTitle.length > 150) {
          return res.status(400).json({ success: false, message: 'Title must be between 5 and 150 characters.' });
        }
        if (cleanDesc.length < 10 || cleanDesc.length > 1000) {
          return res.status(400).json({ success: false, message: 'Description must be between 10 and 1000 characters.' });
        }

        // Check if student has an allocated room
        const [allocs] = await pool.query(`
          SELECT a.room_id, r.hostel_id, r.room_number, h.block_name
          FROM allocations a
          JOIN rooms r ON a.room_id = r.id
          JOIN hostels h ON r.hostel_id = h.id
          WHERE a.student_id = ?
        `, [studentId]);

        let resolvedRoomId = null;
        let resolvedHostelId = null;

        if (scope === 'ROOM' && allocs.length > 0) {
          resolvedRoomId = allocs[0].room_id;
          resolvedHostelId = allocs[0].hostel_id;
        } else {
          // Common facility complaint
          if (hostel_id) {
            resolvedHostelId = parseInt(hostel_id, 10);
          } else if (allocs.length > 0) {
            resolvedHostelId = allocs[0].hostel_id;
          } else {
            // Default to Block A if unallocated and unspecified
            const [firstHostel] = await pool.query('SELECT id FROM hostels ORDER BY id ASC LIMIT 1');
            resolvedHostelId = firstHostel[0].id;
          }
        }

        const ticketNumber = `TKT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

        const [insertRes] = await pool.query(`
          INSERT INTO maintenance_tickets 
            (ticket_number, student_id, room_id, hostel_id, category, title, description, priority, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
        `, [ticketNumber, studentId, resolvedRoomId, resolvedHostelId, category, cleanTitle, cleanDesc, priority]);

        res.status(201).json({
          success: true,
          message: 'Maintenance ticket lodged successfully.',
          data: {
            id: insertRes.insertId,
            ticket_number: ticketNumber,
            category,
            title: cleanTitle,
            priority,
            status: 'PENDING',
            room_id: resolvedRoomId,
            hostel_id: resolvedHostelId
          }
        });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to lodge complaint: ' + err.message });
      }
    },

    /**
     * Get tickets submitted by the authenticated student
     */
    async getMyComplaints(req, res) {
      try {
        const studentId = req.studentId;
        const [rows] = await pool.query(`
          SELECT 
            t.id, t.ticket_number, t.category, t.title, t.description, t.priority, t.status,
            t.assigned_to, t.resolution_notes, t.created_at, t.resolved_at,
            r.room_number, h.block_name
          FROM maintenance_tickets t
          LEFT JOIN rooms r ON t.room_id = r.id
          LEFT JOIN hostels h ON t.hostel_id = h.id
          WHERE t.student_id = ?
          ORDER BY t.created_at DESC
        `, [studentId]);

        res.json({ success: true, count: rows.length, data: rows });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch complaints: ' + err.message });
      }
    },

    /**
     * Get all complaints (Warden view with filters)
     */
    async getAllComplaintsAdmin(req, res) {
      try {
        const { status, category, priority, block } = req.query;
        let query = `
          SELECT 
            t.id, t.ticket_number, t.category, t.title, t.description, t.priority, t.status,
            t.assigned_to, t.resolution_notes, t.created_at, t.resolved_at,
            s.registration_number, s.full_name AS student_name,
            r.room_number, h.block_name
          FROM maintenance_tickets t
          JOIN students s ON t.student_id = s.id
          LEFT JOIN rooms r ON t.room_id = r.id
          LEFT JOIN hostels h ON t.hostel_id = h.id
          WHERE 1=1
        `;
        const params = [];

        if (status) {
          query += ' AND t.status = ?';
          params.push(status);
        }
        if (category) {
          query += ' AND t.category = ?';
          params.push(category);
        }
        if (priority) {
          query += ' AND t.priority = ?';
          params.push(priority);
        }
        if (block) {
          query += ' AND h.block_name = ?';
          params.push(block);
        }

        query += ' ORDER BY t.created_at DESC';

        const [rows] = await pool.query(query, params);
        res.json({ success: true, count: rows.length, data: rows });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch complaints roster: ' + err.message });
      }
    },

    /**
     * Update ticket status, technician assignment, and resolution notes
     */
    async updateComplaintStatus(req, res) {
      try {
        const ticketId = parseInt(req.params.id, 10);
        const { status, assigned_to, resolution_notes } = req.body;

        const [tickets] = await pool.query(
          'SELECT id, status FROM maintenance_tickets WHERE id = ?',
          [ticketId]
        );

        if (tickets.length === 0) {
          return res.status(404).json({ success: false, message: `Ticket #${ticketId} not found.` });
        }

        const currentStatus = tickets[0].status;
        const validTransitions = {
          PENDING: ['IN_PROGRESS', 'REJECTED'],
          IN_PROGRESS: ['RESOLVED', 'REJECTED'],
          RESOLVED: ['IN_PROGRESS'],
          REJECTED: []
        };

        if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(status)) {
          return res.status(400).json({
            success: false,
            message: `Invalid status transition from ${currentStatus} to ${status}.`
          });
        }

        const cleanNotes = cleanStr(resolution_notes);
        if (['RESOLVED', 'REJECTED'].includes(status) && cleanNotes.length < 5) {
          return res.status(400).json({
            success: false,
            message: 'Resolution notes (minimum 5 characters) are mandatory when resolving or rejecting a ticket.'
          });
        }

        const resolvedAt = status === 'RESOLVED' ? new Date() : null;
        await pool.query(`
          UPDATE maintenance_tickets
          SET status = ?, assigned_to = COALESCE(?, assigned_to), resolution_notes = COALESCE(?, resolution_notes), resolved_at = ?
          WHERE id = ?
        `, [status, cleanStr(assigned_to) || null, cleanNotes || null, resolvedAt, ticketId]);

        res.json({
          success: true,
          message: `Ticket #${ticketId} updated to ${status}.`,
          data: { id: ticketId, status, assigned_to, resolution_notes: cleanNotes }
        });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update ticket: ' + err.message });
      }
    },

    /**
     * Maintenance KPI statistics
     */
    async getComplaintStats(req, res) {
      try {
        const [counts] = await pool.query(`
          SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress,
            SUM(CASE WHEN status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved,
            SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) AS rejected
          FROM maintenance_tickets
        `);
        res.json({ success: true, data: counts[0] });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch stats: ' + err.message });
      }
    },

    // ========================================================================
    // 3. FEATURE 2: FEES & BILLING MANAGEMENT
    // ========================================================================

    /**
     * Get or initialize student fee invoice and transaction history
     */
    async getMyFeeLedger(req, res) {
      try {
        const studentId = req.studentId;

        // Check if invoice exists
        let [invoices] = await pool.query(
          'SELECT * FROM fee_invoices WHERE student_id = ?',
          [studentId]
        );

        if (invoices.length === 0) {
          // Calculate fee based on allocated room capacity
          const [allocs] = await pool.query(`
            SELECT r.capacity FROM allocations a JOIN rooms r ON a.room_id = r.id WHERE a.student_id = ?
          `, [studentId]);

          let roomFee = 30000.0; // default double
          if (allocs.length > 0) {
            const cap = allocs[0].capacity;
            if (cap === 1) roomFee = 45000.0;
            else if (cap === 2) roomFee = 30000.0;
            else if (cap === 4) roomFee = 20000.0;
          }

          const messFee = 18000.0;
          const cautionDeposit = 5000.0;
          const utilityFee = 3000.0;
          const total = roomFee + messFee + cautionDeposit + utilityFee;

          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);

          await pool.query(`
            INSERT INTO fee_invoices 
              (student_id, academic_term, room_fee, mess_fee, caution_deposit, utility_fee, total_amount, paid_amount, due_date, status)
            VALUES (?, '2026-FALL', ?, ?, ?, ?, ?, 0.00, ?, 'UNPAID')
          `, [studentId, roomFee, messFee, cautionDeposit, utilityFee, total, dueDate]);

          [invoices] = await pool.query('SELECT * FROM fee_invoices WHERE student_id = ?', [studentId]);
        }

        const invoice = invoices[0];
        const [payments] = await pool.query(
          'SELECT * FROM fee_payments WHERE invoice_id = ? ORDER BY paid_at DESC',
          [invoice.id]
        );

        res.json({
          success: true,
          data: {
            invoice,
            payments,
            outstanding_balance: Math.max(0, parseFloat(invoice.total_amount) - parseFloat(invoice.paid_amount)),
            is_cleared: parseFloat(invoice.paid_amount) >= parseFloat(invoice.total_amount)
          }
        });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Fee ledger error: ' + err.message });
      }
    },

    /**
     * Process student fee payment
     */
    async payFee(req, res) {
      const connection = await pool.getConnection();
      try {
        const studentId = req.studentId;
        const { amount, payment_mode = 'UPI' } = req.body;

        const payAmount = parseFloat(amount);
        if (isNaN(payAmount) || payAmount <= 0) {
          return res.status(400).json({ success: false, message: 'Payment amount must be greater than zero.' });
        }

        const allowedModes = ['UPI', 'CARD', 'NET_BANKING', 'CASH', 'DEMAND_DRAFT'];
        if (!allowedModes.includes(payment_mode)) {
          return res.status(400).json({ success: false, message: 'Invalid payment mode.' });
        }

        await connection.beginTransaction();

        const [invoices] = await connection.query(
          'SELECT * FROM fee_invoices WHERE student_id = ? FOR UPDATE',
          [studentId]
        );

        if (invoices.length === 0) {
          await connection.rollback();
          return res.status(404).json({ success: false, message: 'No invoice found for student.' });
        }

        const invoice = invoices[0];
        const currentPaid = parseFloat(invoice.paid_amount);
        const total = parseFloat(invoice.total_amount);
        const balance = total - currentPaid;

        if (payAmount > balance + 0.01) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: `Amount ₹${payAmount} exceeds current outstanding dues of ₹${balance.toFixed(2)}.`
          });
        }

        const paymentRef = `PAY-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 9000 + 1000)}`;

        await connection.query(`
          INSERT INTO fee_payments (invoice_id, student_id, payment_reference, amount, payment_mode, payment_status)
          VALUES (?, ?, ?, ?, ?, 'SUCCESS')
        `, [invoice.id, studentId, paymentRef, payAmount, payment_mode]);

        const newPaid = currentPaid + payAmount;
        const newStatus = newPaid >= total ? 'PAID' : 'PARTIAL';

        await connection.query(
          'UPDATE fee_invoices SET paid_amount = ?, status = ? WHERE id = ?',
          [newPaid, newStatus, invoice.id]
        );

        await connection.commit();

        res.json({
          success: true,
          message: `Payment of ₹${payAmount} processed successfully. Reference: ${paymentRef}`,
          data: {
            payment_reference: paymentRef,
            paid_amount: payAmount,
            new_balance: Math.max(0, total - newPaid),
            invoice_status: newStatus
          }
        });
      } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, message: 'Payment failed: ' + err.message });
      } finally {
        connection.release();
      }
    },

    /**
     * Accountant/Warden fee ledger directory
     */
    async getAllFeeLedgersAdmin(req, res) {
      try {
        const { status } = req.query;
        let query = `
          SELECT 
            fi.*, s.registration_number, s.full_name AS student_name,
            r.room_number, h.block_name
          FROM fee_invoices fi
          JOIN students s ON fi.student_id = s.id
          LEFT JOIN allocations a ON s.id = a.student_id
          LEFT JOIN rooms r ON a.room_id = r.id
          LEFT JOIN hostels h ON r.hostel_id = h.id
          WHERE 1=1
        `;
        const params = [];
        if (status) {
          query += ' AND fi.status = ?';
          params.push(status);
        }
        query += ' ORDER BY s.registration_number ASC';

        const [rows] = await pool.query(query, params);
        res.json({ success: true, count: rows.length, data: rows });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Ledger error: ' + err.message });
      }
    },

    // ========================================================================
    // 4. FEATURE 3: MESS & MEAL MANAGEMENT
    // ========================================================================

    /**
     * Get 7-day weekly menu
     */
    async getMessMenu(req, res) {
      try {
        const [rows] = await pool.query('SELECT * FROM mess_menu ORDER BY FIELD(day_of_week, "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY")');
        res.json({ success: true, count: rows.length, data: rows });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Menu error: ' + err.message });
      }
    },

    /**
     * Update menu for a day (Mess Supervisor/Warden)
     */
    async updateMessMenu(req, res) {
      try {
        const day = cleanStr(req.params.day).toUpperCase();
        const { breakfast, lunch, snacks, dinner, special_item } = req.body;

        const allowedDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
        if (!allowedDays.includes(day)) {
          return res.status(400).json({ success: false, message: 'Invalid day of week.' });
        }

        await pool.query(`
          INSERT INTO mess_menu (day_of_week, breakfast, lunch, snacks, dinner, special_item)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE breakfast=?, lunch=?, snacks=?, dinner=?, special_item=?
        `, [day, breakfast, lunch, snacks, dinner, special_item, breakfast, lunch, snacks, dinner, special_item]);

        res.json({ success: true, message: `Mess menu for ${day} updated successfully.` });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update menu: ' + err.message });
      }
    },

    /**
     * Get and set student dietary preference
     */
    async getDietaryPreference(req, res) {
      try {
        const studentId = req.studentId;
        const [rows] = await pool.query('SELECT diet_type FROM student_dietary_preferences WHERE student_id = ?', [studentId]);
        const dietType = rows.length > 0 ? rows[0].diet_type : 'VEGETARIAN';
        res.json({ success: true, data: { diet_type: dietType } });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Diet error: ' + err.message });
      }
    },

    async setDietaryPreference(req, res) {
      try {
        const studentId = req.studentId;
        const { diet_type } = req.body;
        const allowed = ['VEGETARIAN', 'NON_VEGETARIAN', 'JAIN'];
        if (!allowed.includes(diet_type)) {
          return res.status(400).json({ success: false, message: 'Invalid dietary preference specified.' });
        }

        await pool.query(`
          INSERT INTO student_dietary_preferences (student_id, diet_type)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE diet_type = ?
        `, [studentId, diet_type, diet_type]);

        res.json({ success: true, message: `Dietary preference set to ${diet_type}.`, data: { diet_type } });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Diet update error: ' + err.message });
      }
    },

    /**
     * Apply for mess leave rebate (min 3 days)
     */
    async applyMessRebate(req, res) {
      try {
        const studentId = req.studentId;
        const { start_date, end_date, reason } = req.body;

        if (!start_date || !end_date) {
          return res.status(400).json({ success: false, message: 'Start date and end date are required.' });
        }

        const start = new Date(start_date);
        const end = new Date(end_date);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
          return res.status(400).json({ success: false, message: 'Invalid rebate date range.' });
        }

        const diffTime = end.getTime() - start.getTime();
        const rebateDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        if (rebateDays < 3) {
          return res.status(400).json({
            success: false,
            message: `Mess rebates require a minimum absence of 3 consecutive days. Requested: ${rebateDays} day(s).`
          });
        }

        const cleanReason = cleanStr(reason);
        if (cleanReason.length < 5) {
          return res.status(400).json({ success: false, message: 'Please provide a valid reason (minimum 5 characters).' });
        }

        const dailyRate = 150.0;
        const totalAmount = rebateDays * dailyRate;

        // Check for overlapping active rebates
        const [overlaps] = await pool.query(`
          SELECT id FROM mess_rebates
          WHERE student_id = ? AND status IN ('PENDING', 'APPROVED')
            AND (start_date <= ? AND end_date >= ?)
        `, [studentId, end_date, start_date]);

        if (overlaps.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'An existing pending or approved rebate overlaps with the selected dates.'
          });
        }

        const [result] = await pool.query(`
          INSERT INTO mess_rebates (student_id, start_date, end_date, rebate_days, daily_rate, total_amount, reason, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
        `, [studentId, start_date, end_date, rebateDays, dailyRate, totalAmount, cleanReason]);

        res.status(201).json({
          success: true,
          message: `Mess rebate application for ${rebateDays} days (₹${totalAmount}) submitted for warden review.`,
          data: { id: result.insertId, rebate_days: rebateDays, total_amount: totalAmount, status: 'PENDING' }
        });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Rebate submission error: ' + err.message });
      }
    },

    async getMyRebates(req, res) {
      try {
        const studentId = req.studentId;
        const [rows] = await pool.query(
          'SELECT * FROM mess_rebates WHERE student_id = ? ORDER BY created_at DESC',
          [studentId]
        );
        res.json({ success: true, count: rows.length, data: rows });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Rebates fetch error: ' + err.message });
      }
    },

    async getAllRebatesAdmin(req, res) {
      try {
        const [rows] = await pool.query(`
          SELECT mr.*, s.registration_number, s.full_name AS student_name
          FROM mess_rebates mr
          JOIN students s ON mr.student_id = s.id
          ORDER BY mr.created_at DESC
        `);
        res.json({ success: true, count: rows.length, data: rows });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Admin rebates error: ' + err.message });
      }
    },

    async updateRebateStatusAdmin(req, res) {
      try {
        const rebateId = parseInt(req.params.id, 10);
        const { status, decision_notes } = req.body;

        if (!['APPROVED', 'REJECTED'].includes(status)) {
          return res.status(400).json({ success: false, message: 'Status must be APPROVED or REJECTED.' });
        }

        await pool.query(
          'UPDATE mess_rebates SET status = ?, decision_notes = ? WHERE id = ?',
          [status, cleanStr(decision_notes) || null, rebateId]
        );

        res.json({ success: true, message: `Rebate #${rebateId} marked as ${status}.` });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update rebate: ' + err.message });
      }
    },

    // ========================================================================
    // 5. FEATURE 4: CURFEW & GATE-PASS MANAGEMENT
    // ========================================================================

    /**
     * Student applies for Day Pass or Night Out
     */
    async requestGatePass(req, res) {
      try {
        const studentId = req.studentId;
        const { pass_type, destination, reason, emergency_contact, departure_time, expected_return_time } = req.body;

        if (!['DAY_PASS', 'NIGHT_OUT'].includes(pass_type)) {
          return res.status(400).json({ success: false, message: 'Pass type must be DAY_PASS or NIGHT_OUT.' });
        }

        const cleanDest = cleanStr(destination);
        const cleanReason = cleanStr(reason);
        const cleanContact = cleanStr(emergency_contact);

        if (cleanDest.length < 3) return res.status(400).json({ success: false, message: 'Destination is required.' });
        if (cleanReason.length < 5) return res.status(400).json({ success: false, message: 'Reason (min 5 characters) is required.' });
        if (!/^\d{10}$/.test(cleanContact)) {
          return res.status(400).json({ success: false, message: 'Emergency contact must be a valid 10-digit phone number.' });
        }

        const dep = new Date(departure_time);
        const ret = new Date(expected_return_time);

        if (isNaN(dep.getTime()) || isNaN(ret.getTime()) || ret <= dep) {
          return res.status(400).json({ success: false, message: 'Expected return time must be strictly after departure time.' });
        }

        // Curfew checks
        if (pass_type === 'DAY_PASS') {
          // Must return on same date and by 22:00
          if (dep.toDateString() !== ret.toDateString()) {
            return res.status(400).json({ success: false, message: 'Day pass requires return on the same calendar day.' });
          }
          if (ret.getHours() > 22 || (ret.getHours() === 22 && ret.getMinutes() > 0)) {
            return res.status(400).json({ success: false, message: 'Campus curfew for Day Pass is 10:00 PM.' });
          }
        }

        // Active pass exclusivity
        const [active] = await pool.query(
          'SELECT id FROM gate_passes WHERE student_id = ? AND status IN ("PENDING", "APPROVED", "CHECKED_OUT")',
          [studentId]
        );
        if (active.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'You already have an active or pending gate pass.'
          });
        }

        const passNumber = `GP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

        const [insertRes] = await pool.query(`
          INSERT INTO gate_passes 
            (pass_number, student_id, pass_type, destination, reason, emergency_contact, departure_time, expected_return_time, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')
        `, [passNumber, studentId, pass_type, cleanDest, cleanReason, cleanContact, departure_time, expected_return_time]);

        res.status(201).json({
          success: true,
          message: 'Gate pass requested successfully and awaiting warden sign-off.',
          data: {
            id: insertRes.insertId,
            pass_number: passNumber,
            pass_type,
            status: 'PENDING'
          }
        });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Gate pass request failed: ' + err.message });
      }
    },

    async getMyGatePasses(req, res) {
      try {
        const studentId = req.studentId;
        const [rows] = await pool.query(
          'SELECT * FROM gate_passes WHERE student_id = ? ORDER BY created_at DESC',
          [studentId]
        );
        res.json({ success: true, count: rows.length, data: rows });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Gate pass fetch error: ' + err.message });
      }
    },

    async getAllGatePassesAdmin(req, res) {
      try {
        const { status } = req.query;
        let query = `
          SELECT gp.*, s.registration_number, s.full_name AS student_name, r.room_number, h.block_name
          FROM gate_passes gp
          JOIN students s ON gp.student_id = s.id
          LEFT JOIN allocations a ON s.id = a.student_id
          LEFT JOIN rooms r ON a.room_id = r.id
          LEFT JOIN hostels h ON r.hostel_id = h.id
          WHERE 1=1
        `;
        const params = [];
        if (status) {
          query += ' AND gp.status = ?';
          params.push(status);
        }
        query += ' ORDER BY gp.created_at DESC';

        const [rows] = await pool.query(query, params);
        res.json({ success: true, count: rows.length, data: rows });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Admin gate pass error: ' + err.message });
      }
    },

    async updateGatePassDecisionAdmin(req, res) {
      try {
        const passId = parseInt(req.params.id, 10);
        const { status, rejection_reason } = req.body;
        const staffName = req.user.full_name || req.user.username;

        if (!['APPROVED', 'REJECTED'].includes(status)) {
          return res.status(400).json({ success: false, message: 'Decision must be APPROVED or REJECTED.' });
        }

        const approvedAt = status === 'APPROVED' ? new Date() : null;

        await pool.query(`
          UPDATE gate_passes
          SET status = ?, approved_by = ?, approved_at = ?, rejection_reason = ?
          WHERE id = ?
        `, [status, staffName, approvedAt, cleanStr(rejection_reason) || null, passId]);

        res.json({ success: true, message: `Gate pass #${passId} has been ${status}.` });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to update pass decision: ' + err.message });
      }
    },

    async logMovementSecurity(req, res) {
      try {
        const { pass_id, action } = req.body; // 'CHECK_OUT' or 'CHECK_IN'
        const passId = parseInt(pass_id, 10);

        const [passes] = await pool.query('SELECT * FROM gate_passes WHERE id = ?', [passId]);
        if (passes.length === 0) {
          return res.status(404).json({ success: false, message: `Gate pass #${passId} not found.` });
        }

        const pass = passes[0];
        const now = new Date();

        if (action === 'CHECK_OUT') {
          if (pass.status !== 'APPROVED') {
            return res.status(400).json({
              success: false,
              message: `Cannot check out. Pass status is ${pass.status} (must be APPROVED).`
            });
          }
          await pool.query(
            'UPDATE gate_passes SET status = "CHECKED_OUT", checked_out_at = ? WHERE id = ?',
            [now, passId]
          );
          return res.json({ success: true, message: `Student checked out through gate. Timestamp logged.` });
        }

        if (action === 'CHECK_IN') {
          if (pass.status !== 'CHECKED_OUT') {
            return res.status(400).json({
              success: false,
              message: `Cannot check in. Pass status is ${pass.status} (must be CHECKED_OUT).`
            });
          }

          const expected = new Date(pass.expected_return_time);
          const isOverdue = now > expected;

          await pool.query(
            'UPDATE gate_passes SET status = "CHECKED_IN", checked_in_at = ?, is_overdue = ? WHERE id = ?',
            [now, isOverdue, passId]
          );

          return res.json({
            success: true,
            is_overdue: isOverdue,
            message: isOverdue
              ? `Student checked in LATE (Curfew violation recorded).`
              : `Student checked in on time.`
          });
        }

        res.status(400).json({ success: false, message: 'Action must be CHECK_OUT or CHECK_IN.' });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Security movement logging error: ' + err.message });
      }
    }
  };
}
