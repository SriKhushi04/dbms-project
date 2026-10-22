import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  BedDouble,
  Settings2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-indigo-50/20 text-slate-800 font-sans flex flex-col justify-between">
      {/* Top Header / Branding */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
              <Building2 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 block leading-none">
                HostelHub
              </span>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block mt-0.5">
                University Portal
              </span>
            </div>
          </div>

          <nav aria-label="Quick Navigation">
            <Link
              to="/allocation/admin"
              className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Admin Console
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 py-12 md:py-16 text-center space-y-10 flex-1 flex flex-col justify-center">
        {/* Main Branding Headings */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-bold tracking-wide mb-2 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-indigo-600" aria-hidden="true" />
            <span>Official University Campus Housing</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            HostelHub
          </h1>

          <p className="text-base md:text-xl font-medium text-slate-600 max-w-xl mx-auto">
            Hostel Allocation &amp; Management System
          </p>
        </div>

        {/* Two Prominent Action Cards */}
        <section aria-label="Portal Selection" className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left max-w-2xl mx-auto w-full">
          {/* Card 1: Room Allocation */}
          <Link
            to="/allocation/login"
            className="group relative p-7 bg-white border-2 border-slate-200 hover:border-indigo-500 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300"
          >
            <div className="space-y-4">
              <div className="w-13 h-13 w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors shadow-sm">
                <BedDouble className="w-6 h-6" aria-hidden="true" />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center justify-between">
                  <span>Room Allocation</span>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" aria-hidden="true" />
                </h2>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Student login, roommate grouping, live 5-room preferences, merit-based assignment rounds, and official room confirmation.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
                <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" /> Student Login
                </span>
                <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                  <Users className="w-3 h-3 text-indigo-600" aria-hidden="true" /> Roommates
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600">
              <span>Enter Allocation Portal &rarr;</span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-indigo-50 rounded-full font-black">
                Active Cycle
              </span>
            </div>
          </Link>

          {/* Card 2: Hostel Management */}
          <Link
            to="/management"
            className="group relative p-7 bg-white border-2 border-slate-200 hover:border-slate-400 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-300"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-slate-800 group-hover:text-white flex items-center justify-center transition-colors shadow-sm">
                <Settings2 className="w-6 h-6" aria-hidden="true" />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-900 group-hover:text-slate-800 transition-colors flex items-center justify-between">
                  <span>Hostel Management</span>
                  <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-1 transition-all" aria-hidden="true" />
                </h2>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Campus facility oversight, warden administration, maintenance requests, and general hostel operations.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                <span className="bg-slate-100 px-2 py-0.5 rounded-md">Administration</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded-md">Operations</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600">
              <span>Open Management &rarr;</span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-slate-100 rounded-full font-bold text-slate-500">
                Coming Soon
              </span>
            </div>
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" aria-hidden="true" />
            <span className="font-bold text-slate-700">HostelHub</span>
            <span>&bull; Comprehensive University Housing System</span>
          </div>
          <span className="text-[11px] text-slate-400">
            MySQL InnoDB Relational Engine
          </span>
        </div>
      </footer>
    </div>
  );
}

