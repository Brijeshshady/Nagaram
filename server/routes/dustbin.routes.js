const express = require('express');
const { getDustbins, createDustbin, updateDustbin, deleteDustbin } = require('../controllers/dustbinController');
const auth = require('../middleware/auth');
const { roleOnly } = require('../middleware/rbac');
const { ROLES } = require('../config/permissions');

const router = express.Router();

router.use(auth);

// All authenticated users can view dustbins
router.get('/', getDustbins);

// Only Managers and Supervisors can modify dustbins
router.post('/', roleOnly([ROLES.SUPER_ADMIN, ROLES.DEPT_MANAGER, ROLES.SUPERVISOR]), createDustbin);
router.patch('/:id', roleOnly([ROLES.SUPER_ADMIN, ROLES.DEPT_MANAGER, ROLES.SUPERVISOR]), updateDustbin);
router.delete('/:id', roleOnly([ROLES.SUPER_ADMIN, ROLES.DEPT_MANAGER]), deleteDustbin);

module.exports = router;
