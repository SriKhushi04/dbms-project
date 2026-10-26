import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  BedDouble,
  Wrench,
  ArrowRight,
  CheckCircle2,
  Users,
  CreditCard,
  UtensilsCrossed,
  Clock,
  Sparkles
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 font-sans flex flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900">
      {/* Decorative top accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-500" aria-hidden="true" />

      {/* Top Header / Branding */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          {/* Logo & Identity */}
          <Link
            to="/"
            className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg group"
            aria-label="HostelHub Home"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white flex items-center justify-center shadow-sm shadow-indigo-200 transition-transform duration-200 group-hover:scale-105 motion-reduce:group-hover:scale-100">
              <Building2 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 block leading-tight">
                HostelHub
              </span>
              <span className="text-xs font-medium text-slate-500 block">
                Campus Housing Portal
              </span>
            </div>
          </Link>

          {/* Header Action: Admin Console */}
          <nav aria-label="Quick Actions">
            <Link
              to="/allocation/admin"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 hover:text-indigo-600 transition-colors shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <span>Admin Console</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero & Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-14 flex-1 flex flex-col justify-center items-center w-full">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto mb-10 md:mb-12">
          {/* Subtle accent badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-medium shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
            <span>Centralized Student Residence &amp; Operations</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Your campus life, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600">all in one place.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            A unified university portal for automated room allocation, facility maintenance, dining services, and residential student administration.
          </p>
        </div>

        {/* Two Primary Action Cards */}
        <section
          aria-label="Portal Selection"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 w-full max-w-4xl"
        >
          {/* Card 1: Room Allocation (Indigo visual accent) */}
          <Link
            to="/allocation/login"
            className="group relative bg-white border border-slate-200/90 hover:border-indigo-500 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 flex flex-col justify-between"
          >
            <div className="space-y-5">
              {/* Card Header & Icon */}
              <div className="flex items-center justify-between">
                <div className="w-13 h-13 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-200 shadow-2xs">
                  <BedDouble className="w-6 h-6" aria-hidden="true" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                  Allocation Cycle
                </span>
              </div>

              {/* Title & Description */}
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                  <span>Room Allocation</span>
                </h2>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Log in with your university registration number, assemble roommate groups, pick five preferred rooms, and receive algorithmic merit-based assignment.
                </p>
              </div>

              {/* Feature Tags */}
              <div className="pt-1 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                  <span>5-Room Preference List</span>
                </span>
                <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-md">
                  <Users className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
                  <span>Roommate Grouping</span>
                </span>
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-indigo-600 group-hover:text-indigo-700">
              <span>Enter Room Allocation</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white text-indigo-600 flex items-center justify-center transition-all duration-200 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0">
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </div>
            </div>
          </Link>

          {/* Card 2: Hostel Management (Teal visual accent) */}
          <Link
            to="/management"
            className="group relative bg-white border border-slate-200/90 hover:border-teal-500 rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-xl hover:shadow-teal-500/5 transition-all duration-200 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 flex flex-col justify-between"
          >
            <div className="space-y-5">
              {/* Card Header & Icon */}
              <div className="flex items-center justify-between">
                <div className="w-13 h-13 rounded-xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors duration-200 shadow-2xs">
                  <Wrench className="w-6 h-6" aria-hidden="true" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                  Facility &amp; Operations
                </span>
              </div>

              {/* Title & Description */}
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-teal-700 transition-colors flex items-center gap-2">
                  <span>Hostel Management</span>
                </h2>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Lodge maintenance requests, track fee payments, view weekly mess menus, request mess rebates, and manage digital gate passes.
                </p>
              </div>

              {/* Feature Tags */}
              <div className="pt-1 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-md">
                  <Wrench className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
                  <span>Maintenance Desk</span>
                </span>
                <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-md">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
                  <span>Fee Invoices</span>
                </span>
                <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-md">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                  <span>Mess Menus</span>
                </span>
                <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-md">
                  <Clock className="w-3.5 h-3.5 text-purple-600" aria-hidden="true" />
                  <span>Gate Passes</span>
                </span>
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-teal-700 group-hover:text-teal-800">
              <span>Enter Hostel Management</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 group-hover:bg-teal-600 group-hover:text-white text-teal-700 flex items-center justify-center transition-all duration-200 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0">
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </div>
            </div>
          </Link>
        </section>
      </main>
    </div>
  );
}
