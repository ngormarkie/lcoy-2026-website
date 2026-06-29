import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isValidEmail } from '../utils/badgeCode';
import './LoginPage.css';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) return setError('Please enter a valid email address.');
    if (!password) return setError('Please enter your password.');
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (err) {
      console.error('Login error:', err.code, err.message);
      const msg =
        err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found'
          ? 'Email or password incorrect.'
          : err.code === 'auth/too-many-requests'
          ? 'Too many failed attempts. Please wait a few minutes.'
          : err.code === 'auth/network-request-failed'
          ? 'Network error. Please check your connection.'
          : `Could not sign in: ${err.code || err.message}`;
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <aside className="login-hero">
        <div className="login-hero-inner">
          <img src="/photos/LCOY-2026-Logo.png" alt="LCOY Sierra Leone 2026" className="login-hero-logo" />
          <div className="login-hero-text">
            <h1 className="login-hero-title">Conference <em>Management</em></h1>
            <p className="login-hero-lede">The organiser portal for LCOY Sierra Leone 2026. Manage registrations, verify entry, track meals, and coordinate the conference.</p>
          </div>
          <div className="login-hero-footer">
            <span className="login-meta">Freetown · 7–9 October 2026</span>
          </div>
        </div>
      </aside>
      <main className="login-form-area">
        <div className="login-form-card">
          <div className="login-mobile-logo">
            <img src="/photos/LCOY-2026-Logo.png" alt="LCOY" />
            <h2 className="login-mobile-title">Conference <span style={{color:'#FE9A02'}}>Management</span></h2>
            <p className="login-mobile-desc">The organiser portal for LCOY Sierra Leone 2026.</p>
          </div>
          <h2 className="login-form-title">Organiser Sign In</h2>
          <p className="login-form-sub">Enter your credentials to access the conference management portal.</p>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label className="field-label" htmlFor="email">Email address</label>
              <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" autoFocus required />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="password">Password</label>
              <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" required />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
              {busy ? <span className="loader" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> : 'Sign in'}
            </button>
          </form>
          <div className="login-footer"><p className="text-sm text-muted">This portal is for organisers only. Contact the head organiser for access.</p></div>
        </div>
      </main>
    </div>
  );
}
