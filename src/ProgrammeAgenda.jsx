import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './admin/services/firebase';

const DAY_ORDER = [
  { id: 'Day 1 — 7 October', tab: 'Day 1', date: '7 October 2026', weekday: 'Wednesday', strap: 'Foundations & Dialogue' },
  { id: 'Day 2 — 8 October', tab: 'Day 2', date: '8 October 2026', weekday: 'Thursday', strap: 'From Dialogue to Action' },
  { id: 'Day 3 — 9 October', tab: 'Day 3', date: '9 October 2026', weekday: 'Friday', strap: 'Community Action' },
];

function PinIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
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
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [activeDay, setActiveDay] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'sessions'));
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        list.sort((a, b) => (a.day || '').localeCompare(b.day || '') || (a.time || '').localeCompare(b.time || ''));
        if (!cancelled) setSessions(list);
      } catch (e) {
        console.error(e);
        if (!cancelled) setFailed(true);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Nothing published yet is the normal early state, not an error worth
  // showing the public — just leave the section out entirely.
  if (loading || failed) return null;
  const days = DAY_ORDER.map(d => ({ ...d, items: sessions.filter(s => s.day === d.id) })).filter(d => d.items.length > 0);
  if (days.length === 0) return null;

  const current = days.find(d => d.id === activeDay) || days[0];

  return (
    <section className="agenda-section">
      <div className="wrap">
        <div className="agenda-head">
          <span className="eyebrow" style={{ fontSize: '1.6rem' }}>Session by session</span>
          <h2>The detailed <em className="script-em">agenda</em></h2>
          <p>The national conference programme at Freetown City Hall. Times and sessions may still change.</p>
        </div>

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
            {current.items.map(s => {
              const open = !!expanded[s.id];
              return (
                <div key={s.id} className="agenda-row">
                  <div className="agenda-time">{s.time}</div>
                  <div className="agenda-track"><span className="agenda-dot" /></div>
                  <div className="agenda-body">
                    <h4>{s.title}</h4>
                    <div className="agenda-meta">
                      {s.room && <span><PinIcon />{s.room}</span>}
                      {/* "Other" is the catch-all for meals and breaks — a label
                          that tells a reader nothing, so it's left off. */}
                      {s.type && s.type !== 'Other' && <span><TagIcon />{s.type}</span>}
                      {s.allowRegistration && <span className="agenda-choose">Delegates choose one</span>}
                    </div>
                    {open && s.description && <p className="agenda-desc">{s.description}</p>}
                  </div>
                  {s.description && (
                    <button
                      className={`agenda-toggle${open ? ' is-open' : ''}`}
                      aria-expanded={open}
                      aria-label={open ? `Hide details for ${s.title}` : `Show details for ${s.title}`}
                      onClick={() => setExpanded(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                    >
                      +
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
