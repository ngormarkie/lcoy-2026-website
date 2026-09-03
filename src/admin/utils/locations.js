export const REGIONS_DISTRICTS = {
  'Northern Region': ['Bombali', 'Falaba', 'Koinadugu', 'Tonkolili'],
  'Western Area': ['Western Area Urban', 'Western Area Rural'],
  'Eastern Region': ['Kailahun', 'Kenema', 'Kono'],
  'Southern Region': ['Bo', 'Bonthe', 'Moyamba', 'Pujehun'],
  'North-Western Region': ['Kambia', 'Karene', 'Port Loko'],
};

export const REGIONS = Object.keys(REGIONS_DISTRICTS);

export function getDistricts(region) {
  return REGIONS_DISTRICTS[region] || [];
}

export const ALL_DISTRICTS = Object.values(REGIONS_DISTRICTS).flat();

export function getRegionForDistrict(district) {
  return REGIONS.find(r => REGIONS_DISTRICTS[r].includes(district)) || '';
}

// Known free-text variants seen on the old Google Form (which had District
// as a plain text box), mapped to the canonical district they refer to.
// Deliberately conservative — only well-known town/alias names, not a full
// gazetteer, since a wrong auto-guess on real applicant data is worse than
// leaving it for manual review. Extend this list as new variants turn up in
// the "Fix districts" cleanup tool.
const DISTRICT_ALIASES = {
  'freetown': 'Western Area Urban',
  'freetown city': 'Western Area Urban',
  'fna': 'Western Area Urban',
  'western urban': 'Western Area Urban',
  'wau': 'Western Area Urban',
  'west urban': 'Western Area Urban',
  'western area urban': 'Western Area Urban',
  'western area (urban)': 'Western Area Urban',
  'waterloo': 'Western Area Rural',
  'western rural': 'Western Area Rural',
  'war': 'Western Area Rural',
  'west rural': 'Western Area Rural',
  'western area rural': 'Western Area Rural',
  'western area (rural)': 'Western Area Rural',
  'hastings': 'Western Area Rural',
  'regent': 'Western Area Rural',
  'newton': 'Western Area Rural',
  'makeni': 'Bombali',
  'kabala': 'Koinadugu',
  'magburaka': 'Tonkolili',
  'mile 91': 'Tonkolili',
  'bo town': 'Bo',
  'bo city': 'Bo',
  'kenema town': 'Kenema',
  'kenema city': 'Kenema',
  'kailahun town': 'Kailahun',
  'koidu': 'Kono',
  'koidu town': 'Kono',
  'kono town': 'Kono',
  'moyamba town': 'Moyamba',
  'bonthe town': 'Bonthe',
  'bonthe island': 'Bonthe',
  'mattru': 'Bonthe',
  'mattru jong': 'Bonthe',
  'pujehun town': 'Pujehun',
  'kambia town': 'Kambia',
  'port loko town': 'Port Loko',
  'lunsar': 'Port Loko',
  'kamakwie': 'Karene',
};

// Returns a canonical district name when confident (exact match or a known
// alias), otherwise returns the trimmed input unchanged so it can be caught
// by the "Fix districts" review tool rather than silently mis-mapped.
export function normalizeDistrict(raw) {
  const s = (raw || '').trim();
  if (!s) return '';
  const exact = ALL_DISTRICTS.find(d => d.toLowerCase() === s.toLowerCase());
  if (exact) return exact;
  const alias = DISTRICT_ALIASES[s.toLowerCase()];
  if (alias) return alias;
  return s;
}

export const WORKING_GROUPS = [
  'Steering Committee',
  'Programme & Policy Committee',
  'Logistics Committee',
  'Registration, Accreditation & Protocol Committee',
  'Finance & Fundraising Committee',
  'Communications & Media Committee',
];
