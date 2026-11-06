import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initGlobalScrollLockObserver } from './lib/scrollLock';
import { initGtmAutoTracking } from './lib/gtm';

// Initialize Google Tag Manager (GTM) automated link click tracking
initGtmAutoTracking();

// Global resilience handlers: Prevent third-party Firestore SDK assertion crashes when quota is exhausted
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = event.error?.message || event.message || '';
    if (
      msg.includes('INTERNAL ASSERTION FAILED') ||
      msg.includes('ca9') ||
      msg.includes('b815') ||
      msg.includes('Quota limit exceeded') ||
      msg.includes('Quota exceeded')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason?.message || String(event.reason || '');
    if (
      msg.includes('INTERNAL ASSERTION FAILED') ||
      msg.includes('ca9') ||
      msg.includes('b815') ||
      msg.includes('Quota limit exceeded') ||
      msg.includes('Quota exceeded')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  });
}

// Initialize global scroll lock observer to prevent background movement when any screen/modal is open
initGlobalScrollLockObserver();

// Clean up any legacy service workers, while preserving the official FCM background service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      const scriptUrl = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL || '';
      if (scriptUrl.includes('/sw.js') && !scriptUrl.includes('firebase-messaging-sw')) {
        registration.unregister().catch(() => {});
      }
    }
  }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

