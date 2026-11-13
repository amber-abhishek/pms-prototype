import {
  LayoutDashboard, CircleCheck, History, Inbox, Wrench, UserCheck, Building, Grid3x3, ChartColumn, Network, TextCursorInput, Wallet,
  FileText, Send, CalendarCheck, Users, ArrowsLeftRight, Megaphone, ClipboardCheck, House, Hotel, MessageSquare, Settings,
  Globe, Monitor, Landmark, MapPin, Shield, Mail, Bell, Plug, Palette, Tag,
  Warehouse, Gauge, Library, CalendarClock, Repeat, BedDouble, BookUser, ScrollText, Settings2, AppWindow, ChartLine, FileArrowUp,
  GraduationCap, SlidersHorizontal, CreditCard, Stack, ShareNetwork, type Icon,
} from './components/icons';
import type { Role } from './data/store';
import { useHome, myOpenCount } from './data/home';
import { useInv } from './data/inventory';
import { useAlloc, appCounts, offerCounts } from './data/allocations';
import { useRms } from './data/residents';
import { useOc } from './data/offcampus';
import { useOrg } from './data/org';
import { useWorkspace } from './data/workspace';

/** Live counts for the panel, read from each module's own store. */
export function useNavCounts() {
  const tasks = useHome((s) => s.rows.main);
  const props = useInv((s) => s.properties.length);
  const alloc = useAlloc();
  const faults = useRms((s) => s.faults);
  const requests = useRms((s) => s.requests);
  const oc = useOc();
  const org = useOrg();
  const schedules = useWorkspace((s) => s.schedules.length);
  return {
    tasks: myOpenCount(tasks),
    properties: props,
    toReview: appCounts(alloc).review,
    manual: appCounts(alloc).manual,
    offers: offerCounts(alloc).open,
    maintenance: faults.filter((f) => f.status !== 'Fixed').length,
    requests: requests.filter((r) => r.status === 'Open').length,
    landlords: oc.landlords.filter((l) => l.status === 'Submitted').length,
    reviews: oc.reviews.filter((r) => r.status === 'Under review').length,
    enquiries: oc.enquiries.length,
    campuses: org.campuses.length,
    members: org.members.length,
    schedules,
  };
}
export type NavCounts = ReturnType<typeof useNavCounts>;

/** A view inside a page (its ?tab=), shown under the row only while that page is open. */
export type NavSub = { label: string; tab: string; count?: (c: NavCounts) => number };
export type NavItem = { label: string; to: string; icon: Icon; count?: (c: NavCounts) => number; /** A size, not work to do (7 properties): left out of a closed module's rolled-up count. */ total?: boolean; alert?: boolean; soon?: boolean; sub?: NavSub[]; /** The row itself opens a landing page (no tab); its sub rows are the tabs. */ landing?: boolean };
export type NavSection = { label?: string; action?: string; pinned?: boolean; items: NavItem[]; };
export type Module = {
  id: string; label: string; icon: Icon; home: string; match: (path: string) => boolean;
  subtitle?: string; sections: NavSection[]; locked?: boolean; roles: Role[]; group: 'top' | 'modules' | 'bottom';
};

const starts = (...p: string[]) => (path: string) => p.some((x) => path === x || path.startsWith(x + '/'));

export const modules: Module[] = [
  /* Overview, My tasks and Activity are top-level rows of their own, with no Home group over them (2026-11-13). */
  {
    id: 'overview', label: 'Overview', icon: LayoutDashboard, home: '/', group: 'top', roles: ['admin', 'offcampus'],
    match: (p) => p === '/',
    sections: [{ items: [{ label: 'Overview', to: '/', icon: LayoutDashboard }] }],
  },
  {
    id: 'tasks', label: 'My tasks', icon: CircleCheck, home: '/tasks', group: 'top', roles: ['admin', 'offcampus'],
    match: starts('/tasks'),
    sections: [{ items: [{ label: 'My tasks', to: '/tasks', icon: CircleCheck, count: (c) => c.tasks }] }],
  },
  {
    id: 'activity', label: 'Activity', icon: History, home: '/activity', group: 'top', roles: ['admin', 'offcampus'],
    match: starts('/activity'),
    sections: [{ items: [{ label: 'Activity', to: '/activity', icon: History }] }],
  },
  {
    id: 'inventory', label: 'Inventory', icon: Warehouse, home: '/inventory/properties', group: 'modules', roles: ['admin'], subtitle: 'CMS',
    match: starts('/inventory'),
    sections: [
      { items: [
        { label: 'Properties', to: '/inventory/properties', icon: Building, count: (c) => c.properties, total: true },
        { label: 'Units', to: '/inventory/units', icon: Grid3x3 },
        { label: 'Occupancy', to: '/inventory/occupancy', icon: Gauge },
      ] },
      { label: 'Setup', items: [
        { label: 'Property layouts', to: '/inventory/structures', icon: Stack },
        { label: 'Custom fields', to: '/inventory/custom-fields', icon: TextCursorInput },
        { label: 'Tags', to: '/inventory/tags', icon: Tag },
        { label: 'Rent and fees', to: '/inventory/rent-fees', icon: Wallet },
        { label: 'Imports', to: '/inventory/imports', icon: FileArrowUp },
      ] },
    ],
  },
  {
    id: 'allocations', label: 'Allocations', icon: CalendarCheck, home: '/allocations/applications', group: 'modules', roles: ['admin'], subtitle: 'BMS',
    match: starts('/allocations'),
    sections: [{ items: [
      { label: 'Applications', to: '/allocations/applications', icon: Inbox, count: (c) => c.toReview },
      { label: 'Offers & waitlist', to: '/allocations/offers', icon: Send, count: (c) => c.offers },
      { label: 'Bookings', to: '/allocations/bookings', icon: BedDouble },
      { label: 'Cycles', to: '/allocations/cycles', icon: Repeat },
    ] }],
  },
  {
    id: 'residents', label: 'Residents', icon: Users, home: '/residents', group: 'modules', roles: ['admin'], subtitle: 'RMS',
    match: starts('/residents'),
    sections: [{ items: [
      { label: 'Residents', to: '/residents', icon: BookUser },
      { label: 'Maintenance', to: '/residents/maintenance', icon: Wrench, alert: true, count: (c) => c.maintenance },
      { label: 'Requests', to: '/residents/requests', icon: ArrowsLeftRight, count: (c) => c.requests },
      { label: 'Notices', to: '/residents/notices', icon: Megaphone },
    ] }],
  },
  {
    id: 'offcampus', label: 'Off-campus', icon: Globe, home: '/offcampus/landlords', group: 'modules', roles: ['admin', 'offcampus'], subtitle: 'durham-homes.ac.uk',
    match: starts('/offcampus'),
    sections: [
      { label: 'Approval', items: [
        { label: 'Landlord applications', to: '/offcampus/landlords', icon: UserCheck, count: (c) => c.landlords },
        { label: 'Listing reviews', to: '/offcampus/reviews', icon: ClipboardCheck, count: (c) => c.reviews },
      ] },
      /* Landlord and Partner halls sit straight under the Listings label, each with its own icon (2026-11-13). */
      { label: 'Listings', items: [
        { label: 'Landlord', to: '/offcampus/listings', icon: House },
        { label: 'Partner halls', to: '/offcampus/listings?tab=pbsa', icon: Hotel },
      ] },
      { label: 'Portal', items: [
        { label: 'Enquiries', to: '/offcampus/enquiries', icon: MessageSquare, count: (c) => c.enquiries },
        { label: 'Off-campus portal', to: '/offcampus/portal', icon: AppWindow },
      ] },
    ],
  },
  {
    id: 'site', label: 'Booking site', icon: Monitor, home: '/site', group: 'modules', roles: ['admin'], subtitle: 'accommodation.durham.ac.uk',
    match: starts('/site'),
    sections: [{ items: [
      { label: 'Pages', to: '/site', icon: FileText },
      { label: 'Theme', to: '/site/theme', icon: Palette },
      { label: 'Settings', to: '/site/settings', icon: Settings2 },
    ] }],
  },
  {
    id: 'reports', label: 'Reports', icon: ChartColumn, home: '/reports', group: 'top', roles: ['admin'],
    match: starts('/reports'),
    sections: [{ items: [
      { label: 'Occupancy', to: '/reports', icon: ChartLine },
      { label: 'Library', to: '/reports/library', icon: Library },
      { label: 'Scheduled', to: '/reports/library?tab=scheduled', icon: CalendarClock, count: (c) => c.schedules, total: true },
      { label: 'Shared with me', to: '/reports/library?tab=shared', icon: ShareNetwork },
    ] }],
  },
  {
    id: 'org', label: 'Organisation', icon: Landmark, home: '/org/campuses', group: 'bottom', roles: ['admin'],
    match: starts('/org'),
    sections: [{ items: [
      { label: 'Campuses', to: '/org/campuses', icon: MapPin, count: (c) => c.campuses, total: true },
      { label: 'Roles and access', to: '/org/people', icon: Shield, count: (c) => c.members, total: true },
      { label: 'Teams', to: '/org/teams', icon: Network },
      { label: 'Activity log', to: '/org/activity', icon: ScrollText },
    ] }],
  },
  {
    id: 'settings', label: 'Settings', icon: Settings, home: '/settings', group: 'bottom', roles: ['admin', 'offcampus'],
    match: starts('/settings'),
    sections: [{ items: [
      { label: 'General', to: '/settings', icon: SlidersHorizontal },
      { label: 'Academic year', to: '/settings/academic-year', icon: GraduationCap },
      { label: 'Notifications', to: '/settings/notifications', icon: Bell },
      { label: 'Payments', to: '/settings/payments', icon: CreditCard },
      { label: 'Integrations', to: '/settings/integrations', icon: Plug },
      { label: 'Emails', to: '/settings/emails', icon: Mail },
    ] }],
  },
];

export const moduleFor = (path: string) => modules.find((m) => m.match(path)) ?? modules[0];
const HOME_IDS = ['overview', 'tasks', 'activity'];

/** Every page, for the ⌘K palette. */
export const allPages = modules.flatMap((m) => m.sections.flatMap((s) => s.items.filter((i) => !i.soon && !m.locked).map((i) => ({ ...i, module: m.label, moduleId: m.id, roles: m.roles }))));
export type Page = (typeof allPages)[number];

/** Pages that can be pinned to Home: every module page except Home's own, one entry per target. */
export const pinnable = allPages.filter((p, i, a) => !HOME_IDS.includes(p.moduleId) &&a.findIndex((q) => q.to === p.to) === i);
