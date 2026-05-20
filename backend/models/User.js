const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema — Core entity for the Anraone Attendance system.
 * Supports all three roles: Admin, Manager, Employee.
 * Passwords are hashed pre-save via bcryptjs.
 */
const userSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────
    fullName: {
      type: String,
      required: [true, 'Full name is required.'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters.'],
    },

    email: {
      type: String,
      required: [true, 'Email address is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address.'],
    },

    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters.'],
      // Not required — OAuth users may not have a password
      select: false, // Never returned in queries unless explicitly requested
    },

    // ── Role & Access ─────────────────────────────────────────
    role: {
      type: String,
      enum: {
        values: ['Admin', 'Manager', 'Employee'],
        message: 'Role must be Admin, Manager, or Employee.',
      },
      default: 'Employee',
    },

    // ── Professional Details ──────────────────────────────────
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    department: {
      type: String,
      trim: true,
      default: '',
    },

    designation: {
      type: String,
      trim: true,
      default: '',
    },

    shiftType: {
      type: String,
      enum: ['Morning', 'Evening', 'Night', 'General', 'Flexible', ''],
      default: '',
    },

    phone: {
      type: String,
      trim: true,
      default: '',
    },

    dob: {
      type: Date,
      default: null,
    },

    address: {
      type: String,
      trim: true,
      default: '',
    },

    reportingManager: {
      type: String,
      trim: true,
      default: '',
    },

    joinDate: {
      type: Date,
      default: null,
    },

    lastSeenTimestamp: {
      type: Date,
      default: null,
    },

    profilePhoto: {
      type: String, // URL (Cloudinary) or local path
      default: '',
    },

    // ── OAuth Providers ───────────────────────────────────────
    googleId: {
      type: String,
      default: null,
    },

    microsoftId: {
      type: String,
      default: null,
    },

    authProvider: {
      type: String,
      enum: ['local', 'google', 'microsoft'],
      default: 'local',
    },

    // ── Session Tracking ──────────────────────────────────────
    lastLoginAt: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// ─── Pre-save Hook: Hash password before storing ─────────────
userSchema.pre('save', async function (next) {
  // Only hash if password field was modified
  if (!this.isModified('password') || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ─── Instance Method: Compare plain password with hash ───────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Instance Method: Return safe public profile ─────────────
userSchema.methods.toPublicProfile = function () {
  return {
    id: this._id,
    fullName: this.fullName,
    email: this.email,
    role: this.role,
    employeeId: this.employeeId,
    department: this.department,
    designation: this.designation,
    shiftType: this.shiftType,
    phone: this.phone,
    dob: this.dob,
    address: this.address,
    reportingManager: this.reportingManager,
    joinDate: this.joinDate,
    lastSeenTimestamp: this.lastSeenTimestamp || this.lastLoginAt,
    profilePhoto: this.profilePhoto,
    authProvider: this.authProvider,
    lastLoginAt: this.lastLoginAt,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
