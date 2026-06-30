import { useEffect, useState } from 'react';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function Feedback() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const snap = await getDocs(collection(db, 'feedback'));
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setItems(list);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this feedback?')) return;
    try { await deleteDoc(doc(db, 'feedback', id)); await fetchAll(); } catch (e) { console.error(e); }
  };

  const fmt = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <header className="page-header">
        <div>
          <span className="dashboard-eyebrow">Communications</span>
          <h1>Feedback</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>Submissions from the public live board.</p>
        </div>
      </header>

      {loading ? <div style={{ textAlign: 'center', padding: '2rem' }}><div className="loader" /></div> : items.length === 0 ? (
        <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>No feedback yet.</p>
      ) : (
        <>
          <div className="users-summary" style={{ marginBottom: '0.75rem' }}><strong>{items.length}</strong> submission{items.length === 1 ? '' : 's'}</div>
          {items.map(f => (
            <div key={f.id} className="card-elevated" style={{ padding: '1.1rem 1.25rem', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{f.message}</p>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: '0.5rem' }}>
                    {f.name || 'Anonymous'} · {fmt(f.createdAt)}
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--crimson)', flexShrink: 0 }} onClick={() => handleDelete(f.id)}>Delete</button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
