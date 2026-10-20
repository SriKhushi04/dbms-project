import React from 'react';
import { Outlet, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  ListOrdered,
  Award,
  Building2
} from 'lucide-react';
import Navbar from '../components/Navbar';

export default function StudentLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading session...</div>;
  }

  if (!user || user.role !== 'STUDENT') {
    return <Navigate to="/login" replace />;
  }

  const navLinks = [
    { to: '/student', icon: LayoutDashboard, label: 'Overview & Profile', end: true },
    { to: '/student/group', icon: Users, label: 'Group Formation' },
    { to: '/student/preferences', icon: ListOrdered, label: '5 Room Preferences' },
    { to: '/student/result', icon: Award, label: 'Allocation Result' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 z-40">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 tracking-tight text-lg">HostelHub</h2>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Student Portal
            </span>
          </div>
        </div>

        {/* Student Merit Badge */}
        <div className="m-4 p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100 text-xs">
          <span className="text-slate-500 font-semibold block text-[11px] uppercase tracking-wider">Merit Rank</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-indigo-700">#{user.merit_rank}</span>
            <span className="text-slate-500 font-medium text-[11px]">of 100 students</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-600 truncate font-mono">
            {user.registration_number}
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
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 text-[11px] text-slate-400 text-center">
          DBMS Academic Project 2026
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <Navbar title="Student Hostel Allocation" />
        <main className="flex-1 p-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

