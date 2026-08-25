const User = require('../models/User');
const { ROLES } = require('../config/permissions');

/**
 * GET /api/users - List all users (filterable by role)
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, department, ward, isActive, page = 1, limit = 1000 } = req.query;

    const filter = {};
    if (role) filter.role = role;
    if (department) filter.department = department;
    if (ward) filter.ward = ward;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // Enforce department isolation for Department Managers
    if (req.user.role === ROLES.DEPT_MANAGER && req.user.department) {
      filter.department = req.user.department;
    }

    const parsedLimit = parseInt(limit) || 1000;
    const parsedPage = parseInt(page) || 1;

    const users = await User.find(filter)
      .select('-password')
      .populate('department', 'name code')
      .populate('ward', 'name number')
      .sort({ createdAt: -1 })
      .limit(parsedLimit)
      .skip((parsedPage - 1) * parsedLimit);

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        total,
        page: parsedPage,
        pages: Math.ceil(total / parsedLimit),
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

    const normalizedEmail = (email || '').toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({
      name: name?.trim(),
      email: normalizedEmail,
      phone: phone?.trim(),
      password,
      role: role || ROLES.CITIZEN,
      department: department && department !== '' ? department : undefined,
      ward: ward && ward !== '' ? ward : undefined,
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
    const { name, phone, role, department, ward, isActive, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();
    if (role) user.role = role;
    if (department !== undefined) user.department = department && department !== '' ? department : null;
    if (ward !== undefined) user.ward = ward && ward !== '' ? ward : null;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.password = password;

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
