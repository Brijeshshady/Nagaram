const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['complaint_update', 'assignment', 'announcement', 'reward', 'escalation', 'system'],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    link: {
      type: String,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
