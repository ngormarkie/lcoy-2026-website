import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { REGIONS, getDistricts, WORKING_GROUPS } from '../../utils/locations';
import PhotoInput from '../../components/PhotoInput';
import { downloadBadge } from '../../utils/badge';
import './UserDetail.css';

const ATTENDEE_CATEGORIES = ['Delegate', 'Observer', 'Speaker', 'Volunteer', 'Media', 'VIP'];
const ALL_CATEGORIES = ['Delegate', 'Observer', 'Speaker', 'Volunteer', 'Media', 'VIP', 'Organiser', 'Check-in Staff'];

export default function UserDetail() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const { profile: me, isSuperAdmin, isOrganiser } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => { let c = false; (async () => { try { const snap = await getDoc(doc(db, 'users', uid)); if (!c) { if (snap.exists()) { const u = { id: snap.id, ...snap.data() }; setUser(u); setForm(u); } else setError('Person not found.'); setLoading(false); } } catch (e) { if (!c) { setError('Could not load this person.'); setLoading(false); } } })(); return () => { c = true; }; }, [uid]);

  const isMe = me?.id === uid;
  const canChangeRole = isSuperAdmin && !isMe;
  const canDelete = isSuperAdmin && !isMe;
  const canEdit = isOrganiser;

  const updateRole = async (newRole) => { if (!user) return; setBusy(true); setError(''); try { await updateDoc(doc(db, 'users', uid), { role: newRole, roleUpdatedAt: serverTimestamp() }); setUser({ ...user, role: newRole }); setForm({ ...form, role: newRole }); } catch (e) { setError('Could not update role.'); } finally { setBusy(false); } };

  const handleDelete = async () => { setBusy(true); setError(''); try { await deleteDoc(doc(db, 'users', uid)); navigate('/admin/users'); } catch (e) { setError('Could not delete.'); setBusy(false); } };

  const startEdit = () => { setForm({ ...user }); setEditing(true); };

  const saveEdit = async () => {
    setBusy(true); setError('');
    try {
      const updates = {
        name: form.name?.trim() || user.name,
        phone: form.phone?.trim() || '',
        org: form.org?.trim() || '',
        bio: form.bio?.trim() || '',
        category: form.category || user.category,
        region: form.region || '',
        district: form.district || '',
        city: form.city?.trim() || '',
        photoURL: form.photoURL || null,
        ...(user.role === 'organiser' ? { workingGroup: form.workingGroup || '', accessLevel: form.accessLevel || 'full' } : {}),
        updatedAt: serverTimestamp(),
      };
      await updateDoc(doc(db, 'users', uid), updates);
      setUser({ ...user, ...updates });
      setEditing(false);
    } catch (e) { console.error(e); setError('Could not save changes.'); }
    finally { setBusy(false); }
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}><div className="loader" /></div>;
  if (error && !user) return <div className="form-page"><div className="alert alert-error">{error}</div><Link to="/admin/users" className="btn btn-secondary">← Back to people</Link></div>;
  if (!user) return null;

  return (
    <div className="user-detail-page">
      <div className="user-detail-back">
        <Link to="/admin/users" className="btn btn-ghost btn-sm">← All people</Link>
        {canEdit && !editing && <button className="btn btn-secondary btn-sm" onClick={startEdit}>Edit</button>}
        {!editing && user?.code && <button className="btn btn-secondary btn-sm" onClick={() => downloadBadge(user)}>Download Badge</button>}
        {editing && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)} disabled={busy}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
          </div>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="user-detail-card">
        <div className="user-detail-photo">
          {editing ? (
            <PhotoInput value={form.photoURL} onChange={(v) => setField('photoURL', v)} disabled={busy} />
          ) : user.photoURL ? (
            <img src={user.photoURL} alt="" />
          ) : (
            <div className="user-detail-photo-fallback">{(user.name || '?').slice(0, 1).toUpperCase()}</div>
          )}
        </div>

        <div className="user-detail-info">
          <div className="user-detail-tags">
            <span className={`pill cat-${user.category || 'Delegate'}`}>{user.category}</span>
            <span className="pill" style={{ background: user.role === 'superadmin' ? 'var(--green-deepest)' : user.role === 'organiser' ? 'var(--blue, var(--green-deep))' : user.role === 'checkin' ? 'var(--amber)' : 'var(--paper-dark)', color: user.role === 'attendee' ? 'var(--ink-soft)' : '#fff' }}>
              {user.role === 'superadmin' ? 'Super-admin' : user.role === 'organiser' ? 'Organiser' : user.role === 'checkin' ? 'Check-in Staff' : 'Attendee'}
            </span>
          </div>

          {editing ? (
            <div className="edit-fields">
              <div className="field"><label className="field-label">Name</label><input className="input" value={form.name || ''} onChange={(e) => setField('name', e.target.value)} /></div>
              <div className="field"><label className="field-label">Phone</label><input className="input" value={form.phone || ''} onChange={(e) => setField('phone', e.target.value)} placeholder="+232 ..." /></div>
              <div className="field"><label className="field-label">Organisation</label><input className="input" value={form.org || ''} onChange={(e) => setField('org', e.target.value)} /></div>
              <div className="field"><label className="field-label">Category</label>
                <select className="select" value={form.category || ''} onChange={(e) => setField('category', e.target.value)}>
                  {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="field-row-2">
                <div className="field"><label className="field-label">Region</label>
                  <select className="select" value={form.region || ''} onChange={(e) => { setField('region', e.target.value); setField('district', ''); }}>
                    <option value="">Select</option>{REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="field"><label className="field-label">District</label>
                  <select className="select" value={form.district || ''} onChange={(e) => setField('district', e.target.value)} disabled={!form.region}>
                    <option value="">Select</option>{getDistricts(form.region || '').map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="field"><label className="field-label">City / Town</label><input className="input" value={form.city || ''} onChange={(e) => setField('city', e.target.value)} /></div>
              {user.role === 'organiser' && (
                <>
                  <div className="field"><label className="field-label">Working group</label>
                    <select className="select" value={form.workingGroup || ''} onChange={(e) => setField('workingGroup', e.target.value)}>
                      <option value="">Select</option>{WORKING_GROUPS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <div className="field"><label className="field-label">Access level</label>
                    <select className="select" value={form.accessLevel || 'full'} onChange={(e) => setField('accessLevel', e.target.value)}>
                      <option value="full">Full Access</option><option value="attendee_mgmt">Attendee Management</option><option value="programme_mgmt">Programme & Sessions</option><option value="comms">Communications</option>
                    </select>
                  </div>
                </>
              )}
              <div className="field"><label className="field-label">Bio</label><textarea className="textarea" value={form.bio || ''} onChange={(e) => setField('bio', e.target.value)} rows={3} /></div>
            </div>
          ) : (
            <>
              <h1 className="user-detail-name">{user.name}</h1>
              {user.org && <p className="user-detail-org">{user.org}</p>}
              <div className="user-detail-meta">
                <div className="meta-row"><span className="meta-label">Email</span><span className="meta-value font-mono">{user.email}</span></div>
                {user.phone && <div className="meta-row"><span className="meta-label">Phone</span><span className="meta-value">{user.phone}</span></div>}
                <div className="meta-row"><span className="meta-label">Badge code</span><span className="meta-value badge-code-big">{user.code}</span></div>
                {user.region && <div className="meta-row"><span className="meta-label">Location</span><span className="meta-value">{[user.city, user.district, user.region].filter(Boolean).join(', ')}</span></div>}
                {user.workingGroup && <div className="meta-row"><span className="meta-label">Working group</span><span className="meta-value">{user.workingGroup}</span></div>}
                {user.accessLevel && user.role === 'organiser' && <div className="meta-row"><span className="meta-label">Access</span><span className="meta-value">{user.accessLevel === 'full' ? 'Full Access' : user.accessLevel === 'attendee_mgmt' ? 'Attendee Management' : user.accessLevel === 'programme_mgmt' ? 'Programme & Sessions' : 'Communications'}</span></div>}
                <div className="meta-row"><span className="meta-label">Entries logged</span><span className="meta-value">{user.entries?.length || 0}</span></div>
                {user.bio && <div className="meta-row meta-row-bio"><span className="meta-label">Bio</span><span className="meta-value">{user.bio}</span></div>}
              </div>
            </>
          )}
        </div>
      </div>

      {(canChangeRole || canDelete) && (
        <div className="card-elevated user-detail-admin">
          <h3>Administration</h3>
          <p className="text-muted text-sm" style={{ marginTop: '0.25rem', marginBottom: '1.25rem' }}>Super-admin actions.</p>
          {canChangeRole && (
            <div className="admin-row">
              <div><div className="weight-semi">Role</div><div className="text-sm text-muted">Promote or demote.</div></div>
              <select className="select" value={user.role} onChange={(e) => updateRole(e.target.value)} disabled={busy} style={{ maxWidth: 220 }}>
                <option value="attendee">Attendee</option><option value="checkin">Check-in Staff</option><option value="organiser">Organiser</option><option value="superadmin">Super-admin</option>
              </select>
            </div>
          )}
          {canDelete && (
            <div className="admin-row" style={{ borderTop: '1px solid var(--paper-dark)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
              <div><div className="weight-semi" style={{ color: 'var(--crimson)' }}>Delete account</div><div className="text-sm text-muted">Cannot be undone.</div></div>
              {!confirmDelete ? <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)} disabled={busy}>Delete…</button> : (
                <div className="flex gap-2"><button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)} disabled={busy}>Cancel</button><button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={busy}>{busy ? 'Deleting…' : 'Yes, delete'}</button></div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
