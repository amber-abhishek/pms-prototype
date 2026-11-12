// Dummy Durham Residences tenant. Deterministic (seeded) so every reset gives the same demo.

let s = 42;
const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
const int = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

const FIRST = ['Ella', 'Josh', 'Priya', 'Tom', 'Aisha', 'Liam', 'Sofia', 'Noah', 'Mia', 'Arjun', 'Grace', 'Oliver', 'Zara', 'Ethan', 'Chloe', 'Yusuf', 'Hannah', 'Leo', 'Isla', 'Kai', 'Amara', 'Finn', 'Lucy', 'Ravi', 'Freya', 'Omar', 'Ruby', 'Jack', 'Mei', 'Sam'];
const LAST = ['Morgan', 'Patel', 'Baker', 'Khan', 'Smith', 'Chen', 'Okafor', 'Wright', 'Hughes', 'Singh', 'Evans', 'Murphy', 'Ali', 'Taylor', 'Brown', 'Nowak', 'Ahmed', 'Walker', 'Wilson', 'Clarke'];
const name = () => `${pick(FIRST)} ${pick(LAST)}`;
const email = (n: string) => `${n.toLowerCase().replace(/[^a-z]+/g, '.')}@durham.ac.uk`;
export const daysAgo = (d: number) => new Date(Date.UTC(2026, 8, 14) - d * 86400000).toISOString().slice(0, 10);
const room = () => `${pick(['A', 'B', 'C'])}${int(1, 4)}-${String(int(1, 30)).padStart(2, '0')}`;

export type Tone = 'green' | 'blue' | 'amber' | 'orange' | 'red' | 'purple' | 'grey';

export type Campus = { id: string; name: string; city: string };
export type Level = { name: string; bsu: boolean; sellable: boolean };
export type Structure = { id: string; name: string; levels: Level[] };
export type CustomField = { id: string; name: string; type: 'Text' | 'Number' | 'Select' | 'Yes/No' | 'Date'; appliesTo: 'Property' | 'Unit'; required: boolean; options?: string[] };
export type Property = { id: string; name: string; campusId: string; structureId: string; address: string; beds: number; let: number; kind: 'Catered' | 'Self-catered' };
export type Unit = { id: string; code: string; propertyId: string; type: string; status: 'Occupied' | 'Available' | 'Held' | 'Maintenance'; rent: number };
export type Cycle = { id: string; name: string; status: 'Open' | 'Upcoming' | 'Closed'; opens: string; closes: string; applications: number };
export type AppStatus = 'New' | 'In review' | 'Offered' | 'Accepted' | 'Waitlisted' | 'Declined';
export type Application = { id: string; ref: string; student: string; email: string; cycleId: string; year: 'First year' | 'Returning' | 'Postgraduate'; pref: string; roomType: string; submitted: string; status: AppStatus; waitingDays: number };
export type Offer = { id: string; appId: string; student: string; propertyId: string; roomType: string; sent: string; expires: string; status: 'Sent' | 'Accepted' | 'Declined' | 'Expired' };
export type Booking = { id: string; ref: string; student: string; propertyId: string; room: string; start: string; end: string; status: 'Confirmed' | 'Lease unsigned' | 'Checked in' | 'Cancelled' };
export type Resident = { id: string; name: string; email: string; propertyId: string; room: string; year: string; status: 'In residence' | 'Arriving' | 'Leaving' };
export type Maintenance = { id: string; ref: string; title: string; propertyId: string; room: string; priority: 'Urgent' | 'High' | 'Normal'; status: 'Open' | 'In progress' | 'Resolved'; reported: string; assignee: string | null };
export type ResRequest = { id: string; kind: 'Room swap' | 'Early arrival' | 'Lease change' | 'Guest stay'; who: string; detail: string; status: 'Pending' | 'Approved' | 'Rejected'; submitted: string };
export type Notice = { id: string; title: string; audience: string; status: 'Draft' | 'Scheduled' | 'Sent'; when: string; body: string };
export type LandlordApp = { id: string; landlord: string; company: string; email: string; phone: string; properties: number; submitted: string; status: 'Pending' | 'Approved' | 'Rejected'; reason?: string; docs: { name: string; ok: boolean }[] };
export type Listing = { id: string; title: string; landlord: string; type: 'Landlord' | 'Partner halls'; area: string; beds: number; rent: number; status: 'In review' | 'Published' | 'Inactive' | 'Rejected'; submitted: string; bills: boolean; distance: string; reason?: string };
export type Enquiry = { id: string; student: string; email: string; listingId: string; received: string; status: 'New' | 'Replied' | 'Closed'; thread: { from: 'student' | 'us'; text: string; at: string }[] };
export type Task = { id: string; title: string; sub: string; badge: { label: string; tone: Tone }; to: string; done: boolean; icon: 'alert' | 'swap' | 'lease' | 'inbox' | 'notice' | 'landlord' };
export type Person = { id: string; name: string; email: string; role: string; teams: string[]; lastActive: string };
export type ActivityItem = { id: string; who: string; what: string; when: string; area: string };

export function makeSeed() {
  s = 42;
  const campuses: Campus[] = [
    { id: 'c1', name: 'Durham City', city: 'Durham' },
    { id: 'c2', name: "Queen's Campus", city: 'Stockton-on-Tees' },
  ];
  const structures: Structure[] = [
    { id: 'st1', name: 'College', levels: [{ name: 'Block', bsu: false, sellable: false }, { name: 'Floor', bsu: false, sellable: false }, { name: 'Flat', bsu: false, sellable: false }, { name: 'Room', bsu: true, sellable: true }] },
    { id: 'st2', name: 'Townhouse', levels: [{ name: 'House', bsu: false, sellable: true }, { name: 'Room', bsu: true, sellable: true }] },
    { id: 'st3', name: 'Studio block', levels: [{ name: 'Block', bsu: false, sellable: false }, { name: 'Studio', bsu: true, sellable: true }] },
  ];
  const customFields: CustomField[] = [
    { id: 'cf1', name: 'Accessible room', type: 'Yes/No', appliesTo: 'Unit', required: false },
    { id: 'cf2', name: 'Bathroom', type: 'Select', appliesTo: 'Unit', required: true, options: ['En-suite', 'Shared', 'Private'] },
    { id: 'cf3', name: 'Catering', type: 'Select', appliesTo: 'Property', required: true, options: ['Catered', 'Self-catered'] },
    { id: 'cf4', name: 'Warden on site', type: 'Yes/No', appliesTo: 'Property', required: false },
    { id: 'cf5', name: 'Floor area (m²)', type: 'Number', appliesTo: 'Unit', required: false },
  ];
  const properties: Property[] = [
    { id: 'p1', name: 'Ustinov College', campusId: 'c1', structureId: 'st1', address: 'Howlands Farm, Durham DH1 3DE', beds: 600, let: 582, kind: 'Self-catered' },
    { id: 'p2', name: 'Collingwood', campusId: 'c1', structureId: 'st1', address: 'South Road, Durham DH1 3LT', beds: 481, let: 438, kind: 'Catered' },
    { id: 'p3', name: "St Mary's College", campusId: 'c1', structureId: 'st1', address: 'Elvet Hill Road, Durham DH1 3LR', beds: 144, let: 118, kind: 'Catered' },
    { id: 'p4', name: 'Josephine Butler', campusId: 'c1', structureId: 'st3', address: 'South Road, Durham DH1 3DF', beds: 450, let: 351, kind: 'Self-catered' },
    { id: 'p5', name: 'Van Mildert', campusId: 'c2', structureId: 'st2', address: 'Mill Hill Lane, Durham DH1 3LH', beds: 557, let: 412, kind: 'Catered' },
  ];
  const roomTypes = ['En-suite single', 'Standard single', 'Twin', 'Studio'];
  const units: Unit[] = [];
  properties.forEach((p) => {
    const pre = p.name.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
    for (let i = 0; i < 14; i++) {
      const st = rnd();
      units.push({ id: `${p.id}-u${i}`, code: `${pre}-${room()}`, propertyId: p.id, type: p.structureId === 'st3' ? 'Studio' : pick(roomTypes.slice(0, 3)), status: st < 0.72 ? 'Occupied' : st < 0.86 ? 'Available' : st < 0.94 ? 'Held' : 'Maintenance', rent: int(145, 235) });
    }
  });
  const cycles: Cycle[] = [
    { id: 'cy1', name: '2027/28', status: 'Open', opens: '2026-09-01', closes: '2027-03-31', applications: 128 },
    { id: 'cy2', name: '2026/27', status: 'Closed', opens: '2025-09-01', closes: '2026-03-31', applications: 2412 },
    { id: 'cy3', name: '2028/29', status: 'Upcoming', opens: '2027-09-01', closes: '2028-03-31', applications: 0 },
  ];
  const statuses: AppStatus[] = ['New', 'New', 'New', 'In review', 'In review', 'Offered', 'Accepted', 'Waitlisted', 'Declined'];
  const applications: Application[] = Array.from({ length: 128 }, (_, i) => {
    const n = name();
    const w = int(0, 14);
    return { id: `a${i}`, ref: `APP-${4100 + i}`, student: n, email: email(n), cycleId: 'cy1', year: pick(['First year', 'First year', 'Returning', 'Postgraduate'] as const), pref: pick(properties).name, roomType: pick(roomTypes), submitted: daysAgo(w), status: pick(statuses), waitingDays: w };
  });
  const offers: Offer[] = applications
    .filter((a) => a.status === 'Offered' || a.status === 'Accepted')
    .map((a, i) => ({ id: `o${i}`, appId: a.id, student: a.student, propertyId: pick(properties).id, roomType: a.roomType, sent: daysAgo(int(1, 6)), expires: daysAgo(-int(0, 6)), status: a.status === 'Accepted' ? 'Accepted' : 'Sent' }));
  const bookings: Booking[] = offers
    .filter((o) => o.status === 'Accepted')
    .map((o, i) => ({ id: `b${i}`, ref: `BK-${7300 + i}`, student: o.student, propertyId: o.propertyId, room: room(), start: '2027-09-25', end: '2028-06-24', status: i % 3 === 0 ? 'Lease unsigned' : 'Confirmed' }));
  const residents: Resident[] = Array.from({ length: 64 }, (_, i) => {
    const n = name();
    return { id: `r${i}`, name: n, email: email(n), propertyId: pick(properties).id, room: room(), year: pick(['First year', 'Second year', 'Final year', 'Postgraduate']), status: i % 9 === 0 ? 'Arriving' : i % 13 === 0 ? 'Leaving' : 'In residence' };
  });
  const maintenance: Maintenance[] = [
    { id: 'm1', ref: 'MT-2214', title: 'Leaking radiator', propertyId: 'p1', room: 'C.2.14', priority: 'Urgent', status: 'Open', reported: daysAgo(0), assignee: null },
    { id: 'm2', ref: 'MT-2210', title: 'No hot water in flat', propertyId: 'p2', room: 'B.1.03', priority: 'Urgent', status: 'In progress', reported: daysAgo(1), assignee: 'Tom Baker' },
    { id: 'm3', ref: 'MT-2207', title: 'Broken window latch', propertyId: 'p4', room: 'Studio 118', priority: 'High', status: 'Open', reported: daysAgo(2), assignee: null },
    { id: 'm4', ref: 'MT-2201', title: 'Wi-Fi drops on floor 3', propertyId: 'p5', room: 'House 7', priority: 'High', status: 'In progress', reported: daysAgo(3), assignee: 'Aisha Khan' },
    { id: 'm5', ref: 'MT-2198', title: 'Fridge not cooling', propertyId: 'p1', room: 'A.3.07', priority: 'Normal', status: 'Open', reported: daysAgo(3), assignee: null },
    { id: 'm6', ref: 'MT-2190', title: 'Door card reader faulty', propertyId: 'p3', room: 'Main entrance', priority: 'High', status: 'Open', reported: daysAgo(4), assignee: null },
    { id: 'm7', ref: 'MT-2184', title: 'Mould in shower', propertyId: 'p2', room: 'C.2.22', priority: 'Normal', status: 'Resolved', reported: daysAgo(6), assignee: 'Grace Evans' },
    ...Array.from({ length: 10 }, (_, i): Maintenance => ({ id: `m${8 + i}`, ref: `MT-${2170 - i}`, title: pick(['Light fitting out', 'Blocked sink', 'Desk chair broken', 'Heater noisy', 'Smoke alarm beeping', 'Wardrobe door off']), propertyId: pick(properties).id, room: room(), priority: pick(['High', 'Normal', 'Normal'] as const), status: i < 4 ? 'Open' : pick(['In progress', 'Resolved', 'Resolved'] as const), reported: daysAgo(int(5, 20)), assignee: pick([null, 'Tom Baker', 'Grace Evans']) })),
  ];
  const requests: ResRequest[] = [
    { id: 'rq1', kind: 'Room swap', who: 'Ella Morgan ↔ Josh Patel', detail: 'Collingwood · both residents agreed', status: 'Pending', submitted: daysAgo(1) },
    { id: 'rq2', kind: 'Early arrival', who: 'Mei Chen', detail: 'Ustinov College · arriving 20 Sep for induction', status: 'Pending', submitted: daysAgo(2) },
    { id: 'rq3', kind: 'Lease change', who: 'Omar Ali', detail: 'Josephine Butler · move to a 44-week lease', status: 'Pending', submitted: daysAgo(3) },
    { id: 'rq4', kind: 'Guest stay', who: 'Freya Wilson', detail: "St Mary's College · 2 nights, 3–5 Oct", status: 'Approved', submitted: daysAgo(5) },
    { id: 'rq5', kind: 'Room swap', who: 'Kai Nowak ↔ Leo Evans', detail: 'Van Mildert · only one resident agreed', status: 'Rejected', submitted: daysAgo(8) },
  ];
  const notices: Notice[] = [
    { id: 'n1', title: 'Move-in notice to Ustinov residents', audience: 'Ustinov College · 582 residents', status: 'Draft', when: 'Wed 16 Sep, 09:00', body: 'Welcome to Ustinov! Collect your keys from reception between 10:00 and 18:00 on Saturday. Bring photo ID and your booking reference.' },
    { id: 'n2', title: 'Fire alarm test — Collingwood', audience: 'Collingwood · 438 residents', status: 'Scheduled', when: 'Mon 21 Sep, 10:00', body: 'The weekly fire alarm test will take place at 10:00. You do not need to leave the building.' },
    { id: 'n3', title: 'Wi-Fi maintenance window', audience: 'All halls · 1,901 residents', status: 'Sent', when: 'Fri 11 Sep, 18:00', body: 'Wi-Fi will be unavailable for 30 minutes from 23:00.' },
  ];
  const docs = (h: boolean, g: boolean) => [{ name: 'Landlord licence', ok: h }, { name: 'Gas safety certificate', ok: g }, { name: 'Proof of ownership', ok: true }];
  const landlordApps: LandlordApp[] = [
    { id: 'la1', landlord: 'Rachel Hughes', company: 'Wearside Lettings', email: 'rachel@wearside-lettings.co.uk', phone: '0191 555 0142', properties: 6, submitted: daysAgo(1), status: 'Pending', docs: docs(true, true) },
    { id: 'la2', landlord: 'David Okafor', company: 'Okafor Homes', email: 'david@okaforhomes.com', phone: '07700 900321', properties: 2, submitted: daysAgo(2), status: 'Pending', docs: docs(true, false) },
    { id: 'la3', landlord: 'Sarah Clarke', company: 'Cathedral View Property', email: 'sarah@cathedralview.co.uk', phone: '0191 555 0177', properties: 11, submitted: daysAgo(4), status: 'Pending', docs: docs(true, true) },
    { id: 'la4', landlord: 'Imran Ahmed', company: 'Viaduct Resident Homes', email: 'imran@viaducthomes.co.uk', phone: '07700 900654', properties: 4, submitted: daysAgo(6), status: 'Pending', docs: docs(false, true) },
    { id: 'la5', landlord: 'Helen Walker', company: 'Walker & Co', email: 'helen@walkerco.co.uk', phone: '0191 555 0199', properties: 3, submitted: daysAgo(12), status: 'Approved', docs: docs(true, true) },
    { id: 'la6', landlord: 'Mark Taylor', company: 'Independent', email: 'mark.taylor@gmail.com', phone: '07700 900111', properties: 1, submitted: daysAgo(15), status: 'Rejected', reason: 'No landlord licence for a 5-bed house.', docs: docs(false, true) },
  ];
  const areas = ['Viaduct', 'Gilesgate', 'Claypath', 'Elvet', "Neville's Cross", 'Sherburn Road'];
  const listings: Listing[] = [
    { id: 'l1', title: '5-bed house, Lawson Terrace', landlord: 'Walker & Co', type: 'Landlord', area: 'Viaduct', beds: 5, rent: 128, status: 'In review', submitted: daysAgo(1), bills: true, distance: '0.6 mi to Palace Green' },
    { id: 'l2', title: '4-bed house, Hawthorn Terrace', landlord: 'Walker & Co', type: 'Landlord', area: 'Viaduct', beds: 4, rent: 115, status: 'In review', submitted: daysAgo(1), bills: false, distance: '0.7 mi to Palace Green' },
    { id: 'l3', title: 'The Woodlands — en-suite rooms', landlord: 'Partner halls', type: 'Partner halls', area: 'Gilesgate', beds: 212, rent: 189, status: 'In review', submitted: daysAgo(2), bills: true, distance: '1.1 mi to Science Site' },
    { id: 'l4', title: '6-bed house, Hallgarth Street', landlord: 'Cathedral View Property', type: 'Landlord', area: 'Elvet', beds: 6, rent: 135, status: 'In review', submitted: daysAgo(3), bills: true, distance: '0.4 mi to Elvet Riverside' },
    ...Array.from({ length: 14 }, (_, i): Listing => {
      const hmo = rnd() < 0.75;
      return { id: `l${5 + i}`, title: hmo ? `${int(3, 7)}-bed house, ${pick(['Mowbray', 'Waddington', 'Ainsley', 'Allergate', 'John', 'Albert'])} Street` : `${pick(['Kepier Court', 'Rushford Court', 'The Three Tuns', 'Chapel Heights'])} — studios`, landlord: hmo ? pick(['Walker & Co', 'Wearside Lettings', 'Durham Resident Lets']) : 'Partner halls', type: hmo ? 'Landlord' : 'Partner halls', area: pick(areas), beds: hmo ? int(3, 7) : int(80, 320), rent: int(105, 240), status: i < 10 ? 'Published' : i < 13 ? 'Inactive' : 'Rejected', submitted: daysAgo(int(10, 60)), bills: rnd() < 0.5, distance: `${(rnd() * 1.6 + 0.2).toFixed(1)} mi to Palace Green` };
    }),
  ];
  const published = listings.filter((l) => l.status === 'Published');
  const enquiries: Enquiry[] = Array.from({ length: 16 }, (_, i) => {
    const n = name();
    const l = pick(published);
    const st: Enquiry['status'] = i < 12 ? 'New' : i < 15 ? 'Replied' : 'Closed';
    const at = `${daysAgo(int(0, 4))} ${int(8, 21)}:${String(int(0, 59)).padStart(2, '0')}`;
    const thread: Enquiry['thread'] = [{ from: 'student', text: pick([`Hi, is ${l.title} still available for 2027/28? I'm looking with ${int(2, 4)} friends.`, `Are bills included for ${l.title}? And is there a deposit?`, `Could we book a viewing for ${l.title} next week?`, `Is ${l.title} close to the Science Site? Thanks!`]), at }];
    if (st !== 'New') thread.push({ from: 'us', text: "Thanks for your enquiry — it's still available. I've passed your details to the landlord, who will be in touch to arrange a viewing.", at });
    return { id: `e${i}`, student: n, email: email(n), listingId: l.id, received: at, status: st, thread };
  });
  const tasks: Task[] = [
    { id: 't1', icon: 'alert', title: 'Leaking radiator, Ustinov C.2.14', sub: 'Urgent · reported 2h ago · no one assigned', badge: { label: 'Overdue', tone: 'red' }, to: '/residents/maintenance?open=m1', done: false },
    { id: 't2', icon: 'swap', title: 'Room swap: Ella Morgan ↔ Josh Patel', sub: 'Collingwood · both residents agreed', badge: { label: 'Due today', tone: 'orange' }, to: '/residents/requests?open=rq1', done: false },
    { id: 't3', icon: 'lease', title: '14 leases not signed', sub: 'Move-in on Saturday · lease needed to collect keys', badge: { label: '5 days', tone: 'amber' }, to: '/allocations/bookings?tab=Awaiting%20signature', done: false },
    { id: 't4', icon: 'inbox', title: '31 applications waiting more than 5 days', sub: '2027/28 · To review', badge: { label: 'Behind', tone: 'orange' }, to: '/allocations/applications?tab=New', done: false },
    { id: 't5', icon: 'notice', title: 'Move-in notice to Ustinov residents', sub: 'Draft · scheduled for Wednesday 09:00', badge: { label: 'Draft', tone: 'grey' }, to: '/residents/notices?open=n1', done: false },
    { id: 't6', icon: 'landlord', title: 'Review 4 landlord applications', sub: 'Off-campus · oldest waiting 6 days', badge: { label: 'Behind', tone: 'orange' }, to: '/offcampus/landlords', done: false },
  ];
  const people: Person[] = [
    { id: 'u1', name: 'Priya Shah', email: 'priya.shah@durham.ac.uk', role: 'Super admin', teams: ['Accommodation office'], lastActive: 'Now' },
    { id: 'u2', name: 'Tom Baker', email: 'tom.baker@durham.ac.uk', role: 'Hall manager', teams: ['Collingwood', 'Ustinov'], lastActive: '09:12' },
    { id: 'u3', name: 'Aisha Khan', email: 'aisha.khan@durham.ac.uk', role: 'Allocations officer', teams: ['Accommodation office'], lastActive: '08:47' },
    { id: 'u4', name: 'Ravi Singh', email: 'ravi.singh@durham.ac.uk', role: 'Off-campus reviewer', teams: ['Off-campus'], lastActive: 'Yesterday' },
    { id: 'u5', name: 'Grace Evans', email: 'grace.evans@durham.ac.uk', role: 'Maintenance', teams: ['Estates'], lastActive: '2 days ago' },
    { id: 'u6', name: 'Liam Murphy', email: 'liam.murphy@durham.ac.uk', role: 'Read only', teams: ['Finance'], lastActive: 'Last week' },
  ];
  const activity: ActivityItem[] = [
    { id: 'ac1', who: 'Tom Baker', what: 'checked in 26 residents at Collingwood', when: '09:12', area: 'Residents' },
    { id: 'ac2', who: 'Aisha Khan', what: 'allocated 18 applications for 2027/28', when: '08:47', area: 'Allocations' },
    { id: 'ac3', who: 'You', what: 'approved 3 listings on the off-campus site', when: '08:30', area: 'Off-campus' },
    { id: 'ac4', who: 'Ravi Singh', what: 'rejected a landlord application (Mark Taylor)', when: 'Yesterday', area: 'Off-campus' },
    { id: 'ac5', who: 'Grace Evans', what: 'resolved MT-2184 · Mould in shower', when: 'Yesterday', area: 'Residents' },
    { id: 'ac6', who: 'You', what: 'added custom field “Floor area (m²)”', when: '2 days ago', area: 'Inventory' },
  ];
  const portal = { host: 'durham-homes.ac.uk', verified: true, autoPublishTrusted: false, requireDocs: true, enquiriesEnabled: true, showRent: true, brandColor: '#2563EB', siteName: 'Durham Resident Homes', tagline: 'Find a safe, approved home in Durham' };
  return { campuses, structures, customFields, properties, units, cycles, applications, offers, bookings, residents, maintenance, requests, notices, landlordApps, listings, enquiries, tasks, people, activity, portal };
}

export type Seed = ReturnType<typeof makeSeed>;
