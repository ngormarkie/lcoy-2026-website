// Cloudflare Pages Function: POST /api/send-login-reminder
// "Resend login access" for a staff account (organiser/check-in) that never
// managed to sign in. There is no way to recover or resend the original
// password from the client SDK, and no Admin SDK access from this Worker
// (no Blaze plan), so this pairs with the caller also invoking Firebase's
// own sendPasswordResetEmail() for the target address — this function just
// sends a branded heads-up telling them to look out for that email.
// Security: verifies the caller's Firebase ID token and that they are an
// organiser/super-admin before sending anything.
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
    const { idToken, name, email, origin } = await request.json();

    if (!idToken || !name || !email) return json({ ok: false, error: 'missing_fields' }, 400);
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

    // 2) Confirm the caller is an organiser / super-admin.
    const meRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`,
      { headers: { Authorization: `Bearer ${idToken}` } }
    );
    if (!meRes.ok) return json({ ok: false, error: 'forbidden' }, 403);
    const me = await meRes.json();
    const role = me.fields && me.fields.role && me.fields.role.stringValue;
    if (role !== 'organiser' && role !== 'superadmin') return json({ ok: false, error: 'forbidden' }, 403);

    // 3) Send the reminder.
    const safeOrigin = origin ? String(origin).replace(/[^a-zA-Z0-9:/._-]/g, '') : '';
    const logoUrl = safeOrigin ? `${safeOrigin}/photos/Logos%20for%20host%20organizations/LCOY-YOUNGO-Endored.png` : '';
    const loginUrl = safeOrigin ? `${safeOrigin}/admin/login` : '#';
    const sender = { name: env.SENDER_NAME || 'LCOY Sierra Leone 2026', email: env.SENDER_EMAIL };
    const firstName = String(name).trim().split(/\s+/)[0];
    const subject = 'Access to your LCOY Sierra Leone 2026 account';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <div style="background:#0B2233;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          ${logoUrl ? `<div style="display:inline-block;background:#fff;padding:10px 18px;border-radius:10px"><img src="${logoUrl}" alt="LCOY Sierra Leone 2026 — officially endorsed by YOUNGO" width="260" style="display:block;max-width:260px;height:auto" /></div>` : ''}
        </div>
        <div style="border:1px solid #e2ebe6;border-top:none;padding:20px;border-radius:0 0 12px 12px">
          <p style="color:#3e5160;line-height:1.6">Dear ${esc(firstName)},</p>
          <p style="color:#3e5160;line-height:1.6">We've sent a separate password-reset email to this address from Firebase (sender address ending <strong>@${esc(projectId)}.firebaseapp.com</strong>, subject line similar to "Reset your password").</p>
          <p style="color:#3e5160;line-height:1.6">Please check your inbox — and your spam or junk folder, since it's a first-time sender — click the link inside, choose a password, then sign in below.</p>
          <a href="${loginUrl}" style="display:inline-block;margin-top:6px;background:#0072C6;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">Go to sign in</a>
          <p style="color:#3e5160;line-height:1.6;margin-top:18px">If you don't see the reset email within a few minutes, let the head organiser know and they can send it again.</p>
          <p style="color:#8a8a8a;font-size:12px;margin-top:22px">Inclusive Climate Action: Leaving No Youth Behind</p>
          <p style="color:#8a8a8a;font-size:11px;margin-top:14px">Tip: add this address to your contacts so future emails from us land in your inbox.</p>
        </div>
      </div>`;
    const text = `We've sent a separate password-reset email to this address from Firebase. Please check your inbox (and spam folder), click the link, choose a password, then sign in at ${loginUrl}.`;

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
