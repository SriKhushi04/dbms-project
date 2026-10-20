// ============================================================================
// DATABASE INITIALIZATION & SEED RUNNER
// Safe First-Time Initialization & Explicit Confirmed Destructive Reset
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

import {
  generateBlocks,
  generateRooms,
  generateStudents,
  generateAdmins,
  generateBatches,
  generateDemoApplications
} from './seeds/seedData.js';

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

async function initDatabase() {
  console.log('====================================================');
  console.log('   HostelHub: MySQL Schema & Seed Initializer        ');
  console.log('====================================================\n');

  const isResetRequested = process.argv.includes('--force-reset') || process.argv.includes('--reset');
  const isConfirmed = process.argv.includes('--confirm') || process.env.CONFIRM_RESET === 'true';

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

    // 1. Execute schema.sql (Idempotent: uses CREATE TABLE IF NOT EXISTS)
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log(`Verifying relational schema DDL from ${schemaPath}...`);
    await connection.query(schemaSql);
    console.log('Schema DDL verified successfully.');

    await connection.changeUser({ database: databaseName });

    // 2. Check for existing data
    let existingCount = 0;
    try {
      const [[res]] = await connection.query('SELECT COUNT(*) AS c FROM students');
      existingCount = res ? res.c : 0;
    } catch (e) {
      existingCount = 0;
    }

    if (existingCount > 0) {
      if (!isResetRequested) {
        console.log(`\n[SAFE INITIALIZATION NOTICE] Database '${databaseName}' already contains data (${existingCount} students).`);
        console.log('Safe initialization completed: existing tables were NOT modified or truncated.');
        console.log('To perform an intentional clean reset and re-seed, run:');
        console.log('   npm run reset-db -- --confirm\n');
        process.exit(0);
      }

      if (isResetRequested && !isConfirmed) {
        console.error('\n================================================================');
        console.error(' [DESTRUCTIVE ACTION BLOCKED] CONFIRMATION REQUIRED            ');
        console.error('================================================================');
        console.error('You requested a full database reset. This action will permanently');
        console.error('erase all batches, rooms, students, applications, and audit logs.');
        console.error('To confirm and proceed, re-run with the --confirm flag:');
        console.error('   npm run reset-db -- --confirm');
        console.error('================================================================\n');
        process.exit(1);
      }

      // Explicitly confirmed reset: truncate child tables first to respect foreign-key ordering
      console.log('\n[DESTRUCTIVE RESET CONFIRMED] Cleaning existing data in strict foreign-key order...');
      const childFirstTables = [
        'audit_logs',
        'unallocated_records',
        'allocations',
        'room_allocations',
        'allocation_runs',
        'room_preferences',
        'applications',
        'group_members',
        'application_groups',
        'students',
        'rooms',
        'hostel_blocks',
        'admins',
        'batches'
      ];

      await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
      for (const t of childFirstTables) {
        await connection.query(`TRUNCATE TABLE ${t};`);
      }
      await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
      console.log('Tables truncated successfully.');
    }

    // 3. Seed initial data inside an atomic transaction to prevent partial/inconsistent state
    console.log('\nSeeding reproducible dataset inside an atomic transaction...');
    await connection.beginTransaction();

    try {
      // Admins
      const admins = generateAdmins();
      for (const a of admins) {
        await connection.query(
          'INSERT INTO admins (id, username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?, ?)',
          [a.id, a.username, a.email, a.password_hash, a.full_name, a.role]
        );
      }

      // Batches
      const batches = generateBatches();
      for (const b of batches) {
        await connection.query(
          'INSERT INTO batches (id, batch_name, academic_year, application_deadline, status) VALUES (?, ?, ?, ?, ?)',
          [b.id, b.batch_name, b.academic_year, b.application_deadline, b.status]
        );
      }

      // Blocks
      const blocks = generateBlocks();
      for (const b of blocks) {
        await connection.query(
          'INSERT INTO hostel_blocks (id, block_name, gender_policy, description) VALUES (?, ?, ?, ?)',
          [b.id, b.block_name, b.gender_policy, b.description]
        );
      }

      // Rooms (Exact: 20 single, 30 double, 30 quad = 80 rooms, 200 beds)
      const rooms = generateRooms();
      for (const r of rooms) {
        await connection.query(
          'INSERT INTO rooms (id, block_id, room_number, capacity, room_type, floor, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [r.id, r.block_id, r.room_number, r.capacity, r.room_type, r.floor, r.is_active]
        );
      }

      // Students (Exactly 100 students with unique ranks 1..100)
      const students = generateStudents();
      for (const s of students) {
        await connection.query(
          'INSERT INTO students (id, registration_number, full_name, email, gender, academic_branch, year_of_study, merit_rank, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [s.id, s.registration_number, s.full_name, s.email, s.gender, s.academic_branch, s.year_of_study, s.merit_rank, s.password_hash]
        );
      }

      // Demo Applications with 5 Distinct, Capacity-Matching Preferences
      const { groups, groupMembers, applications, preferences } = generateDemoApplications(rooms, students);

      for (const g of groups) {
        await connection.query(
          'INSERT INTO application_groups (id, batch_id, group_code, target_capacity, calculated_leader_id, leader_rank, is_locked) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [g.id, g.batch_id, g.group_code, g.target_capacity, g.calculated_leader_id, g.leader_rank, g.is_locked]
        );
      }

      for (const gm of groupMembers) {
        await connection.query(
          'INSERT INTO group_members (id, group_id, batch_id, student_id) VALUES (?, ?, ?, ?)',
          [gm.id, gm.group_id, gm.batch_id, gm.student_id]
        );
      }

      for (const app of applications) {
        await connection.query(
          'INSERT INTO applications (id, batch_id, group_id, status, submitted_at) VALUES (?, ?, ?, ?, ?)',
          [app.id, app.batch_id, app.group_id, app.status, app.submitted_at]
        );
      }

      for (const pref of preferences) {
        await connection.query(
          'INSERT INTO room_preferences (id, application_id, preference_rank, room_id) VALUES (?, ?, ?, ?)',
          [pref.id, pref.application_id, pref.preference_rank, pref.room_id]
        );
      }

      await connection.commit();
      console.log('Seed transaction committed successfully.');
    } catch (seedError) {
      await connection.rollback();
      console.error('Seed transaction failed. Rolled back all changes to preserve consistency:', seedError.message);
      throw seedError;
    }

    // 4. Verification Reconciliation Checks
    console.log('\n--- VERIFYING EXACT INVENTORY TOTALS ---');
    const [[studentCount]] = await connection.query('SELECT COUNT(*) AS total FROM students');
    const [[roomCount]] = await connection.query('SELECT COUNT(*) AS total, SUM(capacity) AS total_beds FROM rooms');
    const [[singleCount]] = await connection.query("SELECT COUNT(*) AS total FROM rooms WHERE capacity = 1");
    const [[doubleCount]] = await connection.query("SELECT COUNT(*) AS total FROM rooms WHERE capacity = 2");
    const [[quadCount]] = await connection.query("SELECT COUNT(*) AS total FROM rooms WHERE capacity = 4");
    const [[appCount]] = await connection.query('SELECT COUNT(*) AS total FROM applications');

    console.log(`Total Students:    ${studentCount.total} (Target: 100) ${studentCount.total === 100 ? '✅' : '❌'}`);
    console.log(`Total Rooms:       ${roomCount.total} (Target: 80) ${roomCount.total === 80 ? '✅' : '❌'}`);
    console.log(`Total Beds:        ${roomCount.total_beds} (Target: 200) ${Number(roomCount.total_beds) === 200 ? '✅' : '❌'}`);
    console.log(`Single Rooms:      ${singleCount.total} (Target: 20) ${singleCount.total === 20 ? '✅' : '❌'}`);
    console.log(`Double Rooms:      ${doubleCount.total} (Target: 30) ${doubleCount.total === 30 ? '✅' : '❌'}`);
    console.log(`Quadruple Rooms:   ${quadCount.total} (Target: 30) ${quadCount.total === 30 ? '✅' : '❌'}`);
    console.log(`Applications:      ${appCount.total} active demo applications`);
    console.log('----------------------------------------\n');

    console.log('Database initialization completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Database initialization error:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

initDatabase();
