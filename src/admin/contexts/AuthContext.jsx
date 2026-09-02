import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
  updatePassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext(null);

export const ATTENDEE_PWD_PREFIX = 'lcoy-2026-';
export const deriveAttendeePassword = (code) => ATTENDEE_PWD_PREFIX + (code || '').toUpperCase();

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        // Right after a fresh sign-in, Firestore's rules engine can briefly
        // lag behind the new auth token, so a read of your own profile can
        // fail once with permission-denied even though it's allowed. Retry
        // a couple of times before giving up, instead of silently bouncing
        // the user back to the login screen with no explanation.
        let snap = null, lastErr = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            snap = await getDoc(doc(db, 'users', fbUser.uid));
            lastErr = null;
            break;
          } catch (e) {
            lastErr = e;
            if (attempt < 2) await wait(400 * (attempt + 1));
          }
        }
        if (lastErr) {
          console.error('Profile fetch error:', lastErr);
          setAuthError('You signed in, but your profile could not be loaded. Please try again in a moment — if this keeps happening, contact the head organiser.');
          setProfile(null);
          try { await fbSignOut(auth); } catch {}
        } else if (snap && snap.exists()) {
          setProfile({ id: snap.id, ...snap.data() });
        } else {
          setAuthError('No profile was found for this account. Please contact the head organiser.');
          setProfile(null);
          try { await fbSignOut(auth); } catch {}
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
    setAuthError('');
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

  const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim().toLowerCase());

  const changePassword = async (newPassword) => {
    if (!auth.currentUser) throw new Error('Not signed in');
    await updatePassword(auth.currentUser, newPassword);
    const updates = { passwordChangedAt: serverTimestamp(), mustSetPassword: false };
    await updateDoc(doc(db, 'users', auth.currentUser.uid), updates);
    setProfile((p) => (p ? { ...p, mustSetPassword: false } : p));
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
    authError,
    role: profile?.role || null,
    isSuperAdmin: profile?.role === 'superadmin',
    isAdmin: profile?.role === 'admin',
    isOrganiser: profile?.role === 'organiser' || profile?.role === 'admin' || profile?.role === 'superadmin',
    isCheckin: profile?.role === 'checkin',
    isStaff: profile?.role === 'organiser' || profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'checkin',
    isAttendee: profile?.role === 'attendee',
    signIn,
    signOut,
    resetPassword,
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
