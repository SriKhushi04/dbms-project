// ============================================================================
// HOSTELHUB SECURE STAFF PROVISIONING CLI UTILITY
// Allows administrators to safely create staff accounts directly from the server
// ============================================================================

import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function createStaff() {
  const args = process.argv.slice(2);
  if (args.length < 4) {
    console.log('Usage: node src/scripts/createStaff.js <username> <password> <role> <fullName>');
    console.log('Roles: WARDEN, ACCOUNTANT, MESS_SUPERVISOR, SECURITY_GUARD');
    process.exit(1);
  }

  const [username, password, role, ...nameParts] = args;
  const fullName = nameParts.join(' ');

  const allowedRoles = ['WARDEN', 'ACCOUNTANT', 'MESS_SUPERVISOR', 'SECURITY_GUARD'];
  if (!allowedRoles.includes(role.toUpperCase())) {
    console.error(`Invalid role: ${role}. Must be one of: ${allowedRoles.join(', ')}`);
    process.exit(1);
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hostelhub_db'
  });

  try {
    const hash = await bcrypt.hash(password, 10);
    const [res] = await pool.query(
      'INSERT INTO management_staff (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
      [username.trim(), hash, fullName.trim(), role.toUpperCase()]
    );
    console.log(`Staff account "${username}" (${role.toUpperCase()}) created successfully with ID #${res.insertId}.`);
  } catch (err) {
    console.error('Failed to create staff account:', err.message);
  } finally {
    await pool.end();
  }
}

createStaff();
