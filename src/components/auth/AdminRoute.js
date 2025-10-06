import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminRoute = () => {
  const { currentUser, isAdmin } = useAuth();
  const location = useLocation();

  console.log('AdminRoute - currentUser:', currentUser);
  console.log('AdminRoute - isAdmin:', isAdmin);

  if (!currentUser) {
    console.log('AdminRoute: No user, redirecting to login');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    console.log('AdminRoute: Not an admin, redirecting to home');
    return <Navigate to="/" replace />;
  }

  console.log('AdminRoute: Access granted');
  return <Outlet />;
};

export default AdminRoute;
