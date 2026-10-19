import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initGlobalScrollLockObserver } from './lib/scrollLock';

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

