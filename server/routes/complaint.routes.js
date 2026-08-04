const express = require('express');
const {
  createComplaint,
  getComplaints,
  getComplaintById,
  assignComplaint,
  updateComplaintStatus,
  verifyComplaint,
  submitFeedback,
  escalateComplaint,
} = require('../controllers/complaintController');
const auth = require('../middleware/auth');
const { rbac, roleOnly } = require('../middleware/rbac');
const { PERMISSIONS, ROLES } = require('../config/permissions');
const { uploadComplaintImages, uploadSingleImage } = require('../middleware/upload');

const router = express.Router();

// All routes require authentication
router.use(auth);

// Create complaint (Citizen only)
router.post('/', rbac(PERMISSIONS.CREATE_COMPLAINT), (req, res, next) => {
  req.uploadSubDir = 'complaints';
  next();
}, uploadComplaintImages, createComplaint);

// List complaints (role-filtered in controller)
router.get('/', getComplaints);

// Get complaint by ID
router.get('/:id', getComplaintById);

// Assign complaint (Super Admin, Dept Manager, Supervisor)
router.patch('/:id/assign', rbac(PERMISSIONS.ASSIGN_COMPLAINT, PERMISSIONS.ASSIGN_WORKERS), assignComplaint);

// Update status
router.patch('/:id/status', rbac(PERMISSIONS.UPDATE_COMPLAINT_STATUS, PERMISSIONS.UPDATE_TASK_STATUS), updateComplaintStatus);

// Verify with before/after image (Supervisor)
router.patch('/:id/verify', rbac(PERMISSIONS.VERIFY_COMPLAINT), (req, res, next) => {
  req.uploadSubDir = 'verification';
  next();
}, uploadSingleImage, verifyComplaint);

// Submit feedback (Citizen)
router.post('/:id/feedback', rbac(PERMISSIONS.SUBMIT_FEEDBACK), submitFeedback);

// Escalate
router.post('/:id/escalate', rbac(PERMISSIONS.ESCALATE_COMPLAINT), escalateComplaint);

module.exports = router;
