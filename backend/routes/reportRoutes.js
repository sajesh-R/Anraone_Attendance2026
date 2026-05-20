const express = require('express');
const router = express.Router();
const {
  getIndividualReport,
  getTeamReport,
  getAbsenteeismTrends,
  getLateArrivalHeatmap,
} = require('../controllers/reportController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

// Protect all routes
router.use(authMiddleware);

router.get('/individual', getIndividualReport);
router.get('/team', roleMiddleware('Admin', 'Manager'), getTeamReport);
router.get('/absenteeism', roleMiddleware('Admin', 'Manager'), getAbsenteeismTrends);
router.get('/late-heatmap', roleMiddleware('Admin', 'Manager'), getLateArrivalHeatmap);

module.exports = router;
