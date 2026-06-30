import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';

async function clearCollection(name) {
  const snap = await getDocs(collection(db, name));
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(db);
    docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  return docs.length;
}

async function deleteDocs(refs) {
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    refs.slice(i, i + 400).forEach(r => batch.delete(r));
    await batch.commit();
  }
}

export default function Settings() {
  const { profile, isSuperAdmin } = useAuth();
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [mode, setMode] = useState(null); // 'checkin' | 'group' | 'full'
  const [users, setUsers] = useState([]);
  const [group, setGroup] = useState('attendees');

  useEffect(() => {
    if (!isSuperAdmin) return;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data(), _ref: d.ref }));
        setUsers(list);
      } catch (e) { console.error(e); }
    })();
  }, [isSuperAdmin]);

  const categories = useMemo(() => {
    const set = new Set();
    users.forEach(u => u.category && set.add(u.category));
    return Array.from(set).sort();
  }, [users]);

  if (!isSuperAdmin) {
    return (
      <div className="container" style={{ maxWidth: 700, margin: '0 auto' }}>
        <div className="card-elevated" style={{ padding: '2rem' }}>
          <h2>Settings</h2>
          <p className="text-muted mt-2">Only the super-administrator can access platform settings.</p>
        </div>
      </div>
    );
  }

  // Resolve which users a group selection targets (never includes self).
  const groupMatches = (g) => users.filter(u => {
    if (u.id === profile.id) return false;
    if (g === 'all') return true;
    if (g === 'attendees') return u.role === 'attendee';
    if (g === 'organisers') return u.role === 'organiser' || u.role === 'superadmin';
    if (g === 'checkin') return u.role === 'checkin';
    return u.category === g; // a specific category
  });

  const groupLabel = (g) => ({
    all: 'All people', attendees: 'All attendees', organisers: 'All organisers', checkin: 'All check-in staff',
  }[g] || g);

  const clearCheckinData = async () => {
    setBusy('checkin'); setMsg('');
    try {
      const snap = await getDocs(collection(db, 'users'));
      const docs = snap.docs;
      let n = 0;
      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(db);
        docs.slice(i, i + 400).forEach(d => { batch.update(d.ref, { entries: [], meals: {}, suppliesIssued: null }); n++; });
        await batch.commit();
      }
      setMsg(`✓ Cleared entry, meal and supply records for ${n} people. Registrations kept.`);
    } catch (e) {
      console.error(e); setMsg('Could not clear check-in data: ' + (e.message || e));
    }
    setBusy(''); setMode(null); setConfirmText('');
  };

  const deleteGroup = async () => {
    setBusy('group'); setMsg('');
    try {
      const targets = groupMatches(group);
      await deleteDocs(targets.map(t => t._ref));
      setMsg(`✓ Deleted ${targets.length} ${groupLabel(group).toLowerCase()}. Your account was kept.`);
      // refresh local list
      setUsers(prev => prev.filter(u => !targets.some(t => t.id === u.id)));
    } catch (e) {
      console.error(e); setMsg('Could not delete: ' + (e.message || e));
    }
    setBusy(''); setMode(null); setConfirmText('');
  };

  const fullReset = async () => {
    setBusy('full'); setMsg('');
    try {
      const snap = await getDocs(collection(db, 'users'));
      const toDelete = snap.docs.filter(d => d.id !== profile.id).map(d => d.ref);
      await deleteDocs(toDelete);
      const s = await clearCollection('sessions');
      const a = await clearCollection('announcements');
      const r = await clearCollection('resources');
      const f = await clearCollection('feedback');
      setMsg(`✓ Full reset complete. Removed ${toDelete.length} people, ${s} sessions, ${a} announcements, ${r} resources, ${f} feedback. Your account was kept.`);
      setUsers(prev => prev.filter(u => u.id === profile.id));
    } catch (e) {
      console.error(e); setMsg('Could not complete full reset: ' + (e.message || e));
    }
    setBusy(''); setMode(null); setConfirmText('');
  };

  const targetCount = groupMatches(group).length;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <header className="page-header">
        <div>
          <span className="dashboard-eyebrow">Super-admin</span>
          <h1>Settings</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>Platform maintenance and data reset.</p>
        </div>
      </header>

      {msg && <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>{msg}</div>}

      {/* Clear check-in data */}
      <div className="card-elevated" style={{ padding: '1.5rem', marginBottom: '1.25rem', borderLeft: '4px solid var(--amber)' }}>
        <h3>Clear check-in records</h3>
        <p className="text-muted text-sm" style={{ marginTop: '0.35rem', marginBottom: '1rem' }}>
          Resets entry, meal and supply records for everyone, while keeping all registered people.
          Use this to start fresh between test runs or at the start of a conference day.
        </p>
        {mode !== 'checkin' ? (
          <button className="btn btn-secondary" disabled={!!busy} onClick={() => { setMode('checkin'); setConfirmText(''); setMsg(''); }}>
            Clear check-in records…
          </button>
        ) : (
          <div style={{ background: 'var(--amber-soft)', padding: '1rem', borderRadius: 'var(--radius)' }}>
            <p className="text-sm" style={{ marginBottom: '0.75rem' }}>Type <strong>RESET</strong> to confirm clearing all check-in records.</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input className="input" style={{ maxWidth: 160 }} value={confirmText} onChange={e => setConfirmText(e.target.value.toUpperCase())} placeholder="RESET" autoFocus />
              <button className="btn btn-ghost" onClick={() => { setMode(null); setConfirmText(''); }}>Cancel</button>
              <button className="btn btn-primary" disabled={confirmText !== 'RESET' || busy === 'checkin'} onClick={clearCheckinData}>
                {busy === 'checkin' ? 'Clearing…' : 'Confirm clear'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete by group */}
      <div className="card-elevated" style={{ padding: '1.5rem', marginBottom: '1.25rem', borderLeft: '4px solid var(--crimson)' }}>
        <h3 style={{ color: 'var(--crimson)' }}>Delete people by group</h3>
        <p className="text-muted text-sm" style={{ marginTop: '0.35rem', marginBottom: '1rem' }}>
          Remove a specific group of people — e.g. all attendees, all organisers, or a single category.
          Your own account is always kept. Cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: mode === 'group' ? '1rem' : 0 }}>
          <select className="select" style={{ maxWidth: 260 }} value={group} disabled={mode === 'group' || !!busy}
            onChange={e => { setGroup(e.target.value); setMsg(''); }}>
            <option value="all">All people</option>
            <option value="attendees">All attendees</option>
            <option value="organisers">All organisers</option>
            <option value="checkin">All check-in staff</option>
            {categories.length > 0 && <optgroup label="By category">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </optgroup>}
          </select>
          <span className="text-sm text-muted">{targetCount} match{targetCount === 1 ? '' : 'es'}</span>
        </div>
        {mode !== 'group' ? (
          <button className="btn btn-danger" disabled={!!busy || targetCount === 0} onClick={() => { setMode('group'); setConfirmText(''); setMsg(''); }}>
            Delete {groupLabel(group)}…
          </button>
        ) : (
          <div style={{ background: 'var(--crimson-soft)', padding: '1rem', borderRadius: 'var(--radius)' }}>
            <p className="text-sm" style={{ marginBottom: '0.75rem' }}>Delete <strong>{targetCount}</strong> {groupLabel(group).toLowerCase()}? Type <strong>DELETE</strong> to confirm.</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input className="input" style={{ maxWidth: 160 }} value={confirmText} onChange={e => setConfirmText(e.target.value.toUpperCase())} placeholder="DELETE" autoFocus />
              <button className="btn btn-ghost" onClick={() => { setMode(null); setConfirmText(''); }}>Cancel</button>
              <button className="btn btn-danger" disabled={confirmText !== 'DELETE' || busy === 'group'} onClick={deleteGroup}>
                {busy === 'group' ? 'Deleting…' : 'Confirm delete'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full reset */}
      <div className="card-elevated" style={{ padding: '1.5rem', borderLeft: '4px solid var(--crimson)' }}>
        <h3 style={{ color: 'var(--crimson)' }}>Full reset — wipe everything</h3>
        <p className="text-muted text-sm" style={{ marginTop: '0.35rem', marginBottom: '1rem' }}>
          Deletes <strong>all people</strong> (except your own account), plus all sessions, announcements,
          resources and feedback. Cannot be undone. Use only for a completely clean slate.
        </p>
        {mode !== 'full' ? (
          <button className="btn btn-danger" disabled={!!busy} onClick={() => { setMode('full'); setConfirmText(''); setMsg(''); }}>
            Full reset…
          </button>
        ) : (
          <div style={{ background: 'var(--crimson-soft)', padding: '1rem', borderRadius: 'var(--radius)' }}>
            <p className="text-sm" style={{ marginBottom: '0.75rem' }}>This deletes everything except your account. Type <strong>DELETE ALL</strong> to confirm.</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input className="input" style={{ maxWidth: 200 }} value={confirmText} onChange={e => setConfirmText(e.target.value.toUpperCase())} placeholder="DELETE ALL" autoFocus />
              <button className="btn btn-ghost" onClick={() => { setMode(null); setConfirmText(''); }}>Cancel</button>
              <button className="btn btn-danger" disabled={confirmText !== 'DELETE ALL' || busy === 'full'} onClick={fullReset}>
                {busy === 'full' ? 'Resetting…' : 'Confirm full reset'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
