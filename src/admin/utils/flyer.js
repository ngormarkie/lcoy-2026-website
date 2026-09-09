// "I will be attending" flyer generation, shared between the delegate's own
// flyer page (MyFlyer.jsx) and the staff-side "download on their behalf"
// buttons (UserDetail.jsx / UsersList.jsx). Generated entirely client-side
// from a user's own profile fields — no image is ever uploaded or stored
// server-side. Layout is modelled on the reference "I will be attending"
// flyer supplied for the event (public/photos/Delegate flyer example.jpg).

function roundedRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Shrink font until text fits maxWidth (keeps weight/family/style).
function fitFont(ctx, text, weight, startPx, family, maxWidth, minPx = 20) {
  let px = startPx;
  ctx.font = `${weight} ${px}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && px > minPx) {
    px -= 2;
    ctx.font = `${weight} ${px}px ${family}`;
  }
  return px;
}

// Wrap text to lines that fit maxWidth (drops any words past maxLines).
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
  return lines;
}

// Faint abstract skyline silhouette used as a decorative divider under the
// header, echoing the reference flyer's city-skyline motif.
function drawSkyline(ctx, x, y, w, h, color) {
  const heights = [0.35, 0.55, 0.4, 0.75, 0.5, 0.32, 0.68, 0.45, 0.58, 0.3, 0.62, 0.4, 0.5, 0.72, 0.36, 0.6, 0.42, 0.55, 0.34, 0.65, 0.44, 0.3];
  const bw = w / heights.length;
  ctx.fillStyle = color;
  heights.forEach((f, i) => {
    const bh = h * f;
    ctx.fillRect(x + i * bw, y + (h - bh), bw - 3, bh);
  });
}

function drawPin(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.7, cy + size * 0.55);
  ctx.lineTo(cx + size * 0.7, cy + size * 0.55);
  ctx.lineTo(cx, cy + size * 1.7);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0B2233';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export async function drawAttendingFlyer(canvas, ctx, profile) {
  const W = canvas.width, H = canvas.height;
  const GOLD = '#FE9A02';
  const FAMILY = 'Outfit, sans-serif';

  // Flat, dark background (a very slight vertical gradient for depth,
  // rather than the bright two-tone gradient used previously).
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0E2E3B'); bg.addColorStop(1, '#0A222C');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  const leftPad = 64;
  const rightPad = 64;

  // ---- Header: logo mark + event name + tagline ----
  const logo = new Image();
  await new Promise((res, rej) => { logo.onload = res; logo.onerror = rej; logo.src = '/photos/LCOY-2026-Logo.png'; });
  const logoSize = 76, logoY = 54;
  ctx.save();
  roundedRectPath(ctx, leftPad, logoY, logoSize, logoSize, 14);
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip();
  ctx.drawImage(logo, leftPad, logoY, logoSize, logoSize);
  ctx.restore();

  const headerTextX = leftPad + logoSize + 20;
  const headerMaxWidth = W - rightPad - headerTextX;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  fitFont(ctx, 'LCOY SIERRA LEONE 2026', 800, 27, FAMILY, headerMaxWidth, 18);
  ctx.fillText('LCOY SIERRA LEONE 2026', headerTextX, logoY + 30);
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  fitFont(ctx, 'Inclusive Climate Action: Leaving No Youth Behind', 500, 16, FAMILY, headerMaxWidth, 12);
  ctx.fillText('Inclusive Climate Action: Leaving No Youth Behind', headerTextX, logoY + 54);

  // Decorative skyline strip
  drawSkyline(ctx, leftPad, logoY + logoSize + 34, W - leftPad - rightPad, 46, 'rgba(255,255,255,.10)');

  // ---- Column widths: text stays clear of the photo card on the right ----
  const photoW = 420, photoH = 640;
  const photoX = W - rightPad - photoW;
  const textMaxWidth = photoX - leftPad - 40;

  // ---- Big declaration ----
  let y = 400;
  ctx.fillStyle = GOLD;
  ctx.font = "800 72px Outfit, sans-serif";
  ctx.fillText('I WILL BE', leftPad, y); y += 78;
  ctx.fillText('AT THE', leftPad, y); y += 92;
  ctx.fillStyle = '#fff';
  const eventPx = fitFont(ctx, 'LCOY-SL 2026', 500, 52, FAMILY, textMaxWidth, 32);
  ctx.font = `500 ${eventPx}px ${FAMILY}`;
  ctx.fillText('LCOY-SL 2026', leftPad, y); y += 78;

  // ---- Name + role ----
  ctx.fillStyle = '#fff';
  const namePx = fitFont(ctx, profile.name || '', 800, 38, FAMILY, textMaxWidth, 24);
  ctx.font = `800 ${namePx}px ${FAMILY}`;
  ctx.fillText(profile.name || '', leftPad, y); y += namePx + 10;
  const roleLine = [profile.category, profile.org].filter(Boolean).join(' · ');
  if (roleLine) {
    ctx.fillStyle = GOLD;
    ctx.font = `700 23px ${FAMILY}`;
    const roleLines = wrapLines(ctx, roleLine, textMaxWidth, 2);
    for (const ln of roleLines) { ctx.fillText(ln, leftPad, y); y += 30; }
  }

  // ---- Divider ----
  y += 20;
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(leftPad, y); ctx.lineTo(leftPad + Math.min(420, textMaxWidth), y); ctx.stroke();
  y += 44;

  // ---- Dates & location (plain lines, pin icon for the venue) ----
  ctx.fillStyle = '#fff';
  ctx.font = "700 27px Outfit, sans-serif";
  ctx.fillText('7 – 9 October 2026', leftPad, y);
  y += 46;
  drawPin(ctx, leftPad + 9, y - 9, 9, GOLD);
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.font = "600 26px Outfit, sans-serif";
  ctx.fillText('Freetown, Sierra Leone', leftPad + 26, y);

  // ---- Hashtag, bottom-left ----
  ctx.fillStyle = GOLD;
  const tagPx = fitFont(ctx, '#LCOYSierraLeone2026', 800, 30, FAMILY, textMaxWidth, 18);
  ctx.font = `800 ${tagPx}px ${FAMILY}`;
  ctx.fillText('#LCOYSierraLeone2026', leftPad, H - 56);

  // ---- Photo: contained rounded-rectangle card, not full-bleed ----
  const photoY = H - 64 - photoH;
  const radius = 26;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.35)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  roundedRectPath(ctx, photoX, photoY, photoW, photoH, radius);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundedRectPath(ctx, photoX, photoY, photoW, photoH, radius);
  ctx.clip();
  if (profile.photoURL) {
    const ph = new Image();
    await new Promise((res, rej) => { ph.onload = res; ph.onerror = rej; ph.src = profile.photoURL; });
    const sc = Math.max(photoW / ph.width, photoH / ph.height);
    const dw = ph.width * sc, dh = ph.height * sc;
    ctx.drawImage(ph, photoX + (photoW - dw) / 2, photoY + (photoH - dh) / 2, dw, dh);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fillRect(photoX, photoY, photoW, photoH);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.font = "800 120px Outfit, sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText((profile.name || '?').slice(0, 1).toUpperCase(), photoX + photoW / 2, photoY + photoH / 2 + 40);
    ctx.textAlign = 'left';
  }
  ctx.restore();

  ctx.save();
  roundedRectPath(ctx, photoX, photoY, photoW, photoH, radius);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(255,255,255,.25)';
  ctx.stroke();
  ctx.restore();
}

export async function generateFlyer(profile) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  try {
    await Promise.all([
      document.fonts.load('800 72px Outfit'),
      document.fonts.load('800 38px Outfit'),
      document.fonts.load('700 27px Outfit'),
      document.fonts.load('600 26px Outfit'),
      document.fonts.load('500 52px Outfit'),
    ]);
  } catch {}
  await drawAttendingFlyer(canvas, ctx, profile);
  return canvas;
}

export async function downloadFlyer(profile) {
  const canvas = await generateFlyer(profile);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Could not render flyer'));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `${(profile.name || 'delegate').replace(/\s+/g, '_')}_LCOY2026_Flyer.png`;
      a.href = url; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      resolve();
    }, 'image/png');
  });
}
