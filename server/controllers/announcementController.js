const Announcement = require('../models/Announcement');

const getAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.find({ isActive: true })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ announcements });
  } catch (error) {
    next(error);
  }
};

const createAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ message: 'Announcement created', announcement });
  } catch (error) {
    next(error);
  }
};

const updateAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    res.json({ message: 'Announcement updated', announcement });
  } catch (error) {
    next(error);
  }
};

const deleteAnnouncement = async (req, res, next) => {
  try {
    await Announcement.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement };
