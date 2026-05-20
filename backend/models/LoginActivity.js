const mongoose = require('mongoose');

const loginActivitySchema = new mongoose.Schema(
  {
    loginId: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
      unique: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    loginTimestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    logoutTimestamp: {
      type: Date,
      default: null,
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

loginActivitySchema.index({ employeeId: 1, loginTimestamp: -1 });

const LoginActivity = mongoose.model('LoginActivity', loginActivitySchema);

module.exports = LoginActivity;
