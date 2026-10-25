-- ============================================================================
-- HOSTELHUB MANAGEMENT MODULE ADDITIVE SCHEMA (MySQL 8.x - InnoDB)
-- Non-destructive, idempotent, preserves all existing Phase 1 allocation data.
-- ============================================================================

USE hostelhub_db;

-- 1. Management Staff Accounts (Role-based access: Warden, Accountant, Mess Supervisor, Security)
CREATE TABLE IF NOT EXISTS management_staff (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('WARDEN', 'ACCOUNTANT', 'MESS_SUPERVISOR', 'SECURITY_GUARD') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_staff_username (username),
    INDEX idx_staff_role (role)
) ENGINE=InnoDB;

-- 2. Student Management Credentials (Separate from Phase 1 allocation to preserve students table)
CREATE TABLE IF NOT EXISTS student_credentials (
    student_id INT PRIMARY KEY,
    password_hash VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Maintenance & Complaints Tickets
CREATE TABLE IF NOT EXISTS maintenance_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_number VARCHAR(30) NOT NULL UNIQUE,
    student_id INT NOT NULL,
    room_id INT NULL,
    hostel_id INT NOT NULL,
    category ENUM('ELECTRICAL', 'PLUMBING', 'FURNITURE', 'CLEANLINESS', 'INTERNET', 'OTHER') NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
    status ENUM('PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED') DEFAULT 'PENDING',
    assigned_to VARCHAR(100) NULL,
    resolution_notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
    FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE RESTRICT,
    INDEX idx_maint_student (student_id),
    INDEX idx_maint_status (status),
    INDEX idx_maint_category (category)
) ENGINE=InnoDB;

-- 4. Fee Invoices (Student semester bills)
CREATE TABLE IF NOT EXISTS fee_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL UNIQUE,
    academic_term VARCHAR(30) NOT NULL,
    room_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    mess_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    caution_deposit DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    utility_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    due_date DATE NOT NULL,
    status ENUM('PAID', 'PARTIAL', 'UNPAID', 'OVERDUE') DEFAULT 'UNPAID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_invoice_student (student_id),
    INDEX idx_invoice_status (status)
) ENGINE=InnoDB;

-- 5. Fee Payments (Transactions ledger)
CREATE TABLE IF NOT EXISTS fee_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    student_id INT NOT NULL,
    payment_reference VARCHAR(64) NOT NULL UNIQUE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    payment_mode ENUM('UPI', 'CARD', 'NET_BANKING', 'CASH', 'DEMAND_DRAFT') NOT NULL,
    payment_status ENUM('SUCCESS', 'FAILED', 'PENDING') DEFAULT 'SUCCESS',
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES fee_invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_payment_ref (payment_reference),
    INDEX idx_payment_student (student_id)
) ENGINE=InnoDB;

-- 6. Mess Weekly Menu
CREATE TABLE IF NOT EXISTS mess_menu (
    id INT AUTO_INCREMENT PRIMARY KEY,
    day_of_week ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL UNIQUE,
    breakfast TEXT NOT NULL,
    lunch TEXT NOT NULL,
    snacks TEXT NOT NULL,
    dinner TEXT NOT NULL,
    special_item VARCHAR(100) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 7. Student Dietary Preferences
CREATE TABLE IF NOT EXISTS student_dietary_preferences (
    student_id INT PRIMARY KEY,
    diet_type ENUM('VEGETARIAN', 'NON_VEGETARIAN', 'JAIN') DEFAULT 'VEGETARIAN',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Mess Leave Rebates
CREATE TABLE IF NOT EXISTS mess_rebates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rebate_days INT NOT NULL CHECK (rebate_days >= 3),
    daily_rate DECIMAL(8, 2) DEFAULT 150.00,
    total_amount DECIMAL(8, 2) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    decision_notes VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_rebate_student (student_id),
    INDEX idx_rebate_dates (start_date, end_date),
    INDEX idx_rebate_status (status)
) ENGINE=InnoDB;

-- 9. Curfew & Gate Passes
CREATE TABLE IF NOT EXISTS gate_passes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pass_number VARCHAR(30) NOT NULL UNIQUE,
    student_id INT NOT NULL,
    pass_type ENUM('DAY_PASS', 'NIGHT_OUT') NOT NULL,
    destination VARCHAR(150) NOT NULL,
    reason TEXT NOT NULL,
    emergency_contact VARCHAR(20) NOT NULL,
    departure_time DATETIME NOT NULL,
    expected_return_time DATETIME NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED', 'CHECKED_OUT', 'CHECKED_IN', 'EXPIRED') DEFAULT 'PENDING',
    approved_by VARCHAR(100) NULL,
    approved_at DATETIME NULL,
    checked_out_at DATETIME NULL,
    checked_in_at DATETIME NULL,
    rejection_reason VARCHAR(255) NULL,
    is_overdue BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_pass_student (student_id),
    INDEX idx_pass_status (status),
    INDEX idx_pass_times (departure_time, expected_return_time)
) ENGINE=InnoDB;

-- Initial default 7-day mess menu (idempotent insert)
INSERT IGNORE INTO mess_menu (day_of_week, breakfast, lunch, snacks, dinner, special_item) VALUES
('MONDAY', 'Idli, Sambar, Coconut Chutney, Tea/Coffee', 'Rice, Dal Tadka, Seasonal Sabzi, Roti, Curd', 'Samosa, Mint Chutney, Tea', 'Paneer Butter Masala, Roti, Jeera Rice, Salad', 'Fruit Custard'),
('TUESDAY', 'Aloo Paratha, Butter, Pickle, Curd, Tea', 'Rajma Masala, Steamed Basmati Rice, Chapati, Papad', 'Veg Puff, Green Tea', 'Kadhai Veg / Egg Curry, Tandoori Roti, Pulao', 'Gulab Jamun'),
('WEDNESDAY', 'Poha with Sev & Peanuts, Boiled Sprouts, Coffee', 'Chole Bhature, Onion Salad, Boondi Raita', 'Biscuits, Tea', 'Methi Malai Matar / Chicken Korma, Naan, Rice', 'Kheer'),
('THURSDAY', 'Masala Dosa, Chutney, Filter Coffee', 'Kadhi Pakoda, Khichdi, Papad, Pickle', 'Vada Pav, Masala Chai', 'Mix Veg Curry, Dal Fry, Phulka, Steamed Rice', 'Ice Cream'),
('FRIDAY', 'Upma with Chutney, Boiled Eggs / Banana, Tea', 'Veg Biryani / Chicken Biryani, Mirchi Ka Salan, Raita', 'Pakoda, Cutting Chai', 'Dal Makhani, Butter Naan, Jeera Rice', 'Jalebi'),
('SATURDAY', 'Puri Bhaji, Halwa, Tea/Coffee', 'South Indian Thali: Rice, Rasam, Poriyal, Appalam', 'Bread Roll, Tea', 'Aloo Gobi, Tarka Dal, Roti, Peas Pulao', 'Rasgulla'),
('SUNDAY', 'Chole Kulche, Sweet Lassi / Juice', 'Special Sunday Lunch Feast, Paneer Pulao, Dal', 'Cake slice, Tea', 'Light Dinner: Khichdi / Soup, Toast, Fruit Salad', 'Kulfi');
