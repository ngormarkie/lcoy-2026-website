import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function Resources() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const fetch = async () => {
    try {
      const snap = await getDocs(collection(db, 'resources'));
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
      await addDoc(collection(db, 'resources'), { title: title.trim(), url: url.trim(), description: description.trim(), createdAt: serverTimestamp() });
      setTitle(''); setUrl(''); setDescription('');
      await fetch();
    } catch (err) { setError('Could not add resource.'); }
    finally { setBusy(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this resource?')) return;
    try { await deleteDoc(doc(db, 'resources', id)); await fetch(); } catch (e) { console.error(e); }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <header className="page-header"><div><span className="dashboard-eyebrow">Materials</span><h1>Resources</h1></div></header>
      <div className="card-elevated" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3>Add resource</h3>
        {error && <div className="alert alert-error" style={{ marginTop: '0.5rem' }}>{error}</div>}
        <form onSubmit={submit} style={{ marginTop: '0.75rem', display: 'grid', gap: '0.75rem' }}>
          <div className="field"><label className="field-label">Title</label><input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. NDC 3.0 Summary" required /></div>
          <div className="field"><label className="field-label">URL / Link</label><input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></div>
          <div className="field"><label className="field-label">Description (optional)</label><textarea className="textarea" value={description} onChange={e => setDescription(e.target.value)} rows={2} /></div>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add resource'}</button>
        </form>
      </div>
      {loading ? <div style={{ textAlign: 'center', padding: '2rem' }}><div className="loader" /></div> : items.length === 0 ? (
        <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>No resources yet.</p>
      ) : items.map(r => (
        <div key={r.id} className="card-elevated" style={{ padding: '1rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <div style={{ fontWeight: 700 }}>{r.title}</div>
            {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{r.url}</a>}
            {r.description && <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', marginTop: '0.25rem' }}>{r.description}</p>}
          </div>
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--crimson)', flexShrink: 0 }} onClick={() => handleDelete(r.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
