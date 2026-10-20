import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  UserPlus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Lock,
  DoorOpen
} from 'lucide-react';

export default function GroupManagement() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [targetCapacity, setTargetCapacity] = useState('1');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadGroupData();
  }, []);

  const loadGroupData = async () => {
    try {
      const res = await api.get('/students/me/application');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load group:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await api.post('/groups', { target_capacity: parseInt(targetCapacity, 10) });
      if (res.data.success) {
        setSuccess(`Group created successfully with code: ${res.data.group.group_code}`);
        loadGroupData();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await api.post('/groups/join', { group_code: joinCode.trim() });
      if (res.data.success) {
        setSuccess(res.data.message);
        setJoinCode('');
        loadGroupData();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to join group');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading group details...</div>;
  }

  const { group, batch } = data || {};

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Group Formation & Membership</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Form or join an application group. The group leader is automatically calculated from the member with the best merit rank.
        </p>
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

      {/* If Student Already in a Group */}
      {group ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Group Identification</span>
                {group.is_locked && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                    <Lock className="w-3 h-3" /> Application Locked
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">{group.group_code}</h3>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-500 block uppercase">Target Room Capacity</span>
                <span className="text-sm font-extrabold text-indigo-600">
                  {group.target_capacity === 1 ? 'Single Room (Capacity 1)' :
                   group.target_capacity === 2 ? 'Double Room (Capacity 2)' : 'Quadruple Room (Capacity 4)'}
                </span>
              </div>
            </div>
          </div>

          {/* Members List */}
          <div>
            <h4 className="font-bold text-slate-900 mb-3 flex items-center justify-between">
              <span>Group Scholars ({group.members?.length} of {group.target_capacity} members)</span>
              {group.members?.length === group.target_capacity ? (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Group Complete
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Needs {group.target_capacity - group.members?.length} more scholar(s)
                </span>
              )}
            </h4>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              {group.members?.map((m) => {
                const isLeader = m.id === group.calculated_leader_id;
                return (
                  <div key={m.id} className="p-4 flex items-center justify-between bg-white hover:bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isLeader ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        #{m.merit_rank}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{m.full_name}</span>
                          {isLeader && (
                            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full uppercase">
                              Calculated Leader
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 block font-mono">{m.registration_number} • {m.academic_branch}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-600">Merit Rank #{m.merit_rank}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!group.is_locked && group.members?.length < group.target_capacity && (
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-xs text-indigo-900 flex items-center justify-between">
              <div>
                <strong>Share your Group Code:</strong> Other scholars can join using code <span className="font-mono font-bold">{group.group_code}</span>.
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(group.group_code);
                  alert('Group code copied to clipboard!');
                }}
                className="px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-indigo-700 font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Code
              </button>
            </div>
          )}
        </div>
      ) : (
        /* If Student Has No Group Yet */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Option A: Create New Group */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Create New Group</h3>
            <p className="text-xs text-slate-500 mt-1">
              Start an application group. Select the target room capacity and share your code with roommates.
            </p>

            <form onSubmit={handleCreateGroup} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Target Room Capacity
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: '1', title: 'Single', desc: '1 Bed' },
                    { val: '2', title: 'Double', desc: '2 Beds' },
                    { val: '4', title: 'Quad', desc: '4 Beds' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setTargetCapacity(opt.val)}
                      className={`p-3 rounded-2xl border text-center transition-all ${
                        targetCapacity === opt.val
                          ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-sm'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="font-bold text-sm block">{opt.title}</span>
                      <span className="text-[11px] text-slate-500">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-100 transition-all disabled:opacity-50 mt-4"
              >
                <UserPlus className="w-4 h-4" />
                <span>{submitting ? 'Creating Group...' : 'Create Application Group'}</span>
              </button>
            </form>
          </div>

          {/* Option B: Join Existing Group */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Join Existing Group</h3>
            <p className="text-xs text-slate-500 mt-1">
              Have a roommate who already created a group? Enter their group code to join them.
            </p>

            <form onSubmit={handleJoinGroup} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">
                  Group Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. GRP-A1B2C3"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white uppercase tracking-wider"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !joinCode.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-100 transition-all disabled:opacity-50 mt-4"
              >
                <span>{submitting ? 'Joining...' : 'Join Group'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

