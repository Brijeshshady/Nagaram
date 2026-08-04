const mongoose = require('mongoose');
const { COMPLAINT_STATUS, PRIORITY_LEVELS } = require('../config/categories');

const complaintSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      unique: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
    },
    images: [
      {
        type: String,
      },
    ],
    gpsCoordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    address: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(COMPLAINT_STATUS),
      default: COMPLAINT_STATUS.SUBMITTED,
    },
    priority: {
      type: String,
      enum: Object.values(PRIORITY_LEVELS),
      default: PRIORITY_LEVELS.MEDIUM,
    },
    citizenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    assignedSupervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    assignedWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    ward: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ward',
    },
    aiAnalysis: {
      detectedCategory: String,
      confidence: Number,
      suggestedPriority: String,
      suggestedDepartment: String,
      isDuplicate: { type: Boolean, default: false },
      duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
    },
    beforeImage: {
      type: String,
    },
    afterImage: {
      type: String,
    },
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, trim: true, maxlength: 500 },
    },
    statusHistory: [
      {
        status: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
    escalatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate complaint ID before saving
complaintSchema.pre('save', async function (next) {
  if (!this.complaintId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Complaint').countDocuments();
    this.complaintId = `NAG-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  // Add to status history on status change
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      changedBy: this._statusChangedBy || this.citizenId,
      timestamp: new Date(),
      note: this._statusNote || '',
    });
  }

  next();
});

// Index for geo queries
complaintSchema.index({ 'gpsCoordinates.lat': 1, 'gpsCoordinates.lng': 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ citizenId: 1 });
complaintSchema.index({ assignedWorker: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
