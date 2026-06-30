// Character pool from spec — excludes I, O, Q to avoid confusion with 1, 0, 2
const CODE_POOL = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ';

export function generateBadgeCode() {
  let code = '';
  for (let i = 0; i < 2; i++) {
    code += CODE_POOL[Math.floor(Math.random() * CODE_POOL.length)];
  }
  return code;
}

/**
 * Generate a unique 2-char code that doesn't collide with existing codes.
 * `existingCodes` is a Set of codes already taken.
 * With a 33-char pool and 2 chars, we have 1,089 combinations — fine for ~200 delegates.
 */
export function generateUniqueBadgeCode(existingCodes) {
  let attempts = 0;
  while (attempts < 200) {
    const code = generateBadgeCode();
    if (!existingCodes.has(code)) return code;
    attempts++;
  }
  // Fallback: extend to 3 chars if 2-char space is exhausted
  let code = generateBadgeCode() + CODE_POOL[Math.floor(Math.random() * CODE_POOL.length)];
  while (existingCodes.has(code)) {
    code = generateBadgeCode() + CODE_POOL[Math.floor(Math.random() * CODE_POOL.length)];
  }
  return code;
}

export function normalizeCode(code) {
  // Strip everything except A–Z and 0–9. QR scanners often append a trailing
  // newline / carriage-return, and stray whitespace can sneak in — this makes
  // scanned and typed codes compare identically.
  return (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
}
