const Department = require('../models/Department');

const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find().populate('managerId', 'name email');
    res.json({ departments });
  } catch (error) {
    next(error);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const department = await Department.create(req.body);
    res.status(201).json({ message: 'Department created', department });
  } catch (error) {
    next(error);
  }
};

const updateDepartment = async (req, res, next) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json({ message: 'Department updated', department });
  } catch (error) {
    next(error);
  }
};

const deleteDepartment = async (req, res, next) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json({ message: 'Department deactivated' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDepartments, createDepartment, updateDepartment, deleteDepartment };
