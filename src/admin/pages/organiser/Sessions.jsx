import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../../services/firebase';

const DAYS = ['Day 1 — 7 October', 'Day 2 — 8 October', 'Day 3 — 9 October'];
const TYPES = ['Plenary', 'Panel', 'Workshop', 'Breakout', 'Hackathon', 'Ceremony', 'Field Trip', 'Other'];
const BLANK = { title: '', description: '', day: DAYS[0], type: TYPES[0], time: '', room: '', capacity: '', speakers: '', allowRegistration: false };

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [openRegs, setOpenRegs] = useState(null); // sessionId whose registrations are shown
  const [regs, setRegs] = useState([]);
  const [regsLoading, setRegsLoading] = useState(false);

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

  const resetForm = () => { setForm(BLANK); setEditing(null); setShowForm(false); setError(''); };
  const startEdit = (s) => { setForm({ ...BLANK, ...s, capacity: s.capacity || '' }); setEditing(s.id); setShowForm(true); };

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (!form.title.trim()) return setError('Title is required.');
    setBusy(true);
    const data = {
      title: form.title.trim(), description: (form.description || '').trim(), day: form.day, type: form.type,
      time: (form.time || '').trim(), room: (form.room || '').trim(), speakers: (form.speakers || '').trim(),
      capacity: form.capacity ? Number(form.capacity) : null,
      allowRegistration: !!form.allowRegistration,
      updatedAt: serverTimestamp(),
    };
    try {
      if (editing) { await updateDoc(doc(db, 'sessions', editing), data); }
      else { data.createdAt = serverTimestamp(); data.regConfirmed = 0; data.regWaitlist = 0; await addDoc(collection(db, 'sessions'), data); }
      await fetchSessions();
      resetForm();
    } catch (err) { console.error(err); setError('Could not save session.'); }
    finally { setBusy(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this session?')) return;
    try { await deleteDoc(doc(db, 'sessions', id)); await fetchSessions(); } catch (e) { console.error(e); }
  };

  const toggleRegs = async (s) => {
    if (openRegs === s.id) { setOpenRegs(null); setRegs([]); return; }
    setOpenRegs(s.id); setRegsLoading(true); setRegs([]);
    try {
      const snap = await getDocs(collection(db, 'sessions', s.id, 'registrations'));
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.registeredAt?.seconds || 0) - (b.registeredAt?.seconds || 0));
      setRegs(list);
    } catch (e) { console.error(e); }
    setRegsLoading(false);
  };

  const promote = async (session, reg) => {
    try {
      await updateDoc(doc(db, 'sessions', session.id, 'registrations', reg.id), { status: 'confirmed', promotedAt: serverTimestamp() });
      await updateDoc(doc(db, 'sessions', session.id), { regWaitlist: increment(-1), regConfirmed: increment(1) });
      if (reg.email) {
        await addDoc(collection(db, 'mail'), {
          to: reg.email,
          message: {
            subject: `A place opened up: ${session.title} — LCOY 2026`,
            html: `<div style="font-family:Arial,sans-serif"><p>Good news — you've moved off the waitlist and are now <strong>confirmed</strong> for <strong>${session.title}</strong>. Show your badge at the door.</p></div>`,
            text: `You are now confirmed for ${session.title}. Show your badge at the door.`,
          },
          createdAt: serverTimestamp(),
        });
      }
      setRegs(prev => prev.map(r => r.id === reg.id ? { ...r, status: 'confirmed' } : r));
      setSessions(prev => prev.map(x => x.id === session.id ? { ...x, regWaitlist: (x.regWaitlist || 0) - 1, regConfirmed: (x.regConfirmed || 0) + 1 } : x));
    } catch (e) { console.error(e); alert('Could not promote.'); }
  };

  const grouped = DAYS.map(day => ({ day, items: sessions.filter(s => s.day === day) }));

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <header className="page-header">
        <div>
          <span className="dashboard-eyebrow">Programme</span>
          <h1>Sessions</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>Manage the agenda. Mark workshops "open for registration" to let attendees sign up.</p>
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
              <div className="field"><label className="field-label">Capacity</label><input className="input" type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} placeholder="e.g. 40" /></div>
            </div>
            <div className="field"><label className="field-label">Speakers / facilitators</label><input className="input" value={form.speakers} onChange={e => setForm({ ...form, speakers: e.target.value })} placeholder="Names, separated by commas" /></div>
            <div className="field"><label className="field-label">Description</label><textarea className="textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}>
              <input type="checkbox" checked={!!form.allowRegistration} onChange={e => setForm({ ...form, allowRegistration: e.target.checked })} />
              Open for attendee registration (workshop / breakout). Set a capacity above for waitlisting.
            </label>
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
            <div key={s.id} className="card-elevated" style={{ padding: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="pill" style={{ background: 'var(--blue, var(--green-deep))', color: '#fff', fontSize: '0.7rem' }}>{s.type}</span>
                    {s.time && <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>{s.time}</span>}
                    {s.room && <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>· {s.room}</span>}
                    {s.allowRegistration && <span className="pill" style={{ background: '#059669', color: '#fff', fontSize: '0.65rem' }}>Registration open</span>}
                  </div>
                  <div style={{ fontWeight: 700, marginTop: '0.25rem' }}>{s.title}</div>
                  {s.speakers && <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: '0.15rem' }}>{s.speakers}</div>}
                  {s.allowRegistration && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', marginTop: '0.25rem' }}>
                      {s.regConfirmed || 0}{s.capacity ? ` / ${s.capacity}` : ''} confirmed
                      {s.regWaitlist ? ` · ${s.regWaitlist} waitlisted` : ''}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {s.allowRegistration && <button className="btn btn-ghost btn-sm" onClick={() => toggleRegs(s)}>{openRegs === s.id ? 'Hide' : 'Registrations'}</button>}
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(s)}>Edit</button>
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--crimson)' }} onClick={() => handleDelete(s.id)}>Delete</button>
                </div>
              </div>

              {openRegs === s.id && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--paper-dark)', paddingTop: '1rem' }}>
                  {regsLoading ? <div className="loader" /> : regs.length === 0 ? (
                    <p className="text-muted text-sm">No registrations yet.</p>
                  ) : (
                    <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ textAlign: 'left', color: 'var(--ink-muted)' }}><th style={{ padding: '0.3rem 0' }}>Name</th><th>Code</th><th>Status</th><th>Attended</th><th></th></tr></thead>
                      <tbody>
                        {regs.map(r => (
                          <tr key={r.id} style={{ borderTop: '1px solid var(--paper-dark)' }}>
                            <td style={{ padding: '0.4rem 0' }}>{r.name}</td>
                            <td className="font-mono">{r.code}</td>
                            <td><span className="pill" style={{ fontSize: '0.65rem', background: r.status === 'confirmed' ? '#d1fae5' : '#fef3c7', color: r.status === 'confirmed' ? '#065f46' : '#92400e' }}>{r.status}</span></td>
                            <td>{r.attended ? '✓' : '—'}</td>
                            <td style={{ textAlign: 'right' }}>{r.status === 'waitlist' && <button className="btn btn-ghost btn-sm" onClick={() => promote(s, r)}>Promote</button>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
