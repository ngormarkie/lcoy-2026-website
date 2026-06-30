import QRCode from 'qrcode';
import JSZip from 'jszip';

export async function generateBadge(user) {
  const W = 1200, H = 700;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Category color strip at top
  const catColors = {
    Delegate: '#0072C6', Observer: '#2563eb', Speaker: '#FE9A02',
    Organiser: '#be185d', Volunteer: '#059669', Media: '#7c3aed',
    VIP: '#ea580c', 'Check-in Staff': '#0B2233',
  };
  const catColor = catColors[user.category] || '#0072C6';
  ctx.fillStyle = catColor;
  ctx.fillRect(0, 0, W, 8);

  const leftMargin = 50;
  let y = 70;

  // Name
  ctx.fillStyle = '#000000';
  ctx.font = '900 58px Outfit, sans-serif';
  ctx.textAlign = 'left';
  const name = (user.name || '').toUpperCase();
  ctx.fillText(name, leftMargin, y);
  y += 65;

  // Category
  ctx.font = '600 38px Outfit, sans-serif';
  ctx.fillStyle = '#333333';
  ctx.fillText(user.category || 'Delegate', leftMargin, y);
  y += 50;

  // Organisation
  if (user.org) {
    ctx.font = '400 28px Outfit, sans-serif';
    ctx.fillStyle = '#555555';
    ctx.fillText(user.org, leftMargin, y);
    y += 40;
  }

  // City / Location
  const location = [user.city, user.district, user.region].filter(Boolean).join(', ');
  if (location) {
    ctx.font = '600 30px Outfit, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText(location, leftMargin, y);
  }

  // Badge code (large, bottom left)
  ctx.font = '900 120px Outfit, sans-serif';
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.fillText(user.code || '', leftMargin + 420, H - 80);

  // QR code (bottom right)
  const qrData = user.code || '';
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, qrData, { width: 200, margin: 0, color: { dark: '#000000', light: '#ffffff' } });
  ctx.drawImage(qrCanvas, W - 250, H - 250, 200, 200);

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
