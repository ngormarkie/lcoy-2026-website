import { useState, useRef, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { normalizeCode } from '../../utils/badgeCode';
import QRScanner from '../../components/QRScanner';
import VerifyResult from '../../components/VerifyResult';
import './VerifyEntry.css';

export default function WorkshopEntry() {
  const [sessionsList, setSessionsList] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [users, setUsers] = useState([]);
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [scanning, setScanning] = useState(true);
  const [admitted, setAdmitted] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const [ss, us] = await Promise.all([getDocs(collection(db, 'sessions')), getDocs(collection(db, 'users'))]);
        const sl = []; ss.forEach(d => { const s = { id: d.id, ...d.data() }; if (s.allowRegistration) sl.push(s); });
        sl.sort((a, b) => (a.day || '').localeCompare(b.day || '') || (a.time || '').localeCompare(b.time || ''));
        const ul = []; us.forEach(d => ul.push({ id: d.id, ...d.data() }));
        if (!c) { setSessionsList(sl); setUsers(ul); if (sl[0]) setSessionId(sl[0].id); setLoaded(true); }
      } catch (e) { console.error(e); if (!c) setLoaded(true); }
    })();
    return () => { c = true; };
  }, []);

  const lookup = async (overrideCode) => {
    const normalized = normalizeCode(overrideCode || code);
    if (!normalized || !sessionId) return;
    setBusy(true); setResult(null);

    let person = users.find(u => normalizeCode(u.code) === normalized);
    if (!person) {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list = []; snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setUsers(list);
        person = list.find(u => normalizeCode(u.code) === normalized);
      } catch (e) { console.error(e); }
    }
    if (!person) {
      setResult({ type: 'error', message: `No person found with code "${normalized}".` });
      setBusy(false); return;
    }

    try {
      const regRef = doc(db, 'sessions', sessionId, 'registrations', person.id);
      const regSnap = await getDoc(regRef);
      if (!regSnap.exists()) {
        setResult({ type: 'error', user: person, message: `${person.name} is not registered for this session.` });
        setBusy(false); setCode(''); return;
      }
      const reg = regSnap.data();
      if (reg.status === 'waitlist') {
        setResult({ type: 'warning', user: person, message: `${person.name} is on the waitlist — not yet confirmed.` });
        setBusy(false); setCode(''); return;
      }
      // Confirmed → admit + record attendance
      if (!reg.attended) {
        await updateDoc(regRef, { attended: true, attendedAt: serverTimestamp() });
        setAdmitted(a => a + 1);
      }
      setResult({ type: 'success', user: person, message: reg.attended ? `${person.name} — already admitted.` : `${person.name} — admitted.` });
    } catch (e) {
      console.error(e);
      setResult({ type: 'error', message: 'Could not check registration. Please try again.' });
    }
    setBusy(false); setCode('');
    inputRef.current?.focus();
  };

  const handleSubmit = (e) => { e.preventDefault(); lookup(); };
  const session = sessionsList.find(s => s.id === sessionId);

  return (
    <div className="verify-page">
      <header className="page-header">
        <div>
          <span className="dashboard-eyebrow">Breakout rooms</span>
          <h1>Workshop Entry</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>Select the session, then scan badges. Only confirmed registrants are admitted.</p>
        </div>
      </header>

      <div className="verify-card card-elevated">
        <div className="field" style={{ marginBottom: '0.75rem' }}>
          <label className="field-label">Session</label>
          <select className="select" value={sessionId} onChange={e => { setSessionId(e.target.value); setResult(null); }}>
            {sessionsList.length === 0 && <option value="">No registerable sessions</option>}
            {sessionsList.map(s => <option key={s.id} value={s.id}>{(s.day || '').replace(/ —.*/, '')} · {s.time ? s.time + ' · ' : ''}{s.title}</option>)}
          </select>
        </div>
        <div className="verify-mode-toggle">
          <button type="button" className={`meal-btn ${scanning ? 'active' : ''}`} onClick={() => setScanning(true)}>Scan QR</button>
          <button type="button" className={`meal-btn ${!scanning ? 'active' : ''}`} onClick={() => setScanning(false)}>Type Code</button>
        </div>
        {scanning ? (
          <QRScanner active={scanning} onScan={(val) => { setScanning(false); setCode(val); lookup(val); }} />
        ) : (
          <form onSubmit={handleSubmit} className="verify-form" style={{ marginTop: '0.75rem' }}>
            <input ref={inputRef} type="text" className="verify-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Badge code" maxLength={3} autoFocus autoComplete="off" disabled={busy} />
            <button type="submit" className="btn btn-primary btn-lg" disabled={busy || !code.trim() || !sessionId}>{busy ? 'Checking…' : 'Check'}</button>
          </form>
        )}
        {!loaded && <div style={{ textAlign: 'center', padding: '1rem' }}><div className="loader" /></div>}
      </div>

      <VerifyResult
        result={result}
        action={session ? `Workshop · ${session.title}` : 'Workshop'}
        onClose={() => setResult(null)}
        onNext={() => { setResult(null); setCode(''); setScanning(true); }}
      />

      <div className="verify-stats">
        <div className="verify-stat">
          <div className="verify-stat-num">{admitted}</div>
          <div className="verify-stat-label">Admitted this session</div>
        </div>
        <div className="verify-stat">
          <div className="verify-stat-num">{session?.regConfirmed || 0}</div>
          <div className="verify-stat-label">Confirmed registrations</div>
        </div>
      </div>
    </div>
  );
}
