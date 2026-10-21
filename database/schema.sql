-- ============================================================================
-- HOSTELHUB MINIMAL RELATIONAL SCHEMA (MySQL 8.x - InnoDB)
-- Minimal, Clean, Allocation-Preserving
-- ============================================================================

CREATE DATABASE IF NOT EXISTS hostelhub_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hostelhub_db;

-- 1. Hostel Blocks
CREATE TABLE IF NOT EXISTS hostels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    block_name VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 2. Physical Rooms Inventory
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    capacity INT NOT NULL CHECK (capacity IN (1, 2, 4)),
    FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE,
    UNIQUE KEY uk_hostel_room (hostel_id, room_number),
    INDEX idx_room_capacity (hostel_id, capacity)
) ENGINE=InnoDB;

-- 3. Students
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    registration_number VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    merit_rank INT NOT NULL UNIQUE,
    is_eligible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reg_no (registration_number)
) ENGINE=InnoDB;

-- 4. Roommate Application Groups
CREATE TABLE IF NOT EXISTS roommate_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    primary_student_id INT NOT NULL,
    hostel_id INT NOT NULL,
    capacity INT NOT NULL CHECK (capacity IN (1, 2, 4)),
    status ENUM('SUBMITTED', 'ALLOCATED', 'WAITLISTED') DEFAULT 'SUBMITTED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (primary_student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 5. Group Members (Enforces that a student belongs to at most one active group)
CREATE TABLE IF NOT EXISTS group_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    student_id INT NOT NULL UNIQUE,
    FOREIGN KEY (group_id) REFERENCES roommate_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Room Preferences (Exactly 5 distinct choices per group)
CREATE TABLE IF NOT EXISTS preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    preference_rank INT NOT NULL CHECK (preference_rank BETWEEN 1 AND 5),
    room_id INT NOT NULL,
    FOREIGN KEY (group_id) REFERENCES roommate_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    UNIQUE KEY uk_group_pref (group_id, preference_rank),
    UNIQUE KEY uk_group_room (group_id, room_id)
) ENGINE=InnoDB;

-- 7. Allocations (Assigns physical rooms to students)
CREATE TABLE IF NOT EXISTS allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL UNIQUE,
    room_id INT NOT NULL,
    allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
    INDEX idx_room_alloc (room_id)
) ENGINE=InnoDB;
