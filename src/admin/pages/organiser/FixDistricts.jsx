import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { ALL_DISTRICTS, REGIONS_DISTRICTS, normalizeDistrict, getRegionForDistrict } from '../../utils/locations';

// One-off (and repeatable) cleanup for applications whose district doesn't
// match one of the 16 canonical names — mostly free-typed entries from the
// old Google Form. Groups every non-matching value together (not one row
// per application), pre-fills a suggestion from the same alias table the
// CSV importer uses, and only writes once the organiser confirms — a wrong
// auto-guess on real applicant data would be worse than leaving it alone.
export default function FixDistricts() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapping, setMapping] = useState({}); // raw value -> chosen canonical district ('' = leave as-is)
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'applications'));
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setApplications(list);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const groups = useMemo(() => {
    const counts = {};
    applications.forEach(a => {
      const raw = (a.district || '').trim();
      if (!raw || ALL_DISTRICTS.includes(raw)) return;
      counts[raw] = (counts[raw] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [applications]);

  const valueFor = (raw) => {
    if (raw in mapping) return mapping[raw];
    const guess = normalizeDistrict(raw);
    return ALL_DISTRICTS.includes(guess) ? guess : '';
  };

  const applyFixes = async () => {
    const entries = groups
      .map(([raw]) => [raw, valueFor(raw)])
      .filter(([, canonical]) => canonical && ALL_DISTRICTS.includes(canonical));
    if (entries.length === 0) { alert('Choose a correct district for at least one value before applying.'); return; }

    const targets = [];
    entries.forEach(([raw, canonical]) => {
      applications.forEach(a => { if ((a.district || '').trim() === raw) targets.push({ id: a.id, canonical }); });
    });
    if (!confirm(`Update ${targets.length} application(s) across ${entries.length} district value(s) to their canonical district (and matching region)? This cannot be undone.`)) return;

    setBusy(true); setError(''); setResult('');
    try {
      for (let i = 0; i < targets.length; i += 200) {
        const batch = writeBatch(db);
        targets.slice(i, i + 200).forEach(({ id, canonical }) => {
          const region = getRegionForDistrict(canonical);
          batch.update(doc(db, 'applications', id), region ? { district: canonical, region } : { district: canonical });
        });
        await batch.commit();
      }
      const byId = new Map(targets.map(t => [t.id, t.canonical]));
      setApplications(prev => prev.map(a => byId.has(a.id) ? { ...a, district: byId.get(a.id), region: getRegionForDistrict(byId.get(a.id)) || a.region } : a));
      setMapping({});
      setResult(`Updated ${targets.length} application(s).`);
    } catch (e) {
      console.error(e);
      setError('Could not apply the fixes. ' + (e.message || ''));
    }
    setBusy(false);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><div className="loader" /></div>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <header className="page-header">
        <div>
          <span className="dashboard-eyebrow">Data cleanup</span>
          <h1>Fix Districts</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}><Link to="/admin/applications">← Back to Applications</Link></p>
        </div>
      </header>

      <div className="card-elevated" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <p className="text-sm">
          {groups.length === 0
            ? 'Every application already has one of the 16 canonical districts. Nothing to fix.'
            : `${groups.length} distinct district value${groups.length === 1 ? '' : 's'} don't match the canonical list. Known town/city names (Freetown, Makeni, Waterloo, etc.) are already pre-filled with their district below — check them, adjust anything else, then apply. Region is corrected to match automatically.`}
        </p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}
      {result && <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>{result}</div>}

      {groups.length > 0 && (
        <div className="card-elevated" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {groups.map(([raw, count]) => (
              <div key={raw} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 220px' }}>
                  <span style={{ fontWeight: 600 }}>"{raw}"</span> <span className="text-muted text-sm">({count} application{count === 1 ? '' : 's'})</span>
                </div>
                <select className="select" style={{ flex: '1 1 240px' }} value={valueFor(raw)} onChange={e => setMapping(m => ({ ...m, [raw]: e.target.value }))}>
                  <option value="">Leave as-is / skip</option>
                  {Object.entries(REGIONS_DISTRICTS).map(([region, ds]) => (
                    <optgroup key={region} label={region}>
                      {ds.map(d => <option key={d} value={d}>{d}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <button className="btn btn-primary" disabled={busy} onClick={applyFixes}>{busy ? 'Applying…' : 'Apply fixes'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
