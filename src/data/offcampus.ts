// Off-campus (Workspace › Portals) demo data and store. Matches the Figma "Workspace — flows" frames 2829–2835.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/* ---------- Types ---------- */
export type LandlordStatus = 'Submitted' | 'Awaiting info' | 'Approved' | 'Rejected' | 'Suspended';
export type LandlordApp = {
  id: string; name: string; email: string; phone: string; entity: 'Company' | 'Individual'; company?: string;
  portfolio: number; areas: string[]; website?: string; heard: string; submitted: string; reviewed?: string;
  applied: string; status: LandlordStatus; otherPortals: number; lastNote?: string; updated?: boolean;
};

export type ReviewStatus = 'Under review' | 'Changes requested' | 'Rejected' | 'Approved';
export type Room = { name: string; kind: string; size: number; bath: string; rent: number; photos: boolean };
export type Review = {
  id: string; title: string; town: string; type: 'House' | 'Apartment'; beds: number; landlord: string; tint: string;
  received: string; submittedAt: string; status: ReviewStatus; resubmission?: boolean; note?: string;
  address: string; letAs: string; size: number; from: number; amenities: string[]; bills: string; rules: string; rooms: Room[];
};

export type HmoStatus = 'Active' | 'Paused' | 'Archived';
export type Hmo = { id: string; title: string; town: string; type: 'House' | 'Apartment'; beds: number; landlord: string; tint: string; status: HmoStatus; pausedBy?: 'you' | 'landlord' | 'revoked'; reason?: string };

export type Pbsa = { id: string; ref: string; name: string; region: string; from: number };
export type HiddenPbsa = { ref: string; reason: string; at: string };

export type Enquiry = { id: string; student: string; email: string; phone: string; property: string; source: 'HMO' | 'Amber PBSA'; moveIn: string; received: string };

export type Campus = { id: string; name: string; isDefault?: boolean; ticked: boolean; resolved: string | null; match: 'Exact' | 'Nearest' | 'Manual' | null; km?: number; override: string | null };

export type Portal = {
  campuses: Campus[]; showPbsa: boolean; defaultCampus: string; senderName: string; replyTo: string;
  brandColour: string; ctaColour: string; logo: boolean; siteTitle: string; favicon: boolean;
  pageTitle: string; heroText: string; heroBanner: boolean; customLinks: boolean; announcements: boolean; footerLinks: boolean;
  liveSince: string | null; draftSaved: boolean;
  domainMode: 'standard' | 'custom'; subdomain: string; customDomain: string | null; domainState: 'none' | 'pending' | 'failed' | 'verified';
};

/* ---------- Helpers ---------- */
const pad = (n: number) => String(n).padStart(2, '0');
/** The frames are dated 28 Oct 2026; keep that date and use the real time of day. */
export const stamp = () => { const d = new Date(); return `28 Oct 2026, ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const AMBER_REGIONS = ['Durham', 'Newcastle upon Tyne', 'Middlesbrough', 'Sunderland', 'Darlington', 'York', 'Leeds'];
export const TAKEN_DOMAINS = ['housing.ncl.ac.uk', 'homes.york.ac.uk'];
export const SIGNUP_LINK = 'https://durham.pmsoffcampushousing.com/landlords/apply';
const tints = ['#E8EEF6', '#EFEBE3', '#E6EEE8', '#ECE6EE', '#EAECEF'];

/* ---------- Seed ---------- */
function landlords(): LandlordApp[] {
  const base: LandlordApp[] = [
    { id: 'll-callum', name: 'Callum Reid', email: 'callum@elvetlettings.co.uk', phone: '07700 900418', entity: 'Company', company: 'Elvet Lettings Ltd', portfolio: 3, areas: ['Elvet', 'Gilesgate'], website: 'elvetlettings.co.uk', heard: 'Another landlord', submitted: '28 Oct 2026, 14:12', applied: '2 hours ago', status: 'Submitted', otherPortals: 1 },
    { id: 'll-hannah', name: 'Hannah Moss', email: 'hannah.moss@gmail.com', phone: '07700 900233', entity: 'Individual', portfolio: 1, areas: ["Neville's Cross"], heard: 'University website', submitted: '28 Oct 2026, 11:40', applied: '5 hours ago', status: 'Submitted', otherPortals: 0 },
    { id: 'll-joanne', name: 'Joanne Pike', email: 'lettings@viewleyhomes.co.uk', phone: '07700 900571', entity: 'Company', company: 'Viewley Homes', portfolio: 12, areas: ['Claypath', 'Viaduct'], website: 'viewleyhomes.co.uk', heard: 'Search engine', submitted: '27 Oct 2026, 16:05', applied: 'Yesterday', status: 'Submitted', otherPortals: 2 },
    { id: 'll-daniel', name: 'Daniel Ashworth', email: 'd.ashworth@outlook.com', phone: '07700 900662', entity: 'Individual', portfolio: 2, areas: ['Sherburn Road'], heard: 'Another landlord', submitted: '25 Oct 2026, 09:31', applied: '3 days ago', status: 'Submitted', otherPortals: 0 },
    { id: 'll-sophie', name: 'Sophie Grant', email: 'sophie@grantlets.co.uk', phone: '07700 900310', entity: 'Company', company: 'Grant Lets', portfolio: 4, areas: ['Gilesgate'], website: 'grantlets.co.uk', heard: 'University website', submitted: '26 Oct 2026, 10:02', reviewed: '26 Oct 2026, 15:20', applied: '2 days ago', status: 'Approved', otherPortals: 0 },
    { id: 'll-mark', name: 'Mark Little', email: 'mark.little@btinternet.com', phone: '07700 900144', entity: 'Individual', portfolio: 1, areas: ['Crossgate'], heard: 'Another landlord', submitted: '24 Oct 2026, 13:47', reviewed: '24 Oct 2026, 16:10', applied: '4 days ago', status: 'Approved', otherPortals: 1 },
    { id: 'll-ruth', name: 'Ruth Ellison', email: 'ruth@ellisonproperty.co.uk', phone: '07700 900729', entity: 'Company', company: 'Ellison Property', portfolio: 7, areas: ['Elvet', 'Whinney Hill'], website: 'ellisonproperty.co.uk', heard: 'Search engine', submitted: '21 Oct 2026, 08:55', reviewed: '21 Oct 2026, 12:30', applied: '1 week ago', status: 'Approved', otherPortals: 3 },
    { id: 'll-peter', name: 'Peter Wade', email: 'peter.wade@gmail.com', phone: '07700 900802', entity: 'Individual', portfolio: 1, areas: ['Gilesgate'], heard: 'Another landlord', submitted: '12 Sep 2026, 10:15', reviewed: '20 Oct 2026, 09:00', applied: '6 weeks ago', status: 'Suspended', otherPortals: 0, lastNote: 'Gas safety certificate lapsed and was not renewed.' },
    { id: 'll-gary', name: 'Gary Holt', email: 'gary@holtlets.com', phone: '07700 900915', entity: 'Company', company: 'Holt Lets', portfolio: 9, areas: ['Newcastle'], website: 'holtlets.com', heard: 'Search engine', submitted: '19 Oct 2026, 17:22', reviewed: '20 Oct 2026, 10:45', applied: '9 days ago', status: 'Rejected', otherPortals: 0, lastNote: 'None of the properties are in Durham.' },
    { id: 'll-amy', name: 'Amy Forster', email: 'amy.forster@yahoo.co.uk', phone: '07700 900388', entity: 'Individual', portfolio: 1, areas: ['Framwellgate Moor'], heard: 'University website', submitted: '15 Oct 2026, 12:00', reviewed: '16 Oct 2026, 09:30', applied: '2 weeks ago', status: 'Rejected', otherPortals: 0, lastNote: 'Could not verify ownership of the property.' },
  ];
  // Pad Approved to 37 so it reads 38 once Callum is approved (frame 2829:2184).
  const first = ['Laura', 'James', 'Nadia', 'Owen', 'Fiona', 'Ian', 'Kate', 'Rob', 'Sana', 'Tim', 'Helen', 'Adam', 'Beth', 'Chris', 'Diane', 'Ed', 'Gemma', 'Harry', 'Imogen', 'Jon', 'Kerry', 'Luke', 'Molly', 'Neil', 'Olivia', 'Paul', 'Rachel', 'Simon', 'Tara', 'Vik', 'Will', 'Yasmin', 'Zoe', 'Ben'];
  const last = ['Bell', 'Carr', 'Dodd', 'Hall', 'Kerr', 'Lowe', 'Moor', 'Nash', 'Pratt', 'Rowe', 'Shaw', 'Tait', 'Ward', 'Young'];
  const areas = ['Elvet', 'Gilesgate', 'Claypath', 'Viaduct', 'Crossgate', 'Whinney Hill', 'Sherburn Road', "Neville's Cross", 'Framwellgate Moor'];
  first.forEach((f, i) => {
    const n = `${f} ${last[i % last.length]}`;
    const p = 1 + ((i * 7) % 8);
    base.push({ id: `ll-x${i}`, name: n, email: `${f.toLowerCase()}.${last[i % last.length].toLowerCase()}@${i % 2 ? 'gmail.com' : 'outlook.com'}`, phone: `07700 9${String(100000 + i * 137).slice(1)}`, entity: i % 3 ? 'Individual' : 'Company', portfolio: p, areas: [areas[i % areas.length]], heard: 'Another landlord', submitted: `${Math.max(1, 20 - (i % 19))} Oct 2026, 10:00`, reviewed: `${Math.max(1, 20 - (i % 19))} Oct 2026, 15:00`, applied: `${2 + Math.floor(i / 4)} weeks ago`, status: 'Approved', otherPortals: i % 3 });
  });
  return base;
}

const hallgarth: Omit<Review, 'id' | 'title' | 'type' | 'beds' | 'landlord' | 'tint' | 'received' | 'submittedAt' | 'status'> = {
  town: 'Durham', address: '14 Hallgarth Street, DH1 3AY', letAs: 'By the room', size: 96, from: 145,
  amenities: ['Wi-Fi', 'Washing machine', 'Desk in every room', 'Bike storage', 'Garden'],
  bills: 'Water, Internet included in rent · Electricity, Gas not included · Estimated bills £60 per month',
  rules: 'No pets · No smoking · Students only · Max occupancy 4',
  rooms: [
    { name: 'Room 1', kind: 'Double room', size: 14, bath: 'Private bathroom', rent: 145, photos: true },
    { name: 'Room 2', kind: 'Double room', size: 12, bath: 'Shared bathroom', rent: 145, photos: true },
    { name: 'Room 3', kind: 'Single room', size: 10, bath: 'Shared bathroom', rent: 145, photos: true },
    { name: 'Room 4', kind: 'Single room', size: 9, bath: 'Shared bathroom', rent: 145, photos: false },
  ],
};
const roomsFor = (beds: number, rent: number): Room[] => Array.from({ length: beds }, (_, i) => ({ name: `Room ${i + 1}`, kind: i < 2 ? 'Double room' : 'Single room', size: i < 2 ? 13 - i : 10 - (i % 2), bath: i === 0 ? 'Private bathroom' : 'Shared bathroom', rent, photos: true }));
function reviews(): Review[] {
  return [
    { id: 'rv-hallgarth', title: '14 Hallgarth Street', type: 'House', beds: 4, landlord: 'Callum Reid', tint: tints[0], received: '10 min ago', submittedAt: '28 Oct 2026, 16:20', status: 'Under review', ...hallgarth },
    { id: 'rv-oldelvet', title: 'Flat 2, 31 Old Elvet', town: 'Durham', type: 'Apartment', beds: 2, landlord: 'Hannah Moss', tint: tints[1], received: '1 hour ago', submittedAt: '28 Oct 2026, 15:31', status: 'Under review', address: 'Flat 2, 31 Old Elvet, DH1 3HN', letAs: 'Whole property', size: 58, from: 165, amenities: ['Wi-Fi', 'Washing machine', 'Dishwasher'], bills: 'All bills included in rent', rules: 'No pets · No smoking · Students only · Max occupancy 2', rooms: roomsFor(2, 165) },
    { id: 'rv-mistletoe', title: '7 Mistletoe Street', town: 'Durham', type: 'House', beds: 5, landlord: 'Joanne Pike', tint: tints[2], received: 'Yesterday', submittedAt: '27 Oct 2026, 11:08', status: 'Under review', address: '7 Mistletoe Street, DH1 4EP', letAs: 'By the room', size: 112, from: 129, amenities: ['Wi-Fi', 'Washing machine', 'Garden', 'Bike storage'], bills: 'Water included in rent · Electricity, Gas, Internet not included · Estimated bills £55 per month', rules: 'No pets · No smoking · Students only · Max occupancy 5', rooms: roomsFor(5, 129) },
    { id: 'rv-sutton', title: '22 Sutton Street', town: 'Durham', type: 'House', beds: 3, landlord: 'Daniel Ashworth', tint: tints[3], received: '2 days ago', submittedAt: '26 Oct 2026, 09:47', status: 'Under review', address: '22 Sutton Street, DH1 4BW', letAs: 'Whole property', size: 84, from: 138, amenities: ['Wi-Fi', 'Washing machine', 'Desk in every room'], bills: 'All bills included in rent', rules: 'No pets · Students only · Max occupancy 3', rooms: roomsFor(3, 138) },
    { id: 'rv-gilesgate', title: '41 Gilesgate', town: 'Durham', type: 'House', beds: 6, landlord: 'Gary Holt', tint: tints[4], received: '1 week ago', submittedAt: '20 Oct 2026, 14:02', status: 'Rejected', note: 'The landlord is not approved for this portal.', address: '41 Gilesgate, DH1 1QW', letAs: 'By the room', size: 130, from: 120, amenities: ['Wi-Fi'], bills: 'No bills included', rules: 'Students only', rooms: roomsFor(6, 120) },
  ];
}

const hmo = (id: string, title: string, type: Hmo['type'], beds: number, landlord: string, i: number, status: HmoStatus = 'Active', extra: Partial<Hmo> = {}): Hmo => ({ id, title, town: 'Durham', type, beds, landlord, tint: tints[i % 5], status, ...extra });
function hmos(): Hmo[] {
  return [
    hmo('hm-hallgarth', '14 Hallgarth Street', 'House', 4, 'Callum Reid', 0),
    hmo('hm-oldelvet', 'Flat 2, 31 Old Elvet', 'Apartment', 2, 'Hannah Moss', 1),
    hmo('hm-wanless', '9 Wanless Terrace', 'House', 4, 'Mark Little', 2),
    hmo('hm-sutton', '22 Sutton Street', 'House', 3, 'Daniel Ashworth', 3),
    hmo('hm-mowbray', '18 Mowbray Street', 'House', 5, 'Ruth Ellison', 4),
    hmo('hm-hawthorn', '5 Hawthorn Terrace', 'House', 3, 'Sophie Grant', 1, 'Paused', { pausedBy: 'landlord', reason: 'Refurbishing the kitchen' }),
    hmo('hm-john', '3 John Street', 'House', 4, 'Peter Wade', 2, 'Paused', { pausedBy: 'revoked' }),
    hmo('hm-allergate', '12 Allergate', 'House', 4, 'Ruth Ellison', 3, 'Archived'),
    hmo('hm-ainsley', '6 Ainsley Street', 'House', 3, 'Sophie Grant', 4, 'Archived'),
  ];
}

function pbsas(): Pbsa[] {
  const durham: [string, string, number][] = [
    ['Riverside Quarter', 'ac-41208', 219], ['The Sidings', 'ac-38817', 189], ['Claypath Court', 'ac-40115', 205], ['Mill House', 'ac-39962', 172], ['Framwellgate Point', 'ac-41530', 238],
    ['Kepier Court', 'ac-37204', 181], ['Elvet Studios', 'ac-40876', 249], ['Ustinov Place', 'ac-38190', 176], ['Hollingside Yard', 'ac-41917', 198], ['St Giles House', 'ac-39355', 207],
    ['Gilesgate Works', 'ac-40604', 168], ['Viaduct House', 'ac-41049', 214], ['Crossgate Lofts', 'ac-38522', 226], ['Sheraton Park', 'ac-39718', 185], ['Old Fire Station', 'ac-41372', 231],
  ];
  const mbro: [string, string, number][] = [['Parkway Studios', 'ac-52011', 139], ['Albert Hall', 'ac-52164', 149], ['Linthorpe Point', 'ac-52307', 132], ['Captain Cook House', 'ac-52412', 155], ['Tees Quarter', 'ac-52598', 128], ['Union Street Lofts', 'ac-52673', 145]];
  const ncl: [string, string, number][] = [['Bowes Wharf', 'ac-60120', 189], ['Pilgrim Street', 'ac-60244', 199], ['Quayside Court', 'ac-60371', 212]];
  return [
    ...durham.map(([name, ref, from]) => ({ id: ref, ref, name, region: 'Durham', from })),
    ...mbro.map(([name, ref, from]) => ({ id: ref, ref, name, region: 'Middlesbrough', from })),
    ...ncl.map(([name, ref, from]) => ({ id: ref, ref, name, region: 'Newcastle upon Tyne', from })),
  ];
}

function enquiries(): Enquiry[] {
  return [
    { id: 'en1', student: 'Aisha Khan', email: 'aisha.khan@durham.ac.uk', phone: '07700 900123', property: '14 Hallgarth Street', source: 'HMO', moveIn: '1 Sep 2027', received: '12 min ago' },
    { id: 'en2', student: 'Tom Fletcher', email: 'tom.fletcher@gmail.com', phone: '07700 900456', property: 'Riverside Quarter', source: 'Amber PBSA', moveIn: '20 Sep 2027', received: '1 hour ago' },
    { id: 'en3', student: 'Mei Lin', email: 'mei.lin@outlook.com', phone: '07700 900789', property: 'Flat 2, 31 Old Elvet', source: 'HMO', moveIn: '1 Jul 2027', received: '3 hours ago' },
    { id: 'en4', student: 'Oliver Shaw', email: 'olivershaw@icloud.com', phone: '07700 900321', property: 'Claypath Court', source: 'Amber PBSA', moveIn: '13 Sep 2027', received: 'Yesterday' },
    { id: 'en5', student: 'Grace Adeyemi', email: 'grace.a@durham.ac.uk', phone: '07700 900654', property: '22 Sutton Street', source: 'HMO', moveIn: '1 Aug 2027', received: 'Yesterday' },
    { id: 'en6', student: 'Lucas Moreau', email: 'l.moreau@gmail.com', phone: '07700 900987', property: 'Framwellgate Point', source: 'Amber PBSA', moveIn: '20 Sep 2027', received: '2 days ago' },
  ];
}

function portal(): Portal {
  return {
    campuses: [
      { id: 'c-durham', name: 'Durham City', isDefault: true, ticked: true, resolved: 'Durham', match: 'Exact', override: null },
      { id: 'c-queens', name: "Queen's Campus", ticked: false, resolved: null, match: null, override: null },
    ],
    showPbsa: false, defaultCampus: 'c-durham', senderName: 'Durham University Accommodation', replyTo: 'accommodation@durham.ac.uk',
    brandColour: '#68246D', ctaColour: '#68246D', logo: true, siteTitle: 'Durham University · Off-campus housing', favicon: true,
    pageTitle: 'Find a home off campus', heroText: 'Houses and flats near Durham, checked by the university.', heroBanner: false,
    customLinks: false, announcements: false, footerLinks: false, liveSince: null, draftSaved: true,
    domainMode: 'standard', subdomain: 'durham', customDomain: null, domainState: 'none',
  };
}

/* ---------- Store ---------- */
type Data = { landlords: LandlordApp[]; reviews: Review[]; hmos: Hmo[]; pbsa: Pbsa[]; hidden: HiddenPbsa[]; enquiries: Enquiry[]; portal: Portal };
const seed = (): Data => ({ landlords: landlords(), reviews: reviews(), hmos: hmos(), pbsa: pbsas(), hidden: [], enquiries: enquiries(), portal: portal() });

type State = Data & {
  set: <K extends keyof Data>(key: K, fn: (v: Data[K]) => Data[K]) => void;
  setPortal: (p: Partial<Portal>) => void;
};

export const useOc = create<State>()(
  persist(
    (set) => ({
      ...seed(),
      set: (key, fn) => set((st) => ({ [key]: fn(st[key]) }) as Partial<State>),
      setPortal: (p) => set((st) => ({ portal: { ...st.portal, ...p } })),
    }),
    { name: 'pms-offcampus', storage: createJSONStorage(() => sessionStorage) },
  ),
);

/** Region a campus currently uses (override wins). */
export const regionOf = (c: Campus) => c.override ?? c.resolved;
