const mongoose = require('mongoose');

const overtimeRequestSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    attendanceDate: {
      type: Date,
      required: true,
    },
    overtimeHours: {
      type: Number,
      required: true,
      min: [0.5, 'Overtime hours must be at least 0.5 hours.'],
      max: [24, 'Overtime hours cannot exceed 24 hours.'],
    },
    overtimeReason: {
      type: String,
      required: true,
      trim: true,
    },
    overtimeStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate overtime requests for the same date for the same employee
overtimeRequestSchema.index({ employeeId: 1, attendanceDate: 1 }, { unique: true });

const OvertimeRequest = mongoose.model('OvertimeRequest', overtimeRequestSchema);

module.exports = OvertimeRequest;
