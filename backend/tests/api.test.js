const http = require('http');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE_URL = `http://localhost:${process.env.PORT || 5000}`;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  FAIL: ${testName}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log(' Starting Phase 1: Hostel Allocation System API Tests');
  console.log(' Target:', BASE_URL);
  console.log('====================================================\n');

  try {
    // 1. Health check
    console.log('[Test Suite 1: Health & DB Connection]');
    const healthRes = await request('GET', '/api/health');
    assert(healthRes.status === 200, 'Health endpoint returns HTTP 200');
    assert(healthRes.body.status === 'UP', 'Status is UP');
    assert(healthRes.body.database === 'Connected to MySQL', 'Database connection verified');

    // 2. Dynamic Dashboard Stats from MySQL
    console.log('\n[Test Suite 2: Real-time MySQL Dashboard Counts]');
    const dashRes = await request('GET', '/api/dashboard/stats');
    assert(dashRes.status === 200, 'Dashboard endpoint returns HTTP 200');
    assert(dashRes.body.success === true, 'Response marked successful');

    const summary = dashRes.body.data.summary;
    assert(Number(summary.totalHostels) > 0, `Total hostels count is dynamic from DB (${summary.totalHostels})`);
    assert(Number(summary.totalRooms) > 0, `Total rooms count is dynamic from DB (${summary.totalRooms})`);
    assert(Number(summary.totalCapacity) > 0, `Total capacity count is dynamic from DB (${summary.totalCapacity})`);
    assert(Number(summary.totalCapacity) === (Number(summary.totalOccupiedBeds) + Number(summary.totalAvailableBeds)), 
      `Capacity invariant holds: totalCapacity (${summary.totalCapacity}) == occupied (${summary.totalOccupiedBeds}) + available (${summary.totalAvailableBeds})`);
    assert(Array.isArray(dashRes.body.data.hostelBreakdown), 'Hostel breakdown list returned');
    assert(dashRes.body.data.hostelBreakdown.length > 0, 'Hostel breakdown contains records');

    // 3. Room Inventory API
    console.log('\n[Test Suite 3: Room Inventory & Queries]');
    const roomsRes = await request('GET', '/api/rooms');
    assert(roomsRes.status === 200, 'Rooms endpoint returns HTTP 200');
    assert(Array.isArray(roomsRes.body.data), 'Rooms list is an array');
    assert(roomsRes.body.data.length > 0, `Found ${roomsRes.body.data.length} rooms in DB`);

    const sampleRoom = roomsRes.body.data[0];
    assert(sampleRoom.room_number !== undefined, 'Room record contains room_number');
    assert(sampleRoom.hostel_name !== undefined, 'Room record joins and contains hostel_name');

    // Filter available only
    const availRoomsRes = await request('GET', '/api/rooms?availableOnly=true');
    assert(availRoomsRes.status === 200, 'Filter availableOnly returns HTTP 200');
    const allAvailable = availRoomsRes.body.data.every(r => r.status === 'AVAILABLE' && r.available_beds > 0);
    assert(allAvailable, 'All returned rooms have status AVAILABLE and available_beds > 0');

    // 4. Students Directory
    console.log('\n[Test Suite 4: Student Directory & Status Filter]');
    const studentsRes = await request('GET', '/api/students');
    assert(studentsRes.status === 200, 'Students endpoint returns HTTP 200');
    assert(Array.isArray(studentsRes.body.data), 'Students list returned');

    const unallocatedRes = await request('GET', '/api/students?status=NOT_ALLOCATED');
    assert(unallocatedRes.status === 200, 'Unallocated filter returns HTTP 200');
    assert(unallocatedRes.body.data.length > 0, `Found ${unallocatedRes.body.data.length} unallocated students`);

    // 5. Allocation Transaction Workflow
    console.log('\n[Test Suite 5: Allocation Transaction & Safety Invariants]');
    // Find an unallocated male student
    const unallocatedMale = unallocatedRes.body.data.find(s => s.gender === 'MALE');
    assert(unallocatedMale !== undefined, `Found test student: ${unallocatedMale ? unallocatedMale.name : 'None'}`);

    // Find an available room in a boys hostel
    const targetRoom = availRoomsRes.body.data.find(r => r.hostel_type === 'BOYS' && r.available_beds > 0);
    assert(targetRoom !== undefined, `Found target room: ${targetRoom ? targetRoom.room_number : 'None'}`);

    // Test gender mismatch prevention (Attempting to allocate male to girls hostel)
    const girlsRoom = availRoomsRes.body.data.find(r => r.hostel_type === 'GIRLS' && r.available_beds > 0);
    if (girlsRoom) {
      const genderMismatchRes = await request('POST', '/api/allocations/allocate', {
        student_id: unallocatedMale.id,
        room_id: girlsRoom.id
      });
      assert(genderMismatchRes.status === 400, 'Gender mismatch correctly rejected with HTTP 400');
    }

    // Allocate unallocatedMale to targetRoom
    const initialOccupied = targetRoom.occupied_count;
    const allocRes = await request('POST', '/api/allocations/allocate', {
      student_id: unallocatedMale.id,
      room_id: targetRoom.id,
      remarks: 'Automated Test Allocation'
    });
    assert(allocRes.status === 201, `Student allocated successfully (HTTP 201)`);

    // Check room capacity updated
    const updatedRoomRes = await request('GET', `/api/rooms/${targetRoom.id}`);
    assert(updatedRoomRes.body.data.occupied_count === initialOccupied + 1, 
      `Room occupied_count correctly incremented from ${initialOccupied} to ${updatedRoomRes.body.data.occupied_count}`);

    // Check student status updated to ALLOCATED
    const updatedStudentRes = await request('GET', `/api/students/${unallocatedMale.id}`);
    assert(updatedStudentRes.body.data.allocation_status === 'ALLOCATED', 'Student allocation_status is now ALLOCATED');
    assert(updatedStudentRes.body.data.current_room_id === targetRoom.id, 'Student current_room_id points to allocated room');

    // Attempt double allocation of same student should fail
    const doubleAllocRes = await request('POST', '/api/allocations/allocate', {
      student_id: unallocatedMale.id,
      room_id: targetRoom.id
    });
    assert(doubleAllocRes.status === 400, 'Double allocation rejected with HTTP 400');

    // 6. Vacation Workflow
    console.log('\n[Test Suite 6: Vacation Transaction & Room Restoration]');
    const vacateRes = await request('POST', '/api/allocations/vacate', {
      student_id: unallocatedMale.id,
      remarks: 'Automated Test Vacation'
    });
    assert(vacateRes.status === 200, 'Student vacated successfully (HTTP 200)');

    const restoredRoomRes = await request('GET', `/api/rooms/${targetRoom.id}`);
    assert(restoredRoomRes.body.data.occupied_count === initialOccupied, 
      `Room occupied_count correctly restored back to ${restoredRoomRes.body.data.occupied_count}`);

    const restoredStudentRes = await request('GET', `/api/students/${unallocatedMale.id}`);
    assert(restoredStudentRes.body.data.allocation_status === 'NOT_ALLOCATED', 'Student allocation_status restored to NOT_ALLOCATED');
    assert(restoredStudentRes.body.data.current_room_id === null, 'Student current_room_id cleared to NULL');

    console.log('\n====================================================');
    console.log(` Test Results: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('====================================================');

    if (failedTests > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  }
}

runTests();

