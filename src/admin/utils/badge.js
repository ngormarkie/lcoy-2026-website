import QRCode from 'qrcode';
import JSZip from 'jszip';

// Shrink font until text fits maxWidth (keeps weight/family).
function fitFont(ctx, text, weight, startPx, family, maxWidth, minPx = 24) {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && px > minPx) {
    px -= 2;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

// Wrap text to lines that fit maxWidth. Returns array of lines (max `maxLines`).
function wrapLines(ctx, text, maxWidth, maxLines = 2) {
  const words = (text || '').split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  // If words remain and we hit the line cap, append ellipsis to last line
  return lines;
}

export async function generateBadge(user) {
  const W = 1200, H = 700;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const FAMILY = "Outfit, sans-serif";

  // Ensure Outfit is loaded so text measures & renders correctly.
  try {
    await Promise.all([
      document.fonts.load('900 80px Outfit'),
      document.fonts.load('700 42px Outfit'),
      document.fonts.load('500 32px Outfit'),
    ]);
  } catch {}

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const catColors = {
    Delegate: '#0072C6', Observer: '#2563eb', Speaker: '#FE9A02',
    Organiser: '#be185d', Volunteer: '#059669', Media: '#7c3aed',
    VIP: '#ea580c', 'Check-in Staff': '#0B2233',
  };
  const catColor = catColors[user.category] || '#0072C6';

  // Top + bottom accent strips
  ctx.fillStyle = catColor;
  ctx.fillRect(0, 0, W, 14);
  ctx.fillRect(0, H - 14, W, 14);

  const M = 60;            // left margin
  const textWidth = W - M - 360; // leave room on the right for the QR column
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // ---- Name (auto-shrink to fit) ----
  const name = (user.name || '').toUpperCase();
  const namePx = fitFont(ctx, name, 900, 80, FAMILY, textWidth, 44);
  ctx.fillStyle = '#0B2233';
  ctx.font = `900 ${namePx}px ${FAMILY}`;
  let y = 110;
  ctx.fillText(name, M, y);

  // ---- Category ----
  y += 64;
  ctx.font = `700 42px ${FAMILY}`;
  ctx.fillStyle = catColor;
  ctx.fillText(user.category || 'Delegate', M, y);

  // ---- Organisation (wrap up to 2 lines) ----
  if (user.org) {
    y += 56;
    ctx.font = `500 32px ${FAMILY}`;
    ctx.fillStyle = '#444444';
    const lines = wrapLines(ctx, user.org, textWidth, 2);
    for (const ln of lines) { ctx.fillText(ln, M, y); y += 42; }
    y -= 42;
  }

  // ---- Location ----
  const location = [user.district, user.region].filter(Boolean).join(', ');
  if (location) {
    y += 52;
    const locPx = fitFont(ctx, location, 700, 36, FAMILY, textWidth, 22);
    ctx.font = `700 ${locPx}px ${FAMILY}`;
    ctx.fillStyle = '#0B2233';
    ctx.fillText(location, M, y);
  }

  // ---- Big badge code (bottom-left, fills lower area) ----
  const code = user.code || '';
  ctx.font = `900 200px ${FAMILY}`;
  ctx.fillStyle = '#0B2233';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(code, M, H - 70);

  // ---- QR code (bottom-right, large) ----
  const qrSize = 300;
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, code, { width: qrSize, margin: 0, color: { dark: '#0B2233', light: '#ffffff' } });
  ctx.drawImage(qrCanvas, W - M - qrSize, H - 50 - qrSize, qrSize, qrSize);

  return canvas;
}

export async function downloadBadge(user) {
  const canvas = await generateBadge(user);
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.download = `badge_${(user.name || 'user').replace(/\s+/g, '_')}_${user.code || ''}.png`;
    a.href = url;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }, 'image/png');
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

export async function downloadBadgesBatch(users, zipName = 'badges') {
  const zip = new JSZip();
  const usedNames = new Set();

  for (const user of users) {
    const canvas = await generateBadge(user);
    const blob = await canvasToBlob(canvas);
    let base = `${(user.name || 'user').replace(/\s+/g, '_')}_${user.code || ''}`;
    let name = `${base}.png`;
    let i = 2;
    while (usedNames.has(name)) { name = `${base}_${i++}.png`; }
    usedNames.add(name);
    zip.file(name, blob);
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.download = `lcoy2026_${zipName.replace(/\s+/g, '_')}_badges.zip`;
  a.href = url;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
}
