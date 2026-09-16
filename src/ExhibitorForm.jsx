import { useMemo, useRef, useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { publicDb } from './admin/services/firebase';

// Applications close at the end of 25 September 2026. Checked in the browser
// on render — deliberately no scheduled function behind it.
const APPLICATION_DEADLINE = new Date('2026-09-25T23:59:59+00:00');
const CONTACT_EMAIL = 'lcoy@yccsierraleone.org';
const EXHIBITOR_CAP = 15;

const SECTORS = [
  'Renewable energy', 'Clean cooking', 'Waste management and recycling',
  'Sustainable agriculture', 'Eco fashion', 'Clean transport',
  'Water and sanitation', 'Green finance', 'Other',
];
const REGISTRATION_STATUS = [
  'Registered company', 'Registered NGO or community based organisation',
  'Cooperative', 'Not formally registered',
];
const DISTRICTS = [
  'Bo', 'Bombali', 'Bonthe', 'Falaba', 'Kailahun', 'Kambia', 'Karene', 'Kenema',
  'Koinadugu', 'Kono', 'Moyamba', 'Port Loko', 'Pujehun', 'Tonkolili',
  'Western Area Rural', 'Western Area Urban',
];
const ON_SITE_ACTIVITY = ['Display and networking only', 'Selling products', 'Taking orders for later delivery'];
const STAND_SETUP = ['Table and two chairs provided', 'Bringing my own display setup'];
const YEARS = Array.from({ length: 2026 - 1980 + 1 }, (_, i) => String(2026 - i));

const countWords = (s) => (s || '').trim().split(/\s+/).filter(Boolean).length;
const stripSpaces = (s) => (s || '').replace(/\s+/g, '');

const BLANK = {
  businessName: '', sector: '', sectorOther: '', yearStarted: '', registrationStatus: '', districts: [],
  repName: '', repPosition: '', repWhatsapp: '+232', repEmail: '', repAltPhone: '',
  exhibitDescription: '', climateRelevance: '', onSiteActivity: '', recognition: '',
  needsPower: '', powerEquipment: '', standSetup: '', staffCount: '', canAttendSetup: '',
  onlineLinks: '',
  consentMedia: false, consentTerms: false, signatureName: '',
};

function FieldError({ id, msg }) {
  if (!msg) return null;
  return <div className="apply-error" id={id}>{msg}</div>;
}

function WordCount({ used, max }) {
  const over = used > max;
  return (
    <div style={{ fontSize: '.78rem', marginTop: 4, color: over ? '#ff8080' : 'rgba(255,255,255,.55)', fontWeight: over ? 600 : 400 }}>
      {used} / {max} words{over ? ' — too long' : ''}
    </div>
  );
}

function Radio({ name, label, options, value, onChange, error, describedBy }) {
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: '0 0 18px' }}>
      <legend className="dark-label" style={{ padding: 0, marginBottom: 6 }}>{label}</legend>
      <div className="apply-radio-group" role="radiogroup" aria-invalid={!!error} aria-describedby={error ? describedBy : undefined}>
        {options.map(opt => (
          <label key={opt} className={`apply-radio-pill${value === opt ? ' checked' : ''}`} style={{ minHeight: 44 }}>
            <input type="radio" name={name} value={opt} checked={value === opt} onChange={() => onChange(opt)} />
            {opt}
          </label>
        ))}
      </div>
      <FieldError id={describedBy} msg={error} />
    </fieldset>
  );
}

function SectionHeading({ letter, title }) {
  return (
    <div style={{ margin: '34px 0 18px' }}>
      <span className="apply-step-eyebrow">Section {letter}</span>
      <h3 className="apply-step-title" style={{ margin: '6px 0 0', fontSize: '1.3rem' }}>{title}</h3>
    </div>
  );
}

export default function ExhibitorForm() {
  const [f, setF] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const formRef = useRef(null);

  const closed = useMemo(() => Date.now() > APPLICATION_DEADLINE.getTime(), []);

  const set = (k, v) => {
    setF(prev => ({ ...prev, [k]: v }));
    setErrors(prev => (prev[k] ? { ...prev, [k]: '' } : prev));
  };
  const toggleDistrict = (d) => {
    setF(prev => ({ ...prev, districts: prev.districts.includes(d) ? prev.districts.filter(x => x !== d) : [...prev.districts, d] }));
    setErrors(prev => (prev.districts ? { ...prev, districts: '' } : prev));
  };

  const validate = () => {
    const e = {};
    const name = f.businessName.trim();
    if (name.length < 2 || name.length > 120) e.businessName = 'Enter the business name (2 to 120 characters).';
    if (!f.sector) e.sector = 'Choose a sector.';
    if (f.sector === 'Other' && !f.sectorOther.trim()) e.sectorOther = 'Tell us which sector.';
    if (f.sector === 'Other' && f.sectorOther.trim().length > 60) e.sectorOther = 'Keep this under 60 characters.';
    if (!f.yearStarted) e.yearStarted = 'Choose the year the business started.';
    if (!f.registrationStatus) e.registrationStatus = 'Choose a registration status.';
    if (f.districts.length === 0) e.districts = 'Choose at least one district.';

    const rep = f.repName.trim();
    if (rep.length < 2 || rep.length > 80) e.repName = 'Enter the representative’s full name (2 to 80 characters).';
    if (!f.repPosition.trim()) e.repPosition = 'Enter their position in the business.';
    if (f.repPosition.trim().length > 80) e.repPosition = 'Keep this under 80 characters.';
    if (stripSpaces(f.repWhatsapp).replace(/\D/g, '').length < 8) e.repWhatsapp = 'Enter a valid WhatsApp number.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.repEmail.trim())) e.repEmail = 'Enter a valid email address.';
    if (f.repAltPhone.trim() && stripSpaces(f.repAltPhone).replace(/\D/g, '').length < 8) e.repAltPhone = 'Enter a valid phone number, or leave it blank.';

    if (!f.exhibitDescription.trim()) e.exhibitDescription = 'Tell us what you will display.';
    else if (countWords(f.exhibitDescription) > 100) e.exhibitDescription = 'Keep this to 100 words or fewer.';
    if (!f.climateRelevance.trim()) e.climateRelevance = 'Tell us how your work helps.';
    else if (countWords(f.climateRelevance) > 150) e.climateRelevance = 'Keep this to 150 words or fewer.';
    if (!f.onSiteActivity) e.onSiteActivity = 'Choose what you will do on site.';
    if (f.recognition.length > 300) e.recognition = 'Keep this under 300 characters.';

    if (!f.needsPower) e.needsPower = 'Let us know if you need mains power.';
    if (f.needsPower === 'Yes' && !f.powerEquipment.trim()) e.powerEquipment = 'List the equipment you will plug in.';
    if (f.powerEquipment.length > 200) e.powerEquipment = 'Keep this under 200 characters.';
    if (!f.standSetup) e.standSetup = 'Choose your stand setup.';
    if (!f.staffCount) e.staffCount = 'Choose how many people will staff the stand.';
    if (!f.canAttendSetup) e.canAttendSetup = 'Let us know about set up on 6 October.';

    if (f.onlineLinks.length > 500) e.onlineLinks = 'Keep this under 500 characters.';

    if (!f.consentMedia) e.consentMedia = 'This consent is required to exhibit.';
    if (!f.consentTerms) e.consentTerms = 'You must confirm this to apply.';
    if (!f.signatureName.trim()) e.signatureName = 'Type your full name to sign.';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setSubmitError('');
    const e = validate();
    setErrors(e);
    const firstKey = Object.keys(e)[0];
    if (firstKey) {
      // Move the reader to the problem rather than leaving them to hunt for it.
      const el = formRef.current?.querySelector(`[name="${firstKey}"], #ex-${firstKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => { try { el.focus({ preventScroll: true }); } catch { /* not focusable */ } }, 300);
      }
      return;
    }

    setBusy(true);
    // A Firestore write does not reject on a struggling connection, it retries
    // indefinitely — without this the button would sit on "Sending…" for ever
    // with no way back. If the write does land late, the confirmation still
    // replaces the form.
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      setBusy(false);
      setSubmitError('This is taking longer than expected — your connection may be slow. Nothing you typed has been lost. Wait a moment, then try again.');
    }, 20000);
    try {
      await addDoc(collection(publicDb, 'exhibitorApplications'), {
        businessName: f.businessName.trim(),
        sector: f.sector,
        sectorOther: f.sector === 'Other' ? f.sectorOther.trim() : '',
        yearStarted: f.yearStarted,
        registrationStatus: f.registrationStatus,
        districts: f.districts,
        repName: f.repName.trim(),
        repPosition: f.repPosition.trim(),
        repWhatsapp: stripSpaces(f.repWhatsapp),
        repEmail: f.repEmail.trim().toLowerCase(),
        repAltPhone: stripSpaces(f.repAltPhone),
        exhibitDescription: f.exhibitDescription.trim(),
        climateRelevance: f.climateRelevance.trim(),
        onSiteActivity: f.onSiteActivity,
        recognition: f.recognition.trim(),
        needsPower: f.needsPower,
        powerEquipment: f.needsPower === 'Yes' ? f.powerEquipment.trim() : '',
        standSetup: f.standSetup,
        staffCount: Number(f.staffCount),
        canAttendSetup: f.canAttendSetup,
        onlineLinks: f.onlineLinks.trim(),
        consentMedia: f.consentMedia,
        consentTerms: f.consentTerms,
        signatureName: f.signatureName.trim(),
        submittedAt: serverTimestamp(),
        status: 'new',
        reviewNotes: '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      });
      setSent(true);
      setSubmitError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setSubmitError('We could not send your application. Please check your connection and try again — nothing you typed has been lost.');
    } finally {
      settled = true;
      clearTimeout(timer);
      setBusy(false);
    }
  };

  const keyFacts = (
    <div className="form-card" style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.18)', padding: 24, marginBottom: 32 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 18 }}>
        {[['Dates', '7 to 8 October 2026'], ['Venue', 'Freetown City Council Hall, Freetown'],
          ['Spaces', String(EXHIBITOR_CAP)], ['Deadline', '25 September 2026']].map(([k, v]) => (
          <div key={k}>
            <div className="apply-step-eyebrow">{k}</div>
            <div style={{ color: '#fff', fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: '1.05rem', marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const intro = (
    <div style={{ maxWidth: 780, marginBottom: 28 }}>
      <h2 style={{ color: '#fff', fontSize: '2.1rem', marginBottom: 18 }}>LCOY Sierra Leone 2026 green business exhibitor registration</h2>
      <p style={{ color: 'rgba(255,255,255,.8)', lineHeight: 1.65, marginBottom: 14 }}>
        Exhibition space at the Local Conference of Youth (LCOY) Sierra Leone 2026 is open to green businesses, social
        enterprises, and startups. The conference runs 7 to 8 October 2026 at Freetown City Council Hall, Freetown, with
        150 youth delegates from across the country, alongside policymakers, partners, and media.
      </p>
      <p style={{ color: 'rgba(255,255,255,.8)', lineHeight: 1.65, marginBottom: 14 }}>
        Spaces are limited to {EXHIBITOR_CAP}. Applications close 25 September 2026 and we confirm selected exhibitors by
        2 October 2026. Exhibition space is free of charge. Exhibitors supply their own roll up banner.
      </p>
      <p style={{ color: 'rgba(255,255,255,.8)', lineHeight: 1.65 }}>
        The form takes about 10 minutes. One representative registers on behalf of the business.
      </p>
    </div>
  );

  if (sent) {
    return (
      <>
        {intro}
        {keyFacts}
        <div className="apply-success">
          <div className="apply-success-icon">✓</div>
          <h3>Application received</h3>
          <p>
            Thank you for applying to exhibit at LCOY Sierra Leone 2026. We confirm selected exhibitors by 2 October 2026
            and will contact you on the WhatsApp number and email address you gave. For questions, contact{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--orange)' }}>{CONTACT_EMAIL}</a>.
          </p>
        </div>
      </>
    );
  }

  if (closed) {
    return (
      <>
        {intro}
        {keyFacts}
        <div className="apply-success">
          <h3>Exhibitor applications are closed</h3>
          <p>
            Applications to exhibit at LCOY Sierra Leone 2026 closed on 25 September 2026. We confirm selected exhibitors
            by 2 October 2026. For questions, contact{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--orange)' }}>{CONTACT_EMAIL}</a>.
          </p>
        </div>
      </>
    );
  }

  const input = (key, label, props = {}) => (
    <div className="field">
      <label className="dark-label" htmlFor={`ex-${key}`}>{label}</label>
      <input
        id={`ex-${key}`} name={key} className="input dark-input" value={f[key]}
        onChange={e => set(key, e.target.value)}
        aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `err-${key}` : undefined}
        {...props}
      />
      <FieldError id={`err-${key}`} msg={errors[key]} />
    </div>
  );

  return (
    <>
      {intro}
      {keyFacts}
      <form ref={formRef} className="form-card apply-card" onSubmit={submit} noValidate
        style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', backdropFilter: 'blur(8px)' }}>

        <SectionHeading letter="A" title="Business information" />
        {input('businessName', 'Business or organisation name', { maxLength: 120 })}
        <div className="field">
          <label className="dark-label" htmlFor="ex-sector">Sector</label>
          <select id="ex-sector" name="sector" className="select dark-input" value={f.sector} onChange={e => set('sector', e.target.value)}
            aria-invalid={!!errors.sector} aria-describedby={errors.sector ? 'err-sector' : undefined}>
            <option value="">Select a sector</option>
            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <FieldError id="err-sector" msg={errors.sector} />
        </div>
        {f.sector === 'Other' && input('sectorOther', 'If other, please specify', { maxLength: 60 })}
        <div className="field">
          <label className="dark-label" htmlFor="ex-yearStarted">Year the business started operating</label>
          <select id="ex-yearStarted" name="yearStarted" className="select dark-input" value={f.yearStarted} onChange={e => set('yearStarted', e.target.value)}
            aria-invalid={!!errors.yearStarted} aria-describedby={errors.yearStarted ? 'err-yearStarted' : undefined}>
            <option value="">Select a year</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <FieldError id="err-yearStarted" msg={errors.yearStarted} />
        </div>
        <Radio name="registrationStatus" label="Registration status" options={REGISTRATION_STATUS}
          value={f.registrationStatus} onChange={v => set('registrationStatus', v)} error={errors.registrationStatus} describedBy="err-registrationStatus" />
        <fieldset className="field" style={{ border: 0, padding: 0, margin: '0 0 18px' }}>
          <legend className="dark-label" style={{ padding: 0, marginBottom: 6 }}>District or districts where you operate</legend>
          <div className="apply-checkbox-grid" id="ex-districts">
            {DISTRICTS.map(d => (
              <label key={d} className={`apply-checkbox-item${f.districts.includes(d) ? ' checked' : ''}`} style={{ minHeight: 44 }}>
                <input type="checkbox" checked={f.districts.includes(d)} onChange={() => toggleDistrict(d)} />
                {d}
              </label>
            ))}
          </div>
          <FieldError id="err-districts" msg={errors.districts} />
        </fieldset>

        <SectionHeading letter="B" title="Representative" />
        {input('repName', 'Full name', { maxLength: 80 })}
        {input('repPosition', 'Position in the business', { maxLength: 80 })}
        {input('repWhatsapp', 'WhatsApp number', { type: 'tel', placeholder: '+232 ...' })}
        {input('repEmail', 'Email address', { type: 'email', placeholder: 'you@example.com' })}
        {input('repAltPhone', 'Alternative phone number (optional)', { type: 'tel', placeholder: '+232 ...' })}

        <SectionHeading letter="C" title="What you will exhibit" />
        <div className="field">
          <label className="dark-label" htmlFor="ex-exhibitDescription">What products, services, or innovations will you display or demonstrate at your stand?</label>
          <textarea id="ex-exhibitDescription" name="exhibitDescription" className="textarea dark-input" rows={4}
            value={f.exhibitDescription} onChange={e => set('exhibitDescription', e.target.value)}
            aria-invalid={!!errors.exhibitDescription} aria-describedby={errors.exhibitDescription ? 'err-exhibitDescription' : undefined} />
          <WordCount used={countWords(f.exhibitDescription)} max={100} />
          <FieldError id="err-exhibitDescription" msg={errors.exhibitDescription} />
        </div>
        <div className="field">
          <label className="dark-label" htmlFor="ex-climateRelevance">How does your work cut emissions, reduce waste, or help communities adapt to climate impacts?</label>
          <textarea id="ex-climateRelevance" name="climateRelevance" className="textarea dark-input" rows={5}
            value={f.climateRelevance} onChange={e => set('climateRelevance', e.target.value)}
            aria-invalid={!!errors.climateRelevance} aria-describedby={errors.climateRelevance ? 'err-climateRelevance' : undefined} />
          <WordCount used={countWords(f.climateRelevance)} max={150} />
          <FieldError id="err-climateRelevance" msg={errors.climateRelevance} />
        </div>
        <Radio name="onSiteActivity" label="On site activity" options={ON_SITE_ACTIVITY}
          value={f.onSiteActivity} onChange={v => set('onSiteActivity', v)} error={errors.onSiteActivity} describedBy="err-onSiteActivity" />
        <div className="field">
          <label className="dark-label" htmlFor="ex-recognition">Certifications, awards, or partnerships with climate or environmental organisations (optional)</label>
          <textarea id="ex-recognition" name="recognition" className="textarea dark-input" rows={3} maxLength={300}
            value={f.recognition} onChange={e => set('recognition', e.target.value)} />
          <FieldError id="err-recognition" msg={errors.recognition} />
        </div>

        <SectionHeading letter="D" title="Stand requirements" />
        <Radio name="needsPower" label="Do you need mains power at your stand?" options={['Yes', 'No']}
          value={f.needsPower} onChange={v => set('needsPower', v)} error={errors.needsPower} describedBy="err-needsPower" />
        {f.needsPower === 'Yes' && (
          <div className="field">
            <label className="dark-label" htmlFor="ex-powerEquipment">List the equipment you will plug in</label>
            <textarea id="ex-powerEquipment" name="powerEquipment" className="textarea dark-input" rows={3} maxLength={200}
              value={f.powerEquipment} onChange={e => set('powerEquipment', e.target.value)}
              aria-invalid={!!errors.powerEquipment} aria-describedby={errors.powerEquipment ? 'err-powerEquipment' : undefined} />
            <FieldError id="err-powerEquipment" msg={errors.powerEquipment} />
          </div>
        )}
        <Radio name="standSetup" label="Stand setup" options={STAND_SETUP}
          value={f.standSetup} onChange={v => set('standSetup', v)} error={errors.standSetup} describedBy="err-standSetup" />
        <Radio name="staffCount" label="How many people will staff your stand each day?" options={['1', '2', '3']}
          value={f.staffCount} onChange={v => set('staffCount', v)} error={errors.staffCount} describedBy="err-staffCount" />
        <Radio name="canAttendSetup" label="Can a representative attend set up on the afternoon of 6 October 2026?" options={['Yes', 'No']}
          value={f.canAttendSetup} onChange={v => set('canAttendSetup', v)} error={errors.canAttendSetup} describedBy="err-canAttendSetup" />

        <SectionHeading letter="E" title="Online presence" />
        <div className="field">
          <label className="dark-label" htmlFor="ex-onlineLinks">Website and social media links (optional)</label>
          <textarea id="ex-onlineLinks" name="onlineLinks" className="textarea dark-input" rows={3} maxLength={500}
            placeholder="one link per line" value={f.onlineLinks} onChange={e => set('onlineLinks', e.target.value)} />
          <FieldError id="err-onlineLinks" msg={errors.onlineLinks} />
        </div>

        <SectionHeading letter="F" title="Declarations" />
        <label className={`apply-checkbox-item${f.consentMedia ? ' checked' : ''}`} style={{ alignItems: 'flex-start', minHeight: 44, marginBottom: 10 }}>
          <input type="checkbox" name="consentMedia" checked={f.consentMedia} onChange={e => set('consentMedia', e.target.checked)} style={{ marginTop: 3 }} />
          <span>I consent to LCOY Sierra Leone photographing and filming my stand, and using my business name and logo in event materials and reporting.</span>
        </label>
        <FieldError id="err-consentMedia" msg={errors.consentMedia} />
        <label className={`apply-checkbox-item${f.consentTerms ? ' checked' : ''}`} style={{ alignItems: 'flex-start', minHeight: 44, margin: '10px 0' }}>
          <input type="checkbox" name="consentTerms" checked={f.consentTerms} onChange={e => set('consentTerms', e.target.checked)} style={{ marginTop: 3 }} />
          <span>I confirm the information given is accurate, and I agree to the exhibition guidelines and code of conduct, including supplying my own roll up banner.</span>
        </label>
        <FieldError id="err-consentTerms" msg={errors.consentTerms} />
        <div className="field" style={{ marginTop: 18 }}>
          <label className="dark-label" htmlFor="ex-signatureName">Full name</label>
          <input id="ex-signatureName" name="signatureName" className="input dark-input" value={f.signatureName}
            onChange={e => set('signatureName', e.target.value)}
            aria-invalid={!!errors.signatureName} aria-describedby={errors.signatureName ? 'err-signatureName' : undefined} />
          <div style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.55)', marginTop: 4 }}>Type your full name to sign this application.</div>
          <FieldError id="err-signatureName" msg={errors.signatureName} />
        </div>

        {submitError && <div className="apply-error-block" style={{ marginTop: 18 }}>{submitError}</div>}
        {Object.keys(errors).length > 0 && !submitError && (
          <div className="apply-error-block" style={{ marginTop: 18 }}>Please check the highlighted fields above.</div>
        )}

        <button type="submit" className="btn btn-primary" disabled={busy} style={{ marginTop: 22, width: '100%', justifyContent: 'center' }}>
          {busy ? 'Sending…' : 'Submit exhibitor application'}
        </button>
      </form>
    </>
  );
}
