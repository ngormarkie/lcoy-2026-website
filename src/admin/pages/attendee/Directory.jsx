import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';

// Deliberately shows only name/photo/category/organisation/region — never
// phone, email, DOB or the disability/dietary fields, even though the
// current `users` read rule (needed for badge-code lookup at check-in)
// technically already lets any signed-in person read those on every
// account. This UI doesn't add that exposure, just chooses not to surface
// it; genuinely restricting it per-field would need a separate public-safe
// collection or a backend proxy, which is a larger change than "build the
// directory."
export default function Directory() {
  const { profile } = useAuth();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list = [];
        snap.forEach(d => { const u = d.data(); if (u.role === 'attendee') list.push({ id: d.id, name: u.name, category: u.category, org: u.org, region: u.region, photoURL: u.photoURL }); });
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        if (!cancelled) setPeople(list);
      } catch (e) { console.error(e); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => { const s = new Set(); people.forEach(p => p.category && s.add(p.category)); return Array.from(s).sort(); }, [people]);
  const regions = useMemo(() => { const s = new Set(); people.forEach(p => p.region && s.add(p.region)); return Array.from(s).sort(); }, [people]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return people.filter(p => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (regionFilter !== 'all' && p.region !== regionFilter) return false;
      if (!q) return true;
      return (p.name || '').toLowerCase().includes(q) || (p.org || '').toLowerCase().includes(q);
    });
  }, [people, search, categoryFilter, regionFilter]);

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}><div className="loader" /></div>;

  return (
    <div>
      <header className="page-header">
        <div>
          <span className="dashboard-eyebrow">Delegates</span>
          <h1>Attendee Directory</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>{people.length} attendees. Showing name, organisation and region only — ask an organiser if you need to reach someone directly.</p>
        </div>
      </header>

      <div className="users-controls" style={{ marginBottom: '1.25rem' }}>
        <input type="search" className="input" placeholder="Search name or organisation…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: '2 1 200px' }} />
        <select className="select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ flex: '1 1 150px' }}>
          <option value="all">All categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="select" value={regionFilter} onChange={e => setRegionFilter(e.target.value)} style={{ flex: '1 1 150px' }}>
          <option value="all">All regions</option>{regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="users-summary" style={{ marginBottom: '0.75rem' }}>Showing <strong>{filtered.length}</strong> of <strong>{people.length}</strong></div>

      {filtered.length === 0 ? (
        <div className="card-elevated" style={{ textAlign: 'center', padding: '3rem' }}><p className="text-muted">No matches.</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {filtered.map(p => (
            <div key={p.id} className="card-elevated" style={{ padding: '1rem', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 0.6rem', overflow: 'hidden', background: 'var(--paper-dark)', display: 'grid', placeItems: 'center' }}>
                {p.photoURL ? <img src={p.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.3rem' }}>{(p.name || '?').slice(0, 1).toUpperCase()}</span>}
              </div>
              <div style={{ fontWeight: 700 }}>{p.name}{p.id === profile?.id ? ' (You)' : ''}</div>
              {p.category && <span className={`pill cat-${p.category}`} style={{ fontSize: '0.65rem', marginTop: '0.3rem', display: 'inline-block' }}>{p.category}</span>}
              {p.org && <div style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', marginTop: '0.4rem' }}>{p.org}</div>}
              {p.region && <div style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', marginTop: '0.15rem' }}>{p.region}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
