import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Mandatory first-login gate for anyone whose account was created with a
// throwaway password (badge code) — blocks the rest of the platform until
// they've chosen their own password. AuthContext.changePassword clears the
// mustSetPassword flag on success, which is what lets AdminApp move on.
export default function SetPasswordPage() {
  const { changePassword, profile } = useAuth();
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (pwd.length < 8) return setError('Your new password must be at least 8 characters.');
    if (pwd !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      await changePassword(pwd);
    } catch (err) {
      const msg = err.code === 'auth/requires-recent-login'
        ? 'For security, please sign in again using your badge code, then try this once more.'
        : 'Could not set your password. Please try again.';
      setError(msg);
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '3rem', maxWidth: 520 }}>
      <div className="card-elevated">
        <span className="dashboard-eyebrow">Welcome, {(profile?.name || '').split(' ')[0] || 'there'}</span>
        <h2 style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>Create your password</h2>
        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>
          You signed in with the one-time badge code from your email. Choose a password of your own to finish setting up your account.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="field"><label className="field-label" htmlFor="newpwd">New password</label><input id="newpwd" type="password" className="input" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" autoFocus required /></div>
          <div className="field"><label className="field-label" htmlFor="confirm">Confirm password</label><input id="confirm" type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required /></div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Saving…' : 'Continue'}</button>
        </form>
      </div>
    </div>
  );
}
