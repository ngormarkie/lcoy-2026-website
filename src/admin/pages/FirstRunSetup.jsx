import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, getDocs, limit, query } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import Logo from '../components/Logo';
import { isValidEmail } from '../utils/badgeCode';
import './LoginPage.css';

export default function FirstRunSetup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Please enter your name.');
    if (!isValidEmail(email)) return setError('Please enter a valid email address.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      const existing = await getDocs(query(collection(db, 'users'), limit(1)));
      if (!existing.empty) {
        setError('Setup has already been completed. Please sign in.');
        setBusy(false);
        setTimeout(() => navigate('/admin/login'), 1500);
        return;
      }
      const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: 'superadmin',
        category: 'Organiser',
        registeredAt: serverTimestamp(),
      });
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'That email is already registered. Try signing in instead.'
        : 'Could not complete setup. Please try again.';
      setError(msg);
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" aria-hidden="true" />
      <aside className="login-hero">
        <div className="login-hero-inner">
          <Logo size="lg" variant="light" />
          <div className="login-hero-text">
            <h1 className="login-hero-title">Welcome,<br /><em>founder</em>.</h1>
            <p className="login-hero-lede">You're the first to set foot here. Create the master administrator account — from this account you'll invite organisers, who in turn will register attendees.</p>
          </div>
          <div className="login-hero-footer"><span className="login-meta">First-time setup · One time only</span></div>
        </div>
      </aside>
      <main className="login-form-area">
        <div className="login-form-card">
          <div className="login-mobile-logo"><Logo size="md" /></div>
          <h2 className="login-form-title">Create master account</h2>
          <p className="login-form-sub">This will be the super-administrator. Choose a strong password and store it safely.</p>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={submit}>
            <div className="field"><label className="field-label" htmlFor="name">Your name</label><input id="name" type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Bangura" required /></div>
            <div className="field"><label className="field-label" htmlFor="email">Email address</label><input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@lcoy.sl" autoComplete="email" required /></div>
            <div className="field"><label className="field-label" htmlFor="password">Password</label><input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" required /></div>
            <div className="field"><label className="field-label" htmlFor="confirm">Confirm password</label><input id="confirm" type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required /></div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
              {busy ? <span className="loader" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> : 'Create master account'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
