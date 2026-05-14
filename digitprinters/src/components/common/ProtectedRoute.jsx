import { Navigate, Outlet, useLocation } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

const logProtectedRoute = (msg, data) => {
  console.info(`[ProtectedRoute] ${msg}`, {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

export default function ProtectedRoute() {
  const { isAuthenticated, loading, loginStatus, error } = useAuth();
  const location = useLocation();

  logProtectedRoute('ProtectedRoute check', {
    path: location.pathname,
    isAuthenticated,
    loading,
    loginStatus,
    hasError: !!error,
  });

  // Show loading spinner while checking authentication
  if (loading) {
    logProtectedRoute('Still loading, showing spinner', { path: location.pathname });
    return <LoadingSpinner fullScreen />;
  }

  // Redirect to home if not authenticated
  if (!isAuthenticated) {
    logProtectedRoute('User not authenticated, redirecting to home', {
      path: location.pathname,
      loginStatus,
      attemptedPath: location.pathname,
    });
    // Store the attempted path so we can redirect after login
    const redirectTo = location.pathname + location.search;
    localStorage.setItem('deriv_post_login_redirect', redirectTo);
    return <Navigate to="/" replace />;
  }

  logProtectedRoute('Access granted to protected route', {
    path: location.pathname,
  });

  // User is authenticated, render the protected component
  return <Outlet />;
}
