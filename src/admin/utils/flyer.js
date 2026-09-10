// "I will be attending" flyer generation, shared between the delegate's own
// flyer page (MyFlyer.jsx) and the staff-side "download on their behalf"
// buttons (UserDetail.jsx / UsersList.jsx). The artwork itself (background,
// logos, theme, dates, venue, hashtag) is a single designed template image
// (public/photos/LCOY-Flyer-Template.jpg) — the only thing generated here is
// the delegate's own photo, dropped into the template's photo circle. No
// name/organisation text is overlaid. Nothing is ever uploaded or stored
// server-side; this all happens client-side in the browser.

const TEMPLATE_SRC = '/photos/LCOY-Flyer-Template.jpg';

// Center (x, y) and radius of the photo placeholder circle, measured
// directly against the template artwork at its native resolution
// (3541 x 4338). If the template is ever redesigned, re-measure these
// against the new file rather than guessing.
const PHOTO_CIRCLE = { cx: 2711, cy: 3047, r: 604 };

export async function drawAttendingFlyer(canvas, ctx, profile) {
  const tmpl = new Image();
  await new Promise((res, rej) => { tmpl.onload = res; tmpl.onerror = rej; tmpl.src = TEMPLATE_SRC; });
  canvas.width = tmpl.naturalWidth;
  canvas.height = tmpl.naturalHeight;
  ctx.drawImage(tmpl, 0, 0);

  if (profile.photoURL) {
    const { cx, cy, r } = PHOTO_CIRCLE;
    const ph = new Image();
    await new Promise((res, rej) => { ph.onload = res; ph.onerror = rej; ph.src = profile.photoURL; });
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    const sc = Math.max((r * 2) / ph.width, (r * 2) / ph.height);
    const dw = ph.width * sc, dh = ph.height * sc;
    ctx.drawImage(ph, cx - dw / 2, cy - dh / 2, dw, dh);
    ctx.restore();
  }
  // No photo yet: leave the template's own placeholder illustration showing.
}

export async function generateFlyer(profile) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
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
