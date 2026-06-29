import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { changePassword, profile, isAttendee } = useAuth();
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (pwd.length < 8) return setError('New password must be at least 8 characters.');
    if (pwd !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    try {
      await changePassword(pwd);
      setSuccess(true);
      setPwd(''); setConfirm('');
    } catch (err) {
      const msg = err.code === 'auth/requires-recent-login'
        ? 'For security, please sign out and sign back in, then try again.'
        : 'Could not change password. Please try again.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '2rem', maxWidth: 520 }}>
      <button className="btn btn-ghost btn-sm mb-4" onClick={() => navigate(-1)}>← Back</button>
      <div className="card-elevated">
        <span className="dashboard-eyebrow">Account security</span>
        <h2 style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>Change password</h2>
        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Signed in as <strong>{profile?.email}</strong>.</p>
        {isAttendee && <div className="alert alert-info">Note: changing your password means you can no longer sign in with your 2-character badge code.</div>}
        {success && <div className="alert alert-success">Password updated successfully.</div>}
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="field"><label className="field-label" htmlFor="newpwd">New password</label><input id="newpwd" type="password" className="input" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" required /></div>
          <div className="field"><label className="field-label" htmlFor="confirm">Confirm new password</label><input id="confirm" type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required /></div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
        </form>
      </div>
    </div>
  );
}
