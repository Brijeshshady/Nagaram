const express = require('express');
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);

module.exports = router;
