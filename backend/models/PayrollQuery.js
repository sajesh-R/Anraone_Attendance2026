const mongoose = require('mongoose');

const payrollQuerySchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    payslipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payslip',
      required: true,
    },
    disputeDetails: {
      type: String,
      required: [true, 'Dispute details are required.'],
    },
    status: {
      type: String,
      enum: ['Open', 'Resolved'],
      default: 'Open',
    },
    resolution: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const PayrollQuery = mongoose.model('PayrollQuery', payrollQuerySchema);

module.exports = PayrollQuery;
