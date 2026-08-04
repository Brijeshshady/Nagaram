const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const { analyzeComplaint } = require('../services/aiService');
const { COMPLAINT_STATUS } = require('../config/categories');
const { ROLES } = require('../config/permissions');

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

    const complaint = await Complaint.create({
      title,
      description,
      category: finalCategory,
      images,
      gpsCoordinates: gps,
      address,
      citizenId: req.user._id,
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
      .populate('statusHistory.changedBy', 'name role');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Citizens can only view their own complaints
    if (req.user.role === ROLES.CITIZEN && !complaint.citizenId._id.equals(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ complaint });
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

module.exports = {
  createComplaint,
  getComplaints,
  getComplaintById,
  assignComplaint,
  updateComplaintStatus,
  verifyComplaint,
  submitFeedback,
  escalateComplaint,
};
