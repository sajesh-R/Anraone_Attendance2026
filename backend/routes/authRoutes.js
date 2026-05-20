const express = require('express');
const router = express.Router();

const {
  register,
  login,
  googleAuth,
  microsoftAuth,
  getMe,
  logout,
} = require('../controllers/authController');

const { authMiddleware } = require('../middleware/authMiddleware');

// ── Public Routes (No token required) ────────────────────────
router.post('/register',   register);
router.post('/login',      login);
router.post('/google',     googleAuth);
router.post('/microsoft',  microsoftAuth);

// ── Protected Routes (JWT required) ──────────────────────────
router.get('/me',          authMiddleware, getMe);
router.post('/logout',     authMiddleware, logout);

module.exports = router;
