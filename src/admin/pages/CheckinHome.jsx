import { Routes, Route } from 'react-router-dom';
import AppShell from '../components/AppShell';
import VerifyEntry from './organiser/VerifyEntry';
import MealCheckin from './organiser/MealCheckin';
import SupplyCheckin from './organiser/SupplyCheckin';
import Placeholder from '../components/Placeholder';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

function CheckinDashboard() {
  const { profile } = useAuth();
  const greet = () => { const h = new Date().getHours(); if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening'; };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <span className="dashboard-eyebrow">Check-in Staff</span>
        <h1 className="dashboard-title">{greet()}, {(profile?.name || '').split(' ')[0] || 'staff'}.</h1>
        <p className="dashboard-sub">Ready to verify entry and manage check-ins.</p>
      </header>
      <section className="dashboard-actions-mobile">
        <div className="card-elevated dashboard-action-card">
          <h3>Your tasks</h3>
          <p className="text-muted text-sm" style={{ marginTop: '0.25rem', marginBottom: '1.5rem' }}>Tap to begin.</p>
          <div className="action-grid">
            <Link to="/admin/verify" className="action-tile"><span className="action-tile-icon">◐</span><span className="action-tile-label">Verify entry</span></Link>
            <Link to="/admin/meals" className="action-tile"><span className="action-tile-icon">◍</span><span className="action-tile-label">Meal check-in</span></Link>
            <Link to="/admin/supplies" className="action-tile"><span className="action-tile-icon">◇</span><span className="action-tile-label">Supply check-in</span></Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function CheckinHome() {
  const navItems = [
    { to: '/admin', label: 'Dashboard', icon: '◆' },
    { to: '/admin/verify', label: 'Verify entry', icon: '◐' },
    { to: '/admin/meals', label: 'Meal check-in', icon: '◍' },
    { to: '/admin/supplies', label: 'Supply check-in', icon: '◇' },
  ];

  return (
    <AppShell navItems={navItems}>
      <Routes>
        <Route path="/" element={<CheckinDashboard />} />
        <Route path="/verify" element={<VerifyEntry />} />
        <Route path="/meals" element={<MealCheckin />} />
        <Route path="/supplies" element={<SupplyCheckin />} />
        <Route path="*" element={<CheckinDashboard />} />
      </Routes>
    </AppShell>
  );
}
