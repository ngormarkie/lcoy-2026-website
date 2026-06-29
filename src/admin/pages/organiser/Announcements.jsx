import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, doc, deleteDoc, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function Announcements() {
  const { profile } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const fetch = async () => {
    try {
      const snap = await getDocs(collection(db, 'announcements'));
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setItems(list);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (!title.trim()) return setError('Title is required.');
    setBusy(true);
    try {
      await addDoc(collection(db, 'announcements'), { title: title.trim(), body: body.trim(), author: profile?.name || 'Organiser', createdAt: serverTimestamp() });
      setTitle(''); setBody('');
      await fetch();
    } catch (err) { setError('Could not post announcement.'); }
    finally { setBusy(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try { await deleteDoc(doc(db, 'announcements', id)); await fetch(); } catch (e) { console.error(e); }
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <header className="page-header"><div><span className="dashboard-eyebrow">Communications</span><h1>Announcements</h1></div></header>
      <div className="card-elevated" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3>Post announcement</h3>
        {error && <div className="alert alert-error" style={{ marginTop: '0.5rem' }}>{error}</div>}
        <form onSubmit={submit} style={{ marginTop: '0.75rem', display: 'grid', gap: '0.75rem' }}>
          <div className="field"><label className="field-label">Title</label><input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Schedule change for Day 2" required /></div>
          <div className="field"><label className="field-label">Message</label><textarea className="textarea" value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Write your announcement…" /></div>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Posting…' : 'Post'}</button>
        </form>
      </div>
      {loading ? <div style={{ textAlign: 'center', padding: '2rem' }}><div className="loader" /></div> : items.length === 0 ? (
        <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>No announcements yet.</p>
      ) : items.map(a => (
        <div key={a.id} className="card-elevated" style={{ padding: '1.25rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{a.title}</div>
              {a.body && <p style={{ color: 'var(--ink-soft)', marginTop: '0.35rem', whiteSpace: 'pre-wrap' }}>{a.body}</p>}
              <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: '0.5rem' }}>{a.author} · {formatDate(a.createdAt)}</div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--crimson)', flexShrink: 0 }} onClick={() => handleDelete(a.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
