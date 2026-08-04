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

// Analytics
import Analytics from './pages/analytics/Analytics';

// Departments
import Departments from './pages/departments/Departments';

// Wards
import Wards from './pages/wards/Wards';

// Workforce
import Workforce from './pages/workforce/Workforce';

// Announcements & Rewards
import Announcements from './pages/announcements/Announcements';
import Rewards from './pages/rewards/Rewards';

// Settings
import Settings from './pages/settings/Settings';

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

            {/* Analytics (Admin & Manager roles) */}
            <Route path="/analytics" element={<RoleGuard roles={[ROLES.SUPER_ADMIN, ROLES.DEPT_MANAGER, ROLES.COMMISSIONER]}><Analytics /></RoleGuard>} />

            {/* Departments (Super Admin only) */}
            <Route path="/departments" element={<RoleGuard roles={[ROLES.SUPER_ADMIN]}><Departments /></RoleGuard>} />

            {/* Wards (Super Admin only) */}
            <Route path="/wards" element={<RoleGuard roles={[ROLES.SUPER_ADMIN]}><Wards /></RoleGuard>} />

            {/* Announcements */}
            <Route path="/announcements" element={<Announcements />} />

            {/* Rewards (Citizen only) */}
            <Route path="/rewards" element={<RoleGuard roles={[ROLES.CITIZEN]}><Rewards /></RoleGuard>} />

            {/* Settings (All authenticated users) */}
            <Route path="/settings" element={<Settings />} />

            {/* Workforce */}
            <Route path="/workforce" element={<RoleGuard roles={[ROLES.SUPER_ADMIN, ROLES.DEPT_MANAGER, ROLES.SUPERVISOR]}><Workforce /></RoleGuard>} />
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
