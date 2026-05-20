const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Leave = require('../models/Leave');
const mongoose = require('mongoose');

/**
 * Calculates distance between two coordinates in meters using Haversine formula.
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * @desc    Clock In
 * @route   POST /api/attendance/check-in
 * @access  Private
 */
exports.checkIn = async (req, res) => {
  try {
    const { latitude, longitude, ipAddress, timezone, utcTimestamp, workMode = 'Office' } = req.body;
    const employeeId = req.user.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Check if user already has a record for today
    const existingRecord = await Attendance.findOne({
      employeeId,
      attendanceDate: today,
    });

    if (existingRecord && existingRecord.checkInTime) {
      return res.status(400).json({
        success: false,
        message: 'Already checked-in today.',
      });
    }

    // 2. Validate Location (GPS) - Only for Office mode
    if (workMode === 'Office') {
      const OFFICE_LAT = parseFloat(process.env.OFFICE_LAT) || 12.9716;
      const OFFICE_LONG = parseFloat(process.env.OFFICE_LONG) || 77.5946;
      const ALLOWED_RADIUS = parseInt(process.env.ALLOWED_RADIUS_METERS) || 500;

      const distance = calculateDistance(latitude, longitude, OFFICE_LAT, OFFICE_LONG);

      const ALLOWED_IPS = process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',') : [];
      const isIPValid = ALLOWED_IPS.length === 0 || ALLOWED_IPS.includes(ipAddress);

      if (distance > ALLOWED_RADIUS && !isIPValid) {
         return res.status(403).json({
           success: false,
           message: 'Invalid Location. You are outside the allowed office radius or network.',
         });
      }
    }

    // 3. Determine Status (Late vs Present)
    const checkInTime = new Date(utcTimestamp || Date.now());
    const allowedTime = new Date(checkInTime);
    allowedTime.setHours(9, 30, 0, 0); // Default 9:30 AM

    let status = 'Present';
    if (workMode === 'WFH') {
      status = 'WFH';
    } else if (checkInTime > allowedTime) {
      status = 'Late';
    }

    // 4. Save Check-In Record
    const attendance = await Attendance.create({
      employeeId,
      attendanceDate: today,
      checkInTime,
      latitude,
      longitude,
      ipAddress,
      timezone,
      utcTimestamp: checkInTime,
      status,
      workMode,
    });

    res.status(201).json({
      success: true,
      message: 'Check-In Successful',
      data: attendance,
    });
  } catch (error) {
    console.error(`Check-In Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to record check-in.',
    });
  }
};

/**
 * @desc    Clock Out
 * @route   POST /api/attendance/check-out
 * @access  Private
 */
exports.checkOut = async (req, res) => {
  try {
    const { utcTimestamp } = req.body;
    const employeeId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Find today's record
    const attendance = await Attendance.findOne({
      employeeId,
      attendanceDate: today,
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'No check-in record found for today.',
      });
    }

    if (attendance.checkOutTime) {
      return res.status(400).json({
        success: false,
        message: 'Already checked-out today.',
      });
    }

    // 2. Update Record
    attendance.checkOutTime = new Date(utcTimestamp || Date.now());
    await attendance.save();

    res.status(200).json({
      success: true,
      message: 'Check-Out Successful',
      data: attendance,
    });
  } catch (error) {
    console.error(`Check-Out Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to record check-out.',
    });
  }
};

/**
 * @desc    Get Dashboard Summary
 * @route   GET /api/attendance/dashboard-summary
 * @access  Private
 */
exports.getDashboardSummary = async (req, res) => {
  try {
    const employeeId = req.user.id;
    
    // Default range: Current Month
    const endDate = new Date();
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);


    const records = await Attendance.find({
      employeeId,
      attendanceDate: { $gte: startDate, $lte: endDate }
    });

    // For leaves, we want to see everything approved for the WHOLE month (including future)
    const monthEnd = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0, 23, 59, 59);
    
    const leaves = await Leave.find({
      employeeId,
      leaveStatus: 'Approved',
      $or: [
        { fromDate: { $gte: startDate, $lte: monthEnd } },
        { toDate: { $gte: startDate, $lte: monthEnd } },
        { fromDate: { $lte: startDate }, toDate: { $gte: monthEnd } }
      ]
    });



    let totalLeaveDays = 0;
    leaves.forEach(leave => {
      const start = new Date(leave.fromDate);
      const end = new Date(leave.toDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      totalLeaveDays += diffDays;
    });

    const summary = {
      present: records.length, 
      late: records.filter(r => r.status === 'Late').length,
      wfh: records.filter(r => r.status === 'WFH').length,
      leave: totalLeaveDays,
      absent: 0 
    };

    // Simple absent calculation based on working days passed in month
    const daysPassed = endDate.getDate();
    summary.absent = Math.max(0, daysPassed - records.length - totalLeaveDays);


    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Attendance History (Daily/Weekly/Monthly)
 * @route   GET /api/attendance/history
 * @access  Private
 */
exports.getAttendanceHistory = async (req, res) => {
  try {
    const { view = 'monthly', startDate: qStart, endDate: qEnd } = req.query;
    const employeeId = req.user.id;
    
    let query = { employeeId };
    
    if (qStart) {
      const start = new Date(qStart);
      start.setHours(0, 0, 0, 0);
      const end = qEnd ? new Date(qEnd) : new Date(start);
      end.setHours(23, 59, 59, 999);
      
      query.attendanceDate = { $gte: start, $lte: end };
    } else {
      let startDate = new Date();
      if (view === 'daily') {
        startDate.setHours(0, 0, 0, 0);
      } else if (view === 'weekly') {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setDate(startDate.getDate() - 30);
      }
      query.attendanceDate = { $gte: startDate };
    }

    const records = await Attendance.find(query).sort({ attendanceDate: -1 });


    res.status(200).json({
      success: true,
      data: records
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get Current Live Status
 * @route   GET /api/attendance/live-status
 * @access  Private
 */
exports.getLiveStatus = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await Attendance.findOne({ employeeId, attendanceDate: today });
    const leave = await Leave.findOne({ 
      employeeId, 
      leaveStatus: 'Approved',
      fromDate: { $lte: today },
      toDate: { $gte: today }
    });


    let status = 'Absent';
    if (record) {
      status = record.status;
    } else if (leave) {
      status = 'On Leave';
    }

    res.status(200).json({
      success: true,
      data: {
        status,
        checkIn: record ? record.checkInTime : null,
        checkOut: record ? record.checkOutTime : null,
        workMode: record ? record.workMode : 'N/A'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyIP = async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const cleanIp = ip === '::1' ? '127.0.0.1' : ip.replace('::ffff:', '');
  res.status(200).json({ success: true, ip: cleanIp });
};

