import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  ListOrdered,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  Lock,
  DoorOpen,
  Send
} from 'lucide-react';

export default function RoomPreferencePicker() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for room browser
  const [selectedBlock, setSelectedBlock] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [appRes, roomsRes] = await Promise.all([
        api.get('/students/me/application'),
        api.get('/rooms')
      ]);

      if (appRes.data.success) {
        setData(appRes.data);
        if (appRes.data.preferences && appRes.data.preferences.length > 0) {
          setSelectedRoomIds(appRes.data.preferences.map(p => p.room_id));
        }
      }

      if (roomsRes.data.success) {
        setRooms(roomsRes.data.rooms);
      }
    } catch (err) {
      console.error('Failed to load preference data:', err);
      setError('Failed to fetch rooms and application details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading room inventory and preferences...</div>;
  }

  const { group, application, batch } = data || {};

  if (!group) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900">Group Required</h3>
        <p className="text-slate-500 text-sm mt-2">
          You must form or join an application group before you can select room preferences.
        </p>
        <Link
          to="/student/group"
          className="mt-6 inline-block px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700"
        >
          Go to Group Formation
        </Link>
      </div>
    );
  }

  const isLocked = application?.status === 'SUBMITTED' || group.is_locked;
  const isLeader = group.calculated_leader_id === user.id;

  // Filter available rooms strictly matching group's target capacity!
  const eligibleRooms = rooms.filter(r => {
    if (r.capacity !== group.target_capacity) return false;
    if (selectedBlock && r.block_id !== parseInt(selectedBlock, 10)) return false;
    return true;
  });

  const handleAddPreference = (roomId) => {
    if (isLocked) return;
    if (selectedRoomIds.includes(roomId)) {
      setError('Room is already in your selected preferences.');
      return;
    }
    if (selectedRoomIds.length >= 5) {
      setError('You can select a maximum of exactly 5 preferences. Remove one first.');
      return;
    }
    setError('');
    setSelectedRoomIds([...selectedRoomIds, roomId]);
  };

  const handleRemovePreference = (index) => {
    if (isLocked) return;
    const updated = selectedRoomIds.filter((_, i) => i !== index);
    setSelectedRoomIds(updated);
  };

  const handleMovePreference = (index, direction) => {
    if (isLocked) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= selectedRoomIds.length) return;

    const updated = [...selectedRoomIds];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setSelectedRoomIds(updated);
  };

  const handleSavePreferences = async () => {
    if (selectedRoomIds.length !== 5) {
      setError('You must select exactly 5 preferences before saving.');
      return;
    }
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await api.put(`/applications/${application.id}/preferences`, {
        room_ids: selectedRoomIds
      });
      if (res.data.success) {
        setSuccess('Five preferences saved successfully in MySQL!');
        loadAll();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitApplication = async () => {
    if (selectedRoomIds.length !== 5) {
      setError('Please select and save exactly 5 preferences before submitting.');
      return;
    }
    if (group.members?.length !== group.target_capacity) {
      setError(`Your group has ${group.members?.length} members, but requires exactly ${group.target_capacity} to submit.`);
      return;
    }
    if (!confirm('Are you sure you want to submit your application? Once submitted, your choices are locked against editing.')) {
      return;
    }

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      // 1. Ensure preferences are saved
      await api.put(`/applications/${application.id}/preferences`, {
        room_ids: selectedRoomIds
      });

      // 2. Submit & Lock
      const res = await api.post(`/applications/${application.id}/submit`);
      if (res.data.success) {
        setSuccess(res.data.message);
        loadAll();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRoomObjects = selectedRoomIds.map(id => rooms.find(r => r.id === id)).filter(Boolean);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Rank Five Room Preferences</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Select and rank exactly five distinct eligible rooms for your group ({group.target_capacity === 1 ? 'Single Rooms' : group.target_capacity === 2 ? 'Double Rooms' : 'Quadruple Rooms'}).
          </p>
        </div>

        {isLocked && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
            <Lock className="w-3.5 h-3.5" /> Locked (Submitted)
          </span>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-sm text-emerald-700">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Ranked Preferences List (5 required) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5 sticky top-24">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <ListOrdered className="w-5 h-5 text-indigo-600" />
              <span>Ranked Choices ({selectedRoomIds.length}/5)</span>
            </h3>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {5 - selectedRoomIds.length} Remaining
            </span>
          </div>

          {selectedRoomIds.length === 0 ? (
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
              No preferences selected yet. Click "+ Add" on eligible rooms on the right.
            </div>
          ) : (
            <div className="space-y-2.5">
              {selectedRoomObjects.map((room, idx) => (
                <div
                  key={room.id}
                  className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 text-sm block">Room {room.room_number}</span>
                      <span className="text-[11px] text-slate-500">{room.block_name} • Floor {room.floor} • Cap {room.capacity}</span>
                    </div>
                  </div>

                  {!isLocked && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMovePreference(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMovePreference(idx, 1)}
                        disabled={idx === selectedRoomIds.length - 1}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePreference(idx)}
                        className="p-1 rounded-lg text-red-400 hover:text-red-700 hover:bg-red-50 ml-1"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {!isLocked && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={saving || selectedRoomIds.length !== 5}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Draft Preferences'}
              </button>

              {isLeader ? (
                <button
                  type="button"
                  onClick={handleSubmitApplication}
                  disabled={submitting || selectedRoomIds.length !== 5}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-100 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Submit & Lock Application'}</span>
                </button>
              ) : (
                <p className="text-[11px] text-amber-600 text-center font-medium">
                  Only the group leader (Rank #{group.leader_rank}) can officially submit the application.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Room Inventory Browser */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Eligible Room Inventory</h3>
              <p className="text-xs text-slate-500">
                Filtered strictly for {group.target_capacity}-person capacity
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedBlock}
                onChange={(e) => setSelectedBlock(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
              >
                <option value="">All Blocks</option>
                <option value="1">Block A (Boys)</option>
                <option value="2">Block B (Girls)</option>
                <option value="3">Block C (Co-ed)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[560px] overflow-y-auto pr-1">
            {eligibleRooms.map((room) => {
              const isSelected = selectedRoomIds.includes(room.id);
              return (
                <div
                  key={room.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <span className="font-black text-slate-900 text-base">Room {room.room_number}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {room.block_name}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Floor {room.floor} • {room.room_type} ({room.capacity} Bed{room.capacity > 1 ? 's' : ''})
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-600">Active Room</span>
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => handleAddPreference(room.id)}
                        disabled={isSelected || selectedRoomIds.length >= 5}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 ${
                          isSelected
                            ? 'bg-indigo-600 text-white cursor-default'
                            : 'bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 disabled:opacity-40'
                        }`}
                      >
                        {isSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        <span>{isSelected ? 'Selected' : 'Add Choice'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

