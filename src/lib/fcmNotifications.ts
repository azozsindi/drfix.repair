import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported as isMessagingSupported } from 'firebase/messaging';
import { collection, doc, setDoc, deleteDoc, getDocs, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, firebaseConfig } from '../firebase';
import { FcmDeviceToken } from '../types';
import { playNotificationSound, playNewBookingSound } from './audioAlerts';

// Public default VAPID Web Push Key placeholder (user can also provide custom VAPID key in admin settings)
export const DEFAULT_FCM_VAPID_KEY = 'BFqQGcxVd6sQ1GzVz6p7D0B2S1T3M4K5L6N7P8Q9R0S1T2U3V4W5X6Y7Z8A9B0C1D2E3F4G5H6I7J8K9L0M1N2';

export interface DeviceInfo {
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  isIos: boolean;
  isStandalonePwa: boolean;
  userAgent: string;
}

export function detectCurrentDevice(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      deviceType: 'desktop',
      browser: 'unknown',
      os: 'unknown',
      isIos: false,
      isStandalonePwa: false,
      userAgent: ''
    };
  }

  const ua = navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);
  const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/i.test(ua);
  const isMobile = !isTablet && (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua));

  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (isTablet) deviceType = 'tablet';
  else if (isMobile) deviceType = 'mobile';

  // Browser detection
  let browser = 'Unknown';
  if (/CriOS|Chrome/.test(ua) && !/Edge|Edg|OPR|Opera/.test(ua)) browser = 'Chrome';
  else if (/Safari/.test(ua) && !/Chrome|CriOS/.test(ua)) browser = 'Safari';
  else if (/Firefox|FxiOS/.test(ua)) browser = 'Firefox';
  else if (/Edg/.test(ua)) browser = 'Edge';
  else if (/OPR|Opera/.test(ua)) browser = 'Opera';

  // OS detection
  let os = 'Unknown';
  if (isIos) os = 'iOS';
  else if (isAndroid) os = 'Android';
  else if (/Macintosh|Mac OS X/.test(ua)) os = 'macOS';
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Linux/.test(ua)) os = 'Linux';

  // Standalone PWA detection (Crucial for iOS 16.4+ Web Push)
  const isStandalonePwa = 
    window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');

  return {
    deviceType,
    browser,
    os,
    isIos,
    isStandalonePwa,
    userAgent: ua
  };
}

export async function isFcmEnvironmentSupported(): Promise<{
  supported: boolean;
  reason?: string;
  isIosSafariNonPwa?: boolean;
}> {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'بيئة غير صالحة (سيرفر)' };
  }

  if (!('serviceWorker' in navigator)) {
    return { supported: false, reason: 'المتصفح الحالي لا يدعم تقنية Service Worker' };
  }

  if (!('Notification' in window)) {
    return { supported: false, reason: 'المتصفح الحالي لا يدعم إشعارات النظام Notification API' };
  }

  const device = detectCurrentDevice();
  // On iOS Safari, Web Push is only supported if added to Home Screen as PWA
  if (device.isIos && !device.isStandalonePwa) {
    return {
      supported: false,
      isIosSafariNonPwa: true,
      reason: 'على أجهزة iPhone/iPad، تتطلب إشعارات الويب تثبيت التطبيق على الشاشة الرئيسية (Add to Home Screen) أولاً على إصدار iOS 16.4 أو أحدث.'
    };
  }

  try {
    const supported = await isMessagingSupported();
    if (!supported) {
      return { supported: false, reason: 'Firebase Messaging غير مدعوم في هذا المتصفح' };
    }
  } catch (e: any) {
    return { supported: false, reason: `فشل فحص دعم الإشعارات: ${e?.message || e}` };
  }

  return { supported: true };
}

export function getNotificationPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Register Service Worker & request FCM device token
 */
export async function registerFcmDevice(
  user: { id: string; name: string; role?: string },
  customVapidKey?: string
): Promise<{
  success: boolean;
  token?: string;
  error?: string;
  permission?: NotificationPermission;
}> {
  try {
    const envCheck = await isFcmEnvironmentSupported();
    if (!envCheck.supported) {
      return {
        success: false,
        error: envCheck.reason || 'المتصفح أو الجهاز لا يدعم الإشعارات'
      };
    }

    // Step 1: Request user permission explicitly
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        permission,
        error: permission === 'denied' 
          ? 'تم رفض إذن الإشعارات من إعدادات المتصفح. يُرجى السماح بالإشعارات من قفل شريط العنوان.'
          : 'لم يتم منح الإذن بالإشعارات.'
      };
    }

    // Step 2: Register firebase-messaging-sw.js
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    await navigator.serviceWorker.ready;

    // Step 3: Get Firebase Messaging Instance
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    // Step 4: Retrieve FCM Token
    const activeVapidKey = (customVapidKey || '').trim() || undefined;
    let token: string;
    try {
      token = await getToken(messaging, {
        serviceWorkerRegistration: registration,
        ...(activeVapidKey ? { vapidKey: activeVapidKey } : {})
      });
    } catch (tokenErr: any) {
      console.warn('FCM getToken with custom vapidKey fallback:', tokenErr);
      // Fallback without vapidKey or retry
      token = await getToken(messaging, {
        serviceWorkerRegistration: registration
      });
    }

    if (!token) {
      return {
        success: false,
        error: 'لم نتمكن من استخراج رمز الجهاز (Token) من Firebase.'
      };
    }

    // Step 5: Save or update Token document in Firestore (fcm_tokens)
    const device = detectCurrentDevice();
    const tokenDocId = `token_${token.slice(0, 24).replace(/[^a-zA-Z0-9]/g, '')}`;
    
    const tokenData: FcmDeviceToken = {
      id: tokenDocId,
      token,
      userId: user.id || 'master-super-admin',
      userName: user.name || 'المدير العام',
      userRole: user.role || 'super_admin',
      platform: device.os,
      browser: device.browser,
      os: device.os,
      deviceType: device.deviceType,
      userAgent: device.userAgent,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastActiveAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'fcm_tokens', tokenDocId), tokenData, { merge: true });

    // Cache current token locally
    try {
      localStorage.setItem('drfix_current_fcm_token', token);
      localStorage.setItem('drfix_current_fcm_doc_id', tokenDocId);
    } catch {}

    return {
      success: true,
      token,
      permission
    };
  } catch (err: any) {
    console.error('FCM Registration Error:', err);
    return {
      success: false,
      error: err?.message || 'حدث خطأ غير متوقع أثناء تفعيل الإشعارات.'
    };
  }
}

/**
 * Remove/Deactivate FCM token for current device
 */
export async function unregisterFcmDevice(): Promise<boolean> {
  try {
    const docId = localStorage.getItem('drfix_current_fcm_doc_id');
    if (docId) {
      await deleteDoc(doc(db, 'fcm_tokens', docId));
    }
    localStorage.removeItem('drfix_current_fcm_token');
    localStorage.removeItem('drfix_current_fcm_doc_id');
    return true;
  } catch (e) {
    console.warn('Error unregistering FCM device token:', e);
    return false;
  }
}

/**
 * Send an immediate test notification locally on the browser to verify service worker & permissions
 */
export async function sendLocalTestNotification(title: string, body: string): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  if (Notification.permission !== 'granted') {
    const p = await Notification.requestPermission();
    if (p !== 'granted') return false;
  }

  try {
    // Prefer service worker registration notification
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js') || 
                  await navigator.serviceWorker.ready;
      if (reg && 'showNotification' in reg) {
        await (reg as any).showNotification(title, {
          body,
          icon: '/logo-custom.png',
          badge: '/favicon-96x96.png',
          dir: 'rtl',
          lang: 'ar',
          tag: 'drfix-test-alert',
          vibrate: [200, 100, 200],
          data: { url: '/admin' }
        });
        playNotificationSound();
        return true;
      }
    }

    // Direct Notification fallback
    new Notification(title, {
      body,
      icon: '/logo-custom.png',
      badge: '/favicon-96x96.png',
      dir: 'rtl',
      lang: 'ar'
    });
    playNotificationSound();
    return true;
  } catch (e) {
    console.error('Local notification error:', e);
    return false;
  }
}

/**
 * Listen for FCM messages while application is open in the foreground
 */
export function setupForegroundFcmListener(
  onMessageReceived: (payload: any) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[DR.FIX] Foreground FCM message received:', payload);
      playNewBookingSound();

      // Dispatch local toast/event for the UI
      window.dispatchEvent(new CustomEvent('drfix_fcm_foreground_message', {
        detail: payload
      }));

      onMessageReceived(payload);
    });

    return unsubscribe;
  } catch (e) {
    console.warn('Foreground FCM listener init error:', e);
    return () => {};
  }
}

/**
 * Dispatch an FCM push notification through the server proxy endpoint
 */
export async function triggerServerFcmNotification(options: {
  title: string;
  body: string;
  url?: string;
  bookingId?: string;
  eventType?: 'new_booking' | 'status_update' | 'admin_alert' | 'error_alert';
}): Promise<{ ok: boolean; count?: number; error?: string }> {
  try {
    const res = await fetch('/api/fcm-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: options.title,
        body: options.body,
        url: options.url || '/admin',
        bookingId: options.bookingId,
        eventType: options.eventType || 'admin_alert'
      })
    });
    return await res.json();
  } catch (err: any) {
    console.warn('triggerServerFcmNotification error:', err);
    return { ok: false, error: err?.message || String(err) };
  }
}

