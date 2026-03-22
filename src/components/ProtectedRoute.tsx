import React from 'react';
import { Navigate } from 'react-router-dom';
import { getToken, getUser } from '../services/authService';

interface Props {
  children: React.ReactNode;
  requiredRole: 'admin' | 'creator' | ('admin' | 'creator')[];
  redirectTo: string;
}

export default function ProtectedRoute({ children, requiredRole, redirectTo }: Props) {
  const token = getToken();
  const user = getUser();

  if (!token || !user) return <Navigate to={redirectTo} replace />;

  const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  if (!allowed.includes(user.role as 'admin' | 'creator')) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
