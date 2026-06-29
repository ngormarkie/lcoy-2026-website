import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './AppShell.css';

export default function AppShell({ navItems = [], children }) {
  const { profile, signOut, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const roleLabel =
    role === 'superadmin' ? 'Super-admin' :
    role === 'organiser' ? 'Organiser' :
    role === 'checkin' ? 'Check-in Staff' :
    'User';

  return (
    <div className="shell">
      <header className="shell-header">
        <div className="shell-header-inner">
          <button className="shell-menu-btn" onClick={() => setMenuOpen((s) => !s)} aria-label="Toggle menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              {menuOpen ? (
                <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
              ) : (
                <><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>
              )}
            </svg>
          </button>
          <Link to="/admin" className="shell-logo"><img src="/photos/LCOY-2026-Logo.png" alt="LCOY" className="shell-logo-img" /></Link>
          <div className="shell-header-right">
            {!online && <span className="pill pill-warning shell-offline">Offline</span>}
            <span className="pill shell-role-pill">{roleLabel}</span>
          </div>
        </div>
        <div className="shell-brand-bar"><span>LCOY Sierra Leone 2026</span></div>
      </header>
      <div className="shell-body">
        <nav className={`shell-nav ${menuOpen ? 'open' : ''}`}>
          <div className="shell-nav-user">
            <div className="shell-nav-user-name">{profile?.name || 'User'}</div>
            <div className="shell-nav-user-email">{profile?.email}</div>
            {profile?.code && (
              <div className="shell-nav-code">
                <span className="text-xs text-muted">Badge code</span>
                <span className="font-mono weight-bold">{profile.code}</span>
              </div>
            )}
          </div>
          <ul className="shell-nav-list">
            {navItems.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className={`shell-nav-link ${location.pathname === item.to || (item.to !== '/admin' && location.pathname.startsWith(item.to)) ? 'active' : ''}`}>
                  <span className="shell-nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="shell-nav-footer">
            <Link to="/admin/change-password" className="shell-nav-link">
              <span className="shell-nav-icon">🔒</span>
              <span>Change password</span>
            </Link>
            <button onClick={handleSignOut} className="shell-nav-link shell-signout">
              <span className="shell-nav-icon">↪</span>
              <span>Sign out</span>
            </button>
          </div>
        </nav>
        {menuOpen && <div className="shell-overlay" onClick={() => setMenuOpen(false)} />}
        <main className="shell-main">{children}</main>
      </div>
    </div>
  );
}
