// Cloudflare Pages Function: POST /api/send-flyer-ready
// Sent to a delegate right after they save their first headshot photo, with
// a link to their personalised "I will be attending" flyer. The flyer image
// itself is generated client-side (canvas) from the delegate's own profile
// when they open that link — this function only sends the notification
// email, it never generates, uploads, or stores an image.
//
// Required Cloudflare env vars (same as the other Brevo-based functions):
//   FIREBASE_API_KEY, FIREBASE_PROJECT_ID, BREVO_API_KEY, SENDER_EMAIL, SENDER_NAME

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function onRequestPost({ request, env }) {
  try {
    const projectId = env.FIREBASE_PROJECT_ID || 'lcoy-app';
    const { idToken, origin } = await request.json();

    if (!idToken) return json({ ok: false, error: 'missing_fields' }, 400);
    if (!env.BREVO_API_KEY || !env.SENDER_EMAIL) return json({ ok: false, error: 'email_not_configured' }, 500);

    // 1) Verify the token and get the caller's uid.
    const lookup = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_API_KEY}`,
      { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idToken }) }
    );
    if (!lookup.ok) return json({ ok: false, error: 'unauthorized' }, 401);
    const lookupData = await lookup.json();
    const uid = lookupData.users && lookupData.users[0] && lookupData.users[0].localId;
    if (!uid) return json({ ok: false, error: 'unauthorized' }, 401);

    // 2) Look up the caller's own profile — name/email always come from
    // Firestore, never from the request, so this can't be used to email an
    // arbitrary address.
    const meRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`,
      { headers: { Authorization: `Bearer ${idToken}` } }
    );
    if (!meRes.ok) return json({ ok: false, error: 'forbidden' }, 403);
    const me = await meRes.json();
    const name = (me.fields && me.fields.name && me.fields.name.stringValue) || '';
    const email = (me.fields && me.fields.email && me.fields.email.stringValue) || '';
    if (!email) return json({ ok: false, error: 'no_email' }, 400);

    // 3) Send the email.
    const safeOrigin = origin ? String(origin).replace(/[^a-zA-Z0-9:/._-]/g, '') : '';
    const logoUrl = safeOrigin ? `${safeOrigin}/photos/Logos%20for%20host%20organizations/LCOY-YOUNGO-Endored.png` : '';
    const flyerUrl = safeOrigin ? `${safeOrigin}/delegate/flyer` : '#';
    const sender = { name: env.SENDER_NAME || 'LCOY Sierra Leone 2026', email: env.SENDER_EMAIL };
    const firstName = name.trim().split(/\s+/)[0] || 'there';
    const subject = 'Your "I will be attending" flyer is ready!';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <div style="background:#0B2233;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          ${logoUrl ? `<div style="display:inline-block;background:#fff;padding:10px 18px;border-radius:10px"><img src="${logoUrl}" alt="LCOY Sierra Leone 2026 — officially endorsed by YOUNGO" width="260" style="display:block;max-width:260px;height:auto" /></div>` : ''}
        </div>
        <div style="border:1px solid #e2ebe6;border-top:none;padding:20px;border-radius:0 0 12px 12px">
          <p style="color:#3e5160;line-height:1.6">Hi ${esc(firstName)},</p>
          <p style="color:#3e5160;line-height:1.6">Thanks for setting up your account and adding your photo — your personalised "I will be attending LCOY Sierra Leone 2026" flyer is ready. Download it and share it on social media to help spread the word.</p>
          <a href="${flyerUrl}" style="display:inline-block;margin-top:6px;background:#0072C6;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">Get my flyer</a>
          <p style="color:#3e5160;line-height:1.6;margin-top:18px">Use #LCOYSierraLeone2026 when you post it.</p>
          <p style="color:#8a8a8a;font-size:12px;margin-top:22px">Inclusive Climate Action: Leaving No Youth Behind</p>
          <p style="color:#8a8a8a;font-size:11px;margin-top:14px">Tip: add this address to your contacts so future emails from us land in your inbox.</p>
        </div>
      </div>`;
    const text = `Your personalised "I will be attending LCOY Sierra Leone 2026" flyer is ready.\n\nGet it here: ${flyerUrl}\n\nUse #LCOYSierraLeone2026 when you post it.`;

    const bres = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender,
        to: [{ email, name }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });

    if (!bres.ok) return json({ ok: false, error: 'send_failed' }, 502);
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String(e && e.message ? e.message : e) }, 500);
  }
}
