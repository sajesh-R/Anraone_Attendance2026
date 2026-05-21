const nodemailer = require('nodemailer');

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Sends a generic notification email
 */
const sendNotificationEmail = async (toEmail, title, message) => {
  if (!process.env.SMTP_USER) {
    console.warn('⚠️ SMTP_USER is not configured. Skipping email send to:', toEmail);
    return false;
  }

  const mailOptions = {
    from: `"Anraone Attendance" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: title,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; text-align: center;">Anraone Attendance</h2>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <h3 style="color: #1e293b;">${title}</h3>
        <p style="color: #475569; line-height: 1.6;">${message}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">This is an automated message from Anraone Attendance System.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email sent to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send email to ${toEmail}:`, error.message);
    return false;
  }
};

/**
 * Sends a monthly attendance summary email
 */
const sendMonthlySummaryEmail = async (toEmail, employeeName, month, summaryData) => {
  if (!process.env.SMTP_USER) {
    console.warn('⚠️ SMTP_USER is not configured. Skipping monthly summary email to:', toEmail);
    return false;
  }

  const { presentDays, absentDays, lateCount, leaveCount, attendancePercentage } = summaryData;

  const mailOptions = {
    from: `"Anraone Attendance" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `Monthly Attendance Summary - ${month}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; text-align: center;">Anraone Attendance</h2>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <h3 style="color: #1e293b;">Hello ${employeeName},</h3>
        <p style="color: #475569; line-height: 1.6;">Here is your attendance summary for the month of <strong>${month}</strong>:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: bold;">Present Days</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${presentDays}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: bold;">Absent Days</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${absentDays}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: bold;">Late Count</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${lateCount}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; background: #f8fafc; font-weight: bold;">Leave Count</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">${leaveCount}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #e2e8f0; background: #eef2ff; font-weight: bold; color: #4f46e5;">Attendance Percentage</td>
            <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; background: #eef2ff; font-weight: bold; color: #4f46e5;">${attendancePercentage.toFixed(2)}%</td>
          </tr>
        </table>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">This is an automated message from Anraone Attendance System.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Monthly summary sent to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send monthly summary to ${toEmail}:`, error.message);
    return false;
  }
};

module.exports = {
  sendNotificationEmail,
  sendMonthlySummaryEmail,
};
