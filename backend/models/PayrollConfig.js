const mongoose = require('mongoose');

const payrollConfigSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee reference is required.'],
      unique: true,
    },
    baseSalary: {
      type: Number,
      required: [true, 'Base salary is required.'],
      min: [0, 'Base salary cannot be negative.'],
    },
    hraAmount: {
      type: Number,
      default: 0,
      min: [0, 'HRA cannot be negative.'],
    },
    transportAllowance: {
      type: Number,
      default: 0,
      min: [0, 'Transport allowance cannot be negative.'],
    },
    medicalAllowance: {
      type: Number,
      default: 0,
      min: [0, 'Medical allowance cannot be negative.'],
    },
    specialAllowance: {
      type: Number,
      default: 0,
      min: [0, 'Special allowance cannot be negative.'],
    },
    pfDeduction: {
      type: Number,
      default: 0,
      min: [0, 'PF deduction cannot be negative.'],
    },
    esiDeduction: {
      type: Number,
      default: 0,
      min: [0, 'ESI deduction cannot be negative.'],
    },
    tdsDeduction: {
      type: Number,
      default: 0,
      min: [0, 'TDS deduction cannot be negative.'],
    },
    loanDeduction: {
      type: Number,
      default: 0,
      min: [0, 'Loan deduction cannot be negative.'],
    },
    advanceDeduction: {
      type: Number,
      default: 0,
      min: [0, 'Advance deduction cannot be negative.'],
    },
    payCycle: {
      type: String,
      enum: ['Monthly', 'Bi-Weekly'],
      default: 'Monthly',
    },
    lopRule: {
      type: String,
      enum: ['Standard', 'Strict', 'Custom'],
      default: 'Standard',
    },
  },
  {
    timestamps: true,
  }
);

const PayrollConfig = mongoose.model('PayrollConfig', payrollConfigSchema);

module.exports = PayrollConfig;
