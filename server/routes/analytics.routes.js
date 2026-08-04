const express = require('express');
const { getOverview, getByCategory, getTrends, getDepartmentAnalytics } = require('../controllers/analyticsController');
const auth = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { PERMISSIONS } = require('../config/permissions');

const router = express.Router();

router.use(auth);

router.get('/overview', rbac(PERMISSIONS.VIEW_CITY_DASHBOARD, PERMISSIONS.VIEW_ANALYTICS, PERMISSIONS.MONITOR_KPIS), getOverview);
router.get('/by-category', rbac(PERMISSIONS.VIEW_ANALYTICS, PERMISSIONS.VIEW_CITY_DASHBOARD), getByCategory);
router.get('/trends', rbac(PERMISSIONS.VIEW_ANALYTICS, PERMISSIONS.VIEW_CITY_DASHBOARD), getTrends);
router.get('/department/:id', rbac(PERMISSIONS.VIEW_DEPT_PERFORMANCE, PERMISSIONS.VIEW_ANALYTICS), getDepartmentAnalytics);

module.exports = router;
