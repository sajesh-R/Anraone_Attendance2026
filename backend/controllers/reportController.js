const Attendance = require('../models/Attendance');
const User = require('../models/User');

// @desc    Get Individual Attendance Report
// @route   GET /api/reports/individual
// @access  Private (Admin/Manager/Self)
exports.getIndividualReport = async (req, res) => {
  try {
    const { employeeId, startDate, endDate } = req.query;

    if (!employeeId || !startDate || !endDate) {
      return res.status(400).json({ message: 'employeeId, startDate, and endDate are required.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Fetch user details
    const user = await User.findById(employeeId).select('fullName employeeId department');
    if (!user) {
      return res.status(404).json({ message: 'Employee not found.' });
    }

    // Fetch attendance records
    const attendanceRecords = await Attendance.find({
      employeeId,
      attendanceDate: { $gte: start, $lte: end },
    }).sort({ attendanceDate: 1 });

    // Calculate totals
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;

    attendanceRecords.forEach((record) => {
      if (record.status === 'Present' || record.status === 'Checked-In' || record.status === 'Checked-Out') presentCount++;
      if (record.status === 'Absent') absentCount++;
      if (record.status === 'Late') lateCount++;
      if (record.status === 'On Leave') leaveCount++;
    });

    res.status(200).json({
      success: true,
      data: {
        user,
        summary: {
          presentCount,
          absentCount,
          lateCount,
          leaveCount,
        },
        records: attendanceRecords,
      },
    });
  } catch (error) {
    console.error('Individual Report Error:', error);
    res.status(500).json({ message: 'Failed to generate individual report.' });
  }
};

// @desc    Get Team Attendance Report
// @route   GET /api/reports/team
// @access  Private (Admin/Manager)
exports.getTeamReport = async (req, res) => {
  try {
    const { department, startDate, endDate } = req.query;

    if (!department || !startDate || !endDate) {
      return res.status(400).json({ message: 'department, startDate, and endDate are required.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Find all users in the department
    const users = await User.find({ department }).select('_id fullName employeeId');
    if (!users.length) {
      return res.status(404).json({ message: 'No employees found in this department.' });
    }

    const userIds = users.map((u) => u._id);

    // Fetch attendance for these users
    const attendanceRecords = await Attendance.find({
      employeeId: { $in: userIds },
      attendanceDate: { $gte: start, $lte: end },
    }).populate('employeeId', 'fullName employeeId');

    // Aggregate summary
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;

    // Group by user
    const employeeSummary = {};

    users.forEach((user) => {
      employeeSummary[user._id] = {
        fullName: user.fullName,
        employeeId: user.employeeId,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
      };
    });

    attendanceRecords.forEach((record) => {
      if (!record.employeeId) return;
      const uId = record.employeeId._id.toString();
      if (!employeeSummary[uId]) return;

      if (record.status === 'Present' || record.status === 'Checked-In' || record.status === 'Checked-Out') {
        presentCount++;
        employeeSummary[uId].present++;
      } else if (record.status === 'Absent') {
        absentCount++;
        employeeSummary[uId].absent++;
      } else if (record.status === 'Late') {
        lateCount++;
        employeeSummary[uId].late++;
      } else if (record.status === 'On Leave') {
        leaveCount++;
        employeeSummary[uId].leave++;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        department,
        overallSummary: {
          presentCount,
          absentCount,
          lateCount,
          leaveCount,
        },
        employeeSummary: Object.values(employeeSummary),
      },
    });
  } catch (error) {
    console.error('Team Report Error:', error);
    res.status(500).json({ message: 'Failed to generate team report.' });
  }
};

// @desc    Get Absenteeism Trends
// @route   GET /api/reports/absenteeism
// @access  Private (Admin/Manager)
exports.getAbsenteeismTrends = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Aggregate absenteeism data
    const trends = await Attendance.aggregate([
      {
        $match: {
          attendanceDate: { $gte: start, $lte: end },
          status: 'Absent',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'employeeId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$attendanceDate' } },
            department: '$user.department',
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.date': 1 },
      },
    ]);

    // Format data for easier charting
    const formattedData = trends.map((item) => ({
      date: item._id.date,
      department: item._id.department,
      count: item.count,
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error('Absenteeism Trends Error:', error);
    res.status(500).json({ message: 'Failed to generate absenteeism trends.' });
  }
};

// @desc    Get Late Arrival Heatmap Data
// @route   GET /api/reports/late-heatmap
// @access  Private (Admin/Manager)
exports.getLateArrivalHeatmap = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Aggregate late arrival data
    const lateData = await Attendance.aggregate([
      {
        $match: {
          attendanceDate: { $gte: start, $lte: end },
          status: 'Late',
          checkInTime: { $ne: null },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'employeeId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$attendanceDate' } },
          department: '$user.department',
          hour: { $hour: '$checkInTime' },
          minute: { $minute: '$checkInTime' },
        },
      },
      {
        $group: {
          _id: {
            date: '$date',
            department: '$department',
            hour: '$hour',
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.date': 1, '_id.hour': 1 },
      },
    ]);

    const formattedData = lateData.map((item) => ({
      date: item._id.date,
      department: item._id.department,
      hour: item._id.hour,
      count: item.count,
    }));

    res.status(200).json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error('Late Heatmap Error:', error);
    res.status(500).json({ message: 'Failed to generate late arrival heatmap.' });
  }
};
