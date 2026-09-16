// Cloudflare Pages Function: POST /api/send-exhibitor-confirmation
// Acknowledges a green business exhibitor application, sent right after the
// public /exhibit form is submitted. Like send-application-confirmation, the
// applicant is never logged in, so there is no Firebase ID token to verify.
// The caller supplies only a name, a business name and an email address —
// the subject and body are fixed here and never taken from the request, so
// this endpoint cannot be used to relay arbitrary email content.
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
const CONFIRM_BY_DATE = '2 October 2026';

export async function onRequestPost({ request, env }) {
  try {
    const { name, businessName, email, origin } = await request.json();

    const safeName = String(name || '').trim().slice(0, 200);
    const safeBusiness = String(businessName || '').trim().slice(0, 200);
    const safeEmail = String(email || '').trim().slice(0, 200).toLowerCase();
    const safeOrigin = origin ? String(origin).slice(0, 200).replace(/[^a-zA-Z0-9:/._-]/g, '') : '';
    const logoUrl = safeOrigin ? `${safeOrigin}/photos/Logos%20for%20host%20organizations/LCOY-YOUNGO-Endored.png` : '';

    if (!safeName) return json({ ok: false, error: 'missing_name' }, 400);
    if (!safeBusiness) return json({ ok: false, error: 'missing_business' }, 400);
    if (!EMAIL_RE.test(safeEmail)) return json({ ok: false, error: 'invalid_email' }, 400);
    if (!env.BREVO_API_KEY || !env.SENDER_EMAIL) return json({ ok: false, error: 'email_not_configured' }, 500);

    const firstName = safeName.split(/\s+/)[0];
    const sender = { name: env.SENDER_NAME || 'LCOY Sierra Leone 2026', email: env.SENDER_EMAIL };
    const subject = 'Your exhibitor application, LCOY Sierra Leone 2026';

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <div style="background:#0B2233;padding:24px;border-radius:12px 12px 0 0;text-align:center">
          ${logoUrl ? `<div style="display:inline-block;background:#fff;padding:10px 18px;border-radius:10px"><img src="${logoUrl}" alt="LCOY Sierra Leone 2026 — officially endorsed by YOUNGO" width="260" style="display:block;max-width:260px;height:auto" /></div>` : ''}
        </div>
        <div style="border:1px solid #e2ebe6;border-top:none;padding:20px;border-radius:0 0 12px 12px">
          <p style="color:#3e5160;line-height:1.6">Dear ${esc(firstName)},</p>
          <p style="color:#3e5160;line-height:1.6">Thank you for applying to exhibit at the Local Conference of Youth (LCOY) Sierra Leone 2026 on behalf of <strong>${esc(safeBusiness)}</strong>. We have received your application.</p>
          <p style="color:#3e5160;line-height:1.6">We are reviewing all applications against the 15 exhibition spaces available and will confirm selected exhibitors by ${CONFIRM_BY_DATE}, by email and on WhatsApp. If you are selected, that message will carry your stand allocation, set up times, and the exhibition guidelines.</p>
          <div style="background:#F4F8F6;border-radius:10px;padding:14px 18px;margin:16px 0">
            <p style="margin:0 0 6px;color:#0B2233"><strong>Conference details</strong></p>
            <p style="margin:0;color:#3e5160;line-height:1.7">
              Dates: 7 to 8 October 2026<br />
              Venue: Freetown City Council Hall, Freetown<br />
              Set up: afternoon of 6 October 2026
            </p>
          </div>
          <p style="color:#3e5160;line-height:1.6">Two things to prepare while you wait. Exhibitors supply their own roll up banner, so begin work on yours now if you have not already. Keep the afternoon of 6 October free, since stands must be in place before delegates arrive on the morning of 7 October.</p>
          <p style="color:#3e5160;line-height:1.6">If any detail in your application changes, reply to this email rather than submitting the form a second time.</p>
          <p style="color:#3e5160;line-height:1.6;margin-top:22px">Best Regards<br />LCOY Sierra Leone 2026 Team</p>
          <p style="color:#8a8a8a;font-size:12px;margin-top:22px">Inclusive Climate Action: Leaving No Youth Behind</p>
          <p style="color:#8a8a8a;font-size:11px;margin-top:14px">Tip: add this address to your contacts so future emails from us land in your inbox.</p>
        </div>
      </div>`;

    const text = `Dear ${firstName},

Thank you for applying to exhibit at the Local Conference of Youth (LCOY) Sierra Leone 2026 on behalf of ${safeBusiness}. We have received your application.

We are reviewing all applications against the 15 exhibition spaces available and will confirm selected exhibitors by ${CONFIRM_BY_DATE}, by email and on WhatsApp. If you are selected, that message will carry your stand allocation, set up times, and the exhibition guidelines.

Conference details:
Dates: 7 to 8 October 2026
Venue: Freetown City Council Hall, Freetown
Set up: afternoon of 6 October 2026

Two things to prepare while you wait. Exhibitors supply their own roll up banner, so begin work on yours now if you have not already. Keep the afternoon of 6 October free, since stands must be in place before delegates arrive on the morning of 7 October.

If any detail in your application changes, reply to this email rather than submitting the form a second time.

Best Regards
LCOY Sierra Leone 2026 Team`;

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
