import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Building2, LogOut, UserCircle } from 'lucide-react';

export default function Navbar({ title, subtitle }) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
          <UserCircle className="w-5 h-5 text-indigo-600" />
          <div className="text-left text-xs leading-tight">
            <span className="font-semibold text-slate-800 block">{user?.name || user?.full_name || user?.username}</span>
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">
              {user?.role === 'STUDENT' ? `Rank #${user?.merit_rank} • ${user?.registration_number}` : 'Administrator'}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
          title="Sign out of HostelHub"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}

