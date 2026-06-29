import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

let scannerCounter = 0;

export default function QRScanner({ onScan, active }) {
  const idRef = useRef('qr-reader-' + (++scannerCounter));
  const scannerRef = useRef(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!active) {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
      return;
    }

    let cancelled = false;
    setStarting(true);
    setError('');

    const startScanner = async () => {
      await new Promise(r => setTimeout(r, 300));
      if (cancelled) return;

      const el = document.getElementById(idRef.current);
      if (!el) { setError('Scanner container not found.'); setStarting(false); return; }

      const scanner = new Html5Qrcode(idRef.current);
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1 },
          (decodedText) => {
            onScan(decodedText.trim().toUpperCase());
          },
          () => {}
        );
      } catch (err) {
        console.error('QR Scanner error:', err);
        if (!cancelled) {
          try {
            await scanner.start(
              { facingMode: 'user' },
              { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1 },
              (decodedText) => { onScan(decodedText.trim().toUpperCase()); },
              () => {}
            );
          } catch (err2) {
            console.error('QR Scanner fallback error:', err2);
            setError('Could not access camera. Please allow camera permission or use "Type Code" instead.');
          }
        }
      }
      if (!cancelled) setStarting(false);
    };

    startScanner();

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
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
          minHeight: 320,
          margin: '0 auto',
          borderRadius: 12,
          overflow: 'hidden',
          background: '#111',
        }}
      />
      {starting && <p style={{ textAlign: 'center', color: 'var(--ink-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Starting camera…</p>}
      {error && <p style={{ color: 'var(--crimson)', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem' }}>{error}</p>}
    </div>
  );
}
