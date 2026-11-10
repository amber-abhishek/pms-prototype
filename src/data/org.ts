// Organisation module: members, roles, campuses, teams and the access audit log.
// Seeds match Figma "Organisation — flows" (3020:21). Flow 1 is the default; the edge-case
// frames (E1–E4) and the empty states use their own member lists, loadable with ?demo=edge|empty.
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { revertList } from './revert';

export type Hall = { id: string; short: string; name: string; rooms: number };
/** Halls (properties) people can be given access to. Ids match the shared seed's properties. */
export const HALLS: Hall[] = [
  { id: 'p1', short: 'Ustinov', name: 'Ustinov College', rooms: 603 },
  { id: 'p2', short: 'Collingwood', name: 'Collingwood College', rooms: 412 },
  { id: 'p5', short: 'Van Mildert', name: 'Van Mildert College', rooms: 488 },
  { id: 'p4', short: 'Josephine Butler', name: 'Josephine Butler College', rooms: 450 },
  { id: 'p3', short: "St Mary's", name: "St Mary's College", rooms: 144 },
];
export const hallById = (id: string) => HALLS.find((h) => h.id === id);

export type PermArea = { area: string; perms: { id: string; label: string; hint?: string }[] };
export const PERMS: PermArea[] = [
  { area: 'Inventory', perms: [{ id: 'inv.view', label: 'View' }, { id: 'inv.edit', label: 'Edit' }, { id: 'inv.rent', label: 'Rent and fees' }] },
  { area: 'Allocations', perms: [{ id: 'alloc.view', label: 'View' }, { id: 'alloc.offer', label: 'Make offers' }, { id: 'alloc.cancel', label: 'Cancel bookings' }] },
  { area: 'Residents', perms: [{ id: 'res.view', label: 'View' }, { id: 'res.checkin', label: 'Check in and out' }, { id: 'res.requests', label: 'Approve requests' }, { id: 'res.notices', label: 'Send notices' }] },
  { area: 'Maintenance', perms: [{ id: 'maint.view', label: 'View' }, { id: 'maint.log', label: 'Log faults' }, { id: 'maint.assign', label: 'Assign and close' }] },
  { area: 'Finance', perms: [{ id: 'fin.view', label: 'View payments' }, { id: 'fin.refunds', label: 'Refunds' }] },
  { area: 'Workspace', perms: [{ id: 'ws.members', label: 'Members and roles' }, { id: 'ws.settings', label: 'Settings' }] },
];
export const ALL_PERMS = PERMS.flatMap((a) => a.perms.map((p) => p.id));

export type Role = { id: string; name: string; description: string; scope: 'given' | 'all'; personalData: boolean; perms: string[]; builtIn?: boolean; createdByYou?: boolean };
export type MemberStatus = 'Active' | 'Invited' | 'Invite expired';
/** `halls: 'all'` is every hall; otherwise hall ids. */
export type Member = { id: string; name: string; email: string; roleId: string; halls: 'all' | string[]; lastActive: string; status: MemberStatus; since: string; invitedAgo?: string };
export type Campus = { id: string; name: string; status: 'Active' | 'Draft' | 'Inactive'; address: string; city: string; region: string; postcode: string; country: string; amberRegion: string };
export type Team = { id: string; name: string; purpose: string; leadId: string; memberIds: string[]; halls: 'all' | string[] };
export type AuditEntry = { id: string; who: string; what: string; when: string; area: 'Members' | 'Roles' | 'Campuses' | 'Teams' };
export type Scenario = 'flow' | 'edge' | 'empty';

const P = (...ids: string[]) => ids;
const FULL_ROLES: Role[] = [
  { id: 'admin', name: 'Admin', description: 'Everything, in every hall, including members and settings.', scope: 'all', personalData: true, perms: ALL_PERMS, builtIn: true },
  { id: 'hallmgr', name: 'Hall manager', description: 'Runs a hall day to day.', scope: 'given', personalData: true, perms: P('inv.view', 'inv.edit', 'alloc.view', 'alloc.offer', 'res.view', 'res.checkin', 'res.requests', 'res.notices', 'maint.view', 'maint.log', 'maint.assign') },
  { id: 'rescoord', name: 'Residence coordinator', description: 'Looks after residents and their requests.', scope: 'given', personalData: true, perms: P('inv.view', 'alloc.view', 'res.view', 'res.checkin', 'res.requests') },
  { id: 'finance', name: 'Finance', description: 'Rent, deposits and refunds.', scope: 'all', personalData: false, perms: P('inv.view', 'inv.rent', 'alloc.view', 'res.view', 'fin.view', 'fin.refunds') },
  { id: 'maint', name: 'Maintenance', description: 'Estates staff who fix faults.', scope: 'given', personalData: false, perms: P('inv.view', 'maint.view', 'maint.log', 'maint.assign') },
  { id: 'frontdesk', name: 'Front desk', description: 'Reception: checks residents in and logs faults.', scope: 'given', personalData: true, perms: P('inv.view', 'alloc.view', 'res.view', 'res.checkin', 'maint.view', 'maint.log') },
  { id: 'readonly', name: 'Read only', description: 'Can look at everything, change nothing.', scope: 'all', personalData: false, perms: P('inv.view', 'alloc.view', 'res.view', 'maint.view') },
];
const role = (id: string) => FULL_ROLES.find((r) => r.id === id)!;

const FLOW_MEMBERS: Member[] = [
  { id: 'm1', name: 'Priya Shah', email: 'priya.shah@durham.ac.uk', roleId: 'admin', halls: 'all', lastActive: 'Now', status: 'Active', since: 'Jun 2024' },
  { id: 'm2', name: 'Tom Baker', email: 'tom.baker@durham.ac.uk', roleId: 'rescoord', halls: ['p2'], lastActive: '2h ago', status: 'Active', since: 'Sep 2024' },
  { id: 'm3', name: 'James Reed', email: 'james.reed@durham.ac.uk', roleId: 'finance', halls: 'all', lastActive: 'Yesterday', status: 'Active', since: 'Jan 2025' },
  { id: 'm4', name: 'Dave Hughes', email: 'dave.hughes@durham.ac.uk', roleId: 'maint', halls: ['p1', 'p2'], lastActive: 'Today', status: 'Active', since: 'Mar 2025' },
  { id: 'm5', name: 'Aisha Khan', email: 'aisha.khan@durham.ac.uk', roleId: 'frontdesk', halls: ['p1'], lastActive: '3d ago', status: 'Active', since: 'Aug 2025' },
  { id: 'm6', name: 'Mark Owens', email: 'mark.owens@durham.ac.uk', roleId: 'readonly', halls: 'all', lastActive: '2w ago', status: 'Active', since: 'Feb 2025' },
];

const wardenRole: Role = { id: 'warden', name: 'Hall warden', description: 'Lives in the hall. Checks residents in, handles requests and faults out of hours.', scope: 'given', personalData: true, perms: P('inv.view', 'alloc.view', 'res.view', 'res.notices'), createdByYou: false };
const estatesRole: Role = { id: 'estates', name: 'Estates', description: 'Estates team.', scope: 'given', personalData: false, perms: P('maint.view', 'maint.log', 'maint.assign') };
const EDGE_ROLES: Role[] = [role('admin'), { ...role('hallmgr'), perms: P('res.view', 'res.checkin', 'res.requests', 'res.notices', 'maint.view', 'maint.log', 'maint.assign', 'inv.view', 'alloc.view') }, { ...role('rescoord'), perms: P('res.view', 'res.checkin', 'res.requests') }, wardenRole, { ...role('frontdesk'), perms: P('res.view', 'res.checkin') }, estatesRole];
const EDGE_MEMBERS: Member[] = [
  { id: 'm1', name: 'Priya Shah', email: 'priya.shah@durham.ac.uk', roleId: 'admin', halls: 'all', lastActive: 'Now', status: 'Active', since: 'Jun 2024' },
  { id: 'm2', name: 'Tom Baker', email: 'tom.baker@durham.ac.uk', roleId: 'rescoord', halls: ['p2'], lastActive: '2h ago', status: 'Active', since: 'Sep 2024' },
  { id: 'm5', name: 'Aisha Khan', email: 'aisha.khan@durham.ac.uk', roleId: 'hallmgr', halls: ['p5', 'p2'], lastActive: 'Today', status: 'Active', since: 'Aug 2025' },
  { id: 'm3', name: 'James Reed', email: 'james.reed@durham.ac.uk', roleId: 'frontdesk', halls: ['p2'], lastActive: 'Yesterday', status: 'Active', since: 'Jan 2025' },
  { id: 'm7', name: 'Nina Walsh', email: 'nina.walsh@durham.ac.uk', roleId: 'warden', halls: ['p1'], lastActive: '—', status: 'Invite expired', since: 'Sep 2026', invitedAgo: '3 days ago' },
  { id: 'm8', name: 'Lucy Carter', email: 'lucy.carter@durham.ac.uk', roleId: 'warden', halls: ['p2'], lastActive: '1d ago', status: 'Active', since: 'Sep 2025' },
  { id: 'm9', name: 'Omar Bello', email: 'omar.bello@durham.ac.uk', roleId: 'warden', halls: ['p5'], lastActive: '4h ago', status: 'Active', since: 'Sep 2025' },
  { id: 'm10', name: 'Rhys Morgan', email: 'rhys.morgan@durham.ac.uk', roleId: 'warden', halls: ['p4'], lastActive: '2d ago', status: 'Active', since: 'Oct 2025' },
];

const CAMPUSES: Campus[] = [
  { id: 'c1', name: 'Durham City', status: 'Active', address: 'Stockton Road, Durham DH1 3LE, UK', city: 'Durham', region: 'England', postcode: 'DH1 3LE', country: 'United Kingdom', amberRegion: 'North East England' },
  { id: 'c2', name: "Queen's Campus", status: 'Active', address: 'University Boulevard, Stockton-on-Tees TS17 6BH, UK', city: 'Stockton-on-Tees', region: 'England', postcode: 'TS17 6BH', country: 'United Kingdom', amberRegion: 'North East England' },
];

const TEAMS: Team[] = [
  { id: 't1', name: 'Accommodation office', purpose: 'Allocations, offers and the cycle', leadId: 'm1', memberIds: ['m1', 'm3', 'm6'], halls: 'all' },
  { id: 't2', name: 'Collingwood', purpose: 'Everyone working in Collingwood', leadId: 'm2', memberIds: ['m2', 'm4'], halls: ['p2'] },
  { id: 't3', name: 'Ustinov', purpose: 'Everyone working in Ustinov', leadId: 'm5', memberIds: ['m5', 'm4'], halls: ['p1'] },
  { id: 't4', name: 'Estates', purpose: 'Repairs and planned maintenance', leadId: 'm4', memberIds: ['m4'], halls: 'all' },
];

const AUDIT: AuditEntry[] = [
  { id: 'a1', who: 'Priya Shah', what: 'changed Dave Hughes’s halls to Ustinov, Collingwood', when: 'Today, 09:40', area: 'Members' },
  { id: 'a2', who: 'Priya Shah', what: 'invited Aisha Khan as Front desk at Ustinov', when: '28 Aug 2025', area: 'Members' },
  { id: 'a3', who: 'Priya Shah', what: 'gave Read only “Inventory: View”', when: '14 Aug 2025', area: 'Roles' },
  { id: 'a4', who: 'Priya Shah', what: 'added the campus Queen’s Campus', when: '2 Aug 2025', area: 'Campuses' },
  { id: 'a5', who: 'Priya Shah', what: 'invited James Reed as Finance in all halls', when: '9 Jan 2025', area: 'Members' },
];

function scenario(s: Scenario) {
  if (s === 'edge') return { scenario: s, roles: EDGE_ROLES, members: EDGE_MEMBERS };
  if (s === 'empty') return { scenario: s, roles: FULL_ROLES.filter((r) => r.id !== 'hallmgr'), members: FLOW_MEMBERS.slice(0, 1) };
  return { scenario: s, roles: FULL_ROLES, members: FLOW_MEMBERS };
}

type OrgState = {
  scenario: Scenario; roles: Role[]; members: Member[]; campuses: Campus[]; teams: Team[]; audit: AuditEntry[];
  load: (s: Scenario) => void;
  emptyCampuses: () => void;
  set: <K extends 'roles' | 'members' | 'campuses' | 'teams'>(k: K, fn: (v: OrgState[K]) => OrgState[K]) => void;
  /** Restore a snapshot (for Undo). */
  restore: (snap: Partial<Pick<OrgState, 'roles' | 'members' | 'campuses' | 'teams' | 'audit'>>) => void;
  audit_: (what: string, area: AuditEntry['area']) => void;
};

export const useOrg = create<OrgState>()(
  persist(
    (set) => ({
      ...scenario('flow'), campuses: CAMPUSES, teams: TEAMS, audit: AUDIT,
      load: (s) => set(scenario(s)),
      emptyCampuses: () => set({ campuses: [] }),
      set: (k, fn) => set((st) => ({ [k]: fn(st[k]) }) as Partial<OrgState>),
      restore: (snap) => set(snap),
      audit_: (what, area) => set((st) => ({ audit: [{ id: `a${Date.now()}${Math.random().toString(36).slice(2, 5)}`, who: 'Priya Shah', what, when: 'Just now', area }, ...st.audit] })),
    }),
    { name: 'pms-org', storage: createJSONStorage(() => sessionStorage) },
  ),
);

export const oid = (p: string) => `${p}${Math.random().toString(36).slice(2, 8)}`;

/* ---------- undo ---------- */
type Lists = Pick<OrgState, 'roles' | 'members' | 'campuses' | 'teams'>;
const LISTS = ['roles', 'members', 'campuses', 'teams'] as const;
/** Take this before an action; pass it to undoSince after the action has run. */
export const snapOrg = (): Lists => { const s = useOrg.getState(); return { roles: s.roles, members: s.members, campuses: s.campuses, teams: s.teams }; };
/** An Undo for the action that ran since `before`. The audit log keeps its lines and records the undo. */
export function undoSince(before: Lists, what: string, area: AuditEntry['area']) {
  const after = snapOrg();
  return () => {
    const cur = useOrg.getState();
    const patch: Partial<Lists> = {};
    for (const k of LISTS) if (before[k] !== after[k]) (patch as Record<string, unknown>)[k] = revertList(before[k] as { id: string }[], after[k] as { id: string }[], cur[k] as { id: string }[]);
    useOrg.setState(patch);
    cur.audit_(`undid “${what}”`, area);
  };
}

/* ---------- helpers ---------- */
export function hallsLabel(h: Member['halls'], long = false) {
  if (h === 'all') return 'All halls';
  return h.map((id) => (long ? hallById(id)?.name : hallById(id)?.short) ?? id).join(', ');
}
/** "Everything" / "Residents, Requests, Maintenance" style summary for the Roles table. */
export function roleCan(r: Role) {
  if (ALL_PERMS.every((p) => r.perms.includes(p))) return 'Everything';
  const out: string[] = [];
  for (const a of PERMS) {
    const has = a.perms.filter((p) => r.perms.includes(p.id));
    if (!has.length) continue;
    out.push(has.length === 1 && has[0].label === 'View' ? `${a.area} (read)` : a.area);
  }
  return out.join(', ') || 'Nothing yet';
}
/** "Residents and Maintenance at Ustinov only · no finance · no settings" */
export function roleSummary(r: Role, halls: Member['halls']) {
  const doing = PERMS.filter((a) => a.perms.some((p) => p.label !== 'View' && r.perms.includes(p.id))).map((a) => a.area);
  const what = doing.length ? doing.length === 1 ? doing[0] : `${doing.slice(0, -1).join(', ')} and ${doing.at(-1)}` : 'Read-only access';
  const where = halls === 'all' ? ' in every hall' : ` at ${hallsLabel(halls)} only`;
  const bits = [what + where];
  if (!r.perms.some((p) => p.startsWith('fin.'))) bits.push('no finance');
  if (!r.perms.includes('ws.settings')) bits.push('no settings');
  return bits.join(' · ');
}
export const nameFromEmail = (email: string) => email.split('@')[0].split(/[._-]+/).filter(Boolean).map((s) => s[0].toUpperCase() + s.slice(1)).join(' ');
