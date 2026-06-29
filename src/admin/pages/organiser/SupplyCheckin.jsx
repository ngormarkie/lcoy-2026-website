import { useState, useRef, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { normalizeCode } from '../../utils/badgeCode';
import './VerifyEntry.css';

const SUPPLIES = [
  { id: 'badge', label: 'Badge & Lanyard' },
  { id: 'bag', label: 'Conference Bag' },
  { id: 'notebook', label: 'Notebook & Pen' },
  { id: 'tshirt', label: 'T-Shirt' },
  { id: 'cap', label: 'Cap' },
  { id: 'bottle', label: 'Water Bottle' },
];

export default function SupplyCheckin() {
  const [supply, setSupply] = useState(SUPPLIES[0].id);
  const [code, setCode] = useState('');
  const [users, setUsers] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
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

  const lookup = async () => {
    const normalized = normalizeCode(code);
    if (!normalized) return;
    setBusy(true);
    setResult(null);

    const found = users.find(u => (u.code || '').toUpperCase() === normalized);
    if (!found) {
      setResult({ type: 'error', message: `No person found with code "${normalized}".` });
      setBusy(false);
      return;
    }

    const supplies = found.supplies || {};
    if (supplies[supply]) {
      setResult({ type: 'warning', user: found, message: `${found.name} has already received this item.` });
      setBusy(false);
      return;
    }

    try {
      const updatedSupplies = { ...supplies, [supply]: new Date().toISOString() };
      await updateDoc(doc(db, 'users', found.id), { supplies: updatedSupplies });
      const updated = { ...found, supplies: updatedSupplies };
      setUsers(prev => prev.map(u => u.id === found.id ? updated : u));
      setResult({ type: 'success', user: updated, message: `${found.name} — ${SUPPLIES.find(s => s.id === supply)?.label} issued.` });
    } catch (e) {
      console.error(e);
      setResult({ type: 'error', message: 'Could not log supply. Please try again.' });
    }
    setBusy(false);
    setCode('');
    inputRef.current?.focus();
  };

  const handleSubmit = (e) => { e.preventDefault(); lookup(); };
  const supplyLabel = SUPPLIES.find(s => s.id === supply)?.label || supply;
  const issued = users.filter(u => u.supplies?.[supply]).length;

  return (
    <div className="verify-page">
      <header className="page-header">
        <div>
          <span className="dashboard-eyebrow">Conference day</span>
          <h1>Supply Issue</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>Select a supply item, then scan or type the badge code. Each item is issued once per person.</p>
        </div>
      </header>

      <div className="verify-card card-elevated">
        <div className="meal-select">
          {SUPPLIES.map(s => (
            <button key={s.id} type="button" className={`meal-btn ${supply === s.id ? 'active' : ''}`} onClick={() => { setSupply(s.id); setResult(null); }}>
              {s.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="verify-form" style={{ marginTop: '1rem' }}>
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
            {busy ? 'Checking…' : 'Issue'}
          </button>
        </form>
        {!loaded && <div style={{ textAlign: 'center', padding: '1rem' }}><div className="loader" /></div>}
      </div>

      {result && (
        <div className={`verify-result verify-result-${result.type}`}>
          <div className="verify-result-icon">
            {result.type === 'success' ? '✓' : result.type === 'warning' ? '⚠' : '✕'}
          </div>
          <div className="verify-result-body">
            <div className="verify-result-msg">{result.message}</div>
            {result.user && (
              <div className="verify-result-user">
                <div className="verify-result-photo">
                  {result.user.photoURL ? <img src={result.user.photoURL} alt="" /> : <div className="verify-photo-fallback">{(result.user.name || '?')[0]}</div>}
                </div>
                <div>
                  <div className="verify-result-name">{result.user.name}</div>
                  <div className="verify-result-meta">
                    <span className={`pill cat-${result.user.category}`}>{result.user.category}</span>
                    <span className="verify-result-code">{result.user.code}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="verify-stats">
        <div className="verify-stat">
          <div className="verify-stat-num">{issued}</div>
          <div className="verify-stat-label">{supplyLabel} issued</div>
        </div>
        <div className="verify-stat">
          <div className="verify-stat-num">{users.filter(u => u.role === 'attendee').length}</div>
          <div className="verify-stat-label">Total attendees</div>
        </div>
      </div>
    </div>
  );
}
