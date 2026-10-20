import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { ShieldCheck, Clock, User, AlertCircle } from 'lucide-react';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const res = await api.get('/admin/audit-logs');
      if (res.data.success) {
        setLogs(res.data.logs);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-slate-500">Loading audit trail...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Audit Trail</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Immutable logging of critical administrative operations and student submissions.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-semibold">
                <th className="py-3 px-6">Timestamp</th>
                <th className="py-3 px-6">Actor</th>
                <th className="py-3 px-6">Action</th>
                <th className="py-3 px-6">Entity</th>
                <th className="py-3 px-6">IP Address</th>
                <th className="py-3 px-6">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-6 font-mono text-slate-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-6">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      log.actor_type === 'ADMIN' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                      log.actor_type === 'STUDENT' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {log.actor_type} #{log.actor_id || 'sys'}
                    </span>
                  </td>
                  <td className="py-3 px-6 font-bold text-slate-900">{log.action}</td>
                  <td className="py-3 px-6 font-mono text-[11px] text-slate-600">{log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}</td>
                  <td className="py-3 px-6 font-mono text-slate-400 text-[11px]">{log.ip_address || 'local'}</td>
                  <td className="py-3 px-6 max-w-xs truncate text-slate-500 text-[11px]">
                    {log.details ? JSON.stringify(log.details) : '—'}
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

