import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';

const DAY_ORDER = ['Day 1 — 7 October', 'Day 2 — 8 October', 'Day 3 — 9 October'];

// "My sessions" = every session everyone attends (plenaries, ceremonies —
// anything not gated by allowRegistration) plus whichever workshops/
// breakouts this person has personally registered for. Registration itself
// still only happens on the public /live board (phone-number based, via the
// registerForWorkshop function) — this page is read-only, checking each
// registerable session's own registrations subcollection for this uid
// rather than a collection-group query, so it works without needing any
// extra Firestore index deployed.
export default function MySessions() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [statuses, setStatuses] = useState({}); // sessionId -> 'confirmed' | 'waitlist'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    (async () => {
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
        if (!cancelled) { setSessions(list); setStatuses(found); }
      } catch (e) { console.error(e); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profile?.id]);

  if (!profile) return null;
  if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}><div className="loader" /></div>;

  const mySessions = sessions.filter(s => !s.allowRegistration || statuses[s.id]);
  const grouped = DAY_ORDER.map(day => ({ day, items: mySessions.filter(s => s.day === day) })).filter(g => g.items.length > 0);

  return (
    <div>
      <header className="page-header">
        <div>
          <span className="dashboard-eyebrow">Your schedule</span>
          <h1>My Sessions</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>Plenaries and open sessions everyone attends, plus any workshop you've registered for.</p>
        </div>
      </header>

      <div className="card-elevated" style={{ padding: '1.1rem 1.25rem', marginBottom: '1.5rem' }}>
        <p className="text-sm">Want to join a workshop or breakout? Registration is on the <Link to="/live">live board</Link>'s Workshops tab, using the phone number on your profile.</p>
      </div>

      {grouped.length === 0 ? (
        <div className="card-elevated" style={{ textAlign: 'center', padding: '3rem' }}><p className="text-muted">The agenda will appear here once it's published.</p></div>
      ) : grouped.map(g => (
        <div key={g.day} style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '0.75rem', color: 'var(--blue, var(--green-deep))' }}>{g.day}</h3>
          {g.items.map(s => (
            <div key={s.id} className="card-elevated" style={{ padding: '1rem', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {s.type && <span className="pill" style={{ background: 'var(--blue, var(--green-deep))', color: '#fff', fontSize: '0.7rem' }}>{s.type}</span>}
                {s.time && <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>{s.time}</span>}
                {s.room && <span style={{ fontSize: '0.85rem', color: 'var(--ink-muted)' }}>· {s.room}</span>}
                {statuses[s.id] === 'waitlist' && <span className="pill" style={{ background: 'var(--amber-soft)', color: 'var(--amber)', fontSize: '0.65rem' }}>Waitlisted</span>}
                {statuses[s.id] === 'confirmed' && <span className="pill" style={{ background: '#d1fae5', color: '#065f46', fontSize: '0.65rem' }}>Registered</span>}
              </div>
              <div style={{ fontWeight: 700, marginTop: '0.25rem' }}>{s.title}</div>
              {s.speakers && <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: '0.15rem' }}>{s.speakers}</div>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
