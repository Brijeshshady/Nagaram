const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const auth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', auth, getMe);

module.exports = router;
