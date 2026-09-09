// "I will be attending" flyer generation, shared between the delegate's own
// flyer page (MyFlyer.jsx) and the staff-side "download on their behalf"
// buttons (UserDetail.jsx / UsersList.jsx). Generated entirely client-side
// from a user's own profile fields — no image is ever uploaded or stored
// server-side.

export async function drawAttendingFlyer(canvas, ctx, profile) {
  const W = canvas.width, H = canvas.height;
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0B2233'); bg.addColorStop(1, '#005091');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,.04)';
  ctx.beginPath(); ctx.arc(W * 0.85, H * 0.1, 260, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W * 0.08, H * 0.94, 220, 0, Math.PI * 2); ctx.fill();

  const leftPad = 64;

  // Small logo mark + header line
  const logo = new Image();
  await new Promise((res, rej) => { logo.onload = res; logo.onerror = rej; logo.src = '/photos/LCOY-2026-Logo.png'; });
  const logoSize = 64, logoY = 56;
  ctx.save();
  const lr = 12;
  ctx.beginPath();
  ctx.moveTo(leftPad + lr, logoY);
  ctx.arcTo(leftPad + logoSize, logoY, leftPad + logoSize, logoY + logoSize, lr);
  ctx.arcTo(leftPad + logoSize, logoY + logoSize, leftPad, logoY + logoSize, lr);
  ctx.arcTo(leftPad, logoY + logoSize, leftPad, logoY, lr);
  ctx.arcTo(leftPad, logoY, leftPad + logoSize, logoY, lr);
  ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip();
  ctx.drawImage(logo, leftPad, logoY, logoSize, logoSize);
  ctx.restore();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = "800 26px Outfit, sans-serif";
  ctx.fillText('LCOY SIERRA LEONE', leftPad + logoSize + 18, logoY + 26);
  ctx.fillStyle = '#FE9A02';
  ctx.font = "700 19px Outfit, sans-serif";
  ctx.fillText('7–9 OCTOBER 2026 · FREETOWN', leftPad + logoSize + 18, logoY + 52);

  // Big declaration
  let y = 320;
  ctx.fillStyle = '#FE9A02';
  ctx.font = "900 76px Outfit, sans-serif";
  ctx.fillText('I WILL BE', leftPad, y); y += 84;
  ctx.fillText('AT THE', leftPad, y); y += 96;
  ctx.fillStyle = '#fff';
  ctx.fillText('LCOY-SL 2026', leftPad, y); y += 110;

  // Name + role
  ctx.fillStyle = '#fff';
  ctx.font = "800 42px Outfit, sans-serif";
  ctx.fillText(profile.name || '', leftPad, y); y += 42;
  const roleLine = [profile.category, profile.org].filter(Boolean).join(' · ');
  if (roleLine) {
    ctx.fillStyle = '#FE9A02';
    ctx.font = "700 25px Outfit, sans-serif";
    ctx.fillText(roleLine, leftPad, y); y += 38;
  }

  // Divider
  y += 22;
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(leftPad, y); ctx.lineTo(leftPad + 560, y); ctx.stroke();
  y += 46;

  // Dates & location, each with a small dot bullet
  const bulletLine = (label) => {
    ctx.fillStyle = '#FE9A02';
    ctx.beginPath(); ctx.arc(leftPad + 6, y - 9, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.font = "600 28px Outfit, sans-serif";
    ctx.fillText(label, leftPad + 26, y);
    y += 44;
  };
  bulletLine('7 – 9 October 2026');
  bulletLine('Freetown, Sierra Leone');

  // Hashtag, bottom-left
  ctx.fillStyle = '#FE9A02';
  ctx.font = "800 32px Outfit, sans-serif";
  ctx.fillText('#LCOYSierraLeone2026', leftPad, H - 56);

  // Photo panel, right side, full bleed
  const photoX = Math.round(W * 0.6);
  const photoW = W - photoX;
  if (profile.photoURL) {
    const ph = new Image();
    await new Promise((res, rej) => { ph.onload = res; ph.onerror = rej; ph.src = profile.photoURL; });
    ctx.save();
    ctx.beginPath(); ctx.rect(photoX, 0, photoW, H); ctx.clip();
    const sc = Math.max(photoW / ph.width, H / ph.height);
    const dw = ph.width * sc, dh = ph.height * sc;
    ctx.drawImage(ph, photoX + (photoW - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.restore();
    const seam = ctx.createLinearGradient(photoX - 90, 0, photoX + 30, 0);
    seam.addColorStop(0, 'rgba(11,34,51,1)');
    seam.addColorStop(1, 'rgba(11,34,51,0)');
    ctx.fillStyle = seam;
    ctx.fillRect(photoX - 90, 0, 120, H);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fillRect(photoX, 0, photoW, H);
  }
}

export async function generateFlyer(profile) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  try {
    await Promise.all([
      document.fonts.load('900 76px Outfit'),
      document.fonts.load('800 42px Outfit'),
      document.fonts.load('700 25px Outfit'),
      document.fonts.load('600 28px Outfit'),
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
