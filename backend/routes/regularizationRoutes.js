const express = require('express');
const router = express.Router();
const regularizationController = require('../controllers/regularizationController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/apply', regularizationController.applyRegularization);
router.get('/my-requests', regularizationController.getMyRegularizationRequests);
router.get('/pending', regularizationController.getPendingRegularizationRequests);
router.put('/approve/:id', regularizationController.updateRegularizationStatus);

module.exports = router;
