import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { AGENDA_SEED } from '../../utils/agendaSeed';

const DAYS = ['Day 1 — 7 October', 'Day 2 — 8 October'];

// One-time loader for the draft conference programme. Safe to run more than
// once: anything already in `sessions` with the same day + title is skipped
// rather than duplicated, so a partial or repeated run just fills the gaps.
export default function ImportAgenda() {
  const [existing, setExisting] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const fetchExisting = async () => {
    try {
      const snap = await getDocs(collection(db, 'sessions'));
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setExisting(list);
    } catch (e) { console.error(e); setError('Could not read the existing sessions.'); }
    setLoading(false);
  };

  useEffect(() => { fetchExisting(); }, []);

  const key = (s) => `${s.day}||${(s.title || '').trim().toLowerCase()}`;
  const existingKeys = useMemo(() => new Set(existing.map(key)), [existing]);
  const toImport = useMemo(() => AGENDA_SEED.filter((s) => !existingKeys.has(key(s))), [existingKeys]);
  const skipCount = AGENDA_SEED.length - toImport.length;

  const runImport = async () => {
    if (toImport.length === 0) return;
    if (!confirm(`Add ${toImport.length} session(s) to the programme?`)) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const batch = writeBatch(db);
      toImport.forEach((s) => {
        const ref = doc(collection(db, 'sessions'));
        batch.set(ref, {
          title: s.title,
          description: s.description || '',
          day: s.day,
          type: s.type,
          time: s.time,
          room: s.room || '',
          speakers: '',
          capacity: null,
          allowRegistration: !!s.allowRegistration,
          regConfirmed: 0,
          regWaitlist: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
      setResult({ added: toImport.length });
      await fetchExisting();
    } catch (e) {
      console.error(e);
      setError('Could not import the agenda. ' + (e.message || ''));
    }
    setBusy(false);
  };

  const grouped = DAYS.map((day) => ({ day, items: AGENDA_SEED.filter((s) => s.day === day) }));
  const registerable = AGENDA_SEED.filter((s) => s.allowRegistration).length;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <header className="page-header">
        <div>
          <span className="dashboard-eyebrow">Programme</span>
          <h1>Import Agenda</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>
            Loads the draft conference programme into Sessions in one go, instead of adding {AGENDA_SEED.length} sessions by hand.
            Sessions already in the programme are skipped, so it's safe to run again.
          </p>
        </div>
        <Link to="/admin/sessions" className="btn btn-secondary btn-sm">← Sessions</Link>
      </header>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      {result && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          Added {result.added} session{result.added === 1 ? '' : 's'}. They're now on the public programme page, the delegate agenda, and the live board.
        </div>
      )}

      <div className="card-elevated" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        {loading ? <div className="loader" /> : (
          <>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div><div className="text-muted text-sm">In the agenda</div><div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{AGENDA_SEED.length}</div></div>
              <div><div className="text-muted text-sm">Will be added</div><div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--green-deep)' }}>{toImport.length}</div></div>
              <div><div className="text-muted text-sm">Already there</div><div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--ink-muted)' }}>{skipCount}</div></div>
              <div><div className="text-muted text-sm">Open for sign-up</div><div style={{ fontSize: '1.6rem', fontWeight: 800 }}>{registerable}</div></div>
            </div>
            <p className="text-muted text-sm" style={{ marginBottom: '1rem' }}>
              The {registerable} parallel breakouts and workshops are marked open for delegate registration, since delegates
              have to pick one of the two rooms. Everything else is a session everyone attends, so it needs no sign-up.
              You can close registration on any session from the Sessions page until you're ready.
            </p>
            <button className="btn btn-primary" disabled={busy || toImport.length === 0} onClick={runImport}>
              {busy ? 'Importing…' : toImport.length === 0 ? 'Nothing left to import' : `Import ${toImport.length} session${toImport.length === 1 ? '' : 's'}`}
            </button>
          </>
        )}
      </div>

      {grouped.map((g) => (
        <div key={g.day} style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.75rem', color: 'var(--blue, var(--green-deep))' }}>{g.day}</h3>
          {g.items.map((s, i) => {
            const already = existingKeys.has(key(s));
            return (
              <div key={i} className="card-elevated" style={{ padding: '0.85rem 1rem', marginBottom: '0.4rem', opacity: already ? 0.55 : 1 }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="pill" style={{ background: 'var(--blue, var(--green-deep))', color: '#fff', fontSize: '0.7rem' }}>{s.type}</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>{s.time}</span>
                  {s.room && <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>· {s.room}</span>}
                  {s.allowRegistration && <span className="pill" style={{ background: '#059669', color: '#fff', fontSize: '0.65rem' }}>Sign-up</span>}
                  {already && <span className="pill" style={{ background: 'var(--paper-dark)', fontSize: '0.65rem' }}>Already added</span>}
                </div>
                <div style={{ fontWeight: 700, marginTop: '0.25rem' }}>{s.title}</div>
                {s.description && <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: '0.15rem' }}>{s.description}</div>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
