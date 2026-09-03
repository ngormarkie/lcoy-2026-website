import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

// ---------- CSV parsing (handles quoted fields with commas/newlines) ----------
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false, i = 0;
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i += 2; continue; } inQuotes = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

// ---------- Field definitions: what we need, and likely header text from the
// original Google Form to auto-match against (admin can override any of these). ----------
const FIELD_DEFS = [
  { key: 'timestamp', label: 'Timestamp (submission date)', required: false, candidates: ['Timestamp'] },
  { key: 'fullName', label: 'Full Name', required: true, candidates: ['Full Name'] },
  { key: 'gender', label: 'Gender', required: false, candidates: ['Gender'] },
  { key: 'dob', label: 'Date of Birth', required: false, candidates: ['Date of Birth'] },
  { key: 'email', label: 'Email Address', required: true, candidates: ['Email Address'] },
  { key: 'phone', label: 'Phone Number', required: false, candidates: ['Phone Number(Preferably Whatsapp)', 'Phone Number (Preferably Whatsapp)', 'Phone Number'] },
  { key: 'region', label: 'Region', required: false, candidates: ['REGION', 'Region'] },
  { key: 'district', label: 'District', required: false, candidates: ['District'] },
  { key: 'institution', label: 'Institution/Organization', required: false, candidates: ['Institution/Organization', 'Institution/Organisation'] },
  { key: 'disability', label: 'Living with a disability?', required: false, candidates: ['Are you a person living with a disability? If "yes" please specify on the "other" option.', 'Are you a person living with a disability?'] },
  { key: 'dietary', label: 'Dietary concerns?', required: false, candidates: ['Do you have any dietary concerns? If "yes" please specify on the "other" option.', 'Do you have any dietary concerns?'] },
  { key: 'priorAttendance', label: 'Attended LCOY/RCOY/COY/COP before?', required: false, candidates: ['Have you ever attended a LCOY, RCOY, COY or COP before?'] },
  { key: 'priorAttendanceDetails', label: 'Attended before — details', required: false, candidates: ['If "yes", please specify with details.'] },
  { key: 'sectors', label: 'Sectors of interest', required: false, candidates: ['Which sector best describes your interest? (Select all that apply)'] },
  { key: 'essayWhy', label: 'Why participate?', required: false, candidates: ['Why do you want to participate in LCOY Sierra Leone 2026? (250 words max)'] },
  { key: 'essayChallenge', label: 'Community challenge', required: false, candidates: ['What climate or environmental challenge affects your community the most? (150 words max)'] },
  { key: 'essayLearn', label: 'Hopes to learn', required: false, candidates: ['What do you hope to learn from LCOY Sierra Leone 2026? (100 words max)'] },
  { key: 'leadershipSentence', label: 'Climate leadership, in one sentence', required: false, candidates: ['In one sentence what does climate leadership mean to you?'] },
  { key: 'applyPlan', label: "How they'll apply it", required: false, candidates: ['How do you plan to apply what you have learnt from the conference to your community?'] },
  { key: 'climateTopics', label: 'Climate topics', required: false, candidates: ['Which climate topics interest you the most? (Select all that apply)'] },
  { key: 'climateSolutions', label: 'Solutions already implemented', required: false, candidates: ['Mention one (1) or more climate solutions you have implemented in your community or Sierra Leone as a whole.'] },
  { key: 'policyInfluence', label: 'Policy they would influence', required: false, candidates: ['If you could influence one national climate policy, what would it be and why?'] },
  { key: 'contactPreference', label: 'Contact preference', required: false, candidates: ['How easily do you think you can communicate with you if you are successful?'] },
  { key: 'source', label: 'Heard about it via', required: false, candidates: ['How did you know about this application?'] },
  { key: 'declaration', label: 'Declaration (Yes/No)', required: false, candidates: ['I confirm the information provided is accurate. I understand that submission does not guarantee selection. If selected, I commit to participating fully and respecting the Code of Conduct.'] },
];

function bestHeaderMatch(headers, candidates) {
  for (const cand of candidates) { const h = headers.find(x => x.trim() === cand.trim()); if (h) return h; }
  for (const cand of candidates) { const h = headers.find(x => x.trim().toLowerCase() === cand.trim().toLowerCase()); if (h) return h; }
  for (const cand of candidates) {
    const key = cand.slice(0, 25).toLowerCase();
    const h = headers.find(x => x.toLowerCase().includes(key) || key.includes(x.toLowerCase()));
    if (h) return h;
  }
  return '';
}

// ---------- Value transforms: old Google Form answer shapes -> our schema ----------
const SECTOR_OPTIONS = [
  'Agriculture & Food Systems', 'Environment & Climate Change', 'Energy (Renewable & Non-renewable)',
  'Water, Sanitation & Hygiene (WASH)', 'Education & Youth Development', 'Health & Public Health',
  'Governance, Policy & Public Administration', 'Business, Entrepreneurship & Innovation',
  'Science & Technology (STEM)', 'Media, Communications & Journalism', 'Forestry, Biodiversity & Conservation', 'Arts & Culture',
];
const CLIMATE_TOPIC_OPTIONS = [
  'Climate Adaptation', 'Climate Mitigation', 'Renewable Energy', 'Climate Finance', 'Gender & Climate',
  'Agriculture & Food Security', 'Biodiversity & Ecosystems', 'Youth Advocacy & Policy', 'Disaster Risk Reduction', 'Water & Sanitation',
];
const CONFERENCE_DATE = new Date(Date.UTC(2026, 9, 7));

function parseDOB(raw) {
  const s = (raw || '').trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return { year: +m[1], month: +m[2], day: +m[3] };
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/); // old form's stated MM/DD/YYYY
  if (m) return { year: +m[3], month: +m[1], day: +m[2] };
  return null;
}
function calcAge({ year, month, day }) {
  const dob = new Date(Date.UTC(year, month - 1, day));
  let age = CONFERENCE_DATE.getUTCFullYear() - dob.getUTCFullYear();
  const before = (CONFERENCE_DATE.getUTCMonth() < dob.getUTCMonth()) || (CONFERENCE_DATE.getUTCMonth() === dob.getUTCMonth() && CONFERENCE_DATE.getUTCDate() < dob.getUTCDate());
  return before ? age - 1 : age;
}
function mapYesNoOther(raw) {
  const s = (raw || '').trim();
  if (/^yes$/i.test(s)) return { value: 'Yes', details: '' };
  if (/^no$/i.test(s)) return { value: 'No', details: '' };
  if (!s) return { value: '', details: '' };
  return { value: 'Yes', details: s };
}
function mapYesNo(raw) {
  const s = (raw || '').trim();
  if (/^yes$/i.test(s)) return 'Yes';
  if (/^no$/i.test(s)) return 'No';
  return '';
}
function mapMultiSelect(raw, known) {
  let remaining = raw || '';
  const found = [];
  for (const opt of [...known].sort((a, b) => b.length - a.length)) {
    const idx = remaining.toLowerCase().indexOf(opt.toLowerCase());
    if (idx !== -1) { found.push(opt); remaining = remaining.slice(0, idx) + remaining.slice(idx + opt.length); }
  }
  const other = remaining.split(',').map(x => x.trim()).filter(Boolean).join('; ');
  if (other) found.push('Other');
  return { selected: found, other };
}
function mapContactPreference(raw) {
  const s = (raw || '').trim();
  const canon = ['Email Address', 'WhatsApp', 'Phone Call'];
  const m = canon.find(c => c.toLowerCase() === s.toLowerCase());
  if (m) return { value: m, other: '' };
  if (!s) return { value: '', other: '' };
  return { value: 'Other', other: s };
}
function mapSource(raw) {
  const s = (raw || '').trim();
  if (/^organi[sz]ation$/i.test(s)) return { value: 'Organisation', other: '' };
  if (/social media/i.test(s)) return { value: 'Social Media (LinkedIn, WhatsApp, Facebook, Instagram etc.)', other: '' };
  if (/^email address$/i.test(s)) return { value: 'Other', other: 'Email Address (source field from prior form)' };
  if (!s) return { value: '', other: '' };
  return { value: 'Other', other: s };
}
function parseTimestamp(raw) {
  const s = (raw || '').trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '');

function mapRow(cells, headerIndex, mapping) {
  const get = (key) => { const h = mapping[key]; if (!h) return ''; const idx = headerIndex[h]; return idx == null ? '' : (cells[idx] || '').trim(); };

  const email = get('email').toLowerCase();
  if (!isValidEmail(email)) return { skip: 'invalid_email' };

  const dob = parseDOB(get('dob'));
  const disability = mapYesNoOther(get('disability'));
  const dietary = mapYesNoOther(get('dietary'));
  const prior = mapYesNo(get('priorAttendance'));
  const sectors = mapMultiSelect(get('sectors'), SECTOR_OPTIONS);
  const topics = mapMultiSelect(get('climateTopics'), CLIMATE_TOPIC_OPTIONS);
  const contact = mapContactPreference(get('contactPreference'));
  const source = mapSource(get('source'));
  const declarationRaw = get('declaration').trim();
  const declared = /^yes$/i.test(declarationRaw);
  const ts = parseTimestamp(get('timestamp'));

  return {
    doc: {
      fullName: get('fullName'),
      gender: /^female$/i.test(get('gender')) ? 'Female' : /^male$/i.test(get('gender')) ? 'Male' : get('gender'),
      dob: dob ? `${dob.year}-${String(dob.month).padStart(2, '0')}-${String(dob.day).padStart(2, '0')}` : '',
      ageAtConference: dob ? calcAge(dob) : null,
      email,
      phone: get('phone'),
      region: get('region'),
      district: get('district'),
      institution: get('institution'),
      disability: disability.value, disabilityDetails: disability.details,
      dietary: dietary.value, dietaryDetails: dietary.details,
      priorAttendance: prior, priorAttendanceDetails: get('priorAttendanceDetails'),
      sectors: sectors.selected, sectorsOther: sectors.other,
      climateTopics: topics.selected, climateTopicsOther: topics.other,
      essayWhy: get('essayWhy'), essayChallenge: get('essayChallenge'), essayLearn: get('essayLearn'),
      leadershipSentence: get('leadershipSentence'), applyPlan: get('applyPlan'),
      climateSolutions: get('climateSolutions'), policyInfluence: get('policyInfluence'),
      contactPreference: contact.value, contactPreferenceOther: contact.other,
      source: source.value, sourceOther: source.other,
      declarationAccurate: declared, declarationNoGuarantee: declared, declarationCodeOfConduct: declared,
      status: 'pending',
      importSource: 'google_form',
      submittedAt: ts || serverTimestamp(),
    },
    declarationWasNo: declarationRaw !== '' && !declared,
  };
}

export default function ImportApplications() {
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [dataRows, setDataRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const headerIndex = useMemo(() => Object.fromEntries(headers.map((h, i) => [h, i])), [headers]);

  const handleFile = (file) => {
    if (!file) return;
    setError(''); setResult(null); setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const rows = parseCSV(String(e.target.result));
        if (rows.length < 2) { setError('No data rows found in this file.'); return; }
        const hdrs = rows[0].map(h => h.trim());
        setHeaders(hdrs);
        setDataRows(rows.slice(1));
        const auto = {};
        FIELD_DEFS.forEach(f => { auto[f.key] = bestHeaderMatch(hdrs, f.candidates); });
        setMapping(auto);
      } catch (err) { console.error(err); setError('Could not read this file. Make sure it is a CSV export.'); }
    };
    reader.readAsText(file);
  };

  const preview = useMemo(() => {
    if (!dataRows.length) return [];
    return dataRows.slice(0, 3).map(cells => mapRow(cells, headerIndex, mapping));
  }, [dataRows, headerIndex, mapping]);

  const runImport = async () => {
    if (!confirm(`Import ${dataRows.length} rows from "${fileName}" as pending applications? This cannot be undone automatically (you can delete individual applications afterwards).`)) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const existingSnap = await getDocs(collection(db, 'applications'));
      const existingEmails = new Set();
      existingSnap.forEach(d => existingEmails.add(d.id));

      const seenInFile = new Map(); // email -> mapped doc (last one wins)
      let invalidEmail = 0, declarationNo = 0;
      for (const cells of dataRows) {
        const mapped = mapRow(cells, headerIndex, mapping);
        if (mapped.skip) { invalidEmail++; continue; }
        if (mapped.declarationWasNo) declarationNo++;
        seenInFile.set(mapped.doc.email, mapped.doc);
      }

      let alreadyExists = 0, toImport = [];
      for (const [email, docData] of seenInFile) {
        if (existingEmails.has(email)) { alreadyExists++; continue; }
        toImport.push({ email, docData });
      }

      const chunkSize = 200; // 2 writes per row, stays under the 500-op batch limit
      for (let i = 0; i < toImport.length; i += chunkSize) {
        const batch = writeBatch(db);
        toImport.slice(i, i + chunkSize).forEach(({ email, docData }) => {
          batch.set(doc(db, 'applications', email), docData);
          batch.set(doc(db, 'applicationEmails', email), { submittedAt: docData.submittedAt });
        });
        await batch.commit();
      }

      setResult({
        imported: toImport.length,
        duplicatesInFile: dataRows.length - invalidEmail - seenInFile.size,
        alreadyExists, invalidEmail, declarationNo,
      });
    } catch (e) {
      console.error(e);
      setError('Import failed partway through: ' + (e.message || e) + '. Check the Applications list to see what went through before retrying (already-imported rows will be skipped safely next time).');
    }
    setBusy(false);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <header className="page-header">
        <div>
          <span className="dashboard-eyebrow">One-time import</span>
          <h1>Import applications from Google Form</h1>
          <p className="text-muted" style={{ marginTop: '0.25rem' }}>
            <Link to="/admin/applications">← Back to Applications</Link>
          </p>
        </div>
      </header>

      <div className="card-elevated" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3>1. Export and upload the CSV</h3>
        <p className="text-muted text-sm" style={{ marginTop: '0.35rem', marginBottom: '1rem' }}>
          In the Google Form, open the linked response Sheet → File → Download → Comma Separated Values (.csv). Upload that file here — nothing is sent anywhere, it's read in your browser.
        </p>
        <input type="file" accept=".csv,text/csv" onChange={e => handleFile(e.target.files?.[0])} />
        {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}
      </div>

      {headers.length > 0 && (
        <>
          <div className="card-elevated" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3>2. Check the column mapping</h3>
            <p className="text-muted text-sm" style={{ marginTop: '0.35rem', marginBottom: '1rem' }}>
              Matched automatically from the column headers — {dataRows.length} rows detected in "{fileName}". Fix any that look wrong before importing.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem 1.5rem' }}>
              {FIELD_DEFS.map(f => (
                <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'space-between' }}>
                  <label className="text-sm" style={{ flexShrink: 0, minWidth: 190 }}>{f.label}{f.required && ' *'}</label>
                  <select className="select" value={mapping[f.key] || ''} onChange={e => setMapping(m => ({ ...m, [f.key]: e.target.value }))} style={{ flex: 1 }}>
                    <option value="">— not mapped —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {!mapping.email && <div className="alert alert-error" style={{ marginTop: '1rem' }}>Email Address must be mapped — it's used to prevent duplicate applications.</div>}
          </div>

          <div className="card-elevated" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3>3. Preview (first 3 rows)</h3>
            <div style={{ overflowX: 'auto', marginTop: '0.75rem' }}>
              <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                <thead><tr style={{ textAlign: 'left', color: 'var(--ink-muted)' }}><th style={{ padding: '0.3rem 0.5rem 0.3rem 0' }}>Name</th><th style={{ padding: '0.3rem 0.5rem' }}>Email</th><th style={{ padding: '0.3rem 0.5rem' }}>Region</th><th style={{ padding: '0.3rem 0.5rem' }}>Age</th><th style={{ padding: '0.3rem 0.5rem' }}>Declared</th></tr></thead>
                <tbody>
                  {preview.map((p, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--paper-dark)' }}>
                      {p.skip ? (
                        <td colSpan={5} style={{ padding: '0.4rem 0', color: 'var(--crimson)' }}>Row skipped — no valid email address</td>
                      ) : (
                        <>
                          <td style={{ padding: '0.4rem 0.5rem 0.4rem 0' }}>{p.doc.fullName || '—'}</td>
                          <td style={{ padding: '0.4rem 0.5rem' }} className="font-mono">{p.doc.email}</td>
                          <td style={{ padding: '0.4rem 0.5rem' }}>{p.doc.region || '—'}</td>
                          <td style={{ padding: '0.4rem 0.5rem' }}>{p.doc.ageAtConference ?? '—'}</td>
                          <td style={{ padding: '0.4rem 0.5rem' }}>{p.declarationWasNo ? <span style={{ color: 'var(--crimson)' }}>No</span> : 'Yes'}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card-elevated" style={{ padding: '1.5rem' }}>
            <h3>4. Import</h3>
            <p className="text-muted text-sm" style={{ marginTop: '0.35rem', marginBottom: '1rem' }}>
              Imported rows land as <strong>pending</strong> applications, same as the live form, and go through the same shortlist → accept review. Rows whose email already has an application here are skipped automatically (nothing is overwritten). District is imported as free text exactly as typed on the old form, so it may not match the dropdown list used on the live form — worth a glance before relying on it for regional balance reporting.
            </p>
            {result && (
              <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                Imported {result.imported}. Skipped: {result.alreadyExists} already had an application, {result.duplicatesInFile} were repeated within the file (kept the last), {result.invalidEmail} had no valid email.
                {result.declarationNo > 0 && <> {result.declarationNo} imported row(s) had declared "No" on the old form — worth reviewing before accepting.</>}
              </div>
            )}
            <button className="btn btn-primary btn-lg" disabled={busy || !mapping.email || dataRows.length === 0} onClick={runImport}>
              {busy ? 'Importing…' : `Import ${dataRows.length} rows`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
