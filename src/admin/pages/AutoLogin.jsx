import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Reached via the acceptance email's "Log in & upload your photo" link,
// which carries the delegate's email and one-time badge code so they land
// signed in without typing anything. AdminApp then forces a "set your own
// password" step before they can go anywhere else.
export default function AutoLogin() {
  const { signIn } = useAuth();
  const [params] = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const email = params.get('email');
    const code = params.get('code');
    if (!email || !code) {
      setError('This link is missing information.');
      return;
    }
    signIn(email, code).catch((err) => {
      console.error('Auto-login error:', err.code, err.message);
      if (!cancelled) setError('This link has expired or already been used.');
    });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="login-page">
        <main className="login-form-area" style={{ width: '100%' }}>
          <div className="login-form-card">
            <h2 className="login-form-title">Could not sign you in automatically</h2>
            <p className="login-form-sub">{error} Please sign in with your email address and badge code instead.</p>
            <Link to="/admin/login" className="btn btn-primary btn-block btn-lg">Go to sign in</Link>
          </div>
        </main>
      </div>
    );
  }

  return <div className="full-loader"><div className="loader" /></div>;
}
