const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verify JWT token and attach user to request
 */
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token provided. Access denied.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'User not found. Token invalid.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated. Contact admin.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ message: 'Invalid token. Access denied.' });
  }
};

module.exports = auth;
