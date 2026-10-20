import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FileText, Users, Award, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function ApplicationsReview() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const res = await api.get('/admin/applications');
      if (res.data.success) {
        setApplications(res.data.applications);
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading applications...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Applications & Group Roster</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Ranked strictly by calculated leader merit rank ascending (best rank first).
          </p>
        </div>

        <span className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-sm">
          Total Applications: {applications.length}
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 uppercase font-semibold">
                <th className="py-4 px-6">Priority</th>
                <th className="py-4 px-6">Group Code</th>
                <th className="py-4 px-6">Calculated Leader</th>
                <th className="py-4 px-6">Capacity</th>
                <th className="py-4 px-6">All Group Members</th>
                <th className="py-4 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {applications.map((app, idx) => (
                <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-6 font-mono font-bold text-slate-400">
                    #{idx + 1}
                  </td>

                  <td className="py-4 px-6 font-mono font-bold text-slate-900">
                    {app.group_code}
                  </td>

                  <td className="py-4 px-6">
                    <div className="font-bold text-slate-900">{app.leader_name}</div>
                    <span className="text-[11px] text-indigo-600 font-bold block">
                      Leader Merit Rank #{app.leader_rank}
                    </span>
                  </td>

                  <td className="py-4 px-6 font-bold text-slate-800">
                    {app.target_capacity === 1 ? 'Single (1)' : app.target_capacity === 2 ? 'Double (2)' : 'Quad (4)'}
                  </td>

                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-1.5">
                      {app.members?.map((m) => (
                        <span
                          key={m.id}
                          className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-100 text-slate-700 border border-slate-200 font-semibold"
                          title={`${m.full_name} (${m.registration_number})`}
                        >
                          {m.full_name.split(' ')[0]} (#{m.merit_rank})
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-4 px-6 text-right">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      app.status === 'ALLOCATED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      app.status === 'SUBMITTED' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      app.status === 'WAITLISTED' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {app.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

