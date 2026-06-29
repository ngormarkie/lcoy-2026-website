import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyB-rnlT7MEFnM2EsYEpOFZW_b5oi04zENg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'lcoy-app.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'lcoy-app',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'lcoy-app.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '398150413873',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:398150413873:web:27fa6de8964cd193752f10',
};

export const app = initializeApp(firebaseConfig, 'lcoy-admin');
export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export { firebaseConfig };
