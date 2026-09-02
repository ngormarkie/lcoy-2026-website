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

export const WORKING_GROUPS = [
  'Steering Committee',
  'Programme & Policy Committee',
  'Logistics Committee',
  'Registration, Accreditation & Protocol Committee',
  'Finance & Fundraising Committee',
  'Communications & Media Committee',
];
