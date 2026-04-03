// import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Admin
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';

// Creator
import CreatorLogin from './pages/creator/CreatorLogin';
import CreatorDashboard from './pages/creator/CreatorDashboard';

// Route guard
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Admin ── */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin" redirectTo="/admin/login">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* ── Creator ── */}
        <Route path="/creator/login" element={<CreatorLogin />} />
        <Route
          path="/creator"
          element={
            <ProtectedRoute requiredRole="creator" redirectTo="/creator/login">
              <CreatorDashboard />
            </ProtectedRoute>
          }
        />

        {/* ── Default ── */}
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
