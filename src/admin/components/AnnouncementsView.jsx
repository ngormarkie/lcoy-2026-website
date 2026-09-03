import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

function fmtDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Same `announcements` collection and sort order as the public /live board's
// Announcements tab, rendered with the admin portal's own design system
// instead of LiveBoard's — this is only ever mounted inside an AppShell page.
export default function AnnouncementsView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'announcements'));
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        if (!cancelled) setItems(list);
      } catch (e) { console.error(e); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}><div className="loader" /></div>;

  return (
    <div>
      <header className="page-header"><div><span className="dashboard-eyebrow">Updates</span><h1>Announcements</h1></div></header>
      {items.length === 0 ? (
        <div className="card-elevated" style={{ textAlign: 'center', padding: '3rem' }}><p className="text-muted">No announcements yet. Check back soon.</p></div>
      ) : items.map((a, i) => (
        <div key={a.id} className="card-elevated" style={{ padding: '1.25rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {i === 0 && <span className="pill" style={{ background: 'var(--orange)', color: '#fff', fontSize: '0.65rem' }}>Latest</span>}
            <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>{a.title}</span>
          </div>
          {a.body && <p style={{ color: 'var(--ink-soft)', marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>{a.body}</p>}
          <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: '0.5rem' }}>{a.author || 'Organisers'} · {fmtDate(a.createdAt)}</div>
        </div>
      ))}
    </div>
  );
}
