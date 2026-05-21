require('dotenv').config();
process.env.TZ = process.env.TZ || 'Asia/Kolkata';
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { connectDB } = require('../config/db');
const { startScheduler } = require('../services/schedulerService');

// ── Routers ───────────────────────────────────────────────────
const authRoutes = require('../routes/authRoutes');
const userRoutes = require('../routes/userRoutes');
const attendanceRoutes = require('../routes/attendanceRoutes');
const leaveRoutes = require('../routes/leaveRoutes');
const notificationRoutes = require('../routes/notificationRoutes');
const overtimeRoutes = require('../routes/overtimeRoutes');
const regularizationRoutes = require('../routes/regularizationRoutes');
const auditRoutes = require('../routes/auditRoutes');
const reportRoutes = require('../routes/reportRoutes');
const pushRoutes = require('../routes/pushRoutes');



const app = express();

// ── Initialize Upload Directories ────────────────────────────
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const profilePhotosDir = path.join(uploadsDir, 'profile-photos');
if (!fs.existsSync(profilePhotosDir)) {
  fs.mkdirSync(profilePhotosDir, { recursive: true });
}

// ── Global Middlewares ────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Serve Static Files (local profile photos) ─────────────────
app.use('/uploads', express.static(uploadsDir));

// ── Connect DB and Start Server ───────────────────────────────
const startServer = async () => {
  await connectDB();
  
  // Start the background cron jobs for notifications
  startScheduler();

  // ── Mount API Endpoints ──────────────────────────────────
  app.use('/api/auth',  authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/leave', leaveRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/overtime', overtimeRoutes);
  app.use('/api/regularization', regularizationRoutes);
  app.use('/api/audit-trail', auditRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/push', pushRoutes);



  // ── Health Check ─────────────────────────────────────────
  app.get('/', (req, res) => {
    res.json({
      name: 'Anraone Attendance – Authentication & User Management API',
      status: 'Running ✅',
      version: '1.0.0',
      time: new Date().toISOString(),
    });
  });

  // ── 404 Handler ───────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // ── Global Error Handler ──────────────────────────────────
  app.use((err, req, res, next) => {
    console.error(`Global Server Error: ${err.stack}`);
    res.status(err.statusCode || 500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected server error occurred.',
    });
  });

  const PORT = process.env.PORT || 5003;
  app.listen(PORT, () => {
    console.log(`\n=====================================================================`);
    console.log(`🚀  Anraone Attendance Server running on port ${PORT}`);
    console.log(`📡  Auth API:  http://localhost:${PORT}/api/auth`);
    console.log(`👤  Users API: http://localhost:${PORT}/api/users`);
    console.log(`=====================================================================\n`);
  });
};

startServer();
