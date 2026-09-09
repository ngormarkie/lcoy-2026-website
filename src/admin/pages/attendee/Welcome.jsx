import { useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';
import PhotoInput from '../../components/PhotoInput';
import './Welcome.css';

export default function AttendeeWelcome() {
  const { profile } = useAuth();
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmed, setConfirmed] = useState(profile?.confirmed === true);
  const [confirming, setConfirming] = useState(false);
  const [flyerSent, setFlyerSent] = useState(profile?.flyerSent === true);
  // Delegates may set their headshot exactly once — Firestore rules enforce
  // this server-side too. Once it's set, only a staff member can change it.
  const [photoLocked, setPhotoLocked] = useState(!!profile?.photoURL);
  if (!profile) return null;
  const greet = () => { const h = new Date().getHours(); if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening'; };
  // Only delegates who came through the accept-application flow have this
  // field at all; older/manually-added attendees never see the prompt.
  const needsConfirmation = profile.confirmed === false && !confirmed;

  const savePhoto = async () => {
    setSaving(true); setSaved(false);
    const isFirstPhoto = !profile.photoURL && !!photoURL;
    try {
      await updateDoc(doc(db, 'users', profile.id), { photoURL: photoURL || null });
      setSaved(true);
      if (isFirstPhoto) setPhotoLocked(true);
      // First-ever headshot upload — send the "I will be attending" flyer
      // email right away. Best-effort: a failure here shouldn't block the
      // photo save the delegate actually asked for.
      if (isFirstPhoto && !flyerSent) {
        try {
          const idToken = await auth.currentUser.getIdToken();
          const res = await fetch('/api/send-flyer-ready', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ idToken, origin: window.location.origin }),
          });
          if (res.ok) {
            await updateDoc(doc(db, 'users', profile.id), { flyerSent: true });
            setFlyerSent(true);
          }
        } catch (e) { console.error(e); }
      }
    } catch (e) { console.error(e); alert('Could not save your photo. Please try again.'); }
    setSaving(false);
  };

  const confirmPlace = async () => {
    setConfirming(true);
    try {
      await updateDoc(doc(db, 'users', profile.id), { confirmed: true, confirmedAt: serverTimestamp() });
      setConfirmed(true);
    } catch (e) { console.error(e); alert('Could not confirm your place. Please try again.'); }
    setConfirming(false);
  };

  return (
    <div className="welcome-page">
      <header className="welcome-header">
        <span className="dashboard-eyebrow">Welcome</span>
        <h1>{greet()},<br /><em>{(profile.name || '').split(' ')[0]}</em>.</h1>
        <p className="welcome-sub">You're registered for LCOY Sierra Leone 2026. Your badge appears below — bring it with you.</p>
      </header>

      {needsConfirmation && (
        <div className="card-elevated" style={{ padding: '1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid var(--orange, var(--green-light))' }}>
          <h3 style={{ marginBottom: '0.35rem' }}>Confirm your place</h3>
          <p className="text-muted text-sm" style={{ marginBottom: '1rem' }}>Let us know you're coming so your seat is kept. Unconfirmed places go to the waiting list.</p>
          <button type="button" className="btn btn-primary" disabled={confirming} onClick={confirmPlace}>{confirming ? 'Confirming…' : "I'm attending — confirm my place"}</button>
        </div>
      )}
      {confirmed && profile.confirmed !== true && (
        <div className="alert alert-success" style={{ marginBottom: '1.5rem' }}>Your place is confirmed. See you in Freetown!</div>
      )}

      {!photoURL && (
        <div className="welcome-tip" style={{ borderLeftColor: 'var(--orange, var(--green-light))' }}>
          <h3>Add your headshot photo</h3>
          <p>This appears on your printed badge and in the attendee directory. Take a clear photo of your face, or upload one. You can only set this once, so choose carefully.</p>
        </div>
      )}
      <div className="card-elevated" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.25rem' }}>Your photo</h3>
        <p className="text-muted text-sm" style={{ marginBottom: '1rem' }}>Used on your badge and in the attendee directory.</p>
        {photoLocked ? (
          <>
            {photoURL && (
              <div style={{ width: 120, height: 120, borderRadius: 12, overflow: 'hidden', marginBottom: '1rem' }}>
                <img src={photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <p className="text-muted text-sm">Your photo is set and can't be changed here. If you need it updated, please ask an admin.</p>
          </>
        ) : (
          <>
            <PhotoInput value={photoURL} onChange={setPhotoURL} disabled={saving} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn-primary" disabled={saving || !photoURL} onClick={savePhoto}>{saving ? 'Saving…' : 'Save photo'}</button>
              {saved && <span className="text-sm" style={{ color: 'var(--green-deep)' }}>Saved ✓</span>}
            </div>
          </>
        )}
      </div>

      <div className="badge-card">
        <div className="badge-header"><span>LCOY</span><span>Sierra Leone · 2026</span></div>
        <div className="badge-body">
          <div className="badge-photo">{photoURL ? <img src={photoURL} alt="" /> : <div className="badge-photo-fallback">{(profile.name || '?').slice(0, 1).toUpperCase()}</div>}</div>
          <div className="badge-info">
            <div className="badge-name">{profile.name}</div>
            {profile.org && <div className="badge-org">{profile.org}</div>}
            <div className={`pill cat-${profile.category || 'Delegate'} badge-cat`}>{profile.category || 'Delegate'}</div>
          </div>
        </div>
        <div className="badge-code-section">
          <span className="badge-code-label">Badge code</span>
          <span className="badge-code-value">{profile.code}</span>
        </div>
      </div>
      <div className="welcome-tip">
        <h3>Bring your badge code to registration</h3>
        <p className="text-soft">When entrance staff ask, show or read out the two characters: <strong className="font-mono">{profile.code}</strong>. Please don't share it with anyone else.</p>
      </div>
      <div className="welcome-grid">
        <Link to="/admin/agenda" className="welcome-tile"><span className="welcome-tile-icon">◎</span><span className="welcome-tile-label">View agenda</span><span className="welcome-tile-sub">2-day programme</span></Link>
        <Link to="/admin/sessions" className="welcome-tile"><span className="welcome-tile-icon">◇</span><span className="welcome-tile-label">My sessions</span><span className="welcome-tile-sub">Breakouts & workshops</span></Link>
        <Link to="/admin/directory" className="welcome-tile"><span className="welcome-tile-icon">◉</span><span className="welcome-tile-label">Attendees</span><span className="welcome-tile-sub">Connect with others</span></Link>
        <Link to="/admin/announcements" className="welcome-tile"><span className="welcome-tile-icon">◐</span><span className="welcome-tile-label">Announcements</span><span className="welcome-tile-sub">Latest updates</span></Link>
        <Link to="/admin/flyer" className="welcome-tile"><span className="welcome-tile-icon">★</span><span className="welcome-tile-label">My flyer</span><span className="welcome-tile-sub">"I will be attending"</span></Link>
      </div>
    </div>
  );
}
