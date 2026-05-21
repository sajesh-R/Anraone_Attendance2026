const RegularizationRequest = require('../models/RegularizationRequest');
const Attendance = require('../models/Attendance');
const AuditTrail = require('../models/AuditTrail');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendNotification } = require('../services/notificationService');

// @route   POST /api/regularization/apply
// @desc    Apply for attendance regularization
// @access  Private (Employee)
exports.applyRegularization = async (req, res) => {
  try {
    const {
      attendanceDate,
      regularizationType,
      correctedCheckInTime,
      correctedCheckOutTime,
      correctionReason,
    } = req.body;
    const employeeId = req.user._id;

    // 1. Validations
    if (!attendanceDate) {
      return res.status(400).json({ success: false, message: 'Attendance date is required.' });
    }
    if (!regularizationType) {
      return res.status(400).json({ success: false, message: 'Regularization type is required.' });
    }
    if (!['Forgot Check-In', 'Forgot Check-Out', 'Incorrect Attendance Timing'].includes(regularizationType)) {
      return res.status(400).json({ success: false, message: 'Invalid regularization type.' });
    }
    if (!correctionReason || !correctionReason.trim()) {
      return res.status(400).json({ success: false, message: 'Correction reason is required.' });
    }

    const targetDate = new Date(attendanceDate);
    targetDate.setHours(0, 0, 0, 0);

    // 2. Only existing attendance records can be regularized
    const attendance = await Attendance.findOne({ employeeId, attendanceDate: targetDate });
    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'Invalid attendance record. Only existing attendance records can be regularized.',
      });
    }

    // 3. Duplicate pending requests not allowed
    const duplicate = await RegularizationRequest.findOne({
      employeeId,
      attendanceDate: targetDate,
      requestStatus: 'Pending',
    });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate regularization request. A pending request for this date already exists.',
      });
    }

    // 4. Validate corrected times
    let parsedCheckIn = null;
    let parsedCheckOut = null;

    if (regularizationType === 'Forgot Check-In' || regularizationType === 'Incorrect Attendance Timing') {
      if (!correctedCheckInTime) {
        return res.status(400).json({ success: false, message: 'Corrected Check-In time is required.' });
      }
      parsedCheckIn = new Date(correctedCheckInTime);
      if (isNaN(parsedCheckIn.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid Check-In time format.' });
      }
    }

    if (regularizationType === 'Forgot Check-Out' || regularizationType === 'Incorrect Attendance Timing') {
      if (!correctedCheckOutTime) {
        return res.status(400).json({ success: false, message: 'Corrected Check-Out time is required.' });
      }
      parsedCheckOut = new Date(correctedCheckOutTime);
      if (isNaN(parsedCheckOut.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid Check-Out time format.' });
      }
    }

    if (parsedCheckIn && parsedCheckOut && parsedCheckIn > parsedCheckOut) {
      return res.status(400).json({ success: false, message: 'Check-In time cannot be after Check-Out time.' });
    }

    // 5. Create request
    const newRequest = await RegularizationRequest.create({
      employeeId,
      attendanceDate: targetDate,
      regularizationType,
      correctedCheckInTime: parsedCheckIn,
      correctedCheckOutTime: parsedCheckOut,
      correctionReason: correctionReason.trim(),
      requestStatus: 'Pending',
    });

    // 6. Record Audit Trail for Submission
    await AuditTrail.create({
      employeeId,
      requestType: 'Regularization',
      oldValue: null,
      newValue: {
        regularizationType,
        correctedCheckInTime: parsedCheckIn,
        correctedCheckOutTime: parsedCheckOut,
        correctionReason,
        requestStatus: 'Pending',
      },
      actionType: 'Submission',
      actionPerformedBy: req.user._id,
      remarks: `Submitted regularization request (${regularizationType}) for ${targetDate.toDateString()}`,
    });

    // 7. Notify Managers
    const managers = await User.find({ role: { $in: ['Admin', 'Manager'] } });
    const notificationPromises = managers.map((manager) =>
      sendNotification({
        recipientId: manager._id,
        senderId: employeeId,
        type: 'RegularizationRequest',
        title: 'New Regularization Request',
        message: `${req.user.fullName} has applied for attendance regularization (${regularizationType}) for ${targetDate.toLocaleDateString()}.`,
        deliveryChannel: ['In-App', 'Push'],
        relatedId: newRequest._id,
      })
    );
    await Promise.all(notificationPromises);

    res.status(201).json({
      success: true,
      message: 'Regularization Request submitted successfully.',
      data: newRequest,
    });
  } catch (error) {
    console.error('Error applying for regularization:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to apply for regularization.' });
  }
};

// @route   GET /api/regularization/my-requests
// @desc    Get current employee's regularization requests
// @access  Private
exports.getMyRegularizationRequests = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const requests = await RegularizationRequest.find({ employeeId }).sort({ attendanceDate: -1 });

    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('Error fetching my regularization requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch regularization requests.' });
  }
};

// @route   GET /api/regularization/pending
// @desc    Get all pending regularization requests
// @access  Private (Manager/Admin)
exports.getPendingRegularizationRequests = async (req, res) => {
  try {
    if (req.user.role !== 'Manager' && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Unauthorized role.' });
    }

    const requests = await RegularizationRequest.find({ requestStatus: 'Pending' })
      .populate('employeeId', 'fullName email department designation')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('Error fetching pending regularization requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending requests.' });
  }
};

// @route   PUT /api/regularization/approve/:id
// @desc    Approve or Reject regularization request
// @access  Private (Manager/Admin)
exports.updateRegularizationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks = '' } = req.body; // status: 'Approved' or 'Rejected'

    // 1. Authorization check
    if (req.user.role !== 'Manager' && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized approval access.' });
    }

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be Approved or Rejected.' });
    }

    // 2. Fetch Request
    const request = await RegularizationRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Regularization request not found.' });
    }

    if (request.requestStatus !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Approved or Rejected requests cannot be edited again.' });
    }

    const targetDate = new Date(request.attendanceDate);
    targetDate.setHours(0, 0, 0, 0);

    // 3. Find target attendance record
    const attendance = await Attendance.findOne({
      employeeId: request.employeeId,
      attendanceDate: targetDate,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Original attendance record not found for this regularization request.',
      });
    }

    const oldAttendanceValue = {
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      status: attendance.status,
    };

    let newAttendanceValue = { ...oldAttendanceValue };

    // 4. Update attendance if Approved
    if (status === 'Approved') {
      if (request.regularizationType === 'Forgot Check-In' || request.regularizationType === 'Incorrect Attendance Timing') {
        attendance.checkInTime = request.correctedCheckInTime;
      }
      if (request.regularizationType === 'Forgot Check-Out' || request.regularizationType === 'Incorrect Attendance Timing') {
        attendance.checkOutTime = request.correctedCheckOutTime;
      }

      // Re-evaluate Attendance Status
      const checkInTime = new Date(attendance.checkInTime);
      const allowedTime = new Date(checkInTime);
      allowedTime.setHours(9, 30, 0, 0); // Default 9:30 AM
      
      let computedStatus = 'Present';
      if (attendance.workMode === 'WFH') {
        computedStatus = 'WFH';
      } else if (checkInTime > allowedTime) {
        computedStatus = 'Late';
      }
      attendance.status = computedStatus;

      await attendance.save();

      newAttendanceValue = {
        checkInTime: attendance.checkInTime,
        checkOutTime: attendance.checkOutTime,
        status: attendance.status,
      };
    }

    // 5. Update Request Status
    const oldRequestStatus = request.requestStatus;
    request.requestStatus = status;
    request.approvedBy = req.user._id;
    request.approvedDate = new Date();
    await request.save();

    // 6. Record Audit Trail
    await AuditTrail.create({
      employeeId: request.employeeId,
      requestType: 'Regularization',
      oldValue: {
        requestStatus: oldRequestStatus,
        attendance: oldAttendanceValue,
      },
      newValue: {
        requestStatus: status,
        attendance: newAttendanceValue,
      },
      actionType: status === 'Approved' ? 'Approval' : 'Rejection',
      actionPerformedBy: req.user._id,
      remarks: remarks || `Manager ${status.toLowerCase()} regularization request.`,
    });

    // 7. Notify Employee
    await sendNotification({
      recipientId: request.employeeId,
      senderId: req.user._id,
      type: 'RegularizationStatusUpdate',
      title: `Regularization Request ${status}`,
      message: `Your regularization request for ${targetDate.toLocaleDateString()} has been ${status.toLowerCase()}.`,
      deliveryChannel: ['In-App', 'Push'],
      relatedId: request._id,
    });

    res.status(200).json({
      success: true,
      message: `Regularization request ${status.toLowerCase()} successfully.`,
      data: {
        request,
        attendance: status === 'Approved' ? attendance : null,
      },
    });
  } catch (error) {
    console.error('Error updating regularization status:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update regularization request.' });
  }
};
