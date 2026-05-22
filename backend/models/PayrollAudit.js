const mongoose = require('mongoose');

const payrollAuditSchema = new mongoose.Schema(
  {
    payrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payroll',
      required: true,
    },
    actionType: {
      type: String,
      enum: ['Create', 'Update', 'Approve', 'Lock'],
      required: true,
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    updatedValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    actionPerformedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actionTimestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const PayrollAudit = mongoose.model('PayrollAudit', payrollAuditSchema);

module.exports = PayrollAudit;
