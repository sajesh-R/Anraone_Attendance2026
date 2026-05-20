const express = require('express');
const router = express.Router();

const {
  getProfile,
  updateProfile,
  updateProfilePhoto,
  getAllUsers,
  getUserById,
  updateUserRole,
  deactivateUser,
  getAdminProfile,
  updateUserByAdmin,
  resetUserPassword,
  bulkDeactivate,
  bulkShiftChange,
  bulkExport,
  importEmployeesCsv,
} = require('../controllers/userController');

const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const { upload } = require('../config/cloudinary');

// ── All user routes require authentication ────────────────────
router.use(authMiddleware);

// ── Own Profile Routes ────────────────────────────────────────
router.get('/profile',                          getProfile);
router.put('/profile',                          updateProfile);
router.put('/profile/photo', upload.single('profilePhoto'), updateProfilePhoto);

// ── Admin/Manager Routes (Static endpoints first) ─────────────
router.get('/',                 roleMiddleware('Admin', 'Manager'), getAllUsers);
router.post('/bulk-deactivate', roleMiddleware('Admin'),            bulkDeactivate);
router.post('/bulk-shift',      roleMiddleware('Admin'),            bulkShiftChange);
router.post('/bulk-export',     roleMiddleware('Admin'),            bulkExport);
router.post('/import-csv',      roleMiddleware('Admin'),            importEmployeesCsv);

// ── Dynamic ID Endpoints ─────────────────────────────────────
router.get('/:id',              roleMiddleware('Admin', 'Manager'), getUserById);
router.get('/:id/admin-profile',roleMiddleware('Admin', 'Manager'), getAdminProfile);
router.put('/:id/role',         roleMiddleware('Admin'),            updateUserRole);
router.put('/:id/admin-edit',   roleMiddleware('Admin'),            updateUserByAdmin);
router.post('/:id/reset-password',roleMiddleware('Admin'),          resetUserPassword);
router.delete('/:id',           roleMiddleware('Admin'),            deactivateUser);

module.exports = router;
