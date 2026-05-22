const express = require('express');
const router = express.Router();
const {
  savePayrollConfig,
  getPayrollConfig,
  processPayroll,
  getDrafts,
  updatePayrollEntry,
  reviewPayroll,
  approveAndLockPayroll,
  getMyPayslips,
  raiseQuery,
  getAllQueries,
  resolveQuery,
  getDashboardSummary,
  getAuditTrail,
  getYearEndSummary,
  downloadPayslipPDF,
} = require('../controllers/payrollController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

// All payroll routes require authentication
router.use(authMiddleware);

// Employee routes (Self-Service)
router.get('/my-payslips', getMyPayslips);
router.post('/dispute', raiseQuery);
router.get('/payslip/:payslipId/pdf', downloadPayslipPDF);

// Manager & Admin routes
router.get('/config/:employeeId', roleMiddleware('Admin', 'Manager'), getPayrollConfig);
router.get('/drafts', roleMiddleware('Admin', 'Manager'), getDrafts);
router.get('/summary', roleMiddleware('Admin', 'Manager'), getDashboardSummary);
router.get('/audit', roleMiddleware('Admin', 'Manager'), getAuditTrail);
router.get('/year-end', roleMiddleware('Admin', 'Manager'), getYearEndSummary);

// Admin-only routes
router.post('/config', roleMiddleware('Admin'), savePayrollConfig);
router.post('/process', roleMiddleware('Admin'), processPayroll);
router.put('/update/:payrollId', roleMiddleware('Admin'), updatePayrollEntry);
router.put('/review/:payrollId', roleMiddleware('Admin', 'Manager'), reviewPayroll);
router.put('/approve/:payrollId', roleMiddleware('Admin'), approveAndLockPayroll);

// Dispute management routes (Admin/Manager)
router.get('/disputes', roleMiddleware('Admin', 'Manager'), getAllQueries);
router.put('/dispute/:queryId/resolve', roleMiddleware('Admin', 'Manager'), resolveQuery);

module.exports = router;
