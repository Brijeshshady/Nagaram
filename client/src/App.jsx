import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { AuthGuard, GuestGuard, RoleGuard } from './guards/RoleGuard';
import { ROLES } from './utils/constants';

// Layout
import AppShell from './components/layout/AppShell';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Dashboard
import Dashboard from './pages/dashboard/Dashboard';

// User Management
import UserManagement from './pages/users/UserManagement';

// Complaints
import ReportComplaint from './pages/complaints/ReportComplaint';
import ComplaintList from './pages/complaints/ComplaintList';
import ComplaintDetail from './pages/complaints/ComplaintDetail';

// Shared
import { NotFound, Unauthorized } from './pages/shared/ErrorPages';

// Styles
import './styles/global.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<GuestGuard><Login /></GuestGuard>} />
          <Route path="/register" element={<GuestGuard><Register /></GuestGuard>} />

          {/* Protected Routes — inside AppShell */}
          <Route element={<AuthGuard><AppShell /></AuthGuard>}>
            {/* Universal Dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* User Management (Super Admin only) */}
            <Route path="/users" element={<RoleGuard roles={[ROLES.SUPER_ADMIN]}><UserManagement /></RoleGuard>} />

            {/* Complaints */}
            <Route path="/complaints" element={<ComplaintList />} />
            <Route path="/complaints/new" element={<RoleGuard roles={[ROLES.CITIZEN]}><ReportComplaint /></RoleGuard>} />
            <Route path="/complaints/:id" element={<ComplaintDetail />} />

            {/* Users (Super Admin only) */}
            {/* TODO: Phase 2 - User management pages */}

            {/* Departments (Super Admin) */}
            {/* TODO: Phase 5 - Department pages */}

            {/* Analytics (Admin roles) */}
            {/* TODO: Phase 4 - Analytics pages */}

            {/* Announcements (all roles view, admin creates) */}
            {/* TODO: Phase 6 - Announcement pages */}

            {/* Rewards (Citizen) */}
            {/* TODO: Phase 6 - Rewards pages */}

            {/* Settings (Admin) */}
            {/* TODO: Phase 7 - Settings pages */}

            {/* Workforce */}
            {/* TODO: Phase 5 - Workforce pages */}
          </Route>

          {/* Error pages */}
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>

      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a2035',
            color: '#f1f5f9',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            fontFamily: 'Inter, sans-serif',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#1a2035' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#1a2035' },
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;
