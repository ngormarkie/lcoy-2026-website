export default function Placeholder({ title, note }) {
  return (
    <div className="container">
      <div className="card-elevated" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div style={{
          fontSize: '3rem',
          fontFamily: 'var(--font-display)',
          color: 'var(--green-light)',
          marginBottom: '1rem',
          opacity: 0.4,
        }}>◌</div>
        <h2 style={{ marginBottom: '0.75rem' }}>{title}</h2>
        <p className="text-muted" style={{ maxWidth: '40em', margin: '0 auto' }}>
          {note}
        </p>
      </div>
    </div>
  );
}
