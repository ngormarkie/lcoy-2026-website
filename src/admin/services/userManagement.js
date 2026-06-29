import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDocs, collection, query, where } from 'firebase/firestore';
import { db, firebaseConfig } from './firebase';

const SECONDARY_NAME = 'SecondaryLCOY';

function getSecondaryApp() {
  const existing = getApps().find((a) => a.name === SECONDARY_NAME);
  return existing || initializeApp(firebaseConfig, SECONDARY_NAME);
}

export async function createUserAccount({ email, password, profile }) {
  const secondaryApp = getSecondaryApp();
  const secondaryAuth = getAuth(secondaryApp);

  let uid;
  try {
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      email.trim().toLowerCase(),
      password
    );
    uid = cred.user.uid;
    await setDoc(doc(db, 'users', uid), {
      email: email.trim().toLowerCase(),
      ...profile,
      registeredAt: serverTimestamp(),
    });
    await signOut(secondaryAuth);
  } catch (err) {
    try { await signOut(secondaryAuth); } catch {}
    throw err;
  }

  return uid;
}

export async function findUserByEmail(email) {
  const q = query(
    collection(db, 'users'),
    where('email', '==', email.trim().toLowerCase())
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}
