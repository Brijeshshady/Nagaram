const express = require('express');
const { getDepartments, createDepartment, updateDepartment, deleteDepartment } = require('../controllers/departmentController');
const auth = require('../middleware/auth');
const { rbac, roleOnly } = require('../middleware/rbac');
const { PERMISSIONS, ROLES } = require('../config/permissions');

const router = express.Router();

router.use(auth);

router.get('/', getDepartments);
router.post('/', roleOnly(ROLES.SUPER_ADMIN), createDepartment);
router.patch('/:id', roleOnly(ROLES.SUPER_ADMIN), updateDepartment);
router.delete('/:id', roleOnly(ROLES.SUPER_ADMIN), deleteDepartment);

module.exports = router;
