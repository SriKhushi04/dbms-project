import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Award,
  Users,
  ListOrdered,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Building
} from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplicationStatus();
  }, []);

  const fetchApplicationStatus = async () => {
    try {
      const res = await api.get('/students/me/application');
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch student application:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading student dashboard...</div>;
  }

  const { batch, group, application, preferences, allocationResult } = data || {};

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-indigo-300 text-xs font-bold uppercase tracking-wider">Academic Year 2026-2027</span>
          <h2 className="text-2xl md:text-3xl font-extrabold mt-1">Welcome, {user.name}!</h2>
          <p className="text-indigo-200 text-sm mt-1">
            {user.academic_branch} • Year {user.year_of_study} • Registration No: <span className="font-mono">{user.registration_number}</span>
          </p>
        </div>

        {/* Merit Rank Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 rounded-2xl text-center flex-shrink-0">
          <span className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider block">Official Merit Rank</span>
          <div className="text-3xl font-black text-amber-300 mt-0.5">#{user.merit_rank}</div>
          <span className="text-[10px] text-white/80 block mt-0.5">Determines Group Priority</span>
        </div>
      </div>

      {/* Batch Lifecycle Status Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">Current Batch: {batch?.batch_name || 'FALL-2026'}</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Cycle Status:{' '}
              <span className={`font-bold ${
                batch?.status === 'OPEN' ? 'text-emerald-600' :
                batch?.status === 'CLOSED' ? 'text-amber-600' :
                batch?.status === 'PUBLISHED' ? 'text-indigo-600' : 'text-slate-600'
              }`}>
                {batch?.status || 'OPEN'}
              </span>
            </p>
          </div>
        </div>

        <div>
          {application?.status === 'SUBMITTED' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" /> Application Submitted & Locked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <AlertCircle className="w-4 h-4" /> Application Incomplete
            </span>
          )}
        </div>
      </div>

      {/* Main Workflow Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step 1: Group Formation */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">1. Group Formation</h3>
            <p className="text-xs text-slate-500 mt-1">
              Apply as individual (size 1), pair (size 2), or quad group (size 4).
            </p>

            <div className="mt-4 pt-4 border-t border-slate-100 text-xs">
              {group ? (
                <div>
                  <span className="text-slate-500 block">Active Group:</span>
                  <span className="font-mono font-bold text-slate-800">{group.group_code}</span>
                  <span className="text-slate-500 block mt-1">
                    Members: {group.members?.length} of {group.target_capacity} ({group.target_capacity === 1 ? 'Single Room' : group.target_capacity === 2 ? 'Double Room' : 'Quad Room'})
                  </span>
                  <span className="text-indigo-600 font-semibold block mt-1">
                    Leader Rank: #{group.leader_rank}
                  </span>
                </div>
              ) : (
                <span className="text-slate-400 italic">No group formed yet.</span>
              )}
            </div>
          </div>

          <Link
            to="/student/group"
            className="mt-6 flex items-center justify-between text-xs font-bold text-indigo-600 hover:text-indigo-700 pt-4 border-t border-slate-100"
          >
            <span>{group ? 'View Group Details' : 'Form or Join Group'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Step 2: 5 Preferences */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <ListOrdered className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">2. Five Preferences</h3>
            <p className="text-xs text-slate-500 mt-1">
              Rank exactly 5 distinct rooms matching your group's room capacity.
            </p>

            <div className="mt-4 pt-4 border-t border-slate-100 text-xs">
              <span className="text-slate-500 block">Preferences Selected:</span>
              <span className="font-bold text-slate-800 text-sm">
                {preferences?.length || 0} / 5 Choices
              </span>
              {preferences?.length === 5 && (
                <span className="text-emerald-600 font-semibold block mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 5 preferences saved
                </span>
              )}
            </div>
          </div>

          <Link
            to="/student/preferences"
            className="mt-6 flex items-center justify-between text-xs font-bold text-indigo-600 hover:text-indigo-700 pt-4 border-t border-slate-100"
          >
            <span>{application?.status === 'SUBMITTED' ? 'View Saved Choices' : 'Rank Preferences'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Step 3: Allocation Results */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">3. Merit Allocation</h3>
            <p className="text-xs text-slate-500 mt-1">
              Admin-triggered merit allocation outcome based on group leader rank.
            </p>

            <div className="mt-4 pt-4 border-t border-slate-100 text-xs">
              <span className="text-slate-500 block">Outcome Status:</span>
              {allocationResult ? (
                <div className="mt-1">
                  {allocationResult.status === 'ALLOCATED' ? (
                    <span className="font-bold text-emerald-600 block text-sm">
                      Room {allocationResult.details?.room_number} ({allocationResult.details?.block_name})
                    </span>
                  ) : (
                    <span className="font-bold text-amber-600 block">
                      Waitlisted ({allocationResult.reason})
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-slate-400 italic">
                  {batch?.status === 'PUBLISHED' ? 'No result found' : 'Awaiting admin publication'}
                </span>
              )}
            </div>
          </div>

          <Link
            to="/student/result"
            className="mt-6 flex items-center justify-between text-xs font-bold text-indigo-600 hover:text-indigo-700 pt-4 border-t border-slate-100"
          >
            <span>View Result Page</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

