import './VerifyResult.css';

export default function VerifyResult({ result, action }) {
  if (!result) return null;
  const { type, message, user } = result;

  // No person matched — simple status card, no flyer.
  if (!user) {
    return (
      <div className={`vresult-plain vresult-${type}`}>
        <span className="vresult-plain-icon">{type === 'success' ? '✓' : type === 'warning' ? '⚠' : '✕'}</span>
        <span>{message}</span>
      </div>
    );
  }

  const statusLabel = type === 'success' ? 'VERIFIED' : type === 'warning' ? 'ALREADY DONE' : 'NOT ALLOWED';

  return (
    <div className={`vresult vresult-${type}`}>
      <div className="vresult-statusbar">
        <span className="vresult-status-icon">{type === 'success' ? '✓' : type === 'warning' ? '⚠' : '✕'}</span>
        <span>{message}</span>
      </div>

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
    </div>
  );
}
