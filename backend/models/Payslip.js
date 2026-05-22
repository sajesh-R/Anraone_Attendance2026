const mongoose = require('mongoose');

const payslipSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee reference is required.'],
    },
    payrollId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payroll',
      required: [true, 'Payroll reference is required.'],
      unique: true,
    },
    payrollMonth: {
      type: String, // format: "YYYY-MM"
      required: [true, 'Payroll month is required.'],
    },
    earningsBreakdown: {
      baseSalary: { type: Number, default: 0 },
      hra: { type: Number, default: 0 },
      transportAllowance: { type: Number, default: 0 },
      medicalAllowance: { type: Number, default: 0 },
      specialAllowance: { type: Number, default: 0 },
      overtimePay: { type: Number, default: 0 },
    },
    deductionsBreakdown: {
      pf: { type: Number, default: 0 },
      esi: { type: Number, default: 0 },
      tds: { type: Number, default: 0 },
      lopDeduction: { type: Number, default: 0 },
      loanDeduction: { type: Number, default: 0 },
      advanceDeduction: { type: Number, default: 0 },
    },
    netPay: {
      type: Number,
      required: true,
    },
    payslipFilePath: {
      type: String,
      default: '', // Store path to PDF if uploaded/generated
    },
    generatedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Payslip = mongoose.model('Payslip', payslipSchema);

module.exports = Payslip;
