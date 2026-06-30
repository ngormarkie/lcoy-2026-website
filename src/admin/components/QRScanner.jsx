import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

let scannerCounter = 0;

export default function QRScanner({ onScan, active }) {
  const idRef = useRef('qr-reader-' + (++scannerCounter));
  const scannerRef = useRef(null);
  const runningRef = useRef(false);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    setStarting(true);
    setError('');

    // Camera (getUserMedia) only works over HTTPS or on localhost.
    const secure = window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!secure || !navigator.mediaDevices?.getUserMedia) {
      setStarting(false);
      setError('Camera needs a secure (HTTPS) connection. Use "Type Code" below, or open this page over HTTPS.');
      return;
    }

    const startScanner = async () => {
      await new Promise(r => setTimeout(r, 250));
      if (cancelled) return;

      const el = document.getElementById(idRef.current);
      if (!el) { setStarting(false); return; }

      const scanner = new Html5Qrcode(idRef.current, { verbose: false });
      scannerRef.current = scanner;

      const config = { fps: 10, qrbox: { width: 230, height: 230 }, aspectRatio: 1 };
      const onDecode = (text) => {
        if (cancelled) return;
        onScan(text.trim().toUpperCase());
      };

      try {
        await scanner.start({ facingMode: 'environment' }, config, onDecode, () => {});
        runningRef.current = true;
      } catch (err) {
        console.error('QR back-camera error:', err);
        if (cancelled) return;
        try {
          await scanner.start({ facingMode: 'user' }, config, onDecode, () => {});
          runningRef.current = true;
        } catch (err2) {
          console.error('QR front-camera error:', err2);
          if (!cancelled) {
            const denied = String(err2?.message || err2).toLowerCase().includes('permission') ||
                           String(err2?.name || '').toLowerCase().includes('notallowed');
            setError(denied
              ? 'Camera permission denied. Enable it in your browser settings, or use "Type Code".'
              : 'Could not start the camera. Use "Type Code" instead.');
          }
        }
      }
      if (!cancelled) setStarting(false);
    };

    startScanner();

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner && runningRef.current) {
        runningRef.current = false;
        scanner.stop().then(() => { try { scanner.clear(); } catch {} }).catch(() => {});
      }
    };
  }, [active]);

  if (!active) return null;

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div
        id={idRef.current}
        style={{
          width: '100%',
          maxWidth: 400,
          minHeight: error ? 0 : 320,
          margin: '0 auto',
          borderRadius: 12,
          overflow: 'hidden',
          background: error ? 'transparent' : '#111',
        }}
      />
      {starting && <p style={{ textAlign: 'center', color: 'var(--ink-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Starting camera…</p>}
      {error && (
        <div className="alert alert-error" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{error}</div>
      )}
    </div>
  );
}
