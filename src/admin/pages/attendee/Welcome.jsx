import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Welcome.css';

export default function AttendeeWelcome() {
  const { profile } = useAuth();
  if (!profile) return null;
  const greet = () => { const h = new Date().getHours(); if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening'; };

  return (
    <div className="welcome-page">
      <header className="welcome-header">
        <span className="dashboard-eyebrow">Welcome</span>
        <h1>{greet()},<br /><em>{(profile.name || '').split(' ')[0]}</em>.</h1>
        <p className="welcome-sub">You're registered for LCOY Sierra Leone 2026. Your badge appears below — bring it with you.</p>
      </header>
      <div className="badge-card">
        <div className="badge-header"><span>LCOY</span><span>Sierra Leone · 2026</span></div>
        <div className="badge-body">
          <div className="badge-photo">{profile.photoURL ? <img src={profile.photoURL} alt="" /> : <div className="badge-photo-fallback">{(profile.name || '?').slice(0, 1).toUpperCase()}</div>}</div>
          <div className="badge-info">
            <div className="badge-name">{profile.name}</div>
            {profile.org && <div className="badge-org">{profile.org}</div>}
            <div className={`pill cat-${profile.category || 'Delegate'} badge-cat`}>{profile.category || 'Delegate'}</div>
          </div>
        </div>
        <div className="badge-code-section">
          <span className="badge-code-label">Badge code</span>
          <span className="badge-code-value">{profile.code}</span>
        </div>
      </div>
      <div className="welcome-tip">
        <h3>Your code is also your password</h3>
        <p className="text-soft">When entrance staff ask, show or read out the two characters: <strong className="font-mono">{profile.code}</strong>.</p>
      </div>
      <div className="welcome-grid">
        <Link to="/admin/agenda" className="welcome-tile"><span className="welcome-tile-icon">◎</span><span className="welcome-tile-label">View agenda</span><span className="welcome-tile-sub">2-day programme</span></Link>
        <Link to="/admin/sessions" className="welcome-tile"><span className="welcome-tile-icon">◇</span><span className="welcome-tile-label">My sessions</span><span className="welcome-tile-sub">Breakouts & workshops</span></Link>
        <Link to="/admin/directory" className="welcome-tile"><span className="welcome-tile-icon">◉</span><span className="welcome-tile-label">Attendees</span><span className="welcome-tile-sub">Connect with others</span></Link>
        <Link to="/admin/announcements" className="welcome-tile"><span className="welcome-tile-icon">◐</span><span className="welcome-tile-label">Announcements</span><span className="welcome-tile-sub">Latest updates</span></Link>
      </div>
    </div>
  );
}
