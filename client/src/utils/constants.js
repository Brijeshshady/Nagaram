// =============================================
// NAGARAM - Permissions & Constants (Frontend)
// Must match server/config/permissions.js
// =============================================

export const ROLES = {
  CITIZEN: 'citizen',
  SUPER_ADMIN: 'super_admin',
  DEPT_MANAGER: 'dept_manager',
  SUPERVISOR: 'supervisor',
  FIELD_WORKER: 'field_worker',
  COMMISSIONER: 'commissioner',
  EMERGENCY_OFFICER: 'emergency_officer',
  AUDITOR: 'auditor',
  SYSTEM_ADMIN: 'system_admin',
};

export const ROLE_LABELS = {
  citizen: 'Citizen',
  super_admin: 'Municipal Administrator',
  dept_manager: 'Department Manager',
  supervisor: 'Field Supervisor',
  field_worker: 'Field Worker',
  commissioner: 'City Commissioner',
  emergency_officer: 'Emergency Response Officer',
  auditor: 'Auditor / Quality Inspector',
  system_admin: 'System Administrator',
};

export const ROLE_COLORS = {
  citizen: '#4B5563',
  super_admin: '#ef4444',
  dept_manager: '#DC2626',
  supervisor: '#ef4444',
  field_worker: '#4B5563',
  commissioner: '#111827',
  auditor: '#4B5563',
};

export const STATUS_LABELS = {
  submitted: 'Submitted',
  ai_analyzing: 'AI Analyzing',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  verification: 'Verification',
  resolved: 'Resolved',
  closed: 'Closed',
  escalated: 'Escalated',
};

export const STATUS_COLORS = {
  submitted: 'var(--status-submitted)',
  ai_analyzing: 'var(--accent-tertiary)',
  assigned: 'var(--status-assigned)',
  in_progress: 'var(--status-in-progress)',
  verification: 'var(--status-verification)',
  resolved: 'var(--status-resolved)',
  closed: 'var(--status-closed)',
  escalated: 'var(--status-escalated)',
};

export const PRIORITY_LABELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const PRIORITY_COLORS = {
  low: 'var(--priority-low)',
  medium: 'var(--priority-medium)',
  high: 'var(--priority-high)',
  critical: 'var(--priority-critical)',
};

export const CATEGORY_LABELS = {
  garbage: 'Garbage',
  overflowing_dustbin: 'Overflowing Dustbin',
  illegal_dumping: 'Illegal Dumping',
  road_damage: 'Road Damage',
  drainage_blockage: 'Drainage Blockage',
  streetlight: 'Streetlight Issue',
  public_toilet: 'Public Toilet',
  water_leakage: 'Water Leakage',
  park_maintenance: 'Park Maintenance',
  others: 'Others',
};

export const CATEGORY_ICONS = {
  garbage: '🗑️',
  overflowing_dustbin: '🚮',
  illegal_dumping: '⚠️',
  road_damage: '🛣️',
  drainage_blockage: '🚿',
  streetlight: '💡',
  public_toilet: '🚻',
  water_leakage: '💧',
  park_maintenance: '🌳',
  others: '📋',
};

// Navigation items per role
export const NAV_ITEMS = {
  [ROLES.CITIZEN]: [
    { label: 'Dashboard', path: '/dashboard', icon: 'HiHome' },
    { label: 'Report Complaint', path: '/complaints/new', icon: 'HiPlus' },
    { label: 'My Complaints', path: '/complaints', icon: 'HiClipboardList' },
    { label: 'Rewards', path: '/rewards', icon: 'HiStar' },
    { label: 'Announcements', path: '/announcements', icon: 'HiSpeakerphone' },
  ],
  [ROLES.SUPER_ADMIN]: [
    { label: 'Dashboard', path: '/dashboard', icon: 'HiHome' },
    { label: 'Complaints', path: '/complaints', icon: 'HiClipboardList' },
    { label: 'Users', path: '/users', icon: 'HiUsers' },
    { label: 'Departments', path: '/departments', icon: 'HiOfficeBuilding' },
    { label: 'Wards', path: '/wards', icon: 'HiMap' },
    { label: 'Analytics', path: '/analytics', icon: 'HiChartBar' },
    { label: 'Announcements', path: '/announcements', icon: 'HiSpeakerphone' },
    { label: 'Settings', path: '/settings', icon: 'HiCog' },
  ],
  [ROLES.DEPT_MANAGER]: [
    { label: 'Dashboard', path: '/dashboard', icon: 'HiHome' },
    { label: 'Complaints', path: '/complaints', icon: 'HiClipboardList' },
    { label: 'My Team', path: '/workforce', icon: 'HiUsers' },
    { label: 'Analytics', path: '/analytics', icon: 'HiChartBar' },
    { label: 'Announcements', path: '/announcements', icon: 'HiSpeakerphone' },
  ],
  [ROLES.SUPERVISOR]: [
    { label: 'Dashboard', path: '/dashboard', icon: 'HiHome' },
    { label: 'Assigned Tasks', path: '/complaints', icon: 'HiClipboardList' },
    { label: 'My Workers', path: '/workforce', icon: 'HiUsers' },
    { label: 'Announcements', path: '/announcements', icon: 'HiSpeakerphone' },
  ],
  [ROLES.FIELD_WORKER]: [
    { label: 'Dashboard', path: '/dashboard', icon: 'HiHome' },
    { label: 'My Tasks', path: '/complaints', icon: 'HiClipboardList' },
    { label: 'Announcements', path: '/announcements', icon: 'HiSpeakerphone' },
  ],
};

export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const timeAgo = (date) => {
  if (!date) return '';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(date);
};
