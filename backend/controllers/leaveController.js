const Leave = require('../models/Leave');
const LeaveBalance = require('../models/LeaveBalance');
const Notification = require('../models/Notification');
const User = require('../models/User');
const mongoose = require('mongoose');
const { sendNotification } = require('../services/notificationService');

// Helper to calculate days between two dates
const calculateDays = (from, to) => {
  const start = new Date(from);
  const end = new Date(to);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
};

// ────────────────────────────────────────────────────────────────────
// @route   POST /api/leave/apply
// @desc    Apply for leave
// @access  Private
// ────────────────────────────────────────────────────────────────────
const applyLeave = async (req, res) => {
  const { leaveType, fromDate, toDate, reason } = req.body;

  // Validation
  if (!leaveType || !fromDate || !toDate || !reason) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  if (new Date(fromDate) > new Date(toDate)) {
    return res.status(400).json({ success: false, message: 'From Date cannot be after To Date.' });
  }

  try {
    const daysRequested = calculateDays(fromDate, toDate);
    const employeeId = req.user._id;

    // Get or create leave balance
    let balance = await LeaveBalance.findOne({ employeeId });
    if (!balance) {
      balance = await LeaveBalance.create({ employeeId });
    }

    // Check balance for paid types
    if (leaveType === 'Sick Leave' && balance.sickLeaveBalance < daysRequested) {
      return res.status(400).json({ success: false, message: 'Insufficient Sick Leave balance.' });
    }
    if (leaveType === 'Casual Leave' && balance.casualLeaveBalance < daysRequested) {
      return res.status(400).json({ success: false, message: 'Insufficient Casual Leave balance.' });
    }
    if (leaveType === 'Paid Leave' && balance.paidLeaveBalance < daysRequested) {
      return res.status(400).json({ success: false, message: 'Insufficient Paid Leave balance.' });
    }
    if (leaveType === 'Comp-Off Leave' && balance.compOffBalance < daysRequested) {
      return res.status(400).json({ success: false, message: 'Insufficient Comp-Off balance.' });
    }

    // Check for duplicate/overlapping requests (simple check for exact match)
    const duplicate = await Leave.findOne({
      employeeId,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      leaveStatus: 'Pending'
    });
    if (duplicate) {
      return res.status(400).json({ success: false, message: 'A pending request for these dates already exists.' });
    }

    const leaveRequest = await Leave.create({
      employeeId,
      leaveType,
      fromDate,
      toDate,
      reason,
      leaveStatus: 'Pending',
    });

    // Notify Managers
    const managers = await User.find({ role: { $in: ['Admin', 'Manager'] } });
    const notificationPromises = managers.map(manager => 
      sendNotification({
        recipientId: manager._id,
        senderId: employeeId,
        type: 'LeaveRequest',
        title: 'New Leave Request',
        message: `${req.user.fullName} has applied for ${leaveType} from ${new Date(fromDate).toDateString()} to ${new Date(toDate).toDateString()}.`,
        deliveryChannel: ['In-App', 'Push'],
        relatedId: leaveRequest._id,
      })
    );
    await Promise.all(notificationPromises);

    return res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully.',
      leaveRequest,
    });
  } catch (error) {
    console.error(`Apply Leave Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to submit leave request.' });
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   GET /api/leave/history
// @desc    Get leave history for current user
// @access  Private
// ────────────────────────────────────────────────────────────────────
const getLeaveHistory = async (req, res) => {
  try {
    const history = await Leave.find({ employeeId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, history });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch leave history.' });
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   GET /api/leave/balance
// @desc    Get leave balance for current user
// @access  Private
// ────────────────────────────────────────────────────────────────────
const getLeaveBalance = async (req, res) => {
  try {
    let balance = await LeaveBalance.findOne({ employeeId: req.user._id });
    if (!balance) {
      balance = await LeaveBalance.create({ employeeId: req.user._id });
    }
    return res.status(200).json({ success: true, balance });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch leave balance.' });
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   GET /api/leave/pending
// @desc    Get all pending leave requests (Manager only)
// @access  Private - Manager, Admin
// ────────────────────────────────────────────────────────────────────
const getPendingRequests = async (req, res) => {
  try {
    const pending = await Leave.find({ leaveStatus: 'Pending' })
      .populate('employeeId', 'fullName email department designation')
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, pending });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch pending requests.' });
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   PUT /api/leave/approve/:id
// @desc    Approve or reject leave request
// @access  Private - Manager, Admin
// ────────────────────────────────────────────────────────────────────
const updateLeaveStatus = async (req, res) => {
  const { status } = req.body; // 'Approved' or 'Rejected'
  const { id } = req.params;

  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status update.' });
  }

  try {
    const leaveRequest = await Leave.findById(id);
    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    if (leaveRequest.leaveStatus !== 'Pending') {
      return res.status(400).json({ success: false, message: 'This request has already been processed.' });
    }

    if (status === 'Approved') {
      const days = calculateDays(leaveRequest.fromDate, leaveRequest.toDate);
      const balance = await LeaveBalance.findOne({ employeeId: leaveRequest.employeeId });

      if (!balance) {
        return res.status(500).json({ success: false, message: 'Leave balance record not found.' });
      }

      // Deduct balance based on type
      if (leaveRequest.leaveType === 'Sick Leave') balance.sickLeaveBalance -= days;
      if (leaveRequest.leaveType === 'Casual Leave') balance.casualLeaveBalance -= days;
      if (leaveRequest.leaveType === 'Paid Leave') balance.paidLeaveBalance -= days;
      if (leaveRequest.leaveType === 'Unpaid Leave') balance.unpaidLeaveCount += days;
      if (leaveRequest.leaveType === 'Comp-Off Leave') balance.compOffBalance -= days;

      await balance.save();
    }

    leaveRequest.leaveStatus = status;
    leaveRequest.approvedBy = req.user._id;
    leaveRequest.approvedDate = Date.now();
    await leaveRequest.save();

    // Notify Employee
    const notificationType = status === 'Approved' ? 'LeaveApproval' : 'LeaveRejection';
    await sendNotification({
      recipientId: leaveRequest.employeeId,
      senderId: req.user._id,
      type: notificationType,
      title: `Leave Request ${status}`,
      message: `Your leave request for ${leaveRequest.leaveType} from ${new Date(leaveRequest.fromDate).toDateString()} to ${new Date(leaveRequest.toDate).toDateString()} has been ${status.toLowerCase()}.`,
      deliveryChannel: ['In-App', 'Push'],
      relatedId: leaveRequest._id,
    });

    return res.status(200).json({
      success: true,
      message: `Leave request ${status.toLowerCase()} successfully.`,
      leaveRequest,
    });
  } catch (error) {
    console.error(`Update Leave Status Error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Failed to update leave status.' });
  }
};

module.exports = {
  applyLeave,
  getLeaveHistory,
  getLeaveBalance,
  getPendingRequests,
  updateLeaveStatus,
};
