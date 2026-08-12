const express = require('express');
const { getWorkerRoute, assignRoute, autoCalculateRoute } = require('../controllers/routeController');
const auth = require('../middleware/auth');
const { roleOnly } = require('../middleware/rbac');
const { ROLES } = require('../config/permissions');

const router = express.Router();

router.use(auth);

// Worker or manager can fetch a route
router.get('/', getWorkerRoute);

// Managers and Supervisors can assign and auto-calculate
router.post('/assign', roleOnly([ROLES.SUPER_ADMIN, ROLES.DEPT_MANAGER, ROLES.SUPERVISOR]), assignRoute);
router.post('/auto-calculate', roleOnly([ROLES.SUPER_ADMIN, ROLES.DEPT_MANAGER, ROLES.SUPERVISOR]), autoCalculateRoute);

module.exports = router;
