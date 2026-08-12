const User = require('../models/User');
const Department = require('../models/Department');

const getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find().populate('managerId', 'name email phone');

    // Aggregate personnel counts and lists connected to each department
    const deptsWithStaff = await Promise.all(
      departments.map(async (dept) => {
        const staffUsers = await User.find({ department: dept._id, isActive: true })
          .select('name email role phone')
          .sort({ role: 1 });

        const deptObj = dept.toObject();
        deptObj.connectedPersonnel = staffUsers;
        deptObj.totalStaff = staffUsers.length;
        deptObj.supervisorsCount = staffUsers.filter((u) => u.role === 'supervisor').length;
        deptObj.workersCount = staffUsers.filter((u) => u.role === 'field_worker').length;
        return deptObj;
      })
    );

    res.json({ departments: deptsWithStaff });
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
