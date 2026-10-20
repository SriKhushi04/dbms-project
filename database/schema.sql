-- ============================================================================
-- HOSTELHUB DATABASE SCHEMA (MySQL 8.x - InnoDB)
-- Academic DBMS Project: Merit-Based University Hostel Room Allocation System
-- Fully Normalized (3NF) with Strict Constraints, Indexes & Referential Integrity
-- ============================================================================

CREATE DATABASE IF NOT EXISTS hostelhub_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hostelhub_db;

-- ----------------------------------------------------------------------------
-- 1. BATCHES (Allocation cycles and submission lifecycle)
-- Lifecycle: OPEN -> CLOSED -> ALLOCATED -> PUBLISHED -> ARCHIVED
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_name VARCHAR(50) NOT NULL UNIQUE,
    academic_year VARCHAR(20) NOT NULL,
    application_deadline DATETIME NOT NULL,
    status ENUM('OPEN', 'CLOSED', 'ALLOCATED', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 2. ADMINISTRATORS (System administrators and wardens)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('ADMIN', 'WARDEN') NOT NULL DEFAULT 'ADMIN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 3. HOSTEL BLOCKS (Physical buildings: Block A, Block B, Block C)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hostel_blocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    block_name VARCHAR(50) NOT NULL UNIQUE,
    gender_policy ENUM('COED', 'BOYS', 'GIRLS') NOT NULL DEFAULT 'COED',
    description VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 4. ROOMS (Physical rooms inventory)
-- Inventory Requirement:
--   20 Single rooms (capacity 1) = 20 beds
--   30 Double rooms (capacity 2) = 60 beds
--   30 Quadruple rooms (capacity 4) = 120 beds
--   Total: exactly 80 rooms, 200 beds
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    block_id INT NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    capacity INT NOT NULL CHECK (capacity IN (1, 2, 4)),
    room_type ENUM('SINGLE', 'DOUBLE', 'QUADRUPLE') NOT NULL,
    floor INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (block_id) REFERENCES hostel_blocks(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_block_room (block_id, room_number),
    INDEX idx_room_capacity (capacity, is_active),
    INDEX idx_room_type (room_type)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 5. STUDENTS (100 fictional students with unique merit ranks 1..100)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    registration_number VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    gender ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
    academic_branch VARCHAR(50) NOT NULL,
    year_of_study INT NOT NULL CHECK (year_of_study BETWEEN 1 AND 5),
    merit_rank INT NOT NULL UNIQUE CHECK (merit_rank >= 1),
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_student_rank (merit_rank)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 6. APPLICATION GROUPS (Groups formed by students: size 1, 2, or 4)
-- Automatically calculates leader as member with MIN(merit_rank)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS application_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id INT NOT NULL,
    group_code VARCHAR(32) NOT NULL UNIQUE,
    target_capacity INT NOT NULL CHECK (target_capacity IN (1, 2, 4)),
    calculated_leader_id INT NOT NULL,
    leader_rank INT NOT NULL,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (calculated_leader_id) REFERENCES students(id) ON DELETE RESTRICT,
    INDEX idx_group_batch_capacity (batch_id, target_capacity),
    INDEX idx_group_leader_rank (leader_rank ASC)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 7. GROUP MEMBERS (Normalized junction table for group membership)
-- Constraint: student can belong to at most one group per batch
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    batch_id INT NOT NULL,
    student_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES application_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY uk_group_student (group_id, student_id),
    UNIQUE KEY uk_student_per_batch (batch_id, student_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 8. APPLICATIONS (Submitted hostel applications)
-- Exactly 1 application per group (1:1 with application_groups)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id INT NOT NULL,
    group_id INT NOT NULL UNIQUE,
    status ENUM('DRAFT', 'SUBMITTED', 'ALLOCATED', 'WAITLISTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    submitted_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES application_groups(id) ON DELETE CASCADE,
    INDEX idx_app_status (batch_id, status)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 9. ROOM PREFERENCES (Exactly 5 distinct ranked preferences per application)
-- Must match application room capacity. Unique preference rank 1..5.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS room_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    preference_rank INT NOT NULL CHECK (preference_rank BETWEEN 1 AND 5),
    room_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    UNIQUE KEY uk_app_pref_rank (application_id, preference_rank),
    UNIQUE KEY uk_app_room (application_id, room_id),
    INDEX idx_pref_room (room_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 10. ALLOCATION RUNS (Audit records of batch execution triggered by admin)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS allocation_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id INT NOT NULL,
    initiated_by_admin_id INT NOT NULL,
    started_at DATETIME NOT NULL,
    completed_at DATETIME NULL,
    status ENUM('RUNNING', 'COMPLETED', 'FAILED', 'SUPERSEDED') NOT NULL DEFAULT 'RUNNING',
    total_applications_processed INT DEFAULT 0,
    total_allocated_groups INT DEFAULT 0,
    total_allocated_students INT DEFAULT 0,
    total_waitlisted_groups INT DEFAULT 0,
    pref_1_count INT DEFAULT 0,
    pref_2_count INT DEFAULT 0,
    pref_3_count INT DEFAULT 0,
    pref_4_count INT DEFAULT 0,
    pref_5_count INT DEFAULT 0,
    summary_notes TEXT NULL,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (initiated_by_admin_id) REFERENCES admins(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 11. ROOM ALLOCATIONS (Application-level room reservations per batch)
-- Database Constraint: UNIQUE KEY uk_batch_room enforces that a physical room
-- can be reserved by at most ONE application in a given batch.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS room_allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    run_id INT NOT NULL,
    batch_id INT NOT NULL,
    application_id INT NOT NULL,
    group_id INT NOT NULL,
    room_id INT NOT NULL,
    preference_rank_satisfied INT NOT NULL CHECK (preference_rank_satisfied BETWEEN 1 AND 5),
    status ENUM('ACTIVE', 'VACATED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    vacated_at DATETIME NULL,
    FOREIGN KEY (run_id) REFERENCES allocation_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES application_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_batch_room (batch_id, room_id),
    UNIQUE KEY uk_batch_application (batch_id, application_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 12. ALLOCATIONS (Student-level room assignments per batch)
-- Database Constraint: UNIQUE KEY uk_batch_student strictly guarantees that a
-- student can have at most ONE allocation record in any batch.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    run_id INT NOT NULL,
    batch_id INT NOT NULL,
    application_id INT NOT NULL,
    group_id INT NOT NULL,
    student_id INT NOT NULL,
    room_id INT NOT NULL,
    preference_rank_satisfied INT NOT NULL CHECK (preference_rank_satisfied BETWEEN 1 AND 5),
    status ENUM('ACTIVE', 'VACATED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    vacated_at DATETIME NULL,
    FOREIGN KEY (run_id) REFERENCES allocation_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES application_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT,
    UNIQUE KEY uk_batch_student (batch_id, student_id),
    INDEX idx_alloc_batch_room (batch_id, room_id, status)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 13. UNALLOCATED RECORDS (Detailed audit reason for waitlisted applications)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS unallocated_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    run_id INT NOT NULL,
    batch_id INT NOT NULL,
    application_id INT NOT NULL,
    group_id INT NOT NULL,
    reason ENUM('NO_PREFERENCE_AVAILABLE', 'INSUFFICIENT_ROOMS', 'INVALID_APPLICATION') NOT NULL,
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (run_id) REFERENCES allocation_runs(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES application_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------------
-- 14. AUDIT LOGS (Immutable tracking of all critical system actions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actor_type ENUM('ADMIN', 'STUDENT', 'SYSTEM') NOT NULL,
    actor_id INT NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NULL,
    details JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_created (created_at DESC),
    INDEX idx_audit_action (action)
) ENGINE=InnoDB;

