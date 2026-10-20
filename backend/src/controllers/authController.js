// ============================================================================
// Authentication Controller (Admin & Student Login)
// ============================================================================

import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { signToken } from '../middleware/auth.js';
import { logAudit } from '../services/auditService.js';

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { identifier, password, role } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Identifier and password are required' });
    }

    const trimmedId = identifier.trim();

    // 1. If role is explicitly ADMIN or identifier starts with admin/warden
    if (role === 'ADMIN' || trimmedId.toLowerCase().includes('admin') || trimmedId.toLowerCase().includes('warden')) {
      const [admins] = await pool.query(
        'SELECT * FROM admins WHERE username = ? OR email = ?',
        [trimmedId, trimmedId]
      );

      if (admins.length > 0) {
        const admin = admins[0];
        const isMatch = await bcrypt.compare(password, admin.password_hash);
        if (isMatch) {
          const token = signToken({
            id: admin.id,
            role: 'ADMIN',
            username: admin.username,
            email: admin.email,
            name: admin.full_name,
            subRole: admin.role
          });

          await logAudit({
            actorType: 'ADMIN',
            actorId: admin.id,
            action: 'LOGIN',
            entityType: 'SESSION',
            ipAddress: req.ip
          });

          return res.json({
            success: true,
            message: 'Admin login successful',
            token,
            user: {
              id: admin.id,
              role: 'ADMIN',
              username: admin.username,
              email: admin.email,
              name: admin.full_name
            }
          });
        }
      }
    }

    // 2. Check Students
    const [students] = await pool.query(
      'SELECT * FROM students WHERE registration_number = ? OR email = ?',
      [trimmedId.toUpperCase(), trimmedId.toLowerCase()]
    );

    if (students.length > 0) {
      const student = students[0];
      const isMatch = await bcrypt.compare(password, student.password_hash);
      if (isMatch) {
        const token = signToken({
          id: student.id,
          role: 'STUDENT',
          registration_number: student.registration_number,
          email: student.email,
          name: student.full_name,
          merit_rank: student.merit_rank
        });

        await logAudit({
          actorType: 'STUDENT',
          actorId: student.id,
          action: 'LOGIN',
          entityType: 'SESSION',
          ipAddress: req.ip
        });

        return res.json({
          success: true,
          message: 'Student login successful',
          token,
          user: {
            id: student.id,
            role: 'STUDENT',
            registration_number: student.registration_number,
            email: student.email,
            name: student.full_name,
            merit_rank: student.merit_rank,
            academic_branch: student.academic_branch,
            year_of_study: student.year_of_study,
            gender: student.gender
          }
        });
      }
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid credentials. Please verify your registration number / username and password.'
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    if (req.user.role === 'ADMIN') {
      const [admins] = await pool.query('SELECT id, username, email, full_name, role FROM admins WHERE id = ?', [req.user.id]);
      if (admins.length === 0) return res.status(404).json({ success: false, message: 'Admin not found' });
      return res.json({ success: true, user: { ...admins[0], role: 'ADMIN' } });
    } else {
      const [students] = await pool.query(
        'SELECT id, registration_number, full_name, email, gender, academic_branch, year_of_study, merit_rank FROM students WHERE id = ?',
        [req.user.id]
      );
      if (students.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });
      return res.json({ success: true, user: { ...students[0], role: 'STUDENT' } });
    }
  } catch (err) {
    next(err);
  }
};

