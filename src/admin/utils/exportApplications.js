import * as XLSX from 'xlsx';

function fmtDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// "Yes — details" style fields where the details only apply when the answer is Yes.
function yesWithDetails(answer, details) {
  return answer === 'Yes' ? `Yes — ${details || ''}` : (answer || '');
}

// Checkbox-style fields that may include a free-text "Other" entry.
function listWithOther(list, other) {
  return (list || []).map((v) => (v === 'Other' ? `Other — ${other || ''}` : v)).join(', ');
}

function otherAware(value, other) {
  return value === 'Other' ? `Other — ${other || ''}` : (value || '');
}

const COLUMNS = [
  { header: 'Full Name', get: (a) => a.fullName || '' },
  { header: 'Email', get: (a) => a.email || '' },
  { header: 'Phone', get: (a) => a.phone || '' },
  { header: 'Institution / Organisation', get: (a) => a.institution || '' },
  { header: 'Gender', get: (a) => a.gender || '' },
  { header: 'Date of Birth', get: (a) => a.dob || '' },
  { header: 'Age at Conference', get: (a) => a.ageAtConference ?? '' },
  { header: 'Region', get: (a) => a.region || '' },
  { header: 'District', get: (a) => a.district || '' },
  { header: 'Disability', get: (a) => yesWithDetails(a.disability, a.disabilityDetails) },
  { header: 'Dietary Concerns', get: (a) => yesWithDetails(a.dietary, a.dietaryDetails) },
  { header: 'Attended LCOY/RCOY/COY/COP Before', get: (a) => yesWithDetails(a.priorAttendance, a.priorAttendanceDetails) },
  { header: 'Sectors of Interest', get: (a) => listWithOther(a.sectors, a.sectorsOther) },
  { header: 'Climate Topics', get: (a) => listWithOther(a.climateTopics, a.climateTopicsOther) },
  { header: 'Why Participate?', get: (a) => a.essayWhy || '' },
  { header: 'Community Challenge', get: (a) => a.essayChallenge || '' },
  { header: 'Hopes to Learn', get: (a) => a.essayLearn || '' },
  { header: 'Climate Leadership (One Sentence)', get: (a) => a.leadershipSentence || '' },
  { header: "How They'll Apply It", get: (a) => a.applyPlan || '' },
  { header: 'Solutions Already Implemented', get: (a) => a.climateSolutions || '' },
  { header: 'Policy They Would Influence', get: (a) => a.policyInfluence || '' },
  { header: 'Contact Preference', get: (a) => otherAware(a.contactPreference, a.contactPreferenceOther) },
  { header: 'Heard About This Via', get: (a) => otherAware(a.source, a.sourceOther) },
  { header: 'Status', get: (a) => a.status || '' },
  { header: 'Badge Code', get: (a) => a.assignedCode || '' },
  { header: 'Submitted At', get: (a) => fmtDate(a.submittedAt) },
  { header: 'Notified Decision', get: (a) => a.notifiedDecision || '' },
  { header: 'Notified At', get: (a) => fmtDate(a.notifiedAt) },
];

// A safe, readable column width for each header: wide for free-text essay
// answers, narrow for short fields — capped so a huge essay doesn't blow the
// sheet out to an unusable width.
function widthFor(header) {
  const longFields = new Set([
    'Why Participate?', 'Community Challenge', 'Hopes to Learn', "How They'll Apply It",
    'Solutions Already Implemented', 'Policy They Would Influence', 'Climate Leadership (One Sentence)',
  ]);
  if (longFields.has(header)) return 60;
  if (header === 'Institution / Organisation' || header === 'Full Name') return 28;
  if (header === 'Email') return 26;
  return Math.max(14, Math.min(22, header.length + 4));
}

export function downloadApplicationsExcel(list, label = 'Applications') {
  const rows = list.map((a) => Object.fromEntries(COLUMNS.map((c) => [c.header, c.get(a)])));
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: COLUMNS.map((c) => c.header) });
  worksheet['!cols'] = COLUMNS.map((c) => ({ wch: widthFor(c.header) }));
  worksheet['!autofilter'] = { ref: worksheet['!ref'] };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Applications');

  const safeLabel = label.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'Applications';
  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `lcoy2026_${safeLabel}_${dateStamp}.xlsx`);
}
