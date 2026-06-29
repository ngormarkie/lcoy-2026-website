export const REGIONS_DISTRICTS = {
  'Western Area': ['Western Area Urban', 'Western Area Rural'],
  'North West': ['Kambia', 'Karene', 'Port Loko'],
  'North': ['Bombali', 'Falaba', 'Koinadugu', 'Tonkolili'],
  'South': ['Bo', 'Bonthe', 'Moyamba', 'Pujehun'],
  'East': ['Kailahun', 'Kenema', 'Kono'],
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
