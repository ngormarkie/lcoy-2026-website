const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Sierra Leone numbers: compare on the last 8 digits so +232 76 123456,
// 076123456 and 76123456 all match the same person.
function normPhone(p) {
  const digits = (p || '').replace(/\D/g, '');
  return digits.length >= 8 ? digits.slice(-8) : digits;
}

function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Public callable: register an attendee for a workshop by phone number.
 * No login required. Runs with admin privileges so attendee data is never
 * exposed to the client.
 *
 * data: { phone, sessionId, origin }
 * returns: { ok, status?, already?, name?, reason? }
 */
exports.registerForWorkshop = onCall({ region: 'us-central1' }, async (request) => {
  const data = request.data || {};
  const phone = normPhone(data.phone);
  const sessionId = (data.sessionId || '').trim();
  const origin = (data.origin || '').replace(/[^a-zA-Z0-9:/._-]/g, '');

  if (!phone || phone.length < 8) return { ok: false, reason: 'invalid_phone' };
  if (!sessionId) return { ok: false, reason: 'invalid_session' };

  // Find the person with this phone number (server-side only).
  let user = null;
  const usersSnap = await db.collection('users').get();
  usersSnap.forEach((d) => {
    const u = d.data();
    if (!user && normPhone(u.phone) === phone) user = { id: d.id, ...u };
  });
  if (!user) return { ok: false, reason: 'not_recognized' };

  const sessionRef = db.collection('sessions').doc(sessionId);
  const regRef = sessionRef.collection('registrations').doc(user.id);

  let status = null;
  let already = false;
  let sessionTitle = 'the workshop';

  await db.runTransaction(async (tx) => {
    const sessionDoc = await tx.get(sessionRef);
    if (!sessionDoc.exists) throw new HttpsError('not-found', 'Session not found.');
    const s = sessionDoc.data();
    sessionTitle = s.title || sessionTitle;
    if (!s.allowRegistration) throw new HttpsError('failed-precondition', 'Registration is closed for this session.');

    const regDoc = await tx.get(regRef);
    if (regDoc.exists) { status = regDoc.data().status; already = true; return; }

    const capacity = Number(s.capacity) || 0;
    const confirmed = Number(s.regConfirmed) || 0;
    status = (capacity > 0 && confirmed >= capacity) ? 'waitlist' : 'confirmed';

    tx.set(regRef, {
      userId: user.id,
      name: user.name || '',
      code: user.code || '',
      phone: user.phone || '',
      email: user.email || '',
      status,
      attended: false,
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.update(sessionRef, status === 'confirmed'
      ? { regConfirmed: admin.firestore.FieldValue.increment(1) }
      : { regWaitlist: admin.firestore.FieldValue.increment(1) });
  });

  // Queue a confirmation/waitlist email (Trigger Email extension reads `mail`).
  if (!already && user.email) {
    const boardUrl = origin ? `${origin}/live` : 'the LCOY live board';
    const confirmed = status === 'confirmed';
    const subject = confirmed
      ? `Confirmed: ${sessionTitle} — LCOY 2026`
      : `Waitlisted: ${sessionTitle} — LCOY 2026`;
    const line = confirmed
      ? `You're <strong>confirmed</strong> for <strong>${esc(sessionTitle)}</strong>. Show your badge at the door to be admitted.`
      : `You're on the <strong>waitlist</strong> for <strong>${esc(sessionTitle)}</strong>. We'll email you if a place opens up.`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <div style="background:#0B2233;color:#fff;padding:20px;border-radius:12px 12px 0 0">
          <h2 style="margin:0;font-size:18px">LCOY Sierra Leone 2026</h2>
          <p style="margin:4px 0 0;opacity:.8;font-size:13px">Workshop registration</p>
        </div>
        <div style="border:1px solid #e2ebe6;border-top:none;padding:20px;border-radius:0 0 12px 12px">
          <p style="color:#3e5160;line-height:1.5">${line}</p>
          <a href="${origin ? origin + '/live' : '#'}" style="display:inline-block;margin-top:12px;background:#0072C6;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold">View the live board</a>
          <p style="color:#8a8a8a;font-size:12px;margin-top:18px">Inclusive Climate Action: Leaving No Youth Behind</p>
        </div>
      </div>`;
    await db.collection('mail').add({
      to: user.email,
      message: {
        subject,
        html,
        text: `${confirmed ? 'Confirmed' : 'Waitlisted'} for ${sessionTitle}. View the live board: ${boardUrl}`,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return { ok: true, status, already, name: user.name || '' };
});
