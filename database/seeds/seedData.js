// ============================================================================
// HOSTELHUB REPRODUCIBLE SEED DATA GENERATOR
// Guarantees exact totals:
//   - Exactly 100 Fictional Students with unique merit ranks 1..100
//   - Exactly 3 Hostel Blocks (Block A, Block B, Block C)
//   - Exactly 80 Physical Rooms (20 Singles, 30 Doubles, 30 Quads) = 200 Beds
//   - Demo applications with 5 valid, capacity-matching, distinct preferences
// ============================================================================

// Precomputed bcrypt hashes for instant seeding (salt rounds: 10)
// Password for all demo students: "Student@123"
export const DEMO_STUDENT_PASSWORD_HASH = '$2a$10$1v/POCnYPyqhvt6oc9GMPOBZnqyJpOqPwMW/kj2GDMpyW24EpP.LG';
// Password for demo admins: "Admin@123" / "Warden@123"
export const DEMO_ADMIN_PASSWORD_HASH = '$2a$10$vuNsBfQ91KgSPZaXmF67E.xLIiD9Fl4ek/OA84yXJ9fXik/8AWcvS';
export const DEMO_WARDEN_PASSWORD_HASH = '$2a$10$In6vpUw1RzLCl81SSe.0ReA8Fr1jqRd.MSrU.XbB/yB38VS5xr7S2';

// 1. Generate 3 Hostel Blocks
export const generateBlocks = () => [
  { id: 1, block_name: 'Block A', gender_policy: 'BOYS', description: 'North Campus Residence' },
  { id: 2, block_name: 'Block B', gender_policy: 'GIRLS', description: 'South Campus Residence' },
  { id: 3, block_name: 'Block C', gender_policy: 'COED', description: 'Central International Wing' }
];

// 2. Generate Exactly 80 Rooms (20 Singles, 30 Doubles, 30 Quads = 200 Beds)
export const generateRooms = () => {
  const rooms = [];
  let roomId = 1;

  // Single Rooms (Capacity 1) - Exactly 20 rooms (20 beds)
  // Block A: 7 rooms, Block B: 7 rooms, Block C: 6 rooms
  const singleDistribution = [
    { block_id: 1, count: 7, startNum: 101 },
    { block_id: 2, count: 7, startNum: 101 },
    { block_id: 3, count: 6, startNum: 101 }
  ];

  for (const dist of singleDistribution) {
    for (let i = 0; i < dist.count; i++) {
      rooms.push({
        id: roomId++,
        block_id: dist.block_id,
        room_number: `S-${dist.startNum + i}`,
        capacity: 1,
        room_type: 'SINGLE',
        floor: Math.floor(i / 4) + 1,
        is_active: true
      });
    }
  }

  // Double Rooms (Capacity 2) - Exactly 30 rooms (60 beds)
  // Block A: 10 rooms, Block B: 10 rooms, Block C: 10 rooms
  const doubleDistribution = [
    { block_id: 1, count: 10, startNum: 201 },
    { block_id: 2, count: 10, startNum: 201 },
    { block_id: 3, count: 10, startNum: 201 }
  ];

  for (const dist of doubleDistribution) {
    for (let i = 0; i < dist.count; i++) {
      rooms.push({
        id: roomId++,
        block_id: dist.block_id,
        room_number: `D-${dist.startNum + i}`,
        capacity: 2,
        room_type: 'DOUBLE',
        floor: Math.floor(i / 5) + 1,
        is_active: true
      });
    }
  }

  // Quadruple Rooms (Capacity 4) - Exactly 30 rooms (120 beds)
  // Block A: 10 rooms, Block B: 10 rooms, Block C: 10 rooms
  const quadDistribution = [
    { block_id: 1, count: 10, startNum: 301 },
    { block_id: 2, count: 10, startNum: 301 },
    { block_id: 3, count: 10, startNum: 301 }
  ];

  for (const dist of quadDistribution) {
    for (let i = 0; i < dist.count; i++) {
      rooms.push({
        id: roomId++,
        block_id: dist.block_id,
        room_number: `Q-${dist.startNum + i}`,
        capacity: 4,
        room_type: 'QUADRUPLE',
        floor: Math.floor(i / 5) + 1,
        is_active: true
      });
    }
  }

  return rooms;
};

// 3. Generate Exactly 100 Fictional Students with unique merit ranks 1..100
const firstNames = [
  'Aarav', 'Aditi', 'Advait', 'Ananya', 'Arjun', 'Bhavya', 'Chetan', 'Devansh',
  'Diya', 'Esha', 'Gaurav', 'Harsh', 'Ishaan', 'Janvi', 'Kabir', 'Kavya',
  'Lakshay', 'Manish', 'Meera', 'Navya', 'Nikhil', 'Pooja', 'Pranav', 'Rahul',
  'Riya', 'Rohan', 'Sakshi', 'Sameer', 'Shreya', 'Siddharth', 'Sneha', 'Tanmay',
  'Tarun', 'Utkarsh', 'Varun', 'Vidhi', 'Yash', 'Zara', 'Aditya', 'Akanksha',
  'Aniket', 'Anushka', 'Ayush', 'Deepak', 'Divya', 'Hardik', 'Ishita', 'Karan'
];

const lastNames = [
  'Sharma', 'Verma', 'Patel', 'Iyer', 'Gupta', 'Singh', 'Nair', 'Mehta',
  'Reddy', 'Joshi', 'Kulkarni', 'Deshmukh', 'Bhatt', 'Rao', 'Chopra', 'Malhotra',
  'Kapoor', 'Bansal', 'Saxena', 'Agrawal', 'Chakraborty', 'Sen', 'Pillai', 'Menon'
];

const branches = [
  'Computer Science and Engineering',
  'Electronics and Communication Engineering',
  'Mechanical Engineering',
  'Electrical and Electronics Engineering',
  'Civil Engineering',
  'Information Technology'
];

export const generateStudents = () => {
  const students = [];
  for (let i = 1; i <= 100; i++) {
    const fn = firstNames[(i * 3 + 7) % firstNames.length];
    const ln = lastNames[(i * 5 + 11) % lastNames.length];
    const fullName = `${fn} ${ln}`;
    const regNum = `24BCE${1000 + i}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@hostelhub.edu`;
    const gender = i % 2 === 0 ? 'FEMALE' : 'MALE';
    const branch = branches[i % branches.length];
    const yearOfStudy = (i % 4) + 1;
    const meritRank = i; // Exactly unique merit ranks 1 through 100!

    students.push({
      id: i,
      registration_number: regNum,
      full_name: fullName,
      email: email,
      gender: gender,
      academic_branch: branch,
      year_of_study: yearOfStudy,
      merit_rank: meritRank,
      password_hash: DEMO_STUDENT_PASSWORD_HASH
    });
  }
  return students;
};

// 4. Generate Administrators
export const generateAdmins = () => [
  {
    id: 1,
    username: 'admin',
    email: 'admin@hostelhub.edu',
    password_hash: DEMO_ADMIN_PASSWORD_HASH,
    full_name: 'Dr. Suresh Chandra (Chief Warden)',
    role: 'ADMIN'
  },
  {
    id: 2,
    username: 'warden_b',
    email: 'warden@hostelhub.edu',
    password_hash: DEMO_WARDEN_PASSWORD_HASH,
    full_name: 'Dr. Meenakshi Sundaram (Resident Warden)',
    role: 'WARDEN'
  }
];

// 5. Generate Active Academic Batch
export const generateBatches = () => [
  {
    id: 1,
    batch_name: 'FALL-2026',
    academic_year: '2026-2027',
    application_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    status: 'CLOSED' // Seeded as CLOSED so admin can trigger allocation immediately or review!
  }
];

// 6. Generate Sample Applications with EXACTLY 5 Valid, Distinct, Capacity-Matching Preferences
// Demonstrates:
// - Individual Single Room Applicants (Group size 1 -> Single rooms)
// - Pair Double Room Applicants (Group size 2 -> Double rooms)
// - Quad Group Applicants (Group size 4 -> Quad rooms)
// - Contested room preference fallback
// - Waitlisting scenario
export const generateDemoApplications = (rooms, students) => {
  const singleRooms = rooms.filter(r => r.capacity === 1);
  const doubleRooms = rooms.filter(r => r.capacity === 2);
  const quadRooms = rooms.filter(r => r.capacity === 4);

  const groups = [];
  const groupMembers = [];
  const applications = [];
  const preferences = [];

  let groupIdCounter = 1;
  let memberIdCounter = 1;
  let appIdCounter = 1;
  let prefIdCounter = 1;

  // Helper to add group + app + 5 preferences
  function addApplicationGroup(memberStudentIds, targetCapacity, preferredRoomList) {
    if (preferredRoomList.length !== 5) {
      throw new Error(`Preference list must contain exactly 5 rooms. Got ${preferredRoomList.length}`);
    }
    const distinctRooms = new Set(preferredRoomList.map(r => r.id));
    if (distinctRooms.size !== 5) {
      throw new Error('Preferred rooms must be distinct!');
    }
    for (const r of preferredRoomList) {
      if (r.capacity !== targetCapacity) {
        throw new Error(`Room ${r.room_number} capacity (${r.capacity}) does not match target (${targetCapacity})`);
      }
    }

    // Determine leader automatically: MIN(merit_rank)
    const members = memberStudentIds.map(id => students.find(s => s.id === id));
    let leader = members[0];
    for (const m of members) {
      if (m.merit_rank < leader.merit_rank) {
        leader = m;
      }
    }

    const currentGroupId = groupIdCounter++;
    const currentAppId = appIdCounter++;

    groups.push({
      id: currentGroupId,
      batch_id: 1,
      group_code: `GRP-${1000 + currentGroupId}`,
      target_capacity: targetCapacity,
      calculated_leader_id: leader.id,
      leader_rank: leader.merit_rank,
      is_locked: true
    });

    for (const studentId of memberStudentIds) {
      groupMembers.push({
        id: memberIdCounter++,
        group_id: currentGroupId,
        batch_id: 1,
        student_id: studentId
      });
    }

    applications.push({
      id: currentAppId,
      batch_id: 1,
      group_id: currentGroupId,
      status: 'SUBMITTED',
      submitted_at: new Date(Date.now() - 3600000)
    });

    for (let rank = 1; rank <= 5; rank++) {
      preferences.push({
        id: prefIdCounter++,
        application_id: currentAppId,
        preference_rank: rank,
        room_id: preferredRoomList[rank - 1].id
      });
    }
  }

  // --- DEMO SCENARIOS ---

  // A. High Merit Single Applicants (Individual, capacity 1)
  // Student 1 (Rank 1): picks Single Rooms [S-101, S-102, S-103, S-104, S-105] -> Wins S-101 (Pref 1)
  addApplicationGroup([1], 1, [singleRooms[0], singleRooms[1], singleRooms[2], singleRooms[3], singleRooms[4]]);

  // Student 4 (Rank 4): picks Single Rooms [S-101, S-102, S-106, S-107, S-108] -> Contests S-101 (lost to Rank 1), wins S-102 (Pref 2 Fallback!)
  addApplicationGroup([4], 1, [singleRooms[0], singleRooms[1], singleRooms[5], singleRooms[6], singleRooms[7]]);

  // Student 7 (Rank 7): picks Single Rooms [S-101, S-102, S-103, S-109, S-110] -> Contests S-101 & S-102, wins S-103 (Pref 3 Fallback!)
  addApplicationGroup([7], 1, [singleRooms[0], singleRooms[1], singleRooms[2], singleRooms[8], singleRooms[9]]);

  // Student 10 (Rank 10): picks Single Rooms [S-104, S-105, S-106, S-107, S-108] -> Wins S-104 (Pref 1)
  addApplicationGroup([10], 1, [singleRooms[3], singleRooms[4], singleRooms[5], singleRooms[6], singleRooms[7]]);

  // Student 23 (Rank 23): picks Single Rooms [S-105, S-106, S-107, S-108, S-109] -> Wins S-105 (Pref 1)
  addApplicationGroup([23], 1, [singleRooms[4], singleRooms[5], singleRooms[6], singleRooms[7], singleRooms[8]]);

  // B. Pairs (Group size 2, Double rooms, capacity 2)
  // Group Alpha: Students [2, 3] (Leader is Student 2, Rank 2)
  // Picks Double Rooms [D-201, D-202, D-203, D-204, D-205] -> Wins D-201 (Pref 1)
  addApplicationGroup([2, 3], 2, [doubleRooms[0], doubleRooms[1], doubleRooms[2], doubleRooms[3], doubleRooms[4]]);

  // Group Beta: Students [5, 6] (Leader is Student 5, Rank 5)
  // Picks Double Rooms [D-201, D-202, D-206, D-207, D-208] -> Contests D-201, wins D-202 (Pref 2 Fallback!)
  addApplicationGroup([5, 6], 2, [doubleRooms[0], doubleRooms[1], doubleRooms[5], doubleRooms[6], doubleRooms[7]]);

  // Group Gamma: Students [8, 9] (Leader is Student 8, Rank 8)
  // Picks Double Rooms [D-203, D-204, D-205, D-209, D-210] -> Wins D-203 (Pref 1)
  addApplicationGroup([8, 9], 2, [doubleRooms[2], doubleRooms[3], doubleRooms[4], doubleRooms[8], doubleRooms[9]]);

  // C. Quad Groups (Group size 4, Quad rooms, capacity 4)
  // Group Delta: Students [11, 12, 13, 14] (Leader is Student 11, Rank 11)
  // Picks Quad Rooms [Q-301, Q-302, Q-303, Q-304, Q-305] -> Wins Q-301 (Pref 1)
  addApplicationGroup([11, 12, 13, 14], 4, [quadRooms[0], quadRooms[1], quadRooms[2], quadRooms[3], quadRooms[4]]);

  // Group Epsilon: Students [15, 16, 17, 18] (Leader is Student 15, Rank 15)
  // Picks Quad Rooms [Q-301, Q-302, Q-306, Q-307, Q-308] -> Contests Q-301, wins Q-302 (Pref 2 Fallback!)
  addApplicationGroup([15, 16, 17, 18], 4, [quadRooms[0], quadRooms[1], quadRooms[5], quadRooms[6], quadRooms[7]]);

  // Group Zeta: Students [19, 20, 21, 22] (Leader is Student 19, Rank 19)
  // Picks Quad Rooms [Q-303, Q-304, Q-305, Q-309, Q-310] -> Wins Q-303 (Pref 1)
  addApplicationGroup([19, 20, 21, 22], 4, [quadRooms[2], quadRooms[3], quadRooms[4], quadRooms[8], quadRooms[9]]);

  // D. Waitlist Test Group
  // Student 99 (Rank 99): picks only the top 5 single rooms [S-101, S-102, S-103, S-104, S-105]
  // All 5 are already taken by higher ranks -> Will be WAITLISTED!
  addApplicationGroup([99], 1, [singleRooms[0], singleRooms[1], singleRooms[2], singleRooms[3], singleRooms[4]]);

  return { groups, groupMembers, applications, preferences };
};

