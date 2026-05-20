const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    attendanceDate: {
      type: Date,
      required: true,
      default: () => new Date().setHours(0, 0, 0, 0),
    },
    checkInTime: {
      type: Date,
      required: true,
    },
    checkOutTime: {
      type: Date,
      default: null,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    timezone: {
      type: String,
      required: true,
    },
    utcTimestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Late', 'On Leave', 'WFH', 'Checked-In', 'Checked-Out'],
      default: 'Present',
    },
    workMode: {
      type: String,
      enum: ['Office', 'WFH'],
      default: 'Office',
    },
    locationName: {
      type: String,
      default: '',
    }
  },
  {
    timestamps: true,
  }
);

// Index for quick lookups of employee's attendance
attendanceSchema.index({ employeeId: 1, attendanceDate: 1 }, { unique: true });
attendanceSchema.index({ employeeId: 1, createdAt: -1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);

module.exports = Attendance;

