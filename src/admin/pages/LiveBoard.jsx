import { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
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
        {[['announcements', 'Announcements'], ['agenda', 'Agenda'], ['resources', 'Resources'], ['feedback', 'Feedback']].map(([id, label]) => (
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
    </div>
  );
}
