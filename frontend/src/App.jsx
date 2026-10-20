import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';

// Student Portal
import StudentLayout from './layouts/StudentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import GroupManagement from './pages/student/GroupManagement';
import RoomPreferencePicker from './pages/student/RoomPreferencePicker';
import AllocationResult from './pages/student/AllocationResult';

// Admin Portal
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import RoomInventory from './pages/admin/RoomInventory';
import ApplicationsReview from './pages/admin/ApplicationsReview';
import AllocationEngineControl from './pages/admin/AllocationEngineControl';
import AuditLogs from './pages/admin/AuditLogs';

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Student Portal Routes */}
      <Route path="/student" element={<StudentLayout />}>
        <Route index element={<StudentDashboard />} />
        <Route path="group" element={<GroupManagement />} />
        <Route path="preferences" element={<RoomPreferencePicker />} />
        <Route path="result" element={<AllocationResult />} />
      </Route>

      {/* Admin Portal Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="rooms" element={<RoomInventory />} />
        <Route path="applications" element={<ApplicationsReview />} />
        <Route path="allocation" element={<AllocationEngineControl />} />
        <Route path="audit" element={<AuditLogs />} />
      </Route>

      {/* Root Redirection */}
      <Route
        path="*"
        element={
          user ? (
            user.role === 'ADMIN' ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/student" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

