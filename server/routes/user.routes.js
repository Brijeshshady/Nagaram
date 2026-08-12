const express = require('express');
const { getUsers, createUser, getUserById, updateUser, deleteUser } = require('../controllers/userController');
const auth = require('../middleware/auth');
const { roleOnly } = require('../middleware/rbac');
const { ROLES } = require('../config/permissions');
const { uploadAvatar } = require('../middleware/upload');

const router = express.Router();

// Allow any authenticated user to update their own profile / avatar
router.patch('/profile/avatar', auth, (req, res, next) => {
  req.uploadSubDir = 'avatars';
  next();
}, uploadAvatar, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image file' });
    }
    const user = req.user;
    user.avatar = `/uploads/avatars/${req.file.filename}`;
    await user.save();
    res.json({ message: 'Avatar updated successfully', avatar: user.avatar });
  } catch (error) {
    next(error);
  }
});

// All other routes require auth
router.use(auth);

// Dept Managers can get users (to assign supervisors), but only Super Admin can create/update/delete
router.get('/', roleOnly(ROLES.SUPER_ADMIN, ROLES.DEPT_MANAGER), getUsers);
router.post('/', roleOnly(ROLES.SUPER_ADMIN), createUser);
router.get('/:id', roleOnly(ROLES.SUPER_ADMIN, ROLES.DEPT_MANAGER), getUserById);
router.patch('/:id', roleOnly(ROLES.SUPER_ADMIN), updateUser);
router.delete('/:id', roleOnly(ROLES.SUPER_ADMIN), deleteUser);

module.exports = router;
