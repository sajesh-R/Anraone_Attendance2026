const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    sickLeaveBalance: {
      type: Number,
      default: 12, // Default annual sick leaves
    },
    casualLeaveBalance: {
      type: Number,
      default: 12, // Default annual casual leaves
    },
    paidLeaveBalance: {
      type: Number,
      default: 15, // Default annual paid leaves
    },
    unpaidLeaveCount: {
      type: Number,
      default: 0,
    },
    compOffBalance: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);

module.exports = LeaveBalance;
