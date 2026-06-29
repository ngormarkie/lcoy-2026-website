import { useEffect, useState, useRef } from 'react';
import { collection, getDocs, addDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export default function Resources() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const fetchAll = async () => {
    try {
      const snap = await getDocs(collection(db, 'resources'));
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setItems(list);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleFileChange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError('File must be under 5MB.'); return; }
    try {
      const base64 = await readFileAsBase64(f);
      setFile(base64);
      setFileName(f.name);
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
    } catch (err) { setError('Could not read file.'); }
  };

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (!title.trim()) return setError('Title is required.');
    if (!url.trim() && !file) return setError('Please add a URL or upload a file.');
    setBusy(true);
    try {
      const data = {
        title: title.trim(),
        url: url.trim(),
        description: description.trim(),
        createdAt: serverTimestamp(),
      };
      if (file) {
        data.fileData = file;
        data.fileName = fileName;
      }
      await addDoc(collection(db, 'resources'), data);
      setTitle(''); setUrl(''); setDescription(''); setFile(null); setFileName('');
      if (fileRef.current) fileRef.current.value = '';
      await fetchAll();
    } catch (err) {
      console.error(err);
      setError(err.message?.includes('bytes') ? 'File too large for Firestore. Use a smaller file or provide a URL instead.' : 'Could not add resource.');
    }
    finally { setBusy(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this resource?')) return;
    try { await deleteDoc(doc(db, 'resources', id)); await fetchAll(); } catch (e) { console.error(e); }
  };

  const downloadFile = (item) => {
    if (!item.fileData) return;
    const a = document.createElement('a');
    a.href = item.fileData;
    a.download = item.fileName || item.title || 'download';
    a.click();
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <header className="page-header"><div><span className="dashboard-eyebrow">Materials</span><h1>Resources</h1></div></header>
      <div className="card-elevated" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3>Add resource</h3>
        {error && <div className="alert alert-error" style={{ marginTop: '0.5rem' }}>{error}</div>}
        <form onSubmit={submit} style={{ marginTop: '0.75rem', display: 'grid', gap: '0.75rem' }}>
          <div className="field"><label className="field-label">Title</label><input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. NDC 3.0 Summary" required /></div>
          <div className="field"><label className="field-label">URL / Link (optional if uploading file)</label><input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></div>
          <div className="field">
            <label className="field-label">Upload file (max 5MB)</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={busy}>
                {fileName || 'Choose file'}
              </button>
              {fileName && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setFileName(''); if (fileRef.current) fileRef.current.value = ''; }}>Remove</button>}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png" onChange={handleFileChange} style={{ display: 'none' }} />
          </div>
          <div className="field"><label className="field-label">Description (optional)</label><textarea className="textarea" value={description} onChange={e => setDescription(e.target.value)} rows={2} /></div>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add resource'}</button>
        </form>
      </div>
      {loading ? <div style={{ textAlign: 'center', padding: '2rem' }}><div className="loader" /></div> : items.length === 0 ? (
        <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>No resources yet.</p>
      ) : items.map(r => (
        <div key={r.id} className="card-elevated" style={{ padding: '1rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>{r.title}</div>
            {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', wordBreak: 'break-all' }}>{r.url}</a>}
            {r.fileName && <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: '0.15rem' }}>📎 {r.fileName}</div>}
            {r.description && <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)', marginTop: '0.25rem' }}>{r.description}</p>}
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
            {r.fileData && <button className="btn btn-secondary btn-sm" onClick={() => downloadFile(r)}>Download</button>}
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--crimson)' }} onClick={() => handleDelete(r.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
