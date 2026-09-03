import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

// Same `resources` collection and sort order as the public /live board's
// Resources tab, rendered with the admin portal's own design system instead
// of LiveBoard's — this is only ever mounted inside an AppShell page.
export default function ResourcesView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'resources'));
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
      <header className="page-header"><div><span className="dashboard-eyebrow">Materials</span><h1>Resources</h1></div></header>
      {items.length === 0 ? (
        <div className="card-elevated" style={{ textAlign: 'center', padding: '3rem' }}><p className="text-muted">No resources shared yet.</p></div>
      ) : items.map(r => (
        <div key={r.id} className="card-elevated" style={{ padding: '1.25rem', marginBottom: '0.75rem' }}>
          <div style={{ fontWeight: 700 }}>{r.title}</div>
          {r.description && <p style={{ color: 'var(--ink-soft)', marginTop: '0.35rem' }}>{r.description}</p>}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
            {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Open link →</a>}
            {r.fileData && <a href={r.fileData} download={r.fileName || r.title} className="btn btn-secondary btn-sm">Download{r.fileName ? ` ${r.fileName}` : ''} ↓</a>}
          </div>
        </div>
      ))}
    </div>
  );
}
