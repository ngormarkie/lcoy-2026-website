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

function header(logoUrl) {
  return `
      <div style="background:#0B2233;padding:24px;border-radius:12px 12px 0 0;text-align:center">
        ${logoUrl ? `<div style="display:inline-block;background:#fff;padding:10px 18px;border-radius:10px"><img src="${logoUrl}" alt="LCOY Sierra Leone 2026 — officially endorsed by YOUNGO" width="260" style="display:block;max-width:260px;height:auto" /></div>` : ''}
      </div>`;
}

const CONTACTS_TIP = '<p style="color:#8a8a8a;font-size:11px;margin-top:14px">Tip: add this address to your contacts so future emails from us land in your inbox.</p>';
const CONFIRM_BY = '27 September';

// The badge code is shown here only as a physical entry code, never framed
// as "your password" — so a screenshot of this email doesn't hand anyone a
// working login. The actual sign-in link is single-use-ish (auto-login,
// then forced into setting a real password) and expires after 10 days
// (enforced in AdminApp's mustSetPassword gate via authLinkIssuedAt).
function acceptedEmail({ name, code, autoLoginUrl, delegateUrl, whatsappLink, logoUrl, totalApplications, totalSelected }) {
  const subject = 'You have been selected as a delegate for LCOY Sierra Leone 2026';
  const countsLine = (totalApplications && totalSelected) ? ` Out of ${totalApplications} applications received, yours was one of ${totalSelected} selected.` : '';
  const whatsappHtml = whatsappLink ? `
        <p style="color:#0B2233;font-weight:bold;margin:18px 0 4px">Join the delegate WhatsApp group</p>
        <p style="margin:0"><a href="${esc(whatsappLink)}">${esc(whatsappLink)}</a></p>
        <p style="color:#8a8a8a;font-size:12px;margin-top:4px">This group is for selected delegates only. Please do not forward the link.</p>` : '';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      ${header(logoUrl)}
      <div style="border:1px solid #e2ebe6;border-top:none;padding:20px;border-radius:0 0 12px 12px">
        <p style="color:#3e5160;line-height:1.6">Dear ${esc(name)},</p>
        <p style="color:#3e5160;line-height:1.6">You have been selected as a delegate for <strong>LCOY Sierra Leone 2026</strong>, taking place in Freetown from 7 to 9 October 2026 under the theme <em>Inclusive Climate Action: Leaving No Youth Behind</em>.${countsLine}</p>
        <p style="color:#0B2233;font-weight:bold;margin-bottom:6px">Three things to do now</p>
        <ol style="color:#3e5160;line-height:1.7;padding-left:20px;margin-top:0">
          <li>Confirm your place by ${CONFIRM_BY}. Places not confirmed by that date go to applicants on the waiting list.</li>
          <li>Sign in and set your own password using the button below.</li>
          <li>Upload a clear headshot by ${CONFIRM_BY}. It appears on your printed badge and in the delegate directory, so use a plain background and no sunglasses.</li>
        </ol>
        <a href="${autoLoginUrl}" style="display:inline-block;margin-top:6px;background:#0072C6;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">Set up your account</a>
        <p style="color:#8a8a8a;font-size:12px;margin-top:12px">The link above is for you alone and expires in 10 days. If it stops working, go to <a href="${esc(delegateUrl)}">${esc(delegateUrl)}</a> and choose "Forgot password" to receive a new one.</p>
        <p style="color:#3e5160;line-height:1.6">Your badge code is <strong>${esc(code)}</strong>. Bring it to registration on the morning of 7 October. Do not share this code with anyone.</p>
        <p style="color:#0B2233;font-weight:bold;margin:18px 0 4px">What is covered</p>
        <p style="color:#3e5160;line-height:1.6;margin:0">Lunch, refreshments and conference materials are provided for all two days.</p>
        <p style="color:#0B2233;font-weight:bold;margin:18px 0 4px">What happens next</p>
        <p style="color:#3e5160;line-height:1.6;margin:0">We will send the full programme and the venue in due time. Delegates are expected to attend all three days, including the community action day on 9 October for selected delegates.</p>
        ${whatsappHtml}
        <p style="color:#3e5160;line-height:1.6;margin-top:18px">For any question write to <a href="mailto:lcoy@yccsierraleone.org">lcoy@yccsierraleone.org</a> or call +232 76 226302.</p>
        <p style="color:#3e5160;line-height:1.6;margin-top:18px">Participant Affairs<br/>LCOY Sierra Leone 2026</p>
      </div>
    </div>`;
  const text = `You have been selected as a delegate for LCOY Sierra Leone 2026, taking place in Freetown from 7 to 9 October 2026 under the theme Inclusive Climate Action: Leaving No Youth Behind.${countsLine}

Three things to do now
1. Confirm your place by ${CONFIRM_BY}. Places not confirmed by that date go to applicants on the waiting list.
2. Sign in and set your own password: ${autoLoginUrl}
3. Upload a clear headshot by ${CONFIRM_BY}. It appears on your printed badge and in the delegate directory.

The link above is for you alone and expires in 10 days. If it stops working, go to ${delegateUrl} and choose "Forgot password".

Your badge code is ${code}. Bring it to registration on the morning of 7 October. Do not share this code with anyone.

What is covered: Lunch, refreshments and conference materials are provided for all two days.

What happens next: We will send the full programme and the venue in due time. Delegates are expected to attend all three days, including the community action day on 9 October for selected delegates.
${whatsappLink ? `\nJoin the delegate WhatsApp group: ${whatsappLink}\nThis group is for selected delegates only. Please do not forward the link.\n` : ''}
For any question write to lcoy@yccsierraleone.org or call +232 76 226302.

Participant Affairs
LCOY Sierra Leone 2026`;
  return { subject, html, text };
}

function rejectedEmail({ name, logoUrl }) {
  const subject = 'Update on your LCOY Sierra Leone 2026 application';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      ${header(logoUrl)}
      <div style="border:1px solid #e2ebe6;border-top:none;padding:20px;border-radius:0 0 12px 12px">
        <p style="color:#3e5160;line-height:1.6">Dear ${esc(name)},</p>
        <p style="color:#3e5160;line-height:1.6">Thank you for applying to LCOY Sierra Leone 2026 and for your interest in youth climate action. Applications this year far exceeded the places available, and after careful review we are unable to offer you a place at this year's conference.</p>
        <p style="color:#3e5160;line-height:1.6">Please stay connected through our social media channels for future opportunities, including regional consultations and future editions of LCOY.</p>
        <p style="color:#3e5160;line-height:1.6">Thank you again for your commitment to climate action.</p>
        <p style="color:#8a8a8a;font-size:12px;margin-top:22px">Inclusive Climate Action: Leaving No Youth Behind</p>
        ${CONTACTS_TIP}
      </div>
    </div>`;
  const text = `Thank you for applying to LCOY Sierra Leone 2026. Applications this year far exceeded the places available, and after careful review we are unable to offer you a place at this year's conference. Please stay connected for future opportunities.`;
  return { subject, html, text };
}

export async function onRequestPost({ request, env }) {
  try {
    const projectId = env.FIREBASE_PROJECT_ID || 'lcoy-app';
    const { idToken, decision, recipients, whatsappLink, origin, totalApplications, totalSelected } = await request.json();

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
    if (role !== 'organiser' && role !== 'admin' && role !== 'superadmin') return json({ ok: false, error: 'forbidden' }, 403);

    // 3) Send one personalised email per recipient via Brevo.
    const sender = { name: env.SENDER_NAME || 'LCOY Sierra Leone 2026', email: env.SENDER_EMAIL };
    const safeOrigin = origin ? String(origin).replace(/[^a-zA-Z0-9:/._-]/g, '') : '';
    const logoUrl = safeOrigin ? `${safeOrigin}/photos/Logos%20for%20host%20organizations/LCOY-YOUNGO-Endored.png` : '';
    const delegateUrl = safeOrigin ? `${safeOrigin}/delegate` : '#';
    const safeWhatsapp = (whatsappLink || '').trim();

    let sent = 0, skipped = 0;
    for (const r of recipients) {
      if (!r || !r.email || !r.name) continue;
      if (decision === 'accepted' && !r.code) { skipped += 1; continue; } // never send a blank-code email
      const autoLoginUrl = `${delegateUrl}/auto-login?email=${encodeURIComponent(r.email)}&code=${encodeURIComponent(r.code || '')}`;
      const content = decision === 'accepted'
        ? acceptedEmail({ name: r.name, code: r.code, autoLoginUrl, delegateUrl, whatsappLink: safeWhatsapp, logoUrl, totalApplications, totalSelected })
        : rejectedEmail({ name: r.name, logoUrl });
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

    return json({ ok: true, sent, skipped, total: recipients.length });
  } catch (e) {
    return json({ ok: false, error: String(e && e.message ? e.message : e) }, 500);
  }
}
