/**
 * LCOY Sierra Leone 2026 wordmark.
 * A clean, editorial-style mark using Fraunces serif.
 * The "leaf" mark is hand-crafted SVG — represents climate / youth / Sierra Leone.
 */
export default function Logo({ size = 'md', variant = 'dark' }) {
  const isLight = variant === 'light';
  const sizes = {
    sm: { wrap: 28, font: 14, sub: 8, gap: 6 },
    md: { wrap: 40, font: 18, sub: 10, gap: 10 },
    lg: { wrap: 56, font: 26, sub: 12, gap: 14 },
    xl: { wrap: 80, font: 38, sub: 16, gap: 18 },
  };
  const s = sizes[size] || sizes.md;
  const fg = isLight ? '#f0ebe3' : '#0f2e24';
  const accent = isLight ? '#4ea585' : '#2d7a5f';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        color: fg,
      }}
    >
      <svg
        width={s.wrap}
        height={s.wrap}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Outer ring */}
        <circle cx="32" cy="32" r="30" stroke={fg} strokeWidth="2" />
        {/* Stylized leaf with horizon line */}
        <path
          d="M32 14 C 22 22, 18 32, 18 42 C 26 44, 36 42, 42 36 C 46 30, 44 20, 32 14 Z"
          fill={accent}
        />
        <path
          d="M32 14 C 28 22, 24 30, 18 42"
          stroke={fg}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Sun arc */}
        <path
          d="M14 50 Q 32 44, 50 50"
          stroke={fg}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontWeight: 700,
            fontSize: s.font,
            letterSpacing: '-0.02em',
          }}
        >
          LCOY
        </span>
        <span
          style={{
            fontSize: s.sub,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            opacity: 0.75,
            marginTop: 2,
            fontWeight: 500,
          }}
        >
          Sierra Leone · 2026
        </span>
      </div>
    </div>
  );
}
