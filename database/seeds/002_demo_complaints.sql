-- ============================================================================
-- HOSTELHUB DEMO SEED DATA: MAINTENANCE & COMPLAINTS
-- 10 Realistic Demo Complaints with varied categories, priorities, and statuses.
-- Idempotent (INSERT IGNORE)
-- ============================================================================

USE hostelhub_db;

INSERT IGNORE INTO maintenance_tickets (
  ticket_number, student_id, room_id, hostel_id, category,
  title, description, priority, status, assigned_to,
  resolution_notes, created_at, resolved_at
) VALUES
-- 1. Bhavya Sharma (24BCE1001, Block A S-101) - Resolved Internet Issue
('TKT-2026-0101', 1, 1, 1, 'INTERNET',
 'LAN port socket loose and frequent disconnections',
 'The RJ-45 Ethernet port next to the study table is loose and loses connection whenever the cable is touched. High packet loss during lab work.',
 'HIGH', 'RESOLVED', 'Rajesh Kumar (Network Tech)',
 'Crimped and replaced modular jack wall plate. Tested line speed: stable at 100 Mbps.',
 DATE_SUB(NOW(), INTERVAL 5 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY)),

-- 2. Diya Bhatt (24BCE1002, Block C D-201) - Resolved Plumbing Issue
('TKT-2026-0102', 2, 41, 3, 'PLUMBING',
 'Continuous water dripping from bathroom washbasin tap',
 'The cold water faucet in our attached bathroom cannot be shut tightly and keeps dripping water continuously, causing water wastage and noise at night.',
 'MEDIUM', 'RESOLVED', 'Suresh Plumber',
 'Replaced worn rubber washer and Teflon tape on spindle. Tap sealed completely.',
 DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY)),

-- 3. Ishaan Chopra (24BCE1003, Block C D-201) - In-Progress Electrical Issue
('TKT-2026-0103', 3, 41, 3, 'ELECTRICAL',
 'Ceiling fan making loud grinding noise on speeds 3 and 4',
 'The ceiling fan vibrates heavily and produces an unbearable squeaking and grinding noise when run above speed 2. Disturbs sleep and studying.',
 'HIGH', 'IN_PROGRESS', 'Manoj Sharma (Electrician)',
 'Inspected bearing and capacitor. Bearing needs replacement; requisition submitted to hostel store.',
 DATE_SUB(NOW(), INTERVAL 2 DAY), NULL),

-- 4. Lakshay Joshi (24BCE1004, Block C D-204) - Pending Furniture Issue
('TKT-2026-0104', 4, 44, 3, 'FURNITURE',
 'Study chair hydraulic cylinder sinking down',
 'The study chair does not stay locked at height and keeps sliding all the way to the lowest setting when seated.',
 'LOW', 'PENDING', NULL, NULL,
 DATE_SUB(NOW(), INTERVAL 1 DAY), NULL),

-- 5. Nikhil Mehta (24BCE1005, Block C D-204) - Resolved Cleanliness Issue
('TKT-2026-0105', 5, 44, 3, 'CLEANLINESS',
 'Balcony pigeon droppings and window glass dirt accumulation',
 'The exterior window sill and balcony corner have heavy pigeon droppings and accumulated dust after recent rain. Needs deep cleaning.',
 'LOW', 'RESOLVED', 'Ramesh (Housekeeping Staff)',
 'Window sill and balcony pressure-washed and sanitized with disinfectant.',
 DATE_SUB(NOW(), INTERVAL 6 DAY), DATE_SUB(NOW(), INTERVAL 5 DAY)),

-- 6. Sneha Kapoor (24BCE1008, Block B D-201) - In-Progress Electrical Issue
('TKT-2026-0106', 8, 31, 2, 'ELECTRICAL',
 'Tube light flickering and humming intermittently',
 'The main LED batten light in the room blinks every few minutes and emits a high-pitched buzzing sound.',
 'MEDIUM', 'IN_PROGRESS', 'Manoj Sharma (Electrician)',
 'Driver issue identified. New 20W LED fixture being picked up from maintenance room.',
 DATE_SUB(NOW(), INTERVAL 1 DAY), NULL),

-- 7. Varun Reddy (24BCE1009, Block B D-201) - Urgent Pending Plumbing Issue
('TKT-2026-0107', 9, 31, 2, 'PLUMBING',
 'Severe drainage backup in shower floor trap',
 'Water drains extremely slowly in the shower stall, causing water to pool up around ankles within 2 minutes of bathing.',
 'URGENT', 'PENDING', NULL, NULL,
 DATE_SUB(NOW(), INTERVAL 4 HOUR), NULL),

-- 8. Priya Singh (24BCE1006, Unallocated, Block A Common) - High In-Progress Cleanliness Issue
('TKT-2026-0108', 6, NULL, 1, 'CLEANLINESS',
 'Block A 1st Floor common water cooler tray overflow',
 'The drain pipe of the RO drinking water dispenser on the 1st floor corridor is blocked and dirty water is overflowing onto the hallway corridor.',
 'HIGH', 'IN_PROGRESS', 'Santosh (Hostel Caretaker)',
 'Drain line cleared with snake wire; tray cleaned and floor dried.',
 DATE_SUB(NOW(), INTERVAL 8 HOUR), NULL),

-- 9. Rohan Deshmukh (24BCE1007, Unallocated, Block B Common) - High Pending Internet Issue
('TKT-2026-0109', 7, NULL, 2, 'INTERNET',
 'Block B common reading room Wi-Fi access point offline',
 'The Wi-Fi SSID \'HostelHub-B-Study\' is not broadcasting in the ground floor study room since morning. No students can access course materials.',
 'HIGH', 'PENDING', NULL, NULL,
 DATE_SUB(NOW(), INTERVAL 2 HOUR), NULL),

-- 10. Zara Saxena (24BCE1010, Unallocated, Block C Common) - Urgent Resolved System Issue
('TKT-2026-0110', 10, NULL, 3, 'OTHER',
 'Block C main entrance biometric door sensor not registering ID cards',
 'The RFID card scanner on the main hostel glass door fails 4 out of 5 swipes, creating long queues of students during evening check-in.',
 'URGENT', 'RESOLVED', 'Anand Verma (System Admin)',
 'Firmware reset performed and optical reader cleaned. Calibration completed and confirmed working.',
 DATE_SUB(NOW(), INTERVAL 7 DAY), DATE_SUB(NOW(), INTERVAL 6 DAY));

