const express = require('express');
const { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } = require('../controllers/announcementController');
const auth = require('../middleware/auth');
const { rbac, roleOnly } = require('../middleware/rbac');
const { PERMISSIONS, ROLES } = require('../config/permissions');

const router = express.Router();

router.use(auth);

router.get('/', getAnnouncements);
router.post('/', rbac(PERMISSIONS.CREATE_ANNOUNCEMENT), createAnnouncement);
router.patch('/:id', rbac(PERMISSIONS.CREATE_ANNOUNCEMENT), updateAnnouncement);
router.delete('/:id', rbac(PERMISSIONS.CREATE_ANNOUNCEMENT), deleteAnnouncement);

module.exports = router;
