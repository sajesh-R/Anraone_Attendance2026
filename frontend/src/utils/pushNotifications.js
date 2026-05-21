import axios from 'axios';

/**
 * Converts the base64 URL-safe string to a Uint8Array
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Requests permission and subscribes the user to push notifications
 */
export const subscribeToPushNotifications = async (token) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications are not supported by the browser.');
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied.');
      return;
    }

    // Register Service Worker
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    console.log('Service Worker registered successfully.');

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // Unsubscribe the old subscription to prevent stale VAPID key mismatches
      await subscription.unsubscribe();
    }

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      console.error('VITE_VAPID_PUBLIC_KEY is not set in environment variables.');
      return;
    }

    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });
    console.log('Push subscription newly created with current VAPID key.');

    // Send subscription to backend (Always do this so the DB stays synced with the browser)
    await axios.post('/api/push/subscribe', { subscription }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Subscription sent to backend successfully.');

  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
  }
};

/**
 * Unsubscribes from push notifications
 */
export const unsubscribeFromPushNotifications = async (token) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      // Inform backend
      await axios.post('/api/push/unsubscribe', { endpoint: subscription.endpoint }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Unsubscribed from push notifications.');
    }
  } catch (error) {
    console.error('Error unsubscribing:', error);
  }
};
