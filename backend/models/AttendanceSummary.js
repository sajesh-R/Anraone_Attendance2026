const mongoose = require('mongoose');

const attendanceSummarySchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    month: {
      type: String, // format 'YYYY-MM'
      required: true,
    },
    presentDays: {
      type: Number,
      default: 0,
    },
    absentDays: {
      type: Number,
      default: 0,
    },
    lateCount: {
      type: Number,
      default: 0,
    },
    leaveCount: {
      type: Number,
      default: 0,
    },
    attendancePercentage: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const AttendanceSummary = mongoose.model('AttendanceSummary', attendanceSummarySchema);

module.exports = AttendanceSummary;
