const express = require('express');
const { getUsers, createUser, getUserById, updateUser, deleteUser } = require('../controllers/userController');
const auth = require('../middleware/auth');
const { roleOnly } = require('../middleware/rbac');
const { ROLES } = require('../config/permissions');

const router = express.Router();

// All routes require auth + Super Admin role
router.use(auth, roleOnly(ROLES.SUPER_ADMIN));

router.get('/', getUsers);
router.post('/', createUser);
router.get('/:id', getUserById);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
