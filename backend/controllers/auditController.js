const AuditTrail = require('../models/AuditTrail');

// @route   GET /api/audit-trail
// @desc    Get audit trail history
// @access  Private
exports.getAuditTrail = async (req, res) => {
  try {
    let query = {};

    // If Employee, only show their own audit records
    if (req.user.role === 'Employee') {
      query.employeeId = req.user._id;
    } else {
      // If Manager or Admin, allow optional filtering by employeeId
      if (req.query.employeeId) {
        query.employeeId = req.query.employeeId;
      }
      if (req.query.requestType) {
        query.requestType = req.query.requestType;
      }
    }

    const logs = await AuditTrail.find(query)
      .populate('employeeId', 'fullName email department designation')
      .populate('actionPerformedBy', 'fullName role')
      .sort({ actionTimestamp: -1 });

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit trail.' });
  }
};
