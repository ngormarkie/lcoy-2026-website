import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth, deriveAttendeePassword } from '../../contexts/AuthContext';
import { createUserAccount, findUserByEmail } from '../../services/userManagement';
import { generateUniqueBadgeCode, isValidEmail } from '../../utils/badgeCode';
import PhotoInput from '../../components/PhotoInput';
import { REGIONS, getDistricts, WORKING_GROUPS } from '../../utils/locations';
import './CreateUser.css';

const ATTENDEE_CATEGORIES = ['Delegate', 'Observer', 'Speaker', 'Volunteer', 'Media', 'VIP'];
const ORGANISER_CATEGORIES = ['Organiser'];
const CHECKIN_CATEGORIES = ['Check-in Staff'];

export default function CreateUser() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [accountType, setAccountType] = useState('attendee');
  const [accessLevel, setAccessLevel] = useState('full');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [org, setOrg] = useState('');
  const [bio, setBio] = useState('');
  const [region, setRegion] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [workingGroup, setWorkingGroup] = useState('');
  const [category, setCategory] = useState('Delegate');
  const [photoURL, setPhotoURL] = useState(null);
  const [orgPassword, setOrgPassword] = useState('');
  const [existingCodes, setExistingCodes] = useState(new Set());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { let c = false; (async () => { try { const snap = await getDocs(collection(db, 'users')); const codes = new Set(); snap.forEach((d) => { const cd = d.data().code; if (cd) codes.add(cd.toUpperCase()); }); if (!c) setExistingCodes(codes); } catch (e) { console.error(e); } })(); return () => { c = true; }; }, []);
  useEffect(() => {
    if (accountType === 'organiser') setCategory('Organiser');
    else if (accountType === 'checkin') setCategory('Check-in Staff');
    else setCategory('Delegate');
  }, [accountType]);

  const submit = async (e) => {
    e.preventDefault(); setError('');
    if (!name.trim()) return setError('Please enter a name.');
    if (!isValidEmail(email)) return setError('Please enter a valid email address.');
    if (!category) return setError('Please choose a category.');
    if ((accountType === 'organiser' || accountType === 'checkin') && (!orgPassword || orgPassword.length < 8)) return setError('Password must be at least 8 characters.');
    setBusy(true);
    try {
      const existing = await findUserByEmail(email);
      if (existing) { setError(`A user with that email already exists (${existing.name || existing.email}).`); setBusy(false); return; }
      const role = accountType === 'organiser' ? 'organiser' : accountType === 'checkin' ? 'checkin' : 'attendee';
      const code = generateUniqueBadgeCode(existingCodes);
      const password = (accountType === 'organiser' || accountType === 'checkin') ? orgPassword : deriveAttendeePassword(code);
      const profile = {
        name: name.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), org: org.trim(), bio: bio.trim(),
        category, photoURL: photoURL || null, role, code, entries: [], meals: {},
        region, district, city: city.trim(),
        ...(role === 'organiser' ? { accessLevel, workingGroup } : {}),
      };
      await createUserAccount({ email, password, profile });
      setExistingCodes((prev) => new Set([...prev, code]));
      setResult({ name: name.trim(), email: email.trim().toLowerCase(), code, loginPassword: accountType === 'organiser' ? orgPassword : code, type: accountType });
      setName(''); setEmail(''); setPhone(''); setOrg(''); setBio(''); setPhotoURL(null); setOrgPassword(''); setRegion(''); setDistrict(''); setCity(''); setWorkingGroup('');
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use' ? 'An account with that email already exists.' : err.code === 'auth/weak-password' ? 'Password is too weak.' : err.code === 'permission-denied' ? 'You do not have permission.' : 'Could not create account. Please try again.';
      setError(msg);
    } finally { setBusy(false); }
  };

  return (
    <div className="form-page">
      <header className="page-header">
        <div>
          <span className="dashboard-eyebrow">Add a person</span>
          <h1>Register a new account</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>{accountType === 'organiser' ? 'Organisers can manage everything.' : 'Attendees see the agenda and use their badge for entry & meals.'}</p>
        </div>
      </header>
      {result && (
        <div className="alert alert-success result-card">
          <div className="result-card-head"><strong>Account created for {result.name}</strong></div>
          <div className="result-grid">
            <div><span className="result-label">Email</span><span className="result-value font-mono">{result.email}</span></div>
            <div><span className="result-label">Badge code</span><span className="result-value badge-code-big">{result.code}</span></div>
            <div className="result-full"><span className="result-label">Login password</span><span className="result-value font-mono">{result.type === 'organiser' ? '(the password you set)' : result.code}</span></div>
          </div>
          <div className="result-actions">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { const t = result.type === 'organiser' ? `Welcome to LCOY Sierra Leone 2026!\n\nEmail: ${result.email}\nPassword: (the password we agreed)\nBadge code: ${result.code}` : `Welcome to LCOY Sierra Leone 2026!\n\nEmail: ${result.email}\nPassword: ${result.code}    (also your badge code)\n\nBring this code with you.`; navigator.clipboard?.writeText(t); }}>Copy login instructions</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setResult(null)}>Dismiss</button>
          </div>
        </div>
      )}
      {isSuperAdmin && (
        <div className="account-type-toggle">
          <button type="button" className={`type-btn ${accountType === 'attendee' ? 'active' : ''}`} onClick={() => setAccountType('attendee')} disabled={busy}><span className="type-btn-title">Attendee</span><span className="type-btn-sub">Delegate, speaker, observer, etc.</span></button>
          <button type="button" className={`type-btn ${accountType === 'checkin' ? 'active' : ''}`} onClick={() => setAccountType('checkin')} disabled={busy}><span className="type-btn-title">Check-in Staff</span><span className="type-btn-sub">Verify entry, meals & supplies only</span></button>
          <button type="button" className={`type-btn ${accountType === 'organiser' ? 'active' : ''}`} onClick={() => setAccountType('organiser')} disabled={busy}><span className="type-btn-title">Organiser</span><span className="type-btn-sub">Full administrative access</span></button>
        </div>
      )}
      <form onSubmit={submit} className="card-elevated">
        {error && <div className="alert alert-error">{error}</div>}
        <div className="form-grid">
          <div className="form-photo"><label className="field-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Photo</label><PhotoInput value={photoURL} onChange={setPhotoURL} disabled={busy} /></div>
          <div className="form-fields">
            <div className="field"><label className="field-label" htmlFor="name">Full name</label><input id="name" type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aminata Conteh" required autoComplete="off" /></div>
            <div className="field"><label className="field-label" htmlFor="email">Email</label><input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="aminata@example.org" required autoComplete="off" /></div>
            <div className="field"><label className="field-label" htmlFor="phone">Phone (WhatsApp)</label><input id="phone" type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+232 ..." autoComplete="off" /></div>
            <div className="field"><label className="field-label" htmlFor="org">Organisation</label><input id="org" type="text" className="input" value={org} onChange={(e) => setOrg(e.target.value)} placeholder="e.g. YOUNGO Sierra Leone" autoComplete="off" /></div>
            <div className="field"><label className="field-label" htmlFor="category">Category</label><select id="category" className="select" value={category} onChange={(e) => setCategory(e.target.value)} required>{(accountType === 'attendee' ? ATTENDEE_CATEGORIES : accountType === 'checkin' ? CHECKIN_CATEGORIES : ORGANISER_CATEGORIES).map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="field-row-2">
              <div className="field"><label className="field-label" htmlFor="region">Region</label>
                <select id="region" className="select" value={region} onChange={(e) => { setRegion(e.target.value); setDistrict(''); }}>
                  <option value="">Select region</option>{REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="field"><label className="field-label" htmlFor="district">District</label>
                <select id="district" className="select" value={district} onChange={(e) => setDistrict(e.target.value)} disabled={!region}>
                  <option value="">Select district</option>{getDistricts(region).map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="field"><label className="field-label" htmlFor="city">City / Town</label><input id="city" type="text" className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Makeni" autoComplete="off" /></div>
            {accountType === 'attendee' && (
              <div className="field"><label className="field-label" htmlFor="bio">Short bio (optional)</label><textarea id="bio" className="textarea" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A few sentences about this person." rows={3} /></div>
            )}
            {accountType === 'organiser' && (
              <div className="field"><label className="field-label" htmlFor="wg">Primary working group</label>
                <select id="wg" className="select" value={workingGroup} onChange={(e) => setWorkingGroup(e.target.value)}>
                  <option value="">Select working group</option>{WORKING_GROUPS.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            )}
            {accountType === 'organiser' && (
              <div className="field">
                <label className="field-label" htmlFor="access">Access level</label>
                <select id="access" className="select" value={accessLevel} onChange={(e) => setAccessLevel(e.target.value)} required>
                  <option value="full">Full Access</option>
                  <option value="attendee_mgmt">Attendee Management</option>
                  <option value="programme_mgmt">Programme & Sessions</option>
                  <option value="comms">Communications</option>
                </select>
                <span className="field-hint">
                  {accessLevel === 'full' && 'Can do everything — people, sessions, announcements, reports.'}
                  {accessLevel === 'attendee_mgmt' && 'Can add/manage people, verify entry, meals, and pull reports.'}
                  {accessLevel === 'programme_mgmt' && 'Can manage sessions, agenda, announcements, and resources.'}
                  {accessLevel === 'comms' && 'Can post announcements and manage resources only.'}
                </span>
              </div>
            )}
            {(accountType === 'organiser' || accountType === 'checkin') && <div className="field"><label className="field-label" htmlFor="org-pwd">Set password</label><input id="org-pwd" type="text" className="input" value={orgPassword} onChange={(e) => setOrgPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" required /></div>}
          </div>
        </div>
        <div className="form-footer">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/admin/users')} disabled={busy}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>{busy ? <span className="loader" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }} /> : (accountType === 'organiser' ? 'Create organiser' : accountType === 'checkin' ? 'Create check-in staff' : 'Register attendee')}</button>
        </div>
      </form>
    </div>
  );
}
