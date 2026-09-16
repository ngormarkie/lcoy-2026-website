import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

const EXHIBITOR_CAP = 15;

const STATUSES = ['new', 'shortlisted', 'confirmed', 'waitlist', 'declined'];
const STATUS_COLORS = {
  new: { bg: '#fef3c7', fg: '#92400e' },
  shortlisted: { bg: '#dbeafe', fg: '#1e40af' },
  confirmed: { bg: '#d1fae5', fg: '#065f46' },
  waitlist: { bg: '#ede9fe', fg: '#5b21b6' },
  declined: { bg: '#fee2e2', fg: '#991b1b' },
};

function fmt(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Detail({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--paper-dark)' }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--blue, var(--green-deep))', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontSize: '0.94rem', color: 'var(--ink)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{value}</div>
    </div>
  );
}

export default function Exhibitors() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'exhibitorApplications'));
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        // Sorted client side, like the rest of the admin area — no composite index.
        list.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
        if (!cancelled) setApps(list);
      } catch (e) { console.error(e); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => {
    const c = { all: apps.length };
    STATUSES.forEach(s => { c[s] = apps.filter(a => (a.status || 'new') === s).length; });
    return c;
  }, [apps]);

  const sectors = useMemo(() => {
    const s = new Set();
    apps.forEach(a => a.sector && s.add(a.sector));
    return Array.from(s).sort();
  }, [apps]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apps.filter(a => {
      if (statusFilter !== 'all' && (a.status || 'new') !== statusFilter) return false;
      if (sectorFilter !== 'all' && a.sector !== sectorFilter) return false;
      if (!q) return true;
      return (a.businessName || '').toLowerCase().includes(q)
        || (a.repName || '').toLowerCase().includes(q)
        || (a.repEmail || '').toLowerCase().includes(q)
        || (a.districts || []).join(' ').toLowerCase().includes(q);
    });
  }, [apps, statusFilter, sectorFilter, search]);

  const setStatus = async (app, status) => {
    setBusyId(app.id);
    try {
      await updateDoc(doc(db, 'exhibitorApplications', app.id), { status, statusUpdatedAt: serverTimestamp() });
      setApps(prev => prev.map(a => a.id === app.id ? { ...a, status } : a));
    } catch (e) { console.error(e); alert('Could not update this application.'); }
    setBusyId('');
  };

  const remove = async (app) => {
    if (!confirm(`Delete ${app.businessName}'s exhibitor application? This cannot be undone.`)) return;
    setBusyId(app.id);
    try {
      await deleteDoc(doc(db, 'exhibitorApplications', app.id));
      setApps(prev => prev.filter(a => a.id !== app.id));
    } catch (e) { console.error(e); alert('Could not delete this application.'); }
    setBusyId('');
  };

  const exportCsv = () => {
    const headers = ['Business', 'Sector', 'Sector (other)', 'Year started', 'Registration status', 'Districts',
      'Representative', 'Position', 'WhatsApp', 'Email', 'Alt phone', 'What they exhibit', 'Climate relevance',
      'On site activity', 'Recognition', 'Needs power', 'Power equipment', 'Stand setup', 'Staff count',
      'Can attend setup', 'Online links', 'Signed by', 'Status', 'Submitted'];
    const rows = filtered.map(a => [a.businessName, a.sector, a.sectorOther, a.yearStarted, a.registrationStatus,
      (a.districts || []).join('; '), a.repName, a.repPosition, a.repWhatsapp, a.repEmail, a.repAltPhone,
      a.exhibitDescription, a.climateRelevance, a.onSiteActivity, a.recognition, a.needsPower, a.powerEquipment,
      a.standSetup, a.staffCount, a.canAttendSetup, a.onlineLinks, a.signatureName, a.status || 'new', fmt(a.submittedAt)]);
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
    // The BOM keeps Excel from mangling accented characters on open.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `lcoy2026_exhibitors_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const confirmed = counts.confirmed || 0;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <header className="page-header">
        <div>
          <span className="dashboard-eyebrow">Exhibition</span>
          <h1>Exhibitors</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>
            Applications from the public <strong>/exhibit</strong> form. Shortlist, then confirm the ones taking a stand.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" disabled={filtered.length === 0} onClick={exportCsv} style={{ flexShrink: 0 }}>
          ⤓ Export CSV ({filtered.length})
        </button>
      </header>

      <div className="card-elevated" style={{ padding: '1.1rem 1.4rem', marginBottom: '1.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div className="text-muted text-sm">Confirmed exhibitors</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800, color: confirmed > EXHIBITOR_CAP ? 'var(--crimson)' : 'var(--green-deep)' }}>
            {confirmed} <span style={{ fontSize: '1rem', color: 'var(--ink-muted)', fontWeight: 600 }}>of {EXHIBITOR_CAP}</span>
          </div>
        </div>
        <div>
          <div className="text-muted text-sm">Applications</div>
          <div style={{ fontSize: '1.7rem', fontWeight: 800 }}>{apps.length}</div>
        </div>
        {confirmed > EXHIBITOR_CAP && (
          <div className="alert alert-error" style={{ margin: 0, flex: '1 1 240px' }}>
            More confirmed than the {EXHIBITOR_CAP} available spaces.
          </div>
        )}
      </div>

      <div className="users-controls" style={{ marginBottom: '0.75rem' }}>
        <input type="search" className="input" placeholder="Search business, representative, email, district…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: '2 1 220px' }} />
        <select className="select" value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} style={{ flex: '1 1 160px' }}>
          <option value="all">All sectors</option>{sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {['all', ...STATUSES].map(s => (
          <button key={s} className={`meal-btn ${statusFilter === s ? 'active' : ''}`} style={{ padding: '0.5rem 1rem', textTransform: 'capitalize' }} onClick={() => setStatusFilter(s)}>
            {s} <span style={{ opacity: 0.6 }}>({counts[s] ?? 0})</span>
          </button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '3rem' }}><div className="loader" /></div> : filtered.length === 0 ? (
        <div className="card-elevated" style={{ textAlign: 'center', padding: '3rem' }}>
          <p className="text-muted">{apps.length === 0 ? 'No exhibitor applications yet.' : 'No applications match this view.'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          {filtered.map(a => {
            const status = a.status || 'new';
            const c = STATUS_COLORS[status] || STATUS_COLORS.new;
            return (
              <div key={a.id} className="card-elevated" style={{ padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 260px', cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700 }}>{a.businessName}</span>
                      <span className="pill" style={{ background: c.bg, color: c.fg, textTransform: 'capitalize' }}>{status}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: '0.2rem' }}>
                      {a.sector === 'Other' ? `Other — ${a.sectorOther}` : a.sector} · {a.repName} · {a.repWhatsapp}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginTop: '0.1rem' }}>
                      {(a.districts || []).join(', ')} · {a.staffCount} staff · Power: {a.needsPower || '—'} · Submitted {fmt(a.submittedAt)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <select className="select" value={status} disabled={busyId === a.id} onChange={e => setStatus(a, e.target.value)} style={{ maxWidth: 150, textTransform: 'capitalize' }}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button className="btn btn-ghost btn-sm" onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}>{expandedId === a.id ? 'Hide' : 'View'}</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--crimson)' }} disabled={busyId === a.id} onClick={() => remove(a)}>Delete</button>
                  </div>
                </div>

                {expandedId === a.id && (
                  <div style={{ marginTop: '1rem', borderTop: '1px solid var(--paper-dark)', paddingTop: '0.25rem' }}>
                    <Detail label="Registration status" value={a.registrationStatus} />
                    <Detail label="Year started" value={a.yearStarted} />
                    <Detail label="Districts" value={(a.districts || []).join(', ')} />
                    <Detail label="Representative" value={`${a.repName} — ${a.repPosition}`} />
                    <Detail label="Email" value={a.repEmail} />
                    <Detail label="WhatsApp" value={a.repWhatsapp} />
                    <Detail label="Alternative phone" value={a.repAltPhone} />
                    <Detail label="What they will exhibit" value={a.exhibitDescription} />
                    <Detail label="Climate relevance" value={a.climateRelevance} />
                    <Detail label="On site activity" value={a.onSiteActivity} />
                    <Detail label="Certifications / awards / partnerships" value={a.recognition} />
                    <Detail label="Needs mains power" value={a.needsPower === 'Yes' ? `Yes — ${a.powerEquipment}` : a.needsPower} />
                    <Detail label="Stand setup" value={a.standSetup} />
                    <Detail label="Staff per day" value={a.staffCount} />
                    <Detail label="Can attend set up (6 Oct)" value={a.canAttendSetup} />
                    <Detail label="Online links" value={a.onlineLinks} />
                    <Detail label="Signed by" value={a.signatureName} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
