import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { deriveAttendeePassword } from '../../contexts/AuthContext';
import { createUserAccount, findUserByEmail } from '../../services/userManagement';
import { generateUniqueBadgeCode } from '../../utils/badgeCode';
import { downloadBadge } from '../../utils/badge';
import { REGIONS } from '../../utils/locations';

const STATUS_TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

const STATUS_COLORS = {
  pending: { bg: '#fef3c7', fg: '#92400e' },
  shortlisted: { bg: '#dbeafe', fg: '#1e40af' },
  accepted: { bg: '#d1fae5', fg: '#065f46' },
  rejected: { bg: '#fee2e2', fg: '#991b1b' },
};

function fmt(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || { bg: '#eee', fg: '#555' };
  return <span className="pill" style={{ background: c.bg, color: c.fg, textTransform: 'capitalize' }}>{status}</span>;
}

function Detail({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ padding: '0.85rem 0', borderBottom: '1px solid var(--paper-dark)' }}>
      <div style={{ fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--blue, var(--green-deep))', marginBottom: '0.3rem' }}>{label}</div>
      <div style={{ fontSize: '0.96rem', color: 'var(--ink)', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{value}</div>
    </div>
  );
}

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [regionFilter, setRegionFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [busyId, setBusyId] = useState('');
  const [acceptResult, setAcceptResult] = useState(null);
  const [existingCodes, setExistingCodes] = useState(new Set());
  const [whatsappLink, setWhatsappLink] = useState('');
  const [notifyBusy, setNotifyBusy] = useState('');
  const [notifyMsg, setNotifyMsg] = useState('');

  const fetchAll = async () => {
    try {
      const [appsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, 'applications')),
        getDocs(collection(db, 'users')),
      ]);
      const list = [];
      appsSnap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
      setApplications(list);
      const codes = new Set();
      usersSnap.forEach(d => { const c = d.data().code; if (c) codes.add(c.toUpperCase()); });
      setExistingCodes(codes);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const counts = useMemo(() => {
    const c = { pending: 0, shortlisted: 0, accepted: 0, rejected: 0, all: applications.length };
    applications.forEach(a => { if (c[a.status] != null) c[a.status]++; });
    return c;
  }, [applications]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter(a => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (regionFilter !== 'all' && a.region !== regionFilter) return false;
      if (!q) return true;
      return (a.fullName || '').toLowerCase().includes(q) || (a.email || '').toLowerCase().includes(q) || (a.institution || '').toLowerCase().includes(q);
    });
  }, [applications, statusFilter, regionFilter, search]);

  const toNotifyAccepted = useMemo(() => applications.filter(a => a.status === 'accepted' && !a.notifiedAt && a.assignedCode), [applications]);
  const missingCodeAccepted = useMemo(() => applications.filter(a => a.status === 'accepted' && !a.notifiedAt && !a.assignedCode), [applications]);
  const toNotifyRejected = useMemo(() => applications.filter(a => a.status === 'rejected' && !a.notifiedAt), [applications]);

  const patchApp = (id, patch) => setApplications(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));

  const setStatus = async (app, status) => {
    setBusyId(app.id);
    try {
      const patch = { status };
      if (status === 'rejected') patch.rejectionStage = app.status === 'shortlisted' ? 'final' : 'screening';
      await updateDoc(doc(db, 'applications', app.id), patch);
      patchApp(app.id, patch);
    } catch (e) { console.error(e); alert('Could not update this application.'); }
    setBusyId('');
  };

  const shortlist = (app) => setStatus(app, 'shortlisted');
  const restore = (app) => setStatus(app, 'pending');
  const reject = (app) => { if (!confirm(`Reject ${app.fullName}'s application?`)) return; setStatus(app, 'rejected'); };

  // Deletes the application AND the email-lock marker, so the same address
  // can submit a fresh application afterwards (e.g. removing test entries).
  const removeApplication = async (app) => {
    if (!confirm(`Delete ${app.fullName}'s application? This cannot be undone, and frees up ${app.email} to apply again.`)) return;
    setBusyId(app.id);
    try {
      await deleteDoc(doc(db, 'applications', app.id));
      try { await deleteDoc(doc(db, 'applicationEmails', app.id)); } catch (e) { console.error(e); }
      setApplications(prev => prev.filter(a => a.id !== app.id));
    } catch (e) {
      console.error(e);
      alert('Could not delete this application.');
    }
    setBusyId('');
  };

  const accept = async (app) => {
    if (!confirm(`Accept ${app.fullName} and create their delegate account? This generates their badge code and QR automatically.`)) return;
    setBusyId(app.id);
    try {
      const existingUser = await findUserByEmail(app.email);
      if (existingUser) {
        // Defensive: an existing account (e.g. added manually before this
        // person applied) may not have a badge code yet. Never send a blank
        // password in the acceptance email — generate one now if needed.
        let code = existingUser.code || '';
        if (!code) {
          code = generateUniqueBadgeCode(existingCodes);
          await updateDoc(doc(db, 'users', existingUser.id), { code });
          setExistingCodes(prev => new Set([...prev, code]));
        }
        await updateDoc(doc(db, 'applications', app.id), { status: 'accepted', migratedUserId: existingUser.id, assignedCode: code, migratedAt: serverTimestamp() });
        patchApp(app.id, { status: 'accepted', migratedUserId: existingUser.id, assignedCode: code });
        setAcceptResult({ name: app.fullName, email: app.email, code, alreadyExisted: true });
      } else {
        const code = generateUniqueBadgeCode(existingCodes);
        const password = deriveAttendeePassword(code);
        const profile = {
          name: app.fullName, email: app.email, phone: app.phone, org: app.institution, bio: '',
          category: 'Delegate', photoURL: null, role: 'attendee', code, entries: [], meals: {},
          region: app.region, district: app.district, city: '',
          gender: app.gender || '', dob: app.dob || '', applicationId: app.id,
          mustSetPassword: true,
        };
        const uid = await createUserAccount({ email: app.email, password, profile });
        setExistingCodes(prev => new Set([...prev, code]));
        await updateDoc(doc(db, 'applications', app.id), { status: 'accepted', migratedUserId: uid, assignedCode: code, migratedAt: serverTimestamp() });
        patchApp(app.id, { status: 'accepted', migratedUserId: uid, assignedCode: code });
        setAcceptResult({ name: app.fullName, email: app.email, code, password, org: app.institution, category: 'Delegate', alreadyExisted: false });
      }
    } catch (e) {
      console.error(e);
      alert('Could not create the delegate account. ' + (e.message || ''));
    }
    setBusyId('');
  };

  const fixMissingCode = async (app) => {
    setBusyId(app.id);
    try {
      const code = generateUniqueBadgeCode(existingCodes);
      if (app.migratedUserId) await updateDoc(doc(db, 'users', app.migratedUserId), { code });
      await updateDoc(doc(db, 'applications', app.id), { assignedCode: code });
      setExistingCodes(prev => new Set([...prev, code]));
      patchApp(app.id, { assignedCode: code });
    } catch (e) { console.error(e); alert('Could not assign a badge code.'); }
    setBusyId('');
  };

  const sendDecisionEmails = async (decision) => {
    const list = decision === 'accepted' ? toNotifyAccepted : toNotifyRejected;
    if (list.length === 0) return;
    if (!confirm(`Send the ${decision === 'accepted' ? 'selection' : 'decision'} email to ${list.length} applicant(s)? This cannot be undone.`)) return;
    setNotifyBusy(decision); setNotifyMsg('');
    try {
      const idToken = await auth.currentUser.getIdToken();
      const recipients = list.map(a => ({ id: a.id, name: a.fullName, email: a.email, code: a.assignedCode || '' }));
      const res = await window.fetch('/api/send-application-decision', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idToken, decision, recipients, whatsappLink: whatsappLink.trim(), origin: window.location.origin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Send failed');
      const batch = writeBatch(db);
      list.forEach(a => batch.update(doc(db, 'applications', a.id), { notifiedAt: serverTimestamp(), notifiedDecision: decision }));
      await batch.commit();
      setApplications(prev => prev.map(a => list.some(x => x.id === a.id) ? { ...a, notifiedAt: { seconds: Date.now() / 1000 }, notifiedDecision: decision } : a));
      setNotifyMsg(`Sent to ${data.sent ?? list.length} of ${list.length} ${decision} applicant(s).`);
    } catch (e) {
      console.error(e);
      setNotifyMsg('Could not send emails. ' + (e.message === 'email_not_configured' ? 'Email service is not configured yet.' : e.message || ''));
    }
    setNotifyBusy('');
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <header className="page-header">
        <div>
          <span className="dashboard-eyebrow">Screening</span>
          <h1>Applications</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>
            First pass: shortlist toward your target pool. Second pass: accept from the shortlist — this creates the delegate's account, badge code and QR automatically. {counts.shortlisted} currently shortlisted.
          </p>
        </div>
        <Link to="/admin/applications/import" className="btn btn-secondary btn-sm">Import from Google Form</Link>
      </header>

      {acceptResult && (
        <div className="alert alert-success result-card" style={{ marginBottom: '1.5rem' }}>
          <div className="result-card-head"><strong>{acceptResult.alreadyExisted ? `${acceptResult.name} already has an account` : `Delegate account created for ${acceptResult.name}`}</strong></div>
          <div className="result-grid">
            <div><span className="result-label">Email</span><span className="result-value font-mono">{acceptResult.email}</span></div>
            <div><span className="result-label">Badge code</span><span className="result-value badge-code-big">{acceptResult.code}</span></div>
            {!acceptResult.alreadyExisted && <div className="result-full"><span className="result-label">Login password</span><span className="result-value font-mono">{acceptResult.code}</span></div>}
          </div>
          <div className="result-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => downloadBadge(acceptResult)}>Download badge (with QR)</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAcceptResult(null)}>Dismiss</button>
          </div>
        </div>
      )}

      {missingCodeAccepted.length > 0 && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <strong>{missingCodeAccepted.length} accepted applicant{missingCodeAccepted.length === 1 ? '' : 's'} missing a badge code</strong> — they won't be included in the email below until fixed.
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.6rem' }}>
            {missingCodeAccepted.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                <span>{a.fullName} ({a.email})</span>
                <button className="btn btn-secondary btn-sm" disabled={busyId === a.id} onClick={() => fixMissingCode(a)}>{busyId === a.id ? '…' : 'Assign badge code'}</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card-elevated" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <h3>Send decision emails</h3>
        <p className="text-muted text-sm" style={{ marginTop: '0.25rem', marginBottom: '1rem' }}>
          Sent once the working group has finished the final selection. Accepted applicants get their login details and a link to log in and upload their headshot photo. Add the delegate WhatsApp group link below once it exists — it isn't required to send.
        </p>
        <div className="field" style={{ maxWidth: 420 }}>
          <label className="field-label">Delegate WhatsApp group link (optional)</label>
          <input className="input" value={whatsappLink} onChange={e => setWhatsappLink(e.target.value)} placeholder="https://chat.whatsapp.com/..." />
        </div>
        {notifyMsg && <div className="alert alert-info" style={{ marginTop: '0.75rem' }}>{notifyMsg}</div>}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button className="btn btn-primary" disabled={!!notifyBusy || toNotifyAccepted.length === 0} onClick={() => sendDecisionEmails('accepted')}>
            {notifyBusy === 'accepted' ? 'Sending…' : `Email ${toNotifyAccepted.length} accepted applicant${toNotifyAccepted.length === 1 ? '' : 's'}`}
          </button>
          <button className="btn btn-secondary" disabled={!!notifyBusy || toNotifyRejected.length === 0} onClick={() => sendDecisionEmails('rejected')}>
            {notifyBusy === 'rejected' ? 'Sending…' : `Email ${toNotifyRejected.length} rejected applicant${toNotifyRejected.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>

      <div className="users-controls" style={{ marginBottom: '0.75rem' }}>
        <input type="search" className="input" placeholder="Search name, email, institution…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: '2 1 200px' }} />
        <select className="select" value={regionFilter} onChange={e => setRegionFilter(e.target.value)} style={{ flex: '1 1 160px' }}>
          <option value="all">All regions</option>{REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {STATUS_TABS.map(t => (
          <button key={t.id} className={`meal-btn ${statusFilter === t.id ? 'active' : ''}`} style={{ padding: '0.5rem 1rem' }} onClick={() => setStatusFilter(t.id)}>
            {t.label} <span style={{ opacity: 0.6 }}>({counts[t.id] ?? 0})</span>
          </button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: '3rem' }}><div className="loader" /></div> : filtered.length === 0 ? (
        <div className="card-elevated" style={{ textAlign: 'center', padding: '3rem' }}><p className="text-muted">No applications match this view.</p></div>
      ) : (
        <div style={{ display: 'grid', gap: '0.6rem' }}>
          {filtered.map(a => (
            <div key={a.id} className="card-elevated" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 260px', cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700 }}>{a.fullName}</span>
                    <StatusPill status={a.status} />
                    {a.notifiedAt && <span className="pill" style={{ background: 'var(--paper-dark)', fontSize: '0.65rem' }}>Emailed</span>}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', marginTop: '0.2rem' }}>{a.email} · {a.phone}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--ink-muted)', marginTop: '0.1rem' }}>
                    {a.institution} · {[a.district, a.region].filter(Boolean).join(', ')} · Age {a.ageAtConference ?? '—'} · Submitted {fmt(a.submittedAt)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}>{expandedId === a.id ? 'Hide' : 'View'}</button>
                  {a.status === 'pending' && <>
                    <button className="btn btn-secondary btn-sm" disabled={busyId === a.id} onClick={() => shortlist(a)}>Shortlist →</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--crimson)' }} disabled={busyId === a.id} onClick={() => reject(a)}>Reject</button>
                  </>}
                  {a.status === 'shortlisted' && <>
                    <button className="btn btn-primary btn-sm" disabled={busyId === a.id} onClick={() => accept(a)}>{busyId === a.id ? '…' : 'Accept → Create delegate'}</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--crimson)' }} disabled={busyId === a.id} onClick={() => reject(a)}>Reject</button>
                    <button className="btn btn-ghost btn-sm" disabled={busyId === a.id} onClick={() => restore(a)}>Back to pending</button>
                  </>}
                  {a.status === 'accepted' && a.migratedUserId && <Link to={`/admin/users/${a.migratedUserId}`} className="btn btn-ghost btn-sm">View delegate ↗</Link>}
                  {a.status === 'rejected' && <button className="btn btn-ghost btn-sm" disabled={busyId === a.id} onClick={() => restore(a)}>Restore to pending</button>}
                  <button className="btn btn-ghost btn-sm" style={{ color: 'var(--crimson)' }} disabled={busyId === a.id} onClick={() => removeApplication(a)} title="Delete this application permanently">Delete</button>
                </div>
              </div>

              {expandedId === a.id && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--paper-dark)', paddingTop: '0.25rem' }}>
                  <Detail label="Gender" value={a.gender} />
                  <Detail label="Date of birth" value={a.dob} />
                  <Detail label="Disability" value={a.disability === 'Yes' ? `Yes — ${a.disabilityDetails}` : a.disability} />
                  <Detail label="Dietary concerns" value={a.dietary === 'Yes' ? `Yes — ${a.dietaryDetails}` : a.dietary} />
                  <Detail label="Attended LCOY/RCOY/COY/COP before" value={a.priorAttendance === 'Yes' ? `Yes — ${a.priorAttendanceDetails}` : a.priorAttendance} />
                  <Detail label="Sectors of interest" value={[...(a.sectors || [])].map(s => s === 'Other' ? `Other — ${a.sectorsOther}` : s).join(', ')} />
                  <Detail label="Climate topics" value={[...(a.climateTopics || [])].map(s => s === 'Other' ? `Other — ${a.climateTopicsOther}` : s).join(', ')} />
                  <Detail label="Why participate?" value={a.essayWhy} />
                  <Detail label="Community challenge" value={a.essayChallenge} />
                  <Detail label="Hopes to learn" value={a.essayLearn} />
                  <Detail label="Climate leadership, in one sentence" value={a.leadershipSentence} />
                  <Detail label="How they'll apply it" value={a.applyPlan} />
                  <Detail label="Solutions already implemented" value={a.climateSolutions} />
                  <Detail label="Policy they'd influence" value={a.policyInfluence} />
                  <Detail label="Contact preference" value={a.contactPreference === 'Other' ? `Other — ${a.contactPreferenceOther}` : a.contactPreference} />
                  <Detail label="Heard about this via" value={a.source === 'Other' ? `Other — ${a.sourceOther}` : a.source} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
