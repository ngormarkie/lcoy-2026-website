import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Shown instead of SetPasswordPage when a one-time acceptance link is more
// than 10 days old (see AdminApp's isLinkExpired check). Signs out only when
// the person clicks through, so they actually get to read the message first
// rather than being bounced straight to the login screen.
export default function ExpiredLinkPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const goToLogin = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="login-page">
      <main className="login-form-area" style={{ width: '100%' }}>
        <div className="login-form-card">
          <h2 className="login-form-title">This link has expired</h2>
          <p className="login-form-sub">Your one-time sign-in link is more than 10 days old. Go to the sign-in page and choose "Forgot password" to get a new one.</p>
          <button className="btn btn-primary btn-block btn-lg" onClick={goToLogin}>Go to sign in</button>
        </div>
      </main>
    </div>
  );
}
