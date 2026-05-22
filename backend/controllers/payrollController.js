const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const OvertimeRequest = require('../models/OvertimeRequest');
const PayrollConfig = require('../models/PayrollConfig');
const Payroll = require('../models/Payroll');
const Payslip = require('../models/Payslip');
const PayrollAudit = require('../models/PayrollAudit');
const PayrollQuery = require('../models/PayrollQuery');
const { generatePayslipPDF } = require('../utils/pdfGenerator');

const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};

// 1. Payroll Configuration (Admin)

exports.savePayrollConfig = async (req, res) => {
  try {
    const {
      employeeId,
      baseSalary,
      hraAmount,
      transportAllowance,
      medicalAllowance,
      specialAllowance,
      pfDeduction,
      esiDeduction,
      tdsDeduction,
      loanDeduction,
      advanceDeduction,
      payCycle,
      lopRule,
    } = req.body;

    if (!employeeId || baseSalary === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and Base Salary are required.',
      });
    }

    // Check if employee exists
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.',
      });
    }

    let config = await PayrollConfig.findOne({ employeeId });
    if (config) {
      config.baseSalary = baseSalary;
      config.hraAmount = hraAmount || 0;
      config.transportAllowance = transportAllowance || 0;
      config.medicalAllowance = medicalAllowance || 0;
      config.specialAllowance = specialAllowance || 0;
      config.pfDeduction = pfDeduction || 0;
      config.esiDeduction = esiDeduction || 0;
      config.tdsDeduction = tdsDeduction || 0;
      config.loanDeduction = loanDeduction || 0;
      config.advanceDeduction = advanceDeduction || 0;
      config.payCycle = payCycle || 'Monthly';
      config.lopRule = lopRule || 'Standard';
      await config.save();
    } else {
      config = await PayrollConfig.create({
        employeeId,
        baseSalary,
        hraAmount: hraAmount || 0,
        transportAllowance: transportAllowance || 0,
        medicalAllowance: medicalAllowance || 0,
        specialAllowance: specialAllowance || 0,
        pfDeduction: pfDeduction || 0,
        esiDeduction: esiDeduction || 0,
        tdsDeduction: tdsDeduction || 0,
        loanDeduction: loanDeduction || 0,
        advanceDeduction: advanceDeduction || 0,
        payCycle: payCycle || 'Monthly',
        lopRule: lopRule || 'Standard',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payroll Configuration Saved Successfully',
      data: config,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPayrollConfig = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const config = await PayrollConfig.findOne({ employeeId }).populate('employeeId', 'fullName email employeeId department designation');
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Payroll configuration not found for this employee.',
      });
    }
    res.status(200).json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Attendance-Based Salary Calculation & Processing

exports.processPayroll = async (req, res) => {
  try {
    const { payrollMonth, employeeId } = req.body; // payrollMonth format: "YYYY-MM"
    if (!payrollMonth) {
      return res.status(400).json({
        success: false,
        message: 'Payroll month is required (YYYY-MM).',
      });
    }

    const [year, month] = payrollMonth.split('-').map(Number);
    const totalDaysInMonth = getDaysInMonth(year, month);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Get list of employees to process
    let employees = [];
    if (employeeId) {
      const emp = await User.findById(employeeId);
      if (!emp) return res.status(404).json({ success: false, message: 'Employee not found.' });
      employees = [emp];
    } else {
      employees = await User.find({ role: 'Employee', isActive: true });
    }

    const processedEntries = [];

    for (const emp of employees) {
      // Fetch Payroll Configuration
      const config = await PayrollConfig.findOne({ employeeId: emp._id });
      if (!config) {
        // Skip if not configured
        continue;
      }

      // Check if duplicate processing
      const existingPayroll = await Payroll.findOne({ employeeId: emp._id, payrollMonth });
      if (existingPayroll && existingPayroll.lockedStatus) {
        // Already processed and locked, skip or throw error if single employee requested
        if (employeeId) {
          return res.status(400).json({
            success: false,
            message: `Payroll for ${emp.fullName} for ${payrollMonth} is already processed and Locked.`,
          });
        }
        continue;
      }

      // Fetch Attendance Data
      const attendanceRecords = await Attendance.find({
        employeeId: emp._id,
        attendanceDate: { $gte: startDate, $lte: endDate },
      });

      // Fetch Leaves
      const leaves = await Leave.find({
        employeeId: emp._id,
        leaveStatus: 'Approved',
        $or: [
          { fromDate: { $gte: startDate, $lte: endDate } },
          { toDate: { $gte: startDate, $lte: endDate } },
          { fromDate: { $lte: startDate }, toDate: { $gte: endDate } },
        ],
      });

      // Calculate leaves within this month
      let presentDays = 0;
      let lateCount = 0;
      let halfDayCount = 0;
      let absentDays = 0;
      let unpaidLeaveDays = 0;

      // Count checked in days
      attendanceRecords.forEach((att) => {
        if (['Present', 'WFH', 'Late'].includes(att.status)) {
          // Check for half-day (working less than 4 hours)
          if (att.checkInTime && att.checkOutTime) {
            const hours = (new Date(att.checkOutTime) - new Date(att.checkInTime)) / 1000 / 3600;
            if (hours > 0 && hours < 4.0) {
              halfDayCount++;
            } else {
              presentDays++;
            }
          } else {
            presentDays++;
          }

          if (att.status === 'Late') {
            lateCount++;
          }
        } else if (att.status === 'Absent') {
          absentDays++;
        }
      });

      // Process leaves
      leaves.forEach((lv) => {
        const start = new Date(lv.fromDate) < startDate ? startDate : new Date(lv.fromDate);
        const end = new Date(lv.toDate) > endDate ? endDate : new Date(lv.toDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        if (lv.leaveType === 'Unpaid Leave') {
          unpaidLeaveDays += diffDays;
        }
      });

      // Strict LOP rules might deduct more. We'll stick to Standard: (BaseSalary / Total Days in Month)
      const dailyRate = config.baseSalary / totalDaysInMonth;
      
      // Calculate absent days based on days passed vs present + leaves
      // If we are processing a past or current month, calculate absent days as:
      // Total Days in Month - presentDays - (all approved leaves)
      let totalLeaves = 0;
      leaves.forEach(lv => {
        const start = new Date(lv.fromDate) < startDate ? startDate : new Date(lv.fromDate);
        const end = new Date(lv.toDate) > endDate ? endDate : new Date(lv.toDate);
        const diffTime = Math.abs(end - start);
        totalLeaves += Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      });

      absentDays = Math.max(0, totalDaysInMonth - presentDays - totalLeaves - halfDayCount);

      // Overtime Hours
      const overtimeRequests = await OvertimeRequest.find({
        employeeId: emp._id,
        overtimeStatus: 'Approved',
        attendanceDate: { $gte: startDate, $lte: endDate },
      });
      let overtimeHours = 0;
      overtimeRequests.forEach((ot) => {
        overtimeHours += ot.overtimeHours;
      });

      // OT Pay: Flat rate 150/hr or configurable (we use default 150)
      const overtimePay = overtimeHours * 150;

      // Deductions
      const lopDeduction = dailyRate * (absentDays + unpaidLeaveDays);
      const halfDayDeduction = dailyRate * 0.5 * halfDayCount;

      const grossSalary =
        config.baseSalary +
        config.hraAmount +
        config.transportAllowance +
        config.medicalAllowance +
        config.specialAllowance +
        overtimePay;

      const totalDeductions =
        config.pfDeduction +
        config.esiDeduction +
        config.tdsDeduction +
        config.loanDeduction +
        config.advanceDeduction +
        lopDeduction +
        halfDayDeduction;

      const netSalary = Math.max(0, grossSalary - totalDeductions);

      // Save or Update Draft Payroll Entry
      let payrollEntry = await Payroll.findOne({ employeeId: emp._id, payrollMonth });
      const previousValue = payrollEntry ? payrollEntry.toObject() : null;

      const payrollData = {
        employeeId: emp._id,
        payrollMonth,
        presentDays,
        absentDays,
        unpaidLeaveDays,
        overtimeHours,
        halfDayCount,
        grossSalary,
        totalDeductions,
        netSalary,
        payrollStatus: 'Draft',
        lockedStatus: false,
      };

      if (payrollEntry) {
        Object.assign(payrollEntry, payrollData);
        await payrollEntry.save();
      } else {
        payrollEntry = await Payroll.create(payrollData);
      }

      // Create Audit Log
      await PayrollAudit.create({
        payrollId: payrollEntry._id,
        actionType: previousValue ? 'Update' : 'Create',
        previousValue,
        updatedValue: payrollEntry.toObject(),
        actionPerformedBy: req.user._id,
      });

      processedEntries.push(payrollEntry);
    }

    res.status(200).json({
      success: true,
      message: 'Salary Calculated Successfully',
      count: processedEntries.length,
      data: processedEntries,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Draft list and Review workflow

exports.getDrafts = async (req, res) => {
  try {
    const { month } = req.query; // format "YYYY-MM"
    const query = {};
    if (month) query.payrollMonth = month;

    const drafts = await Payroll.find(query)
      .populate('employeeId', 'fullName email employeeId department designation')
      .populate('approvedBy', 'fullName');

    // Add anomaly flags on the fly
    const draftsWithAnomalies = [];
    for (const draft of drafts) {
      const anomalies = [];
      // 1. Missing attendance data: 0 records
      const attendanceCount = await Attendance.countDocuments({
        employeeId: draft.employeeId._id,
        attendanceDate: {
          $gte: new Date(draft.payrollMonth + '-01'),
          $lte: new Date(new Date(draft.payrollMonth + '-01').getFullYear(), new Date(draft.payrollMonth + '-01').getMonth() + 1, 0),
        },
      });
      if (attendanceCount === 0) {
        anomalies.push('Missing attendance data for this month.');
      }

      // 2. Net salary is 0 or negative
      if (draft.netSalary <= 0) {
        anomalies.push('Calculated Net Salary is zero or negative.');
      }

      // 3. Check for pending leaves
      const pendingLeaves = await Leave.countDocuments({
        employeeId: draft.employeeId._id,
        leaveStatus: 'Pending',
      });
      if (pendingLeaves > 0) {
        anomalies.push(`${pendingLeaves} leave requests are pending approval.`);
      }

      // 4. Check for pending overtime
      const pendingOT = await OvertimeRequest.countDocuments({
        employeeId: draft.employeeId._id,
        overtimeStatus: 'Pending',
      });
      if (pendingOT > 0) {
        anomalies.push(`${pendingOT} overtime requests are pending approval.`);
      }

      draftsWithAnomalies.push({
        ...draft.toObject(),
        anomalies,
      });
    }

    res.status(200).json({ success: true, data: draftsWithAnomalies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePayrollEntry = async (req, res) => {
  try {
    const { payrollId } = req.params;
    const { presentDays, absentDays, unpaidLeaveDays, overtimeHours, halfDayCount, grossSalary, totalDeductions, netSalary } = req.body;

    const payroll = await Payroll.findById(payrollId);
    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll entry not found.' });
    }

    if (payroll.lockedStatus) {
      return res.status(400).json({
        success: false,
        message: 'Payroll Already Locked. Locked payroll cannot be edited.',
      });
    }

    const previousValue = payroll.toObject();

    if (presentDays !== undefined) payroll.presentDays = presentDays;
    if (absentDays !== undefined) payroll.absentDays = absentDays;
    if (unpaidLeaveDays !== undefined) payroll.unpaidLeaveDays = unpaidLeaveDays;
    if (overtimeHours !== undefined) payroll.overtimeHours = overtimeHours;
    if (halfDayCount !== undefined) payroll.halfDayCount = halfDayCount;
    if (grossSalary !== undefined) payroll.grossSalary = grossSalary;
    if (totalDeductions !== undefined) payroll.totalDeductions = totalDeductions;
    if (netSalary !== undefined) payroll.netSalary = netSalary;

    await payroll.save();

    await PayrollAudit.create({
      payrollId: payroll._id,
      actionType: 'Update',
      previousValue,
      updatedValue: payroll.toObject(),
      actionPerformedBy: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: 'Payroll updated successfully',
      data: payroll,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.reviewPayroll = async (req, res) => {
  try {
    const { payrollId } = req.params;
    const payroll = await Payroll.findById(payrollId);

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll not found.' });
    }

    if (payroll.lockedStatus) {
      return res.status(400).json({ success: false, message: 'Payroll is locked.' });
    }

    const previousValue = payroll.toObject();
    payroll.payrollStatus = 'Reviewed';
    await payroll.save();

    await PayrollAudit.create({
      payrollId: payroll._id,
      actionType: 'Update',
      previousValue,
      updatedValue: payroll.toObject(),
      actionPerformedBy: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: 'Payroll Reviewed Successfully',
      data: payroll,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.approveAndLockPayroll = async (req, res) => {
  try {
    const { payrollId } = req.params;
    const payroll = await Payroll.findById(payrollId);

    if (!payroll) {
      return res.status(404).json({ success: false, message: 'Payroll not found.' });
    }

    if (payroll.payrollStatus !== 'Reviewed') {
      return res.status(400).json({
        success: false,
        message: 'Payroll Must Be Reviewed Before Approval.',
      });
    }

    const previousValue = payroll.toObject();
    payroll.payrollStatus = 'Approved';
    payroll.lockedStatus = true;
    payroll.approvedBy = req.user._id;
    await payroll.save();

    // Now, auto-generate final Payslip record
    const config = await PayrollConfig.findOne({ employeeId: payroll.employeeId });
    const [year, month] = payroll.payrollMonth.split('-').map(Number);
    const totalDays = getDaysInMonth(year, month);
    const dailyRate = config ? config.baseSalary / totalDays : 0;

    const overtimePay = payroll.overtimeHours * 150;
    const lopDeduction = dailyRate * (payroll.absentDays + payroll.unpaidLeaveDays);
    const halfDayDeduction = dailyRate * 0.5 * payroll.halfDayCount;

    const earningsBreakdown = {
      baseSalary: config ? config.baseSalary : 0,
      hra: config ? config.hraAmount : 0,
      transportAllowance: config ? config.transportAllowance : 0,
      medicalAllowance: config ? config.medicalAllowance : 0,
      specialAllowance: config ? config.specialAllowance : 0,
      overtimePay,
    };

    const deductionsBreakdown = {
      pf: config ? config.pfDeduction : 0,
      esi: config ? config.esiDeduction : 0,
      tds: config ? config.tdsDeduction : 0,
      lopDeduction,
      loanDeduction: config ? config.loanDeduction : 0,
      advanceDeduction: config ? config.advanceDeduction : 0,
      halfDayDeduction, // add to breakdown
    };

    await Payslip.findOneAndUpdate(
      { payrollId: payroll._id },
      {
        employeeId: payroll.employeeId,
        payrollId: payroll._id,
        payrollMonth: payroll.payrollMonth,
        earningsBreakdown,
        deductionsBreakdown,
        netPay: payroll.netSalary,
      },
      { upsert: true, new: true }
    );

    // Log Audit Trail
    await PayrollAudit.create({
      payrollId: payroll._id,
      actionType: 'Approve',
      previousValue,
      updatedValue: payroll.toObject(),
      actionPerformedBy: req.user._id,
    });

    res.status(200).json({
      success: true,
      message: 'Payroll Approved & Locked Successfully. Payslip generated.',
      data: payroll,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Payslips Generation & Employee Self-Service

exports.getMyPayslips = async (req, res) => {
  try {
    const payslips = await Payslip.find({ employeeId: req.user._id })
      .populate('payrollId')
      .sort({ payrollMonth: -1 });

    res.status(200).json({ success: true, data: payslips });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.raiseQuery = async (req, res) => {
  try {
    const { payslipId, disputeDetails } = req.body;
    if (!payslipId || !disputeDetails) {
      return res.status(400).json({ success: false, message: 'Payslip ID and dispute details are required.' });
    }

    const query = await PayrollQuery.create({
      employeeId: req.user._id,
      payslipId,
      disputeDetails,
    });

    res.status(201).json({
      success: true,
      message: 'Payroll Query Submitted Successfully',
      data: query,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllQueries = async (req, res) => {
  try {
    const queries = await PayrollQuery.find()
      .populate('employeeId', 'fullName email employeeId')
      .populate({
        path: 'payslipId',
        select: 'payrollMonth netPay',
      });
    res.status(200).json({ success: true, data: queries });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resolveQuery = async (req, res) => {
  try {
    const { queryId } = req.params;
    const { resolution } = req.body;

    const query = await PayrollQuery.findById(queryId);
    if (!query) return res.status(404).json({ success: false, message: 'Query not found.' });

    query.status = 'Resolved';
    query.resolution = resolution || 'Resolved';
    await query.save();

    res.status(200).json({ success: true, message: 'Query resolved.', data: query });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Dashboard, Reports & Audit Log

exports.getDashboardSummary = async (req, res) => {
  try {
    const { month } = req.query; // format "YYYY-MM"
    if (!month) return res.status(400).json({ success: false, message: 'Month is required.' });

    const records = await Payroll.find({ payrollMonth: month }).populate('employeeId', 'department fullName');

    let totalPayout = 0;
    let totalDeductions = 0;
    let netDisbursement = 0;

    const departmentBreakdown = {};

    records.forEach((rec) => {
      totalPayout += rec.grossSalary;
      totalDeductions += rec.totalDeductions;
      netDisbursement += rec.netSalary;

      const dept = rec.employeeId ? rec.employeeId.department || 'Unassigned' : 'Unassigned';
      if (!departmentBreakdown[dept]) {
        departmentBreakdown[dept] = { gross: 0, deductions: 0, net: 0, count: 0 };
      }
      departmentBreakdown[dept].gross += rec.grossSalary;
      departmentBreakdown[dept].deductions += rec.totalDeductions;
      departmentBreakdown[dept].net += rec.netSalary;
      departmentBreakdown[dept].count += 1;
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalPayout,
          totalDeductions,
          netDisbursement,
          totalEmployees: records.length,
        },
        departmentBreakdown,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAuditTrail = async (req, res) => {
  try {
    const logs = await PayrollAudit.find()
      .populate('actionPerformedBy', 'fullName email')
      .populate({
        path: 'payrollId',
        populate: { path: 'employeeId', select: 'fullName employeeId' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getYearEndSummary = async (req, res) => {
  try {
    const { employeeId, year } = req.query;
    if (!employeeId || !year) {
      return res.status(400).json({ success: false, message: 'Employee ID and Year are required.' });
    }

    const regex = new RegExp(`^${year}-`);
    const records = await Payroll.find({
      employeeId,
      payrollMonth: { $regex: regex },
    });

    let yearlyGross = 0;
    let yearlyDeductions = 0;
    let yearlyNet = 0;
    const monthlyBreakdown = [];

    records.forEach((rec) => {
      yearlyGross += rec.grossSalary;
      yearlyDeductions += rec.totalDeductions;
      yearlyNet += rec.netSalary;

      monthlyBreakdown.push({
        month: rec.payrollMonth,
        gross: rec.grossSalary,
        deductions: rec.totalDeductions,
        net: rec.netSalary,
      });
    });

    res.status(200).json({
      success: true,
      data: {
        yearlyGross,
        yearlyDeductions,
        yearlyNet,
        monthlyBreakdown: monthlyBreakdown.sort((a, b) => a.month.localeCompare(b.month)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.downloadPayslipPDF = async (req, res) => {
  try {
    const { payslipId } = req.params;

    const payslip = await Payslip.findById(payslipId).populate('employeeId');
    if (!payslip) {
      return res.status(404).json({ success: false, message: 'Payslip not found.' });
    }

    // Role check: Admin, Manager can download any payslip; Employees can only download their own
    if (
      req.user.role !== 'Admin' &&
      req.user.role !== 'Manager' &&
      req.user._id.toString() !== payslip.employeeId._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Unauthorized access.' });
    }

    const pdfBuffer = await generatePayslipPDF(payslip);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=Payslip_${payslip.employeeId.fullName.replace(/\s+/g, '_')}_${payslip.payrollMonth}.pdf`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  } catch (error) {
    console.error(`Download PDF Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};
