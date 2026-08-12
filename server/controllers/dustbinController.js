const Dustbin = require('../models/Dustbin');
const { ROLES } = require('../config/permissions');

const getDustbins = async (req, res, next) => {
  try {
    const { department, ward } = req.query;
    const filter = { isActive: true };
    if (department) filter.department = department;
    if (ward) filter.ward = ward;

    const dustbins = await Dustbin.find(filter)
      .populate('cleanedBy', 'name phone')
      .populate('department', 'name code')
      .populate('ward', 'name number');
      
    res.json({ dustbins });
  } catch (error) {
    next(error);
  }
};

const createDustbin = async (req, res, next) => {
  try {
    const { lat, lng, address, capacity, department, ward } = req.body;
    const dustbin = await Dustbin.create({
      gpsCoordinates: { lat, lng },
      address,
      capacity: capacity || 0,
      department,
      ward
    });
    await dustbin.populate('department', 'name code');
    res.status(201).json({ message: 'Dustbin created', dustbin });
  } catch (error) {
    next(error);
  }
};

const updateDustbin = async (req, res, next) => {
  try {
    const dustbin = await Dustbin.findById(req.params.id);
    if (!dustbin) return res.status(404).json({ message: 'Dustbin not found' });

    const { capacity, isCleaned, lat, lng, address } = req.body;

    if (capacity !== undefined) dustbin.capacity = capacity;
    if (address !== undefined) dustbin.address = address;
    if (lat !== undefined && lng !== undefined) {
      dustbin.gpsCoordinates = { lat, lng };
    }

    if (isCleaned) {
      dustbin.capacity = 0;
      dustbin.lastCleanedAt = new Date();
      dustbin.cleanedBy = req.user._id;
    }

    await dustbin.save();
    await dustbin.populate('cleanedBy', 'name phone');
    res.json({ message: 'Dustbin updated', dustbin });
  } catch (error) {
    next(error);
  }
};

const deleteDustbin = async (req, res, next) => {
  try {
    const dustbin = await Dustbin.findById(req.params.id);
    if (!dustbin) return res.status(404).json({ message: 'Dustbin not found' });
    
    dustbin.isActive = false;
    await dustbin.save();
    res.json({ message: 'Dustbin removed' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDustbins, createDustbin, updateDustbin, deleteDustbin };
