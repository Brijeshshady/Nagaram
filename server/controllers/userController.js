const User = require('../models/User');
const { ROLES } = require('../config/permissions');

/**
 * GET /api/users - List all users (filterable by role)
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, department, ward, isActive, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (department) filter.department = department;
    if (ward) filter.ward = ward;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // Enforce department isolation for Department Managers
    if (req.user.role === ROLES.DEPT_MANAGER && req.user.department) {
      filter.department = req.user.department;
    }

    const users = await User.find(filter)
      .select('-password')
      .populate('department', 'name code')
      .populate('ward', 'name number')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users - Create user with any role (Super Admin only)
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, phone, password, role, department, ward } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email,
      phone,
      password,
      role: role || ROLES.CITIZEN,
      department,
      ward,
    });

    res.status(201).json({
      message: `User created with role: ${user.role}`,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:id - Get user by ID
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('department', 'name code')
      .populate('ward', 'name number');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/:id - Update user
 */
const updateUser = async (req, res, next) => {
  try {
    const { name, phone, role, department, ward, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (department !== undefined) user.department = department || null;
    if (ward !== undefined) user.ward = ward || null;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.json({
      message: 'User updated',
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/:id - Deactivate user (soft delete)
 */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting self
    if (user._id.equals(req.user._id)) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    user.isActive = false;
    await user.save();

    res.json({ message: 'User deactivated' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, createUser, getUserById, updateUser, deleteUser };
