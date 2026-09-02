// Cloudflare Pages Function: POST /api/send-announcement
// Sends an announcement email to all attendees via the Brevo API.
// Security: verifies the caller's Firebase ID token and that they are an
// organiser/super-admin, then fetches recipient emails server-side (the
// client never supplies the recipient list).
//
// Required Cloudflare env vars:
//   FIREBASE_API_KEY   - the public Firebase web API key
//   FIREBASE_PROJECT_ID- e.g. lcoy-app
//   BREVO_API_KEY      - Brevo API key (secret)
//   SENDER_EMAIL       - a verified Brevo sender address
//   SENDER_NAME        - (optional) display name, defaults to LCOY

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const projectId = env.FIREBASE_PROJECT_ID || 'lcoy-app';
    const { idToken, subject, html, text } = await request.json();

    if (!idToken || !subject) return json({ ok: false, error: 'missing_fields' }, 400);
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

    // 3) Fetch all attendee emails (server-side).
    const query = {
      structuredQuery: {
        from: [{ collectionId: 'users' }],
        where: {
          fieldFilter: { field: { fieldPath: 'role' }, op: 'EQUAL', value: { stringValue: 'attendee' } },
        },
        select: { fields: [{ fieldPath: 'email' }] },
      },
    };
    const qRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
      { method: 'POST', headers: { Authorization: `Bearer ${idToken}`, 'content-type': 'application/json' }, body: JSON.stringify(query) }
    );
    if (!qRes.ok) return json({ ok: false, error: 'query_failed' }, 500);
    const rows = await qRes.json();
    const emails = [];
    for (const r of rows) {
      const e = r.document && r.document.fields && r.document.fields.email && r.document.fields.email.stringValue;
      if (e && !emails.includes(e)) emails.push(e);
    }
    if (emails.length === 0) return json({ ok: true, sent: 0 });

    // 4) Send via Brevo, BCC in chunks (keeps under Worker subrequest limits).
    const sender = { name: env.SENDER_NAME || 'LCOY Sierra Leone 2026', email: env.SENDER_EMAIL };
    let sent = 0;
    for (let i = 0; i < emails.length; i += 90) {
      const chunk = emails.slice(i, i + 90);
      const bres = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender,
          to: [sender],
          bcc: chunk.map((email) => ({ email })),
          subject,
          htmlContent: html || subject,
          textContent: text || subject,
        }),
      });
      if (bres.ok) sent += chunk.length;
    }

    return json({ ok: true, sent, total: emails.length });
  } catch (e) {
    return json({ ok: false, error: String(e && e.message ? e.message : e) }, 500);
  }
}
