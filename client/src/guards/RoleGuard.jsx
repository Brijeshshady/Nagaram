import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * RoleGuard — wraps routes that require specific roles
 * Usage: <RoleGuard roles={['super_admin', 'dept_manager']}><Page /></RoleGuard>
 */
export const RoleGuard = ({ children, roles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '100vh' }}>
        <div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

/**
 * AuthGuard — simply requires authentication
 */
export const AuthGuard = ({ children }) => {
  return <RoleGuard>{children}</RoleGuard>;
};

/**
 * GuestGuard — redirect authenticated users away from login/register
 */
export const GuestGuard = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
