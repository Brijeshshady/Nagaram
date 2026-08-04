const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { COMPLAINT_STATUS, PRIORITY_LEVELS, COMPLAINT_CATEGORIES } = require('../config/categories');

/**
 * GET /api/analytics/overview - City-wide statistics
 */
const getOverview = async (req, res, next) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const resolvedComplaints = await Complaint.countDocuments({ status: COMPLAINT_STATUS.RESOLVED });
    const closedComplaints = await Complaint.countDocuments({ status: COMPLAINT_STATUS.CLOSED });
    const pendingComplaints = await Complaint.countDocuments({
      status: { $in: [COMPLAINT_STATUS.SUBMITTED, COMPLAINT_STATUS.ASSIGNED, COMPLAINT_STATUS.IN_PROGRESS] },
    });
    const escalatedComplaints = await Complaint.countDocuments({ status: COMPLAINT_STATUS.ESCALATED });

    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayComplaints = await Complaint.countDocuments({ createdAt: { $gte: today } });
    const todayResolved = await Complaint.countDocuments({ resolvedAt: { $gte: today } });

    // Average resolution time (in hours)
    const resolvedWithTime = await Complaint.find({
      resolvedAt: { $exists: true },
    }).select('createdAt resolvedAt');

    let avgResolutionTime = 0;
    if (resolvedWithTime.length > 0) {
      const totalTime = resolvedWithTime.reduce((sum, c) => {
        return sum + (c.resolvedAt - c.createdAt);
      }, 0);
      avgResolutionTime = Math.round(totalTime / resolvedWithTime.length / (1000 * 60 * 60)); // in hours
    }

    // Active workforce
    const activeWorkers = await User.countDocuments({ role: 'field_worker', isActive: true });

    // Complaints by priority
    const byPriority = {};
    for (const p of Object.values(PRIORITY_LEVELS)) {
      byPriority[p] = await Complaint.countDocuments({ priority: p });
    }

    res.json({
      totalComplaints,
      resolvedComplaints,
      closedComplaints,
      pendingComplaints,
      escalatedComplaints,
      todayComplaints,
      todayResolved,
      avgResolutionTime,
      activeWorkers,
      byPriority,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/by-category - Complaints grouped by category
 */
const getByCategory = async (req, res, next) => {
  try {
    const result = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const data = result.map((r) => ({
      category: r._id,
      label: COMPLAINT_CATEGORIES[r._id]?.label || r._id,
      icon: COMPLAINT_CATEGORIES[r._id]?.icon || '📋',
      count: r.count,
    }));

    res.json({ data });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/trends - Complaint trends over time (last 30 days)
 */
const getTrends = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await Complaint.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ data: result.map((r) => ({ date: r._id, count: r.count })) });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/department/:id - Department performance
 */
const getDepartmentAnalytics = async (req, res, next) => {
  try {
    const deptId = req.params.id;

    const total = await Complaint.countDocuments({ assignedDepartment: deptId });
    const resolved = await Complaint.countDocuments({ assignedDepartment: deptId, status: COMPLAINT_STATUS.RESOLVED });
    const pending = await Complaint.countDocuments({
      assignedDepartment: deptId,
      status: { $in: [COMPLAINT_STATUS.SUBMITTED, COMPLAINT_STATUS.ASSIGNED, COMPLAINT_STATUS.IN_PROGRESS] },
    });

    res.json({ total, resolved, pending, resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0 });
  } catch (error) {
    next(error);
  }
};

module.exports = { getOverview, getByCategory, getTrends, getDepartmentAnalytics };
