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

// All other routes require auth + Super Admin role
router.use(auth, roleOnly(ROLES.SUPER_ADMIN));

router.get('/', getUsers);
router.post('/', createUser);
router.get('/:id', getUserById);
router.patch('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
