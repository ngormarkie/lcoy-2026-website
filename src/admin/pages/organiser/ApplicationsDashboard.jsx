import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { REGIONS } from '../../utils/locations';

// Categorical hues from the validated reference palette (dataviz skill):
// fixed order, never cycled, colorblind-safe as a sequence. Each row is also
// directly text-labeled with its count and share, so identity never depends
// on color alone.
const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#4a3aa7', '#e34948'];
// Reuses the same hue family as Applications.jsx's status pills, as a solid
// fill instead of a pastel background, so the two pages read consistently.
const STATUS_COLOR = { pending: '#d97706', shortlisted: '#2563eb', accepted: '#059669', rejected: '#dc2626' };
const STATUS_LABEL = { pending: 'Pending', shortlisted: 'Shortlisted', accepted: 'Accepted', rejected: 'Rejected' };

function BarRow({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.55rem' }}>
      <div style={{ width: 170, fontSize: '0.85rem', color: 'var(--ink-soft)', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{label}</div>
      <div style={{ flex: 1, background: 'var(--paper-dark)', borderRadius: 6, height: 10, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 6, transition: 'width .3s' }} />
      </div>
      <div style={{ width: 90, textAlign: 'right', fontSize: '0.82rem', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
        {count} <span className="text-muted">({pct}%)</span>
      </div>
    </div>
  );
}

export default function ApplicationsDashboard() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'applications'));
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        if (!cancelled) setApplications(list);
      } catch (e) { console.error(e); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    const byStatus = { pending: 0, shortlisted: 0, accepted: 0, rejected: 0 };
    const byRegion = {};
    const byGender = {};
    const byDistrict = {};
    REGIONS.forEach(r => { byRegion[r] = { total: 0, pending: 0, shortlisted: 0, accepted: 0, rejected: 0 }; });
    applications.forEach(a => {
      if (byStatus[a.status] != null) byStatus[a.status]++;
      const region = a.region && byRegion[a.region] ? a.region : (a.region || 'Not specified');
      if (!byRegion[region]) byRegion[region] = { total: 0, pending: 0, shortlisted: 0, accepted: 0, rejected: 0 };
      byRegion[region].total++;
      if (byRegion[region][a.status] != null) byRegion[region][a.status]++;
      const gender = a.gender || 'Not specified';
      byGender[gender] = (byGender[gender] || 0) + 1;
      const district = a.district || 'Not specified';
      byDistrict[district] = (byDistrict[district] || 0) + 1;
    });
    return { total: applications.length, byStatus, byRegion, byGender, byDistrict };
  }, [applications]);

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem' }}><div className="loader" /></div>;

  const regionRows = Object.entries(stats.byRegion).sort((a, b) => b[1].total - a[1].total);
  const genderRows = Object.entries(stats.byGender).sort((a, b) => b[1] - a[1]);
  const districtRows = Object.entries(stats.byDistrict).sort((a, b) => b[1] - a[1]);
  const maxRegion = Math.max(1, ...regionRows.map(([, v]) => v.total));
  const maxGender = Math.max(1, ...genderRows.map(([, v]) => v));
  const maxDistrict = Math.max(1, ...districtRows.map(([, v]) => v));

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <header className="page-header">
        <div>
          <span className="dashboard-eyebrow">Snapshot</span>
          <h1>Applications Dashboard</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}><Link to="/admin/applications">← Back to Applications</Link></p>
        </div>
      </header>

      <section className="stat-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card stat-card-green"><div className="stat-card-label">Total applications</div><div className="stat-card-value">{stats.total}</div></div>
        {Object.keys(STATUS_LABEL).map(s => (
          <div key={s} className="stat-card"><div className="stat-card-label">{STATUS_LABEL[s]}</div><div className="stat-card-value" style={{ color: STATUS_COLOR[s] }}>{stats.byStatus[s]}</div></div>
        ))}
      </section>

      <div className="card-elevated" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3>By region</h3>
        <p className="text-muted text-sm" style={{ marginTop: '0.25rem', marginBottom: '1rem' }}>All 5 regions shown, including zero applicants — useful for spotting regional gaps early.</p>
        {regionRows.map(([region, v], i) => (
          <BarRow key={region} label={region} count={v.total} total={stats.total} color={CATEGORICAL[i % CATEGORICAL.length]} />
        ))}
      </div>

      <div className="card-elevated" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3>Regional balance — status breakdown</h3>
        <p className="text-muted text-sm" style={{ marginTop: '0.25rem', marginBottom: '1rem' }}>Where shortlisting/acceptance may be skewing toward or away from a region.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse', minWidth: 480 }}>
            <thead><tr style={{ textAlign: 'left', color: 'var(--ink-muted)' }}>
              <th style={{ padding: '0.3rem 0.6rem 0.3rem 0' }}>Region</th>
              <th style={{ padding: '0.3rem 0.6rem', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '0.3rem 0.6rem', textAlign: 'right', color: STATUS_COLOR.pending }}>Pending</th>
              <th style={{ padding: '0.3rem 0.6rem', textAlign: 'right', color: STATUS_COLOR.shortlisted }}>Shortlisted</th>
              <th style={{ padding: '0.3rem 0.6rem', textAlign: 'right', color: STATUS_COLOR.accepted }}>Accepted</th>
              <th style={{ padding: '0.3rem 0.6rem', textAlign: 'right', color: STATUS_COLOR.rejected }}>Rejected</th>
            </tr></thead>
            <tbody>
              {regionRows.map(([region, v]) => (
                <tr key={region} style={{ borderTop: '1px solid var(--paper-dark)' }}>
                  <td style={{ padding: '0.4rem 0.6rem 0.4rem 0' }}>{region}</td>
                  <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v.total}</td>
                  <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v.pending}</td>
                  <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v.shortlisted}</td>
                  <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v.accepted}</td>
                  <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v.rejected}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card-elevated" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3>By gender</h3>
        <div style={{ marginTop: '1rem' }}>
          {genderRows.length === 0 ? <p className="text-muted text-sm">No applications yet.</p> : genderRows.map(([gender, count], i) => (
            <BarRow key={gender} label={gender} count={count} total={stats.total} color={CATEGORICAL[i % CATEGORICAL.length]} />
          ))}
        </div>
      </div>

      <div className="card-elevated" style={{ padding: '1.5rem' }}>
        <h3>By district</h3>
        <p className="text-muted text-sm" style={{ marginTop: '0.25rem', marginBottom: '1rem' }}>Sorted by count. District is free text on imported rows, so near-duplicate names (e.g. "Freetown" vs "Western Area Urban") may not be merged here.</p>
        <div style={{ marginTop: '0.5rem' }}>
          {districtRows.length === 0 ? <p className="text-muted text-sm">No applications yet.</p> : districtRows.map(([district, count], i) => (
            <BarRow key={district} label={district} count={count} total={stats.total} color={CATEGORICAL[i % CATEGORICAL.length]} />
          ))}
        </div>
      </div>
    </div>
  );
}
