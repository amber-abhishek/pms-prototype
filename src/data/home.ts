import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Tone } from './seed';

/* ---------- Types ---------- */
export type Due = 'overdue' | 'today' | 'week';
export type FromIcon = 'maintenance' | 'requests' | 'bookings' | 'notices' | 'applications' | 'properties' | 'roles' | 'reports' | 'settings' | 'task';
export type DueTone = 'red' | 'orange' | 'amber' | 'grey' | 'plain';
export const ME = 'Priya Shah';

export type Detail = {
  /** Sheet title, when it differs from the row title. */ title?: string;
  /** Sheet sub line, e.g. "Task from Requests · RQ-118". */ sub?: string;
  pills?: { label: string; tone: Tone; icon: 'calendar' | 'check' }[];
  facts?: [string, string][];
  /** Blue note that links to where the work is decided. */ decide?: { title: string; sub: string };
  teamNote?: string;
  activity?: { icon: 'plus' | 'user'; text: string }[];
  /** Who can take the task. `can` empty means nobody else can. */
  picker?: { title: string; can: { name: string; load: string }[]; cant: { name: string; role?: string; reason?: string }[] };
  /** Word used in the hand-off toast: "Room swap handed to Tom Baker". */ short?: string;
  /** Primary footer action: open the record, or approve right here. */ primary?: 'open' | 'approve';
  /** Hall the task belongs to; a person who doesn't cover it can't take it. */ hall?: string;
};

export type HTask = {
  id: string;
  title: string;
  /** Second line, used on the team board. */ sub?: string;
  from?: { icon: FromIcon; label: string };
  due: Due;
  dueLabel: string;
  dueTone: DueTone;
  owner: string;
  /** Set when Priya handed it on, so it stays (greyed) in her list for the session. */ handedFrom?: string;
  done: boolean;
  doneBy?: string;
  doneLabel?: string;
  /** Deep link to where the work happens. */ to?: string;
  openLabel?: string;
  detail?: Detail;
  /** The work was finished somewhere else since the list loaded. */ elsewhere?: { by: string; at: string; ago: string };
};

/* ---------- Main list: Priya's 9 + the team's 14 + done ---------- */
const swapDetail: Detail = {
  title: 'Approve room swap', sub: 'Task from Requests · RQ-118', short: 'Room swap', primary: 'open', hall: 'Collingwood',
  pills: [{ label: 'Due today', tone: 'orange', icon: 'calendar' }, { label: 'Both agreed', tone: 'green', icon: 'check' }],
  facts: [['Residents', 'Ella Morgan and Josh Patel'], ['Swap', 'Collingwood B.1.07 ↔ Collingwood D.3.02'], ['Rent change', 'Ella +£12 / wk · Josh −£12 / wk'], ['From', 'Monday 21 September']],
  decide: { title: 'Decide it in Requests', sub: 'The task closes itself when the request is approved or declined.' },
  teamNote: 'Ella asked for a quieter floor for her finals. Josh is fine with B block.',
  activity: [{ icon: 'plus', text: 'Created from RQ-118 · Fri 11 Sep' }, { icon: 'user', text: 'Assigned to you by the Collingwood rule · Fri 11 Sep' }],
  picker: { title: 'Can approve requests at Collingwood', can: [{ name: 'Tom Baker', load: '3 tasks today' }, { name: 'Aisha Khan', load: '7 tasks today' }], cant: [{ name: 'James Reed' }] },
};

const mine: HTask[] = [
  { id: 'k1', title: 'Assign the leaking radiator at Ustinov C.2.14', from: { icon: 'maintenance', label: 'Maintenance · MT-2291' }, due: 'overdue', dueLabel: 'Overdue 1h', dueTone: 'red', owner: ME, done: false, to: '/residents/maintenance?open=m1', openLabel: 'Open the fault',
    detail: { short: 'Radiator fault', sub: 'Task from Maintenance · MT-2291', hall: 'Ustinov', pills: [{ label: 'Overdue 1h', tone: 'red', icon: 'calendar' }],
      facts: [['Fault', 'Leaking radiator · urgent'], ['Room', 'Ustinov C.2.14'], ['Reported', 'Today 07:40 by the resident'], ['SLA', 'Assign within 1 hour']],
      decide: { title: 'Assign it in Maintenance', sub: 'The task closes itself when someone is assigned to the fault.' },
      activity: [{ icon: 'plus', text: 'Created from MT-2291 · Mon 14 Sep' }, { icon: 'user', text: 'Assigned to you because nobody is on call at Ustinov · Mon 14 Sep' }],
      picker: { title: 'Can assign faults at Ustinov', can: [{ name: 'Tom Baker', load: '3 tasks today' }, { name: 'Grace Evans', load: '5 tasks today' }], cant: [{ name: 'Aisha Khan', reason: 'Other hall' }, { name: 'James Reed', reason: 'No permission' }] } } },
  { id: 'k2', title: 'Approve room swap: Ella Morgan ↔ Josh Patel', from: { icon: 'requests', label: 'Requests · RQ-118' }, due: 'today', dueLabel: 'Today', dueTone: 'orange', owner: ME, done: false, to: '/residents/requests?open=rq1', openLabel: 'Open request', detail: swapDetail },
  { id: 'k3', title: 'Chase 14 unsigned leases before move-in', from: { icon: 'bookings', label: 'Bookings · 2026/27' }, due: 'today', dueLabel: 'Today', dueTone: 'orange', owner: ME, done: false, to: '/allocations/bookings?tab=Lease%20unsigned', openLabel: 'Open bookings',
    detail: { short: 'Lease chase', sub: 'Task from Bookings · 2026/27', pills: [{ label: 'Due today', tone: 'orange', icon: 'calendar' }],
      facts: [['Leases', '14 not signed'], ['Move-in', 'Saturday 19 September'], ['Why it matters', 'A signed lease is needed to collect keys']],
      decide: { title: 'Chase them in Bookings', sub: 'The task closes itself when every lease is signed.' },
      activity: [{ icon: 'plus', text: 'Created by the move-in check · Mon 14 Sep' }] } },
  { id: 'k4', title: 'Send the move-in notice to Ustinov residents', from: { icon: 'notices', label: 'Notices · draft' }, due: 'today', dueLabel: 'Today', dueTone: 'orange', owner: ME, done: false, to: '/residents/notices?open=n1', openLabel: 'Open notice',
    detail: { short: 'Move-in notice', sub: 'Task from Notices · draft', pills: [{ label: 'Due today', tone: 'orange', icon: 'calendar' }],
      facts: [['Notice', 'Move-in weekend at Ustinov'], ['Audience', 'Ustinov residents · 582'], ['Scheduled', 'Wednesday 09:00']],
      decide: { title: 'Finish it in Notices', sub: 'The task closes itself when the notice is sent or scheduled.' },
      activity: [{ icon: 'plus', text: 'Draft saved by you · Fri 11 Sep' }] } },
  { id: 'k5', title: 'Review 31 applications waiting more than 5 days', from: { icon: 'applications', label: 'Applications · 2027/28' }, due: 'week', dueLabel: 'Wed 16 Sep', dueTone: 'amber', owner: ME, done: false, to: '/allocations/applications?tab=To%20review', openLabel: 'Open applications',
    detail: { short: 'Application review', sub: 'Task from Applications · 2027/28', pills: [{ label: 'Wed 16 Sep', tone: 'amber', icon: 'calendar' }],
      facts: [['Applications', '31 waiting more than 5 days'], ['Cycle', '2027/28'], ['Oldest', '9 days']],
      decide: { title: 'Review them in Applications', sub: 'The task closes itself when none has waited more than 5 days.' } } },
  { id: 'k6', title: 'Check fire-door survey for St Mary’s College', from: { icon: 'properties', label: 'Properties' }, due: 'week', dueLabel: 'Thu 17 Sep', dueTone: 'amber', owner: ME, done: false, to: '/inventory/properties?open=p3', openLabel: 'Open property',
    detail: { short: 'Fire-door check', sub: 'Task from Properties', facts: [['Property', 'St Mary’s College'], ['Survey', 'Fire doors · due before move-in']] } },
  { id: 'k7', title: 'Give Tom access to Josephine Butler', from: { icon: 'roles', label: 'Roles and access' }, due: 'week', dueLabel: 'Fri 18 Sep', dueTone: 'grey', owner: ME, done: false, to: '/org/people', openLabel: 'Open Roles and access',
    detail: { short: 'Access request', sub: 'Task from Roles and access', facts: [['Person', 'Tom Baker · Hall manager'], ['Asks for', 'Josephine Butler']] } },
  { id: 'k8', title: 'Send weekly occupancy report to Estates', from: { icon: 'reports', label: 'Reports · scheduled' }, due: 'week', dueLabel: 'Fri 18 Sep', dueTone: 'grey', owner: ME, done: false, to: '/reports', openLabel: 'Open report',
    detail: { short: 'Occupancy report', sub: 'Task from Reports · scheduled', facts: [['Report', 'Occupancy by hall'], ['Send to', 'Estates']] } },
  { id: 'k9', title: 'Renew contractor list for 2026/27', from: { icon: 'settings', label: 'Settings' }, due: 'week', dueLabel: 'Fri 18 Sep', dueTone: 'grey', owner: ME, done: false, to: '/settings', openLabel: 'Open settings',
    detail: { short: 'Contractor list', sub: 'Task from Settings', facts: [['List', 'Approved contractors'], ['Year', '2026/27']] } },
];

const t = (id: string, title: string, icon: FromIcon, label: string, due: Due, dueLabel: string, dueTone: DueTone, owner: string): HTask => ({ id, title, from: { icon, label }, due, dueLabel, dueTone, owner, done: false });
const team: HTask[] = [
  t('tm1', 'Assign MT-203 · no power in kitchen', 'maintenance', 'Maintenance · MT-2203', 'overdue', 'Overdue 3h', 'red', 'Grace Evans'),
  t('tm2', 'Approve guest stay for Freya Wilson', 'requests', 'Requests · RQ-121', 'overdue', 'Overdue 1d', 'red', 'Tom Baker'),
  t('tm3', 'Check in 12 late arrivals', 'bookings', 'Bookings · Van Mildert', 'today', 'Today', 'orange', 'Aisha Khan'),
  t('tm4', 'Allocate 18 rooms for returning students', 'applications', 'Applications · 2027/28', 'today', 'Today', 'orange', 'Aisha Khan'),
  t('tm5', 'Collect keys from Collingwood leavers', 'bookings', 'Bookings · 2026/27', 'today', 'Today', 'orange', 'Tom Baker'),
  t('tm6', 'Replace smoke alarm batteries, Ustinov B block', 'maintenance', 'Maintenance · MT-2288', 'today', 'Today', 'orange', 'Grace Evans'),
  t('tm7', 'Review 4 landlord applications', 'applications', 'Off-campus · landlords', 'today', 'Today', 'orange', 'Ravi Singh'),
  t('tm8', 'Send the fire-drill notice', 'notices', 'Notices · draft', 'week', 'Thu 17 Sep', 'amber', 'James Reed'),
  t('tm9', 'Confirm catering numbers for move-in', 'properties', 'Properties · Collingwood', 'week', 'Wed 16 Sep', 'amber', 'Tom Baker'),
  t('tm10', 'Chase 4 unsigned bookings', 'bookings', 'Bookings · Ustinov', 'week', 'Wed 16 Sep', 'amber', 'Tom Baker'),
  t('tm11', 'Approve 3 listings on the off-campus site', 'applications', 'Off-campus · listings', 'week', 'Thu 17 Sep', 'amber', 'Ravi Singh'),
  t('tm12', 'Book the deep clean for Van Mildert', 'maintenance', 'Maintenance · planned', 'week', 'Fri 18 Sep', 'grey', 'Grace Evans'),
  t('tm13', 'Update front-desk rota', 'settings', 'Settings', 'week', 'Fri 18 Sep', 'grey', 'James Reed'),
  t('tm14', 'Reconcile August rent refunds', 'reports', 'Reports · finance', 'week', 'Fri 18 Sep', 'grey', 'Aisha Khan'),
];

const d = (id: string, title: string, icon: FromIcon, label: string, doneLabel: string): HTask => ({ id, title, from: { icon, label }, due: 'week', dueLabel: doneLabel, dueTone: 'grey', owner: ME, done: true, doneBy: ME, doneLabel });
const doneSeed: HTask[] = [
  d('dn1', 'Approve 3 listings on the off-campus site', 'applications', 'Off-campus · listings', 'Mon 14 Sep'),
  d('dn2', 'Publish the 2027/28 allocation cycle', 'applications', 'Applications · 2027/28', 'Fri 11 Sep'),
  d('dn3', 'Add custom field “Floor area (m²)”', 'properties', 'Properties', 'Fri 11 Sep'),
  d('dn4', 'Send arrival times to Collingwood porters', 'notices', 'Notices', 'Thu 10 Sep'),
  d('dn5', 'Sign off the Ustinov fire-risk assessment', 'properties', 'Properties', 'Wed 9 Sep'),
  d('dn6', 'Approve room swap: Noah Price ↔ Sam Lee', 'requests', 'Requests · RQ-109', 'Tue 8 Sep'),
];
/** Done tasks before the seed rows, so the Done tab reads 41. */
export const DONE_EARLIER = 35;

/* ---------- Edge-case boards (hidden toggles: /tasks?case=e1|e2|e3|caughtup) ---------- */
export type CaseId = 'e1' | 'e2' | 'e3' | 'caughtup';
export const CASES: CaseId[] = ['e1', 'e2', 'e3', 'caughtup'];
/** Tasks that sit behind the visible rows, so tab counts read as the frames do. */
export const EXTRAS: Record<CaseId, { overdue: number; today: number; week: number; done: number; tab: 'overdue' | 'today' }> = {
  e1: { overdue: 12, today: 1, week: 8, done: 86, tab: 'overdue' },
  e2: { overdue: 9, today: 2, week: 8, done: 86, tab: 'overdue' },
  e3: { overdue: 9, today: 2, week: 8, done: 86, tab: 'overdue' },
  caughtup: { overdue: 0, today: 0, week: 0, done: 86, tab: 'today' },
};
/** E3: Tom's overdue tasks that are not on screen (8 in all). */
export const TOM_HIDDEN = 5;

const ex = (id: string, title: string, sub: string, due: Due, owner: string, hall?: string): HTask => ({
  id, title, sub, due, owner, done: false,
  dueLabel: due === 'week' ? 'This week' : due === 'today' ? 'Today' : 'Overdue 1d', dueTone: due === 'week' ? 'plain' : due === 'today' ? 'orange' : 'red',
  detail: hall ? { hall } : undefined,
});
const mt203 = ex('x4', 'Assign MT-203 · no power in kitchen', 'Collingwood · D kitchen', 'today', ME, 'Collingwood');
const late = ex('x5', 'Check in 12 late arrivals', 'Van Mildert front desk', 'today', 'Aisha Khan', 'Van Mildert');
const drill = ex('x6', 'Send the fire-drill notice', 'All halls · Thu 10:00', 'week', ME);
const tomRows = (): HTask[] => [
  { ...ex('x1', 'Approve a room swap', 'Collingwood · Ella Morgan ↔ Josh Patel', 'overdue', 'Tom Baker', 'Collingwood'), dueLabel: 'Overdue 2d', to: '/residents/requests?open=rq1',
    detail: { hall: 'Collingwood', short: 'Room swap', facts: [['Residents', 'Ella Morgan and Josh Patel'], ['Swap', 'Collingwood B.1.07 ↔ D.3.02'], ['Approved by', 'Tom Baker · 09:41'], ['From', 'Monday 21 September']] } },
  ex('x2', 'Review 31 applications waiting over 5 days', 'Allocations · 2026/27', 'overdue', 'Tom Baker', 'Collingwood'),
  ex('x3', 'Chase 4 unsigned bookings', 'Ustinov · offers accepted', 'overdue', 'Tom Baker', 'Ustinov'),
];
const caseSeed = (): Record<CaseId, HTask[]> => ({
  e1: [
    { ...ex('y1', 'Approve a room swap', 'Josephine Butler · Amir Haddad ↔ Leah Cole', 'today', ME, 'Josephine Butler'),
      detail: { hall: 'Josephine Butler', short: 'Swap', primary: 'approve',
        pills: [{ label: 'Due today', tone: 'orange', icon: 'calendar' }, { label: 'Both agreed', tone: 'green', icon: 'check' }],
        facts: [['Residents', 'Amir Haddad and Leah Cole'], ['Swap', 'Josephine Butler 2.14 ↔ 3.06'], ['Rent change', 'None · same room type'], ['From', 'Monday 21 September']],
        picker: { title: 'Can approve requests at Josephine Butler', can: [], cant: [{ name: 'Tom Baker', role: 'Collingwood only', reason: 'Other hall' }, { name: 'Aisha Khan', role: 'Van Mildert', reason: 'Other hall' }, { name: 'James Reed', role: 'Front desk', reason: 'No permission' }] } } },
    { ...mt203 }, { ...late }, { ...drill },
  ],
  e2: [...tomRows().map((r) => (r.id === 'x1' ? { ...r, elsewhere: { by: 'Tom Baker', at: '09:41', ago: '2 minutes ago' } } : r)), { ...mt203 }, { ...late }, { ...drill }],
  e3: [...tomRows(), { ...mt203 }, { ...late }, { ...drill }],
  caughtup: [
    { ...ex('z1', 'Give Tom access to Josephine Butler', 'Roles and access', 'week', ME), dueLabel: 'Fri 18 Sep', dueTone: 'grey' },
    { ...ex('z2', 'Send weekly occupancy report to Estates', 'Reports · scheduled', 'week', ME), dueLabel: 'Fri 18 Sep', dueTone: 'grey' },
    { ...ex('z3', 'Renew contractor list for 2026/27', 'Settings', 'week', ME), dueLabel: 'Fri 18 Sep', dueTone: 'grey' },
  ],
});

/** Halls each person covers; Josephine Butler is the one Aisha gets in E1. */
export const HALLS = [
  { name: 'Van Mildert College', rooms: 488 },
  { name: 'Collingwood College', rooms: 412 },
  { name: 'Josephine Butler College', rooms: 302 },
  { name: 'Ustinov College', rooms: 603 },
];

/* ---------- People ---------- */
export const PEOPLE: Record<string, { color: string; role: string; pronoun: 'he' | 'she' }> = {
  'Priya Shah': { color: '#E5530C', role: 'Accommodation manager', pronoun: 'she' },
  'Tom Baker': { color: '#0E7A80', role: 'Hall manager', pronoun: 'he' },
  'Aisha Khan': { color: '#6E3BD8', role: 'Hall manager', pronoun: 'she' },
  'James Reed': { color: '#64748B', role: 'Front desk', pronoun: 'he' },
  'Grace Evans': { color: '#DB2777', role: 'Maintenance', pronoun: 'she' },
  'Ravi Singh': { color: '#2563EB', role: 'Off-campus reviewer', pronoun: 'he' },
};

/* ---------- "Needs you today" on Overview ---------- */
export type Need = { id: string; icon: 'alert' | 'swap' | 'lease' | 'inbox' | 'notice' | 'landlord'; title: string; sub: string; badge: { label: string; tone: Tone; icon: 'clock' | 'calendar' | 'timer' | 'trend' | 'pencil' }; to: string; taskId?: string };
export const NEEDS: Need[] = [
  { id: 'n1', icon: 'alert', title: 'Leaking radiator, Ustinov C.2.14', sub: 'Urgent · reported 2h ago · no one assigned', badge: { label: 'Past SLA', tone: 'red', icon: 'clock' }, to: '/residents/maintenance?open=m1', taskId: 'k1' },
  { id: 'n2', icon: 'swap', title: 'Room swap: Ella Morgan ↔ Josh Patel', sub: 'Collingwood · both residents agreed', badge: { label: 'Due today', tone: 'orange', icon: 'calendar' }, to: '/residents/requests?open=rq1', taskId: 'k2' },
  { id: 'n3', icon: 'lease', title: '14 leases not signed', sub: 'Move-in on Saturday · lease needed to collect keys', badge: { label: '5 days', tone: 'amber', icon: 'timer' }, to: '/allocations/bookings?tab=Lease%20unsigned', taskId: 'k3' },
  { id: 'n4', icon: 'inbox', title: '31 applications waiting more than 5 days', sub: '2027/28 · To review', badge: { label: 'Behind', tone: 'orange', icon: 'trend' }, to: '/allocations/applications?tab=To%20review', taskId: 'k5' },
  { id: 'n5', icon: 'notice', title: 'Move-in notice to Ustinov residents', sub: 'Draft · scheduled for Wednesday 09:00', badge: { label: 'Draft', tone: 'grey', icon: 'pencil' }, to: '/residents/notices?open=n1', taskId: 'k4' },
  { id: 'n6', icon: 'landlord', title: 'Review 4 landlord applications', sub: 'Off-campus · oldest waiting 6 days', badge: { label: 'Behind', tone: 'orange', icon: 'trend' }, to: '/offcampus/landlords' },
];

/* ---------- Store ---------- */
export type Scope = 'main' | CaseId;
type State = {
  rows: Record<Scope, HTask[]>;
  patch: (scope: Scope, fn: (rows: HTask[]) => HTask[]) => void;
};
const seedRows = (): Record<Scope, HTask[]> => ({ main: [...mine, ...team, ...doneSeed], ...caseSeed() });

export const useHome = create<State>()(
  persist(
    (set) => ({
      rows: seedRows(),
      patch: (scope, fn) => set((s) => ({ rows: { ...s.rows, [scope]: fn(s.rows[scope]) } })),
    }),
    { name: 'pms-home', storage: createJSONStorage(() => sessionStorage) },
  ),
);

/** Priya's open tasks: the My tasks count in the sidebar. */
export const myOpenCount = (rows: HTask[]) => rows.filter((r) => !r.done && r.owner === ME).length;
