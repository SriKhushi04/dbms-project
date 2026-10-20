import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Shield, User, LogIn, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('STUDENT'); // 'STUDENT' or 'ADMIN'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const user = await login(identifier, password, role);
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/student');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const setDemoCredentials = (roleType, id, pass) => {
    setRole(roleType);
    setIdentifier(id);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 border border-slate-100">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg shadow-indigo-200 mb-3">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">HostelHub</h1>
          <p className="text-xs text-slate-500 mt-1">University Merit-Based Hostel Room Allocation System</p>
        </div>

        {/* Role Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => { setRole('STUDENT'); setIdentifier(''); setPassword(''); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
              role === 'STUDENT' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Student Portal</span>
          </button>
          <button
            type="button"
            onClick={() => { setRole('ADMIN'); setIdentifier(''); setPassword(''); }}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
              role === 'ADMIN' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Administrator</span>
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              {role === 'STUDENT' ? 'Registration Number or Email' : 'Admin Username or Email'}
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={role === 'STUDENT' ? 'e.g. 24BCE1001' : 'e.g. admin@hostelhub.edu'}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 mt-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{submitting ? 'Verifying...' : 'Sign In'}</span>
          </button>
        </form>

        {/* Quick Demo Logins Box */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 block mb-3 text-center uppercase tracking-wider">
            Quick Local Demo Credentials
          </span>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => setDemoCredentials('ADMIN', 'admin@hostelhub.edu', 'Admin@123')}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-left transition-all"
            >
              <span className="font-bold text-slate-800 block">Chief Admin</span>
              <span className="text-slate-500 font-mono text-[10px]">admin@hostelhub.edu</span>
            </button>

            <button
              type="button"
              onClick={() => setDemoCredentials('STUDENT', '24BCE1001', 'Student@123')}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-left transition-all"
            >
              <span className="font-bold text-slate-800 block">Student (Rank #1)</span>
              <span className="text-slate-500 font-mono text-[10px]">24BCE1001</span>
            </button>

            <button
              type="button"
              onClick={() => setDemoCredentials('STUDENT', '24BCE1004', 'Student@123')}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-left transition-all"
            >
              <span className="font-bold text-slate-800 block">Student (Rank #4)</span>
              <span className="text-slate-500 font-mono text-[10px]">24BCE1004</span>
            </button>

            <button
              type="button"
              onClick={() => setDemoCredentials('STUDENT', '24BCE1099', 'Student@123')}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-left transition-all"
            >
              <span className="font-bold text-slate-800 block">Student (Rank #99)</span>
              <span className="text-slate-500 font-mono text-[10px]">24BCE1099 (Waitlist)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

