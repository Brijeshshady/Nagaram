const mongoose = require('mongoose');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const Ward = require('../models/Ward');
const User = require('../models/User');
const { analyzeComplaint } = require('../services/aiService');
const { COMPLAINT_STATUS } = require('../config/categories');
const { ROLES } = require('../config/permissions');

// Ray-casting point-in-polygon
const pointInPolygon = (lat, lng, coordinates) => {
  const polygon = coordinates[0];
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

/**
 * POST /api/complaints - Create a new complaint (Citizen)
 */
const createComplaint = async (req, res, next) => {
  try {
    const { title, description, category, gpsCoordinates, address } = req.body;

    // Handle uploaded images
    const images = req.files ? req.files.map((f) => `/uploads/complaints/${f.filename}`) : [];

    // Parse GPS coordinates
    let gps = {};
    if (gpsCoordinates) {
      gps = typeof gpsCoordinates === 'string' ? JSON.parse(gpsCoordinates) : gpsCoordinates;
    }

    // Run AI analysis
    const aiResult = await analyzeComplaint(description, gps);

    // Use AI-detected category if user didn't select one, otherwise use user's choice
    const finalCategory = category || aiResult.detectedCategory;

    // Find department by code
    const dept = await Department.findOne({ code: aiResult.suggestedDepartment });

    // Find which ward the complaint falls in (point-in-polygon)
    let assignedWardId = null;
    if (gps.lat && gps.lng) {
      const wards = await Ward.find({ isActive: true, 'boundaries.coordinates': { $exists: true } });
      for (const w of wards) {
        if (w.boundaries?.coordinates?.length > 0) {
          if (pointInPolygon(gps.lat, gps.lng, w.boundaries.coordinates)) {
            assignedWardId = w._id;
            break;
          }
        }
      }
    }

    const complaint = await Complaint.create({
      title,
      description,
      category: finalCategory,
      images,
      gpsCoordinates: gps,
      address,
      citizenId: req.user._id,
      ward: assignedWardId,
      priority: aiResult.suggestedPriority,
      assignedDepartment: dept ? dept._id : null,
      aiAnalysis: {
        detectedCategory: aiResult.detectedCategory,
        confidence: aiResult.confidence,
        suggestedPriority: aiResult.suggestedPriority,
        suggestedDepartment: aiResult.suggestedDepartment,
        isDuplicate: aiResult.isDuplicate,
        duplicateOf: aiResult.duplicateOf,
      },
      statusHistory: [
        {
          status: COMPLAINT_STATUS.SUBMITTED,
          changedBy: req.user._id,
          timestamp: new Date(),
          note: 'Complaint submitted by citizen',
        },
      ],
    });

    await complaint.populate('citizenId', 'name email');
    await complaint.populate('assignedDepartment', 'name code');

    res.status(201).json({
      message: 'Complaint submitted successfully',
      complaint,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/complaints - List complaints (role-filtered)
 */
const getComplaints = async (req, res, next) => {
  try {
    const { status, category, priority, ward, page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (ward) filter.ward = ward;

    // Role-based filtering
    const userRole = req.user.role;
    if (userRole === ROLES.CITIZEN) {
      filter.citizenId = req.user._id;
    } else if (userRole === ROLES.DEPT_MANAGER) {
      if (req.user.department) {
        filter.assignedDepartment = req.user.department;
      }
    } else if (userRole === ROLES.SUPERVISOR) {
      filter.assignedSupervisor = req.user._id;
    } else if (userRole === ROLES.FIELD_WORKER) {
      filter.assignedWorker = req.user._id;
    } else if (userRole === ROLES.WARD_COUNCILLOR) {
      if (req.user.ward) {
        filter.ward = req.user.ward;
      } else {
        filter.ward = new mongoose.Types.ObjectId(); // matches nothing
      }
    }
    // Super Admin, Commissioner, Auditor see all complaints (no additional filter)

    const complaints = await Complaint.find(filter)
      .populate('citizenId', 'name email phone')
      .populate('assignedDepartment', 'name code')
      .populate('assignedSupervisor', 'name')
      .populate('assignedWorker', 'name')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Complaint.countDocuments(filter);

    res.json({
      complaints,
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
 * GET /api/complaints/:id - Get complaint details
 */
const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('citizenId', 'name email phone')
      .populate('assignedDepartment', 'name code')
      .populate('assignedSupervisor', 'name email phone')
      .populate('assignedWorker', 'name email phone')
      .populate('statusHistory.changedBy', 'name role')
      .populate('ward');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Citizens can only view their own complaints
    if (req.user.role === ROLES.CITIZEN && !complaint.citizenId._id.equals(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Ward Councillors can only view complaints in their own ward
    if (req.user.role === ROLES.WARD_COUNCILLOR && 
        (!complaint.ward || !complaint.ward._id.equals(req.user.ward))) {
      return res.status(403).json({ message: 'Access denied: Complaint is not in your ward' });
    }

    // Find the ward councillor for this ward
    let councillor = null;
    if (complaint.ward) {
      councillor = await User.findOne({
        role: ROLES.WARD_COUNCILLOR,
        ward: complaint.ward._id
      }).select('name email phone');
    }

    const complaintObj = complaint.toObject();
    complaintObj.councillor = councillor;

    res.json({ complaint: complaintObj });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/complaints/:id/assign - Assign complaint
 */
const assignComplaint = async (req, res, next) => {
  try {
    const { assignedDepartment, assignedSupervisor, assignedWorker } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    if (assignedDepartment) complaint.assignedDepartment = assignedDepartment;
    if (assignedSupervisor) complaint.assignedSupervisor = assignedSupervisor;
    if (assignedWorker) complaint.assignedWorker = assignedWorker;

    complaint.status = COMPLAINT_STATUS.ASSIGNED;
    complaint._statusChangedBy = req.user._id;
    complaint._statusNote = 'Complaint assigned';

    await complaint.save();
    await complaint.populate('assignedDepartment', 'name code');
    await complaint.populate('assignedSupervisor', 'name');
    await complaint.populate('assignedWorker', 'name');

    res.json({ message: 'Complaint assigned', complaint });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/complaints/:id/status - Update complaint status
 */
const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    complaint.status = status;
    complaint._statusChangedBy = req.user._id;
    complaint._statusNote = note || '';

    if (status === COMPLAINT_STATUS.RESOLVED) {
      complaint.resolvedAt = new Date();
    }

    await complaint.save();

    res.json({ message: 'Status updated', complaint });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/complaints/:id/verify - Upload before/after images
 */
const verifyComplaint = async (req, res, next) => {
  try {
    const { type } = req.body; // 'before' or 'after'
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    if (req.file) {
      const imagePath = `/uploads/verification/${req.file.filename}`;
      if (type === 'before') {
        complaint.beforeImage = imagePath;
      } else {
        complaint.afterImage = imagePath;
        complaint.status = COMPLAINT_STATUS.VERIFICATION;
        complaint._statusChangedBy = req.user._id;
        complaint._statusNote = 'After-image uploaded, pending verification';
      }
    }

    await complaint.save();
    res.json({ message: 'Verification image uploaded', complaint });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/complaints/:id/feedback - Citizen submits feedback
 */
const submitFeedback = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    if (!complaint.citizenId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the reporting citizen can give feedback' });
    }

    complaint.feedback = { rating, comment };
    complaint.status = COMPLAINT_STATUS.CLOSED;
    complaint._statusChangedBy = req.user._id;
    complaint._statusNote = `Citizen feedback: ${rating}/5`;

    await complaint.save();

    res.json({ message: 'Feedback submitted, complaint closed', complaint });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/complaints/:id/escalate - Escalate complaint
 */
const escalateComplaint = async (req, res, next) => {
  try {
    const { note } = req.body;

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    complaint.status = COMPLAINT_STATUS.ESCALATED;
    complaint._statusChangedBy = req.user._id;
    complaint._statusNote = note || 'Complaint escalated';

    await complaint.save();

    res.json({ message: 'Complaint escalated', complaint });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/complaints/daily-updates - Get today's work updates
 */
const getDailyUpdates = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filter = {
      'statusHistory.timestamp': { $gte: today }
    };

    if (req.user.role === ROLES.DEPT_MANAGER && req.user.department) {
      filter.assignedDepartment = req.user.department;
    }

    const complaints = await Complaint.find(filter)
      .populate('statusHistory.changedBy', 'name role')
      .select('title complaintId statusHistory');

    let updates = [];
    complaints.forEach((comp) => {
      comp.statusHistory.forEach((history) => {
        if (history.timestamp >= today && history.changedBy) {
          updates.push({
            id: history._id || Math.random().toString(),
            complaintId: comp.complaintId,
            complaintDbId: comp._id,
            title: comp.title,
            status: history.status,
            changedBy: history.changedBy.name,
            role: history.changedBy.role,
            timestamp: history.timestamp,
            note: history.note
          });
        }
      });
    });

    updates.sort((a, b) => b.timestamp - a.timestamp);

    res.json({ updates });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComplaint,
  getComplaints,
  getComplaintById,
  assignComplaint,
  updateComplaintStatus,
  verifyComplaint,
  submitFeedback,
  escalateComplaint,
  getDailyUpdates,
};
