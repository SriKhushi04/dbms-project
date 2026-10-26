// ============================================================================
// HOSTELHUB DEMO SEED DATA: MAINTENANCE & COMPLAINTS
// Idempotent seed script with 10 realistic demo complaints across categories,
// priorities, statuses, and real student/room associations.
// ============================================================================

import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendRequire = createRequire(path.join(__dirname, '../../backend/package.json'));
const mysql = backendRequire('mysql2/promise');
const dotenv = backendRequire('dotenv');

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

export const demoComplaints = [
  {
    ticket_number: 'TKT-2026-0101',
    student_reg: '24BCE1001', // Bhavya Sharma
    room_number: 'S-101',     // Block A, Room 1
    block_name: 'Block A',
    category: 'INTERNET',
    title: 'LAN port socket loose and frequent disconnections',
    description: 'The RJ-45 Ethernet port next to the study table is loose and loses connection whenever the cable is touched. High packet loss during lab work.',
    priority: 'HIGH',
    status: 'RESOLVED',
    assigned_to: 'Rajesh Kumar (Network Tech)',
    resolution_notes: 'Crimped and replaced modular jack wall plate. Tested line speed: stable at 100 Mbps.',
    created_offset_days: 5,
    resolved_offset_days: 4
  },
  {
    ticket_number: 'TKT-2026-0102',
    student_reg: '24BCE1002', // Diya Bhatt
    room_number: 'D-201',     // Block C, Room 41
    block_name: 'Block C',
    category: 'PLUMBING',
    title: 'Continuous water dripping from bathroom washbasin tap',
    description: 'The cold water faucet in our attached bathroom cannot be shut tightly and keeps dripping water continuously, causing water wastage and noise at night.',
    priority: 'MEDIUM',
    status: 'RESOLVED',
    assigned_to: 'Suresh Plumber',
    resolution_notes: 'Replaced worn rubber washer and Teflon tape on spindle. Tap sealed completely.',
    created_offset_days: 4,
    resolved_offset_days: 3
  },
  {
    ticket_number: 'TKT-2026-0103',
    student_reg: '24BCE1003', // Ishaan Chopra
    room_number: 'D-201',     // Block C, Room 41
    block_name: 'Block C',
    category: 'ELECTRICAL',
    title: 'Ceiling fan making loud grinding noise on speeds 3 and 4',
    description: 'The ceiling fan vibrates heavily and produces an unbearable squeaking and grinding noise when run above speed 2. Disturbs sleep and studying.',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    assigned_to: 'Manoj Sharma (Electrician)',
    resolution_notes: 'Inspected bearing and capacitor. Bearing needs replacement; requisition submitted to hostel store.',
    created_offset_days: 2,
    resolved_offset_days: null
  },
  {
    ticket_number: 'TKT-2026-0104',
    student_reg: '24BCE1004', // Lakshay Joshi
    room_number: 'D-204',     // Block C, Room 44
    block_name: 'Block C',
    category: 'FURNITURE',
    title: 'Study chair hydraulic cylinder sinking down',
    description: 'The study chair does not stay locked at height and keeps sliding all the way to the lowest setting when seated.',
    priority: 'LOW',
    status: 'PENDING',
    assigned_to: null,
    resolution_notes: null,
    created_offset_days: 1,
    resolved_offset_days: null
  },
  {
    ticket_number: 'TKT-2026-0105',
    student_reg: '24BCE1005', // Nikhil Mehta
    room_number: 'D-204',     // Block C, Room 44
    block_name: 'Block C',
    category: 'CLEANLINESS',
    title: 'Balcony pigeon droppings and window glass dirt accumulation',
    description: 'The exterior window sill and balcony corner have heavy pigeon droppings and accumulated dust after recent rain. Needs deep cleaning.',
    priority: 'LOW',
    status: 'RESOLVED',
    assigned_to: 'Ramesh (Housekeeping Staff)',
    resolution_notes: 'Window sill and balcony pressure-washed and sanitized with disinfectant.',
    created_offset_days: 6,
    resolved_offset_days: 5
  },
  {
    ticket_number: 'TKT-2026-0106',
    student_reg: '24BCE1008', // Sneha Kapoor
    room_number: 'D-201',     // Block B, Room 31
    block_name: 'Block B',
    category: 'ELECTRICAL',
    title: 'Tube light flickering and humming intermittently',
    description: 'The main LED batten light in the room blinks every few minutes and emits a high-pitched buzzing sound.',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    assigned_to: 'Manoj Sharma (Electrician)',
    resolution_notes: 'Driver issue identified. New 20W LED fixture being picked up from maintenance room.',
    created_offset_days: 1,
    resolved_offset_days: null
  },
  {
    ticket_number: 'TKT-2026-0107',
    student_reg: '24BCE1009', // Varun Reddy
    room_number: 'D-201',     // Block B, Room 31
    block_name: 'Block B',
    category: 'PLUMBING',
    title: 'Severe drainage backup in shower floor trap',
    description: 'Water drains extremely slowly in the shower stall, causing water to pool up around ankles within 2 minutes of bathing.',
    priority: 'URGENT',
    status: 'PENDING',
    assigned_to: null,
    resolution_notes: null,
    created_offset_days: 0.2, // ~5 hours ago
    resolved_offset_days: null
  },
  {
    ticket_number: 'TKT-2026-0108',
    student_reg: '24BCE1006', // Priya Singh (common facility)
    room_number: null,
    block_name: 'Block A',
    category: 'CLEANLINESS',
    title: 'Block A 1st Floor common water cooler tray overflow',
    description: 'The drain pipe of the RO drinking water dispenser on the 1st floor corridor is blocked and dirty water is overflowing onto the hallway corridor.',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    assigned_to: 'Santosh (Hostel Caretaker)',
    resolution_notes: 'Drain line cleared with snake wire; tray cleaned and floor dried.',
    created_offset_days: 0.3,
    resolved_offset_days: null
  },
  {
    ticket_number: 'TKT-2026-0109',
    student_reg: '24BCE1007', // Rohan Deshmukh (common facility)
    room_number: null,
    block_name: 'Block B',
    category: 'INTERNET',
    title: 'Block B common reading room Wi-Fi access point offline',
    description: "The Wi-Fi SSID 'HostelHub-B-Study' is not broadcasting in the ground floor study room since morning. No students can access course materials.",
    priority: 'HIGH',
    status: 'PENDING',
    assigned_to: null,
    resolution_notes: null,
    created_offset_days: 0.1,
    resolved_offset_days: null
  },
  {
    ticket_number: 'TKT-2026-0110',
    student_reg: '24BCE1010', // Zara Saxena (common facility)
    room_number: null,
    block_name: 'Block C',
    category: 'OTHER',
    title: 'Block C main entrance biometric door sensor not registering ID cards',
    description: 'The RFID card scanner on the main hostel glass door fails 4 out of 5 swipes, creating long queues of students during evening check-in.',
    priority: 'URGENT',
    status: 'RESOLVED',
    assigned_to: 'Anand Verma (System Admin)',
    resolution_notes: 'Firmware reset performed and optical reader cleaned. Calibration completed and confirmed working.',
    created_offset_days: 7,
    resolved_offset_days: 6
  }
];

export async function seedComplaints() {
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT || '3306', 10);
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'hostelhub_db';

  console.log(`Connecting to MySQL database '${database}' at ${host}:${port}...`);
  const pool = mysql.createPool({ host, port, user, password, database });

  try {
    // 1. Verify maintenance_tickets table exists
    const [tables] = await pool.query("SHOW TABLES LIKE 'maintenance_tickets'");
    if (tables.length === 0) {
      throw new Error("Table 'maintenance_tickets' does not exist. Please apply migration 001_management_schema.sql first.");
    }

    console.log('Inserting / updating 10 realistic demo complaints...');
    let insertedCount = 0;

    for (const c of demoComplaints) {
      // Find student id
      const [sRows] = await pool.query('SELECT id FROM students WHERE registration_number = ?', [c.student_reg]);
      if (sRows.length === 0) {
        console.warn(`Student with registration ${c.student_reg} not found; skipping ticket ${c.ticket_number}`);
        continue;
      }
      const studentId = sRows[0].id;

      // Find hostel id
      const [hRows] = await pool.query('SELECT id FROM hostels WHERE block_name = ?', [c.block_name]);
      const hostelId = hRows.length > 0 ? hRows[0].id : 1;

      // Find room id if applicable
      let roomId = null;
      if (c.room_number) {
        const [rRows] = await pool.query('SELECT id FROM rooms WHERE hostel_id = ? AND room_number = ?', [hostelId, c.room_number]);
        if (rRows.length > 0) roomId = rRows[0].id;
      }

      // Calculate timestamps
      const now = Date.now();
      const createdAt = new Date(now - c.created_offset_days * 24 * 60 * 60 * 1000);
      const resolvedAt = c.resolved_offset_days !== null
        ? new Date(now - c.resolved_offset_days * 24 * 60 * 60 * 1000)
        : null;

      // Idempotent upsert by ticket_number
      await pool.query(`
        INSERT INTO maintenance_tickets (
          ticket_number, student_id, room_id, hostel_id, category,
          title, description, priority, status, assigned_to,
          resolution_notes, created_at, resolved_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          description = VALUES(description),
          priority = VALUES(priority),
          status = VALUES(status),
          assigned_to = VALUES(assigned_to),
          resolution_notes = VALUES(resolution_notes),
          resolved_at = VALUES(resolved_at)
      `, [
        c.ticket_number,
        studentId,
        roomId,
        hostelId,
        c.category,
        c.title,
        c.description,
        c.priority,
        c.status,
        c.assigned_to,
        c.resolution_notes,
        createdAt,
        resolvedAt
      ]);

      insertedCount++;
    }

    console.log(`Successfully seeded ${insertedCount} demo complaints!`);
  } finally {
    await pool.end();
  }
}

// Allow direct execution: node database/seeds/seedComplaints.js
if (process.argv[1] && process.argv[1].endsWith('seedComplaints.js')) {
  seedComplaints().catch((err) => {
    console.error('Seed complaints error:', err.message);
    process.exit(1);
  });
}

