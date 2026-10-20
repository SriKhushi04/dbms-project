USE hostel_db;

-- Clear previous data in proper order (for clean seeding)
DELETE FROM allocations;
DELETE FROM students;
DELETE FROM rooms;
DELETE FROM blocks;
DELETE FROM hostels;

-- Reset Auto Increments
ALTER TABLE hostels AUTO_INCREMENT = 1;
ALTER TABLE blocks AUTO_INCREMENT = 1;
ALTER TABLE rooms AUTO_INCREMENT = 1;
ALTER TABLE students AUTO_INCREMENT = 1;
ALTER TABLE allocations AUTO_INCREMENT = 1;

-- 1. Insert Hostels
INSERT INTO hostels (id, name, type, description, warden_name, warden_contact) VALUES
(1, 'Aryabhata Men\'s Hall of Residence', 'BOYS', 'Spacious campus residence with modern amenities and gym for boys.', 'Dr. R. K. Sharma', '+91 9876543210'),
(2, 'Sarojini Naidu Women\'s Hall of Residence', 'GIRLS', 'Secure, vibrant living spaces with study halls and garden for girls.', 'Dr. Ananya Roy', '+91 9876543211'),
(3, 'Tagore International Residence', 'COED', 'Premium air-conditioned accommodations for international & postgraduate scholars.', 'Prof. Vikram Sen', '+91 9876543212');

-- 2. Insert Blocks
INSERT INTO blocks (id, hostel_id, block_name, total_floors) VALUES
(1, 1, 'Block A (North Wing)', 3),
(2, 1, 'Block B (South Wing)', 3),
(3, 2, 'Block Alpha (East Wing)', 3),
(4, 2, 'Block Beta (West Wing)', 2),
(5, 3, 'International Scholar Wing', 4);

-- 3. Insert Rooms
-- Format: (id, block_id, room_number, floor, room_type, capacity, occupied_count, fee_per_semester, status)
INSERT INTO rooms (id, block_id, room_number, floor, room_type, capacity, occupied_count, fee_per_semester, status) VALUES
-- Aryabhata Block A
(1, 1, 'A-101', 1, 'NON_AC_DOUBLE', 2, 2, 45000.00, 'FULL'),
(2, 1, 'A-102', 1, 'NON_AC_DOUBLE', 2, 1, 45000.00, 'AVAILABLE'),
(3, 1, 'A-103', 1, 'AC_SINGLE', 1, 1, 65000.00, 'FULL'),
(4, 1, 'A-201', 2, 'NON_AC_TRIPLE', 3, 2, 38000.00, 'AVAILABLE'),
(5, 1, 'A-202', 2, 'AC_DOUBLE', 2, 0, 58000.00, 'AVAILABLE'),
(6, 1, 'A-301', 3, 'FOUR_SHARING', 4, 0, 32000.00, 'AVAILABLE'),

-- Aryabhata Block B
(7, 2, 'B-101', 1, 'NON_AC_DOUBLE', 2, 1, 45000.00, 'AVAILABLE'),
(8, 2, 'B-102', 1, 'AC_DOUBLE', 2, 2, 58000.00, 'FULL'),
(9, 2, 'B-201', 2, 'NON_AC_SINGLE', 1, 0, 50000.00, 'AVAILABLE'),

-- Sarojini Block Alpha
(10, 3, 'AL-101', 1, 'AC_DOUBLE', 2, 2, 58000.00, 'FULL'),
(11, 3, 'AL-102', 1, 'NON_AC_DOUBLE', 2, 1, 45000.00, 'AVAILABLE'),
(12, 3, 'AL-201', 2, 'NON_AC_TRIPLE', 3, 0, 38000.00, 'AVAILABLE'),
(13, 3, 'AL-202', 2, 'AC_SINGLE', 1, 1, 65000.00, 'FULL'),

-- Sarojini Block Beta
(14, 4, 'BE-101', 1, 'NON_AC_DOUBLE', 2, 0, 45000.00, 'AVAILABLE'),
(15, 4, 'BE-102', 1, 'AC_DOUBLE', 2, 0, 58000.00, 'AVAILABLE'),

-- Tagore International Wing
(16, 5, 'TR-101', 1, 'AC_SINGLE', 1, 1, 75000.00, 'FULL'),
(17, 5, 'TR-102', 1, 'AC_DOUBLE', 2, 0, 68000.00, 'AVAILABLE');

-- 4. Insert Students
-- Format: (id, registration_number, name, email, phone, gender, branch, year_of_study, allocation_status, current_room_id)
INSERT INTO students (id, registration_number, name, email, phone, gender, branch, year_of_study, allocation_status, current_room_id) VALUES
(1, '23BCE1001', 'Aarav Patel', 'aarav.patel@college.edu', '9812340001', 'MALE', 'Computer Science and Engineering', 2, 'ALLOCATED', 1),
(2, '23BCE1002', 'Rohan Mehta', 'rohan.mehta@college.edu', '9812340002', 'MALE', 'Computer Science and Engineering', 2, 'ALLOCATED', 1),
(3, '23BEE1015', 'Kabir Verma', 'kabir.verma@college.edu', '9812340003', 'MALE', 'Electrical and Electronics', 2, 'ALLOCATED', 2),
(4, '22BME1040', 'Siddharth Nair', 'siddharth.nair@college.edu', '9812340004', 'MALE', 'Mechanical Engineering', 3, 'ALLOCATED', 3),
(5, '24BCS1102', 'Devendra Singh', 'devendra.singh@college.edu', '9812340005', 'MALE', 'Computer Science and Engineering', 1, 'ALLOCATED', 4),
(6, '24BCS1103', 'Aditya Joshi', 'aditya.joshi@college.edu', '9812340006', 'MALE', 'Information Technology', 1, 'ALLOCATED', 4),
(7, '23BCE1055', 'Manish Kulkarni', 'manish.kulkarni@college.edu', '9812340007', 'MALE', 'Civil Engineering', 2, 'ALLOCATED', 7),
(8, '22BEC1020', 'Ishaan Gupta', 'ishaan.gupta@college.edu', '9812340008', 'MALE', 'Electronics and Communication', 3, 'ALLOCATED', 8),
(9, '22BEC1021', 'Kunal Deshmukh', 'kunal.deshmukh@college.edu', '9812340009', 'MALE', 'Electronics and Communication', 3, 'ALLOCATED', 8),

-- Girls
(10, '23BCS2001', 'Diya Sharma', 'diya.sharma@college.edu', '9812340010', 'FEMALE', 'Computer Science and Engineering', 2, 'ALLOCATED', 10),
(11, '23BCS2002', 'Ananya Iyer', 'ananya.iyer@college.edu', '9812340011', 'FEMALE', 'Computer Science and Engineering', 2, 'ALLOCATED', 10),
(12, '24BEC2015', 'Pooja Reddy', 'pooja.reddy@college.edu', '9812340012', 'FEMALE', 'Electronics and Communication', 1, 'ALLOCATED', 11),
(13, '22BCE2033', 'Sneha Kapoor', 'sneha.kapoor@college.edu', '9812340013', 'FEMALE', 'Civil Engineering', 3, 'ALLOCATED', 13),

-- International / Co-ed
(14, '23INT3001', 'Alex Johnson', 'alex.johnson@college.edu', '9812340014', 'MALE', 'Biotechnology', 2, 'ALLOCATED', 16),

-- Unallocated Students (Ready for Allocation Demo & Testing)
(15, '24BCE1201', 'Arjun Rao', 'arjun.rao@college.edu', '9812340015', 'MALE', 'Computer Science and Engineering', 1, 'NOT_ALLOCATED', NULL),
(16, '24BCE1202', 'Tanmay Bhatt', 'tanmay.bhatt@college.edu', '9812340016', 'MALE', 'Computer Science and Engineering', 1, 'NOT_ALLOCATED', NULL),
(17, '24BEC2101', 'Meera Nambiar', 'meera.nambiar@college.edu', '9812340017', 'FEMALE', 'Electronics and Communication', 1, 'NOT_ALLOCATED', NULL),
(18, '24BME1305', 'Varun Khurana', 'varun.khurana@college.edu', '9812340018', 'MALE', 'Mechanical Engineering', 1, 'NOT_ALLOCATED', NULL),
(19, '24BCE2210', 'Riya Sen', 'riya.sen@college.edu', '9812340019', 'FEMALE', 'Computer Science and Engineering', 1, 'NOT_ALLOCATED', NULL),
(20, '24BIT1402', 'Gaurav Aggarwal', 'gaurav.aggarwal@college.edu', '9812340020', 'MALE', 'Information Technology', 1, 'NOT_ALLOCATED', NULL);

-- 5. Insert Active Allocations
INSERT INTO allocations (student_id, room_id, academic_year, status, remarks) VALUES
(1, 1, '2026-2027', 'ACTIVE', 'Allocated regular twin sharing room'),
(2, 1, '2026-2027', 'ACTIVE', 'Allocated regular twin sharing room'),
(3, 2, '2026-2027', 'ACTIVE', 'Allocated twin sharing room bed 1'),
(4, 3, '2026-2027', 'ACTIVE', 'Allocated single AC room'),
(5, 4, '2026-2027', 'ACTIVE', 'Allocated triple sharing bed 1'),
(6, 4, '2026-2027', 'ACTIVE', 'Allocated triple sharing bed 2'),
(7, 7, '2026-2027', 'ACTIVE', 'Allocated twin room'),
(8, 8, '2026-2027', 'ACTIVE', 'Allocated AC twin room bed 1'),
(9, 8, '2026-2027', 'ACTIVE', 'Allocated AC twin room bed 2'),
(10, 10, '2026-2027', 'ACTIVE', 'Allocated AC twin room bed 1'),
(11, 10, '2026-2027', 'ACTIVE', 'Allocated AC twin room bed 2'),
(12, 11, '2026-2027', 'ACTIVE', 'Allocated non-AC twin room'),
(13, 13, '2026-2027', 'ACTIVE', 'Allocated single AC room'),
(14, 16, '2026-2027', 'ACTIVE', 'Allocated international scholar suite');

