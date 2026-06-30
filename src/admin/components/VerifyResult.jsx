import './VerifyResult.css';

export default function VerifyResult({ result, action, onClose, onNext }) {
  if (!result) return null;
  const { type, message, user } = result;
  const statusLabel = type === 'success' ? 'VERIFIED' : type === 'warning' ? 'ALREADY DONE' : 'NOT ALLOWED';

  return (
    <div className="vresult-overlay" onClick={onClose}>
      <div className={`vresult-modal vresult-${type}`} onClick={(e) => e.stopPropagation()}>
        <div className="vresult-statusbar">
          <span className="vresult-status-icon">{type === 'success' ? '✓' : type === 'warning' ? '⚠' : '✕'}</span>
          <span>{message}</span>
        </div>

        {user ? (
          <div className="vresult-body">
            <img src="/photos/LCOY-2026-Logo.png" alt="LCOY" className="vresult-logo" />
            <div className="vresult-eyebrow">{action}</div>
            <div className="vresult-heading">{statusLabel}</div>
            <div className="vresult-photo">
              {user.photoURL
                ? <img src={user.photoURL} alt={user.name} />
                : <div className="vresult-photo-fallback">{(user.name || '?')[0]}</div>}
            </div>
            <h2 className="vresult-name">{user.name}</h2>
            {user.org && <div className="vresult-org">{user.org}</div>}
            <div className="vresult-pills">
              <span className={`pill cat-${user.category}`}>{user.category}</span>
              <span className="vresult-code">{user.code}</span>
            </div>
            <div className="vresult-footer">RECOGNISED BY YOUNGO UNDER THE UNFCCC</div>
          </div>
        ) : (
          <div className="vresult-empty">
            <div className="vresult-empty-icon">{type === 'warning' ? '⚠' : '✕'}</div>
            <p>{message}</p>
          </div>
        )}

        <div className="vresult-actions">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={onNext}>Verify next →</button>
        </div>
      </div>
    </div>
  );
}
