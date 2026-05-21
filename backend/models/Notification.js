const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderId: {
      // Made optional because system-generated alerts don't have a specific sender
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    type: {
      type: String,
      enum: [
        'LeaveRequest',
        'LeaveStatusUpdate',
        'OvertimeRequest',
        'OvertimeStatusUpdate',
        'RegularizationRequest',
        'RegularizationStatusUpdate',
        'PunchInReminder',
        'AbsenceAlert',
        'MonthlySummary',
        'LeaveApproval',
        'LeaveRejection'
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    notificationStatus: {
      type: String,
      enum: ['Pending', 'Sent', 'Failed'],
      default: 'Pending'
    },
    deliveryChannel: {
      type: [{
        type: String,
        enum: ['In-App', 'Email', 'Push']
      }],
      default: ['In-App']
    },
    sentTimestamp: {
      type: Date
    }
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
