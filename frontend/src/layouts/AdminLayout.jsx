import React from 'react';
import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  DoorOpen,
  FileText,
  PlayCircle,
  ShieldCheck,
  Building2
} from 'lucide-react';
import Navbar from '../components/Navbar';

export default function AdminLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading session...</div>;
  }

  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/login" replace />;
  }

  const navLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Live Dashboard', end: true },
    { to: '/admin/rooms', icon: DoorOpen, label: 'Rooms & Inventory' },
    { to: '/admin/applications', icon: FileText, label: 'Applications & Groups' },
    { to: '/admin/allocation', icon: PlayCircle, label: 'Allocation Engine' },
    { to: '/admin/audit', icon: ShieldCheck, label: 'Audit Logs' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col fixed inset-y-0 z-40">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-white tracking-tight text-lg">HostelHub</h2>
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-950/80 border border-indigo-800/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Admin Portal
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
          HostelHub Administration v1.0
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Navbar title="Administration & Allocation Console" />
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

