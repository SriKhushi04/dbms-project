import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/student/StudentDashboard';

export default function App() {
  const student = localStorage.getItem('hostelhub_student');

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<StudentDashboard />} />
      <Route
        path="*"
        element={<Navigate to={student ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
}
