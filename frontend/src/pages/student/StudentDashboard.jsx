import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  CheckCircle2,
  Building2,
  LogOut,
  Users,
  ListOrdered,
  AlertCircle,
  Clock,
  Sparkles,
  Edit3
} from 'lucide-react';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Allocation status
  const [allocation, setAllocation] = useState(null);

  // Form states (Case 2)
  const [hostels, setHostels] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState('');
  const [selectedCapacity, setSelectedCapacity] = useState('1');
  const [roommates, setRoommates] = useState([]);
  const [preferences, setPreferences] = useState(['', '', '', '', '']);

  // Available rooms for selected block + capacity
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Existing submitted preferences (if already saved)
  const [savedData, setSavedData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form messaging
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 1. Initial Load: Check session & fetch data
  useEffect(() => {
    const savedStudentStr = localStorage.getItem('hostelhub_student');
    if (!savedStudentStr) {
      navigate('/login');
      return;
    }
    const currentStudent = JSON.parse(savedStudentStr);
    setStudent(currentStudent);

    loadDashboard(currentStudent.registration_number);
  }, []);

  const loadDashboard = async (regNo) => {
    setLoading(true);
    try {
      // 1. Check allocation status from MySQL
      const allocRes = await axios.get(`/api/students/${regNo}/allocation`);
      if (allocRes.data.isAllocated) {
        setAllocation(allocRes.data);
      } else {
        setAllocation(null);

        // 2. Fetch available blocks from MySQL
        const hostelsRes = await axios.get('/api/hostels');
        if (hostelsRes.data.success) {
          setHostels(hostelsRes.data.hostels);
          if (hostelsRes.data.hostels.length > 0) {
            setSelectedBlock(hostelsRes.data.hostels[0].block_name);
          }
        }

        // 3. Fetch existing submitted preferences from MySQL if any
        const prefsRes = await axios.get(`/api/students/${regNo}/preferences`);
        if (prefsRes.data.hasSubmitted) {
          setSavedData(prefsRes.data);
          setIsEditing(false);
        } else {
          setSavedData(null);
          setIsEditing(true);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      setError('Failed to fetch data from the database.');
    } finally {
      setLoading(false);
    }
  };

  // 2. When Block or Capacity changes, reload available rooms and reset preferences
  useEffect(() => {
    if (!allocation && selectedBlock && selectedCapacity && isEditing) {
      fetchRooms(selectedBlock, selectedCapacity);
      // Reset roommate input slots according to capacity
      const requiredRoommates = parseInt(selectedCapacity, 10) - 1;
      setRoommates(new Array(requiredRoommates).fill(''));
      setPreferences(['', '', '', '', '']);
    }
  }, [selectedBlock, selectedCapacity, allocation, isEditing]);

  const fetchRooms = async (block, capacity) => {
    setLoadingRooms(true);
    try {
      const res = await axios.get(`/api/rooms/available?block=${encodeURIComponent(block)}&capacity=${capacity}`);
      if (res.data.success) {
        setAvailableRooms(res.data.rooms);
      }
    } catch (err) {
      console.error('Failed to fetch available rooms:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hostelhub_student');
    navigate('/login');
  };

  const handleRoommateChange = (index, value) => {
    const updated = [...roommates];
    updated[index] = value.toUpperCase();
    setRoommates(updated);
  };

  const handlePreferenceChange = (prefIndex, roomId) => {
    const updated = [...preferences];
    updated[prefIndex] = roomId;
    setPreferences(updated);
  };

  // 3. Submit Preferences
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Check all 5 preferences selected
    const chosenRoomIds = preferences.filter(Boolean);
    if (chosenRoomIds.length !== 5) {
      setError('Please select all five (5) distinct room preferences.');
      return;
    }

    // Check distinct rooms
    const distinctRooms = new Set(chosenRoomIds);
    if (distinctRooms.size !== 5) {
      setError('All five preferences must be distinct rooms.');
      return;
    }

    // Check roommates based on capacity
    const requiredRoommates = parseInt(selectedCapacity, 10) - 1;
    const cleanRoommates = roommates.map(r => r.trim().toUpperCase()).filter(Boolean);

    if (cleanRoommates.length !== requiredRoommates) {
      setError(`For a ${selectedCapacity}-bedded room, please enter exactly ${requiredRoommates} roommate registration number(s).`);
      return;
    }

    if (cleanRoommates.includes(student.registration_number)) {
      setError('You cannot enter your own registration number as a roommate.');
      return;
    }

    const uniqueRoommates = new Set(cleanRoommates);
    if (uniqueRoommates.size !== cleanRoommates.length) {
      setError('Duplicate roommate registration numbers are not allowed.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(`/api/students/${student.registration_number}/preferences`, {
        block: selectedBlock,
        capacity: parseInt(selectedCapacity, 10),
        roommates: cleanRoommates,
        preferences: chosenRoomIds.map(id => parseInt(id, 10))
      });

      if (res.data.success) {
        setSuccess('Preferences and roommate details saved successfully to MySQL!');
        // Reload dashboard to show saved state
        await loadDashboard(student.registration_number);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit preferences. Please check your inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium">
        Loading hostel dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">HostelHub</h1>
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Student Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right text-xs">
              <span className="font-bold text-slate-900 block">{student?.full_name}</span>
              <span className="text-slate-500 font-mono">
                {student?.registration_number} • Merit Rank #{student?.merit_rank}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* ================================================================= */}
        {/* CASE 1: STUDENT ALREADY ALLOCATED A ROOM                          */}
        {/* ================================================================= */}
        {allocation ? (
          <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-8 text-center shadow-sm">
            <div className="w-14 h-14 bg-emerald-600 rounded-full flex items-center justify-center text-white mx-auto mb-4 shadow-md shadow-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            {/* MANDATORY EXACT TEXT */}
            <h2 className="text-2xl md:text-3xl font-black text-emerald-900 tracking-tight">
              You have been allocated ROOM NO - {allocation.room_number}
            </h2>

            <p className="text-sm font-semibold text-emerald-700 mt-2">
              {allocation.block_name} • {allocation.capacity}-Bedded Room
            </p>

            <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-emerald-100/80 text-emerald-800 rounded-full text-xs font-bold">
              <span>Officially Assigned in University Database</span>
            </div>
          </div>
        ) : (
          /* ================================================================= */
          /* CASE 2: STUDENT NOT ALLOCATED A ROOM                              */
          /* ================================================================= */
          <div className="space-y-6">
            {/* If preferences already submitted and not currently editing */}
            {savedData && !isEditing ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span>Preferences Submitted & Saved in MySQL</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setSelectedBlock(savedData.block_name);
                      setSelectedCapacity(savedData.capacity.toString());
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Choices</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block">Hostel Block:</span>
                    <span className="text-sm font-bold text-slate-800">{savedData.block_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Room Type:</span>
                    <span className="text-sm font-bold text-slate-800">{savedData.capacity}-Bedded Room</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Application Status:</span>
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                      {savedData.status}
                    </span>
                  </div>
                </div>

                {savedData.roommates?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 text-xs">
                    <span className="text-slate-400 font-semibold block mb-1">Registered Roommates:</span>
                    <div className="flex flex-wrap gap-2">
                      {savedData.roommates.map(rm => (
                        <span key={rm} className="px-2.5 py-1 bg-slate-100 text-slate-700 font-mono font-bold rounded-md">
                          {rm}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5 pt-4 border-t border-slate-100">
                  <span className="text-slate-400 font-semibold text-xs block mb-2">5 Ranked Preferences:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    {savedData.preferences.map(p => (
                      <div key={p.preference_rank} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Choice #{p.preference_rank}</span>
                        <span className="text-base font-black text-indigo-700 block mt-0.5">{p.room_number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* THE PREFERENCE SELECTION FORM */
              <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Select Room Preferences</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Select your preferred hostel block, bed capacity, roommates, and rank five eligible rooms.
                  </p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-xs text-red-700">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-700">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
                    <span>{success}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Step 1: Block & Capacity Dropdowns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        1. Hostel Block
                      </label>
                      <select
                        value={selectedBlock}
                        onChange={(e) => setSelectedBlock(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      >
                        {hostels.map(h => (
                          <option key={h.id} value={h.block_name}>
                            {h.block_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        2. Room Capacity
                      </label>
                      <select
                        value={selectedCapacity}
                        onChange={(e) => setSelectedCapacity(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                      >
                        <option value="1">1 Bed (Single Room)</option>
                        <option value="2">2 Beds (Double Room)</option>
                        <option value="4">4 Beds (Quadruple Room)</option>
                      </select>
                    </div>
                  </div>

                  {/* Step 2: Roommate Registration Numbers */}
                  <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>Roommate Registration Numbers</span>
                    </div>

                    {selectedCapacity === '1' && (
                      <p className="text-xs text-slate-500 italic">
                        Single occupancy room selected — no roommates required (you are the sole occupant).
                      </p>
                    )}

                    {selectedCapacity === '2' && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                          Roommate 1 Registration Number (You are occupant 1):
                        </label>
                        <input
                          type="text"
                          value={roommates[0] || ''}
                          onChange={(e) => handleRoommateChange(0, e.target.value)}
                          placeholder="e.g. 24BCE1003"
                          className="w-full sm:w-64 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}

                    {selectedCapacity === '4' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[0, 1, 2].map((idx) => (
                          <div key={idx}>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Roommate {idx + 1} Registration No:
                            </label>
                            <input
                              type="text"
                              value={roommates[idx] || ''}
                              onChange={(e) => handleRoommateChange(idx, e.target.value)}
                              placeholder={`e.g. 24BCE100${idx + 3}`}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Step 3: Five Room Preferences (Mutual Exclusion) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <ListOrdered className="w-4 h-4 text-indigo-600" />
                        <span>Rank Exactly 5 Room Preferences ({selectedBlock} • {selectedCapacity}-Bed)</span>
                      </label>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {loadingRooms ? 'Loading rooms...' : `${availableRooms.length} available rooms in MySQL`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {[0, 1, 2, 3, 4].map((prefIdx) => {
                        const currentChoice = preferences[prefIdx];

                        // CRITICAL REQUIREMENT:
                        // Each room can appear in at most one preference dropdown.
                        // Filter out rooms selected in other dropdowns, while keeping current selection visible!
                        const otherSelectedRoomIds = preferences.filter((id, idx) => idx !== prefIdx && id !== '');
                        const eligibleOptions = availableRooms.filter(
                          r => !otherSelectedRoomIds.includes(r.id.toString())
                        );

                        return (
                          <div key={prefIdx} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            <span className="w-24 text-xs font-bold text-slate-500 pl-2">
                              Preference {prefIdx + 1}:
                            </span>
                            <select
                              value={currentChoice}
                              onChange={(e) => handlePreferenceChange(prefIdx, e.target.value)}
                              className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="">-- Choose a room --</option>
                              {eligibleOptions.map(r => (
                                <option key={r.id} value={r.id.toString()}>
                                  Room {r.room_number} ({r.block_name} • {r.capacity} Bed)
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    {savedData && isEditing && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-100 transition-all disabled:opacity-50"
                    >
                      {submitting ? 'Saving to Database...' : 'Submit Preferences'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
