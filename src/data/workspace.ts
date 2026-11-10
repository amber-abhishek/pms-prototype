// Reports and Settings. Seeds match Figma "Workspace — flows" (2361:20): Flow 8, Flow 9, the
// Settings tabs (3054–3061) and edge cases E3 (integration stops syncing) and E4 (report bounces).
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { revertList } from './revert';

export type ReportDef = { id: string; name: string; area: 'Inventory' | 'Allocations' | 'Finance' | 'Maintenance' | 'Residents'; desc: string; to: string };
export const REPORTS: ReportDef[] = [
  { id: 'occupancy', name: 'Occupancy', area: 'Inventory', desc: 'Beds in residence, arriving and vacant, by hall and week', to: '/reports' },
  { id: 'applications', name: 'Applications funnel', area: 'Allocations', desc: 'Applied, offered, accepted and booked, by cycle', to: '/reports/applications' },
  { id: 'rent', name: 'Rent and arrears', area: 'Finance', desc: 'Billed, collected and overdue, by hall', to: '/reports/rent' },
  { id: 'sla', name: 'Maintenance deadlines', area: 'Maintenance', desc: 'Jobs fixed on time and cost, by hall and category', to: '/reports/maintenance-sla' },
  { id: 'requests', name: 'Requests', area: 'Residents', desc: 'What residents ask for and how fast it’s answered', to: '/reports/requests' },
  { id: 'notices', name: 'Notice reach', area: 'Residents', desc: 'Delivered, opened and clicked, by notice', to: '/reports/notice-reach' },
];

export type Recipient = { id: string; name: string; sub: string; count: number; email?: string };
export type Schedule = {
  id: string; reportId: string; name: string; sendsTo: string; recipients: Recipient[]; day: string; time: string;
  lastSend: 'Delivered' | 'Not delivered' | 'Not sent yet'; formats: { pdf: boolean; csv: boolean }; bounced?: string;
};
export const whenLabel = (s: Pick<Schedule, 'day' | 'time'>) => (s.day === '1st' ? '1st of the month' : `${s.day}s ${s.time}`);
export const badgeLabel = (s: Pick<Schedule, 'day'>) => (s.day === '1st' ? 'Monthly · 1st' : `Weekly · ${s.day.slice(0, 3)}`);

const SCHEDULES: Schedule[] = [
  { id: 's1', reportId: 'occupancy', name: 'Occupancy by hall', sendsTo: 'head.collingwood@durham.ac.uk', recipients: [{ id: 'x1', name: 'head.collingwood@durham.ac.uk', sub: 'Email', count: 1, email: 'head.collingwood@durham.ac.uk' }], day: 'Monday', time: '08:00', lastSend: 'Not delivered', formats: { pdf: true, csv: false }, bounced: 'Mon 08:00' },
  { id: 's2', reportId: 'rent', name: 'Arrears over 30 days', sendsTo: 'finance@durham.ac.uk', recipients: [{ id: 'x2', name: 'finance@durham.ac.uk', sub: 'Email', count: 1, email: 'finance@durham.ac.uk' }], day: '1st', time: '08:00', lastSend: 'Delivered', formats: { pdf: true, csv: true } },
];

export type NotifRow = { id: string; event: string; sub: string; app: boolean; email: boolean; sms: boolean };
const NOTIFS: NotifRow[] = [
  { id: 'n1', event: 'New application', sub: 'When a student applies', app: true, email: false, sms: false },
  { id: 'n2', event: 'Offer accepted or declined', sub: 'For offers you sent', app: true, email: true, sms: false },
  { id: 'n3', event: 'Urgent maintenance', sub: 'Leaks, power and security', app: true, email: true, sms: false },
  { id: 'n4', event: 'Request waiting over 2 days', sub: 'For halls you look after', app: true, email: true, sms: false },
  { id: 'n5', event: 'Task assigned to me', sub: 'From anyone in the team', app: true, email: true, sms: false },
  { id: 'n6', event: 'Weekly digest', sub: 'Monday 08:00 · what changed last week', app: false, email: true, sms: false },
];

export type General = { name: string; short: string; timezone: string; currency: string; weekStarts: string; quietFrom: string; quietTo: string };
export type Year = { id: string; name: string; starts: string; ends: string; cycle: string; status: 'Upcoming' | 'Current' | 'Ended' };
export type Term = { id: string; name: string; starts: string; ends: string; weeks: number; due: string };
export type Payments = { methods: { card: boolean; bank: boolean; dd: boolean }; billed: string; due: string; deposit: number; remind: boolean; arrears: boolean; lateFee: boolean };
export type IntegrationState = 'connected' | 'failing' | 'available';
export type Integration = { id: string; name: string; short: string; state: IntegrationState; meta: string; desc: string };
export type Branding = { logo: string; colour: string; sender: string; replyTo: string; footer: string };

const INTEGRATIONS: Integration[] = [
  { id: 'sits', name: 'Student records (SITS)', short: 'Student records · SITS', state: 'connected', meta: 'Synced 12 min ago', desc: 'Students, courses and IDs for applications and check-in' },
  { id: 'entra', name: 'Microsoft Entra ID', short: 'Staff sign-in · Microsoft Entra', state: 'connected', meta: '14 members', desc: 'Staff sign in with their Durham account' },
  { id: 'salto', name: 'Salto access control', short: 'Door access · Salto', state: 'connected', meta: '1,883 fobs live', desc: 'Key fobs are issued at check-in and cancelled at move-out' },
  { id: 'xero', name: 'Xero', short: 'Finance · Xero', state: 'available', meta: '', desc: 'Send rent, refunds and repair costs to finance' },
  { id: 'slack', name: 'Slack', short: 'Chat · Slack', state: 'available', meta: '', desc: 'Post urgent maintenance to a channel' },
  { id: 'webhooks', name: 'Webhooks', short: 'Webhooks', state: 'available', meta: '', desc: 'Send events to your own systems' },
];

type WsState = {
  schedules: Schedule[]; notifs: NotifRow[]; general: General; years: Year[]; terms: Term[]; payments: Payments; integrations: Integration[]; branding: Branding;
  set: <K extends keyof Omit<WsState, 'set' | 'restore'>>(k: K, v: WsState[K] | ((cur: WsState[K]) => WsState[K])) => void;
  restore: (p: Partial<Omit<WsState, 'set' | 'restore'>>) => void;
};

export const useWorkspace = create<WsState>()(
  persist(
    (set) => ({
      schedules: SCHEDULES,
      notifs: NOTIFS,
      general: { name: 'Durham University Residences', short: 'Durham', timezone: 'Europe/London (GMT+1)', currency: 'GBP · £', weekStarts: 'Monday', quietFrom: '21:00', quietTo: '08:00' },
      years: [
        { id: 'y28', name: '2027/28', starts: '18 Sep 2027', ends: '16 Jun 2028', cycle: '2027/28 cycle · open', status: 'Upcoming' },
        { id: 'y27', name: '2026/27', starts: '19 Sep 2026', ends: '18 Jun 2027', cycle: '2026/27 cycle · closed', status: 'Current' },
        { id: 'y26', name: '2025/26', starts: '20 Sep 2025', ends: '19 Jun 2026', cycle: '2025/26 cycle · archived', status: 'Ended' },
      ],
      terms: [
        { id: 't1', name: 'Michaelmas', starts: '5 Oct 2026', ends: '11 Dec 2026', weeks: 10, due: '1 Oct' },
        { id: 't2', name: 'Epiphany', starts: '11 Jan 2027', ends: '19 Mar 2027', weeks: 10, due: '5 Jan' },
        { id: 't3', name: 'Easter', starts: '19 Apr 2027', ends: '18 Jun 2027', weeks: 9, due: '12 Apr' },
      ],
      payments: { methods: { card: true, bank: true, dd: false }, billed: 'Termly, in advance', due: 'Before each term starts', deposit: 250, remind: true, arrears: true, lateFee: false },
      integrations: INTEGRATIONS,
      branding: { logo: 'durham-crest.svg', colour: '#68246D', sender: 'Durham University Residences', replyTo: 'residences@durham.ac.uk', footer: 'Durham University Residences · The Palatinate Centre, Durham DH1 3LE\nYou get this because you live in a Durham college.' },
      set: (k, v) => set((st) => ({ [k]: typeof v === 'function' ? (v as (c: unknown) => unknown)(st[k]) : v }) as Partial<WsState>),
      restore: (p) => set(p),
    }),
    { name: 'pms-workspace', storage: createJSONStorage(() => sessionStorage) },
  ),
);
export const wid = (p: string) => `${p}${Math.random().toString(36).slice(2, 8)}`;
/** Undo for a schedules change: call before the change, use the result as the toast's Undo after it.
 *  Only the schedules this change touched go back; later changes stay. */
export function scheduleUndo() {
  const before = useWorkspace.getState().schedules;
  return { arm: () => { const after = useWorkspace.getState().schedules; return () => useWorkspace.setState({ schedules: revertList(before, after, useWorkspace.getState().schedules) }); } };
}
