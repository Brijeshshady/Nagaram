const { hasPermission } = require('../config/permissions');

/**
 * RBAC middleware — checks if the user's role has the required permission(s)
 * @param  {...string} requiredPermissions - One or more permissions to check (OR logic)
 */
const rbac = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const userRole = req.user.role;

    // Check if user has ANY of the required permissions (OR logic)
    const hasAccess = requiredPermissions.some((perm) => hasPermission(userRole, perm));

    if (!hasAccess) {
      return res.status(403).json({
        message: 'Access denied. Insufficient permissions.',
        required: requiredPermissions,
        userRole,
      });
    }

    next();
  };
};

/**
 * Role-only middleware — checks if user has one of the specified roles
 * @param  {...string} allowedRoles - Roles that are allowed
 */
const roleOnly = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied. Role not authorized.',
        allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
};

module.exports = { rbac, roleOnly };
