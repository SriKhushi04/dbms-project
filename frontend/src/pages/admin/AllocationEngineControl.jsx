import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  PlayCircle,
  Lock,
  Globe,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Award,
  Users,
  DoorOpen,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function AllocationEngineControl() {
  const [dashboardData, setDashboardData] = useState(null);
  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const dashRes = await api.get('/admin/dashboard');
      if (dashRes.data.success) {
        setDashboardData(dashRes.data.data);
        const batch = dashRes.data.data.activeBatch;
        if (batch) {
          const resRes = await api.get(`/admin/batches/${batch.id}/allocation-results`);
          if (resRes.data.success) {
            setResultsData(resRes.data);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load allocation control center:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSubmissions = async () => {
    const batchId = dashboardData?.activeBatch?.id;
    if (!confirm('Are you sure you want to CLOSE submissions? Students will no longer be able to modify groups or preferences.')) return;

    setError('');
    setMessage('');
    setActionLoading(true);
    try {
      const res = await api.post(`/admin/batches/${batchId}/close`);
      setMessage(res.data.message);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerAllocation = async () => {
    const batchId = dashboardData?.activeBatch?.id;
    if (!confirm('Trigger Merit-Based Room Allocation now? The system will sort all groups by leader rank and atomically allocate preferred rooms in a database transaction.')) return;

    setError('');
    setMessage('');
    setActionLoading(true);
    try {
      const res = await api.post(`/admin/batches/${batchId}/allocate`);
      setMessage(`Allocation completed! Allocated ${res.data.summary?.totalAllocatedGroups} groups (${res.data.summary?.totalAllocatedStudents} scholars). ${res.data.summary?.totalWaitlistedGroups} waitlisted.`);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishResults = async () => {
    const batchId = dashboardData?.activeBatch?.id;
    if (!confirm('Publish results to students now? Students will be able to see their room assignments immediately.')) return;

    setError('');
    setMessage('');
    setActionLoading(true);
    try {
      const res = await api.post(`/admin/batches/${batchId}/publish`);
      setMessage(res.data.message);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleVacateRooms = async () => {
    const batchId = dashboardData?.activeBatch?.id;
    if (!confirm('Mark batch as VACATED? All active room reservations will be marked VACATED, preserving complete audit history and freeing rooms for a subsequent batch.')) return;

    setError('');
    setMessage('');
    setActionLoading(true);
    try {
      const res = await api.post(`/admin/batches/${batchId}/mark-vacated`);
      setMessage(res.data.message);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading allocation control center...</div>;
  }

  const batch = dashboardData?.activeBatch;
  const run = resultsData?.run;
  const allocations = resultsData?.allocations || [];
  const unallocated = resultsData?.unallocated || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Merit Allocation Engine Console</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Execute deterministic, transaction-safe university hostel room allocation.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-sm text-emerald-700">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />
          <span>{message}</span>
        </div>
      )}

      {/* Visual Batch Lifecycle Stepper */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Batch Allocation Lifecycle ({batch?.batch_name || 'FALL-2026'})
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { step: '1', name: 'OPEN', label: 'Submissions Active', active: batch?.status === 'OPEN' },
            { step: '2', name: 'CLOSED', label: 'Submissions Locked', active: batch?.status === 'CLOSED' },
            { step: '3', name: 'ALLOCATED', label: 'Draft Review', active: batch?.status === 'ALLOCATED' },
            { step: '4', name: 'PUBLISHED', label: 'Visible to Students', active: batch?.status === 'PUBLISHED' },
          ].map((s) => (
            <div
              key={s.step}
              className={`p-4 rounded-2xl border transition-all ${
                s.active
                  ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-600/20'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                  s.active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {s.step}
                </span>
                <span className="font-extrabold text-sm">{s.name}</span>
              </div>
              <span className="text-[11px] block mt-1.5 font-medium">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Action Controls Toolbar */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-3">
          {batch?.status === 'OPEN' && (
            <button
              onClick={handleCloseSubmissions}
              disabled={actionLoading}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Lock className="w-4 h-4" />
              <span>Close Submissions</span>
            </button>
          )}

          {(batch?.status === 'CLOSED' || batch?.status === 'ALLOCATED') && (
            <button
              onClick={handleTriggerAllocation}
              disabled={actionLoading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-indigo-100 transition-all"
            >
              <PlayCircle className="w-4 h-4" />
              <span>{batch?.status === 'ALLOCATED' ? 'Re-run Allocation Engine' : 'Trigger Allocation Engine'}</span>
            </button>
          )}

          {batch?.status === 'ALLOCATED' && (
            <button
              onClick={handlePublishResults}
              disabled={actionLoading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-emerald-100 transition-all"
            >
              <Globe className="w-4 h-4" />
              <span>Publish Results to Students</span>
            </button>
          )}

          {batch?.status === 'PUBLISHED' && (
            <button
              onClick={handleVacateRooms}
              disabled={actionLoading}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-all ml-auto"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Vacate Previous Batch Rooms</span>
            </button>
          )}
        </div>
      </div>

      {/* Allocation Summary Stats Card */}
      {run && (
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider block">Latest Execution Audit</span>
              <h4 className="text-lg font-black">Run #{run.id} • {new Date(run.completed_at || run.started_at).toLocaleString()}</h4>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
              {run.status}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block">Processed Applications:</span>
              <span className="text-xl font-bold text-white">{run.total_applications_processed}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Allocated Groups:</span>
              <span className="text-xl font-bold text-emerald-400">{run.total_allocated_groups} ({run.total_allocated_students} scholars)</span>
            </div>
            <div>
              <span className="text-slate-400 block">Waitlisted Groups:</span>
              <span className="text-xl font-bold text-amber-400">{run.total_waitlisted_groups}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Pref Fallback Spread:</span>
              <span className="text-slate-200 font-mono text-[11px] block mt-1">
                P1:{run.pref_1_count} | P2:{run.pref_2_count} | P3:{run.pref_3_count} | P4:{run.pref_4_count} | P5:{run.pref_5_count}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Allocated Groups Table */}
      {allocations.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm space-y-2">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">Allocated Groups & Room Assignments</h3>
            <span className="text-xs font-bold text-emerald-600">{allocations.length} Student Allocations</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-6">Group</th>
                  <th className="py-3 px-6">Leader Rank</th>
                  <th className="py-3 px-6">Assigned Room</th>
                  <th className="py-3 px-6">Hostel Block</th>
                  <th className="py-3 px-6">Choice Satisfied</th>
                  <th className="py-3 px-6">Scholar Assigned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {allocations.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-6 font-mono font-bold text-slate-900">{a.group_code}</td>
                    <td className="py-3 px-6 font-bold text-indigo-600">#{a.leader_rank}</td>
                    <td className="py-3 px-6 font-black text-slate-900 font-mono">{a.room_number}</td>
                    <td className="py-3 px-6">{a.block_name} (Floor {a.floor})</td>
                    <td className="py-3 px-6">
                      <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] uppercase ${
                        a.preference_rank_satisfied === 1 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        Choice #{a.preference_rank_satisfied}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      <span className="font-bold text-slate-900">{a.student_name}</span>
                      <span className="text-slate-400 block text-[10px] font-mono">{a.registration_number} (Rank #{a.merit_rank})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Waitlisted Groups Table */}
      {unallocated.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm space-y-2">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">Waitlisted Applications</h3>
            <span className="text-xs font-bold text-amber-600">{unallocated.length} Groups Waitlisted</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-6">Group Code</th>
                  <th className="py-3 px-6">Leader Name</th>
                  <th className="py-3 px-6">Leader Rank</th>
                  <th className="py-3 px-6">Capacity</th>
                  <th className="py-3 px-6">Reason</th>
                  <th className="py-3 px-6">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {unallocated.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-6 font-mono font-bold text-slate-900">{u.group_code}</td>
                    <td className="py-3 px-6 font-bold">{u.leader_name}</td>
                    <td className="py-3 px-6 font-bold text-slate-500">#{u.leader_rank}</td>
                    <td className="py-3 px-6">{u.target_capacity === 1 ? 'Single' : u.target_capacity === 2 ? 'Double' : 'Quad'}</td>
                    <td className="py-3 px-6">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
                        {u.reason}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-slate-500">{u.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

