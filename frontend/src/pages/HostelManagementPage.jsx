import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Building2,
  Home,
  Wrench,
  CreditCard,
  Utensils,
  Clock,
  Shield,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Lock,
  User,
  LogOut,
  PlusCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  FileText,
  DollarSign,
  Coffee,
  CheckSquare,
  XCircle,
  Users
} from 'lucide-react';

export default function HostelManagementPage() {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState('maintenance'); // 'maintenance', 'fees', 'mess', 'gatepass'
  const [isStaffMode, setIsStaffMode] = useState(false);

  // Authentication State
  const [token, setToken] = useState(() => localStorage.getItem('hostelhub_mgmt_token') || '');
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem('hostelhub_mgmt_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Auth Dialog States
  const [authMode, setAuthMode] = useState('student-login'); // 'student-login', 'student-register', 'staff-login', 'staff-setup'
  const [authRegNo, setAuthRegNo] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');
  const [authRole, setAuthRole] = useState('WARDEN');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Feature 1: Maintenance State
  const [complaints, setComplaints] = useState([]);
  const [complaintStats, setComplaintStats] = useState(null);
  const [newCategory, setNewCategory] = useState('ELECTRICAL');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newScope, setNewScope] = useState('ROOM');
  const [complaintMsg, setComplaintMsg] = useState({ type: '', text: '' });
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  // Feature 2: Fees State
  const [feeLedger, setFeeLedger] = useState(null);
  const [adminFeeLedgers, setAdminFeeLedgers] = useState([]);
  const [payAmount, setPayAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [feeMsg, setFeeMsg] = useState({ type: '', text: '' });
  const [feeReceipt, setFeeReceipt] = useState(null);

  // Feature 3: Mess State
  const [messMenu, setMessMenu] = useState([]);
  const [dietPreference, setDietPreference] = useState('VEGETARIAN');
  const [rebateStart, setRebateStart] = useState('');
  const [rebateEnd, setRebateEnd] = useState('');
  const [rebateReason, setRebateReason] = useState('');
  const [myRebates, setMyRebates] = useState([]);
  const [adminRebates, setAdminRebates] = useState([]);
  const [messMsg, setMessMsg] = useState({ type: '', text: '' });

  // Feature 4: Gate Pass State
  const [passType, setPassType] = useState('DAY_PASS');
  const [destination, setDestination] = useState('');
  const [passReason, setPassReason] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [depTime, setDepTime] = useState('');
  const [retTime, setRetTime] = useState('');
  const [myPasses, setMyPasses] = useState([]);
  const [adminPasses, setAdminPasses] = useState([]);
  const [gateMsg, setGateMsg] = useState({ type: '', text: '' });
  const [scanPassId, setScanPassId] = useState('');

  // Initial Data Fetching
  useEffect(() => {
    if (token) {
      loadTabData();
    }
  }, [token, activeTab, isStaffMode]);

  // Axios helper with Auth Header
  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  const loadTabData = async () => {
    if (!token) return;

    try {
      if (activeTab === 'maintenance') {
        if (isStaffMode) {
          const res = await axios.get('/api/management/complaints/admin', getAuthHeaders());
          setComplaints(res.data.data || []);
          const statsRes = await axios.get('/api/management/complaints/stats', getAuthHeaders());
          setComplaintStats(statsRes.data.data);
        } else {
          const res = await axios.get('/api/management/complaints/my', getAuthHeaders());
          setComplaints(res.data.data || []);
        }
      } else if (activeTab === 'fees') {
        if (isStaffMode) {
          const res = await axios.get('/api/management/fees/admin/ledger', getAuthHeaders());
          setAdminFeeLedgers(res.data.data || []);
        } else {
          const res = await axios.get('/api/management/fees/my-ledger', getAuthHeaders());
          setFeeLedger(res.data.data);
        }
      } else if (activeTab === 'mess') {
        const menuRes = await axios.get('/api/management/mess/menu');
        setMessMenu(menuRes.data.data || []);
        if (!isStaffMode) {
          const dietRes = await axios.get('/api/management/mess/dietary-preference', getAuthHeaders());
          setDietPreference(dietRes.data.data.diet_type);
          const rebRes = await axios.get('/api/management/mess/rebates/my', getAuthHeaders());
          setMyRebates(rebRes.data.data || []);
        } else {
          const rebRes = await axios.get('/api/management/mess/admin/rebates', getAuthHeaders());
          setAdminRebates(rebRes.data.data || []);
        }
      } else if (activeTab === 'gatepass') {
        if (isStaffMode) {
          const res = await axios.get('/api/management/gatepass/admin/requests', getAuthHeaders());
          setAdminPasses(res.data.data || []);
        } else {
          const res = await axios.get('/api/management/gatepass/my', getAuthHeaders());
          setMyPasses(res.data.data || []);
        }
      }
    } catch (err) {
      console.error('Data load error:', err);
    }
  };

  // --------------------------------------------------------------------------
  // AUTHENTICATION HANDLERS
  // --------------------------------------------------------------------------
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      if (authMode === 'student-login') {
        const res = await axios.post('/api/management/auth/student-login', {
          registration_number: authRegNo.trim(),
          password: authPassword
        });
        if (res.data.success) {
          saveSession(res.data.data.token, { ...res.data.data.student, role: 'STUDENT' });
        }
      } else if (authMode === 'student-register') {
        const res = await axios.post('/api/management/auth/student-register', {
          registration_number: authRegNo.trim(),
          password: authPassword
        });
        if (res.data.success) {
          saveSession(res.data.data.token, { ...res.data.data.student, role: 'STUDENT' });
        }
      } else if (authMode === 'staff-login') {
        const res = await axios.post('/api/management/auth/staff-login', {
          username: authUsername.trim(),
          password: authPassword
        });
        if (res.data.success) {
          saveSession(res.data.data.token, res.data.data.staff);
          setIsStaffMode(true);
        }
      } else if (authMode === 'staff-setup') {
        const res = await axios.post('/api/management/auth/setup-first-staff', {
          username: authUsername.trim(),
          password: authPassword,
          full_name: authFullName.trim(),
          role: authRole
        });
        if (res.data.success) {
          saveSession(res.data.data.token, res.data.data.staff);
          setIsStaffMode(true);
        }
      }
    } catch (err) {
      setAuthError(err.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const saveSession = (newToken, profile) => {
    setToken(newToken);
    setUserProfile(profile);
    localStorage.setItem('hostelhub_mgmt_token', newToken);
    localStorage.setItem('hostelhub_mgmt_user', JSON.stringify(profile));
    setAuthPassword('');
  };

  const handleLogout = () => {
    setToken('');
    setUserProfile(null);
    localStorage.removeItem('hostelhub_mgmt_token');
    localStorage.removeItem('hostelhub_mgmt_user');
    setIsStaffMode(false);
  };

  // --------------------------------------------------------------------------
  // FEATURE 1: MAINTENANCE HANDLERS
  // --------------------------------------------------------------------------
  const handleCreateComplaint = async (e) => {
    e.preventDefault();
    setComplaintMsg({ type: '', text: '' });
    try {
      const res = await axios.post('/api/management/complaints', {
        category: newCategory,
        priority: newPriority,
        title: newTitle,
        description: newDesc,
        scope: newScope
      }, getAuthHeaders());

      if (res.data.success) {
        setComplaintMsg({ type: 'success', text: 'Complaint lodged successfully! Ticket #' + res.data.data.ticket_number });
        setNewTitle('');
        setNewDesc('');
        loadTabData();
      }
    } catch (err) {
      setComplaintMsg({ type: 'error', text: err.response?.data?.message || 'Failed to submit complaint.' });
    }
  };

  const handleUpdateStatus = async (ticketId, nextStatus) => {
    const notes = prompt(`Enter resolution / action notes for Ticket #${ticketId}:`);
    if (!notes || notes.trim().length < 5) {
      alert('Action cancelled: Resolution notes (minimum 5 characters) are required.');
      return;
    }
    const staffName = prompt('Enter assigned staff / technician name:', 'Ramesh (Electrician)');

    try {
      const res = await axios.patch(`/api/management/complaints/${ticketId}/status`, {
        status: nextStatus,
        assigned_to: staffName,
        resolution_notes: notes
      }, getAuthHeaders());

      if (res.data.success) {
        alert(`Ticket #${ticketId} updated to ${nextStatus}.`);
        loadTabData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update ticket status.');
    }
  };

  // --------------------------------------------------------------------------
  // FEATURE 2: FEE PAYMENT HANDLER
  // --------------------------------------------------------------------------
  const handleFeePayment = async (e) => {
    e.preventDefault();
    setFeeMsg({ type: '', text: '' });
    try {
      const res = await axios.post('/api/management/fees/pay', {
        amount: parseFloat(payAmount),
        payment_mode: paymentMode
      }, getAuthHeaders());

      if (res.data.success) {
        setFeeMsg({ type: 'success', text: res.data.message });
        setFeeReceipt(res.data.data);
        setPayAmount('');
        loadTabData();
      }
    } catch (err) {
      setFeeMsg({ type: 'error', text: err.response?.data?.message || 'Payment simulation failed.' });
    }
  };

  // --------------------------------------------------------------------------
  // FEATURE 3: MESS REBATE & DIET HANDLERS
  // --------------------------------------------------------------------------
  const handleDietChange = async (newDiet) => {
    try {
      const res = await axios.put('/api/management/mess/dietary-preference', { diet_type: newDiet }, getAuthHeaders());
      if (res.data.success) {
        setDietPreference(newDiet);
        setMessMsg({ type: 'success', text: `Dietary preference set to ${newDiet}.` });
      }
    } catch (err) {
      setMessMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update diet.' });
    }
  };

  const handleApplyRebate = async (e) => {
    e.preventDefault();
    setMessMsg({ type: '', text: '' });
    try {
      const res = await axios.post('/api/management/mess/rebates', {
        start_date: rebateStart,
        end_date: rebateEnd,
        reason: rebateReason
      }, getAuthHeaders());

      if (res.data.success) {
        setMessMsg({ type: 'success', text: res.data.message });
        setRebateStart('');
        setRebateEnd('');
        setRebateReason('');
        loadTabData();
      }
    } catch (err) {
      setMessMsg({ type: 'error', text: err.response?.data?.message || 'Rebate application failed.' });
    }
  };

  // --------------------------------------------------------------------------
  // FEATURE 4: GATE PASS HANDLERS
  // --------------------------------------------------------------------------
  const handleRequestPass = async (e) => {
    e.preventDefault();
    setGateMsg({ type: '', text: '' });
    try {
      const res = await axios.post('/api/management/gatepass/request', {
        pass_type: passType,
        destination,
        reason: passReason,
        emergency_contact: contactNo,
        departure_time: depTime,
        expected_return_time: retTime
      }, getAuthHeaders());

      if (res.data.success) {
        setGateMsg({ type: 'success', text: res.data.message });
        setDestination('');
        setPassReason('');
        setContactNo('');
        setDepTime('');
        setRetTime('');
        loadTabData();
      }
    } catch (err) {
      setGateMsg({ type: 'error', text: err.response?.data?.message || 'Gate pass request failed.' });
    }
  };

  const handleSecurityScan = async (action) => {
    if (!scanPassId) return;
    try {
      const res = await axios.post('/api/management/gatepass/security/log-movement', {
        pass_id: parseInt(scanPassId, 10),
        action
      }, getAuthHeaders());
      alert(res.data.message);
      setScanPassId('');
      loadTabData();
    } catch (err) {
      alert(err.response?.data?.message || 'Movement logging failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col justify-between">
      {/* Top University Branding Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-slate-900 block leading-none">
                HostelHub
              </span>
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block mt-0.5">
                Comprehensive Management Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {token ? (
              <div className="flex items-center gap-2.5 bg-slate-100 py-1.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>
                  {userProfile?.role === 'STUDENT'
                    ? `${userProfile.full_name} (${userProfile.registration_number})`
                    : `${userProfile?.full_name} [${userProfile?.role}]`}
                </span>
                <button
                  onClick={handleLogout}
                  className="ml-2 p-1 text-slate-400 hover:text-red-600 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-xs text-slate-500 font-medium">Session Required</span>
            )}

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto w-full px-6 py-6 flex-1 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'maintenance'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Maintenance &amp; Complaints</span>
            </button>

            <button
              onClick={() => setActiveTab('fees')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'fees'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Fees &amp; Billing</span>
            </button>

            <button
              onClick={() => setActiveTab('mess')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'mess'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Utensils className="w-4 h-4" />
              <span>Mess &amp; Meals</span>
            </button>

            <button
              onClick={() => setActiveTab('gatepass')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'gatepass'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Curfew &amp; Gate Pass</span>
            </button>
          </div>

          {/* Staff Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (userProfile && userProfile.role !== 'STUDENT') {
                  setIsStaffMode(!isStaffMode);
                } else {
                  setAuthMode('staff-login');
                }
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-all ${
                isStaffMode
                  ? 'bg-purple-100 text-purple-800 border-purple-300 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isStaffMode ? 'Staff Mode (Active)' : 'Switch to Staff Console'}</span>
            </button>
          </div>
        </div>

        {/* AUTHENTICATION PROMPT (If not logged in) */}
        {!token && (
          <div className="max-w-md mx-auto my-8 bg-white p-7 rounded-2xl border border-slate-200 shadow-md">
            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Authentication Required</h2>
              <p className="text-xs text-slate-500 mt-1">
                Please authenticate securely to access HostelHub management operations.
              </p>
            </div>

            {/* Auth Mode Tabs */}
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setAuthMode('student-login'); setAuthError(''); }}
                className={`py-1.5 rounded-lg transition-colors ${authMode === 'student-login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
              >
                Student Login
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('student-register'); setAuthError(''); }}
                className={`py-1.5 rounded-lg transition-colors ${authMode === 'student-register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}
              >
                Set Password
              </button>
            </div>

            {authError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {(authMode === 'student-login' || authMode === 'student-register') && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                    Student Registration Number
                  </label>
                  <input
                    type="text"
                    required
                    value={authRegNo}
                    onChange={(e) => setAuthRegNo(e.target.value.toUpperCase())}
                    placeholder="e.g. 24BCE1001"
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl font-semibold uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {(authMode === 'staff-login' || authMode === 'staff-setup') && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Staff Username
                    </label>
                    <input
                      type="text"
                      required
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      placeholder="e.g. warden_kumar"
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  {authMode === 'staff-setup' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={authFullName}
                          onChange={(e) => setAuthFullName(e.target.value)}
                          placeholder="Dr. Suresh Kumar"
                          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                          Staff Role
                        </label>
                        <select
                          value={authRole}
                          onChange={(e) => setAuthRole(e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                        >
                          <option value="WARDEN">Warden (Full Oversight)</option>
                          <option value="ACCOUNTANT">Accountant (Fees &amp; Dues)</option>
                          <option value="MESS_SUPERVISOR">Mess Supervisor (Meals &amp; Rebates)</option>
                          <option value="SECURITY_GUARD">Security Guard (Gate Movement)</option>
                        </select>
                      </div>
                    </>
                  )}
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Password (min 8 characters)
                </label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition-all disabled:opacity-50"
              >
                {authLoading ? 'Verifying...' : authMode.includes('register') || authMode.includes('setup') ? 'Complete Setup & Enter' : 'Sign In'}
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <button
                onClick={() => { setAuthMode('staff-login'); setAuthError(''); }}
                className="text-slate-500 hover:text-indigo-600 font-semibold"
              >
                Staff Login &rarr;
              </button>
              <button
                onClick={() => { setAuthMode('staff-setup'); setAuthError(''); }}
                className="text-slate-500 hover:text-purple-600 font-semibold"
              >
                Initial Staff Setup &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 1: MAINTENANCE & COMPLAINTS SYSTEM                             */}
        {/* ------------------------------------------------------------------ */}
        {token && activeTab === 'maintenance' && (
          <div className="space-y-6">
            {complaintMsg.text && (
              <div className={`p-4 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                complaintMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
              }`}>
                {complaintMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                <span>{complaintMsg.text}</span>
              </div>
            )}

            {isStaffMode ? (
              // STAFF VIEW
              <div className="space-y-4">
                {complaintStats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Total Tickets</span>
                      <p className="text-2xl font-black text-slate-900 mt-1">{complaintStats.total || 0}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-sm bg-amber-50/20">
                      <span className="text-[10px] uppercase font-bold text-amber-600">Pending Review</span>
                      <p className="text-2xl font-black text-amber-700 mt-1">{complaintStats.pending || 0}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm bg-blue-50/20">
                      <span className="text-[10px] uppercase font-bold text-blue-600">In Progress</span>
                      <p className="text-2xl font-black text-blue-700 mt-1">{complaintStats.in_progress || 0}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm bg-emerald-50/20">
                      <span className="text-[10px] uppercase font-bold text-emerald-600">Resolved</span>
                      <p className="text-2xl font-black text-emerald-700 mt-1">{complaintStats.resolved || 0}</p>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">All Student Complaints</h3>
                    <button onClick={loadTabData} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" /> Refresh
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="py-3 px-4">Ticket</th>
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Room / Block</th>
                          <th className="py-3 px-4">Title &amp; Notes</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {complaints.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="py-8 text-center text-slate-400">
                              No maintenance tickets logged yet.
                            </td>
                          </tr>
                        ) : (
                          complaints.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-bold text-slate-900">{c.ticket_number}</td>
                              <td className="py-3 px-4">{c.student_name} ({c.registration_number})</td>
                              <td className="py-3 px-4"><span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold">{c.category}</span></td>
                              <td className="py-3 px-4">{c.room_number ? `${c.room_number} (${c.block_name})` : c.block_name || 'Common'}</td>
                              <td className="py-3 px-4 max-w-xs truncate" title={c.description}>
                                <span className="font-semibold">{c.title}</span>
                                {c.resolution_notes && <p className="text-[10px] text-emerald-600 mt-0.5">&bull; {c.resolution_notes}</p>}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  c.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                                  c.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                  c.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {c.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right space-x-1">
                                {c.status === 'PENDING' && (
                                  <button
                                    onClick={() => handleUpdateStatus(c.id, 'IN_PROGRESS')}
                                    className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-bold hover:bg-blue-700"
                                  >
                                    Assign
                                  </button>
                                )}
                                {c.status === 'IN_PROGRESS' && (
                                  <button
                                    onClick={() => handleUpdateStatus(c.id, 'RESOLVED')}
                                    className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700"
                                  >
                                    Resolve
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              // STUDENT VIEW
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Submit Form */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-1 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-indigo-600" />
                    <span>Lodge Maintenance Request</span>
                  </h3>

                  <form onSubmit={handleCreateComplaint} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Issue Category</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                      >
                        <option value="ELECTRICAL">Electrical (Socket, Fan, Light)</option>
                        <option value="PLUMBING">Plumbing (Tap, Leakage, Washroom)</option>
                        <option value="FURNITURE">Furniture (Bed, Study Table, Wardrobe)</option>
                        <option value="CLEANLINESS">Cleanliness &amp; Housekeeping</option>
                        <option value="INTERNET">Internet / LAN Port</option>
                        <option value="OTHER">Other Issue</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Priority</label>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                      >
                        <option value="LOW">Low (Minor cosmetic issue)</option>
                        <option value="MEDIUM">Medium (Normal fault)</option>
                        <option value="HIGH">High (Urgent daily disruption)</option>
                        <option value="URGENT">Urgent (Safety hazard)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Title</label>
                      <input
                        type="text"
                        required
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="e.g. Ceiling fan making loud noise"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Description</label>
                      <textarea
                        required
                        rows="3"
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="Describe the exact location and symptom in detail..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                    >
                      Submit Ticket
                    </button>
                  </form>
                </div>

                {/* My Past Tickets */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">My Maintenance History</h3>
                  <div className="space-y-3">
                    {complaints.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs">
                        You have not submitted any maintenance requests yet.
                      </div>
                    ) : (
                      complaints.map((c) => (
                        <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs">{c.ticket_number}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              c.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                              c.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                              c.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {c.status}
                            </span>
                          </div>
                          <p className="font-bold text-slate-800 text-xs">{c.title}</p>
                          <p className="text-slate-600 text-xs leading-relaxed">{c.description}</p>
                          {c.resolution_notes && (
                            <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
                              <span className="font-bold">Staff Resolution:</span> {c.resolution_notes}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: FEES & BILLING MANAGEMENT                                   */}
        {/* ------------------------------------------------------------------ */}
        {token && activeTab === 'fees' && (
          <div className="space-y-6">
            {feeMsg.text && (
              <div className={`p-4 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                feeMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
              }`}>
                {feeMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                <span>{feeMsg.text}</span>
              </div>
            )}

            {isStaffMode ? (
              // STAFF VIEW (Fee Ledgers)
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Student Semester Invoices &amp; Balances</h3>
                  <button onClick={loadTabData} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Refresh
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Term</th>
                        <th className="py-3 px-4">Room Fee</th>
                        <th className="py-3 px-4">Total Amount</th>
                        <th className="py-3 px-4">Paid Amount</th>
                        <th className="py-3 px-4">Balance</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {adminFeeLedgers.length === 0 ? (
                        <tr><td colSpan="7" className="py-8 text-center text-slate-400">No student fee invoices generated yet.</td></tr>
                      ) : (
                        adminFeeLedgers.map((l) => (
                          <tr key={l.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-bold text-slate-900">{l.student_name} ({l.registration_number})</td>
                            <td className="py-3 px-4">{l.academic_term}</td>
                            <td className="py-3 px-4">₹{parseFloat(l.room_fee).toFixed(2)}</td>
                            <td className="py-3 px-4 font-bold">₹{parseFloat(l.total_amount).toFixed(2)}</td>
                            <td className="py-3 px-4 text-emerald-600 font-semibold">₹{parseFloat(l.paid_amount).toFixed(2)}</td>
                            <td className="py-3 px-4 text-red-600 font-bold">
                              ₹{Math.max(0, parseFloat(l.total_amount) - parseFloat(l.paid_amount)).toFixed(2)}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                l.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>{l.status}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // STUDENT VIEW
              feeLedger && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Financial Overview Cards */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Total Billed</span>
                        <p className="text-xl font-black text-slate-900 mt-1">₹{parseFloat(feeLedger.invoice.total_amount).toFixed(2)}</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm bg-emerald-50/20">
                        <span className="text-[10px] uppercase font-bold text-emerald-600">Total Paid</span>
                        <p className="text-xl font-black text-emerald-700 mt-1">₹{parseFloat(feeLedger.invoice.paid_amount).toFixed(2)}</p>
                      </div>
                      <div className="bg-white p-4 rounded-2xl border border-red-200 shadow-sm bg-red-50/20">
                        <span className="text-[10px] uppercase font-bold text-red-600">Dues Outstanding</span>
                        <p className="text-xl font-black text-red-700 mt-1">₹{feeLedger.outstanding_balance.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Itemized Fee Breakdown</h3>
                      <div className="divide-y divide-slate-100 text-xs">
                        <div className="py-2.5 flex justify-between">
                          <span className="text-slate-600">Room Accommodation Fee</span>
                          <span className="font-bold text-slate-900">₹{parseFloat(feeLedger.invoice.room_fee).toFixed(2)}</span>
                        </div>
                        <div className="py-2.5 flex justify-between">
                          <span className="text-slate-600">Mess Boarding Charges</span>
                          <span className="font-bold text-slate-900">₹{parseFloat(feeLedger.invoice.mess_fee).toFixed(2)}</span>
                        </div>
                        <div className="py-2.5 flex justify-between">
                          <span className="text-slate-600">Refundable Caution Deposit</span>
                          <span className="font-bold text-slate-900">₹{parseFloat(feeLedger.invoice.caution_deposit).toFixed(2)}</span>
                        </div>
                        <div className="py-2.5 flex justify-between">
                          <span className="text-slate-600">Hostel Utilities &amp; Maintenance</span>
                          <span className="font-bold text-slate-900">₹{parseFloat(feeLedger.invoice.utility_fee).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Simulator */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span>Online Fee Clearance</span>
                    </h3>

                    {feeLedger.is_cleared ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                        <h4 className="font-bold text-emerald-900 text-xs">Hostel Clearance Verified</h4>
                        <p className="text-[11px] text-emerald-700">All hostel dues are cleared for the semester.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleFeePayment} className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Payment Mode</label>
                          <select
                            value={paymentMode}
                            onChange={(e) => setPaymentMode(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                          >
                            <option value="UPI">UPI (Instant QR)</option>
                            <option value="CARD">Debit / Credit Card</option>
                            <option value="NET_BANKING">Net Banking</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                            Amount to Pay (Max: ₹{feeLedger.outstanding_balance.toFixed(2)})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            max={feeLedger.outstanding_balance + 0.01}
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            placeholder="e.g. 10000"
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                        >
                          Simulate Online Payment
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 3: MESS & MEAL MANAGEMENT                                      */}
        {/* ------------------------------------------------------------------ */}
        {token && activeTab === 'mess' && (
          <div className="space-y-6">
            {messMsg.text && (
              <div className={`p-4 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                messMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
              }`}>
                {messMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                <span>{messMsg.text}</span>
              </div>
            )}

            {/* Dietary Preference & Controls */}
            {!isStaffMode && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Dietary Preference</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Kitchen staff plan balanced meal portions based on your chosen diet.</p>
                </div>
                <div className="flex gap-2">
                  {['VEGETARIAN', 'NON_VEGETARIAN', 'JAIN'].map((diet) => (
                    <button
                      key={diet}
                      onClick={() => handleDietChange(diet)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        dietPreference === diet
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {diet}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly Menu Display */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Official 7-Day Hostel Meal Menu</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-100 text-xs">
                {messMenu.map((m) => (
                  <div key={m.id} className="p-4 space-y-3">
                    <span className="font-black text-slate-900 block border-b pb-1 text-[11px] uppercase tracking-wider">
                      {m.day_of_week}
                    </span>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Breakfast</span>
                      <p className="text-slate-700 text-[11px] mt-0.5">{m.breakfast}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Lunch</span>
                      <p className="text-slate-700 text-[11px] mt-0.5">{m.lunch}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Snacks</span>
                      <p className="text-slate-700 text-[11px] mt-0.5">{m.snacks}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Dinner</span>
                      <p className="text-slate-700 text-[11px] mt-0.5">{m.dinner}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mess Rebate Application Form & Tracker */}
            {!isStaffMode && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-1 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Apply for Mess Leave Rebate</h3>
                  <p className="text-xs text-slate-500">Departing campus for 3 or more days? Receive ₹150/day mess credit.</p>

                  <form onSubmit={handleApplyRebate} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Departure Date</label>
                      <input
                        type="date"
                        required
                        value={rebateStart}
                        onChange={(e) => setRebateStart(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Return Date</label>
                      <input
                        type="date"
                        required
                        value={rebateEnd}
                        onChange={(e) => setRebateEnd(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reason for Leave</label>
                      <input
                        type="text"
                        required
                        value={rebateReason}
                        onChange={(e) => setRebateReason(e.target.value)}
                        placeholder="e.g. Festival Vacation / Family Function"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                    >
                      Submit Rebate Request
                    </button>
                  </form>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">My Rebate Claims</h3>
                  <div className="space-y-2">
                    {myRebates.length === 0 ? (
                      <p className="text-center py-8 text-slate-400 text-xs">No rebate applications submitted yet.</p>
                    ) : (
                      myRebates.map((r) => (
                        <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-slate-900">{r.start_date} to {r.end_date}</span>
                            <span className="text-[11px] text-slate-500 block">{r.rebate_days} days &bull; {r.reason}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-emerald-600 block">₹{parseFloat(r.total_amount).toFixed(2)}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">{r.status}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 4: CURFEW & GATE-PASS MANAGEMENT                               */}
        {/* ------------------------------------------------------------------ */}
        {token && activeTab === 'gatepass' && (
          <div className="space-y-6">
            {gateMsg.text && (
              <div className={`p-4 rounded-xl text-xs font-medium border flex items-center gap-2 ${
                gateMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
              }`}>
                {gateMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                <span>{gateMsg.text}</span>
              </div>
            )}

            {isStaffMode ? (
              // STAFF / SECURITY VIEW
              <div className="space-y-4">
                {/* Security Gate Movement Terminal */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Security Gate Scanner</h3>
                    <p className="text-xs text-slate-500">Enter Pass ID to record physical exit or return.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Pass ID"
                      value={scanPassId}
                      onChange={(e) => setScanPassId(e.target.value)}
                      className="w-28 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                    />
                    <button
                      onClick={() => handleSecurityScan('CHECK_OUT')}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
                    >
                      Log Check-Out
                    </button>
                    <button
                      onClick={() => handleSecurityScan('CHECK_IN')}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
                    >
                      Log Check-In
                    </button>
                  </div>
                </div>

                {/* Gate Passes Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Active Gate Passes Roster</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="py-3 px-4">Pass ID</th>
                          <th className="py-3 px-4">Student</th>
                          <th className="py-3 px-4">Type</th>
                          <th className="py-3 px-4">Destination</th>
                          <th className="py-3 px-4">Expected Return</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {adminPasses.length === 0 ? (
                          <tr><td colSpan="6" className="py-8 text-center text-slate-400">No gate passes requested.</td></tr>
                        ) : (
                          adminPasses.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="py-3 px-4 font-bold text-slate-900">#{p.id} ({p.pass_number})</td>
                              <td className="py-3 px-4">{p.student_name} ({p.registration_number})</td>
                              <td className="py-3 px-4"><span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold">{p.pass_type}</span></td>
                              <td className="py-3 px-4">{p.destination}</td>
                              <td className="py-3 px-4">{p.expected_return_time}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  p.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                                  p.status === 'CHECKED_OUT' ? 'bg-blue-100 text-blue-800' :
                                  'bg-amber-100 text-amber-800'
                                }`}>{p.status}</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              // STUDENT VIEW
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-1 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Request Gate Pass</h3>
                  <p className="text-xs text-slate-500">Day pass curfew is strictly 10:00 PM.</p>

                  <form onSubmit={handleRequestPass} className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pass Type</label>
                      <select
                        value={passType}
                        onChange={(e) => setPassType(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                      >
                        <option value="DAY_PASS">Day Pass (Return by 10:00 PM)</option>
                        <option value="NIGHT_OUT">Night Out (Overnight leave)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Destination</label>
                      <input
                        type="text"
                        required
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="e.g. City Center Library"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Emergency Phone (10 digits)</label>
                      <input
                        type="tel"
                        required
                        pattern="[0-9]{10}"
                        value={contactNo}
                        onChange={(e) => setContactNo(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Departure Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={depTime}
                        onChange={(e) => setDepTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Expected Return Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={retTime}
                        onChange={(e) => setRetTime(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Purpose / Reason</label>
                      <input
                        type="text"
                        required
                        value={passReason}
                        onChange={(e) => setPassReason(e.target.value)}
                        placeholder="Reason for campus exit"
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                    >
                      Request Gate Pass
                    </button>
                  </form>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">My Passes History</h3>
                  <div className="space-y-3">
                    {myPasses.length === 0 ? (
                      <p className="text-center py-10 text-slate-400 text-xs">No gate passes requested.</p>
                    ) : (
                      myPasses.map((p) => (
                        <div key={p.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900 text-xs">#{p.id} ({p.pass_number})</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                              p.status === 'CHECKED_OUT' ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>{p.status}</span>
                          </div>
                          <p className="font-semibold text-xs text-slate-800">{p.destination} &bull; {p.reason}</p>
                          <p className="text-[11px] text-slate-500">Departure: {p.departure_time} | Expected Return: {p.expected_return_time}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        HostelHub &bull; Complete Management Suite
      </footer>
    </div>
  );
}
