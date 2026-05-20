const express = require('express');
const router = express.Router();
const overtimeController = require('../controllers/overtimeController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/log', overtimeController.logOvertime);
router.get('/my-requests', overtimeController.getMyOvertimeRequests);
router.get('/pending', overtimeController.getPendingOvertimeRequests);
router.put('/approve/:id', overtimeController.updateOvertimeStatus);

module.exports = router;
