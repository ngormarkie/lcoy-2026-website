import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ onScan, active }) {
  const containerId = 'qr-reader';
  const scannerRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!active) {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
      return;
    }

    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        onScan(decodedText.trim().toUpperCase());
      },
      () => {}
    ).catch((err) => {
      console.error('QR Scanner error:', err);
      setError('Could not access camera. Please allow camera permission or type the code manually.');
    });

    return () => {
      scanner.stop().catch(() => {});
      scannerRef.current = null;
    };
  }, [active]);

  if (!active) return null;

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div id={containerId} style={{ width: '100%', maxWidth: 400, margin: '0 auto', borderRadius: 12, overflow: 'hidden' }} />
      {error && <p style={{ color: 'var(--crimson)', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem' }}>{error}</p>}
    </div>
  );
}
