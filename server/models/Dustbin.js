const mongoose = require('mongoose');

const dustbinSchema = new mongoose.Schema(
  {
    dustbinId: {
      type: String,
      unique: true,
    },
    gpsCoordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    address: {
      type: String,
      trim: true,
    },
    capacity: {
      type: Number, // Percentage 0-100
      default: 0,
      min: 0,
      max: 100,
    },
    lastCleanedAt: {
      type: Date,
    },
    cleanedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    ward: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ward',
    },
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  {
    timestamps: true,
  }
);

// Auto-generate dustbin ID before saving
dustbinSchema.pre('save', async function () {
  if (!this.dustbinId) {
    const count = await mongoose.model('Dustbin').countDocuments();
    this.dustbinId = `BIN-${String(count + 1).padStart(5, '0')}`;
  }
});

// Index for geo queries
dustbinSchema.index({ 'gpsCoordinates.lat': 1, 'gpsCoordinates.lng': 1 });

module.exports = mongoose.model('Dustbin', dustbinSchema);
