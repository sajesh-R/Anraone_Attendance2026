const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', auditController.getAuditTrail);

module.exports = router;
