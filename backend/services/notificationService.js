const Notification = require('../models/Notification');
const User = require('../models/User');
const PushSubscription = require('../models/PushSubscription');
const { sendNotificationEmail } = require('./emailService');
const webpush = require('web-push');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@anraone.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Core engine for processing and saving notifications
 */
const sendNotification = async ({
  recipientId,
  senderId = null,
  type,
  title,
  message,
  deliveryChannel = ['In-App'],
  relatedId = null,
}) => {
  try {
    // 1. Validate recipient exists and is active
    const recipient = await User.findById(recipientId);
    if (!recipient || !recipient.isActive) {
      console.log(`Notification skipped: User ${recipientId} is not active or does not exist.`);
      return false;
    }

    // 2. Save Notification to Database
    const notification = await Notification.create({
      recipientId,
      senderId,
      type,
      title,
      message,
      relatedId,
      deliveryChannel,
      notificationStatus: 'Pending',
    });

    let isSuccess = true;

    // 3. Process Channels
    try {
      if (deliveryChannel.includes('Email') && recipient.email) {
        // We only pass title and message for generic email notifications
        // For specialized emails (like Monthly Summary), we use the specific function in emailService directly
        if (type !== 'MonthlySummary') {
          const emailSent = await sendNotificationEmail(recipient.email, title, message);
          if (!emailSent) isSuccess = false;
        }
      }

      // If 'Push' was requested, send Web Push Notifications
      if (deliveryChannel.includes('Push') && process.env.VAPID_PUBLIC_KEY) {
        const subscriptions = await PushSubscription.find({ userId: recipientId });
        
        if (subscriptions.length > 0) {
          const payload = JSON.stringify({
            title,
            body: message,
            icon: '/vite.svg', // Default icon
          });

          for (const sub of subscriptions) {
            try {
              await webpush.sendNotification({
                endpoint: sub.endpoint,
                keys: sub.keys
              }, payload);
            } catch (pushErr) {
              if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
                // Subscription is invalid or expired
                await PushSubscription.deleteOne({ _id: sub._id });
              } else {
                console.error('Web Push Error:', pushErr);
              }
            }
          }
        }
      }

      // Update status
      notification.notificationStatus = isSuccess ? 'Sent' : 'Failed';
      notification.sentTimestamp = new Date();
      await notification.save();

      return isSuccess;
    } catch (channelError) {
      console.error(`Error delivering notification via channels: ${channelError.message}`);
      notification.notificationStatus = 'Failed';
      await notification.save();
      return false;
    }
  } catch (error) {
    console.error(`Error in sendNotification service: ${error.message}`);
    return false;
  }
};

module.exports = {
  sendNotification,
};
