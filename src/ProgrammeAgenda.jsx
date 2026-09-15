import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { publicDb } from './admin/services/firebase';

const DAY_ORDER = [
  { id: 'Day 1 — 7 October', tab: 'Day 1', date: '7 October 2026', weekday: 'Wednesday', strap: 'Foundations & Dialogue' },
  { id: 'Day 2 — 8 October', tab: 'Day 2', date: '8 October 2026', weekday: 'Thursday', strap: 'From Dialogue to Action' },
  { id: 'Day 3 — 9 October', tab: 'Day 3', date: '9 October 2026', weekday: 'Friday', strap: 'Community Action' },
];

// Sessions are stored with a short title and a subtitle, which is what the
// organisers edit. A reader wants the whole name in one line, so the two are
// shown joined rather than hidden behind an expander.
function fullTitle(s) {
  const sub = (s.description || '').trim().replace(/\.$/, '');
  return sub ? `${s.title}: ${sub}` : s.title;
}

function PinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1.3" />
    </svg>
  );
}

// The published agenda, read live from the same `sessions` collection the
// organisers edit — so the public page, the delegate portal and the live
// board never drift apart. Deliberately shows no speaker names.
export default function ProgrammeAgenda() {
  const [sessions, setSessions] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | failed
  const [activeDay, setActiveDay] = useState(null);

  const load = useCallback(async () => {
    setState('loading');
    // getDocs does not reject when the connection is struggling — it retries
    // indefinitely, so a phone opening this page on a cold network can sit on
    // a pending promise forever and simply never show a programme. The timer
    // turns that hang into something the reader can see and retry; a response
    // that does eventually arrive still wins and renders.
    let settled = false;
    const timer = setTimeout(() => { if (!settled) setState('failed'); }, 8000);
    try {
      const snap = await getDocs(collection(publicDb, 'sessions'));
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (a.day || '').localeCompare(b.day || '') || (a.time || '').localeCompare(b.time || ''));
      setSessions(list);
      setState('ready');
    } catch (e) {
      console.error(e);
      setState('failed');
    } finally {
      settled = true;
      clearTimeout(timer);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (state === 'loading') {
    return (
      <section className="agenda-section">
        <div className="wrap"><p className="agenda-note">Loading the agenda…</p></div>
      </section>
    );
  }

  // A blank space where the programme should be just looks broken, so say what
  // happened and give the reader a way to try again.
  if (state === 'failed') {
    return (
      <section className="agenda-section">
        <div className="wrap">
          <p className="agenda-note">The agenda could not be loaded just now.</p>
          <div style={{ textAlign: 'center' }}>
            <button className="btn btn-primary" onClick={load}>Try again</button>
          </div>
        </div>
      </section>
    );
  }

  const days = DAY_ORDER.map(d => ({ ...d, items: sessions.filter(s => s.day === d.id) })).filter(d => d.items.length > 0);
  if (days.length === 0) return null;

  const current = days.find(d => d.id === activeDay) || days[0];

  return (
    <section className="agenda-section">
      <div className="wrap">
        <div className="agenda-tabs" role="tablist">
          {days.map(d => (
            <button
              key={d.id}
              role="tab"
              aria-selected={d.id === current.id}
              className={`agenda-tab${d.id === current.id ? ' is-active' : ''}`}
              onClick={() => setActiveDay(d.id)}
            >
              {d.tab}
            </button>
          ))}
        </div>

        <div className="agenda-card">
          <div className="agenda-date">
            <h3>{current.date}</h3>
            <span>{current.weekday} · {current.strap}</span>
          </div>

          <div className="agenda-list">
            {current.items.map(s => (
              <div key={s.id} className="agenda-row">
                <div className="agenda-time">{s.time}</div>
                <div className="agenda-track"><span className="agenda-dot" /></div>
                <div className="agenda-body">
                  <h4>{fullTitle(s)}</h4>
                  <div className="agenda-meta">
                    {s.room && <span><PinIcon />{s.room}</span>}
                    {/* "Other" is the catch-all for meals and breaks — a label
                        that tells a reader nothing, so it's left off. */}
                    {s.type && s.type !== 'Other' && <span><TagIcon />{s.type}</span>}
                    {/* Speakers and moderators are still being confirmed. Nothing
                        shows while the field is empty, and each name appears here
                        as soon as an organiser fills it in on the Sessions page. */}
                    {s.speakers && <span><MicIcon />{s.speakers}</span>}
                    {s.allowRegistration && <span className="agenda-choose">Delegates choose one</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
