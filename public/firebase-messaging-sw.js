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
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'DR.FIX | إشعار جديد 🚗';
  const notificationBody = payload.notification?.body || payload.data?.body || 'وصلك تنبيه جديد من نظام DR.FIX. اضغط للمتابعة.';
  const clickUrl = payload.data?.url || payload.data?.click_action || '/admin';
  const tag = payload.data?.tag || `drfix-fcm-${Date.now()}`;

  const notificationOptions = {
    body: notificationBody,
    icon: payload.notification?.icon || '/logo-custom.png',
    badge: '/favicon-96x96.png',
    dir: 'rtl',
    lang: 'ar',
    tag: tag,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 300],
    data: {
      url: clickUrl,
      bookingId: payload.data?.bookingId,
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'open_dashboard',
        title: 'فتح اللوحة 📋'
      },
      {
        action: 'dismiss',
        title: 'إغلاق ✕'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Fallback: Standard Web Push Event (for direct server push or external triggers)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.notification?.title || data.title || 'DR.FIX | إشعار جديد 🚗';
    const body = data.notification?.body || data.body || 'وصلك إشعار فوري جديد من نظام DR.FIX';
    const clickUrl = data.data?.url || data.url || '/admin';
    const tag = data.data?.tag || data.tag || `drfix-push-${Date.now()}`;

    const options = {
      body: body,
      icon: data.notification?.icon || '/logo-custom.png',
      badge: '/favicon-96x96.png',
      dir: 'rtl',
      lang: 'ar',
      tag: tag,
      renotify: true,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 300],
      data: {
        url: clickUrl,
        timestamp: Date.now()
      },
      actions: [
        { action: 'open_dashboard', title: 'عرض التفاصيل' }
      ]
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('DR.FIX | تنبيه فوري 🚗', {
        body: text || 'وصلك إشعار من النظام',
        icon: '/logo-custom.png',
        badge: '/favicon-96x96.png',
        dir: 'rtl',
        lang: 'ar',
        data: { url: '/admin' }
      })
    );
  }
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
