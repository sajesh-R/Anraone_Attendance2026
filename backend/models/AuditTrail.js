const mongoose = require('mongoose');

const auditTrailSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestType: {
      type: String,
      enum: ['Overtime', 'Regularization'],
      required: true,
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    actionType: {
      type: String,
      enum: ['Submission', 'Approval', 'Rejection'],
      required: true,
    },
    actionPerformedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actionTimestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    remarks: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

auditTrailSchema.index({ employeeId: 1 });
auditTrailSchema.index({ actionTimestamp: -1 });

const AuditTrail = mongoose.model('AuditTrail', auditTrailSchema);

module.exports = AuditTrail;
