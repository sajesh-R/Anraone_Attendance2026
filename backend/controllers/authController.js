const User = require('../models/User');
const LoginActivity = require('../models/LoginActivity');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'anraone_attendance_fallback_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

// ─── Helper: Generate JWT Token ──────────────────────────────
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// ─── Helper: Build success login response ────────────────────
const sendTokenResponse = (res, user, statusCode = 200, message = 'Success.') => {
  const token = generateToken(user._id);

  return res.status(statusCode).json({
    success: true,
    message,
    token,
    user: user.toPublicProfile(),
  });
};

const logLoginActivity = async (userId, req) => {
  try {
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    await LoginActivity.create({
      employeeId: userId,
      ipAddress,
      loginTimestamp: new Date(),
    });
  } catch (error) {
    console.error('Failed to log login activity:', error);
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/register
// @desc    Register a new user with email & password
// @access  Public
// ────────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  const { fullName, email, password, role } = req.body;

  // ── Validation ───────────────────────────────────────────────
  if (!fullName || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Full name, email, and password are required fields.',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long.',
    });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    // ── Check for existing user ───────────────────────────────
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // ── Create user (password is hashed via model pre-save hook) ─
    const user = await User.create({
      fullName: fullName.trim(),
      email: cleanEmail,
      password,
      role: role || 'Employee',
      authProvider: 'local',
      lastLoginAt: new Date(),
      lastSeenTimestamp: new Date(),
    });

    await logLoginActivity(user._id, req);

    return sendTokenResponse(res, user, 201, 'Account created successfully!');
  } catch (error) {
    console.error(`Auth Register Error: ${error.message}`);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(' ') });
    }

    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred during registration.',
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/login
// @desc    Login with email & password — returns JWT
// @access  Public
// ────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  // ── Validation ───────────────────────────────────────────────
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.',
    });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    // Explicitly select password (excluded by default via schema)
    const user = await User.findOne({ email: cleanEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // ── Check if account is local-auth capable ───────────────
    if (user.authProvider !== 'local' || !user.password) {
      return res.status(400).json({
        success: false,
        message: `This account is registered via ${user.authProvider}. Please use that login method.`,
      });
    }

    // ── Verify password ──────────────────────────────────────
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // ── Check active status ──────────────────────────────────
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    // ── Update last login timestamp ──────────────────────────
    user.lastLoginAt = new Date();
    user.lastSeenTimestamp = new Date();
    await user.save({ validateBeforeSave: false });

    await logLoginActivity(user._id, req);

    return sendTokenResponse(res, user, 200, 'Login successful!');
  } catch (error) {
    console.error(`Auth Login Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'An internal server error occurred during login.',
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/google
// @desc    Google OAuth — receives Google profile data from frontend
// @access  Public
// ────────────────────────────────────────────────────────────────────
const googleAuth = async (req, res) => {
  const { googleId, email, fullName, profilePhoto } = req.body;

  if (!googleId || !email) {
    return res.status(400).json({
      success: false,
      message: 'Google ID and email are required for OAuth login.',
    });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    // Find existing user by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email: cleanEmail }] });

    if (user) {
      // Link Google ID if not already linked
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
      }
      user.lastLoginAt = new Date();
      user.lastSeenTimestamp = new Date();
      await user.save({ validateBeforeSave: false });
    } else {
      // Create new user from Google profile
      user = await User.create({
        fullName,
        email: cleanEmail,
        googleId,
        authProvider: 'google',
        profilePhoto: profilePhoto || '',
        lastLoginAt: new Date(),
        lastSeenTimestamp: new Date(),
      });
    }

    await logLoginActivity(user._id, req);

    return sendTokenResponse(res, user, 200, 'Google login successful!');
  } catch (error) {
    console.error(`Google Auth Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Google authentication failed. Please try again.',
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/microsoft
// @desc    Microsoft SSO — receives Microsoft profile from frontend
// @access  Public
// ────────────────────────────────────────────────────────────────────
const microsoftAuth = async (req, res) => {
  const { microsoftId, email, fullName } = req.body;

  if (!microsoftId || !email) {
    return res.status(400).json({
      success: false,
      message: 'Microsoft ID and email are required for SSO login.',
    });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    let user = await User.findOne({ $or: [{ microsoftId }, { email: cleanEmail }] });

    if (user) {
      if (!user.microsoftId) {
        user.microsoftId = microsoftId;
        user.authProvider = 'microsoft';
      }
      user.lastLoginAt = new Date();
      user.lastSeenTimestamp = new Date();
      await user.save({ validateBeforeSave: false });
    } else {
      user = await User.create({
        fullName,
        email: cleanEmail,
        microsoftId,
        authProvider: 'microsoft',
        lastLoginAt: new Date(),
        lastSeenTimestamp: new Date(),
      });
    }

    await logLoginActivity(user._id, req);

    return sendTokenResponse(res, user, 200, 'Microsoft login successful!');
  } catch (error) {
    console.error(`Microsoft Auth Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Microsoft SSO authentication failed. Please try again.',
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   GET /api/auth/me
// @desc    Get current logged-in user profile
// @access  Private (requires valid JWT)
// ────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    // req.user is populated by authMiddleware
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      user: user.toPublicProfile(),
    });
  } catch (error) {
    console.error(`Auth getMe Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile.',
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   POST /api/auth/logout
// @desc    Logout (client-side token invalidation endpoint)
// @access  Private
// ────────────────────────────────────────────────────────────────────
const logout = async (req, res) => {
  try {
    const activeSession = await LoginActivity.findOne({
      employeeId: req.user._id,
      logoutTimestamp: null,
    }).sort({ loginTimestamp: -1 });

    if (activeSession) {
      activeSession.logoutTimestamp = new Date();
      await activeSession.save();
    }

    await User.findByIdAndUpdate(req.user._id, {
      $set: { lastSeenTimestamp: new Date() },
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully. Please clear your local session token.',
    });
  } catch (error) {
    console.error(`Logout Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Logged out successfully, but failed to record session end.',
    });
  }
};

module.exports = {
  register,
  login,
  googleAuth,
  microsoftAuth,
  getMe,
  logout,
};
