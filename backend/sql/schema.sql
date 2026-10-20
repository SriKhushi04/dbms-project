-- Phase 1: Hostel Allocation System Database Schema
CREATE DATABASE IF NOT EXISTS hostel_db;
USE hostel_db;

-- 1. Hostels Table
CREATE TABLE IF NOT EXISTS hostels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    type ENUM('BOYS', 'GIRLS', 'COED') NOT NULL,
    description TEXT,
    warden_name VARCHAR(100),
    warden_contact VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Blocks Table
CREATE TABLE IF NOT EXISTS blocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NOT NULL,
    block_name VARCHAR(50) NOT NULL,
    total_floors INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE,
    UNIQUE KEY unique_hostel_block (hostel_id, block_name)
) ENGINE=InnoDB;

-- 3. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    block_id INT NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    floor INT NOT NULL DEFAULT 1,
    room_type ENUM('AC_SINGLE', 'NON_AC_SINGLE', 'AC_DOUBLE', 'NON_AC_DOUBLE', 'AC_TRIPLE', 'NON_AC_TRIPLE', 'FOUR_SHARING') NOT NULL,
    capacity INT NOT NULL DEFAULT 1,
    occupied_count INT NOT NULL DEFAULT 0,
    fee_per_semester DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status ENUM('AVAILABLE', 'FULL', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE,
    UNIQUE KEY unique_block_room (block_id, room_number)
) ENGINE=InnoDB;

-- 4. Students Table
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    registration_number VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    gender ENUM('MALE', 'FEMALE', 'OTHER') NOT NULL,
    branch VARCHAR(50) NOT NULL,
    year_of_study INT NOT NULL DEFAULT 1,
    allocation_status ENUM('NOT_ALLOCATED', 'ALLOCATED', 'WAITLISTED') NOT NULL DEFAULT 'NOT_ALLOCATED',
    current_room_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (current_room_id) REFERENCES rooms(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 5. Allocations History & Tracking Table
CREATE TABLE IF NOT EXISTS allocations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    room_id INT NOT NULL,
    academic_year VARCHAR(20) NOT NULL DEFAULT '2026-2027',
    allocated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    vacated_date TIMESTAMP NULL DEFAULT NULL,
    status ENUM('ACTIVE', 'VACATED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    remarks VARCHAR(255),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Indexing for high-performance dashboard count queries
CREATE INDEX idx_room_status ON rooms(status);
CREATE INDEX idx_student_allocation ON students(allocation_status);
CREATE INDEX idx_allocation_status ON allocations(status);

