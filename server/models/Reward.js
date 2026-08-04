const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      enum: ['complaint_submitted', 'feedback_given', 'complaint_verified', 'streak_bonus', 'first_complaint'],
      required: true,
    },
    points: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
    },
    complaintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
    },
  },
  {
    timestamps: true,
  }
);

rewardSchema.index({ userId: 1 });

module.exports = mongoose.model('Reward', rewardSchema);
