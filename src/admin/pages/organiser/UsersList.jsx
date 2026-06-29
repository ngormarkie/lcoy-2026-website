import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { downloadBadgesBatch } from '../../utils/badge';
import './UsersList.css';

const ROLE_LABELS = { superadmin: 'Super-admin', organiser: 'Organiser', attendee: 'Attendee' };

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [batchBusy, setBatchBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        if (!cancelled) { setUsers(list); setLoading(false); }
      } catch (e) { console.error(e); if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => { const set = new Set(); users.forEach((u) => u.category && set.add(u.category)); return Array.from(set).sort(); }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (categoryFilter !== 'all' && u.category !== categoryFilter) return false;
      if (!q) return true;
      return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.org || '').toLowerCase().includes(q) || (u.code || '').toLowerCase().includes(q);
    });
  }, [users, search, roleFilter, categoryFilter]);

  return (
    <div className="users-page">
      <header className="page-header">
        <div>
          <span className="dashboard-eyebrow">People</span>
          <h1>Registered persons</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>All organisers, attendees, and special guests on file.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative' }}>
            <select className="select" style={{ minWidth: 150 }} disabled={batchBusy} onChange={async (e) => {
              const val = e.target.value;
              e.target.value = '';
              if (!val) return;
              setBatchBusy(true);
              let batch = [];
              if (val === 'all') batch = users.filter(u => u.code);
              else if (val === 'attendees') batch = users.filter(u => u.role === 'attendee' && u.code);
              else if (val === 'organisers') batch = users.filter(u => (u.role === 'organiser' || u.role === 'superadmin') && u.code);
              else batch = users.filter(u => u.category === val && u.code);
              if (batch.length === 0) { alert('No badges to download for this filter.'); setBatchBusy(false); return; }
              await downloadBadgesBatch(batch);
              setBatchBusy(false);
            }}>
              <option value="">{batchBusy ? 'Downloading…' : 'Download badges…'}</option>
              <option value="all">All badges</option>
              <option value="attendees">All attendees</option>
              <option value="organisers">All organisers</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Link to="/admin/users/new" className="btn btn-primary">＋ Add person</Link>
        </div>
      </header>
      <div className="users-controls">
        <input type="search" className="input" placeholder="Search name, email, organisation, code…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: '2 1 200px' }} />
        <select className="select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ flex: '1 1 130px' }}>
          <option value="all">All roles</option><option value="superadmin">Super-admin</option><option value="organiser">Organiser</option><option value="attendee">Attendee</option>
        </select>
        <select className="select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ flex: '1 1 150px' }}>
          <option value="all">All categories</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="users-summary">Showing <strong>{filtered.length}</strong> of <strong>{users.length}</strong></div>
      {loading ? <div style={{ padding: '4rem', textAlign: 'center' }}><div className="loader" /></div> : filtered.length === 0 ? (
        <div className="card-elevated" style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="text-muted">{users.length === 0 ? 'No one has been registered yet. Tap "Add person" to begin.' : 'No matches. Try adjusting your filters.'}</p>
        </div>
      ) : (
        <div className="users-list">
          {filtered.map((u) => (
            <Link key={u.id} to={`/admin/users/${u.id}`} className="user-row">
              <div className="user-row-photo">{u.photoURL ? <img src={u.photoURL} alt="" /> : <div className="user-row-photo-fallback">{(u.name || '?').slice(0, 1).toUpperCase()}</div>}</div>
              <div className="user-row-main">
                <div className="user-row-name">{u.name || '(no name)'}</div>
                <div className="user-row-meta">{u.org || <span className="text-muted">—</span>}{u.email && <span className="user-row-dot">·</span>}{u.email && <span className="text-muted">{u.email}</span>}</div>
              </div>
              <div className="user-row-tags">
                {u.code && <span className="user-row-code font-mono">{u.code}</span>}
                {u.category && <span className={`pill cat-${u.category}`}>{u.category}</span>}
                <span className="pill" style={{ background: u.role === 'superadmin' || u.role === 'organiser' ? 'var(--green-deep)' : 'var(--paper-dark)', color: u.role === 'superadmin' || u.role === 'organiser' ? 'var(--paper)' : 'var(--ink-soft)' }}>{ROLE_LABELS[u.role] || 'No role'}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
