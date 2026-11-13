import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/* Allocations (BMS) data: cycles, applications, offers & waitlist, bookings.
   The designs show big totals (3,410 applications, 2,216 bookings) but only a page of rows.
   We keep the rows the frames show, plus a fixed `hidden` offset per bucket, so counts stay in step as Priya works. */

export const TODAY = '27 Oct';
export const NOW = '27 Oct 10:42';
export const ME = 'Priya Shah';

/* ---------------- Halls, rooms, units ---------------- */
export const HALLS = ['Ustinov', 'Collingwood', 'Hild Bede', 'Josephine Butler', 'Stephenson', 'John Snow', 'Van Mildert'] as const;
export const hallFull: Record<string, string> = {
  Ustinov: 'Ustinov College', Collingwood: 'Collingwood College', 'Hild Bede': 'Hild Bede', 'Josephine Butler': 'Josephine Butler',
  Stephenson: 'Stephenson College', 'John Snow': 'John Snow College', 'Van Mildert': 'Van Mildert College',
};
export const ROOMS = ['Accessible ensuite', 'Ensuite single', 'Ensuite', 'Standard single', 'Studio'] as const;

export function roomTerms(hall: string, room: string) {
  if (room === 'Accessible ensuite') return { weeks: 51, rate: 212 };
  if (room === 'Studio') return { weeks: 51, rate: hall === 'Josephine Butler' ? 231 : 238 };
  if (room === 'Ensuite single') return hall === 'Hild Bede' ? { weeks: 44, rate: 196 } : { weeks: 51, rate: 212 };
  if (room === 'Ensuite') return { weeks: 51, rate: 205 };
  return { weeks: 44, rate: 168 };
}
const AVAIL_HALL: Record<string, number> = { Ustinov: 11, Collingwood: 2, 'Hild Bede': 3, 'Josephine Butler': 4, Stephenson: 6, 'John Snow': 2, 'Van Mildert': 5 };
const AVAIL_ROOM: Record<string, number> = { 'Ustinov|Accessible ensuite': 3, 'Collingwood|Accessible ensuite': 1, 'Hild Bede|Ensuite single': 0, 'Collingwood|Studio': 2 };
export const baseAvail = (hall: string, room: string) => AVAIL_ROOM[`${hall}|${room}`] ?? AVAIL_HALL[hall] ?? 3;

/* ---------------- Types ---------------- */
export type AppStatus = 'review' | 'manual' | 'allocated' | 'rejected' | 'waitlist' | 'declined';
export type Tag = 'Requirements' | 'No study offer' | 'Manual review';
export type Req = 'Step-free access' | 'Medication fridge' | 'Year-round stay';
export type App = {
  id: string; ref: string; name: string; email: string; year: 'First year' | 'Returning' | 'Postgraduate';
  hall: string; room: string; prefs: [string, string][]; tag?: Tag; waiting: number; submitted: string;
  status: AppStatus; fee: 'Home' | 'International'; guarantee: boolean; arrival: string; course: string; cycle: string;
  reqs: Req[]; toCheck?: Req[];
  why?: string; assignee?: string;
  unit?: string; allocBy?: string; allocOn?: string; offer?: 'Accepted' | 'Offer open' | 'Declined' | 'Lapsed'; override?: string;
  reason?: string; rejBy?: string; rejOn?: string; emailed?: boolean;
  opened?: string; log?: Hist[];
};
export type OfferStatus = 'open' | 'accepted' | 'declined' | 'lapsed';
export type Offer = {
  id: string; name: string; appId?: string; hall: string; room: string; unit: string; status: OfferStatus;
  sent: string; expires?: string; leftH?: number; reminders: number;
  accepted?: string; deposit?: string; declined?: string; reason?: string; unitNow?: string; lapsed?: string; wentTo?: string;
  next?: string; recent?: boolean; fromWaitlist?: string;
  /** The cycle (2027/28 when unset), and on generated accepted rows the booking's lease state. */ cycle?: string; lease?: Lease;
};
export type Wait = { id: string; name: string; hall: string; room: string; note: string; joined: string; appId?: string };
export type Lease = 'Signed' | 'Sent' | 'Draft';
export type Hist = { t: string; when: string; sub?: string };
export type Booking = {
  id: string; ref: string; name: string; hall: string; room: string; unit: string; term: string; lease: Lease; deposit: string; created: string;
  cancelled?: { on: string; reason: string; money: string; cooling?: boolean; offered?: boolean };
  missing?: string; leaseSent?: string; reminders?: number; waiting?: number; signedOn?: string; history: Hist[]; summer?: boolean;
};
export type ConflictSide = { name: string; ref: string; term: string; lease: Lease; note?: string };
export type Conflict = { id: string; unit: string; overlap: string; a: ConflictSide; b: ConflictSide };
export type CycleStatus = 'open' | 'tenancy' | 'closed' | 'upcoming';
export type Cycle = {
  id: string; name: string; opens: string; ends: string; apps: number; allocated: number; beds: number; status: CycleStatus;
  from?: string; closes?: string; offersFrom?: string; starts?: string; occupancy?: string; closedOn?: string;
  accepted?: number; signed?: number; extra?: string;
};

/* ---------------- Seed ---------------- */
type Spec = Partial<App> & { name: string; ref: string; hall: string; room: string };
function app(s: Spec, i: number): App {
  const second = s.prefs?.[1] ?? altPref(s.hall, s.room, i, 1);
  const third = s.prefs?.[2] ?? altPref(s.hall, s.room, i, 2);
  return {
    id: 'a' + s.ref, email: s.email ?? `${s.name.toLowerCase().split(' ')[0]}.${s.name.toLowerCase().split(' ').slice(-1)[0][0]}@durham.ac.uk`.normalize('NFD').replace(/[̀-ͯ]/g, ''),
    year: 'First year', prefs: [[s.hall, s.room], second, third], waiting: 1, submitted: '26 Oct', status: 'review',
    fee: i % 3 === 0 ? 'International' : 'Home', guarantee: true, arrival: '19 Sep 2027', course: COURSES[i % COURSES.length], cycle: '2027/28', reqs: [],
    ...s,
  } as App;
}
const COURSES = ['BSc Biosciences', 'BA History', 'MEng General Engineering', 'BSc Natural Sciences', 'BA English Literature', 'LLB Law', 'BSc Computer Science', 'BA Economics', 'BSc Psychology', 'MChem Chemistry'];
function altPref(hall: string, room: string, i: number, k: number): [string, string] {
  const others = HALLS.filter((h) => h !== hall);
  return [others[(i * 3 + k * 2) % others.length], k === 2 && room === 'Accessible ensuite' ? 'Ensuite single' : room];
}

const FIRST = ['Ella', 'Jacob', 'Isla', 'Noah', 'Freya', 'Leo', 'Ava', 'Ruby', 'Max', 'Evie', 'Arthur', 'Poppy', 'Theo', 'Lily', 'Finn', 'Maya', 'Rohan', 'Zoe', 'Callum', 'Anya', 'Kai', 'Nia', 'Elliot', 'Hana', 'Owen', 'Ivy', 'Samir', 'Rosa', 'Luca', 'Imogen', 'Dev', 'Esme', 'Ben', 'Layla', 'Jonah', 'Tara', 'Reuben', 'Mina', 'Alfie', 'Priya'];
const LAST = ['Walker', 'Patel', 'Hughes', 'Ahmed', 'Murphy', 'Clarke', 'Nguyen', 'Bennett', 'Kaur', 'Wilson', 'Okafor', 'Shaw', 'Reid', 'Khan', 'Baker', 'Lewis', 'Rahman', 'Turner', 'Doyle', 'Evans', 'Mensah', 'Price', 'Fraser', 'Begum', 'Hall', 'Young', 'Ali', 'Morgan', 'Foster', 'Silva'];
const COMBOS: [string, string][] = [['Ustinov', 'Standard single'], ['Collingwood', 'Ensuite single'], ['Collingwood', 'Standard single'], ['Hild Bede', 'Standard single'], ['Josephine Butler', 'Ensuite'], ['Josephine Butler', 'Studio'], ['Stephenson', 'Standard single'], ['John Snow', 'Ensuite single'], ['Van Mildert', 'Ensuite'], ['Ustinov', 'Ensuite single'], ['Stephenson', 'Ensuite'], ['Van Mildert', 'Standard single']];

function seedApps(): App[] {
  const design: Spec[] = [
    { name: 'Amira Rahman', ref: '11873', hall: 'Ustinov', room: 'Accessible ensuite', tag: 'Requirements', waiting: 9, submitted: '18 Oct', email: 'amira.r@durham.ac.uk', fee: 'International', course: 'BSc Biosciences', reqs: ['Step-free access', 'Medication fridge'], toCheck: ['Medication fridge'], prefs: [['Ustinov', 'Accessible ensuite'], ['Collingwood', 'Accessible ensuite'], ['Hild Bede', 'Ensuite single']], opened: '27 Oct, Priya' },
    { name: 'Leo Brennan', ref: '11901', hall: 'Collingwood', room: 'Studio', tag: 'No study offer', waiting: 8, submitted: '19 Oct', email: 'leo.brennan@outlook.com', fee: 'Home', course: '—', arrival: '20 Sep 2027', prefs: [['Collingwood', 'Studio'], ['Josephine Butler', 'Studio'], ['Ustinov', 'Ensuite single']] },
    { name: 'Mei Lin', ref: '11954', hall: 'Hild Bede', room: 'Standard single', tag: 'Manual review', waiting: 7, submitted: '20 Oct', fee: 'International', course: 'BSc Natural Sciences', toCheck: ['Medication fridge'], reqs: ['Medication fridge'] },
    { name: 'Daniel Osei', ref: '12010', hall: 'Josephine Butler', room: 'Ensuite', waiting: 6, submitted: '21 Oct', fee: 'Home', course: 'BA Economics' },
    { name: 'Priyanka Iyer', ref: '12133', hall: 'Ustinov', room: 'Accessible ensuite', tag: 'Requirements', waiting: 4, submitted: '23 Oct', fee: 'Home', course: 'LLB Law', reqs: ['Step-free access'], prefs: [['Ustinov', 'Accessible ensuite'], ['Collingwood', 'Accessible ensuite'], ['Stephenson', 'Ensuite']] },
    { name: 'Harvey Clarke', ref: '12102', hall: 'Stephenson', room: 'Standard single', waiting: 4, submitted: '23 Oct', fee: 'Home', course: 'MEng General Engineering' },
    { name: 'Tomás García', ref: '12160', hall: 'John Snow', room: 'Ensuite single', waiting: 3, submitted: '24 Oct', fee: 'International', course: 'BA History', email: 'tomas.g@durham.ac.uk' },
    { name: 'Grace Adeyemi', ref: '12201', hall: 'Hild Bede', room: 'Ensuite single', waiting: 2, submitted: '25 Oct', fee: 'Home', course: 'BSc Psychology' },
    { name: 'Oliver Wright', ref: '12245', hall: 'Collingwood', room: 'Standard single', waiting: 1, submitted: '26 Oct', fee: 'Home', course: 'BSc Computer Science' },
    { name: 'Sofia Rossi', ref: '12260', hall: 'Collingwood', room: 'Ensuite single', waiting: 1, submitted: '26 Oct', fee: 'International', course: 'BA English Literature' },
    { name: 'Hannah Kim', ref: '12288', hall: 'Ustinov', room: 'Standard single', waiting: 1, submitted: '26 Oct', fee: 'International' },
    { name: 'Arjun Mehta', ref: '12301', hall: 'Van Mildert', room: 'Ensuite', waiting: 1, submitted: '26 Oct', fee: 'Home' },
    { name: 'Yusuf Ali', ref: '12342', hall: 'Collingwood', room: 'Standard single', waiting: 1, submitted: '26 Oct', fee: 'Home' },
  ];
  const out = design.map((s, i) => app(s, i));
  // 115 more in To review, so the queue really holds 128.
  for (let i = 0; i < 115; i++) {
    const [hall, room] = COMBOS[(i * 5 + 3) % COMBOS.length];
    const name = `${FIRST[(i * 7) % FIRST.length]} ${LAST[(i * 11 + 3) % LAST.length]}`;
    const flagged = i % 29 === 7;
    out.push(app({ name, ref: String(12350 + i * 7), hall, room, waiting: i < 60 ? 1 : 0, submitted: i < 60 ? '26 Oct' : '27 Oct',
      year: i % 9 === 4 ? 'Returning' : i % 13 === 6 ? 'Postgraduate' : 'First year',
      ...(flagged ? { tag: 'Requirements' as Tag, reqs: ['Step-free access' as Req], hall: 'Ustinov', room: 'Accessible ensuite' } : {}),
      ...(i % 41 === 20 ? { reqs: ['Year-round stay' as Req] } : {}) }, i + 13));
  }
  const manual: Spec[] = [
    { name: 'Kwame Mensah', ref: '11930', hall: 'Collingwood', room: 'Ensuite single', why: 'Asks to live with a sibling', assignee: 'Tom Okafor', waiting: 6, submitted: '21 Oct' },
    { name: 'Hannah Moore', ref: '11966', hall: 'Ustinov', room: 'Studio', why: 'Care leaver · year-round room', assignee: ME, waiting: 5, submitted: '22 Oct', reqs: ['Year-round stay'] },
    { name: 'Aisha Bello', ref: '12011', hall: 'John Snow', room: 'Ensuite single', why: 'Late application', waiting: 4, submitted: '23 Oct' },
    { name: 'Ethan Walsh', ref: '12088', hall: 'Stephenson', room: 'Standard single', why: 'Two applications, different emails', waiting: 3, submitted: '24 Oct' },
    { name: 'Zara Ahmed', ref: '12093', hall: 'Josephine Butler', room: 'Ensuite', why: 'Under 18 at arrival', assignee: 'Tom Okafor', waiting: 3, submitted: '24 Oct' },
    { name: 'Noah Fischer', ref: '12190', hall: 'Collingwood', room: 'Studio', why: 'Fee status not confirmed', waiting: 2, submitted: '25 Oct' },
  ];
  manual.forEach((s, i) => out.push(app({ ...s, status: 'manual' }, i + 3)));
  const alloc: [string, string, string, string, string, string, App['offer']][] = [
    ['Lin Chen', '11811', 'Collingwood', 'Ensuite single', '3.1.B', 'Tom Okafor', 'Accepted'],
    ['Jack Fenwick', '11799', 'John Snow', 'Ensuite single', '4.1.A', 'From waitlist', 'Offer open'],
    ['Joy Okoro', '11760', 'Collingwood', 'Standard single', '3.2.A', 'Auto-allocate', 'Accepted'],
    ['Harriet Lowe', '11742', 'Stephenson', 'Standard single', '2.1.A', ME, 'Accepted'],
    ['Ben Carter', '11733', 'Hild Bede', 'Standard single', '2.2.B', 'Auto-allocate', 'Accepted'],
    ['Kofi Asante', '11702', 'Ustinov', 'Ensuite single', '1.3.C', 'Auto-allocate', 'Accepted'],
  ];
  const allocOn = ['24 Oct', '22 Oct', '21 Oct', '20 Oct', '19 Oct', '17 Oct'];
  alloc.forEach(([name, ref, hall, room, unit, by, offer], i) => out.push(app({ name, ref, hall, room, unit: `${hall} · ${unit}`, allocBy: by, allocOn: allocOn[i], offer, status: 'allocated', waiting: 0, submitted: '12 Oct' }, i)));
  const rej: [string, string, string, string, string, string][] = [
    ['Sam Taylor', '11977', 'Duplicate application', 'Tom Okafor', '26 Oct', 'Collingwood'],
    ['Freya Hughes', '11950', 'Withdrawn by the applicant', 'Self-service', '25 Oct', 'Hild Bede'],
    ['Marcus Bell', '11921', 'Not eligible for this cycle', ME, '24 Oct', 'Stephenson'],
    ['Chloe Martin', '12317', 'No offer to study at Durham', 'Tom Okafor', '22 Oct', 'Josephine Butler'],
    ['Ravi Patel', '11880', 'Other · moved to private halls', ME, '21 Oct', 'Hild Bede'],
  ];
  rej.forEach(([name, ref, reason, by, on, hall], i) => out.push(app({ name, ref, hall, room: hall === 'Josephine Butler' ? 'Studio' : 'Standard single', reason, rejBy: by, rejOn: on, emailed: true, status: 'rejected', waiting: 0, submitted: '15 Oct' }, i)));
  out.push(...bulk(out));
  out.push(...pastCycles());
  return out;
}

/* The rest of 2027/28, so every tab's number is real rows: the designs total 3,410 applications · 128 to review ·
   14 manual · 2,480 allocated · 96 rejected, and the remainder are waitlisted or declined. Deterministic (no
   Math.random), so a reset gives the same list. Names come from a separate pool, every pair used once. */
export const APP_TARGETS = { manual: 14, allocated: 2480, rejected: 96, all: 3410 };
const BULK_FIRST = ['Adam', 'Aisha', 'Alex', 'Amelia', 'Amir', 'Anna', 'Arjun', 'Aryan', 'Bella', 'Caleb', 'Chloe', 'Daisy', 'Daniel', 'Eden', 'Eliza', 'Emily', 'Ethan', 'Fatima', 'Felix', 'Florence', 'Gabriel', 'George', 'Hamza', 'Harper', 'Harry', 'Iris', 'Isaac', 'Jade', 'James', 'Jasmine', 'Joseph', 'Kiara', 'Laila', 'Liam', 'Lucy', 'Mason', 'Matilda', 'Mohammed', 'Nadia', 'Nathan', 'Olivia', 'Oscar', 'Phoebe', 'Rafael', 'Rhys', 'Sana', 'Sebastian', 'Sienna', 'Sofia', 'Thomas', 'Willow', 'Yusuf', 'Zain', 'Aaliyah', 'Beatrice', 'Cyrus', 'Delphine', 'Emeka', 'Farah', 'Hugo'];
const BULK_LAST = ['Abbott', 'Adeyemi', 'Akhtar', 'Barker', 'Bose', 'Brennan', 'Brooks', 'Campbell', 'Chen', 'Chowdhury', 'Cole', 'Dawson', 'Dixon', 'Edwards', 'Ellis', 'Farouk', 'Fletcher', 'Gallagher', 'Gill', 'Gordon', 'Greene', 'Hassan', 'Hayes', 'Holt', 'Hussain', 'Iqbal', 'Jackson', 'James', 'Jenkins', 'Kelly', 'Kennedy', 'Lam', 'Lawson', 'Lee', 'Lowe', 'Malik', 'Marsh', 'Mitchell', 'Moss', 'Nash', 'Obi', 'Owen', 'Parker', 'Perera', 'Quinn', 'Rana', 'Richards', 'Robinson', 'Saunders', 'Sharma', 'Simmons', 'Stone', 'Sutton', 'Thompson', 'Tran', 'Usman', 'Vaughan', 'Ward', 'Webb', 'Yates'];
const REJECT_REASONS: [string, number][] = [['No offer to study at Durham', 41], ['Duplicate application', 22], ['Withdrawn by the applicant', 19], ['Not eligible for this cycle', 9], ['Other · moved to private halls', 5]];
const MANUAL_WHY = ['Late application', 'Fee status not confirmed', 'Asks to live with a friend', 'Under 18 at arrival', 'Two applications, different emails', 'Medical letter to check', 'Wants a year-round room', 'Course start date unclear'];
const STAFF = [ME, 'Tom Okafor', 'Aisha Khan'];

function bulk(seeded: App[]): App[] {
  const live = seeded.filter((a) => a.cycle === '2027/28');
  const have = (s: AppStatus) => live.filter((a) => a.status === s).length;
  const need = {
    manual: APP_TARGETS.manual - have('manual'),
    allocated: APP_TARGETS.allocated - have('allocated'),
    rejected: APP_TARGETS.rejected - have('rejected'),
  };
  const other = APP_TARGETS.all - live.length - need.manual - need.allocated - need.rejected;
  const taken = new Set(seeded.map((a) => a.name));
  /* Units already spoken for, so no generated allocation lands on someone else's room. */
  const held = new Set<string>([
    ...seeded.filter((a) => a.cycle === '2027/28' && a.status === 'allocated' && a.unit).map((a) => a.unit!),
    ...seedOffers().filter((o) => o.status === 'open' || o.status === 'accepted').map((o) => `${o.hall} · ${o.unit}`),
    ...seedBookings().filter((b) => !b.cancelled).map((b) => `${b.hall} · ${b.unit}`),
    'Collingwood · 3.1.C', 'Collingwood · 3.1.D', 'Collingwood · 2.2.A',
  ]);
  let k = 0;
  const nextName = () => {
    for (;;) {
      const n = `${BULK_FIRST[k % BULK_FIRST.length]} ${BULK_LAST[(Math.floor(k / BULK_FIRST.length) * 7 + k) % BULK_LAST.length]}`;
      k++;
      if (!taken.has(n)) { taken.add(n); return n; }
    }
  };
  const out: App[] = [];
  let ref = 20001;
  /* A cheap integer hash, so neighbouring rows (same day, same status) don't fall into a visible pattern. */
  const h = (i: number, salt: number) => {
    let x = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b);
    x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15; x = Math.imul(x, 0x846ca68b); x ^= x >>> 16;
    return x >>> 0;
  };
  const base = (i: number) => {
    const [hall, room] = COMBOS[h(i, 1) % COMBOS.length];
    return { name: nextName(), ref: String(ref++), hall, room, year: (i % 9 === 4 ? 'Returning' : i % 13 === 6 ? 'Postgraduate' : 'First year') as App['year'] };
  };
  for (let i = 0; i < need.manual; i++) {
    out.push(app({ ...base(i), status: 'manual', why: MANUAL_WHY[i % MANUAL_WHY.length], assignee: i % 3 === 0 ? 'Tom Okafor' : undefined, waiting: 1 + (i % 4), submitted: `${22 + (i % 4)} Oct` }, i));
  }
  for (let i = 0; i < need.allocated; i++) {
    const b = base(i + 3);
    /* Offers went out from 20 Oct; most by auto-allocate in the first runs. */
    const day = 20 + (h(i, 2) % 8);
    const r = h(i, 3);
    const code = freeCode(held, b.hall, r % unitsPerHall()) ?? unitCode(r);
    held.add(`${b.hall} · ${code}`);
    out.push(app({ ...b, status: 'allocated', unit: `${b.hall} · ${code}`,
      allocBy: h(i, 4) % 5 === 0 ? STAFF[h(i, 5) % 3] : 'Auto-allocate', allocOn: `${day} Oct`,
      offer: h(i, 6) % 11 === 0 ? 'Offer open' : h(i, 6) % 23 === 1 ? 'Declined' : 'Accepted', waiting: 0, submitted: `${Math.max(1, day - 14 + (i % 5))} Oct` }, i));
  }
  /* Rejection reasons in the cycle report's proportions (41 · 22 · 19 · 14), minus the ones the designs show. */
  const reasons = REJECT_REASONS.flatMap(([r, n]) => Array(n).fill(r) as string[]);
  for (let i = 0; i < need.rejected; i++) {
    out.push(app({ ...base(i + 5), status: 'rejected', reason: reasons[(i * 17) % reasons.length], rejBy: i % 4 === 0 ? 'Self-service' : STAFF[i % 3], rejOn: `${14 + (i % 13)} Oct`, emailed: true, waiting: 0, submitted: `${4 + (i % 10)} Oct` }, i));
  }
  for (let i = 0; i < other; i++) {
    out.push(app({ ...base(i + 7), status: i % 4 === 0 ? 'declined' : 'waitlist', waiting: 0, submitted: `${3 + (i % 20)} Oct` }, i));
  }
  return out;
}

/* Earlier cycles, so clearing the Cycle filter shows more than 2027/28. 2026/27 is in tenancy but still takes in-year
   applications (January starters, visiting residents), so a few of those wait in To review; the rest are decided. */
function pastCycles(): App[] {
  const y27 = { cycle: '2026/27', arrival: '11 Jan 2027' };
  const review: Spec[] = [
    { name: 'Lukas Weber', ref: '10412', hall: 'Ustinov', room: 'Ensuite single', year: 'Postgraduate', course: 'MSc Data Science', fee: 'International', waiting: 23, submitted: '4 Oct' },
    { name: 'Camille Dubois', ref: '10418', hall: 'Josephine Butler', room: 'Studio', year: 'Returning', course: 'BA Modern Languages', fee: 'International', waiting: 19, submitted: '8 Oct' },
    { name: 'Hiro Tanaka', ref: '10431', hall: 'John Snow', room: 'Ensuite single', year: 'Postgraduate', course: 'MSc Physics', fee: 'International', waiting: 15, submitted: '12 Oct' },
    { name: 'Sophie Grant', ref: '10437', hall: 'Collingwood', room: 'Standard single', year: 'First year', course: 'BA History', fee: 'Home', waiting: 12, submitted: '15 Oct' },
    { name: 'Mateo Ruiz', ref: '10446', hall: 'Van Mildert', room: 'Ensuite', year: 'Postgraduate', course: 'MBA', fee: 'International', waiting: 10, submitted: '17 Oct', tag: 'No study offer' },
    { name: 'Grace Okafor', ref: '10452', hall: 'Stephenson', room: 'Standard single', year: 'Returning', course: 'LLB Law', fee: 'Home', waiting: 8, submitted: '19 Oct' },
  ];
  const allocated: [Spec, string, string, string][] = [
    [{ name: 'Elena Rossi', ref: '10388', hall: 'Hild Bede', room: 'Standard single', year: 'Postgraduate' }, 'Hild Bede · 1.4.A', ME, '2 Oct'],
    [{ name: 'Tom Hardy', ref: '10371', hall: 'Collingwood', room: 'Ensuite single', year: 'Returning' }, 'Collingwood · 2.1.C', 'Tom Okafor', '28 Sep'],
    [{ name: 'Aiko Mori', ref: '10359', hall: 'Ustinov', room: 'Studio', year: 'Postgraduate' }, 'Ustinov · 3.2.D', 'Auto-allocate', '24 Sep'],
    [{ name: 'Ben Ashworth', ref: '10340', hall: 'Stephenson', room: 'Ensuite', year: 'First year' }, 'Stephenson · 4.3.B', 'Auto-allocate', '20 Sep'],
  ];
  const rejected: [Spec, string, string, string][] = [
    [{ name: 'Daniel Novak', ref: '10395', hall: 'John Snow', room: 'Ensuite single' }, 'Withdrawn by the applicant', 'Self-service', '6 Oct'],
    [{ name: 'Leah Coombs', ref: '10366', hall: 'Van Mildert', room: 'Standard single' }, 'No offer to study at Durham', ME, '26 Sep'],
  ];
  const y26 = { cycle: '2025/26', arrival: '20 Sep 2025', submitted: '14 Mar' };
  const older: [Spec, string, string, string][] = [
    [{ name: 'Oscar Lindqvist', ref: '9821', hall: 'Collingwood', room: 'Standard single' }, 'Collingwood · 1.3.B', 'Auto-allocate', '2 Jun'],
    [{ name: 'Maya Fernandes', ref: '9804', hall: 'Josephine Butler', room: 'Ensuite' }, 'Josephine Butler · 2.2.A', ME, '28 May'],
    [{ name: 'Ifeoma Nwosu', ref: '9779', hall: 'Ustinov', room: 'Accessible ensuite' }, 'Ustinov · G.01.A', 'Tom Okafor', '21 May'],
  ];
  return [
    ...review.map((s, i) => app({ ...y27, ...s }, i + 2)),
    ...allocated.map(([s, unit, by, on], i) => app({ ...y27, ...s, unit, allocBy: by, allocOn: on, offer: 'Accepted', status: 'allocated', waiting: 0, submitted: '1 Sep' }, i)),
    ...rejected.map(([s, reason, by, on], i) => app({ ...y27, ...s, reason, rejBy: by, rejOn: on, emailed: true, status: 'rejected', waiting: 0, submitted: '3 Sep' }, i)),
    ...older.map(([s, unit, by, on], i) => app({ ...y26, ...s, unit, allocBy: by, allocOn: on, offer: 'Accepted', status: 'allocated', waiting: 0 }, i + 1)),
    app({ ...y26, name: 'Ruairi Doyle', ref: '9790', hall: 'Hild Bede', room: 'Standard single', reason: 'Duplicate application', rejBy: ME, rejOn: '19 May', emailed: true, status: 'rejected', waiting: 0 }, 4),
  ];
}

function seedOffers(): Offer[] {
  return [
    { id: 'o1', name: 'Amira Rahman', hall: 'Ustinov', room: 'Accessible ensuite', unit: 'G.04.B', status: 'accepted', sent: '27 Oct', accepted: '28 Oct', deposit: 'Paid £250', reminders: 0, next: 'Booking created · lease sent', recent: true },
    { id: 'o2', name: 'Daniel Osei', hall: 'Josephine Butler', room: 'Ensuite', unit: '2.4.A', status: 'open', sent: '25 Oct', expires: '30 Oct 20:40', leftH: 52, reminders: 1, next: 'Reminder goes tomorrow 09:00', recent: true },
    { id: 'o3', name: 'Harvey Clarke', hall: 'Stephenson', room: 'Standard single', unit: '5.3.B', status: 'open', sent: '25 Oct', expires: '30 Oct 14:10', leftH: 46, reminders: 1, next: 'Reminder sent today', recent: true },
    { id: 'o4', name: 'Mei Lin', hall: 'Hild Bede', room: 'Standard single', unit: '1.3.E', status: 'open', sent: '24 Oct', expires: '29 Oct 10:00', leftH: 18, reminders: 2, next: 'Last reminder sent', recent: true },
    { id: 'o5', name: 'Jack Fenwick', hall: 'John Snow', room: 'Ensuite single', unit: '4.1.A', status: 'open', sent: '28 Oct', expires: '2 Nov 09:00', leftH: 120, reminders: 0, next: 'From the waitlist · #1 for John Snow ensuite', fromWaitlist: '#1', recent: true },
    { id: 'o6', name: 'Tomás García', hall: 'John Snow', room: 'Ensuite single', unit: '4.1.A', status: 'lapsed', sent: '22 Oct', lapsed: '27 Oct', reminders: 2, wentTo: 'Jack Fenwick · waitlist #1', next: 'No reply in 5 days · unit offered to Jack Fenwick', recent: true },
    { id: 'o7', name: 'Grace Adeyemi', hall: 'Hild Bede', room: 'Ensuite single', unit: '1.2.D', status: 'declined', sent: '22 Oct', declined: '27 Oct', reason: 'Chose another operator', unitNow: 'Offered to Ella Price', reminders: 1, next: 'Chose another operator · unit re-offered', recent: true },
    { id: 'o8', name: 'Oliver Wright', hall: 'Collingwood', room: 'Standard single', unit: '2.3.A', status: 'accepted', sent: '22 Oct', accepted: '26 Oct', deposit: 'Paid £250', reminders: 1, next: 'Booking created · lease sent', recent: true },
    { id: 'o9', name: 'Sofia Rossi', hall: 'Collingwood', room: 'Ensuite single', unit: '3.1.D', status: 'open', sent: '24 Oct', expires: '29 Oct 16:30', leftH: 24, reminders: 2 },
    { id: 'o10', name: 'Priyanka Iyer', hall: 'Ustinov', room: 'Accessible ensuite', unit: 'G.02.A', status: 'open', sent: '26 Oct', expires: '31 Oct 11:00', leftH: 66, reminders: 0 },
    { id: 'o11', name: 'Lin Chen', hall: 'Collingwood', room: 'Ensuite single', unit: '3.1.B', status: 'accepted', sent: '24 Oct', accepted: '27 Oct', deposit: 'Paid £250', reminders: 0 },
    { id: 'o12', name: 'Joy Okoro', hall: 'Collingwood', room: 'Standard single', unit: '3.2.A', status: 'accepted', sent: '21 Oct', accepted: '25 Oct', deposit: 'Paid £250', reminders: 0 },
    { id: 'o13', name: 'Harriet Lowe', hall: 'Stephenson', room: 'Standard single', unit: '2.1.A', status: 'accepted', sent: '20 Oct', accepted: '24 Oct', deposit: 'Paid £250', reminders: 0 },
    { id: 'o14', name: 'Ben Carter', hall: 'Hild Bede', room: 'Standard single', unit: '2.2.B', status: 'accepted', sent: '19 Oct', accepted: '23 Oct', deposit: 'Paid £250', reminders: 0 },
    { id: 'o15', name: 'Josh Turner', hall: 'Collingwood', room: 'Standard single', unit: '1.1.C', status: 'declined', sent: '21 Oct', declined: '26 Oct', reason: 'Too expensive', unitNow: 'Offered to Mo Hassan', reminders: 1 },
    { id: 'o16', name: 'Isla Reid', hall: 'Ustinov', room: 'Ensuite single', unit: '2.4.B', status: 'declined', sent: '20 Oct', declined: '25 Oct', reason: 'Living at home', unitNow: 'Back in search', reminders: 0 },
    { id: 'o17', name: 'Kai Wong', hall: 'Stephenson', room: 'Ensuite', unit: '3.3.A', status: 'declined', sent: '19 Oct', declined: '24 Oct', reason: 'Wanted a different hall', unitNow: 'Offered to Lucy Grant', reminders: 1 },
    { id: 'o18', name: 'Nina Kaur', hall: 'John Snow', room: 'Ensuite single', unit: '1.2.A', status: 'declined', sent: '18 Oct', declined: '22 Oct', reason: 'No reason given', unitNow: 'Back in search', reminders: 2 },
    { id: 'o19', name: 'Ada Clarke', hall: 'Hild Bede', room: 'Standard single', unit: '3.1.A', status: 'lapsed', sent: '21 Oct', lapsed: '26 Oct', reminders: 2, wentTo: 'Ruth Evans · waitlist #1' },
    { id: 'o20', name: 'Felix Moore', hall: 'Collingwood', room: 'Ensuite single', unit: '2.2.D', status: 'lapsed', sent: '20 Oct', lapsed: '25 Oct', reminders: 2, wentTo: 'No one waiting · back in search' },
    { id: 'o21', name: 'Owen Price', hall: 'Stephenson', room: 'Standard single', unit: '4.2.C', status: 'lapsed', sent: '18 Oct', lapsed: '23 Oct', reminders: 2, wentTo: 'Sara Ali · waitlist #2' },
  ];
}
const RECENT_ORDER = ['o1', 'o2', 'o3', 'o4', 'o5', 'o6', 'o7', 'o8'];

function seedWait(): Wait[] {
  return [
    { id: 'w1', name: 'Tomás García', hall: 'John Snow', room: 'Ensuite single', note: 'Lapsed 27 Oct · asked to stay on the list', joined: '27 Oct' },
    { id: 'w2', name: 'Aisha Bello', hall: 'John Snow', room: 'Ensuite single', note: 'Late application', joined: '24 Oct' },
    { id: 'w3', name: 'Theo Grant', hall: 'John Snow', room: 'Ensuite single', note: '—', joined: '20 Oct' },
    { id: 'w4', name: 'Noah Fischer', hall: 'Collingwood', room: 'Studio', note: 'Fee status not confirmed', joined: '22 Oct' },
    { id: 'w5', name: 'Maya Singh', hall: 'Collingwood', room: 'Studio', note: '—', joined: '19 Oct' },
    { id: 'w6', name: 'Priyanka Iyer', hall: 'Ustinov', room: 'Accessible ensuite', note: 'Needs step-free · verified', joined: '23 Oct' },
  ];
}

/* The rest of 2027/28's offers and waitlist, so each tab's number is real rows (Open 42 · Accepted 2,215 ·
   Declined 176 · Lapsed 58 · Waitlist 63). Offers go to applications already allocated in bulk(), and each
   application's Offer column is set to match. Earlier cycles' allocations get accepted offers too, so clearing the
   Cycle filter widens the list. The design rows stay first; these follow, newest first. Deterministic. */
export const OFFER_TARGETS = { open: 42, accepted: 2215, declined: 176, lapsed: 58, waitlist: 63 };
const DECLINE_REASONS: [string, number][] = [['Chose another operator', 9], ['Too expensive', 5], ['Living at home', 4], ['Wanted a different hall', 3], ['No reason given', 3]];
const WAIT_NOTES = ['—', '—', '—', 'Late application', 'Fee status not confirmed', 'Lapsed · asked to stay on the list', 'Wants this hall only', 'Declined another hall', 'Needs step-free · verified'];
const hash = (i: number, salt: number) => {
  let x = Math.imul(i + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b);
  x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15; x = Math.imul(x, 0x846ca68b); x ^= x >>> 16;
  return x >>> 0;
};
const pad = (n: number) => String(n).padStart(2, '0');
const OFFER_LABEL: Record<OfferStatus, NonNullable<App['offer']>> = { open: 'Offer open', accepted: 'Accepted', declined: 'Declined', lapsed: 'Lapsed' };

function bulkOffers(apps: App[], seeded: Offer[], wait: Wait[]): { apps: App[]; offers: Offer[]; waitlist: Wait[] } {
  const have = (s: OfferStatus) => seeded.filter((o) => !o.cycle && o.status === s).length;
  const taken = new Set([...seeded.map((o) => o.name), ...wait.map((w) => w.name)]);
  const pool = apps.filter((a) => a.cycle === '2027/28' && a.status === 'allocated' && a.unit && !taken.has(a.name));
  const need: [OfferStatus, number][] = [['open', OFFER_TARGETS.open - have('open')], ['declined', OFFER_TARGETS.declined - have('declined')], ['lapsed', OFFER_TARGETS.lapsed - have('lapsed')], ['accepted', OFFER_TARGETS.accepted - have('accepted')]];
  /* Shuffle the pool by hash, so the declined and lapsed aren't all one hall or one day. */
  const order = pool.map((a, i) => [hash(i, 11), a] as const).sort((x, y) => x[0] - y[0]).map(([, a]) => a);
  const waiters = apps.filter((a) => a.cycle === '2027/28' && a.status === 'waitlist' && !taken.has(a.name));
  const declineReasons = DECLINE_REASONS.flatMap(([r, n]) => Array(n).fill(r) as string[]);
  const offers: Offer[] = [];
  const offerOf = new Map<string, NonNullable<App['offer']>>();
  let p = 0, w = 0;
  const nextWaiter = () => waiters[w++ % Math.max(1, waiters.length)];
  for (const [status, n] of need) {
    for (let j = 0; j < n && p < order.length; j++, p++) {
      const a = order[p];
      const r = hash(p, 12);
      const sentDay = Math.min(27, Math.max(15, +(a.allocOn ?? '20 Oct').split(' ')[0]));
      const o: Offer = { id: `g${a.ref}`, name: a.name, appId: a.id, hall: a.hall, room: a.room, unit: a.unit!.split(' · ')[1], status, sent: `${sentDay} Oct`, reminders: 0 };
      if (status === 'open') {
        const leftH = 3 + (r % 117);
        const at = 10 + leftH;
        const k = 27 + Math.floor(at / 24); // days from 27 Oct (the module-level date helpers aren't defined yet when the seed runs)
        const expDay = k > 31 ? `${k - 31} Nov` : `${k} Oct`;
        Object.assign(o, { leftH, expires: `${expDay} ${pad(at % 24)}:${pad((r >>> 8) % 60)}`, sent: `${k - 5} Oct`, reminders: leftH < 24 ? 2 : leftH < 48 ? 1 : 0 });
      } else if (status === 'accepted') {
        const lr = r % 20;
        Object.assign(o, { accepted: `${Math.min(27, sentDay + 1 + (r % 4))} Oct`, deposit: 'Paid £250', reminders: (r >>> 4) % 3 === 0 ? 1 : 0, lease: lr < 16 ? 'Signed' : lr < 19 ? 'Sent' : 'Draft' });
      } else if (status === 'declined') {
        const to = r % 3 !== 0 && waiters.length ? nextWaiter() : null;
        Object.assign(o, { declined: `${Math.min(27, sentDay + 1 + (r % 5))} Oct`, reason: declineReasons[r % declineReasons.length], unitNow: to ? `Offered to ${to.name}` : 'Back in search', reminders: r % 3 });
      } else {
        const s = 15 + (r % 8);
        const to = r % 4 !== 0 && waiters.length ? nextWaiter() : null;
        Object.assign(o, { sent: `${s} Oct`, lapsed: `${s + 5} Oct`, reminders: 2, wentTo: to ? `${to.name} · waitlist #1` : 'No one waiting · back in search' });
      }
      offers.push(o);
      offerOf.set(a.id, OFFER_LABEL[status]);
    }
  }
  const day = (o: Offer) => +(o.accepted ?? o.declined ?? o.lapsed ?? o.sent).split(' ')[0];
  offers.sort((x, y) => day(y) - day(x) || +y.id.slice(1) - +x.id.slice(1));
  /* Earlier cycles: every allocation there was accepted. */
  const past: Offer[] = apps.filter((a) => a.cycle !== '2027/28' && a.status === 'allocated' && a.unit).map((a) => (
    { id: `g${a.ref}`, name: a.name, appId: a.id, hall: a.hall, room: a.room, unit: a.unit!.split(' · ')[1], status: 'accepted', sent: a.allocOn ?? '—', accepted: a.allocOn, deposit: 'Paid £250', reminders: 0, cycle: a.cycle, lease: 'Signed' }));
  /* Waitlist: people whose application is waitlisted (not already offered a freed unit), spread over the room types, earliest first. */
  const rest = waiters.slice(Math.min(w, waiters.length));
  const extra: Wait[] = rest.slice(0, Math.max(0, OFFER_TARGETS.waitlist - wait.length)).map((a, i) => {
    const [hall, room] = COMBOS[hash(i, 13) % COMBOS.length];
    return { id: `gw${a.ref}`, name: a.name, appId: a.id, hall, room, note: WAIT_NOTES[hash(i, 14) % WAIT_NOTES.length], joined: `${8 + (hash(i, 15) % 19)} Oct` };
  }).sort((x, y) => +x.joined.split(' ')[0] - +y.joined.split(' ')[0]);
  return {
    apps: apps.map((a) => (offerOf.has(a.id) ? { ...a, offer: offerOf.get(a.id) } : a)),
    offers: [...seeded, ...offers, ...past],
    waitlist: [...wait, ...extra],
  };
}

const TERM = '19 Sep 2027 – 9 Sep 2028';
function bk(id: string, n: number, name: string, hall: string, room: string, unit: string, lease: Lease, created: string, x: Partial<Booking> = {}): Booking {
  return { id, ref: `BKG-2027-00${n}`, name, hall, room, unit, term: TERM, lease, deposit: lease === 'Draft' && !x.deposit ? 'Due £250' : 'Paid £250', created,
    history: [{ t: 'Booking created from an accepted offer', when: `${created} 19:05` }, ...(lease !== 'Draft' ? [{ t: 'Lease sent for signature', when: `${created} 19:05`, sub: 'automatic' }] : [])], ...x };
}
function seedBookings(): Booking[] {
  return [
    bk('b1', 4812, 'Amira Rahman', 'Ustinov', 'Accessible ensuite', 'G.04.B', 'Signed', '28 Oct', { signedOn: '30 Oct', history: [
      { t: 'Allocated and offered by Priya Shah', when: '27 Oct 10:42', sub: 'override: summer let overlap — “Jae Park leaves on 18 Sep · agreed with the Ustinov office”' },
      { t: 'Offer email sent to Amira', when: '27 Oct 10:42', sub: 'expires 1 Nov' },
      { t: 'Offer accepted · deposit paid £250', when: '28 Oct 19:05' },
      { t: 'Lease sent for signature', when: '28 Oct 19:05', sub: 'automatic' },
      { t: 'Lease signed by Amira', when: '30 Oct 08:12', sub: 'resident portal invite sent' },
    ] }),
    bk('b2', 4790, 'Lin Chen', 'Collingwood', 'Ensuite single', '3.1.B', 'Sent', '27 Oct', { leaseSent: '27 Oct', reminders: 1, waiting: 2 }),
    bk('b3', 4766, 'Oliver Wright', 'Collingwood', 'Standard single', '2.3.A', 'Sent', '26 Oct', { leaseSent: '26 Oct', reminders: 1, waiting: 3 }),
    bk('b4', 4702, 'Ben Carter', 'Hild Bede', 'Standard single', '2.2.B', 'Draft', '23 Oct', { missing: 'Deposit not paid', deposit: 'Due £250' }),
    bk('b5', 4120, 'Joy Okoro', 'Collingwood', 'Standard single', '3.2.A', 'Signed', '25 Oct', { signedOn: '26 Oct' }),
    bk('b6', 4501, 'Harriet Lowe', 'Stephenson', 'Standard single', '2.1.A', 'Signed', '24 Oct', { signedOn: '25 Oct' }),
    bk('b7', 4433, 'Grace Adeyemi', 'Hild Bede', 'Standard single', '1.2.C', 'Signed', '22 Oct', { signedOn: '23 Oct' }),
    bk('b8', 4388, 'Harvey Clarke', 'Stephenson', 'Standard single', '5.3.B', 'Signed', '20 Oct', { signedOn: '22 Oct' }),
    bk('b9', 4301, 'Kofi Asante', 'Ustinov', 'Ensuite single', '1.3.C', 'Sent', '21 Oct', { leaseSent: '21 Oct', reminders: 2, waiting: 8 }),
    bk('b10', 4290, 'Ella Price', 'Hild Bede', 'Ensuite single', '1.2.D', 'Sent', '20 Oct', { leaseSent: '20 Oct', reminders: 2, waiting: 9 }),
    bk('b11', 4211, 'Mo Hassan', 'Collingwood', 'Standard single', '1.1.C', 'Sent', '18 Oct', { leaseSent: '18 Oct', reminders: 3, waiting: 11 }),
    bk('b12', 4655, 'Lily Shaw', 'Ustinov', 'Ensuite single', '2.1.A', 'Draft', '22 Oct', { missing: 'Needs a guarantor', deposit: 'Paid £250' }),
    bk('b13', 4610, 'Omar Haddad', 'Collingwood', 'Ensuite single', '4.1.B', 'Draft', '21 Oct', { missing: 'Under 18 · parent must co-sign', deposit: 'Paid £250' }),
    bk('b14', 4588, 'Ruth Evans', 'Hild Bede', 'Standard single', '3.1.A', 'Draft', '20 Oct', { missing: 'Made by hand · lease not sent', deposit: 'Paid £250' }),
    bk('b15', 4377, 'Sam Rees', 'Collingwood', 'Standard single', '3.4.A', 'Signed', '14 Oct', { signedOn: '20 Oct' }),
    bk('c1', 4011, 'Ravi Patel', 'Hild Bede', 'Standard single', '2.4.A', 'Signed', '12 Oct', { cancelled: { on: '26 Oct', reason: 'Withdrew · private halls', money: 'Deposit refunded £250', cooling: true } }),
    bk('c2', 3987, 'Freya Hughes', 'Collingwood', 'Ensuite single', '1.4.B', 'Sent', '10 Oct', { cancelled: { on: '24 Oct', reason: 'Didn’t meet study offer', money: 'Deposit refunded £250' } }),
    bk('c3', 3954, 'Will Johnson', 'Ustinov', 'Ensuite single', '3.1.A', 'Draft', '9 Oct', { deposit: 'Nothing paid', cancelled: { on: '20 Oct', reason: 'Duplicate booking', money: 'Nothing paid' } }),
    bk('c4', 3902, 'Sophie Clark', 'Stephenson', 'Standard single', '1.2.D', 'Signed', '8 Oct', { cancelled: { on: '18 Oct', reason: 'Moved to Collingwood · 2.2.A', money: 'Deposit moved' } }),
  ];
}
function seedConflicts(): Conflict[] {
  return [
    { id: 'k1', unit: 'Collingwood · Bed 3.2.C', overlap: 'Overlap: the whole term',
      a: { name: 'Joy Okoro', ref: 'BKG-2027-004120', term: TERM, lease: 'Signed' }, b: { name: 'Sam Rees', ref: 'BKG-2027-004733', term: TERM, lease: 'Sent' } },
    { id: 'k2', unit: 'Stephenson · 4.2.C', overlap: 'Overlap: 19–21 Sep · 2 nights',
      a: { name: 'Harriet Lowe', ref: 'BKG-2027-004501', term: TERM, lease: 'Signed' }, b: { name: 'Jin Park', ref: 'BKG-2027-S0118', term: '1 Jul – 21 Sep 2027', lease: 'Signed', note: 'Summer let' } },
  ];
}
function seedCycles(): Cycle[] {
  return [
    { id: 'cy28', name: '2027/28', opens: '1 Oct 2026', ends: '19 Sep 2027', apps: APP_TARGETS.all, allocated: APP_TARGETS.allocated, beds: 2893, status: 'open', from: '2026/27', closes: '31 Mar 2027', offersFrom: '20 Oct 2026', starts: '19 Sep 2027', accepted: OFFER_TARGETS.accepted, signed: 1990 },
    { id: 'cy27', name: '2026/27', opens: '1 Oct 2025', ends: '19 Sep 2026', apps: 3410, allocated: 2481, beds: 2893, status: 'tenancy', accepted: 2215, signed: 2190 },
    { id: 'cy26', name: '2025/26', opens: '1 Oct 2024', ends: '20 Sep 2025', apps: 3288, allocated: 2802, beds: 2846, status: 'closed', occupancy: '98.5%', closedOn: '30 Sep 2025' },
    { id: 'cy25', name: '2024/25', opens: '1 Oct 2023', ends: '21 Sep 2024', apps: 3104, allocated: 2790, beds: 2812, status: 'closed', occupancy: '99.2%', closedOn: '30 Sep 2024' },
  ];
}

export type Data = {
  cycles: Cycle[]; apps: App[]; offers: Offer[]; recent: string[]; waitlist: Wait[]; bookings: Booking[]; conflicts: Conflict[];
  /** Beds taken this session per "hall|room", and units allocated ("Hall · code"). */ used: Record<string, number>; usedUnits: string[];
  /** Rows the designs count but don't show. Visible rows + hidden = the number on the tab. */
  hidden: { manual: number; allocated: number; rejected: number; other: number; open: number; accepted: number; declined: number; lapsed: number; waitlist: number; bookings: number; leaseSent: number; drafts: number; cancelled: number };
};
export function makeAllocSeed(): Data {
  const { apps, offers, waitlist } = bulkOffers(seedApps(), seedOffers(), seedWait()); const bookings = seedBookings();
  const active = bookings.filter((b) => !b.cancelled);
  return {
    cycles: seedCycles(), apps, offers, recent: RECENT_ORDER, waitlist, bookings, conflicts: seedConflicts(), used: {}, usedUnits: [],
    hidden: {
      manual: 0, allocated: 0, rejected: 0, other: 0, // every application is a real row now (see bulk())
      open: 0, accepted: 0, declined: 0, lapsed: 0, waitlist: 0, // every offer and waitlist entry is a real row now (see bulkOffers())
      bookings: 2216 - active.length, leaseSent: 185 - active.filter((b) => b.lease === 'Sent').length, drafts: 41 - active.filter((b) => b.lease === 'Draft').length,
      cancelled: 58 - bookings.filter((b) => b.cancelled).length,
    },
  };
}

type State = Data & {
  /** Change the data with a function of the current data. */ up: (fn: (d: Data) => Partial<Data>) => void;
  /** A copy of the data, for Undo. */ snap: () => Data;
  restore: (d: Data) => void;
};
const pick = (s: State): Data => ({ cycles: s.cycles, apps: s.apps, offers: s.offers, recent: s.recent, waitlist: s.waitlist, bookings: s.bookings, conflicts: s.conflicts, used: s.used, usedUnits: s.usedUnits, hidden: s.hidden });
export const useAlloc = create<State>()(
  persist(
    (set, get) => ({
      ...makeAllocSeed(),
      up: (fn) => set((s) => fn(pick(s))),
      snap: () => pick(get()),
      restore: (d) => set(d),
    }),
    { name: 'pms-allocations', storage: createJSONStorage(() => sessionStorage), version: 7 },
  ),
);

/* ---------------- Units ---------------- */
/* Function declarations, not consts: the seed builder above runs before this point in the file. */
/** Unit codes run floor.flat.room: 9 floors × 10 flats × 8 rooms = 720 per hall, more than any hall's seeded allocations. */
function unitsPerHall() { return 720; }
export function unitCode(k: number) { return `${1 + (k % 9)}.${1 + (Math.floor(k / 9) % 10)}.${'ABCDEFGH'[Math.floor(k / 90) % 8]}`; }
/** The first code in a hall nobody holds, starting from `seed` so applicants spread out. */
export function freeCode(held: Set<string>, hall: string, seed: number) {
  for (let k = 0; k < unitsPerHall(); k++) {
    const c = unitCode(seed + k);
    if (!held.has(`${hall} · ${c}`)) return c;
  }
  return null;
}
/** Every unit someone holds in a cycle ("Hall · code"): allocated applications, open or accepted offers, live bookings.
    `except` leaves out one applicant's own hold, so their current room still shows as theirs. */
export function heldUnits(d: Pick<Data, 'apps' | 'offers' | 'bookings' | 'usedUnits'>, cycle = '2027/28', except?: string) {
  const s = new Set<string>(d.usedUnits);
  d.apps.forEach((a) => { if (a.status === 'allocated' && a.unit && a.cycle === cycle && a.name !== except) s.add(a.unit); });
  d.offers.forEach((o) => { if ((o.status === 'open' || o.status === 'accepted') && (o.cycle ?? '2027/28') === cycle && o.name !== except) s.add(`${o.hall} · ${o.unit}`); });
  if (cycle === '2027/28') d.bookings.forEach((b) => { if (!b.cancelled && b.name !== except) s.add(`${b.hall} · ${b.unit}`); });
  return s;
}

/* ---------------- Undo ---------------- */
const keyOf = (x: unknown): string => (typeof x === 'string' ? x : ((x as { id?: string; name?: string }).id ?? (x as { name?: string }).name ?? JSON.stringify(x)));
function revertList<T>(before: T[], after: T[], cur: T[]): T[] {
  const b = new Map(before.map((x) => [keyOf(x), x]));
  const a = new Map(after.map((x) => [keyOf(x), x]));
  const touched = new Set([...a].filter(([k, x]) => b.get(k) !== x).map(([k]) => k));
  const removed = before.filter((x) => !a.has(keyOf(x)));
  return [...removed, ...cur.flatMap((x) => { const k = keyOf(x); return !touched.has(k) ? [x] : b.has(k) ? [b.get(k)!] : []; })];
}
function revertCounts<T extends Record<string, number>>(before: T, after: T, cur: T): T {
  const out: Record<string, number> = { ...cur };
  new Set([...Object.keys(before), ...Object.keys(after)]).forEach((k) => { out[k] = (cur[k] ?? 0) - (after[k] ?? 0) + (before[k] ?? 0); });
  return out as T;
}
/** Undo one action: put back only what that action changed, leaving anything done since untouched. */
export function revertData(before: Data, after: Data, cur: Data): Data {
  return {
    cycles: revertList(before.cycles, after.cycles, cur.cycles), apps: revertList(before.apps, after.apps, cur.apps),
    offers: revertList(before.offers, after.offers, cur.offers), recent: revertList(before.recent, after.recent, cur.recent),
    waitlist: revertList(before.waitlist, after.waitlist, cur.waitlist), bookings: revertList(before.bookings, after.bookings, cur.bookings),
    conflicts: revertList(before.conflicts, after.conflicts, cur.conflicts), usedUnits: revertList(before.usedUnits, after.usedUnits, cur.usedUnits),
    used: revertCounts(before.used, after.used, cur.used), hidden: revertCounts(before.hidden, after.hidden, cur.hidden),
  };
}

/* ---------------- Derived ---------------- */
export const fmtN = (n: number) => n.toLocaleString('en-GB');
export function appCounts(d: Data) {
  /* Tabs and the nav count the live cycle (what the default filter shows); earlier cycles appear when you clear it. */
  const live = d.cycles.find((c) => c.status === 'open')?.name ?? '2027/28';
  const apps = d.apps.filter((a) => a.cycle === live);
  const n = (s: AppStatus) => apps.filter((a) => a.status === s).length;
  const review = n('review'), manual = n('manual') + d.hidden.manual, allocated = n('allocated') + d.hidden.allocated, rejected = n('rejected') + d.hidden.rejected;
  const all = apps.length + d.hidden.manual + d.hidden.allocated + d.hidden.rejected + d.hidden.other;
  return { review, manual, allocated, rejected, all };
}
export function offerCounts(d: Data) {
  /* The tabs count the live cycle, like Applications; the list can widen with the Cycle filter. */
  const live = d.cycles.find((c) => c.status === 'open')?.name ?? '2027/28';
  const n = (s: OfferStatus) => d.offers.filter((o) => o.status === s && (o.cycle ?? '2027/28') === live).length;
  return { open: n('open') + d.hidden.open, accepted: n('accepted') + d.hidden.accepted, declined: n('declined') + d.hidden.declined, lapsed: n('lapsed') + d.hidden.lapsed, waitlist: d.waitlist.length + d.hidden.waitlist };
}
export function bookingCounts(d: Data) {
  const act = d.bookings.filter((b) => !b.cancelled);
  return { all: act.length + d.hidden.bookings, sent: act.filter((b) => b.lease === 'Sent').length + d.hidden.leaseSent, drafts: act.filter((b) => b.lease === 'Draft').length + d.hidden.drafts, conflicts: d.conflicts.length, cancelled: d.bookings.filter((b) => b.cancelled).length + d.hidden.cancelled };
}
export const available = (d: Data, hall: string, room: string) => Math.max(0, baseAvail(hall, room) - (d.used[`${hall}|${room}`] ?? 0));
export const fmtLeft = (h: number) => (h < 24 ? `${h}h` : h % 24 === 0 && h >= 72 ? `${h / 24}d` : `${Math.floor(h / 24)}d ${h % 24}h`);
export const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
export const firstName = (name: string) => name.split(' ')[0];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DIM = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
/** "29 Oct 10:00" + 2 days → "31 Oct 10:00". */
export function addDays(label: string, days: number) {
  const [d, m, ...rest] = label.split(' ');
  let day = +d + days, mi = MONTHS.indexOf(m);
  while (day > DIM[mi]) { day -= DIM[mi]; mi = (mi + 1) % 12; }
  return [String(day), MONTHS[mi], ...rest].join(' ');
}

/* ---------------- Units for the allocate sheet ---------------- */
export type UnitOpt = { code: string; where: string; match: number; tags: { label: string; tone: 'blue' | 'orange' | 'green' | 'purple' | 'red' }[]; overlap?: { title: string; body: string }; takenBy?: { who: string; to: string } };
export function unitsFor(d: Data, a: App, hall: string, room: string): UnitOpt[] {
  const free = available(d, hall, room);
  if (!free) return [];
  let list: UnitOpt[];
  if (a.ref === '11873' && hall === 'Ustinov') {
    list = [
      { code: 'G.04.B', where: 'Block D · ground floor', match: 98, tags: [{ label: 'Step-free', tone: 'blue' }, { label: 'Next to carer’s room', tone: 'red' }, { label: 'Kitchen with 5', tone: 'orange' }],
        overlap: { title: 'Overlaps a summer let by 2 days', body: 'Jae Park has G.04.B until 21 Sep 2027 · this term starts 19 Sep. Allocating anyway needs a reason.' } },
      { code: 'G.02.A', where: 'Block D · ground floor', match: 91, tags: [{ label: 'Step-free', tone: 'blue' }, { label: 'Kitchen with 7', tone: 'orange' }] },
      { code: '1.07.C', where: 'Block A · first floor', match: 84, tags: [{ label: 'Lift access', tone: 'green' }, { label: 'Accessible bathroom', tone: 'purple' }] },
    ];
  } else {
    const seed = [...(a.ref + hall)].reduce((s, c) => s + c.charCodeAt(0), 0);
    const step = a.reqs.includes('Step-free access');
    /* Four free rooms, picked past anything already held, so the list never offers someone else's room. */
    const busy = heldUnits(d, a.cycle, a.name);
    list = [0, 1, 2, 3].map((k) => {
      const v = seed + k * 7;
      const code = step ? `G.${(v % 4) + 1}.${'ABCD'[(v >> 2) % 4]}` : freeCode(busy, hall, v) ?? unitCode(v);
      busy.add(`${hall} · ${code}`);
      const floor = code.split('.')[0];
      const block = 'ABCD'[(v >> 1) % 4];
      return { code, where: `Block ${block} · ${floor === 'G' ? 'ground' : ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'][+floor - 1]} floor`, match: 96 - k * 6 - (v % 3),
        tags: [...(step ? [{ label: 'Step-free', tone: 'blue' as const }] : []), { label: `Kitchen with ${4 + (v % 5)}`, tone: 'orange' as const }, ...(k === 0 && a.reqs.includes('Year-round stay') ? [{ label: 'Year-round', tone: 'green' as const }] : [])] };
    });
    // E1: Sofia's best Collingwood room is taken by someone else while she is being allocated.
    if (a.ref === '12260' && hall === 'Collingwood') {
      list = [
        { code: '3.1.C', where: 'Block C · third floor', match: 97, tags: [{ label: 'Quiet floor', tone: 'green' }, { label: 'Kitchen with 6', tone: 'orange' }], takenBy: { who: 'Aisha', to: 'Ella Morgan' } },
        { code: '3.1.D', where: 'Block C · third floor', match: 95, tags: [{ label: 'Quiet floor', tone: 'green' }, { label: 'Kitchen with 6', tone: 'orange' }] },
        { code: '2.2.A', where: 'Block B · second floor', match: 88, tags: [{ label: 'Kitchen with 8', tone: 'orange' }] },
      ];
    }
  }
  const held = heldUnits(d, a.cycle, a.name);
  return list.filter((u, i, arr) => !held.has(`${hall} · ${u.code}`) && arr.findIndex((x) => x.code === u.code) === i).slice(0, Math.min(3, Math.max(free, 1)));
}
