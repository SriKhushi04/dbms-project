import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  Users,
  MapPin,
  Sparkles
} from 'lucide-react';

export default function AllocationResult() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResult();
  }, []);

  const loadResult = async () => {
    try {
      const res = await api.get('/students/me/application');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load allocation result:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Checking allocation results...</div>;
  }

  const { batch, group, application, allocationResult } = data || {};
  const isPublished = batch?.status === 'PUBLISHED';

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Merit Allocation Results</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Official university hostel room assignment for academic cycle {batch?.batch_name || 'FALL-2026'}.
        </p>
      </div>

      {!isPublished ? (
        /* Results Not Yet Published */
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Allocation In Progress / Unpublished</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            The hostel administration is currently finalizing the merit-based room allocation. Results will be visible to all scholars immediately after publication.
          </p>
          <div className="pt-4 text-xs font-semibold text-slate-400">
            Batch Status: <span className="text-indigo-600 font-bold">{batch?.status || 'OPEN'}</span>
          </div>
        </div>
      ) : allocationResult?.status === 'ALLOCATED' ? (
        /* Successfully Allocated Room */
        <div className="bg-gradient-to-br from-emerald-50 via-white to-slate-50 border border-emerald-200 rounded-3xl p-8 shadow-md space-y-6">
          <div className="flex items-center justify-between pb-6 border-b border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-wider block">Official Assignment</span>
                <h3 className="text-2xl font-black text-slate-900">
                  Room {allocationResult.details?.room_number}
                </h3>
              </div>
            </div>

            <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
              Choice #{allocationResult.details?.preference_rank_satisfied} Awarded
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Hostel Block</span>
              <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{allocationResult.details?.block_name}</span>
            </div>
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Floor</span>
              <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">Floor {allocationResult.details?.floor}</span>
            </div>
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Room Type</span>
              <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{allocationResult.details?.room_type}</span>
            </div>
            <div className="p-3.5 bg-white rounded-2xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Bed Capacity</span>
              <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{allocationResult.details?.capacity} Beds</span>
            </div>
          </div>

          <div className="p-4 bg-emerald-100/60 rounded-2xl border border-emerald-200 text-xs text-emerald-900">
            <strong>Roommates Allocated:</strong> All {group?.members?.length} members of your application group (<span className="font-mono">{group?.group_code}</span>) have been assigned to Room {allocationResult.details?.room_number} together.
          </div>
        </div>
      ) : (
        /* Waitlisted */
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider block">Application Status</span>
              <h3 className="text-xl font-bold text-slate-900">Waitlisted for Round 2</h3>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            All five of your group's ranked room choices were allocated to higher-merit applicant groups during this batch run. Your application remains on the waitlist for subsequent vacancy rounds.
          </p>

          <div className="p-3 bg-white rounded-xl border border-amber-200 text-xs text-amber-900">
            <strong>Reason:</strong> {allocationResult?.reason || 'NO_PREFERENCE_AVAILABLE'}
          </div>
        </div>
      )}
    </div>
  );
}

