import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app, firebaseConfig.storageBucket);
export { firebaseConfig };

// Automatically ensure client is authenticated in the background if no user is signed in
try {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      signInAnonymously(auth).catch(() => {
        // Anonymous auth fallback
      });
    }
  });
} catch {
  // Ignore auth setup errors
}
