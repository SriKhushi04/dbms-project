// ============================================================================
// HOSTELHUB SEED DATA GENERATOR
// 3 Hostels, 80 Rooms (200 Beds), 100 Students
// ============================================================================

export const hostels = [
  { id: 1, block_name: 'Block A' },
  { id: 2, block_name: 'Block B' },
  { id: 3, block_name: 'Block C' }
];

export const generateRooms = () => {
  const rooms = [];
  let roomId = 1;

  // Single Rooms (Capacity 1) - Exactly 20 rooms (20 beds)
  // Block A (id 1): 7 rooms (S-101 to S-107)
  // Block B (id 2): 7 rooms (S-101 to S-107)
  // Block C (id 3): 6 rooms (S-101 to S-106)
  const singleDist = [
    { hostel_id: 1, count: 7, start: 101 },
    { hostel_id: 2, count: 7, start: 101 },
    { hostel_id: 3, count: 6, start: 101 }
  ];
  for (const dist of singleDist) {
    for (let i = 0; i < dist.count; i++) {
      rooms.push({
        id: roomId++,
        hostel_id: dist.hostel_id,
        room_number: `S-${dist.start + i}`,
        capacity: 1
      });
    }
  }

  // Double Rooms (Capacity 2) - Exactly 30 rooms (60 beds)
  // Block A (id 1): 10 rooms (D-201 to D-210)
  // Block B (id 2): 10 rooms (D-201 to D-210)
  // Block C (id 3): 10 rooms (D-201 to D-210)
  const doubleDist = [
    { hostel_id: 1, count: 10, start: 201 },
    { hostel_id: 2, count: 10, start: 201 },
    { hostel_id: 3, count: 10, start: 201 }
  ];
  for (const dist of doubleDist) {
    for (let i = 0; i < dist.count; i++) {
      rooms.push({
        id: roomId++,
        hostel_id: dist.hostel_id,
        room_number: `D-${dist.start + i}`,
        capacity: 2
      });
    }
  }

  // Quadruple Rooms (Capacity 4) - Exactly 30 rooms (120 beds)
  // Block A (id 1): 10 rooms (Q-301 to Q-310)
  // Block B (id 2): 10 rooms (Q-301 to Q-310)
  // Block C (id 3): 10 rooms (Q-301 to Q-310)
  const quadDist = [
    { hostel_id: 1, count: 10, start: 301 },
    { hostel_id: 2, count: 10, start: 301 },
    { hostel_id: 3, count: 10, start: 301 }
  ];
  for (const dist of quadDist) {
    for (let i = 0; i < dist.count; i++) {
      rooms.push({
        id: roomId++,
        hostel_id: dist.hostel_id,
        room_number: `Q-${dist.start + i}`,
        capacity: 4
      });
    }
  }

  return rooms;
};

const firstNames = [
  'Aarav', 'Aditi', 'Advait', 'Akanksha', 'Amit', 'Ananya', 'Aniket', 'Anushka',
  'Aryan', 'Ayush', 'Bhavya', 'Chetan', 'Devansh', 'Diya', 'Divyansh', 'Gaurav',
  'Ishaan', 'Janvi', 'Kavya', 'Lakshay', 'Manish', 'Navya', 'Nikhil', 'Pooja',
  'Pranav', 'Priya', 'Rahul', 'Rhea', 'Rohan', 'Sakshi', 'Siddharth', 'Sneha',
  'Tanmay', 'Urvi', 'Varun', 'Vedika', 'Yash', 'Zara', 'Abhinav', 'Charu'
];

const lastNames = [
  'Sharma', 'Verma', 'Patel', 'Kapoor', 'Mehta', 'Bhatt', 'Sen', 'Nair',
  'Reddy', 'Singh', 'Chopra', 'Malhotra', 'Gupta', 'Saxena', 'Deshmukh', 'Joshi'
];

export const generateStudents = () => {
  const students = [];
  for (let i = 1; i <= 100; i++) {
    const fn = firstNames[(i * 3 + 7) % firstNames.length];
    const ln = lastNames[(i * 5 + 11) % lastNames.length];
    const regNo = `24BCE${(1000 + i).toString()}`;
    students.push({
      id: i,
      registration_number: regNo,
      full_name: `${fn} ${ln}`,
      merit_rank: i,
      is_eligible: true
    });
  }
  return students;
};
