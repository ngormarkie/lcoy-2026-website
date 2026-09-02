// Cloudflare Pages Function: POST /api/send-application-confirmation
// Sends a fixed "we've received your application" acknowledgement email to
// an applicant, right after they submit the public LCOY 2026 application
// form. Unlike the announcement/decision functions, this one is called by
// the applicant's own browser (they are never logged in), so there is no
// Firebase ID token to verify. To keep the public surface narrow, the
// caller only supplies a name and an email address — the subject and body
// are fixed here and never taken from the request, so this endpoint cannot
// be used to relay arbitrary email content.
//
// Required Cloudflare env vars (same as the other Brevo-based functions):
//   BREVO_API_KEY, SENDER_EMAIL, SENDER_NAME (optional)

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEAR_BACK_DATE = '20 September 2026';

export async function onRequestPost({ request, env }) {
  try {
    const { name, email, origin } = await request.json();

    const safeName = String(name || '').trim().slice(0, 200);
    const safeEmail = String(email || '').trim().slice(0, 200).toLowerCase();
    const safeOrigin = origin ? String(origin).slice(0, 200).replace(/[^a-zA-Z0-9:/._-]/g, '') : '';
    const logoUrl = safeOrigin ? `${safeOrigin}/photos/Logos%20for%20host%20organizations/LCOY-YOUNGO-Endored.png` : '';

    if (!safeName) return json({ ok: false, error: 'missing_name' }, 400);
    if (!EMAIL_RE.test(safeEmail)) return json({ ok: false, error: 'invalid_email' }, 400);
    if (!env.BREVO_API_KEY || !env.SENDER_EMAIL) return json({ ok: false, error: 'email_not_configured' }, 500);

    const firstName = safeName.split(/\s+/)[0];
    const sender = { name: env.SENDER_NAME || 'LCOY Sierra Leone 2026', email: env.SENDER_EMAIL };
    const subject = "We've received your LCOY Sierra Leone 2026 application";

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <div style="background:#0B2233;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          ${logoUrl ? `<div style="display:inline-block;background:#fff;padding:10px 18px;border-radius:10px"><img src="${logoUrl}" alt="LCOY Sierra Leone 2026 — officially endorsed by YOUNGO" width="260" style="display:block;max-width:260px;height:auto" /></div>` : ''}
        </div>
        <div style="border:1px solid #e2ebe6;border-top:none;padding:20px;border-radius:0 0 12px 12px">
          <p style="color:#3e5160;line-height:1.6">Dear ${esc(firstName)},</p>
          <p style="color:#3e5160;line-height:1.6">Thank you for applying to <strong>LCOY Sierra Leone 2026</strong> in Freetown, 7&ndash;9 October 2026. Your application has been received and will go through a two-stage review — first by the participation team, then a final selection by the working group.</p>
          <div style="background:#F4F8F6;border-radius:10px;padding:14px 18px;margin:16px 0">
            <p style="margin:0;color:#0B2233"><strong>You will hear from us by ${HEAR_BACK_DATE}</strong>, whatever the outcome.</p>
          </div>
          <p style="color:#3e5160;line-height:1.6">No further action is needed from you right now. If your details change before then (email, phone), please let the organising team know.</p>
          <p style="color:#8a8a8a;font-size:12px;margin-top:22px">Inclusive Climate Action: Leaving No Youth Behind</p>
          <p style="color:#8a8a8a;font-size:11px;margin-top:14px">Tip: add this address to your contacts so future emails from us land in your inbox.</p>
        </div>
      </div>`;
    const text = `Thank you for applying to LCOY Sierra Leone 2026 (Freetown, 7-9 October 2026). Your application has been received and will go through a two-stage review. You will hear from us by ${HEAR_BACK_DATE}, whatever the outcome.`;

    const bres = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender,
        to: [{ email: safeEmail, name: safeName }],
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
