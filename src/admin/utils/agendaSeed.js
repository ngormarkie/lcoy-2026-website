// The draft LCOY26 conference programme, transcribed from the organising
// team's agenda document (public/AGENDA_PROGRAM LCOY.md) for one-time import
// into the `sessions` collection via the Import Agenda admin page.
//
// Deliberately carries no speaker/facilitator names — only session, day,
// time and venue. Speakers can be added per-session in the Sessions admin
// page later if wanted.
//
// Venues: the agenda labels the two parallel tracks "Room A" and "Room B".
//   Room A = Main Hall, Fourth Floor
//   Room B = Breakout Room, Third Floor
// Plenary/ceremony sessions are placed in the Main Hall; meals and health
// breaks are left without a venue rather than inventing one.

export const MAIN_HALL = 'Main Hall (4th Floor)';
export const BREAKOUT_ROOM = 'Breakout Room (3rd Floor)';

const DAY_1 = 'Day 1 — 7 October';
const DAY_2 = 'Day 2 — 8 October';

// allowRegistration is set only on the parallel tracks, where a delegate has
// to pick one of two rooms. Sessions everyone attends together need no sign-up.
export const AGENDA_SEED = [
  // ---------- DAY 1 — Wednesday, 7 October 2026: Foundations & Dialogue ----------
  { day: DAY_1, time: '08:00 – 09:00', type: 'Other', room: MAIN_HALL, title: 'Registration, badge collection & welcome coffee' },
  { day: DAY_1, time: '09:00 – 09:20', type: 'Ceremony', room: MAIN_HALL, title: 'Opening Ceremony — National Anthem & Welcome Remarks' },
  { day: DAY_1, time: '09:20 – 11:00', type: 'Plenary', room: MAIN_HALL, title: 'Addresses' },
  { day: DAY_1, time: '12:00 – 12:30', type: 'Plenary', room: MAIN_HALL, title: 'Keynote Address' },
  { day: DAY_1, time: '12:30 – 12:40', type: 'Other', room: '', title: 'Group photo & health break' },
  {
    day: DAY_1, time: '12:45 – 13:30', type: 'Panel', room: MAIN_HALL,
    title: 'Plenary Panel 1: State of Climate Action in Sierra Leone',
    description: 'Challenges, Opportunities, and Youth Leadership.',
  },
  {
    day: DAY_1, time: '13:30 – 14:00', type: 'Breakout', room: MAIN_HALL, allowRegistration: true,
    title: 'Panel Session 1: Sustainable Food Systems',
    description: 'Empowering Youth Innovation & Inclusive Solutions for Agricultural Resilience, Biodiversity, and Food Systems.',
  },
  {
    day: DAY_1, time: '13:30 – 14:00', type: 'Breakout', room: BREAKOUT_ROOM, allowRegistration: true,
    title: 'Panel Session 2: Sustainable Energy',
    description: 'Harnessing Youth Innovation & Inclusive Approaches for Renewable Solutions, Climate Resilience, and Loss & Damage.',
  },
  { day: DAY_1, time: '14:00 – 15:00', type: 'Other', room: '', title: 'Lunch & networking session' },
  {
    day: DAY_1, time: '15:00 – 15:45', type: 'Workshop', room: MAIN_HALL, allowRegistration: true,
    title: 'Workshop 1: Finding Your Niche',
    description: 'Identifying Strategic Roles, Specializations, and Pathways in Climate Action & the Green Economy.',
  },
  {
    day: DAY_1, time: '15:00 – 15:45', type: 'Workshop', room: BREAKOUT_ROOM, allowRegistration: true,
    title: 'Workshop 2: Building Organizational Systems for Sustainability',
    description: 'Strengthening Governance, Operations, and Institutional Capacity for Long-Term Impact.',
  },
  {
    day: DAY_1, time: '15:45 – 16:30', type: 'Workshop', room: MAIN_HALL,
    title: 'Capacity-Building Workshop: Climate Advocacy, Social Media & Storytelling for Thematic Impact',
  },
  {
    day: DAY_1, time: '16:30 – 17:00', type: 'Workshop', room: MAIN_HALL,
    title: 'Thematic Working Groups',
    description: 'Consolidating Day 1 breakout inputs across Clusters A–D for LCOY Statement drafting.',
  },
  { day: DAY_1, time: '17:00', type: 'Ceremony', room: MAIN_HALL, title: 'Closing remarks & Day 1 wrap-up' },

  // ---------- DAY 2 — Thursday, 8 October 2026: From Dialogue to Action ----------
  { day: DAY_2, time: '08:30 – 09:30', type: 'Other', room: MAIN_HALL, title: 'Recap of Day 1 & energizer' },
  { day: DAY_2, time: '09:30 – 10:15', type: 'Panel', room: MAIN_HALL, title: 'Panel Discussion: Unlocking Green Finance and Youth Employment Pathways' },
  {
    day: DAY_2, time: '10:30 – 11:15', type: 'Panel', room: MAIN_HALL,
    title: 'Panel Discussion: Championing Inclusive Action',
    description: 'Gender, Disability, and Cultural Heritage in Climate Solutions.',
  },
  { day: DAY_2, time: '11:15 – 11:30', type: 'Other', room: '', title: 'Health break — performances (poetry, music)' },
  {
    day: DAY_2, time: '11:30 – 12:15', type: 'Breakout', room: MAIN_HALL, allowRegistration: true,
    title: "Panel Session 1: Protecting Sierra Leone's Ecosystems",
    description: 'Harnessing Youth Leadership in Preserving Cultural Heritage, Local Knowledge, and Eco-Tourism for Environmental Conservation.',
  },
  {
    day: DAY_2, time: '11:30 – 12:15', type: 'Breakout', room: BREAKOUT_ROOM, allowRegistration: true,
    title: 'Panel Session 2: Closing the Loop',
    description: 'Driving Circular Economy and Youth-Led Solutions for Waste Management.',
  },
  { day: DAY_2, time: '12:15 – 13:15', type: 'Other', room: '', title: 'Lunch & networking' },
  {
    day: DAY_2, time: '13:15 – 14:15', type: 'Panel', room: MAIN_HALL,
    title: 'Panel 2 — Inclusive Policy Dialogue',
    description: 'Engaging Government on NDCs & National Adaptation Plans.',
  },
  { day: DAY_2, time: '14:15 – 14:35', type: 'Plenary', room: MAIN_HALL, title: 'Virtual Presentation — C40 Cities Youth Engagement Hub' },
  {
    day: DAY_2, time: '14:35 – 15:15', type: 'Plenary', room: MAIN_HALL,
    title: 'Keynote Presentation — YOUNGO',
    description: 'Navigating Global Youth Climate Policy & UNFCCC Engagement.',
  },
  { day: DAY_2, time: '15:15 – 15:30', type: 'Other', room: '', title: 'Health break — performances (poetry, music)' },
  { day: DAY_2, time: '15:30 – 16:15', type: 'Plenary', room: MAIN_HALL, title: 'Plenary: Presentation and adoption/signing of the LCOY26 Statement' },
  { day: DAY_2, time: '16:15 – 16:45', type: 'Ceremony', room: MAIN_HALL, title: 'Certificate presentation to outstanding delegates, speakers, volunteers & organisers' },
  { day: DAY_2, time: '16:45 – 17:00', type: 'Ceremony', room: MAIN_HALL, title: 'Closing ceremony & group photo' },
];
