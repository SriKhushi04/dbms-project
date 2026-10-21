// ============================================================================
// HOSTELHUB DATABASE INITIALIZATION & SEED SCRIPT
// ============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Anchor package resolution to backend/node_modules
const backendRequire = createRequire(path.join(__dirname, '../backend/package.json'));
const mysql = backendRequire('mysql2/promise');
const dotenv = backendRequire('dotenv');

import { hostels, generateRooms, generateStudents } from './seeds/seedData.js';

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

async function initDatabase() {
  console.log('====================================================');
  console.log('   HostelHub: Minimal Schema & Seed Initializer      ');
  console.log('====================================================\n');

  const isResetRequested = process.argv.includes('--force-reset') || process.argv.includes('--reset');

  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const databaseName = process.env.DB_NAME || 'hostelhub_db';

  console.log(`Connecting to MySQL server at ${host}:${port} as user '${user}'...`);

  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true
    });
    console.log('Connected to MySQL server.');

    // 1. Ensure DB exists and switch to it
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await connection.query(schemaSql);
    await connection.changeUser({ database: databaseName });

    if (isResetRequested) {
      console.log('Reset requested: dropping old tables and recreating minimal schema...');
      await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
      const oldTables = [
        'allocations', 'preferences', 'group_members', 'roommate_groups',
        'applications', 'room_preferences', 'application_groups', 'room_allocations',
        'allocation_runs', 'unallocated_records', 'audit_logs', 'students', 'rooms', 'hostels', 'hostel_blocks', 'batches', 'admins'
      ];
      for (const t of oldTables) {
        await connection.query(`DROP TABLE IF EXISTS ${t};`);
      }
      await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
      // Reapply schema DDL to recreate fresh tables
      await connection.query(schemaSql);
      console.log('Minimal schema DDL recreated successfully.');
    }

    // 3. Seed data inside transaction
    console.log('Seeding initial data...');
    await connection.beginTransaction();

    // Insert Hostels
    for (const h of hostels) {
      await connection.query('INSERT IGNORE INTO hostels (id, block_name) VALUES (?, ?)', [h.id, h.block_name]);
    }

    // Insert 80 Rooms
    const rooms = generateRooms();
    for (const r of rooms) {
      await connection.query(
        'INSERT IGNORE INTO rooms (id, hostel_id, room_number, capacity) VALUES (?, ?, ?, ?)',
        [r.id, r.hostel_id, r.room_number, r.capacity]
      );
    }

    // Insert 100 Students
    const students = generateStudents();
    for (const s of students) {
      await connection.query(
        'INSERT IGNORE INTO students (id, registration_number, full_name, merit_rank, is_eligible) VALUES (?, ?, ?, ?, ?)',
        [s.id, s.registration_number, s.full_name, s.merit_rank, s.is_eligible]
      );
    }

    // Pre-allocate Student 1 (24BCE1001) to Room 1 (S-101 in Block A) for instant Case 1 demonstration
    // All other students remain unallocated for Case 2 demonstration
    await connection.query('INSERT IGNORE INTO allocations (student_id, room_id) VALUES (1, 1)');

    await connection.commit();
    console.log('Seed transaction committed successfully!');

    // Reconciliation check
    const [[sc]] = await connection.query('SELECT COUNT(*) AS total FROM students');
    const [[rc]] = await connection.query('SELECT COUNT(*) AS total, SUM(capacity) AS total_beds FROM rooms');
    const [[hc]] = await connection.query('SELECT COUNT(*) AS total FROM hostels');
    const [[ac]] = await connection.query('SELECT COUNT(*) AS total FROM allocations');

    console.log('\n--- VERIFICATION ---');
    console.log(`Hostels:     ${hc.total} (Target: 3)`);
    console.log(`Rooms:       ${rc.total} (Target: 80)`);
    console.log(`Total Beds:  ${rc.total_beds} (Target: 200)`);
    console.log(`Students:    ${sc.total} (Target: 100)`);
    console.log(`Allocated:   ${ac.total} demo student (24BCE1001 -> Room S-101 in Block A)`);
    console.log('Unallocated: 99 students ready for preference submission');
    console.log('--------------------\n');

    process.exit(0);
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Initialization error:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

initDatabase();
