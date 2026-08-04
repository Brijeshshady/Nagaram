// =============================================
// NAGARAM - Role-Based Access Control (RBAC)
// Central permissions configuration
// =============================================

const ROLES = {
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

// Permissions grouped by feature area
const PERMISSIONS = {
  // Complaint permissions
  CREATE_COMPLAINT: 'create_complaint',
  VIEW_OWN_COMPLAINTS: 'view_own_complaints',
  VIEW_DEPT_COMPLAINTS: 'view_dept_complaints',
  VIEW_ALL_COMPLAINTS: 'view_all_complaints',
  ASSIGN_COMPLAINT: 'assign_complaint',
  UPDATE_COMPLAINT_STATUS: 'update_complaint_status',
  VERIFY_COMPLAINT: 'verify_complaint',
  ESCALATE_COMPLAINT: 'escalate_complaint',
  SUBMIT_FEEDBACK: 'submit_feedback',

  // User management
  MANAGE_USERS: 'manage_users',
  VIEW_ALL_USERS: 'view_all_users',

  // Workforce
  VIEW_ASSIGNED_TASKS: 'view_assigned_tasks',
  ASSIGN_WORKERS: 'assign_workers',
  UPDATE_TASK_STATUS: 'update_task_status',
  UPLOAD_COMPLETION: 'upload_completion',
  MARK_COMPLETE: 'mark_complete',
  APPROVE_WORK: 'approve_work',

  // Department & Ward
  MANAGE_DEPARTMENTS: 'manage_departments',
  MANAGE_WARDS: 'manage_wards',
  VIEW_DEPT_PERFORMANCE: 'view_dept_performance',

  // Analytics & Reports
  VIEW_CITY_DASHBOARD: 'view_city_dashboard',
  VIEW_DEPT_DASHBOARD: 'view_dept_dashboard',
  VIEW_ANALYTICS: 'view_analytics',
  GENERATE_REPORTS: 'generate_reports',
  MONITOR_KPIS: 'monitor_kpis',

  // Announcements
  CREATE_ANNOUNCEMENT: 'create_announcement',
  VIEW_ANNOUNCEMENTS: 'view_announcements',

  // Rewards
  EARN_REWARDS: 'earn_rewards',
  MANAGE_REWARDS: 'manage_rewards',

  // AI & Settings
  CONFIGURE_AI: 'configure_ai',
  SYSTEM_SETTINGS: 'system_settings',

  // Notifications
  RECEIVE_NOTIFICATIONS: 'receive_notifications',

  // General
  VIEW_NEARBY_COMPLAINTS: 'view_nearby_complaints',
  NAVIGATE_TO_LOCATION: 'navigate_to_location',
};

// Role → Permissions mapping
const ROLE_PERMISSIONS = {
  [ROLES.CITIZEN]: [
    PERMISSIONS.CREATE_COMPLAINT,
    PERMISSIONS.VIEW_OWN_COMPLAINTS,
    PERMISSIONS.SUBMIT_FEEDBACK,
    PERMISSIONS.EARN_REWARDS,
    PERMISSIONS.VIEW_ANNOUNCEMENTS,
    PERMISSIONS.VIEW_NEARBY_COMPLAINTS,
    PERMISSIONS.RECEIVE_NOTIFICATIONS,
  ],

  [ROLES.SUPER_ADMIN]: [
    // Has ALL permissions
    ...Object.values(PERMISSIONS),
  ],

  [ROLES.DEPT_MANAGER]: [
    PERMISSIONS.VIEW_DEPT_COMPLAINTS,
    PERMISSIONS.VIEW_ALL_COMPLAINTS,
    PERMISSIONS.ASSIGN_COMPLAINT,
    PERMISSIONS.ESCALATE_COMPLAINT,
    PERMISSIONS.ASSIGN_WORKERS,
    PERMISSIONS.VIEW_DEPT_PERFORMANCE,
    PERMISSIONS.VIEW_DEPT_DASHBOARD,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.GENERATE_REPORTS,
    PERMISSIONS.MONITOR_KPIS,
    PERMISSIONS.VIEW_ANNOUNCEMENTS,
    PERMISSIONS.VIEW_NEARBY_COMPLAINTS,
    PERMISSIONS.RECEIVE_NOTIFICATIONS,
  ],

  [ROLES.SUPERVISOR]: [
    PERMISSIONS.VIEW_ASSIGNED_TASKS,
    PERMISSIONS.ASSIGN_WORKERS,
    PERMISSIONS.UPDATE_COMPLAINT_STATUS,
    PERMISSIONS.VERIFY_COMPLAINT,
    PERMISSIONS.APPROVE_WORK,
    PERMISSIONS.ESCALATE_COMPLAINT,
    PERMISSIONS.VIEW_ANNOUNCEMENTS,
    PERMISSIONS.VIEW_NEARBY_COMPLAINTS,
    PERMISSIONS.RECEIVE_NOTIFICATIONS,
  ],

  [ROLES.FIELD_WORKER]: [
    PERMISSIONS.VIEW_ASSIGNED_TASKS,
    PERMISSIONS.UPDATE_TASK_STATUS,
    PERMISSIONS.UPLOAD_COMPLETION,
    PERMISSIONS.MARK_COMPLETE,
    PERMISSIONS.NAVIGATE_TO_LOCATION,
    PERMISSIONS.VIEW_ANNOUNCEMENTS,
    PERMISSIONS.VIEW_NEARBY_COMPLAINTS,
    PERMISSIONS.RECEIVE_NOTIFICATIONS,
  ],

  [ROLES.COMMISSIONER]: [
    PERMISSIONS.VIEW_ALL_COMPLAINTS,
    PERMISSIONS.VIEW_CITY_DASHBOARD,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.GENERATE_REPORTS,
    PERMISSIONS.MONITOR_KPIS,
    PERMISSIONS.VIEW_ANNOUNCEMENTS,
    PERMISSIONS.RECEIVE_NOTIFICATIONS,
  ],

  [ROLES.AUDITOR]: [
    PERMISSIONS.VIEW_ALL_COMPLAINTS,
    PERMISSIONS.VERIFY_COMPLAINT,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.GENERATE_REPORTS,
    PERMISSIONS.VIEW_ANNOUNCEMENTS,
    PERMISSIONS.RECEIVE_NOTIFICATIONS,
  ],
};

/**
 * Check if a role has a specific permission
 */
const hasPermission = (role, permission) => {
  const rolePerms = ROLE_PERMISSIONS[role];
  if (!rolePerms) return false;
  return rolePerms.includes(permission);
};

/**
 * Get all permissions for a role
 */
const getPermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

module.exports = { ROLES, PERMISSIONS, ROLE_PERMISSIONS, hasPermission, getPermissions };
