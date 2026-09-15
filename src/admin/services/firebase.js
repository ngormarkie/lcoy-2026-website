import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

// Firebase Web config. These are non-secret public client identifiers
// (safe to expose), but we read them from env vars so they are not committed.
// Set VITE_FIREBASE_* in .env.local for dev and in Cloudflare for production.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig, 'lcoy-admin');
export const auth = getAuth(app);
export const functions = getFunctions(app, 'us-central1');

// Offline-capable store for the signed-in portal — check-in and meal scanning
// need to survive a patchy hall connection, so this one is backed by IndexedDB.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// The public site reads through a separate instance with the default in-memory
// cache. Opening IndexedDB on a phone's very first page load can stall (and is
// blocked outright in private browsing), which left a visitor looking at a page
// with no agenda on it until they reloaded. A public visitor gains nothing from
// persistence, so this side simply doesn't touch it.
export const publicApp = initializeApp(firebaseConfig, 'lcoy-public');
export const publicDb = getFirestore(publicApp);

export { firebaseConfig };
