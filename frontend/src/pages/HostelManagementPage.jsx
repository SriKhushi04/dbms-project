import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, ArrowLeft, Home, Sparkles } from 'lucide-react';

export default function HostelManagementPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-slate-900 block leading-none">
                HostelHub
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mt-0.5">
                Management Section
              </span>
            </div>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            aria-label="Return to HostelHub Home Page"
          >
            <Home className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Home</span>
          </Link>
        </div>
      </header>

      {/* Main Isolated Blank Section */}
      <main className="max-w-2xl mx-auto px-6 py-20 text-center space-y-6 flex-1 flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 mb-2">
          <Building2 className="w-8 h-8" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          {/* Small heading */}
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Hostel Management
          </h1>
          {/* Coming Soon message */}
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            This module is currently reserved for future administrative, facility maintenance, and hostel operations.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-600 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
          <span>Coming Soon</span>
        </div>

        <div className="pt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-700"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Home</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        HostelHub &bull; Management Portal
      </footer>
    </div>
  );
}

