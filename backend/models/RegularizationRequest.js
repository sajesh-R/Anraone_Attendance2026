const mongoose = require('mongoose');

const regularizationRequestSchema = new mongoose.Schema(
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
    regularizationType: {
      type: String,
      enum: ['Forgot Check-In', 'Forgot Check-Out', 'Incorrect Attendance Timing'],
      required: true,
    },
    correctedCheckInTime: {
      type: Date,
      default: null,
    },
    correctedCheckOutTime: {
      type: Date,
      default: null,
    },
    correctionReason: {
      type: String,
      required: true,
      trim: true,
    },
    requestStatus: {
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

// We can add an index if needed, but since we check for duplicates programmatically,
// standard fields are sufficient. Let's index employeeId and attendanceDate.
regularizationRequestSchema.index({ employeeId: 1, attendanceDate: 1 });

const RegularizationRequest = mongoose.model('RegularizationRequest', regularizationRequestSchema);

module.exports = RegularizationRequest;
