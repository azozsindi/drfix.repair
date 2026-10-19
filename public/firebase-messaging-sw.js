/**
 * DR.FIX - Official Firebase Cloud Messaging (FCM) Service Worker
 * Handles background push notifications, system alerts, and notification click navigation.
 */

// Import official Firebase v10/v11/v12 compatible scripts
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

// Initialize Firebase in Service Worker with DR.FIX project credentials
firebase.initializeApp({
  apiKey: "AIzaSyCSHgY3CAhV7ZLDZL2GkIOZhmbD2pK0J7g",
  projectId: "hr-system-2026",
  messagingSenderId: "262129832067",
  appId: "1:262129832067:web:dc1ddee9ef7ef29befcbb6"
});

const messaging = firebase.messaging();

// Handle Background Firebase Cloud Messages
messaging.onBackgroundMessage((payload) => {
  console.log('[DR.FIX FCM-SW] Received background message:', payload);
  
  if (!payload) return;

  const title = (payload.notification?.title || payload.data?.title || '').trim();
  const body = (payload.notification?.body || payload.data?.body || '').trim();

  // Strict Validation: Never display empty or ghost notifications
  if (!title && !body) {
    console.log('[DR.FIX FCM-SW] Skipped notification: title and body are empty');
    return;
  }

  const notificationTitle = title || 'DR.FIX | تنبيه صيانة 🚗';
  const notificationBody = body;
  const clickUrl = payload.data?.url || payload.data?.click_action || '/admin';
  const tag = payload.data?.tag || `drfix-fcm-${payload.data?.bookingId || Date.now()}`;

  const notificationOptions = {
    body: notificationBody,
    icon: payload.notification?.icon || '/logo-custom.png',
    badge: '/favicon-96x96.png',
    dir: 'rtl',
    lang: 'ar',
    tag: tag,
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: {
      url: clickUrl,
      bookingId: payload.data?.bookingId,
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open_dashboard',
        title: 'عرض التفاصيل'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle Notification Clicks (Focus or Open Target Page)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const rawUrl = event.notification.data?.url || '/admin';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Find open window matching the origin
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // If no window is open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
