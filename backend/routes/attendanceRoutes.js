const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All attendance routes are protected
router.use(authMiddleware);

router.post('/check-in', attendanceController.checkIn);
router.post('/check-out', attendanceController.checkOut);
router.get('/live-status', attendanceController.getLiveStatus);
router.get('/dashboard-summary', attendanceController.getDashboardSummary);
router.get('/history', attendanceController.getAttendanceHistory);
router.get('/my-ip', attendanceController.getMyIP);

module.exports = router;

