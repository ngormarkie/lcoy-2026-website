import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import './Dashboard.css';

export default function OrganiserDashboard() {
  const { profile, isSuperAdmin } = useAuth();
  const access = profile?.accessLevel || 'full';
  const isFull = isSuperAdmin || access === 'full';
  const canManagePeople = isFull || access === 'attendee_mgmt';
  const canManageProgramme = isFull || access === 'programme_mgmt';
  const canManageComms = isFull || access === 'comms' || access === 'programme_mgmt';
  const [stats, setStats] = useState({ total: null, organisers: null, attendees: null, checkedIn: null, byCategory: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        let total = 0, organisers = 0, attendees = 0, checkedIn = 0;
        const byCategory = {};
        usersSnap.forEach((doc) => {
          const d = doc.data();
          total++;
          if (d.role === 'organiser' || d.role === 'superadmin') organisers++;
          if (d.role === 'attendee') attendees++;
          if (Array.isArray(d.entries) && d.entries.length > 0) checkedIn++;
          const cat = d.category || 'Other';
          byCategory[cat] = (byCategory[cat] || 0) + 1;
        });
        if (!cancelled) { setStats({ total, organisers, attendees, checkedIn, byCategory }); setLoading(false); }
      } catch (e) { console.error(e); if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const greet = () => { const h = new Date().getHours(); if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening'; };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <span className="dashboard-eyebrow">{isSuperAdmin ? 'Super-administrator' : 'Organiser'}</span>
        <h1 className="dashboard-title">{greet()}, {(profile?.name || '').split(' ')[0] || 'organiser'}.</h1>
        <p className="dashboard-sub">Here's how the conference is shaping up.</p>
      </header>
      <section className="dashboard-actions-mobile">
        <div className="card-elevated dashboard-action-card">
          <h3>Quick actions</h3>
          <p className="text-muted text-sm" style={{ marginTop: '0.25rem', marginBottom: '1.5rem' }}>Most common tasks. Tap to begin.</p>
          <div className="action-grid">
            {canManagePeople && <Link to="/admin/users/new" className="action-tile"><span className="action-tile-icon">＋</span><span className="action-tile-label">Register a person</span></Link>}
            <Link to="/admin/verify" className="action-tile"><span className="action-tile-icon">◐</span><span className="action-tile-label">Verify entry</span></Link>
            <Link to="/admin/meals" className="action-tile"><span className="action-tile-icon">◍</span><span className="action-tile-label">Meal check-in</span></Link>
            {canManageComms && <Link to="/admin/announcements" className="action-tile"><span className="action-tile-icon">◈</span><span className="action-tile-label">Post announcement</span></Link>}
            {canManageProgramme && <Link to="/admin/sessions" className="action-tile"><span className="action-tile-icon">◎</span><span className="action-tile-label">Manage sessions</span></Link>}
          </div>
        </div>
      </section>
      <section className="stat-grid">
        <StatCard label="Total registered" value={stats.total} loading={loading} accent="green" />
        <StatCard label="Attendees" value={stats.attendees} loading={loading} sub="Delegates · Speakers · VIPs" />
        <StatCard label="Organisers" value={stats.organisers} loading={loading} sub="Including super-admins" />
        <StatCard label="Checked in" value={stats.checkedIn} total={stats.total} loading={loading} accent="amber" />
      </section>
      <section className="dashboard-row">
        <div className="card-elevated dashboard-cat-card">
          <h3>By category</h3>
          <p className="text-muted text-sm" style={{ marginTop: '0.25rem', marginBottom: '1.25rem' }}>Breakdown of registered people.</p>
          {loading ? <div className="loader" /> : Object.keys(stats.byCategory).length === 0 ? (
            <p className="text-muted text-sm">No people registered yet.</p>
          ) : (
            <ul className="cat-list">
              {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, n]) => (
                <li key={cat} className="cat-list-row"><span className={`pill cat-${cat}`}>{cat}</span><span className="cat-list-count">{n}</span></li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, total, loading, accent, sub }) {
  return (
    <div className={`stat-card ${accent ? `stat-card-${accent}` : ''}`}>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">
        {loading ? <span className="loader" style={{ width: 20, height: 20 }} /> : <>{value ?? 0}{total != null && total > 0 && <span className="stat-card-total"> / {total}</span>}</>}
      </div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}
