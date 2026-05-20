const OvertimeRequest = require('../models/OvertimeRequest');
const AuditTrail = require('../models/AuditTrail');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @route   POST /api/overtime/log
// @desc    Log overtime request
// @access  Private (Employee)
exports.logOvertime = async (req, res) => {
  try {
    const { attendanceDate, overtimeHours, overtimeReason } = req.body;
    const employeeId = req.user._id;

    // 1. Validation
    if (!attendanceDate) {
      return res.status(400).json({ success: false, message: 'Attendance date is required.' });
    }
    if (!overtimeHours) {
      return res.status(400).json({ success: false, message: 'Overtime hours are required.' });
    }
    if (overtimeHours <= 0) {
      return res.status(400).json({ success: false, message: 'Overtime hours must be greater than 0.' });
    }
    if (!overtimeReason || !overtimeReason.trim()) {
      return res.status(400).json({ success: false, message: 'Overtime reason is required.' });
    }

    const targetDate = new Date(attendanceDate);
    targetDate.setHours(0, 0, 0, 0);

    // 2. Check for duplicate request
    const existing = await OvertimeRequest.findOne({ employeeId, attendanceDate: targetDate });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate overtime request. A request for this attendance date already exists.',
      });
    }

    // 3. Create request
    const newRequest = await OvertimeRequest.create({
      employeeId,
      attendanceDate: targetDate,
      overtimeHours,
      overtimeReason: overtimeReason.trim(),
      overtimeStatus: 'Pending',
    });

    // 4. Record Audit Trail
    await AuditTrail.create({
      employeeId,
      requestType: 'Overtime',
      oldValue: null,
      newValue: {
        attendanceDate: targetDate,
        overtimeHours,
        overtimeReason,
        overtimeStatus: 'Pending',
      },
      actionType: 'Submission',
      actionPerformedBy: req.user._id,
      remarks: `Submitted overtime request of ${overtimeHours} hours for ${targetDate.toDateString()}`,
    });

    // 5. Notify Managers
    const managers = await User.find({ role: 'Manager' });
    const notificationPromises = managers.map((manager) =>
      Notification.create({
        recipientId: manager._id,
        senderId: employeeId,
        type: 'OvertimeRequest',
        message: `${req.user.fullName} has submitted an overtime request of ${overtimeHours} hours for ${targetDate.toLocaleDateString()}.`,
        relatedId: newRequest._id,
      })
    );
    await Promise.all(notificationPromises);

    res.status(201).json({
      success: true,
      message: 'Overtime Request submitted successfully.',
      data: newRequest,
    });
  } catch (error) {
    console.error('Error logging overtime:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to log overtime.' });
  }
};

// @route   GET /api/overtime/my-requests
// @desc    Get current employee's overtime requests
// @access  Private
exports.getMyOvertimeRequests = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const requests = await OvertimeRequest.find({ employeeId }).sort({ attendanceDate: -1 });

    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('Error fetching my overtime requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch overtime requests.' });
  }
};

// @route   GET /api/overtime/pending
// @desc    Get all pending overtime requests
// @access  Private (Manager/Admin)
exports.getPendingOvertimeRequests = async (req, res) => {
  try {
    // Only Managers or Admins can fetch all pending
    if (req.user.role !== 'Manager' && req.user.role !== 'Admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Unauthorized role.' });
    }

    const requests = await OvertimeRequest.find({ overtimeStatus: 'Pending' })
      .populate('employeeId', 'fullName email department designation')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('Error fetching pending overtime requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending requests.' });
  }
};

// @route   PUT /api/overtime/approve/:id
// @desc    Approve or Reject overtime request
// @access  Private (Manager/Admin)
exports.updateOvertimeStatus = async (req, res) => {
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
    const request = await OvertimeRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Overtime request not found.' });
    }

    // Approved/Rejected requests cannot be edited again
    if (request.overtimeStatus !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Approved or Rejected requests cannot be edited again.' });
    }

    const oldStatus = request.overtimeStatus;

    // 3. Update Request
    request.overtimeStatus = status;
    request.approvedBy = req.user._id;
    request.approvedDate = new Date();
    await request.save();

    // 4. Record Audit Trail
    await AuditTrail.create({
      employeeId: request.employeeId,
      requestType: 'Overtime',
      oldValue: { overtimeStatus: oldStatus },
      newValue: { overtimeStatus: status },
      actionType: status === 'Approved' ? 'Approval' : 'Rejection',
      actionPerformedBy: req.user._id,
      remarks: remarks || `Manager ${status.toLowerCase()} overtime request.`,
    });

    // 5. Notify Employee
    await Notification.create({
      recipientId: request.employeeId,
      senderId: req.user._id,
      type: 'OvertimeStatusUpdate',
      message: `Your overtime request for ${new Date(request.attendanceDate).toLocaleDateString()} has been ${status.toLowerCase()}.`,
      relatedId: request._id,
    });

    res.status(200).json({
      success: true,
      message: `Overtime request ${status.toLowerCase()} successfully.`,
      data: request,
    });
  } catch (error) {
    console.error('Error updating overtime status:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update overtime request.' });
  }
};
