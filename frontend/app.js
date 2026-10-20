// Hostel Allocation System - Phase 1 Frontend Controller
// Dynamic client-side logic connected strictly to backend REST APIs

const API_BASE = 'http://localhost:5000/api';

// State Cache
let appState = {
  activeTab: 'dashboard',
  hostels: [],
  blocks: [],
  rooms: [],
  students: [],
  dashboardStats: null,
  activeRoomIdForModal: null
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initModals();
  checkDatabaseHealth();
  loadInitialData();

  // Attach refresh button
  document.getElementById('btn-refresh').addEventListener('click', () => {
    showToast('Refreshing live data from MySQL...', 'info');
    loadInitialData();
  });

  // Attach quick allocate button
  document.getElementById('btn-quick-allocate').addEventListener('click', () => {
    openAllocateModal();
  });

  // Attach forms
  document.getElementById('form-allocate').addEventListener('submit', handleAllocateSubmit);
  document.getElementById('form-add-student').addEventListener('submit', handleAddStudentSubmit);
  document.getElementById('form-add-room').addEventListener('submit', handleAddRoomSubmit);

  // Attach filters
  document.getElementById('filter-room-hostel').addEventListener('change', fetchAndRenderRooms);
  document.getElementById('filter-room-status').addEventListener('change', fetchAndRenderRooms);
  document.getElementById('filter-room-type').addEventListener('change', fetchAndRenderRooms);
  document.getElementById('btn-reset-room-filter').addEventListener('click', () => {
    document.getElementById('filter-room-hostel').value = '';
    document.getElementById('filter-room-status').value = '';
    document.getElementById('filter-room-type').value = '';
    fetchAndRenderRooms();
  });

  document.getElementById('search-student-input').addEventListener('input', debounce(fetchAndRenderStudents, 250));
  document.getElementById('filter-student-status').addEventListener('change', fetchAndRenderStudents);
  document.getElementById('filter-student-gender').addEventListener('change', fetchAndRenderStudents);

  // Dynamic filter for allocate modal: update available rooms when student changes
  document.getElementById('alloc-student-select').addEventListener('change', handleAllocStudentChange);

  // Button to save room status in details modal
  document.getElementById('btn-save-room-status').addEventListener('click', handleSaveRoomStatus);

  // Periodic health check every 15 seconds
  setInterval(checkDatabaseHealth, 15000);
});

// --- TAB NAVIGATION ---
function initTabs() {
  const tabs = document.querySelectorAll('.nav-item');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = `tab-${tab.dataset.tab}`;
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');

      appState.activeTab = tab.dataset.tab;
      updateHeaderTitles(tab.dataset.tab);

      // Trigger re-renders or data loads
      if (tab.dataset.tab === 'rooms') fetchAndRenderRooms();
      if (tab.dataset.tab === 'students') fetchAndRenderStudents();
      if (tab.dataset.tab === 'history') fetchAndRenderHistory();
      if (tab.dataset.tab === 'dashboard') fetchAndRenderDashboard();
    });
  });
}

function updateHeaderTitles(tab) {
  const titleMap = {
    dashboard: { title: 'Live Dashboard & Overview', sub: 'Real-time room occupancy and student allocation stats fetched directly from MySQL.' },
    rooms: { title: 'Room Inventory & Bed Status', sub: 'Inspect active bed capacities, occupancy rates, and room availability across all blocks.' },
    students: { title: 'Student Directory & Allocation', sub: 'Manage enrolled scholars, allocation status, and assign available hostel accommodation.' },
    history: { title: 'Audit Trail & Allocation History', sub: 'Complete historical logs of room allocations, room changes, and vacations.' }
  };
  const meta = titleMap[tab] || titleMap.dashboard;
  document.getElementById('page-title').textContent = meta.title;
  document.getElementById('page-subtitle').textContent = meta.sub;
}

// --- DATABASE HEALTH CHECK ---
async function checkDatabaseHealth() {
  const indicator = document.getElementById('db-indicator');
  const text = document.getElementById('db-status-text');
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    if (res.ok && data.status === 'UP') {
      indicator.className = 'status-indicator connected';
      text.textContent = 'MySQL Connected (Active)';
    } else {
      indicator.className = 'status-indicator error';
      text.textContent = 'MySQL Disconnected';
    }
  } catch (err) {
    indicator.className = 'status-indicator error';
    text.textContent = 'Backend Offline';
  }
}

// --- LOAD INITIAL DATA ---
async function loadInitialData() {
  await Promise.all([
    fetchHostelsAndBlocks(),
    fetchAndRenderDashboard(),
    fetchAndRenderRooms(),
    fetchAndRenderStudents()
  ]);
  lucide.createIcons();
}

// --- DASHBOARD API & RENDERING ---
async function fetchAndRenderDashboard() {
  try {
    const res = await fetch(`${API_BASE}/dashboard/stats`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    const { summary, hostelBreakdown, roomTypeBreakdown, recentAllocations } = json.data;
    appState.dashboardStats = summary;

    // 1. KPI Cards
    document.getElementById('stat-hostels').textContent = summary.totalHostels;
    document.getElementById('stat-blocks').textContent = `${summary.totalBlocks} Blocks registered`;

    document.getElementById('stat-rooms').textContent = summary.totalRooms;
    document.getElementById('stat-room-avail').textContent = `${summary.availableRooms} Available, ${summary.fullRooms} Full`;

    document.getElementById('stat-capacity').textContent = summary.totalCapacity;
    document.getElementById('stat-occupied-beds').textContent = `${summary.totalOccupiedBeds} Occupied (${summary.totalAvailableBeds} Free)`;

    document.getElementById('stat-occupancy-rate').textContent = `${summary.occupancyRate}%`;
    document.getElementById('stat-progress-bar').style.width = `${Math.min(100, summary.occupancyRate)}%`;

    // 2. Hostel Breakdown Table
    const hostelTbody = document.getElementById('hostel-breakdown-tbody');
    if (!hostelBreakdown || hostelBreakdown.length === 0) {
      hostelTbody.innerHTML = `<tr><td colspan="8" class="text-center py-4">No hostel records found.</td></tr>`;
    } else {
      hostelTbody.innerHTML = hostelBreakdown.map(h => `
        <tr>
          <td><strong>${escapeHtml(h.name)}</strong></td>
          <td><span class="badge ${getGenderBadgeClass(h.type)}">${h.type}</span></td>
          <td>${h.blockCount}</td>
          <td>${h.roomCount}</td>
          <td><strong>${h.totalCapacity}</strong></td>
          <td><span class="text-danger font-semibold">${h.occupiedBeds}</span></td>
          <td><span class="font-semibold text-emerald">${h.availableBeds}</span></td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <span>${h.occupancyRate}%</span>
              <div class="progress-bar-wrap" style="width: 70px; margin:0;">
                <div class="progress-bar" style="width: ${h.occupancyRate}%"></div>
              </div>
            </div>
          </td>
        </tr>
      `).join('');
    }

    // 3. Room Types
    const roomTypesContainer = document.getElementById('room-types-container');
    if (!roomTypeBreakdown || roomTypeBreakdown.length === 0) {
      roomTypesContainer.innerHTML = `<div class="text-muted text-center py-2">No room type records.</div>`;
    } else {
      roomTypesContainer.innerHTML = roomTypeBreakdown.map(rt => `
        <div class="room-type-item">
          <div>
            <div class="room-type-title">${formatRoomType(rt.roomType)}</div>
            <div class="room-type-badge">${rt.totalRooms} Rooms | ${rt.totalCapacity} Total Beds</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:700; font-size:0.9rem;">${rt.occupiedCount} / ${rt.totalCapacity} Beds</div>
            <div style="font-size:0.75rem; color:#10b981;">${rt.availableBeds} Available</div>
          </div>
        </div>
      `).join('');
    }

    // 4. Recent Allocations
    const recentContainer = document.getElementById('recent-allocations-container');
    if (!recentAllocations || recentAllocations.length === 0) {
      recentContainer.innerHTML = `<div class="text-muted text-center py-2">No active allocations yet.</div>`;
    } else {
      recentContainer.innerHTML = recentAllocations.map(a => `
        <div class="recent-alloc-card">
          <div class="recent-alloc-meta">
            <h4>${escapeHtml(a.student_name)} <span style="font-size:0.78rem; font-weight:normal; color:#64748b;">(${a.registration_number})</span></h4>
            <span>${escapeHtml(a.hostel_name)} &bull; ${escapeHtml(a.block_name)} &bull; Room ${a.room_number}</span>
          </div>
          <div style="text-align: right;">
            <span class="badge ${getGenderBadgeClass(a.gender)}">${a.gender}</span>
            <div style="font-size:0.72rem; color:#94a3b8; margin-top:4px;">${formatDate(a.allocated_date)}</div>
          </div>
        </div>
      `).join('');
    }

    lucide.createIcons();
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    showToast('Failed to fetch dashboard metrics: ' + err.message, 'error');
  }
}

// --- HOSTELS & BLOCKS API ---
async function fetchHostelsAndBlocks() {
  try {
    const [hRes, bRes] = await Promise.all([
      fetch(`${API_BASE}/hostels`),
      fetch(`${API_BASE}/hostels/blocks/all`)
    ]);

    const hJson = await hRes.json();
    const bJson = await bRes.json();

    if (hJson.success) {
      appState.hostels = hJson.data;
      populateHostelFilters(hJson.data);
    }

    if (bJson.success) {
      appState.blocks = bJson.data;
      populateBlockSelect(bJson.data);
    }
  } catch (err) {
    console.error('Error fetching hostels/blocks:', err);
  }
}

function populateHostelFilters(hostels) {
  const roomFilter = document.getElementById('filter-room-hostel');
  roomFilter.innerHTML = '<option value="">All Hostels</option>' +
    hostels.map(h => `<option value="${h.id}">${escapeHtml(h.name)} (${h.type})</option>`).join('');
}

function populateBlockSelect(blocks) {
  const blockSelect = document.getElementById('new-room-block');
  blockSelect.innerHTML = '<option value="">-- Choose Block --</option>' +
    blocks.map(b => `<option value="${b.id}">${escapeHtml(b.hostel_name)} - ${escapeHtml(b.block_name)}</option>`).join('');
}

// --- ROOM INVENTORY API & RENDERING ---
async function fetchAndRenderRooms() {
  const hostelId = document.getElementById('filter-room-hostel').value;
  const status = document.getElementById('filter-room-status').value;
  const roomType = document.getElementById('filter-room-type').value;

  const params = new URLSearchParams();
  if (hostelId) params.append('hostelId', hostelId);
  if (status) params.append('status', status);
  if (roomType) params.append('roomType', roomType);

  const container = document.getElementById('rooms-grid-container');
  container.innerHTML = '<div class="loading-placeholder">Fetching rooms from MySQL...</div>';

  try {
    const res = await fetch(`${API_BASE}/rooms?${params.toString()}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    appState.rooms = json.data;

    if (json.data.length === 0) {
      container.innerHTML = '<div class="card text-center py-4" style="grid-column: 1/-1;">No rooms found matching the selected criteria.</div>';
      return;
    }

    container.innerHTML = json.data.map(room => {
      // Build visual bed slots
      let bedSlotsHtml = '';
      for (let i = 0; i < room.capacity; i++) {
        if (i < room.occupied_count) {
          bedSlotsHtml += `<div class="bed-slot occupied" title="Bed ${i+1}: Occupied">Bed ${i+1} Occupied</div>`;
        } else {
          bedSlotsHtml += `<div class="bed-slot empty" title="Bed ${i+1}: Available">Bed ${i+1} Free</div>`;
        }
      }

      const statusBadge = getRoomStatusBadge(room.status);

      return `
        <div class="room-card">
          <div class="room-card-header">
            <div class="room-title">
              <h4>${escapeHtml(room.room_number)}</h4>
              <span>${escapeHtml(room.hostel_name)} &bull; ${escapeHtml(room.block_name)}</span>
            </div>
            ${statusBadge}
          </div>

          <div class="room-card-body">
            <div class="room-meta-item">
              <span>Type:</span>
              <strong>${formatRoomType(room.room_type)}</strong>
            </div>
            <div class="room-meta-item">
              <span>Floor:</span>
              <strong>Floor ${room.floor}</strong>
            </div>
            <div class="room-meta-item">
              <span>Fee / Sem:</span>
              <strong>₹${Number(room.fee_per_semester).toLocaleString()}</strong>
            </div>
            <div class="room-meta-item">
              <span>Occupancy:</span>
              <strong>${room.occupied_count} of ${room.capacity} Beds</strong>
            </div>

            <div class="bed-slots-visual">
              ${bedSlotsHtml}
            </div>
          </div>

          <div class="room-card-footer">
            <button class="btn btn-secondary btn-sm flex-1" onclick="openRoomDetailsModal(${room.id})">
              <i data-lucide="info"></i> Details
            </button>
            ${room.status === 'AVAILABLE' && room.available_beds > 0 ? `
              <button class="btn btn-primary btn-sm flex-1" onclick="openAllocateModalForRoom(${room.id})">
                <i data-lucide="user-plus"></i> Allocate
              </button>
            ` : `
              <button class="btn btn-outline btn-sm flex-1" disabled style="opacity: 0.5;">
                ${room.status === 'MAINTENANCE' ? 'Maintenance' : 'Full'}
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

    lucide.createIcons();
  } catch (err) {
    console.error('Error fetching rooms:', err);
    container.innerHTML = `<div class="card text-danger py-4" style="grid-column: 1/-1;">Error loading rooms: ${escapeHtml(err.message)}</div>`;
  }
}

// --- STUDENT DIRECTORY API & RENDERING ---
async function fetchAndRenderStudents() {
  const search = document.getElementById('search-student-input').value.trim();
  const status = document.getElementById('filter-student-status').value;
  const gender = document.getElementById('filter-student-gender').value;

  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (status) params.append('status', status);
  if (gender) params.append('gender', gender);

  const tbody = document.getElementById('students-table-tbody');
  tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">Loading students from MySQL...</td></tr>';

  try {
    const res = await fetch(`${API_BASE}/students?${params.toString()}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    appState.students = json.data;

    if (json.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">No student records found.</td></tr>';
      return;
    }

    tbody.innerHTML = json.data.map(student => {
      const isAllocated = student.allocation_status === 'ALLOCATED';
      return `
        <tr>
          <td><code>${escapeHtml(student.registration_number)}</code></td>
          <td>
            <strong>${escapeHtml(student.name)}</strong>
            <div style="font-size:0.75rem; color:#64748b;">${escapeHtml(student.email)}</div>
          </td>
          <td><span class="badge ${getGenderBadgeClass(student.gender)}">${student.gender}</span></td>
          <td>
            <div>${escapeHtml(student.branch)}</div>
            <div style="font-size:0.75rem; color:#64748b;">Year ${student.year_of_study}</div>
          </td>
          <td>
            ${isAllocated ? 
              `<span class="badge badge-full">ALLOCATED</span>` : 
              `<span class="badge badge-available">UNALLOCATED</span>`
            }
          </td>
          <td>
            ${isAllocated ? `
              <div><strong>Room ${escapeHtml(student.room_number)}</strong></div>
              <div style="font-size:0.75rem; color:#64748b;">${escapeHtml(student.hostel_name || '')} (${escapeHtml(student.block_name || '')})</div>
            ` : `<span class="text-muted">&mdash;</span>`}
          </td>
          <td>
            ${isAllocated ? `
              <button class="btn btn-danger btn-sm" onclick="vacateStudent(${student.id}, '${escapeHtml(student.name)}')">
                <i data-lucide="log-out"></i> Vacate
              </button>
            ` : `
              <button class="btn btn-primary btn-sm" onclick="openAllocateModalForStudent(${student.id})">
                <i data-lucide="user-plus"></i> Allocate
              </button>
            `}
          </td>
        </tr>
      `;
    }).join('');

    lucide.createIcons();
  } catch (err) {
    console.error('Error fetching students:', err);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Error loading students: ${escapeHtml(err.message)}</td></tr>`;
  }
}

// --- ALLOCATION LOG HISTORY ---
async function fetchAndRenderHistory() {
  const tbody = document.getElementById('history-table-tbody');
  tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">Loading audit log from MySQL...</td></tr>';

  try {
    const res = await fetch(`${API_BASE}/allocations/history`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    if (json.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4">No allocation history logged.</td></tr>';
      return;
    }

    tbody.innerHTML = json.data.map(item => `
      <tr>
        <td>${formatDate(item.allocated_date)}</td>
        <td>
          <strong>${escapeHtml(item.student_name)}</strong>
          <div style="font-size:0.75rem; color:#64748b;">${item.registration_number} &bull; ${item.student_gender}</div>
        </td>
        <td>${escapeHtml(item.hostel_name)} <br><small class="text-muted">${escapeHtml(item.block_name)}</small></td>
        <td><strong>${escapeHtml(item.room_number)}</strong></td>
        <td>${formatRoomType(item.room_type)}</td>
        <td>
          <span class="badge ${item.status === 'ACTIVE' ? 'badge-available' : 'badge-maintenance'}">${item.status}</span>
        </td>
        <td><small>${escapeHtml(item.remarks || '-')}</small></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading history:', err);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Error: ${escapeHtml(err.message)}</td></tr>`;
  }
}

// --- ALLOCATION ACTIONS ---
async function openAllocateModal(preSelectedStudentId = null, preSelectedRoomId = null) {
  const modal = document.getElementById('modal-allocate');
  const studentSelect = document.getElementById('alloc-student-select');

  // Load unallocated students
  try {
    const res = await fetch(`${API_BASE}/students?status=NOT_ALLOCATED`);
    const json = await res.json();
    const students = json.data || [];

    if (students.length === 0) {
      showToast('All students currently have rooms allocated! Register a new student first.', 'info');
      return;
    }

    studentSelect.innerHTML = '<option value="">-- Choose Unallocated Student --</option>' +
      students.map(s => `<option value="${s.id}" data-gender="${s.gender}">${escapeHtml(s.name)} (${s.registration_number} - ${s.gender} - ${s.branch})</option>`).join('');

    if (preSelectedStudentId) {
      studentSelect.value = preSelectedStudentId;
    }

    await populateCompatibleRooms(studentSelect.value, preSelectedRoomId);
    modal.classList.add('active');
  } catch (err) {
    showToast('Failed to load students for allocation: ' + err.message, 'error');
  }
}

window.openAllocateModalForStudent = function(studentId) {
  openAllocateModal(studentId, null);
};

window.openAllocateModalForRoom = function(roomId) {
  openAllocateModal(null, roomId);
};

async function handleAllocStudentChange() {
  const studentSelect = document.getElementById('alloc-student-select');
  await populateCompatibleRooms(studentSelect.value);
}

async function populateCompatibleRooms(studentId, preSelectedRoomId = null) {
  const roomSelect = document.getElementById('alloc-room-select');
  const hint = document.getElementById('alloc-room-hint');

  if (!studentId) {
    roomSelect.innerHTML = '<option value="">-- Choose Available Room --</option>';
    hint.textContent = 'Select a student to filter compatible rooms by gender and availability';
    return;
  }

  const studentOption = document.querySelector(`#alloc-student-select option[value="${studentId}"]`);
  const gender = studentOption ? studentOption.getAttribute('data-gender') : null;

  try {
    const res = await fetch(`${API_BASE}/rooms?availableOnly=true`);
    const json = await res.json();
    const allAvailableRooms = json.data || [];

    // Filter rooms by gender compatibility
    const compatibleRooms = allAvailableRooms.filter(room => {
      if (room.hostel_type === 'COED') return true;
      if (room.hostel_type === 'BOYS' && gender === 'MALE') return true;
      if (room.hostel_type === 'GIRLS' && gender === 'FEMALE') return true;
      return false;
    });

    if (compatibleRooms.length === 0) {
      roomSelect.innerHTML = '<option value="">-- No Compatible Rooms Available --</option>';
      hint.textContent = `No available rooms found matching gender (${gender})`;
      return;
    }

    roomSelect.innerHTML = '<option value="">-- Choose Available Room --</option>' +
      compatibleRooms.map(r => `
        <option value="${r.id}">
          Room ${escapeHtml(r.room_number)} (${escapeHtml(r.hostel_name)} - ${escapeHtml(r.block_name)}) - ${formatRoomType(r.room_type)} [${r.available_beds} beds free]
        </option>
      `).join('');

    hint.textContent = `Showing ${compatibleRooms.length} compatible room(s) for ${gender} student`;

    if (preSelectedRoomId) {
      roomSelect.value = preSelectedRoomId;
    }
  } catch (err) {
    console.error('Error fetching compatible rooms:', err);
  }
}

async function handleAllocateSubmit(e) {
  e.preventDefault();
  const student_id = document.getElementById('alloc-student-select').value;
  const room_id = document.getElementById('alloc-room-select').value;
  const academic_year = document.getElementById('alloc-academic-year').value;
  const remarks = document.getElementById('alloc-remarks').value;

  if (!student_id || !room_id) {
    showToast('Please select both a student and an available room', 'error');
    return;
  }

  const submitBtn = document.getElementById('btn-submit-allocate');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Allocating in MySQL...';

  try {
    const res = await fetch(`${API_BASE}/allocations/allocate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, room_id, academic_year, remarks })
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Allocation failed');
    }

    showToast(json.message, 'success');
    document.getElementById('modal-allocate').classList.remove('active');
    document.getElementById('form-allocate').reset();

    // Refresh all views
    loadInitialData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm Allocation';
  }
}

// --- VACATE STUDENT ---
window.vacateStudent = async function(studentId, studentName) {
  if (!confirm(`Are you sure you want to vacate ${studentName} from their room? This will free up 1 bed immediately in MySQL.`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/allocations/vacate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, remarks: 'Vacated via management UI' })
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || 'Vacation failed');
    }

    showToast(json.message, 'success');
    loadInitialData();
  } catch (err) {
    showToast('Vacate failed: ' + err.message, 'error');
  }
};

// --- ROOM DETAILS MODAL ---
window.openRoomDetailsModal = async function(roomId) {
  appState.activeRoomIdForModal = roomId;
  const modal = document.getElementById('modal-room-details');
  const title = document.getElementById('modal-room-title');
  const chips = document.getElementById('room-summary-chips');
  const occupantsTbody = document.getElementById('room-occupants-tbody');
  const statusSelect = document.getElementById('modal-change-room-status');

  try {
    const res = await fetch(`${API_BASE}/rooms/${roomId}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);

    const room = json.data;
    title.textContent = `Room ${room.room_number} - Details & Occupants`;

    chips.innerHTML = `
      <div class="chip"><strong>Hostel:</strong> ${escapeHtml(room.hostel_name)} (${room.hostel_type})</div>
      <div class="chip"><strong>Block:</strong> ${escapeHtml(room.block_name)}</div>
      <div class="chip"><strong>Floor:</strong> ${room.floor}</div>
      <div class="chip"><strong>Type:</strong> ${formatRoomType(room.room_type)}</div>
      <div class="chip"><strong>Capacity:</strong> ${room.occupied_count} / ${room.capacity} Beds</div>
      <div class="chip"><strong>Fee:</strong> ₹${Number(room.fee_per_semester).toLocaleString()}</div>
      <div class="chip"><strong>Status:</strong> ${room.status}</div>
    `;

    statusSelect.value = room.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'AVAILABLE';

    if (room.occupants.length === 0) {
      occupantsTbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No students currently allocated to this room.</td></tr>`;
    } else {
      occupantsTbody.innerHTML = room.occupants.map(s => `
        <tr>
          <td><code>${escapeHtml(s.registration_number)}</code></td>
          <td><strong>${escapeHtml(s.name)}</strong></td>
          <td>${s.gender}</td>
          <td>${escapeHtml(s.branch)}</td>
          <td>${formatDate(s.allocated_date)}</td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="vacateFromRoomModal(${s.id}, '${escapeHtml(s.name)}')">
              Vacate
            </button>
          </td>
        </tr>
      `).join('');
    }

    modal.classList.add('active');
  } catch (err) {
    showToast('Failed to load room details: ' + err.message, 'error');
  }
};

window.vacateFromRoomModal = async function(studentId, name) {
  await vacateStudent(studentId, name);
  if (appState.activeRoomIdForModal) {
    openRoomDetailsModal(appState.activeRoomIdForModal);
  }
};

async function handleSaveRoomStatus() {
  const roomId = appState.activeRoomIdForModal;
  const status = document.getElementById('modal-change-room-status').value;

  try {
    const res = await fetch(`${API_BASE}/rooms/${roomId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    showToast('Room status updated successfully in MySQL', 'success');
    document.getElementById('modal-room-details').classList.remove('active');
    loadInitialData();
  } catch (err) {
    showToast('Failed to update room status: ' + err.message, 'error');
  }
}

// --- ADD STUDENT FORM ---
async function handleAddStudentSubmit(e) {
  e.preventDefault();
  const reg = document.getElementById('new-student-reg').value.trim();
  const name = document.getElementById('new-student-name').value.trim();
  const email = document.getElementById('new-student-email').value.trim();
  const phone = document.getElementById('new-student-phone').value.trim();
  const gender = document.getElementById('new-student-gender').value;
  const year = document.getElementById('new-student-year').value;
  const branch = document.getElementById('new-student-branch').value.trim();

  try {
    const res = await fetch(`${API_BASE}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        registration_number: reg,
        name,
        email,
        phone,
        gender,
        year_of_study: parseInt(year, 10),
        branch
      })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    showToast(`Student ${name} registered successfully in MySQL!`, 'success');
    document.getElementById('modal-add-student').classList.remove('active');
    document.getElementById('form-add-student').reset();
    fetchAndRenderStudents();
    fetchAndRenderDashboard();
  } catch (err) {
    showToast('Registration failed: ' + err.message, 'error');
  }
}

// --- ADD ROOM FORM ---
async function handleAddRoomSubmit(e) {
  e.preventDefault();
  const block_id = document.getElementById('new-room-block').value;
  const room_number = document.getElementById('new-room-number').value.trim();
  const floor = document.getElementById('new-room-floor').value;
  const room_type = document.getElementById('new-room-type').value;
  const capacity = document.getElementById('new-room-capacity').value;
  const fee = document.getElementById('new-room-fee').value;

  try {
    const res = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        block_id,
        room_number,
        floor: parseInt(floor, 10),
        room_type,
        capacity: parseInt(capacity, 10),
        fee_per_semester: parseFloat(fee)
      })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message);

    showToast(`Room ${room_number} added successfully in MySQL!`, 'success');
    document.getElementById('modal-add-room').classList.remove('active');
    document.getElementById('form-add-room').reset();
    fetchAndRenderRooms();
    fetchAndRenderDashboard();
  } catch (err) {
    showToast('Add room failed: ' + err.message, 'error');
  }
}

// --- MODAL UTILITIES ---
function initModals() {
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = btn.getAttribute('data-close');
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.remove('active');
    });
  });

  // Open modals via action buttons
  document.getElementById('btn-open-add-student-modal').addEventListener('click', () => {
    document.getElementById('modal-add-student').classList.add('active');
  });

  document.getElementById('btn-open-add-room-modal').addEventListener('click', () => {
    document.getElementById('modal-add-room').classList.add('active');
  });
}

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --- HELPERS ---
function formatRoomType(type) {
  if (!type) return '';
  return type.replace(/_/g, ' ');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getGenderBadgeClass(gender) {
  if (gender === 'BOYS' || gender === 'MALE') return 'badge-boys';
  if (gender === 'GIRLS' || gender === 'FEMALE') return 'badge-girls';
  return 'badge-coed';
}

function getRoomStatusBadge(status) {
  if (status === 'AVAILABLE') return '<span class="badge badge-available">AVAILABLE</span>';
  if (status === 'FULL') return '<span class="badge badge-full">FULL</span>';
  return '<span class="badge badge-maintenance">MAINTENANCE</span>';
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

