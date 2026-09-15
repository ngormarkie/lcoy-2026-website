import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './admin/services/firebase';

const DAY_ORDER = [
  { id: 'Day 1 — 7 October', label: 'Day 1', date: 'Wednesday, 7 October 2026', strap: 'Foundations & Dialogue', colour: 'var(--blue)' },
  { id: 'Day 2 — 8 October', label: 'Day 2', date: 'Thursday, 8 October 2026', strap: 'From Dialogue to Action', colour: 'var(--orange)' },
  { id: 'Day 3 — 9 October', label: 'Day 3', date: 'Friday, 9 October 2026', strap: 'Community Action', colour: '#2ecc71' },
];

const TYPE_COLOURS = {
  Plenary: 'var(--blue)',
  Panel: 'var(--blue-deep)',
  Workshop: 'var(--orange)',
  Breakout: 'var(--green-deep)',
  Ceremony: '#c678dd',
  Hackathon: '#e34948',
  'Field Trip': '#2ecc71',
};

// The published agenda, read live from the same `sessions` collection the
// organisers edit — so the public page, the delegate portal and the live
// board never drift apart. Deliberately shows no speaker names.
export default function ProgrammeAgenda() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

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
  const grouped = DAY_ORDER.map(d => ({ ...d, items: sessions.filter(s => s.day === d.id) })).filter(g => g.items.length > 0);
  if (grouped.length === 0) return null;

  return (
    <section>
      <div className="wrap">
        <div className="section-head" style={{ textAlign: 'center', margin: '0 auto 48px', maxWidth: 'none' }}>
          <span className="eyebrow" style={{ fontSize: '1.6rem' }}>Session by session</span>
          <h2 style={{ marginTop: '14px' }}>The detailed <em className="script-em">agenda</em></h2>
          <p style={{ color: 'var(--slate)', marginTop: '14px', maxWidth: 720, marginLeft: 'auto', marginRight: 'auto' }}>
            Draft programme for the national conference at Freetown City Hall. Times and sessions may still change.
          </p>
        </div>

        {grouped.map(g => (
          <div key={g.id} style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', paddingBottom: 14, marginBottom: 20, borderBottom: '2px solid var(--line)' }}>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 900, fontSize: '1.7rem', color: g.colour }}>{g.label}</span>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: '1.1rem' }}>{g.date}</span>
              <span style={{ color: 'var(--slate)', fontSize: '.95rem' }}>· {g.strap}</span>
            </div>

            {g.items.map(s => (
              <div
                key={s.id}
                style={{
                  display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start',
                  padding: '16px 18px', marginBottom: 8, borderRadius: 'var(--radius)',
                  background: 'var(--mist)', borderLeft: `4px solid ${TYPE_COLOURS[s.type] || 'var(--line)'}`,
                }}
              >
                <div style={{ flex: '0 0 130px', fontFamily: "'Outfit',sans-serif", fontWeight: 700, color: 'var(--ink)', fontSize: '.95rem', paddingTop: 2 }}>
                  {s.time}
                </div>
                <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                  <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: '1.08rem', lineHeight: 1.3 }}>{s.title}</div>
                  {s.description && <div style={{ color: 'var(--slate)', fontSize: '.94rem', marginTop: 4 }}>{s.description}</div>}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                    {s.type && (
                      <span style={{
                        fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: '.68rem', letterSpacing: '.08em',
                        textTransform: 'uppercase', padding: '3px 9px', borderRadius: 999,
                        background: TYPE_COLOURS[s.type] || 'var(--slate)', color: '#fff',
                      }}>{s.type}</span>
                    )}
                    {s.room && <span style={{ color: 'var(--slate)', fontSize: '.88rem' }}>{s.room}</span>}
                    {s.allowRegistration && (
                      <span style={{ color: 'var(--green-deep)', fontWeight: 600, fontSize: '.85rem' }}>
                        · Delegates choose one
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
