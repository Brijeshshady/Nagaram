const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    // Array of points making up the route (can be lat/lng pairs)
    waypoints: [
      {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        // Optional reference to a complaint or dustbin
        pointType: { type: String, enum: ['complaint', 'dustbin', 'custom'], default: 'custom' },
        refId: { type: mongoose.Schema.Types.ObjectId },
        order: { type: Number },
      }
    ],
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    }
  },
  {
    timestamps: true,
  }
);

routeSchema.index({ workerId: 1, date: 1 });

module.exports = mongoose.model('Route', routeSchema);
