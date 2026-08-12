const Ward = require('../models/Ward');
const User = require('../models/User');

const getWards = async (req, res, next) => {
  try {
    const wards = await Ward.find().populate('departments').sort({ number: 1 });
    const councillors = await User.find({ role: 'ward_councillor' })
        .populate('department', 'name')
        .select('name email phone role department avatar ward');

    const wardsWithCouncillors = wards.map(w => {
      const wardObj = w.toObject();
      const councillor = councillors.find(c => c.ward && c.ward.toString() === w._id.toString());
      wardObj.councillor = councillor ? { _id: councillor._id, name: councillor.name, email: councillor.email, phone: councillor.phone, role: councillor.role, department: councillor.department } : null;
      return wardObj;
    });

    res.json({ wards: wardsWithCouncillors });
  } catch (error) {
    next(error);
  }
};

const createWard = async (req, res, next) => {
  try {
    let ward = await Ward.create(req.body);
    ward = await ward.populate('departments');
    const wardObj = ward.toObject();
    wardObj.councillor = null;
    res.status(201).json({ message: 'Ward created successfully', ward: wardObj });
  } catch (error) {
    next(error);
  }
};

const updateWard = async (req, res, next) => {
  try {
    const ward = await Ward.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('departments');
    if (!ward) return res.status(404).json({ message: 'Ward not found' });

    const councillor = await User.findOne({ role: 'ward_councillor', ward: ward._id })
      .populate('department', 'name')
      .select('name email phone role department avatar');
    const wardObj = ward.toObject();
    wardObj.councillor = councillor ? {
      _id: councillor._id,
      name: councillor.name,
      email: councillor.email,
      phone: councillor.phone,
      role: councillor.role,
      department: councillor.department,
      avatar: councillor.avatar
    } : null;

    res.json({ message: 'Ward updated successfully', ward: wardObj });
  } catch (error) {
    next(error);
  }
};

const deleteWard = async (req, res, next) => {
  try {
    const ward = await Ward.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!ward) return res.status(404).json({ message: 'Ward not found' });
    res.json({ message: 'Ward deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

// Point-in-polygon ray casting
const pointInPolygon = (lat, lng, coordinates) => {
  const polygon = coordinates[0]; // GeoJSON outer ring: [[lng, lat], ...]
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

const getWardByLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) return res.status(400).json({ message: 'lat and lng required' });

    const wards = await Ward.find({ isActive: true, 'boundaries.coordinates': { $exists: true } })
      .populate('departments');

    let matchedWard = null;
    for (const w of wards) {
      if (w.boundaries?.coordinates?.length > 0) {
        if (pointInPolygon(parseFloat(lat), parseFloat(lng), w.boundaries.coordinates)) {
          matchedWard = w;
          break;
        }
      }
    }

    if (!matchedWard) {
      return res.json({ ward: null, councillor: null, message: 'Location not within any ward boundary' });
    }

    const councillor = await User.findOne({ role: 'ward_councillor', ward: matchedWard._id })
      .populate('department', 'name')
      .select('name email phone role department avatar');

    const wardObj = matchedWard.toObject();
    res.json({
      ward: wardObj,
      councillor: councillor ? {
        _id: councillor._id,
        name: councillor.name,
        email: councillor.email,
        phone: councillor.phone,
        role: councillor.role,
        department: councillor.department,
      } : null,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getWards, createWard, updateWard, deleteWard, getWardByLocation };
