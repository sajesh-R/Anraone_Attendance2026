const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    leaveType: {
      type: String,
      enum: ['Sick Leave', 'Casual Leave', 'Paid Leave', 'Unpaid Leave', 'Comp-Off Leave'],
      required: true,
    },
    fromDate: {
      type: Date,
      required: true,
    },
    toDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    leaveStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected'],
      default: 'Pending',
    },
    appliedDate: {
      type: Date,
      default: Date.now,
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

const Leave = mongoose.model('Leave', leaveSchema);

module.exports = Leave;
