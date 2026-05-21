const cron = require('node-cron');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const AttendanceSummary = require('../models/AttendanceSummary');
const { sendNotification } = require('./notificationService');
const { sendMonthlySummaryEmail } = require('./emailService');

const startScheduler = () => {
  console.log('⏰ Starting Notification Scheduler Service...');

  const tzOptions = {
    scheduled: true,
    timezone: process.env.TZ || 'Asia/Kolkata',
  };

  // 1. Daily Punch-In Reminder (Runs at 09:15 AM every day)
  cron.schedule('15 9 * * *', async () => {
    console.log('🔄 Running Daily Punch-In Reminder Job...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all active employees
      const activeUsers = await User.find({ isActive: true, role: { $ne: 'Admin' } });

      for (const user of activeUsers) {
        // Check if they checked in today
        const attendance = await Attendance.findOne({
          employeeId: user._id,
          attendanceDate: today,
        });

        if (!attendance) {
          // Check if they are on approved leave today
          const leave = await Leave.findOne({
            employeeId: user._id,
            leaveStatus: 'Approved',
            fromDate: { $lte: today },
            toDate: { $gte: today },
          });

          if (!leave) {
            // Send reminder notification
            await sendNotification({
              recipientId: user._id,
              type: 'PunchInReminder',
              title: 'Punch-In Reminder',
              message: 'You have not checked in yet for today. Please clock in to record your attendance.',
              deliveryChannel: ['In-App', 'Email', 'Push'],
            });
          }
        }
      }
    } catch (error) {
      console.error('Error in Daily Punch-In Reminder Job:', error);
    }
  }, tzOptions);

  // 2. Daily Absence Alert (Runs at 11:30 PM every day)
  cron.schedule('30 23 * * *', async () => {
    console.log('🔄 Running Daily Absence Alert Job...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activeUsers = await User.find({ isActive: true, role: { $ne: 'Admin' } });

      // Notify all active Admin/Manager/HR users
      const notificationRecipients = await User.find({ isActive: true, role: { $in: ['Admin', 'Manager'] } });

      for (const user of activeUsers) {
        // Check attendance
        const attendance = await Attendance.findOne({
          employeeId: user._id,
          attendanceDate: today,
        });

        if (!attendance) {
          // Check if they are on approved leave
          const leave = await Leave.findOne({
            employeeId: user._id,
            leaveStatus: 'Approved',
            fromDate: { $lte: today },
            toDate: { $gte: today },
          });

          if (!leave) {
            // Mark as Absent in DB
            await Attendance.create({
              employeeId: user._id,
              attendanceDate: today,
              checkInTime: new Date(), // Dummy time for record
              latitude: 0,
              longitude: 0,
              ipAddress: 'System',
              timezone: 'UTC',
              status: 'Absent',
              workMode: 'Office',
            });

            // Notify all managers/admins
            for (const recipient of notificationRecipients) {
              await sendNotification({
                recipientId: recipient._id,
                type: 'AbsenceAlert',
                title: 'Absence Alert',
                message: `Employee ${user.fullName} (${user.email}) is marked Absent for today. No approved leave was found.`,
                deliveryChannel: ['In-App', 'Email', 'Push'],
                relatedId: user._id,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in Daily Absence Alert Job:', error);
    }
  }, tzOptions);

  // 3. Monthly Attendance Summary (Runs on 1st of every month at 08:00 AM)
  cron.schedule('0 8 1 * *', async () => {
    console.log('🔄 Running Monthly Attendance Summary Job...');
    try {
      const now = new Date();
      // Get previous month
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      const monthString = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

      const activeUsers = await User.find({ isActive: true });

      for (const user of activeUsers) {
        const records = await Attendance.find({
          employeeId: user._id,
          attendanceDate: { $gte: prevMonth, $lte: prevMonthEnd },
        });

        const presentDays = records.filter(r => r.status === 'Present' || r.status === 'WFH' || r.status === 'Late').length;
        const absentDays = records.filter(r => r.status === 'Absent').length;
        const lateCount = records.filter(r => r.status === 'Late').length;

        // Calculate leaves for previous month
        const leaves = await Leave.find({
          employeeId: user._id,
          leaveStatus: 'Approved',
          $or: [
            { fromDate: { $gte: prevMonth, $lte: prevMonthEnd } },
            { toDate: { $gte: prevMonth, $lte: prevMonthEnd } },
            { fromDate: { $lte: prevMonth }, toDate: { $gte: prevMonthEnd } }
          ]
        });

        let leaveCount = 0;
        leaves.forEach(leave => {
          const start = new Date(Math.max(leave.fromDate, prevMonth));
          const end = new Date(Math.min(leave.toDate, prevMonthEnd));
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          leaveCount += diffDays;
        });

        const totalWorkingDays = presentDays + absentDays + leaveCount;
        const attendancePercentage = totalWorkingDays > 0 ? (presentDays / totalWorkingDays) * 100 : 0;

        const summaryData = {
          employeeId: user._id,
          month: monthString,
          presentDays,
          absentDays,
          lateCount,
          leaveCount,
          attendancePercentage,
        };

        // Save Summary to DB
        await AttendanceSummary.create(summaryData);

        // Send Email
        if (user.email) {
          await sendMonthlySummaryEmail(user.email, user.fullName, monthString, summaryData);
        }
      }
    } catch (error) {
      console.error('Error in Monthly Summary Job:', error);
    }
  }, tzOptions);

};

module.exports = {
  startScheduler,
};
