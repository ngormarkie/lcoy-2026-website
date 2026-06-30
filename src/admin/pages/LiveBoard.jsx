import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../services/firebase';
import './LiveBoard.css';

const DAY_ORDER = ['Day 1 — 7 October', 'Day 2 — 8 October', 'Day 3 — 9 October'];

export default function LiveBoard() {
  const [tab, setTab] = useState('announcements');
  const [ann, setAnn] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  // Feedback form
  const [fbName, setFbName] = useState('');
  const [fbMsg, setFbMsg] = useState('');
  const [fbBusy, setFbBusy] = useState(false);
  const [fbDone, setFbDone] = useState(false);
  const [fbErr, setFbErr] = useState('');

  // Workshop registration
  const [regFor, setRegFor] = useState(null); // session being registered for
  const [regPhone, setRegPhone] = useState('');
  const [regBusy, setRegBusy] = useState(false);
  const [regResult, setRegResult] = useState(null); // { ok, status, already, name } or { error }

  useEffect(() => {
    (async () => {
      try {
        const [a, s, r] = await Promise.all([
          getDocs(collection(db, 'announcements')),
          getDocs(collection(db, 'sessions')),
          getDocs(collection(db, 'resources')),
        ]);
        const al = []; a.forEach(d => al.push({ id: d.id, ...d.data() }));
        al.sort((x, y) => (y.createdAt?.seconds || 0) - (x.createdAt?.seconds || 0));
        const sl = []; s.forEach(d => sl.push({ id: d.id, ...d.data() }));
        sl.sort((x, y) => (x.day || '').localeCompare(y.day || '') || (x.time || '').localeCompare(y.time || ''));
        const rl = []; r.forEach(d => rl.push({ id: d.id, ...d.data() }));
        rl.sort((x, y) => (y.createdAt?.seconds || 0) - (x.createdAt?.seconds || 0));
        setAnn(al); setSessions(sl); setResources(rl);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const fmtDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const submitFeedback = async (e) => {
    e.preventDefault(); setFbErr('');
    if (!fbMsg.trim()) return setFbErr('Please write your feedback.');
    setFbBusy(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        name: fbName.trim() || 'Anonymous',
        message: fbMsg.trim(),
        createdAt: serverTimestamp(),
      });
      setFbDone(true); setFbName(''); setFbMsg('');
    } catch (err) { console.error(err); setFbErr('Could not send. Please try again.'); }
    finally { setFbBusy(false); }
  };

  const grouped = DAY_ORDER.map(day => ({ day, items: sessions.filter(s => s.day === day) }))
    .filter(g => g.items.length > 0);

  const workshops = sessions.filter(s => s.allowRegistration);

  const doRegister = async (e) => {
    e.preventDefault();
    setRegBusy(true); setRegResult(null);
    try {
      const call = httpsCallable(functions, 'registerForWorkshop');
      const res = await call({ phone: regPhone, sessionId: regFor.id, origin: window.location.origin });
      const d = res.data || {};
      if (!d.ok) {
        const msg = d.reason === 'not_recognized'
          ? 'That phone number is not recognised. Please use the number you registered with, or contact an organiser.'
          : d.reason === 'invalid_phone' ? 'Please enter a valid phone number.'
          : 'Could not register. Please try again.';
        setRegResult({ error: msg });
      } else {
        setRegResult(d);
        // refresh session counts
        const ssnap = await getDocs(collection(db, 'sessions'));
        const sl = []; ssnap.forEach(x => sl.push({ id: x.id, ...x.data() }));
        setSessions(sl);
      }
    } catch (err) {
      console.error(err);
      setRegResult({ error: 'Could not reach the registration service. Please try again.' });
    }
    setRegBusy(false);
  };

  const closeReg = () => { setRegFor(null); setRegPhone(''); setRegResult(null); };

  return (
    <div className="lb">
      <header className="lb-top">
        <img src="/photos/LCOY-2026-Logo.png" alt="LCOY" className="lb-logo" />
        <div>
          <div className="lb-title">LCOY Sierra Leone 2026</div>
          <div className="lb-sub">Live Board · Freetown · 7–9 October</div>
        </div>
      </header>

      <nav className="lb-tabs">
        {[['announcements', 'Announcements'], ['agenda', 'Agenda'], ['workshops', 'Workshops'], ['resources', 'Resources'], ['feedback', 'Feedback']].map(([id, label]) => (
          <button key={id} className={`lb-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>

      <main className="lb-main">
        {loading ? <div className="lb-loader" /> : (
          <>
            {tab === 'announcements' && (
              ann.length === 0 ? <p className="lb-empty">No announcements yet. Check back soon.</p> :
              ann.map(a => (
                <div className="lb-card" key={a.id}>
                  <div className="lb-card-title">{a.title}</div>
                  {a.body && <p className="lb-card-body">{a.body}</p>}
                  <div className="lb-card-meta">{a.author || 'Organisers'} · {fmtDate(a.createdAt)}</div>
                </div>
              ))
            )}

            {tab === 'agenda' && (
              grouped.length === 0 ? <p className="lb-empty">The agenda will appear here.</p> :
              grouped.map(g => (
                <div key={g.day} className="lb-day">
                  <h3 className="lb-day-title">{g.day}</h3>
                  {g.items.map(s => (
                    <div className="lb-card" key={s.id}>
                      <div className="lb-sess-head">
                        {s.type && <span className="lb-pill">{s.type}</span>}
                        {s.time && <span className="lb-time">{s.time}</span>}
                        {s.room && <span className="lb-room">· {s.room}</span>}
                      </div>
                      <div className="lb-card-title">{s.title}</div>
                      {s.speakers && <div className="lb-speakers">{s.speakers}</div>}
                    </div>
                  ))}
                </div>
              ))
            )}

            {tab === 'workshops' && (
              workshops.length === 0 ? <p className="lb-empty">No workshops open for registration yet.</p> :
              workshops.map(s => {
                const cap = Number(s.capacity) || 0;
                const conf = Number(s.regConfirmed) || 0;
                const spotsLeft = cap > 0 ? Math.max(0, cap - conf) : null;
                const full = cap > 0 && conf >= cap;
                return (
                  <div className="lb-card" key={s.id}>
                    <div className="lb-sess-head">
                      {s.type && <span className="lb-pill">{s.type}</span>}
                      {s.day && <span className="lb-time">{s.day.replace(/ —.*/, '')}</span>}
                      {s.time && <span className="lb-room">· {s.time}</span>}
                    </div>
                    <div className="lb-card-title">{s.title}</div>
                    {s.speakers && <div className="lb-speakers">{s.speakers}</div>}
                    <div className="lb-card-meta">
                      {cap > 0 ? (full ? 'Full — join the waitlist' : `${spotsLeft} place${spotsLeft === 1 ? '' : 's'} left`) : 'Open for registration'}
                    </div>
                    <button className="lb-btn" style={{ marginTop: '0.7rem', width: 'auto', padding: '0.55rem 1.1rem' }} onClick={() => { setRegFor(s); setRegPhone(''); setRegResult(null); }}>
                      {full ? 'Join waitlist' : 'Register'}
                    </button>
                  </div>
                );
              })
            )}

            {tab === 'resources' && (
              resources.length === 0 ? <p className="lb-empty">No resources shared yet.</p> :
              resources.map(r => (
                <div className="lb-card" key={r.id}>
                  <div className="lb-card-title">{r.title}</div>
                  {r.description && <p className="lb-card-body">{r.description}</p>}
                  {r.url && <a className="lb-link" href={r.url} target="_blank" rel="noopener noreferrer">Open link →</a>}
                  {r.fileData && <a className="lb-link" href={r.fileData} download={r.fileName || r.title}>Download {r.fileName || 'file'} ↓</a>}
                </div>
              ))
            )}

            {tab === 'feedback' && (
              <div className="lb-card">
                {fbDone ? (
                  <div className="lb-thanks">
                    <div className="lb-thanks-icon">✓</div>
                    <p>Thank you — your feedback has been sent.</p>
                    <button className="lb-btn-ghost" onClick={() => setFbDone(false)}>Send another</button>
                  </div>
                ) : (
                  <form onSubmit={submitFeedback}>
                    <div className="lb-card-title" style={{ marginBottom: '0.75rem' }}>Share your feedback</div>
                    {fbErr && <div className="lb-err">{fbErr}</div>}
                    <input className="lb-input" placeholder="Your name (optional)" value={fbName} onChange={e => setFbName(e.target.value)} />
                    <textarea className="lb-input" rows={4} placeholder="What did you think? Suggestions?" value={fbMsg} onChange={e => setFbMsg(e.target.value)} />
                    <button className="lb-btn" disabled={fbBusy}>{fbBusy ? 'Sending…' : 'Send feedback'}</button>
                  </form>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="lb-foot">Inclusive Climate Action: Leaving No Youth Behind</footer>

      {regFor && (
        <div className="lb-modal-overlay" onClick={closeReg}>
          <div className="lb-modal" onClick={e => e.stopPropagation()}>
            {!regResult ? (
              <form onSubmit={doRegister}>
                <div className="lb-card-title">{regFor.title}</div>
                <p className="lb-card-body" style={{ marginTop: '0.3rem', marginBottom: '0.9rem' }}>
                  Enter the phone number you registered for LCOY with. We'll confirm your place and email you.
                </p>
                <input className="lb-input" type="tel" inputMode="tel" placeholder="e.g. 076 123456" value={regPhone} onChange={e => setRegPhone(e.target.value)} autoFocus />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="lb-btn-ghost" style={{ flex: 1 }} onClick={closeReg}>Cancel</button>
                  <button type="submit" className="lb-btn" style={{ flex: 2 }} disabled={regBusy || !regPhone.trim()}>{regBusy ? 'Checking…' : 'Confirm'}</button>
                </div>
              </form>
            ) : regResult.error ? (
              <div style={{ textAlign: 'center' }}>
                <div className="lb-modal-icon lb-modal-err">✕</div>
                <p className="lb-card-body">{regResult.error}</p>
                <button className="lb-btn" style={{ marginTop: '0.8rem' }} onClick={() => setRegResult(null)}>Try again</button>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div className={`lb-modal-icon ${regResult.status === 'confirmed' ? 'lb-modal-ok' : 'lb-modal-wait'}`}>{regResult.status === 'confirmed' ? '✓' : '⏳'}</div>
                <div className="lb-card-title">{regResult.already ? 'Already registered' : regResult.status === 'confirmed' ? "You're confirmed!" : "You're on the waitlist"}</div>
                <p className="lb-card-body" style={{ marginTop: '0.4rem' }}>
                  {regResult.name ? `${regResult.name}, ` : ''}
                  {regResult.status === 'confirmed'
                    ? 'show your badge at the door to be admitted. A confirmation email is on its way.'
                    : "we'll email you if a place opens up."}
                </p>
                <button className="lb-btn" style={{ marginTop: '0.8rem' }} onClick={closeReg}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
