import { useState, useRef, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { normalizeCode } from '../../utils/badgeCode';
import QRScanner from '../../components/QRScanner';
import VerifyResult from '../../components/VerifyResult';
import './VerifyEntry.css';

const DAYS = [
  { id: 'day1', label: 'Day 1 — 7 Oct' },
  { id: 'day2', label: 'Day 2 — 8 Oct' },
];

export default function VerifyEntry() {
  const [day, setDay] = useState(DAYS[0].id);
  const [code, setCode] = useState('');
  const [users, setUsers] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [scanning, setScanning] = useState(true);
  const inputRef = useRef(null);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        if (!c) { setUsers(list); setLoaded(true); }
      } catch (e) { console.error(e); if (!c) setLoaded(true); }
    })();
    return () => { c = true; };
  }, []);

  const lookup = async (overrideCode) => {
    const normalized = normalizeCode(overrideCode || code);
    if (!normalized) return;
    setBusy(true);
    setResult(null);

    let found = users.find(u => normalizeCode(u.code) === normalized);
    // Fallback: data may not be loaded yet (camera fires fast). Re-fetch.
    if (!found) {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setUsers(list);
        found = list.find(u => normalizeCode(u.code) === normalized);
      } catch (e) { console.error(e); }
    }
    if (!found) {
      setResult({ type: 'error', message: `No person found with code "${normalized}".` });
      setBusy(false);
      return;
    }

    // Entry is allowed multiple times — people can come and go freely.
    try {
      const entry = { timestamp: new Date().toISOString(), day, type: 'entry' };
      await updateDoc(doc(db, 'users', found.id), { entries: arrayUnion(entry) });
      const updated = { ...found, entries: [...(found.entries || []), entry] };
      setUsers(prev => prev.map(u => u.id === found.id ? updated : u));
      setResult({ type: 'success', user: updated, message: `${found.name} — entry verified.` });
    } catch (e) {
      console.error(e);
      setResult({ type: 'error', message: 'Could not log entry. Please try again.' });
    }
    setBusy(false);
    setCode('');
    inputRef.current?.focus();
  };

  const handleSubmit = (e) => { e.preventDefault(); lookup(); };
  const dayLabel = DAYS.find(d => d.id === day)?.label || day;
  const enteredToday = users.filter(u => (u.entries || []).some(e => e.day === day)).length;

  return (
    <div className="verify-page">
      <header className="page-header">
        <div>
          <span className="dashboard-eyebrow">Conference day</span>
          <h1>Verify Entry</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>
            Select the day, then scan or type the badge code. People may enter multiple times.
          </p>
        </div>
      </header>

      <div className="verify-card card-elevated">
        <div className="meal-select" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {DAYS.map(d => (
            <button key={d.id} type="button" className={`meal-btn ${day === d.id ? 'active' : ''}`} onClick={() => { setDay(d.id); setResult(null); }}>
              {d.label}
            </button>
          ))}
        </div>
        <div className="verify-mode-toggle" style={{ marginTop: '1rem' }}>
          <button type="button" className={`meal-btn ${scanning ? 'active' : ''}`} onClick={() => setScanning(true)}>Scan QR</button>
          <button type="button" className={`meal-btn ${!scanning ? 'active' : ''}`} onClick={() => setScanning(false)}>Type Code</button>
        </div>
        {scanning ? (
          <QRScanner active={scanning} onScan={(val) => { setScanning(false); setCode(val); lookup(val); }} />
        ) : (
          <form onSubmit={handleSubmit} className="verify-form" style={{ marginTop: '0.75rem' }}>
            <input
              ref={inputRef}
              type="text"
              className="verify-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Badge code"
              maxLength={3}
              autoFocus
              autoComplete="off"
              disabled={busy}
            />
            <button type="submit" className="btn btn-primary btn-lg" disabled={busy || !code.trim()}>
              {busy ? 'Checking…' : 'Verify'}
            </button>
          </form>
        )}
        {!loaded && <div style={{ textAlign: 'center', padding: '1rem' }}><div className="loader" /></div>}
      </div>

      <VerifyResult
        result={result}
        action={`Entry · ${dayLabel}`}
        onClose={() => setResult(null)}
        onNext={() => { setResult(null); setCode(''); setScanning(true); }}
      />

      <div className="verify-stats">
        <div className="verify-stat">
          <div className="verify-stat-num">{enteredToday}</div>
          <div className="verify-stat-label">{dayLabel} entered</div>
        </div>
        <div className="verify-stat">
          <div className="verify-stat-num">{users.filter(u => u.role === 'attendee').length}</div>
          <div className="verify-stat-label">Total attendees</div>
        </div>
      </div>
    </div>
  );
}
