import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Building2, ArrowRight, AlertCircle, UserCheck, Shield, Home } from 'lucide-react';

export default function LoginPage() {
  const [regNo, setRegNo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!regNo.trim()) {
      setError('Please enter your registration number.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await axios.post('/api/students/login', {
        registration_number: regNo.trim()
      });

      if (res.data.success) {
        localStorage.setItem('hostelhub_student', JSON.stringify(res.data.student));
        navigate('/allocation/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your registration number.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoRegNo) => {
    setRegNo(demoRegNo);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between p-4 font-sans text-slate-800">
      {/* Top Navbar */}
      <header className="max-w-md w-full mx-auto pt-2 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-white rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Return to HostelHub Home Landing Page"
        >
          <Home className="w-4 h-4 text-slate-500" aria-hidden="true" />
          <span>Home</span>
        </Link>

        <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
          Room Allocation Portal
        </span>
      </header>

      {/* Main Login Card */}
      <main className="w-full max-w-md mx-auto my-auto bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto text-white shadow-md shadow-indigo-200 mb-3">
            <Building2 className="w-8 h-8" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">HostelHub</h1>
          <p className="text-xs text-slate-500 mt-1">Hostel Room Allocation System</p>
        </div>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="student-reg-input"
              className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Student Registration Number
            </label>
            <input
              id="student-reg-input"
              type="text"
              value={regNo}
              onChange={(e) => setRegNo(e.target.value.toUpperCase())}
              placeholder="e.g. 24BCE1001"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold tracking-wide text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 focus:bg-white transition-all uppercase"
              autoFocus
              aria-required="true"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition-all disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-600"
          >
            <span>{loading ? 'Verifying...' : 'Sign In to Dashboard'}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>

        {/* Quick Demo Login Presets */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 block mb-2.5 uppercase tracking-wider text-center">
            Demo Test Accounts
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin('24BCE1001')}
              className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>24BCE1001</span>
              </div>
              <span className="text-[10px] text-emerald-600 block mt-0.5">Tests Case 1 (Allocated)</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('24BCE1002')}
              className="p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/70 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <div className="flex items-center gap-1.5 text-indigo-800 font-bold">
                <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>24BCE1002</span>
              </div>
              <span className="text-[10px] text-indigo-600 block mt-0.5">Tests Case 2 (Form)</span>
            </button>
          </div>

          {/* Admin Access Link */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center">
            <Link
              to="/allocation/admin"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md px-2 py-1"
            >
              <Shield className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Go to Admin Allocation Console &rarr;</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] text-slate-400 py-3">
        HostelHub Room Allocation
      </footer>
    </div>
  );
}
