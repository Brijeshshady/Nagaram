const mongoose = require('mongoose');

const wardSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Ward name is required'],
      trim: true,
    },
    number: {
      type: Number,
      required: true,
      unique: true,
    },
    boundaries: {
      type: {
        type: String,
        enum: ['Polygon'],
      },
      coordinates: {
        type: [[[Number]]],
      },
    },
    population: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

wardSchema.index({ boundaries: '2dsphere' });

module.exports = mongoose.model('Ward', wardSchema);
