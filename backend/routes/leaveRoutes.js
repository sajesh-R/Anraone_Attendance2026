const express = require('express');
const router = express.Router();
const { 
  applyLeave, 
  getLeaveHistory, 
  getLeaveBalance, 
  getPendingRequests, 
  updateLeaveStatus 
} = require('../controllers/leaveController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

// All leave routes require authentication
router.use(authMiddleware);

// Employee routes
router.post('/apply', applyLeave);
router.get('/history', getLeaveHistory);
router.get('/balance', getLeaveBalance);

// Manager routes
router.get('/pending', roleMiddleware('Manager', 'Admin'), getPendingRequests);
router.put('/status/:id', roleMiddleware('Manager', 'Admin'), updateLeaveStatus);

module.exports = router;
