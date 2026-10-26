// ============================================================================
// HOSTELHUB MANAGEMENT MIGRATION & SEED APPLIER
// Safely and idempotently applies 001_management_schema.sql and seedComplaints.js
// NEVER drops or truncates any Phase 1 tables or allocation records.
// ============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendRequire = createRequire(path.join(__dirname, '../backend/package.json'));
const mysql = backendRequire('mysql2/promise');
const dotenv = backendRequire('dotenv');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

import { seedComplaints } from './seeds/seedComplaints.js';

export async function applyManagementSchema() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const databaseName = process.env.DB_NAME || 'hostelhub_db';

  console.log(`Connecting to MySQL server at ${host}:${port}...`);
  const connection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true
  });

  try {
    console.log(`Applying migration 001_management_schema.sql to '${databaseName}'...`);
    const migrationPath = path.join(__dirname, 'migrations/001_management_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await connection.query(sql);
    console.log('Migration 001_management_schema.sql applied successfully.');

    // Apply staff directory schema
    const staffMigrationPath = path.join(__dirname, 'migrations/002_staff_directory.sql');
    if (fs.existsSync(staffMigrationPath)) {
      const staffSql = fs.readFileSync(staffMigrationPath, 'utf8');
      await connection.query(staffSql);
      console.log('Migration 002_staff_directory.sql applied successfully.');
    }

    // Seed complaints
    await seedComplaints();

    console.log('All management schema & complaint seeds completed successfully.');
  } finally {
    await connection.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith('applyManagementSchema.js')) {
  applyManagementSchema().catch((err) => {
    console.error('Error applying management schema:', err.message);
    process.exit(1);
  });
}

