import { useState, useRef, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { normalizeCode } from '../../utils/badgeCode';
import './VerifyEntry.css';

const MEALS = [
  { id: 'day1_breakfast', label: 'Day 1 — Breakfast' },
  { id: 'day1_lunch', label: 'Day 1 — Lunch' },
  { id: 'day2_breakfast', label: 'Day 2 — Breakfast' },
  { id: 'day2_lunch', label: 'Day 2 — Lunch' },
];

export default function MealCheckin() {
  const [meal, setMeal] = useState(MEALS[0].id);
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

    const meals = found.meals || {};
    if (meals[meal]) {
      setResult({ type: 'warning', user: found, message: `${found.name} has already collected this meal.` });
      setBusy(false);
      return;
    }

    try {
      const updatedMeals = { ...meals, [meal]: new Date().toISOString() };
      await updateDoc(doc(db, 'users', found.id), { meals: updatedMeals });
      const updated = { ...found, meals: updatedMeals };
      setUsers(prev => prev.map(u => u.id === found.id ? updated : u));
      setResult({ type: 'success', user: updated, message: `${found.name} — meal collected.` });
    } catch (e) {
      console.error(e);
      setResult({ type: 'error', message: 'Could not log meal. Please try again.' });
    }
    setBusy(false);
    setCode('');
    inputRef.current?.focus();
  };

  const handleSubmit = (e) => { e.preventDefault(); lookup(); };
  const mealLabel = MEALS.find(m => m.id === meal)?.label || meal;
  const collected = users.filter(u => u.meals?.[meal]).length;

  return (
    <div className="verify-page">
      <header className="page-header">
        <div>
          <span className="dashboard-eyebrow">Conference day</span>
          <h1>Meal Check-In</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>Select a meal, then scan or type the badge code. Each meal can only be collected once.</p>
        </div>
      </header>

      <div className="verify-card card-elevated">
        <div className="meal-select">
          {MEALS.map(m => (
            <button key={m.id} type="button" className={`meal-btn ${meal === m.id ? 'active' : ''}`} onClick={() => { setMeal(m.id); setResult(null); }}>
              {m.label}
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
            {busy ? 'Checking…' : 'Collect'}
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
          <div className="verify-stat-num">{collected}</div>
          <div className="verify-stat-label">{mealLabel} collected</div>
        </div>
        <div className="verify-stat">
          <div className="verify-stat-num">{users.filter(u => u.role === 'attendee').length}</div>
          <div className="verify-stat-label">Total attendees</div>
        </div>
      </div>
    </div>
  );
}
