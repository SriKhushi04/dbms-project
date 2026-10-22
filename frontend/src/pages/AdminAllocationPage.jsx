import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  ShieldCheck,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Users,
  Building2,
  ListOrdered,
  Sparkles,
  ArrowRight,
  UserCheck,
  Home
} from 'lucide-react';

export default function AdminAllocationPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [summaryMessage, setSummaryMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/admin/applications');
      if (res.data.success) {
        setApplications(res.data.applications);
        setError('');
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
      const serverMsg = err.response?.data?.message || err.message;
      setError(`Failed to fetch applications from MySQL: ${serverMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocate = async () => {
    setError('');
    setSummaryMessage('');
    setAllocating(true);

    try {
      const res = await axios.post('/api/admin/allocate');
      if (res.data.success) {
        const sum = res.data.summary;
        setSummaryMessage(
          `Allocation Completed! Allocated: ${sum.allocatedGroups} group(s) (${sum.allocatedStudents} students) across ${sum.roomsAssigned} room(s). Unallocated: ${sum.unallocatedGroups} group(s).`
        );
        // Refresh live data strictly from MySQL
        await loadApplications();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Allocation failed to execute.');
    } finally {
      setAllocating(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset allocations to demo state? This will clear active allocations so you can test room allocation again.')) {
      return;
    }

    setError('');
    setSummaryMessage('');
    setResetting(true);

    try {
      const res = await axios.post('/api/admin/reset-allocations');
      if (res.data.success) {
        setSummaryMessage('Allocations reset to initial demo state (Student 24BCE1001 allocated to S-101; all others pending).');
        await loadApplications();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset allocations.');
    } finally {
      setResetting(false);
    }
  };

  const totalGroups = applications.length;
  const allocatedCount = applications.filter(a => a.status === 'ALLOCATED').length;
  const unallocatedCount = applications.filter(a => a.status === 'UNALLOCATED' || a.status === 'WAITLISTED').length;
  const pendingCount = applications.filter(a => a.status === 'SUBMITTED').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      {/* Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none text-white">HostelHub Admin</h1>
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Room Allocation Console</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              aria-label="Go to HostelHub Home"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
            <Link
              to="/allocation/login"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <span>Student Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 pt-8 space-y-6">
        {/* Action & Metric Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-bold text-slate-400 uppercase block">Total Groups</span>
              <span className="text-xl font-black text-slate-800">{totalGroups}</span>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[11px] font-bold text-emerald-600 uppercase block">Allocated</span>
              <span className="text-xl font-black text-emerald-800">{allocatedCount}</span>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <span className="text-[11px] font-bold text-amber-600 uppercase block">Pending (Round Ready)</span>
              <span className="text-xl font-black text-amber-800">{pendingCount}</span>
            </div>
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
              <span className="text-[11px] font-bold text-orange-600 uppercase block">Needs Resubmission</span>
              <span className="text-xl font-black text-orange-800">{unallocatedCount}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              disabled={resetting || allocating}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              title="Reset allocations for testing"
              aria-label="Reset room allocations to demo state"
            >
              <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
              <span>Reset</span>
            </button>

            {/* MANDATORY EXACT BUTTON: "Allocate Rooms" */}
            <button
              onClick={handleAllocate}
              disabled={allocating || resetting}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-100 flex items-center gap-2 transition-all disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              aria-label="Allocate rooms to submitted groups"
            >
              <Play className={`w-4 h-4 fill-current ${allocating ? 'animate-pulse' : ''}`} />
              <span>{allocating ? 'Processing Allocation...' : 'Allocate Rooms'}</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {summaryMessage && (
          <div
            role="status"
            aria-live="polite"
            className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-xs text-emerald-800 shadow-sm"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <span className="font-semibold">{summaryMessage}</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            aria-live="assertive"
            className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-xs text-red-800 shadow-sm"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Applications List */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Submitted Applications Roster</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Processed in ascending order of best member merit rank (lowest numerical rank first).
              </p>
            </div>
            <button
              onClick={loadApplications}
              className="text-xs text-indigo-600 font-bold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1"
              aria-label="Refresh applications roster from database"
            >
              Refresh Table
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              Loading applications from MySQL...
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-600 text-sm font-semibold">
              {error}
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No submitted applications found in the database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Priority / Best Rank</th>
                    <th className="py-3 px-4">Primary Applicant</th>
                    <th className="py-3 px-4">Group Members</th>
                    <th className="py-3 px-4">Block & Type</th>
                    <th className="py-3 px-4">5 Room Preferences</th>
                    <th className="py-3 px-4">Allocation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {applications.map((app) => (
                    <tr key={app.group_id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Priority (Best Rank) */}
                      <td className="py-3.5 px-4 font-mono">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-black rounded-lg border border-indigo-200 text-xs">
                          Rank #{app.best_rank}
                        </span>
                      </td>

                      {/* Primary Applicant */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{app.primary_student?.full_name}</span>
                        <span className="font-mono text-slate-500 text-[11px]">
                          {app.primary_student?.registration_number} (Rank #{app.primary_student?.merit_rank})
                        </span>
                      </td>

                      {/* Roommates / Members */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {app.members.map((m) => (
                            <div key={m.registration_number} className="text-[11px] flex items-center gap-1.5">
                              <span className="font-semibold text-slate-800">{m.full_name}</span>
                              <span className="font-mono text-slate-400 text-[10px]">({m.registration_number})</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Block & Capacity */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 block">{app.block_name}</span>
                        <span className="text-[11px] text-slate-500">{app.capacity}-Bedded Room</span>
                      </td>

                      {/* 5 Preferences */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {app.preferences.map((p) => (
                            <span
                              key={p.preference_rank}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                app.allocated_room?.room_number === p.room_number
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                              title={`Pref ${p.preference_rank}: Room ${p.room_number}`}
                            >
                              {p.preference_rank}: {p.room_number}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Allocation Status (Green if allocated, Red/Amber if unallocated) */}
                      <td className="py-3.5 px-4">
                        {app.status === 'ALLOCATED' ? (
                          <div className="p-2 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800">
                            <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>ALLOCATED</span>
                            </div>
                            <span className="text-[11px] font-mono font-black text-emerald-700 block mt-0.5">
                              Room {app.allocated_room?.room_number} ({app.block_name})
                            </span>
                          </div>
                        ) : app.status === 'UNALLOCATED' || app.status === 'WAITLISTED' ? (
                          <div className="p-2 bg-orange-50 border border-orange-300 rounded-xl text-orange-900">
                            <span className="font-bold text-xs text-orange-800 block">NEEDS RESUBMISSION</span>
                            <span className="text-[10px] text-orange-700 block mt-0.5 max-w-xs leading-tight">
                              All preferred rooms were unavailable. Awaiting student to resubmit preferences from remaining vacant rooms.
                            </span>
                          </div>
                        ) : (
                          <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-800">
                            <span className="font-bold text-xs text-indigo-700 block">PENDING</span>
                            <span className="text-[10px] text-indigo-600 block mt-0.5">
                              Ready for allocation round
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

