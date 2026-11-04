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
  unit?: string; allocBy?: string; allocOn?: string; offer?: 'Accepted' | 'Offer open' | 'Declined'; override?: string;
  reason?: string; rejBy?: string; rejOn?: string; emailed?: boolean;
  opened?: string; log?: Hist[];
};
export type OfferStatus = 'open' | 'accepted' | 'declined' | 'lapsed';
export type Offer = {
  id: string; name: string; appId?: string; hall: string; room: string; unit: string; status: OfferStatus;
  sent: string; expires?: string; leftH?: number; reminders: number;
  accepted?: string; deposit?: string; declined?: string; reason?: string; unitNow?: string; lapsed?: string; wentTo?: string;
  next?: string; recent?: boolean; fromWaitlist?: string;
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
  return out;
}

function seedOffers(): Offer[] {
  return [
    { id: 'o1', name: 'Amira Rahman', hall: 'Ustinov', room: 'Accessible ensuite', unit: 'G.04.B', status: 'accepted', sent: '27 Oct', accepted: '28 Oct', deposit: 'Paid £250', reminders: 0, next: 'Booking created · lease sent', recent: true },
    { id: 'o2', name: 'Daniel Osei', hall: 'Josephine Butler', room: 'Ensuite', unit: '2.4.A', status: 'open', sent: '25 Oct', expires: '30 Oct 20:40', leftH: 52, reminders: 1, next: 'Reminder goes tomorrow 09:00', recent: true },
    { id: 'o3', name: 'Harvey Clarke', hall: 'Stephenson', room: 'Standard single', unit: '5.3.B', status: 'open', sent: '25 Oct', expires: '30 Oct 14:10', leftH: 46, reminders: 1, next: 'Reminder sent today', recent: true },
    { id: 'o4', name: 'Mei Lin', hall: 'Hild Bede', room: 'Standard single', unit: '1.2.C', status: 'open', sent: '24 Oct', expires: '29 Oct 10:00', leftH: 18, reminders: 2, next: 'Last reminder sent', recent: true },
    { id: 'o5', name: 'Jack Fenwick', hall: 'John Snow', room: 'Ensuite single', unit: '4.1.A', status: 'open', sent: '28 Oct', expires: '2 Nov 09:00', leftH: 120, reminders: 0, next: 'From the waitlist · #1 for John Snow ensuite', fromWaitlist: '#1', recent: true },
    { id: 'o6', name: 'Tomás García', hall: 'John Snow', room: 'Ensuite single', unit: '4.1.A', status: 'lapsed', sent: '22 Oct', lapsed: '27 Oct', reminders: 2, wentTo: 'Jack Fenwick · waitlist #1', next: 'No reply in 5 days · unit offered to Jack Fenwick', recent: true },
    { id: 'o7', name: 'Grace Adeyemi', hall: 'Hild Bede', room: 'Ensuite single', unit: '1.2.D', status: 'declined', sent: '22 Oct', declined: '27 Oct', reason: 'Chose another university', unitNow: 'Offered to Ella Price', reminders: 1, next: 'Chose another university · unit re-offered', recent: true },
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
    { id: 'cy28', name: '2027/28', opens: '1 Oct 2026', ends: '19 Sep 2027', apps: 1184, allocated: 412, beds: 2893, status: 'open', from: '2026/27', closes: '31 Mar 2027', offersFrom: '20 Oct 2026', starts: '19 Sep 2027', accepted: 318, signed: 204 },
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
  const apps = seedApps(); const offers = seedOffers(); const bookings = seedBookings(); const waitlist = seedWait();
  const n = (s: AppStatus) => apps.filter((a) => a.status === s).length;
  const o = (s: OfferStatus) => offers.filter((x) => x.status === s).length;
  const active = bookings.filter((b) => !b.cancelled);
  return {
    cycles: seedCycles(), apps, offers, recent: RECENT_ORDER, waitlist, bookings, conflicts: seedConflicts(), used: {}, usedUnits: [],
    hidden: {
      manual: 14 - n('manual'), allocated: 2480 - n('allocated'), rejected: 96 - n('rejected'), other: 3410 - 128 - 14 - 2480 - 96,
      open: 42 - o('open'), accepted: 2215 - o('accepted'), declined: 176 - o('declined'), lapsed: 58 - o('lapsed'), waitlist: 63 - waitlist.length,
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
    { name: 'pms-allocations', storage: createJSONStorage(() => sessionStorage), version: 1 },
  ),
);

/* ---------------- Derived ---------------- */
export const fmtN = (n: number) => n.toLocaleString('en-GB');
export function appCounts(d: Data) {
  const n = (s: AppStatus) => d.apps.filter((a) => a.status === s).length;
  const review = n('review'), manual = n('manual') + d.hidden.manual, allocated = n('allocated') + d.hidden.allocated, rejected = n('rejected') + d.hidden.rejected;
  const all = d.apps.length + d.hidden.manual + d.hidden.allocated + d.hidden.rejected + d.hidden.other;
  return { review, manual, allocated, rejected, all };
}
export function offerCounts(d: Data) {
  const n = (s: OfferStatus) => d.offers.filter((o) => o.status === s).length;
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
    list = [0, 1, 2, 3].map((k) => {
      const v = seed + k * 7;
      const floor = step ? 'G' : String((v % 5) + 1);
      const code = `${floor}.${(v % 4) + 1}.${'ABCD'[(v >> 2) % 4]}`;
      const block = 'ABCD'[(v >> 1) % 4];
      return { code, where: `Block ${block} · ${floor === 'G' ? 'ground' : ['first', 'second', 'third', 'fourth', 'fifth'][+floor - 1]} floor`, match: 96 - k * 6 - (v % 3),
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
  return list.filter((u, i, arr) => !d.usedUnits.includes(`${hall} · ${u.code}`) && arr.findIndex((x) => x.code === u.code) === i).slice(0, Math.min(3, Math.max(free, 1)));
}
