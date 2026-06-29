import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const DAYS = ['Day 1 — 7 October', 'Day 2 — 8 October', 'Day 3 — 9 October'];
const TYPES = ['Plenary', 'Panel', 'Workshop', 'Breakout', 'Hackathon', 'Ceremony', 'Field Trip', 'Other'];

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', day: DAYS[0], type: TYPES[0], time: '', room: '', capacity: '', speakers: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const fetchSessions = async () => {
    try {
      const snap = await getDocs(collection(db, 'sessions'));
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.day || '').localeCompare(b.day || '') || (a.time || '').localeCompare(b.time || ''));
      setSessions(list);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchSessions(); }, []);

  const resetForm = () => { setForm({ title: '', description: '', day: DAYS[0], type: TYPES[0], time: '', room: '', capacity: '', speakers: '' }); setEditing(null); setShowForm(false); setError(''); };

  const startEdit = (s) => { setForm({ title: s.title || '', description: s.description || '', day: s.day || DAYS[0], type: s.type || TYPES[0], time: s.time || '', room: s.room || '', capacity: s.capacity || '', speakers: s.speakers || '' }); setEditing(s.id); setShowForm(true); };

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (!form.title.trim()) return setError('Title is required.');
    setBusy(true);
    const data = { ...form, title: form.title.trim(), description: form.description.trim(), room: form.room.trim(), speakers: form.speakers.trim(), capacity: form.capacity ? Number(form.capacity) : null, updatedAt: serverTimestamp() };
    try {
      if (editing) { await updateDoc(doc(db, 'sessions', editing), data); }
      else { data.createdAt = serverTimestamp(); await addDoc(collection(db, 'sessions'), data); }
      await fetchSessions();
      resetForm();
    } catch (err) { console.error(err); setError('Could not save session.'); }
    finally { setBusy(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this session?')) return;
    try { await deleteDoc(doc(db, 'sessions', id)); await fetchSessions(); } catch (e) { console.error(e); }
  };

  const grouped = DAYS.map(day => ({ day, items: sessions.filter(s => s.day === day) }));

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <header className="page-header">
        <div>
          <span className="dashboard-eyebrow">Programme</span>
          <h1>Sessions</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>Manage the conference agenda.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>＋ Add session</button>
      </header>

      {showForm && (
        <div className="card-elevated" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
          <h3>{editing ? 'Edit session' : 'New session'}</h3>
          {error && <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>{error}</div>}
          <form onSubmit={submit} style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
            <div className="field"><label className="field-label">Title</label><input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="field"><label className="field-label">Day</label><select className="select" value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}>{DAYS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
              <div className="field"><label className="field-label">Type</label><select className="select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div className="field"><label className="field-label">Time</label><input className="input" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} placeholder="09:00 – 10:30" /></div>
              <div className="field"><label className="field-label">Room</label><input className="input" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} placeholder="Main hall" /></div>
              <div className="field"><label className="field-label">Capacity</label><input className="input" type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} placeholder="e.g. 50" /></div>
            </div>
            <div className="field"><label className="field-label">Speakers / facilitators</label><input className="input" value={form.speakers} onChange={e => setForm({ ...form, speakers: e.target.value })} placeholder="Names, separated by commas" /></div>
            <div className="field"><label className="field-label">Description</label><textarea className="textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <div style={{ textAlign: 'center', padding: '3rem' }}><div className="loader" /></div> : sessions.length === 0 ? (
        <div className="card-elevated" style={{ textAlign: 'center', padding: '3rem' }}><p className="text-muted">No sessions yet. Tap "Add session" to begin.</p></div>
      ) : grouped.map(g => g.items.length > 0 && (
        <div key={g.day} style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.75rem', color: 'var(--blue, var(--green-deep))' }}>{g.day}</h3>
          {g.items.map(s => (
            <div key={s.id} className="card-elevated" style={{ padding: '1rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="pill" style={{ background: 'var(--blue, var(--green-deep))', color: '#fff', fontSize: '0.7rem' }}>{s.type}</span>
                  {s.time && <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>{s.time}</span>}
                  {s.room && <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>· {s.room}</span>}
                </div>
                <div style={{ fontWeight: 700, marginTop: '0.25rem' }}>{s.title}</div>
                {s.speakers && <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: '0.15rem' }}>{s.speakers}</div>}
                {s.capacity && <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: '0.15rem' }}>Capacity: {s.capacity}</div>}
              </div>
              <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => startEdit(s)}>Edit</button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--crimson)' }} onClick={() => handleDelete(s.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
