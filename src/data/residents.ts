import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Tone } from './seed';

/* ------------------------------------------------------------------ */
/* Residents (RMS): residents, requests, notices and maintenance faults */
/* ------------------------------------------------------------------ */

export type ResStatus = 'In residence' | 'Arriving' | 'Leaving';
export type Resident = {
  id: string; name: string; email: string; hall: string; room: string; roomType: string;
  status: ResStatus; arrivingThisWeek?: boolean; arrives?: string; slot?: string; leaves?: string;
  deposit: 'Paid' | 'Not paid'; depositNote?: string; lease: 'Signed' | 'Not signed'; leaseNote?: string;
  year: string; plan?: string; rent: number; checkedIn?: string; checkInNote?: string;
  /** The key fob handed over at check-in; no two residents share one. */
  fob?: string;
  /** Set while a deposit payment link or an override is out, so check-in can't start twice. */
  pending?: 'payment' | 'override';
  studentId: string; phone: string; course: string; emergency: string; application: string;
};

export type ReqStatus = 'Open' | 'Waiting on resident' | 'Approved' | 'Declined';
export type ReqKind = 'Room swap' | 'Leave early' | 'Overnight guest' | 'Parking permit' | 'Room move' | 'Furniture' | 'Early arrival';
export type SwapSide = { name: string; agreed: string; now: [string, string]; after: [string, string]; rentFrom: number; rentTo: number; reason: string };
export type CheckItem = { label: string; sub: string; ok: boolean };
export type ResRequest = {
  id: string; ref: string; kind: ReqKind; who: string; hall: string; detail: string;
  check: { label: string; tone: Tone }; waiting: string; waitDays: number; status: ReqStatus;
  sub?: string; due?: string; sides?: [SwapSide, SwapSide]; checks?: CheckItem[];
  history?: [string, string][]; decidedBy?: string;
  /** E1: a swap held because one resident is in arrears. */
  arrears?: { first: string; owes: string; paid?: string };
};

export type NoticeStatus = 'Sent' | 'Scheduled' | 'Draft';
export type Channels = { email: boolean; portal: boolean; sms: boolean };
export type Notice = {
  id: string; title: string; audience: string; count: number; status: NoticeStatus;
  opened?: number; when?: string; urgent?: boolean; pinned?: string;
  hall: string; group: string; channels: Channels; body: string;
};

export type Priority = 'Urgent' | 'High' | 'Normal';
export type FaultStatus = 'New' | 'In progress' | 'Waiting on parts' | 'Fixed';
export type FaultIcon = 'leak' | 'power' | 'lock' | 'shower' | 'lamp' | 'wifi' | 'cold' | 'window' | 'fan' | 'toilet' | 'light' | 'laundry' | 'mould' | 'wardrobe' | 'fridge' | 'blind' | 'alarm' | 'hot';
export type Fault = {
  id: string; ref: string; title: string; icon: FaultIcon; where: string; priority: Priority; category: string;
  /** Minutes until the SLA is due; negative once it is breached. */ slaMins: number;
  status: FaultStatus; assignee?: string; fixedIn?: string;
  reporter?: string; reporterRoom?: string; reported?: string; report?: string;
  hallFull?: string; sub?: string; rooms?: number;
  /** How far down the progress timeline the job is. */ stage?: number;
  approvedNote?: string;
};

/* ---------------- Residents ---------------- */
const shortHall: Record<string, string> = { 'Ustinov College': 'Ustinov', "St Mary's College": "St Mary's" };
export const hallShort = (h: string) => shortHall[h] ?? h;

const mk = (id: string, name: string, hall: string, room: string, roomType: string, status: ResStatus, rest: Partial<Resident> = {}): Resident => {
  const first = name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const last = name.split(' ').slice(-1)[0].toLowerCase();
  const n = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    id, name, hall, room, roomType, status, email: `${first}.${last}@durham.ac.uk`,
    deposit: 'Paid', depositNote: '£250 · card · 2 Aug', lease: 'Signed', leaseNote: 'Signed online · 2 Aug',
    year: 'Second year', rent: roomType.includes('Ensuite') ? 218 : 206,
    studentId: `00${1900000 + (n * 7919) % 99999}`, phone: `+44 7700 9${String(n * 37).padStart(5, '0').slice(-5)}`,
    course: 'BA History · Year 2', emergency: 'On file', application: `APP-27-0${1000 + (n % 900)} · from 2026/27 cycle`,
    ...rest,
  };
};

const baseResidents = (): Resident[] => [
  mk('r1', 'Amira Rahman', 'Ustinov College', 'G.04.A', 'Accessible ensuite', 'Arriving', {
    arrivingThisWeek: true, arrives: 'Sat 19 Sep', slot: '10:00–12:00', year: 'First year', plan: 'With Disability Support · carer room G.04.B next door',
    studentId: '001942871', phone: '+44 7700 900412', course: 'BSc Biosciences · Year 1', emergency: 'Nadia Rahman (mother)', application: 'APP-27-01842 · from 2026/27 cycle',
  }),
  mk('r2', 'Ella Morgan', 'Collingwood', 'B.1.07', 'Standard single', 'Arriving', { arrivingThisWeek: true, arrives: 'Today', deposit: 'Not paid', depositNote: '£250 due', year: 'Third year', course: 'BA English · Year 3' }),
  mk('r3', 'Josh Patel', 'Collingwood', 'D.3.02', 'Ensuite single', 'In residence', { arrivingThisWeek: true, arrives: 'Today', checkedIn: 'Today, 09:40 by James Ward', course: 'MEng Engineering · Year 3' }),
  mk('r4', 'Amir Haddad', 'Josephine Butler', '2.14', 'Ensuite single', 'Arriving', { arrivingThisWeek: true, arrives: 'Today', year: 'First year', course: 'BSc Physics · Year 1' }),
  mk('r5', 'Leo Grant', 'Ustinov College', 'C.2.14', 'Standard single', 'In residence', { year: 'Postgraduate', course: 'MA Archaeology' }),
  mk('r6', 'Hana Sato', 'Ustinov College', 'G.05.A', 'Ensuite single', 'Arriving', { arrivingThisWeek: true, arrives: 'Sat 19 Sep', slot: '12:00–14:00', year: 'First year' }),
  mk('r7', 'Ravi Mehta', 'Ustinov College', 'F.01.A', 'Standard single', 'Arriving', { arrivingThisWeek: true, arrives: 'Sat 19 Sep', slot: '14:00–16:00', year: 'First year' }),
  mk('r8', 'Chloé Martin', 'Ustinov College', 'F.03.B', 'Standard single', 'Arriving', { arrivingThisWeek: true, arrives: 'Sun 20 Sep', slot: '10:00–12:00', year: 'First year' }),
  mk('r9', 'Tunde Bello', 'Ustinov College', 'S.04.A', 'Ensuite single', 'Arriving', { arrivingThisWeek: true, arrives: 'Sun 20 Sep', slot: '12:00–14:00', year: 'First year', lease: 'Not signed', leaseNote: 'Sent 1 Sep · not signed yet' }),
  mk('r10', 'Mia Chen', 'Collingwood', 'A.1.12', 'Standard single', 'Arriving', { arrivingThisWeek: true, arrives: 'Tue 15 Sep', year: 'First year' }),
  mk('r11', 'Sam Whitfield', 'Collingwood', 'C.2.11', 'Standard single', 'Leaving', { leaves: '31 Jan' }),
  mk('r12', 'Priyanka Rao', 'Collingwood', 'A.0.03', 'Ensuite single', 'In residence'),
  mk('r13', 'Owen Hughes', 'Collingwood', 'B.3.01', 'Accessible ensuite', 'In residence', { plan: 'Blue badge · ground floor access' }),
  mk('r14', 'Lily Zhang', 'Collingwood', 'D.1.04', 'Standard single', 'In residence', { year: 'Third year' }),
  mk('r15', 'Ben Carter', 'Collingwood', 'B.2.09', 'Standard single', 'In residence'),
  mk('r16', 'Kai Nowak', 'Collingwood', 'C.3.05', 'Standard single', 'In residence'),
  mk('r17', 'Isla Thompson', 'Collingwood', 'A.2.04', 'Ensuite single', 'Arriving', { arrivingThisWeek: true, arrives: 'Thu 17 Sep', year: 'First year' }),
  mk('r18', 'Noah Evans', 'Van Mildert', 'A.1.05', 'Standard single', 'In residence'),
  mk('r19', 'Ruby Clarke', 'Van Mildert', 'B.2.11', 'Ensuite single', 'In residence', { year: 'Third year' }),
  mk('r20', 'Oliver Brown', "St Mary's College", '2.08', 'Standard single', 'In residence'),
  mk('r21', 'Freya Wilson', "St Mary's College", '1.12', 'Ensuite single', 'Leaving', { leaves: '19 Dec', year: 'Postgraduate' }),
  mk('r22', 'Harry Taylor', 'Josephine Butler', '3.06', 'Ensuite single', 'In residence'),
  mk('r23', 'Grace Lee', 'Josephine Butler', '1.09', 'Studio', 'Arriving', { arrivingThisWeek: true, arrives: 'Wed 16 Sep', year: 'Postgraduate' }),
  mk('r24', 'Daniel Okafor', 'Van Mildert', 'C.0.02', 'Standard single', 'Arriving', { arrivingThisWeek: true, arrives: 'Fri 18 Sep', year: 'First year', deposit: 'Not paid', depositNote: '£250 due' }),
  mk('r25', 'Sofia Rossi', 'Ustinov College', 'G.03.A', 'Ensuite single', 'In residence', { year: 'Postgraduate' }),
  mk('r26', 'Ethan Wright', 'Collingwood', 'B.1.03', 'Standard single', 'In residence'),
  mk('r27', 'Zara Ahmed', "St Mary's College", '3.01', 'Ensuite single', 'Arriving', { arrivingThisWeek: true, arrives: 'Sat 19 Sep', year: 'First year' }),
  mk('r28', 'Lucas Martin', 'Josephine Butler', '2.03', 'Standard single', 'Leaving', { leaves: '18 Jun 2027' }),
];
/** Everyone already in has a fob; arriving residents get theirs at check-in. */
export const seedResidents = (): Resident[] => baseResidents().map((r, i) => (r.status === 'Arriving' ? r : { ...r, fob: String(40100 + i * 7) }));

/* ---------------- Requests ---------------- */
const swapChecks = (arrears?: string): CheckItem[] => [
  { label: 'Both residents agreed', sub: 'In the resident portal', ok: true },
  { label: 'Same tenancy end date', sub: '18 Jun 2027 for both', ok: true },
  { label: 'No arrears', sub: arrears ?? 'Both up to date', ok: !arrears },
  { label: 'Nobody’s plan is affected', sub: 'No accessibility plan on either room', ok: true },
];

const names = ['Ruby Clarke', 'Noah Evans', 'Oliver Brown', 'Harry Taylor', 'Sofia Rossi', 'Ethan Wright', 'Zara Ahmed', 'Grace Lee', 'Daniel Okafor', 'Freya Wilson', 'Lucas Martin', 'Ava Walker', 'Jack Green', 'Maya Patel', 'Finn Murphy', 'Chloe King', 'Adam Scott', 'Erin Hall', 'Tom Ellis', 'Nina Kowalski'];
const doneKinds: [ReqKind, string][] = [['Overnight guest', '· 2 nights'], ['Furniture', '· extra shelf'], ['Parking permit', '· term permit'], ['Early arrival', '· from 12 Sep'], ['Room move', '→ quieter floor'], ['Room swap', '↔ same floor']];

export const seedRequests = (): ResRequest[] => {
  const rows: ResRequest[] = [
    {
      id: 'rq1', ref: 'RQ-118', kind: 'Room swap', who: 'Ella Morgan ↔ Josh Patel', hall: 'Collingwood', detail: 'Collingwood B.1.07 ↔ D.3.02',
      check: { label: 'Both agreed', tone: 'green' }, waiting: '3 days', waitDays: 3, status: 'Open', due: 'Due today',
      sub: 'Collingwood · requested by Ella Morgan on Fri 11 Sep · from Monday 21 September',
      sides: [
        { name: 'Ella Morgan', agreed: 'Agreed in the portal · 11 Sep', now: ['B.1.07', 'Standard single'], after: ['D.3.02', 'Ensuite single'], rentFrom: 206, rentTo: 218, reason: 'Quieter floor for her finals' },
        { name: 'Josh Patel', agreed: 'Agreed in the portal · 12 Sep', now: ['D.3.02', 'Ensuite single'], after: ['B.1.07', 'Standard single'], rentFrom: 218, rentTo: 206, reason: 'Wants to be near his course mates' },
      ],
      checks: swapChecks(),
      history: [['Reassigned to Tom Baker by Priya Shah', '14 Sep, 08:58'], ['Josh Patel agreed', '12 Sep'], ['Ella Morgan asked', '11 Sep']],
    },
    { id: 'rq2', ref: 'RQ-121', kind: 'Leave early', who: 'Sam Whitfield', hall: 'Collingwood', detail: 'Collingwood C.2.11 · from 31 Jan', check: { label: 'Needs a replacement', tone: 'orange' }, waiting: '1 day', waitDays: 1, status: 'Open',
      sub: 'Collingwood · requested by Sam Whitfield on Sun 13 Sep · leave from Sunday 31 January',
      checks: [{ label: 'Notice period met', sub: '4 months’ notice given', ok: true }, { label: 'Replacement found', sub: 'Nobody on the waitlist for C.2.11 yet', ok: false }, { label: 'No arrears', sub: 'Up to date', ok: true }],
      history: [['Sam Whitfield asked', '13 Sep']] },
    { id: 'rq3', ref: 'RQ-119', kind: 'Overnight guest', who: 'Priyanka Rao', hall: 'Collingwood', detail: 'Collingwood A.0.03 · 25–27 Sep', check: { label: 'Within the limit', tone: 'green' }, waiting: '2 days', waitDays: 2, status: 'Open',
      sub: 'Collingwood · requested by Priyanka Rao on Sat 12 Sep · 2 nights, 25–27 September',
      checks: [{ label: 'Within the guest limit', sub: '2 of 6 nights this term', ok: true }, { label: 'Guest named', sub: 'Meera Rao (sister)', ok: true }],
      history: [['Priyanka Rao asked', '12 Sep']] },
    { id: 'rq4', ref: 'RQ-117', kind: 'Parking permit', who: 'Owen Hughes', hall: 'Collingwood', detail: 'Collingwood · Blue badge', check: { label: 'Document missing', tone: 'orange' }, waiting: '4 days', waitDays: 4, status: 'Open',
      sub: 'Collingwood · requested by Owen Hughes on Thu 10 Sep · accessible bay',
      checks: [{ label: 'Blue badge uploaded', sub: 'Not uploaded yet', ok: false }, { label: 'Bay free', sub: '2 accessible bays free', ok: true }],
      history: [['Owen Hughes asked', '10 Sep']] },
    { id: 'rq5', ref: 'RQ-115', kind: 'Room move', who: 'Lily Zhang', hall: 'Collingwood', detail: 'Collingwood D.1.04 → any quieter floor', check: { label: 'Waiting on a room', tone: 'grey' }, waiting: '6 days', waitDays: 6, status: 'Open',
      sub: 'Collingwood · requested by Lily Zhang on Tue 8 Sep · any quieter floor',
      checks: [{ label: 'Room available', sub: 'No standard single free on floors 2–3', ok: false }, { label: 'No arrears', sub: 'Up to date', ok: true }],
      history: [['Lily Zhang asked', '8 Sep']] },
    { id: 'rq6', ref: 'RQ-114', kind: 'Furniture', who: 'Ben Carter', hall: 'Collingwood', detail: 'Collingwood B.2.09 · desk lamp', check: { label: 'Sent to Maintenance', tone: 'grey' }, waiting: '6 days', waitDays: 6, status: 'Open',
      sub: 'Collingwood · requested by Ben Carter on Tue 8 Sep · desk lamp',
      checks: [{ label: 'Logged as a fault', sub: 'MT-198 · Desk lamp broken', ok: true }],
      history: [['Sent to Maintenance as MT-198', '8 Sep'], ['Ben Carter asked', '8 Sep']] },
    {
      id: 'rq7', ref: 'RQ-120', kind: 'Room swap', who: 'Mia Chen ↔ Kai Nowak', hall: 'Collingwood', detail: 'Collingwood A.1.12 ↔ C.3.05',
      check: { label: 'Arrears', tone: 'red' }, waiting: '2 days', waitDays: 2, status: 'Waiting on resident',
      sub: 'Collingwood · requested by Mia Chen on Sat 12 Sep · from Monday 21 September',
      sides: [
        { name: 'Mia Chen', agreed: 'Agreed in the portal · 12 Sep', now: ['A.1.12', 'Standard single'], after: ['C.3.05', 'Standard single'], rentFrom: 206, rentTo: 206, reason: 'Closer to her friends on C floor' },
        { name: 'Kai Nowak', agreed: 'Agreed in the portal · 12 Sep', now: ['C.3.05', 'Standard single'], after: ['A.1.12', 'Standard single'], rentFrom: 206, rentTo: 206, reason: 'Wants to be near the main entrance' },
      ],
      checks: swapChecks('Kai owes £340 since 1 Sep'), arrears: { first: 'Kai', owes: 'Kai owes £340 since 1 Sep' },
      history: [['Held: Kai Nowak is in arrears', '12 Sep'], ['Kai Nowak agreed', '12 Sep'], ['Mia Chen asked', '12 Sep']],
    },
    { id: 'rq8', ref: 'RQ-116', kind: 'Early arrival', who: 'Isla Thompson', hall: 'Collingwood', detail: 'Collingwood A.2.04 · from 15 Sep', check: { label: 'Asked for flight time', tone: 'amber' }, waiting: '5 days', waitDays: 5, status: 'Waiting on resident',
      sub: 'Collingwood · requested by Isla Thompson on Wed 9 Sep · arrive Tuesday 15 September',
      checks: [{ label: 'Room ready', sub: 'Cleaned on 11 Sep', ok: true }, { label: 'Arrival time given', sub: 'Asked for her flight time', ok: false }],
      history: [['Asked Isla for her flight time', '10 Sep'], ['Isla Thompson asked', '9 Sep']] },
    { id: 'rq9', ref: 'RQ-122', kind: 'Overnight guest', who: 'Leo Grant', hall: 'Ustinov College', detail: 'Ustinov C.2.14 · 18–19 Sep', check: { label: 'Within the limit', tone: 'green' }, waiting: '5 hours', waitDays: 0, status: 'Open',
      sub: 'Ustinov College · requested by Leo Grant today · 1 night',
      checks: [{ label: 'Within the guest limit', sub: '1 of 6 nights this term', ok: true }],
      history: [['Leo Grant asked', '14 Sep, 06:10']] },
  ];
  for (let i = 0; i < 35; i++) {
    const [kind, tail] = doneKinds[i % doneKinds.length];
    const who = names[i % names.length];
    const declined = i >= 31;
    rows.push({
      id: `rqh${i}`, ref: `RQ-${113 - i}`, kind, who, hall: 'Collingwood', detail: `Collingwood ${['A', 'B', 'C', 'D'][i % 4]}.${(i % 3) + 1}.${String((i % 12) + 1).padStart(2, '0')} ${tail}`,
      check: declined ? { label: 'Rules not met', tone: 'red' } : { label: 'All checks passed', tone: 'green' },
      waiting: `${(i % 4) + 1} days`, waitDays: (i % 4) + 1, status: declined ? 'Declined' : 'Approved', decidedBy: i % 3 ? 'Tom Baker' : 'Priya Shah',
      sub: `Collingwood · requested by ${who} in August`, checks: [{ label: 'Checks', sub: declined ? 'Did not meet the hall rules' : 'All passed', ok: !declined }],
      history: [[declined ? 'Declined' : 'Approved', `${20 + (i % 10)} Aug`], [`${who} asked`, `${18 + (i % 10)} Aug`]],
    });
  }
  return rows;
};

/* ---------------- Notices ---------------- */
const ch = (sms = false): Channels => ({ email: true, portal: true, sms });
export const MOVE_IN_BODY = 'Hi {first name},\n\nYour arrival slot is {arrival slot} on Saturday 19 September. Come to the Ustinov reception with your passport or BRP; we’ll check you in and hand over your key fob.\n\nBring bedding, or order a bedding pack in the portal by Thursday.';
export const seedNotices = (): Notice[] => [
  { id: 'nt1', title: 'Fire alarm test, Wednesday 10:00', audience: 'Van Mildert · all residents', hall: 'Van Mildert', group: 'All residents', count: 557, status: 'Sent', opened: 88, when: 'Mon 14 Sep, 09:00', channels: ch(), body: 'The fire alarm will be tested at 10:00 on Wednesday. You do not need to leave the building.' },
  { id: 'nt2', title: 'Welcome week: what’s on', audience: 'All halls · arriving this week', hall: 'All halls', group: 'Arriving this week', count: 612, status: 'Sent', opened: 71, when: 'Fri 11 Sep, 12:00', channels: ch(), body: 'Freshers’ fair, college formal and the welcome barbecue: here is everything happening in your first week.' },
  { id: 'nt3', title: 'Water off in Block C, Thursday 9–11', audience: 'Collingwood · Block C', hall: 'Collingwood', group: 'Block C', count: 96, status: 'Scheduled', when: 'Wed 16 Sep, 18:00', channels: ch(), body: 'Estates are replacing a valve. Water will be off in Block C from 09:00 to 11:00 on Thursday.' },
  { id: 'nt4', title: 'Laundry cards now on sale', audience: 'St Mary’s College', hall: 'St Mary’s College', group: 'All residents', count: 118, status: 'Draft', channels: ch(), body: 'Laundry cards are on sale at reception, £10 for 6 washes.' },
  { id: 'n1', title: 'Move-in weekend: your arrival slot and what to bring', audience: 'Ustinov College · arriving this week', hall: 'Ustinov College', group: 'Arriving this week', count: 211, status: 'Draft', channels: ch(), body: MOVE_IN_BODY },
  { id: 'nt5', title: 'Wi-Fi maintenance window', audience: 'All halls · all residents', hall: 'All halls', group: 'All residents', count: 2893, status: 'Sent', opened: 64, when: 'Fri 11 Sep, 18:00', channels: ch(), body: 'Wi-Fi will be unavailable for 30 minutes from 23:00.' },
  { id: 'nt6', title: 'Bin collection moves to Tuesdays', audience: 'Collingwood · all residents', hall: 'Collingwood', group: 'All residents', count: 412, status: 'Sent', opened: 59, when: 'Thu 10 Sep, 10:00', channels: ch(), body: 'From next week bins are collected on Tuesdays.' },
  { id: 'nt7', title: 'Gym induction slots open', audience: 'Ustinov College · all residents', hall: 'Ustinov College', group: 'All residents', count: 582, status: 'Sent', opened: 47, when: 'Wed 9 Sep, 12:00', channels: ch(), body: 'Book a gym induction in the portal.' },
  { id: 'nt8', title: 'Lost property amnesty', audience: 'St Mary’s College · all residents', hall: 'St Mary’s College', group: 'All residents', count: 118, status: 'Sent', opened: 52, when: 'Tue 8 Sep, 09:30', channels: ch(), body: 'Collect anything you have lost from reception by Friday.' },
  { id: 'nt9', title: 'Bike store access codes changed', audience: 'Josephine Butler · all residents', hall: 'Josephine Butler', group: 'All residents', count: 450, status: 'Sent', opened: 76, when: 'Mon 7 Sep, 09:00', channels: ch(), body: 'The bike store code has changed. Find the new one in the portal.' },
  { id: 'nt10', title: 'Formal dinner booking opens', audience: 'Van Mildert · first years', hall: 'Van Mildert', group: 'First years', count: 210, status: 'Sent', opened: 83, when: 'Fri 4 Sep, 12:00', channels: ch(), body: 'Book your place at the first formal of term.' },
  { id: 'nt11', title: 'Parcel room hours this term', audience: 'Ustinov College · all residents', hall: 'Ustinov College', group: 'All residents', count: 582, status: 'Sent', opened: 69, when: 'Thu 3 Sep, 10:00', channels: ch(), body: 'The parcel room is open 08:00–20:00 every day.' },
  { id: 'nt12', title: 'Heating on for the term', audience: 'All halls · all residents', hall: 'All halls', group: 'All residents', count: 2893, status: 'Sent', opened: 58, when: 'Tue 1 Sep, 09:00', channels: ch(), body: 'Heating is on from today.' },
  { id: 'nt13', title: 'Library late opening this term', audience: 'All halls · all residents', hall: 'All halls', group: 'All residents', count: 2893, status: 'Sent', opened: 41, when: 'Mon 31 Aug, 12:00', channels: ch(), body: 'The Bill Bryson Library is open until midnight from this week.' },
];

/** How many residents match a hall and a status, for the audience builder. */
export const HALLS = ['All halls', 'Ustinov College', 'Collingwood', 'Van Mildert', 'St Mary’s College', 'Josephine Butler'];
export const GROUPS = ['All residents', 'Arriving this week', 'In residence', 'First years', 'Block C', 'Block D'];
const hallTotals: Record<string, number> = { 'All halls': 2893, 'Ustinov College': 582, Collingwood: 412, 'Van Mildert': 557, 'St Mary’s College': 118, 'Josephine Butler': 450 };
export function audienceCount(hall: string, group: string) {
  const total = hallTotals[hall] ?? 0;
  if (group === 'All residents') return total;
  if (hall === 'Ustinov College' && group === 'Arriving this week') return 211;
  if (hall === 'All halls' && group === 'Arriving this week') return 612;
  if (group === 'Arriving this week') return Math.round(total * 0.34);
  if (group === 'In residence') return Math.round(total * 0.64);
  if (group === 'First years') return Math.round(total * 0.38);
  return hall === 'Collingwood' && group === 'Block C' ? 96 : Math.round(total * 0.2);
}

/* ---------------- Maintenance ---------------- */
const leo = 'The radiator under the window is dripping from the valve at the bottom. There’s a puddle on the carpet and it’s getting bigger. I’ve put a towel down.';
const f = (id: string, ref: string, title: string, icon: FaultIcon, where: string, priority: Priority, category: string, slaMins: number, status: FaultStatus, assignee?: string, rest: Partial<Fault> = {}): Fault =>
  ({ id, ref, title, icon, where, priority, category, slaMins, status, assignee, ...rest });

const fixedTitles: [string, FaultIcon, string][] = [['Shower too cold', 'shower', 'Plumbing'], ['Light bulb out', 'light', 'Electrical'], ['Door closer broken', 'lock', 'Access'], ['Sink blocked', 'toilet', 'Plumbing'], ['Radiator not warm', 'cold', 'Heating'], ['Wi-Fi not connecting', 'wifi', 'IT'], ['Window handle loose', 'window', 'Windows'], ['Kettle tripping the fuse', 'power', 'Electrical']];
const fixedWhere = ['Collingwood · B.2.04', 'Ustinov · F.02.A', 'Van Mildert · C.1.08', 'St Mary’s · 1.04', 'Josephine Butler · 3.11', 'Collingwood · A kitchen', 'Ustinov · S.03.B'];

export const seedFaults = (): Fault[] => {
  const rows: Fault[] = [
    f('m10', 'MT-210', 'No hot water in Block C', 'hot', 'Ustinov · Block C', 'Urgent', 'Plumbing', -40, 'New', undefined, {
      hallFull: 'Ustinov College', rooms: 24, reported: '06:40', reporter: 'Night porter', reporterRoom: 'Ustinov reception',
      report: 'Several residents in Block C say there is no hot water in the showers or the kitchens since early this morning.',
      sub: 'Ustinov · Block C · 24 rooms · reported 06:40 · 4h deadline passed at 10:40',
    }),
    f('m1', 'MT-204', 'Radiator leaking onto the floor', 'leak', 'Ustinov · C.2.14', 'Urgent', 'Heating', 22 * 60, 'New', undefined, {
      hallFull: 'Ustinov College', reporter: 'Leo Grant', reporterRoom: 'C.2.14', reported: 'Mon 08:12', report: leo, stage: 1,
      sub: 'Ustinov College · Block C · C.2.14 · reported by Leo Grant in the resident portal on Mon 21 Sep, 08:12 · 24h deadline · due Tue 22 Sep, 08:12',
    }),
    f('m2', 'MT-203', 'No power in the kitchen sockets', 'power', 'Collingwood · D kitchen', 'Urgent', 'Electrical', 3 * 60, 'In progress', 'Dave Hughes'),
    f('m3', 'MT-201', 'Door fob not opening the room', 'lock', 'Van Mildert · A.1.05', 'High', 'Access', 28 * 60, 'In progress', 'Front desk'),
    f('m4', 'MT-199', 'Shower drains slowly', 'shower', 'St Mary’s · 2.08', 'Normal', 'Plumbing', 3 * 1440, 'New', 'Dave Hughes'),
    f('m5', 'MT-198', 'Desk lamp broken', 'lamp', 'Collingwood · B.2.09', 'Normal', 'Furniture', 4 * 1440, 'New'),
    f('m6', 'MT-196', 'Wi-Fi drops in the evening', 'wifi', 'Josephine Butler · Block 3', 'High', 'IT', 0, 'Waiting on parts', 'Campus IT'),
    f('m7', 'MT-195', 'Room too cold at night', 'cold', 'Ustinov · F.03.B', 'Normal', 'Heating', 5 * 1440, 'In progress', 'Northern Heating'),
    f('m8', 'MT-194', 'Window won’t close fully', 'window', 'Van Mildert · B.2.11', 'Normal', 'Windows', 5 * 1440 + 360, 'New'),
    f('m9', 'MT-193', 'Kitchen extractor fan noisy', 'fan', 'St Mary’s · kitchen 1', 'Normal', 'Ventilation', 6 * 1440, 'In progress', 'Estates helpdesk'),
    f('m11', 'MT-192', 'Toilet keeps running', 'toilet', 'Collingwood · C.1.03', 'High', 'Plumbing', 34 * 60, 'In progress', 'Dave Hughes'),
    f('m12', 'MT-191', 'Ceiling light flickering', 'light', 'Josephine Butler · 2.14', 'Normal', 'Electrical', 6 * 1440 + 120, 'New'),
    f('m13', 'MT-190', 'Washing machine 3 out of order', 'laundry', 'Ustinov · laundry', 'Normal', 'Laundry', 0, 'Waiting on parts', 'Estates helpdesk'),
    f('m14', 'MT-189', 'Mould on the bathroom ceiling', 'mould', 'Van Mildert · A.2.08', 'High', 'Damp', 44 * 60, 'In progress', 'Estates helpdesk'),
    f('m15', 'MT-188', 'Wardrobe door off its hinge', 'wardrobe', 'St Mary’s · 1.12', 'Normal', 'Furniture', 6 * 1440 + 480, 'New'),
    f('m16', 'MT-187', 'Fridge not cooling', 'fridge', 'Collingwood · A kitchen', 'High', 'Appliances', 2 * 1440, 'New', 'Front desk'),
    f('m17', 'MT-186', 'Blind cord snapped', 'blind', 'Ustinov · G.03.A', 'Normal', 'Furniture', 7 * 1440, 'New', 'Front desk'),
    f('m18', 'MT-185', 'Smoke alarm chirping', 'alarm', 'Josephine Butler · Block 1', 'High', 'Fire safety', 2 * 1440 + 180, 'New', 'Dave Hughes'),
  ];
  for (let i = 0; i < 212; i++) {
    const [title, icon, category] = fixedTitles[i % fixedTitles.length];
    const h = 4 + ((i * 7) % 40);
    rows.push(f(`mf${i}`, `MT-${184 - i}`, title, icon, fixedWhere[i % fixedWhere.length], i % 9 === 0 ? 'High' : 'Normal', category, 0, 'Fixed', ['Dave Hughes', 'Estates helpdesk', 'Front desk', 'Northern Heating'][i % 4], { fixedIn: h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h` }));
  }
  return rows;
};

export const fmtSla = (mins: number) => {
  const m = Math.abs(mins);
  if (m < 60) return `${m}m`;
  const d = Math.floor(m / 1440); const h = Math.floor((m % 1440) / 60);
  return d ? `${d}d${h ? ` ${h}h` : ''}` : `${h}h`;
};

/* ---------------- Store ---------------- */
type Data = { residents: Resident[]; requests: ResRequest[]; notices: Notice[]; faults: Fault[] };
type RmsState = Data & {
  /** Replace one collection with a function of itself; returns an undo function. */
  patch: <K extends keyof Data>(key: K, fn: (v: Data[K]) => Data[K]) => () => void;
  /** Update one record by id. Returns an undo function. */
  update: <K extends keyof Data>(key: K, id: string, ch: Partial<Data[K][number]>) => () => void;
};

type Rec = { id: string };
/* Undo puts back only the records this change touched, so undoing one check-in
   never reverts a later one made in between. */
function revertOnly(key: keyof Data, before: Rec[], after: Rec[]): () => void {
  const was = new Map(before.map((r) => [r.id, r]));
  const afterIds = new Set(after.map((r) => r.id));
  const touched = new Set(after.filter((r) => was.get(r.id) !== r).map((r) => r.id));
  const removed = before.filter((r) => !afterIds.has(r.id));
  return () => useRms.setState((s: RmsState) => ({
    [key]: [...removed, ...(s[key] as Rec[]).flatMap((r) => (touched.has(r.id) ? (was.has(r.id) ? [was.get(r.id)!] : []) : [r]))],
  }) as Partial<RmsState>);
}

const seed = (): Data => ({ residents: seedResidents(), requests: seedRequests(), notices: seedNotices(), faults: seedFaults() });

export const useRms: UseBoundStore<StoreApi<RmsState>> = create<RmsState>()(
  persist(
    (set, get) => ({
      ...seed(),
      patch: (key, fn) => {
        const prev = get()[key];
        set({ [key]: fn(prev) } as Partial<RmsState>);
        return revertOnly(key, prev as Rec[], get()[key] as Rec[]);
      },
      update: (key, id, ch) => {
        const prev = get()[key];
        set({ [key]: (prev as Rec[]).map((x) => (x.id === id ? { ...x, ...ch } : x)) } as Partial<RmsState>);
        return revertOnly(key, prev as Rec[], get()[key] as Rec[]);
      },
    }),
    { name: 'pms-residents', version: 1, storage: createJSONStorage(() => sessionStorage), partialize: (s) => ({ residents: s.residents, requests: s.requests, notices: s.notices, faults: s.faults }) },
  ),
);
