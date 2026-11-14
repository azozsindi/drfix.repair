import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentSingleTabManager } from 'firebase/firestore';
import { getAuth, signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager({ forceOwnership: true })
  }),
  experimentalAutoDetectLongPolling: true
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app, firebaseConfig.storageBucket);
export { firebaseConfig };

export const STAFF_PORTAL_EMAIL = 'staff-portal@drfix.repair';
export const STAFF_PORTAL_PASS = 'DRFixStaffPortalSecure2026!#';

export async function ensureStaffPortalAuth(): Promise<boolean> {
  try {
    if (auth.currentUser && auth.currentUser.email === STAFF_PORTAL_EMAIL) {
      return true;
    }
    await signInWithEmailAndPassword(auth, STAFF_PORTAL_EMAIL, STAFF_PORTAL_PASS);
    return true;
  } catch (err) {
    console.warn('[Staff Portal Auto-Auth Notice]:', err);
    return false;
  }
}

// Automatically ensure client is authenticated appropriately in the background
try {
  auth.onAuthStateChanged((user) => {
    const isAdmin = typeof localStorage !== 'undefined' && (
      localStorage.getItem('drfix_admin_logged_in') === 'true' ||
      sessionStorage.getItem('drfix_admin_logged_in') === 'true'
    );

    if (isAdmin) {
      if (!user || user.email !== STAFF_PORTAL_EMAIL) {
        signInWithEmailAndPassword(auth, STAFF_PORTAL_EMAIL, STAFF_PORTAL_PASS).catch(() => {
          if (!user) signInAnonymously(auth).catch(() => {});
        });
      }
    } else if (!user) {
      signInAnonymously(auth).catch(() => {
        // Anonymous auth fallback
      });
    }
  });
} catch {
  // Ignore auth setup errors
}
