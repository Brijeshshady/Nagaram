const Ward = require('../models/Ward');

const getWards = async (req, res, next) => {
  try {
    const wards = await Ward.find().sort({ number: 1 });
    res.json({ wards });
  } catch (error) {
    next(error);
  }
};

const createWard = async (req, res, next) => {
  try {
    const ward = await Ward.create(req.body);
    res.status(201).json({ message: 'Ward created successfully', ward });
  } catch (error) {
    next(error);
  }
};

const updateWard = async (req, res, next) => {
  try {
    const ward = await Ward.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!ward) return res.status(404).json({ message: 'Ward not found' });
    res.json({ message: 'Ward updated successfully', ward });
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

module.exports = { getWards, createWard, updateWard, deleteWard };
