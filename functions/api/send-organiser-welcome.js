// Cloudflare Pages Function: POST /api/send-organiser-welcome
// Sends a login-details email to a newly created organiser account.
// Security: verifies the caller's Firebase ID token and that they are an
// organiser/super-admin before sending anything (only a super-admin can
// actually create an organiser account under Firestore rules, but this is
// checked here too since the function only ever sends mail, never reads or
// writes Firestore itself).
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
    const { idToken, name, email, password, origin } = await request.json();

    if (!idToken || !name || !email || !password) return json({ ok: false, error: 'missing_fields' }, 400);
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

    // 3) Send the welcome email.
    const safeOrigin = origin ? String(origin).replace(/[^a-zA-Z0-9:/._-]/g, '') : '';
    const logoUrl = safeOrigin ? `${safeOrigin}/photos/Logos%20for%20host%20organizations/LCOY-YOUNGO-Endored.png` : '';
    const loginUrl = safeOrigin ? `${safeOrigin}/admin` : '#';
    const sender = { name: env.SENDER_NAME || 'LCOY Sierra Leone 2026', email: env.SENDER_EMAIL };
    const firstName = String(name).trim().split(/\s+/)[0];
    const subject = 'Your LCOY Sierra Leone 2026 organiser account';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <div style="background:#0B2233;color:#fff;padding:20px;border-radius:12px 12px 0 0;text-align:center">
          ${logoUrl ? `<div style="display:inline-block;background:#fff;padding:10px 18px;border-radius:10px;margin-bottom:12px"><img src="${logoUrl}" alt="LCOY Sierra Leone 2026 — officially endorsed by YOUNGO" width="260" style="display:block;max-width:260px;height:auto" /></div>` : ''}
          <h2 style="margin:0;font-size:18px">LCOY Sierra Leone 2026</h2>
          <p style="margin:4px 0 0;opacity:.8;font-size:13px">Organiser account created</p>
        </div>
        <div style="border:1px solid #e2ebe6;border-top:none;padding:20px;border-radius:0 0 12px 12px">
          <p style="color:#3e5160;line-height:1.6">Dear ${esc(firstName)},</p>
          <p style="color:#3e5160;line-height:1.6">An organiser account has been created for you on the LCOY Sierra Leone 2026 conference management platform.</p>
          <div style="background:#F4F8F6;border-radius:10px;padding:14px 18px;margin:16px 0">
            <p style="margin:0 0 6px;color:#0B2233;font-weight:bold">Your login details</p>
            <p style="margin:0;color:#3e5160">Email: ${esc(email)}<br/>Password: <strong>${esc(password)}</strong></p>
          </div>
          <a href="${loginUrl}" style="display:inline-block;margin-top:6px;background:#0072C6;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">Sign in</a>
          <p style="color:#3e5160;line-height:1.6;margin-top:18px">You can change your password anytime from Settings once signed in. If you weren't expecting this account, please contact the head organiser.</p>
          <p style="color:#8a8a8a;font-size:12px;margin-top:22px">Inclusive Climate Action: Leaving No Youth Behind</p>
          <p style="color:#8a8a8a;font-size:11px;margin-top:14px">Tip: add this address to your contacts so future emails from us land in your inbox.</p>
        </div>
      </div>`;
    const text = `An organiser account has been created for you on the LCOY Sierra Leone 2026 conference management platform.\n\nLogin email: ${email}\nPassword: ${password}\n\nSign in: ${loginUrl}`;

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
