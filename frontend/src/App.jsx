import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/student/StudentDashboard';
import AdminAllocationPage from './pages/AdminAllocationPage';
import HostelManagementPage from './pages/HostelManagementPage';

export default function App() {
  return (
    <Routes>
      {/* 1. New Landing Page (Root entry point) */}
      <Route path="/" element={<LandingPage />} />

      {/* 2. Room Allocation Section (Canonical URLs) */}
      <Route path="/allocation/login" element={<LoginPage />} />
      <Route path="/allocation/dashboard" element={<StudentDashboard />} />
      <Route path="/allocation/admin" element={<AdminAllocationPage />} />

      {/* Backwards-compatible redirects so existing links/bookmarks remain functional */}
      <Route path="/login" element={<Navigate to="/allocation/login" replace />} />
      <Route path="/dashboard" element={<Navigate to="/allocation/dashboard" replace />} />
      <Route path="/admin" element={<Navigate to="/allocation/admin" replace />} />

      {/* 3. Hostel Management Section (Blank isolated page) */}
      <Route path="/management" element={<HostelManagementPage />} />

      {/* 4. Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
