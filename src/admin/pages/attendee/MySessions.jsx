import { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';

const DAY_ORDER = ['Day 1 — 7 October', 'Day 2 — 8 October', 'Day 3 — 9 October'];

// The full programme, plus sign-up for the parallel breakouts/workshops where
// a delegate has to pick one of two rooms. Registration is written directly
// from the client against the session's own `registrations` subcollection
// (document id = the delegate's uid, which is what the Firestore rules key
// off) — no Cloud Function, so this works without the Blaze plan.
export default function MySessions() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [statuses, setStatuses] = useState({}); // sessionId -> 'confirmed' | 'waitlist'
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const snap = await getDocs(collection(db, 'sessions'));
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.day || '').localeCompare(b.day || '') || (a.time || '').localeCompare(b.time || ''));
      const registerable = list.filter(s => s.allowRegistration);
      const found = {};
      await Promise.all(registerable.map(async (s) => {
        try {
          const regSnap = await getDoc(doc(db, 'sessions', s.id, 'registrations', profile.id));
          if (regSnap.exists()) found[s.id] = regSnap.data().status || 'confirmed';
        } catch (e) { console.error(e); }
      }));
      setSessions(list);
      setStatuses(found);
    } catch (e) { console.error(e); setError('Could not load the programme.'); }
    setLoading(false);
  };

  useEffect(() => { if (profile) load(); }, [profile?.id]);

  const register = async (session) => {
    setBusyId(session.id); setError('');
    try {
      // Decide confirmed vs waitlist from the live count, so a capped session
      // starts waitlisting once it's full.
      let status = 'confirmed';
      const capacity = Number(session.capacity) || 0;
      if (capacity > 0) {
        const regsSnap = await getDocs(collection(db, 'sessions', session.id, 'registrations'));
        let confirmed = 0;
        regsSnap.forEach(d => { if ((d.data().status || 'confirmed') === 'confirmed') confirmed++; });
        if (confirmed >= capacity) status = 'waitlist';
      }
      await setDoc(doc(db, 'sessions', session.id, 'registrations', profile.id), {
        userId: profile.id,
        name: profile.name || '',
        code: profile.code || '',
        phone: profile.phone || '',
        email: profile.email || '',
        status,
        attended: false,
        registeredAt: serverTimestamp(),
      });
      // The counter on the session doc is only there to save the organiser
      // list from reading every subcollection — the registrations themselves
      // are the real record, so a failure here must not fail the sign-up.
      try {
        await updateDoc(doc(db, 'sessions', session.id),
          status === 'confirmed' ? { regConfirmed: increment(1) } : { regWaitlist: increment(1) });
      } catch (e) { console.error('counter update failed', e); }
      setStatuses(prev => ({ ...prev, [session.id]: status }));
    } catch (e) {
      console.error(e);
      setError(e.code === 'permission-denied'
        ? 'Registration is closed for this session.'
        : 'Could not register you for this session. Please try again.');
    }
    setBusyId('');
  };

  const cancel = async (session) => {
    if (!confirm(`Cancel your place in "${session.title}"?`)) return;
    setBusyId(session.id); setError('');
    const previous = statuses[session.id];
    try {
      await deleteDoc(doc(db, 'sessions', session.id, 'registrations', profile.id));
      try {
        await updateDoc(doc(db, 'sessions', session.id),
          previous === 'waitlist' ? { regWaitlist: increment(-1) } : { regConfirmed: increment(-1) });
      } catch (e) { console.error('counter update failed', e); }
      setStatuses(prev => { const next = { ...prev }; delete next[session.id]; return next; });
    } catch (e) {
      console.error(e);
      setError('Could not cancel your place. Please try again.');
    }
    setBusyId('');
  };

  if (!profile) return null;
  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}><div className="loader" /></div>;

  const grouped = DAY_ORDER.map(day => ({ day, items: sessions.filter(s => s.day === day) })).filter(g => g.items.length > 0);
  const chosen = Object.keys(statuses).length;

  return (
    <div>
      <header className="page-header">
        <div>
          <span className="dashboard-eyebrow">Your schedule</span>
          <h1>My Sessions</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>
            The full programme. Sessions marked <strong>Choose one</strong> run at the same time in two different rooms — pick the one you want to attend.
          </p>
        </div>
      </header>

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {grouped.length === 0 ? (
        <div className="card-elevated" style={{ textAlign: 'center', padding: '3rem' }}><p className="text-muted">The agenda will appear here once it's published.</p></div>
      ) : (
        <>
          {chosen > 0 && (
            <div className="card-elevated" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
              <p className="text-sm">You've signed up for <strong>{chosen}</strong> session{chosen === 1 ? '' : 's'}. Show your badge at the door.</p>
            </div>
          )}
          {grouped.map(g => (
            <div key={g.day} style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '0.75rem', color: 'var(--blue, var(--green-deep))' }}>{g.day}</h3>
              {g.items.map(s => {
                const status = statuses[s.id];
                const full = Number(s.capacity) > 0 && (Number(s.regConfirmed) || 0) >= Number(s.capacity);
                return (
                  <div key={s.id} className="card-elevated" style={{ padding: '1rem', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 260px' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          {s.type && <span className="pill" style={{ background: 'var(--blue, var(--green-deep))', color: '#fff', fontSize: '0.7rem' }}>{s.type}</span>}
                          {s.time && <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>{s.time}</span>}
                          {s.room && <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>· {s.room}</span>}
                          {s.allowRegistration && !status && <span className="pill" style={{ background: 'var(--paper-dark)', fontSize: '0.65rem' }}>Choose one</span>}
                          {status === 'waitlist' && <span className="pill" style={{ background: 'var(--amber-soft)', color: 'var(--amber)', fontSize: '0.65rem' }}>Waitlisted</span>}
                          {status === 'confirmed' && <span className="pill" style={{ background: '#d1fae5', color: '#065f46', fontSize: '0.65rem' }}>Registered</span>}
                        </div>
                        <div style={{ fontWeight: 700, marginTop: '0.25rem' }}>{s.title}</div>
                        {s.description && <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: '0.15rem' }}>{s.description}</div>}
                      </div>
                      {s.allowRegistration && (
                        <div style={{ flexShrink: 0 }}>
                          {status ? (
                            <button className="btn btn-ghost btn-sm" disabled={busyId === s.id} onClick={() => cancel(s)}>
                              {busyId === s.id ? '…' : 'Cancel'}
                            </button>
                          ) : (
                            <button className="btn btn-primary btn-sm" disabled={busyId === s.id} onClick={() => register(s)}>
                              {busyId === s.id ? '…' : full ? 'Join waitlist' : 'Register'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
