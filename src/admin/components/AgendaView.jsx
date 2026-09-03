import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

const DAY_ORDER = ['Day 1 — 7 October', 'Day 2 — 8 October', 'Day 3 — 9 October'];

// Same `sessions` collection, sort order and day grouping as the public
// /live board's Agenda tab, rendered with the admin portal's own design
// system instead of LiveBoard's — this is only ever mounted inside an
// AppShell page.
export default function AgendaView() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'sessions'));
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.day || '').localeCompare(b.day || '') || (a.time || '').localeCompare(b.time || ''));
        if (!cancelled) setSessions(list);
      } catch (e) { console.error(e); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}><div className="loader" /></div>;

  const grouped = DAY_ORDER.map(day => ({ day, items: sessions.filter(s => s.day === day) })).filter(g => g.items.length > 0);

  return (
    <div>
      <header className="page-header"><div><span className="dashboard-eyebrow">Programme</span><h1>Agenda</h1></div></header>
      {grouped.length === 0 ? (
        <div className="card-elevated" style={{ textAlign: 'center', padding: '3rem' }}><p className="text-muted">The agenda will appear here once it's published.</p></div>
      ) : grouped.map(g => (
        <div key={g.day} style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.75rem', color: 'var(--blue, var(--green-deep))' }}>{g.day}</h3>
          {g.items.map(s => (
            <div key={s.id} className="card-elevated" style={{ padding: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {s.type && <span className="pill" style={{ background: 'var(--blue, var(--green-deep))', color: '#fff', fontSize: '0.7rem' }}>{s.type}</span>}
                {s.time && <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>{s.time}</span>}
                {s.room && <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>· {s.room}</span>}
              </div>
              <div style={{ fontWeight: 700, marginTop: '0.25rem' }}>{s.title}</div>
              {s.speakers && <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: '0.15rem' }}>{s.speakers}</div>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
