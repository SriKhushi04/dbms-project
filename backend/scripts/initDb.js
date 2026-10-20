const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function initDatabase() {
  console.log('--- Initializing Hostel Allocation System Database ---');

  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const databaseName = process.env.DB_NAME || 'hostel_db';

  console.log(`Connecting to MySQL at ${host}:${port} as ${user}...`);

  let connection;
  try {
    // 1. Initial connection without specific DB to ensure DB exists
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true
    });

    console.log('Connected to MySQL server.');

    // 2. Read schema.sql
    const schemaPath = path.join(__dirname, '../sql/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log(`Executing schema definition from: ${schemaPath}`);
    await connection.query(schemaSql);
    console.log('Schema created successfully!');

    // 3. Read seed.sql
    const seedPath = path.join(__dirname, '../sql/seed.sql');
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    console.log(`Seeding sample hostel, block, room, and student data from: ${seedPath}`);
    await connection.query(seedSql);
    console.log('Database seeded successfully!');

    // 4. Verify counts
    await connection.changeUser({ database: databaseName });
    const [[hostelCount]] = await connection.query('SELECT COUNT(*) AS c FROM hostels');
    const [[roomCount]] = await connection.query('SELECT COUNT(*) AS c FROM rooms');
    const [[studentCount]] = await connection.query('SELECT COUNT(*) AS c FROM students');
    const [[allocCount]] = await connection.query('SELECT COUNT(*) AS c FROM allocations WHERE status = "ACTIVE"');

    console.log('\n--- Database Verification Summary ---');
    console.log(`Hostels:            ${hostelCount.c}`);
    console.log(`Rooms:              ${roomCount.c}`);
    console.log(`Students:           ${studentCount.c}`);
    console.log(`Active Allocations: ${allocCount.c}`);
    console.log('-------------------------------------\n');

    console.log('Database initialization completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Database initialization failed:', err.message);
    if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nNOTE: Access denied. Please ensure your DB_PASSWORD in backend/.env is correct.\n');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();

