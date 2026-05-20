const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const LeaveBalance = require('../models/LeaveBalance');
const OvertimeRequest = require('../models/OvertimeRequest');
const RegularizationRequest = require('../models/RegularizationRequest');
const LoginActivity = require('../models/LoginActivity');
const { isCloudinaryConfigured } = require('../config/cloudinary');
const path = require('path');

// ────────────────────────────────────────────────────────────────────
// @route   GET /api/users/profile
// @desc    Get current user's full profile
// @access  Private
// ────────────────────────────────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      user: user.toPublicProfile(),
    });
  } catch (error) {
    console.error(`Get Profile Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch profile. Please try again.',
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   PUT /api/users/profile
// @desc    Update current user's profile (text fields only)
// @access  Private
// ────────────────────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  const { fullName, department, designation, shiftType, phone } = req.body;

  // ── Field Validation ─────────────────────────────────────────
  if (fullName && fullName.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Full name must be at least 2 characters.',
    });
  }

  const validShifts = ['Morning', 'Evening', 'Night', 'General', 'Flexible', ''];
  if (shiftType && !validShifts.includes(shiftType)) {
    return res.status(400).json({
      success: false,
      message: `Shift type must be one of: ${validShifts.filter(Boolean).join(', ')}.`,
    });
  }

  try {
    const updateData = {};
    if (fullName !== undefined)    updateData.fullName = fullName.trim();
    if (department !== undefined)  updateData.department = department.trim();
    if (designation !== undefined) updateData.designation = designation.trim();
    if (shiftType !== undefined)   updateData.shiftType = shiftType;
    if (phone !== undefined)       updateData.phone = phone.trim();

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully!',
      user: updatedUser.toPublicProfile(),
    });
  } catch (error) {
    console.error(`Update Profile Error: ${error.message}`);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(' ') });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update profile. Please try again.',
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   PUT /api/users/profile/photo
// @desc    Upload or replace profile photo
// @access  Private
// ────────────────────────────────────────────────────────────────────
const updateProfilePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file was provided.',
      });
    }

    // Determine photo URL: Cloudinary URL or local serve path
    let photoUrl;
    if (isCloudinaryConfigured && req.file.path) {
      photoUrl = req.file.path; // Cloudinary returns secure_url in .path
    } else {
      // Serve from local uploads directory
      const filename = path.basename(req.file.path);
      photoUrl = `/uploads/profile-photos/${filename}`;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { profilePhoto: photoUrl } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Profile photo updated successfully!',
      profilePhoto: photoUrl,
      user: updatedUser.toPublicProfile(),
    });
  } catch (error) {
    console.error(`Profile Photo Update Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload profile photo. Please try again.',
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   GET /api/users
// @desc    Get all users (Admin/Manager only)
// @access  Private — Admin, Manager
// ────────────────────────────────────────────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', department = '', role = '', shiftType = '', status = '' } = req.query;

    const query = {};

    // ── Search ──────────────────────────────────────────────────
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { employeeId: searchRegex }
      ];
    }

    // ── Filters ─────────────────────────────────────────────────
    if (department) {
      query.department = department;
    }
    if (role) {
      query.role = role;
    }
    if (shiftType) {
      query.shiftType = shiftType;
    }
    if (status) {
      query.isActive = status === 'Active';
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const totalUsers = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      total: totalUsers,
      pages: Math.ceil(totalUsers / limitNum),
      currentPage: pageNum,
      limit: limitNum,
      users: users.map((u) => u.toPublicProfile()),
    });
  } catch (error) {
    console.error(`Get All Users Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users.',
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   GET /api/users/:id
// @desc    Get single user by ID (Admin/Manager only)
// @access  Private — Admin, Manager
// ────────────────────────────────────────────────────────────────────
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

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
    console.error(`Get User By ID Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user.',
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   PUT /api/users/:id/role
// @desc    Update a user's role (Admin only)
// @access  Private — Admin
// ────────────────────────────────────────────────────────────────────
const updateUserRole = async (req, res) => {
  const { role } = req.body;

  const validRoles = ['Admin', 'Manager', 'Employee'];
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: `Role must be one of: ${validRoles.join(', ')}.`,
    });
  }

  // Prevent self-demotion
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot modify your own role.',
    });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { role } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `User role updated to ${role} successfully.`,
      user: updatedUser.toPublicProfile(),
    });
  } catch (error) {
    console.error(`Update User Role Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user role.',
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   DELETE /api/users/:id
// @desc    Soft-delete (deactivate) a user (Admin only)
// @access  Private — Admin
// ────────────────────────────────────────────────────────────────────
const deactivateUser = async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({
      success: false,
      message: 'You cannot deactivate your own account.',
    });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User account deactivated successfully.',
    });
  } catch (error) {
    console.error(`Deactivate User Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to deactivate user.',
    });
  }
};

// Helper for parsing CSV
const parseCSVText = (text) => {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  // Parse headers
  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim().replace(/^["']|["']$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^["']|["']$/g, ''));

    const row = {};
    headers.forEach((header, index) => {
      const cleanHeader = header.toLowerCase().replace(/\s+/g, '');
      let key = header;
      if (cleanHeader === 'employeeid' || cleanHeader === 'empid') key = 'employeeId';
      else if (cleanHeader === 'fullname' || cleanHeader === 'name') key = 'fullName';
      else if (cleanHeader === 'email') key = 'email';
      else if (cleanHeader === 'phone' || cleanHeader === 'phonenumber') key = 'phone';
      else if (cleanHeader === 'dob' || cleanHeader === 'dateofbirth') key = 'dob';
      else if (cleanHeader === 'address') key = 'address';
      else if (cleanHeader === 'department') key = 'department';
      else if (cleanHeader === 'designation') key = 'designation';
      else if (cleanHeader === 'reportingmanager' || cleanHeader === 'manager') key = 'reportingManager';
      else if (cleanHeader === 'shift' || cleanHeader === 'shifttype') key = 'shift';
      else if (cleanHeader === 'joindate' || cleanHeader === 'joineddate') key = 'joinDate';
      else if (cleanHeader === 'role') key = 'role';

      row[key] = values[index] || '';
    });
    result.push(row);
  }
  return result;
};

// ────────────────────────────────────────────────────────────────────
// @route   GET /api/users/:id/admin-profile
// @desc    Get detailed employee profile for admin view
// @access  Private — Admin, Manager
// ────────────────────────────────────────────────────────────────────
const getAdminProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found.',
      });
    }

    // ── Fetch Attendance & Calculate Summaries ────────────────
    const attendanceRecords = await Attendance.find({ employeeId: id });
    const presentCount = attendanceRecords.filter(r => ['Present', 'WFH', 'Checked-In', 'Checked-Out'].includes(r.status)).length;
    const absentCount = attendanceRecords.filter(r => r.status === 'Absent').length;
    const lateCount = attendanceRecords.filter(r => r.status === 'Late').length;

    // ── Fetch Leave Balance ──────────────────────────────────
    let leaveBalance = await LeaveBalance.findOne({ employeeId: id });
    if (!leaveBalance) {
      leaveBalance = await LeaveBalance.create({ employeeId: id });
    }
    const totalLeaveBalance = (leaveBalance.sickLeaveBalance || 0) + 
                              (leaveBalance.casualLeaveBalance || 0) + 
                              (leaveBalance.paidLeaveBalance || 0);

    // ── Fetch History Logs ───────────────────────────────────
    const leaveHistory = await Leave.find({ employeeId: id }).sort({ fromDate: -1 });
    const overtimeHistory = await OvertimeRequest.find({ employeeId: id }).sort({ attendanceDate: -1 });
    const regularizationHistory = await RegularizationRequest.find({ employeeId: id }).sort({ attendanceDate: -1 });
    const loginHistory = await LoginActivity.find({ employeeId: id }).sort({ loginTimestamp: -1 }).limit(50);

    return res.status(200).json({
      success: true,
      user: user.toPublicProfile(),
      attendanceSummary: {
        presentDays: presentCount,
        absentDays: absentCount,
        lateCount,
        leaveBalance: totalLeaveBalance,
        detailedBalances: {
          sick: leaveBalance.sickLeaveBalance,
          casual: leaveBalance.casualLeaveBalance,
          paid: leaveBalance.paidLeaveBalance,
          compOff: leaveBalance.compOffBalance,
          unpaidCount: leaveBalance.unpaidLeaveCount
        }
      },
      leaveHistory,
      overtimeHistory,
      regularizationHistory,
      loginHistory,
    });
  } catch (error) {
    console.error(`Get Admin Profile Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch detailed employee profile.',
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   PUT /api/users/:id/admin-edit
// @desc    Admin updates employee personal & work details
// @access  Private — Admin
// ────────────────────────────────────────────────────────────────────
const updateUserByAdmin = async (req, res) => {
  const { id } = req.params;
  const {
    fullName,
    email,
    phone,
    dob,
    address,
    department,
    designation,
    reportingManager,
    shiftType,
    joinDate,
    employeeId,
    isActive,
    role
  } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found.',
      });
    }

    // ── Unique Email check ───────────────────────────────────
    if (email && email.trim().toLowerCase() !== user.email.toLowerCase()) {
      const cleanEmail = email.trim().toLowerCase();
      const emailExists = await User.findOne({ email: cleanEmail });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Duplicate email: An account with this email already exists.',
        });
      }
      user.email = cleanEmail;
    }

    // ── Unique Employee ID check ──────────────────────────────
    if (employeeId && employeeId.trim() !== user.employeeId) {
      const empIdExists = await User.findOne({ employeeId: employeeId.trim() });
      if (empIdExists) {
        return res.status(400).json({
          success: false,
          message: 'Duplicate Employee ID: This Employee ID is already assigned.',
        });
      }
      user.employeeId = employeeId.trim();
    } else if (employeeId === '') {
      user.employeeId = undefined;
    }

    // ── Field Updates ────────────────────────────────────────
    if (fullName !== undefined) user.fullName = fullName.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (dob !== undefined) user.dob = dob ? new Date(dob) : null;
    if (address !== undefined) user.address = address.trim();
    if (department !== undefined) user.department = department.trim();
    if (designation !== undefined) user.designation = designation.trim();
    if (reportingManager !== undefined) user.reportingManager = reportingManager.trim();
    if (shiftType !== undefined) user.shiftType = shiftType;
    if (joinDate !== undefined) user.joinDate = joinDate ? new Date(joinDate) : null;
    if (isActive !== undefined) user.isActive = isActive;
    if (role !== undefined) user.role = role;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Employee details updated successfully!',
      user: user.toPublicProfile(),
    });
  } catch (error) {
    console.error(`Admin Update Profile Error: ${error.message}`);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(' ') });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to update employee details.',
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   POST /api/users/:id/reset-password
// @desc    Admin resets employee password (with auto-generation)
// @access  Private — Admin
// ────────────────────────────────────────────────────────────────────
const resetUserPassword = async (req, res) => {
  const { id } = req.params;
  let { password } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found.',
      });
    }

    if (!password || password.trim().length < 6) {
      password = `Anraone@${Math.floor(100000 + Math.random() * 900000)}`;
    }

    user.password = password;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully!',
      generatedPassword: password,
    });
  } catch (error) {
    console.error(`Reset Password Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset employee password.',
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   POST /api/users/bulk-deactivate
// @desc    Admin deactivates multiple employee accounts
// @access  Private — Admin
// ────────────────────────────────────────────────────────────────────
const bulkDeactivate = async (req, res) => {
  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No employees selected. At least one employee must be selected.',
    });
  }

  const filteredIds = userIds.filter(id => id !== req.user._id.toString());

  try {
    await User.updateMany(
      { _id: { $in: filteredIds } },
      { $set: { isActive: false } }
    );

    return res.status(200).json({
      success: true,
      message: 'Selected employee accounts deactivated successfully.',
    });
  } catch (error) {
    console.error(`Bulk Deactivate Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to deactivate selected employees.',
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   POST /api/users/bulk-shift
// @desc    Admin changes shift of multiple employee accounts
// @access  Private — Admin
// ────────────────────────────────────────────────────────────────────
const bulkShiftChange = async (req, res) => {
  const { userIds, shiftType } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No employees selected. At least one employee must be selected.',
    });
  }

  const validShifts = ['Morning', 'Evening', 'Night', 'General', 'Flexible', ''];
  if (shiftType !== undefined && !validShifts.includes(shiftType)) {
    return res.status(400).json({
      success: false,
      message: `Invalid shift type: Must be one of: ${validShifts.filter(Boolean).join(', ')}.`,
    });
  }

  try {
    await User.updateMany(
      { _id: { $in: userIds } },
      { $set: { shiftType } }
    );

    return res.status(200).json({
      success: true,
      message: 'Bulk shift assignment completed successfully.',
    });
  } catch (error) {
    console.error(`Bulk Shift Change Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to update shift for selected employees.',
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   POST /api/users/bulk-export
// @desc    Admin exports multiple employee details (CSV format)
// @access  Private — Admin
// ────────────────────────────────────────────────────────────────────
const bulkExport = async (req, res) => {
  const { userIds, format = 'csv' } = req.body;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No employees selected. At least one employee must be selected.',
    });
  }

  try {
    const users = await User.find({ _id: { $in: userIds } });

    if (format.toLowerCase() === 'pdf') {
      return res.status(200).json({
        success: true,
        users: users.map(u => u.toPublicProfile())
      });
    }

    let csvContent = '\uFEFF';
    csvContent += 'Employee ID,Full Name,Email,Phone,DOB,Address,Department,Designation,Reporting Manager,Shift,Join Date,Status\n';

    users.forEach((user) => {
      const row = [
        user.employeeId || '',
        user.fullName || '',
        user.email || '',
        user.phone || '',
        user.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
        `"${(user.address || '').replace(/"/g, '""')}"`,
        user.department || '',
        user.designation || '',
        user.reportingManager || '',
        user.shiftType || '',
        user.joinDate ? new Date(user.joinDate).toISOString().split('T')[0] : '',
        user.isActive ? 'Active' : 'Inactive'
      ];
      csvContent += row.join(',') + '\n';
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=employees_export.csv');
    return res.status(200).send(csvContent);

  } catch (error) {
    console.error(`Bulk Export Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to export employee records.',
    });
  }
};

// ────────────────────────────────────────────────────────────────────
// @route   POST /api/users/import-csv
// @desc    Admin uploads employee CSV to import accounts & leave profiles
// @access  Private — Admin
// ────────────────────────────────────────────────────────────────────
const importEmployeesCsv = async (req, res) => {
  let employees = req.body.employees;

  if (req.body.csvString) {
    try {
      employees = parseCSVText(req.body.csvString);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CSV format.',
      });
    }
  }

  if (req.file) {
    try {
      const fileContent = req.file.buffer.toString('utf8');
      employees = parseCSVText(fileContent);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CSV file content.',
      });
    }
  }

  if (!employees || !Array.isArray(employees) || employees.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid CSV structure or missing employee rows. Mandatory fields cannot be empty.',
    });
  }

  const sessionUsers = [];
  const errors = [];

  try {
    const seenEmails = new Set();
    const seenEmpIds = new Set();

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const rowNum = i + 1;

      if (!emp.fullName || !emp.fullName.trim()) {
        errors.push(`Row ${rowNum}: Full Name is required.`);
      }
      if (!emp.email || !emp.email.trim()) {
        errors.push(`Row ${rowNum}: Email is required.`);
      }
      if (!emp.employeeId || !emp.employeeId.toString().trim()) {
        errors.push(`Row ${rowNum}: Employee ID is required.`);
      }

      const emailKey = (emp.email || '').toLowerCase().trim();
      const empIdKey = (emp.employeeId || '').toString().trim();

      if (seenEmails.has(emailKey)) {
        errors.push(`Row ${rowNum}: Duplicate email in CSV file: ${emp.email}`);
      }
      if (seenEmpIds.has(empIdKey)) {
        errors.push(`Row ${rowNum}: Duplicate Employee ID in CSV file: ${emp.employeeId}`);
      }

      seenEmails.add(emailKey);
      seenEmpIds.add(empIdKey);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'CSV validation errors found.',
        errors,
      });
    }

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const rowNum = i + 1;
      const email = emp.email.toLowerCase().trim();
      const employeeId = emp.employeeId.toString().trim();

      const emailExists = await User.findOne({ email });
      if (emailExists) {
        errors.push(`Row ${rowNum}: Email already exists in database: ${emp.email}`);
      }

      const empIdExists = await User.findOne({ employeeId });
      if (empIdExists) {
        errors.push(`Row ${rowNum}: Employee ID already exists in database: ${emp.employeeId}`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Database conflict errors found.',
        errors,
      });
    }

    for (const emp of employees) {
      const defaultPassword = `Anraone@${Math.floor(100000 + Math.random() * 900000)}`;

      const newUser = await User.create({
        fullName: emp.fullName.trim(),
        email: emp.email.toLowerCase().trim(),
        employeeId: emp.employeeId.toString().trim(),
        phone: (emp.phone || '').toString().trim(),
        dob: emp.dob ? new Date(emp.dob) : null,
        address: (emp.address || '').trim(),
        department: (emp.department || '').trim(),
        designation: (emp.designation || '').trim(),
        reportingManager: (emp.reportingManager || '').trim(),
        shiftType: (emp.shift || '').trim() || 'General',
        joinDate: emp.joinDate ? new Date(emp.joinDate) : new Date(),
        password: defaultPassword,
        role: emp.role || 'Employee',
        isActive: true,
        authProvider: 'local',
      });

      await LeaveBalance.create({
        employeeId: newUser._id,
        sickLeaveBalance: 12,
        casualLeaveBalance: 12,
        paidLeaveBalance: 15,
        unpaidLeaveCount: 0,
        compOffBalance: 0,
      });

      sessionUsers.push({
        fullName: newUser.fullName,
        email: newUser.email,
        employeeId: newUser.employeeId,
        temporaryPassword: defaultPassword
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Employees imported successfully and profiles created automatically.',
      importedCount: sessionUsers.length,
      importedUsers: sessionUsers
    });

  } catch (error) {
    console.error(`Import CSV Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to import CSV data. Please check CSV format.',
    });
  }
};

module.exports = {
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
};
