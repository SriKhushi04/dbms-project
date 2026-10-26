-- & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
-- SOURCE C:/Users/asus/Desktop/dbms project/queries.sql

USE hostelhub_db;

-- View students
SELECT * FROM students;

-- View hostel blocks
SELECT * FROM hostels;

-- View rooms
SELECT * FROM rooms;

-- Check room capacity and occupancy fields
DESCRIBE rooms;

-- Check student fields
DESCRIBE students;

-- Count students
SELECT COUNT(*) AS total_students
FROM students;

-- Count rooms by hostel
SELECT hostel_id, COUNT(*) AS total_rooms
FROM rooms
GROUP BY hostel_id;

-- Find rooms with the fewest occupants, if an occupancy column exists
-- First inspect the columns using DESCRIBE rooms.

-- List all tables
SHOW TABLES;

-- List all columns in the current database
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'hostelhub_db'
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- Count records in core tables
SELECT 'students' AS table_name, COUNT(*) AS total FROM students
UNION ALL
SELECT 'rooms', COUNT(*) FROM rooms
UNION ALL
SELECT 'hostels', COUNT(*) FROM hostels
UNION ALL
SELECT 'allocations', COUNT(*) FROM allocations
UNION ALL
SELECT 'maintenance_tickets', COUNT(*) FROM maintenance_tickets;


-- ============================================================================
-- STAFF & WARDEN DIRECTORY QUERIES
-- ============================================================================

-- 1. View all staff members (Wardens, Technicians, Support Staff)
SELECT employee_code, full_name, designation, role, trade_specialization, phone_number, email 
FROM staff_members
ORDER BY role, id;

-- 2. View all Hostel Wardens (Chief Warden & Resident Wardens)
SELECT employee_code, full_name, designation, phone_number, email 
FROM staff_members 
WHERE role = 'WARDEN';

-- 3. View all Maintenance Technicians & Housekeeping by Trade
SELECT employee_code, full_name, designation, trade_specialization, phone_number 
FROM staff_members 
WHERE role IN ('TECHNICIAN', 'HOUSEKEEPING')
ORDER BY trade_specialization, full_name;

-- 4. View Maintenance Tickets with Assigned Staff, Trade & Phone Numbers
SELECT 
    t.ticket_number, 
    t.category, 
    t.priority,
    t.status, 
    COALESCE(s.full_name, t.assigned_to) AS assigned_staff,
    s.designation,
    s.phone_number AS staff_phone,
    t.title
FROM maintenance_tickets t
LEFT JOIN staff_members s ON t.assigned_staff_id = s.id
ORDER BY t.created_at DESC;

-- 5. View Hostel Blocks and their Assigned Resident Wardens
SELECT 
    h.id AS hostel_id,
    h.block_name, 
    s.employee_code AS warden_code,
    s.full_name AS warden_name, 
    s.phone_number, 
    s.email
FROM hostels h
LEFT JOIN staff_members s ON h.warden_id = s.id;

-- 6. Technician Workload (Count of active/pending tickets assigned per staff member)
SELECT 
    s.employee_code,
    s.full_name,
    s.designation,
    s.trade_specialization,
    COUNT(t.id) AS total_assigned_tickets,
    SUM(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS active_in_progress,
    SUM(CASE WHEN t.status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved_tickets
FROM staff_members s
LEFT JOIN maintenance_tickets t ON t.assigned_staff_id = s.id
WHERE s.role IN ('TECHNICIAN', 'HOUSEKEEPING')
GROUP BY s.id, s.employee_code, s.full_name, s.designation, s.trade_specialization
ORDER BY total_assigned_tickets DESC;


-- ============================================================================
-- STAFF & WARDEN DIRECTORY QUERIES
-- ============================================================================

-- 1. View all staff members (Wardens, Technicians, Support Staff)
SELECT employee_code, full_name, designation, role, trade_specialization, phone_number, email 
FROM staff_members
ORDER BY role, id;

-- 2. View all Hostel Wardens (Chief Warden & Resident Wardens)
SELECT employee_code, full_name, designation, phone_number, email 
FROM staff_members 
WHERE role = 'WARDEN';

-- 3. View all Maintenance Technicians & Housekeeping by Trade
SELECT employee_code, full_name, designation, trade_specialization, phone_number 
FROM staff_members 
WHERE role IN ('TECHNICIAN', 'HOUSEKEEPING')
ORDER BY trade_specialization, full_name;

-- 4. View Maintenance Tickets with Assigned Staff, Trade & Phone Numbers
SELECT 
    t.ticket_number, 
    t.category, 
    t.priority,
    t.status, 
    COALESCE(s.full_name, t.assigned_to) AS assigned_staff,
    s.designation,
    s.phone_number AS staff_phone,
    t.title
FROM maintenance_tickets t
LEFT JOIN staff_members s ON t.assigned_staff_id = s.id
ORDER BY t.created_at DESC;

-- 5. View Hostel Blocks and their Assigned Resident Wardens
SELECT 
    h.id AS hostel_id,
    h.block_name, 
    s.employee_code AS warden_code,
    s.full_name AS warden_name, 
    s.phone_number, 
    s.email
FROM hostels h
LEFT JOIN staff_members s ON h.warden_id = s.id;

-- 6. Technician Workload (Count of active/pending tickets assigned per staff member)
SELECT 
    s.employee_code,
    s.full_name,
    s.designation,
    s.trade_specialization,
    COUNT(t.id) AS total_assigned_tickets,
    SUM(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS active_in_progress,
    SUM(CASE WHEN t.status = 'RESOLVED' THEN 1 ELSE 0 END) AS resolved_tickets
FROM staff_members s
LEFT JOIN maintenance_tickets t ON t.assigned_staff_id = s.id
WHERE s.role IN ('TECHNICIAN', 'HOUSEKEEPING')
GROUP BY s.id, s.employee_code, s.full_name, s.designation, s.trade_specialization
ORDER BY total_assigned_tickets DESC;

