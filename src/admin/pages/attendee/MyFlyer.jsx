import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { drawAttendingFlyer, downloadFlyer } from '../../utils/flyer';

export default function MyFlyer() {
  const { profile } = useAuth();
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    setReady(false); setError('');
    (async () => {
      try {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = 1080; canvas.height = 1350;
        await drawAttendingFlyer(canvas, ctx, profile);
        if (!cancelled) setReady(true);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError('Could not generate your flyer. Please try again.');
      }
    })();
    return () => { cancelled = true; };
  }, [profile?.id, profile?.photoURL, profile?.name, profile?.category, profile?.org]);

  const download = () => downloadFlyer(profile);

  if (!profile) return null;

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <span className="dashboard-eyebrow">Share the news</span>
        <h1 style={{ marginTop: '0.4rem' }}>I Will Be Attending</h1>
        <p className="text-muted" style={{ marginTop: '0.25rem' }}>Your personalised flyer — download it and share on social media.</p>
      </header>
      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
      <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow-lg)', marginBottom: '1.5rem', aspectRatio: '1080 / 1350', background: 'var(--paper-dark)' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
      <button className="btn btn-primary btn-lg" disabled={!ready} onClick={download}>{ready ? 'Download my flyer' : 'Generating…'}</button>
      {!profile.photoURL && <p className="text-muted text-sm" style={{ marginTop: '1rem' }}>Add a headshot photo on your badge page for a complete flyer.</p>}
    </div>
  );
}
