const express = require('express');
const { getWards, createWard, updateWard, deleteWard, getWardByLocation } = require('../controllers/wardController');
const auth = require('../middleware/auth');
const { roleOnly } = require('../middleware/rbac');
const { ROLES } = require('../config/permissions');

const router = express.Router();

router.use(auth);

router.get('/', getWards);
router.get('/locate', getWardByLocation);
router.post('/', roleOnly(ROLES.SUPER_ADMIN), createWard);
router.patch('/:id', roleOnly(ROLES.SUPER_ADMIN), updateWard);
router.delete('/:id', roleOnly(ROLES.SUPER_ADMIN), deleteWard);

module.exports = router;
