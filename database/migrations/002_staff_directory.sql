-- ============================================================================
-- HOSTELHUB STAFF & WARDEN DIRECTORY SCHEMA MIGRATION (002_staff_directory.sql)
-- Safe, additive, idempotent. Preserves all room allocation & complaints data.
-- ============================================================================

USE hostelhub_db;

-- 1. Create staff_members table
CREATE TABLE IF NOT EXISTS staff_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_code VARCHAR(30) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    role ENUM(
        'WARDEN',
        'TECHNICIAN',
        'HOUSEKEEPING',
        'SYSTEM_ADMIN',
        'SECURITY_GUARD',
        'ACCOUNTANT',
        'MESS_SUPERVISOR'
    ) NOT NULL,
    trade_specialization ENUM(
        'ELECTRICAL',
        'PLUMBING',
        'FURNITURE',
        'CLEANLINESS',
        'INTERNET',
        'GENERAL'
    ) NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(100) NULL,
    assigned_hostel_id INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_hostel_id) REFERENCES hostels(id) ON DELETE SET NULL,
    INDEX idx_staff_role (role),
    INDEX idx_staff_trade (trade_specialization),
    INDEX idx_staff_hostel (assigned_hostel_id)
) ENGINE=InnoDB;

-- 2. Add assigned_staff_id to maintenance_tickets if not already present
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'hostelhub_db' 
  AND TABLE_NAME = 'maintenance_tickets' 
  AND COLUMN_NAME = 'assigned_staff_id';

SET @stmt = IF(@col_exists = 0, 
    'ALTER TABLE maintenance_tickets ADD COLUMN assigned_staff_id INT NULL AFTER assigned_to, ADD CONSTRAINT fk_tickets_staff FOREIGN KEY (assigned_staff_id) REFERENCES staff_members(id) ON DELETE SET NULL', 
    'SELECT 1');
PREPARE alter_tickets FROM @stmt;
EXECUTE alter_tickets;
DEALLOCATE PREPARE alter_tickets;

-- 3. Add warden_id to hostels if not already present
SET @col_exists_h = 0;
SELECT COUNT(*) INTO @col_exists_h 
FROM information_schema.COLUMNS 
WHERE TABLE_SCHEMA = 'hostelhub_db' 
  AND TABLE_NAME = 'hostels' 
  AND COLUMN_NAME = 'warden_id';

SET @stmt_h = IF(@col_exists_h = 0, 
    'ALTER TABLE hostels ADD COLUMN warden_id INT NULL, ADD CONSTRAINT fk_hostel_warden FOREIGN KEY (warden_id) REFERENCES staff_members(id) ON DELETE SET NULL', 
    'SELECT 1');
PREPARE alter_hostels FROM @stmt_h;
EXECUTE alter_hostels;
DEALLOCATE PREPARE alter_hostels;

-- 4. Seed Staff Members (Idempotent INSERT IGNORE by unique employee_code)
INSERT IGNORE INTO staff_members (
    employee_code, full_name, designation, role, trade_specialization, phone_number, email, assigned_hostel_id
) VALUES
-- Wardens
('EMP-WRD-01', 'Dr. Suresh Kumar', 'Chief Hostel Warden', 'WARDEN', 'GENERAL', '+91 98765 43210', 'suresh.warden@hostelhub.edu', NULL),
('EMP-WRD-02', 'Dr. Ananya Sen', 'Resident Warden - Block A', 'WARDEN', 'GENERAL', '+91 98765 43211', 'ananya.sen@hostelhub.edu', 1),
('EMP-WRD-03', 'Prof. Vikram Patil', 'Resident Warden - Block B', 'WARDEN', 'GENERAL', '+91 98765 43212', 'vikram.patil@hostelhub.edu', 2),
('EMP-WRD-04', 'Dr. Meenakshi Sundaram', 'Resident Warden - Block C', 'WARDEN', 'GENERAL', '+91 98765 43213', 'm.sundaram@hostelhub.edu', 3),

-- Electricians
('EMP-ELE-01', 'Manoj Sharma', 'Senior Campus Electrician', 'TECHNICIAN', 'ELECTRICAL', '+91 98111 22001', 'manoj.elec@hostelhub.edu', NULL),
('EMP-ELE-02', 'Ramesh Patel', 'Maintenance Electrician', 'TECHNICIAN', 'ELECTRICAL', '+91 98111 22002', 'ramesh.elec@hostelhub.edu', NULL),

-- Plumbers
('EMP-PLM-01', 'Suresh Kumar', 'Senior Sanitary & Plumbing Tech', 'TECHNICIAN', 'PLUMBING', '+91 98222 33001', 'suresh.plumb@hostelhub.edu', NULL),
('EMP-PLM-02', 'Dinesh Verma', 'Drainage & Valve Specialist', 'TECHNICIAN', 'PLUMBING', '+91 98222 33002', 'dinesh.plumb@hostelhub.edu', NULL),

-- Wi-Fi & Network Technicians
('EMP-NET-01', 'Rajesh Kumar', 'Campus Network Engineer (LAN/RJ-45)', 'TECHNICIAN', 'INTERNET', '+91 98333 44001', 'rajesh.net@hostelhub.edu', NULL),
('EMP-NET-02', 'Amit Roy', 'Wireless Systems Tech (Wi-Fi AP)', 'TECHNICIAN', 'INTERNET', '+91 98333 44002', 'amit.net@hostelhub.edu', NULL),

-- Housekeeping & Caretakers
('EMP-HKP-01', 'Santosh Jadhav', 'Hostel Caretaker & Floor Supervisor', 'HOUSEKEEPING', 'CLEANLINESS', '+91 98444 55001', 'santosh.care@hostelhub.edu', 1),
('EMP-HKP-02', 'Ramesh Baghel', 'Housekeeping & Sanitation Staff', 'HOUSEKEEPING', 'CLEANLINESS', '+91 98444 55002', 'ramesh.clean@hostelhub.edu', NULL),

-- System Administration & Security
('EMP-SYS-01', 'Anand Verma', 'Senior Systems Administrator', 'SYSTEM_ADMIN', 'GENERAL', '+91 98555 66001', 'anand.sys@hostelhub.edu', NULL),
('EMP-SEC-01', 'Balram Singh', 'Head of Main Gate Security', 'SECURITY_GUARD', 'GENERAL', '+91 98666 77001', 'balram.sec@hostelhub.edu', NULL),
('EMP-ACC-01', 'Rajiv Mehta', 'Senior Accounts Officer', 'ACCOUNTANT', 'GENERAL', '+91 98777 88001', 'rajiv.acc@hostelhub.edu', NULL),
('EMP-MSS-01', 'Anand Sharma', 'Mess In-Charge & Diet Supervisor', 'MESS_SUPERVISOR', 'GENERAL', '+91 98888 99001', 'anand.mess@hostelhub.edu', NULL);

-- 5. Link Hostels to Resident Wardens
UPDATE hostels h
JOIN staff_members s ON s.assigned_hostel_id = h.id AND s.role = 'WARDEN'
SET h.warden_id = s.id;

-- 6. Backfill maintenance_tickets.assigned_staff_id from existing assigned_to strings
UPDATE maintenance_tickets t
JOIN staff_members s ON t.assigned_to LIKE CONCAT('%', s.full_name, '%')
SET t.assigned_staff_id = s.id
WHERE t.assigned_staff_id IS NULL AND t.assigned_to IS NOT NULL;

