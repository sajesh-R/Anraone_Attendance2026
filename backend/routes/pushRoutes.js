const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const PushSubscription = require('../models/PushSubscription');

// @route   POST /api/push/subscribe
// @desc    Save a push subscription
// @access  Private
router.post('/subscribe', authMiddleware, async (req, res) => {
  const { subscription } = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ success: false, message: 'Valid subscription object required.' });
  }

  try {
    // Check if it already exists for this user
    const existing = await PushSubscription.findOne({
      userId: req.user._id,
      endpoint: subscription.endpoint,
    });

    if (existing) {
      return res.status(200).json({ success: true, message: 'Subscription already exists.' });
    }

    // Save new subscription
    await PushSubscription.create({
      userId: req.user._id,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    });

    res.status(201).json({ success: true, message: 'Subscription saved successfully.' });
  } catch (error) {
    console.error('Push Subscribe Error:', error);
    res.status(500).json({ success: false, message: 'Server error saving subscription.' });
  }
});

// @route   POST /api/push/unsubscribe
// @desc    Remove a push subscription
// @access  Private
router.post('/unsubscribe', authMiddleware, async (req, res) => {
  const { endpoint } = req.body;

  try {
    if (endpoint) {
      await PushSubscription.deleteOne({ userId: req.user._id, endpoint });
    } else {
      // If no endpoint provided, delete all subscriptions for this user (e.g. global logout)
      await PushSubscription.deleteMany({ userId: req.user._id });
    }
    
    res.status(200).json({ success: true, message: 'Unsubscribed successfully.' });
  } catch (error) {
    console.error('Push Unsubscribe Error:', error);
    res.status(500).json({ success: false, message: 'Server error unsubscribing.' });
  }
});

module.exports = router;
