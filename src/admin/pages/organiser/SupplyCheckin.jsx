import { useState, useRef, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { normalizeCode } from '../../utils/badgeCode';
import QRScanner from '../../components/QRScanner';
import './VerifyEntry.css';

export default function SupplyCheckin() {
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

    const found = users.find(u => (u.code || '').toUpperCase() === normalized);
    if (!found) {
      setResult({ type: 'error', message: `No person found with code "${normalized}".` });
      setBusy(false);
      return;
    }

    if (found.suppliesIssued) {
      setResult({ type: 'warning', user: found, message: `${found.name} has already received their supplies.` });
      setBusy(false);
      return;
    }

    try {
      await updateDoc(doc(db, 'users', found.id), { suppliesIssued: new Date().toISOString() });
      const updated = { ...found, suppliesIssued: new Date().toISOString() };
      setUsers(prev => prev.map(u => u.id === found.id ? updated : u));
      setResult({ type: 'success', user: updated, message: `${found.name} — supplies issued.` });
    } catch (e) {
      console.error(e);
      setResult({ type: 'error', message: 'Could not log. Please try again.' });
    }
    setBusy(false);
    setCode('');
    inputRef.current?.focus();
  };

  const handleSubmit = (e) => { e.preventDefault(); lookup(); };
  const issued = users.filter(u => u.suppliesIssued).length;

  return (
    <div className="verify-page">
      <header className="page-header">
        <div>
          <span className="dashboard-eyebrow">Conference day</span>
          <h1>Supply Issue</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>Scan or type the badge code to issue supplies. One-time per person.</p>
        </div>
      </header>

      <div className="verify-card card-elevated">
        <div className="verify-mode-toggle">
          <button type="button" className={`meal-btn ${scanning ? 'active' : ''}`} onClick={() => setScanning(true)}>Scan QR</button>
          <button type="button" className={`meal-btn ${!scanning ? 'active' : ''}`} onClick={() => setScanning(false)}>Type Code</button>
        </div>
        {scanning ? (
          <QRScanner active={scanning} onScan={(val) => { setScanning(false); setCode(val); lookup(val); }} />
        ) : (
          <form onSubmit={handleSubmit} className="verify-form" style={{ marginTop: '0.75rem' }}>
            <input ref={inputRef} type="text" className="verify-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Badge code" maxLength={3} autoFocus autoComplete="off" disabled={busy} />
            <button type="submit" className="btn btn-primary btn-lg" disabled={busy || !code.trim()}>{busy ? 'Checking…' : 'Issue'}</button>
          </form>
        )}
        {!loaded && <div style={{ textAlign: 'center', padding: '1rem' }}><div className="loader" /></div>}
      </div>

      {result && (
        <div className={`verify-result verify-result-${result.type}`}>
          <div className="verify-result-banner">
            <span className="verify-result-icon">{result.type === 'success' ? '✓' : result.type === 'warning' ? '⚠' : '✕'}</span>
            <span>{result.message}</span>
          </div>
          {result.user && (
            <>
              <div className="verify-result-photo-large">
                {result.user.photoURL ? <img src={result.user.photoURL} alt={result.user.name} /> : <div className="verify-photo-fallback-large">{(result.user.name || '?')[0]}</div>}
              </div>
              <div className="verify-result-details">
                <div className="verify-result-name">{result.user.name}</div>
                {result.user.org && <div className="verify-result-org">{result.user.org}</div>}
                <div className="verify-result-meta">
                  <span className={`pill cat-${result.user.category}`}>{result.user.category}</span>
                  <span className="verify-result-code">{result.user.code}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="verify-stats">
        <div className="verify-stat">
          <div className="verify-stat-num">{issued}</div>
          <div className="verify-stat-label">Supplies issued</div>
        </div>
        <div className="verify-stat">
          <div className="verify-stat-num">{users.filter(u => u.role === 'attendee').length}</div>
          <div className="verify-stat-label">Total attendees</div>
        </div>
      </div>
    </div>
  );
}
