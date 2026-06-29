import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
  updatePassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext(null);

export const ATTENDEE_PWD_PREFIX = 'lcoy-2026-';
export const deriveAttendeePassword = (code) => ATTENDEE_PWD_PREFIX + (code || '').toUpperCase();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        try {
          const snap = await getDoc(doc(db, 'users', fbUser.uid));
          if (snap.exists()) {
            setProfile({ id: snap.id, ...snap.data() });
          } else {
            await fbSignOut(auth);
            setProfile(null);
          }
        } catch (e) {
          console.error('Profile fetch error:', e);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn = async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPwd = password.trim();
    let cred;
    try {
      cred = await signInWithEmailAndPassword(auth, normalizedEmail, trimmedPwd);
    } catch (err) {
      const looksLikeCode = /^[0-9A-Z]{2}$/.test(trimmedPwd.toUpperCase());
      if (looksLikeCode && (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password')) {
        const derived = ATTENDEE_PWD_PREFIX + trimmedPwd.toUpperCase();
        cred = await signInWithEmailAndPassword(auth, normalizedEmail, derived);
      } else {
        throw err;
      }
    }
    try {
      await updateDoc(doc(db, 'users', cred.user.uid), { lastLoginAt: serverTimestamp() });
    } catch (e) { /* non-critical */ }
    return cred;
  };

  const signOut = () => fbSignOut(auth);

  const changePassword = async (newPassword) => {
    if (!auth.currentUser) throw new Error('Not signed in');
    await updatePassword(auth.currentUser, newPassword);
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      passwordChangedAt: serverTimestamp(),
    });
  };

  const createAccount = async ({ email, password, profileData }) => {
    const cred = await createUserWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password
    );
    await setDoc(doc(db, 'users', cred.user.uid), {
      email: email.trim().toLowerCase(),
      ...profileData,
      registeredAt: serverTimestamp(),
    });
    return cred.user.uid;
  };

  const value = {
    user,
    profile,
    loading,
    role: profile?.role || null,
    isSuperAdmin: profile?.role === 'superadmin',
    isOrganiser: profile?.role === 'organiser' || profile?.role === 'superadmin',
    isCheckin: profile?.role === 'checkin',
    isStaff: profile?.role === 'organiser' || profile?.role === 'superadmin' || profile?.role === 'checkin',
    isAttendee: profile?.role === 'attendee',
    signIn,
    signOut,
    changePassword,
    createAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
