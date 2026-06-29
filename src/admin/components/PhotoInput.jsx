import { useRef, useState } from 'react';
import { processPhotoFile } from '../utils/photo';
import './PhotoInput.css';

export default function PhotoInput({ value, onChange, disabled }) {
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const dataUrl = await processPhotoFile(file);
      onChange(dataUrl);
    } catch (e) {
      console.error(e);
      setError('Could not process image. Try another file.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
      if (cameraRef.current) cameraRef.current.value = '';
    }
  };

  return (
    <div className="photo-input">
      <div className="photo-preview">
        {value ? (
          <img src={value} alt="Preview" />
        ) : (
          <div className="photo-preview-empty">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>No photo</span>
          </div>
        )}
        {busy && (
          <div className="photo-busy">
            <div className="loader" />
          </div>
        )}
      </div>
      <div className="photo-actions">
        <button type="button" className="btn btn-secondary" onClick={() => cameraRef.current?.click()} disabled={disabled || busy}>
          Take photo
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={disabled || busy}>
          Upload file
        </button>
        {value && (
          <button type="button" className="btn btn-ghost" onClick={() => onChange(null)} disabled={disabled || busy}>
            Remove
          </button>
        )}
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={(e) => handleFile(e.target.files?.[0])} style={{ display: 'none' }} />
      <input ref={fileRef} type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0])} style={{ display: 'none' }} />
      {error && <div className="alert alert-error" style={{ marginTop: '0.75rem' }}>{error}</div>}
    </div>
  );
}
