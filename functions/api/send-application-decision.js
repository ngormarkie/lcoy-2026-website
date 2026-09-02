// Cloudflare Pages Function: POST /api/send-application-decision
// Sends personalised "accepted" or "rejected" emails to a batch of LCOY 2026
// applicants via the Brevo API. Security: verifies the caller's Firebase ID
// token and that they are an organiser/super-admin before sending anything.
// The recipient list is supplied by the caller (the organiser's own browser,
// which already has organiser-level read access to the applications
// collection under Firestore rules) — this function only ever sends mail,
// it never reads or writes Firestore itself.
//
// Required Cloudflare env vars (same as send-announcement.js):
//   FIREBASE_API_KEY, FIREBASE_PROJECT_ID, BREVO_API_KEY, SENDER_EMAIL, SENDER_NAME

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function acceptedEmail({ name, email, code, loginUrl, whatsappLink }) {
  const subject = "You're selected — LCOY Sierra Leone 2026";
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#0B2233;color:#fff;padding:20px;border-radius:12px 12px 0 0">
        <h2 style="margin:0;font-size:18px">LCOY Sierra Leone 2026</h2>
        <p style="margin:4px 0 0;opacity:.8;font-size:13px">You've been selected as a delegate</p>
      </div>
      <div style="border:1px solid #e2ebe6;border-top:none;padding:20px;border-radius:0 0 12px 12px">
        <p style="color:#3e5160;line-height:1.6">Dear ${esc(name)},</p>
        <p style="color:#3e5160;line-height:1.6">Congratulations — you have been selected as a delegate for <strong>LCOY Sierra Leone 2026</strong> in Freetown, 7&ndash;9 October 2026. Welcome to the coalition.</p>
        <div style="background:#F4F8F6;border-radius:10px;padding:14px 18px;margin:16px 0">
          <p style="margin:0 0 6px;color:#0B2233;font-weight:bold">Your login details</p>
          <p style="margin:0;color:#3e5160">Email: ${esc(email)}<br/>Password (also your badge code): <strong>${esc(code)}</strong></p>
        </div>
        <p style="color:#3e5160;line-height:1.6">Please log in and upload a clear headshot photo — it will appear on your printed badge and in the attendee directory.</p>
        <a href="${loginUrl}" style="display:inline-block;margin-top:6px;background:#0072C6;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">Log in &amp; upload your photo</a>
        ${whatsappLink ? `<p style="color:#3e5160;line-height:1.6;margin-top:18px">Join the delegate WhatsApp group: <a href="${esc(whatsappLink)}">${esc(whatsappLink)}</a></p>` : ''}
        <p style="color:#8a8a8a;font-size:12px;margin-top:22px">Inclusive Climate Action: Leaving No Youth Behind</p>
      </div>
    </div>`;
  const text = `Congratulations — you have been selected as a delegate for LCOY Sierra Leone 2026 (Freetown, 7-9 October 2026).\n\nLogin email: ${email}\nPassword (also your badge code): ${code}\n\nLog in and upload your photo: ${loginUrl}${whatsappLink ? `\nDelegate WhatsApp group: ${whatsappLink}` : ''}`;
  return { subject, html, text };
}

function rejectedEmail({ name }) {
  const subject = 'Update on your LCOY Sierra Leone 2026 application';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#0B2233;color:#fff;padding:20px;border-radius:12px 12px 0 0">
        <h2 style="margin:0;font-size:18px">LCOY Sierra Leone 2026</h2>
        <p style="margin:4px 0 0;opacity:.8;font-size:13px">Application update</p>
      </div>
      <div style="border:1px solid #e2ebe6;border-top:none;padding:20px;border-radius:0 0 12px 12px">
        <p style="color:#3e5160;line-height:1.6">Dear ${esc(name)},</p>
        <p style="color:#3e5160;line-height:1.6">Thank you for applying to LCOY Sierra Leone 2026 and for your interest in youth climate action. Applications this year far exceeded the places available, and after careful review we are unable to offer you a place at this year's conference.</p>
        <p style="color:#3e5160;line-height:1.6">Please stay connected through our social media channels for future opportunities, including regional consultations and future editions of LCOY.</p>
        <p style="color:#3e5160;line-height:1.6">Thank you again for your commitment to climate action.</p>
        <p style="color:#8a8a8a;font-size:12px;margin-top:22px">Inclusive Climate Action: Leaving No Youth Behind</p>
      </div>
    </div>`;
  const text = `Thank you for applying to LCOY Sierra Leone 2026. Applications this year far exceeded the places available, and after careful review we are unable to offer you a place at this year's conference. Please stay connected for future opportunities.`;
  return { subject, html, text };
}

export async function onRequestPost({ request, env }) {
  try {
    const projectId = env.FIREBASE_PROJECT_ID || 'lcoy-app';
    const { idToken, decision, recipients, whatsappLink, origin } = await request.json();

    if (!idToken || !decision || !Array.isArray(recipients) || recipients.length === 0) {
      return json({ ok: false, error: 'missing_fields' }, 400);
    }
    if (decision !== 'accepted' && decision !== 'rejected') return json({ ok: false, error: 'invalid_decision' }, 400);
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

    // 3) Send one personalised email per recipient via Brevo.
    const sender = { name: env.SENDER_NAME || 'LCOY Sierra Leone 2026', email: env.SENDER_EMAIL };
    const loginUrl = origin ? `${String(origin).replace(/[^a-zA-Z0-9:/._-]/g, '')}/admin` : '#';
    const safeWhatsapp = (whatsappLink || '').trim();

    let sent = 0;
    for (const r of recipients) {
      if (!r || !r.email || !r.name) continue;
      const content = decision === 'accepted'
        ? acceptedEmail({ name: r.name, email: r.email, code: r.code || '', loginUrl, whatsappLink: safeWhatsapp })
        : rejectedEmail({ name: r.name });
      try {
        const bres = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({
            sender,
            to: [{ email: r.email, name: r.name }],
            subject: content.subject,
            htmlContent: content.html,
            textContent: content.text,
          }),
        });
        if (bres.ok) sent += 1;
      } catch { /* keep going for the rest of the batch */ }
    }

    return json({ ok: true, sent, total: recipients.length });
  } catch (e) {
    return json({ ok: false, error: String(e && e.message ? e.message : e) }, 500);
  }
}
