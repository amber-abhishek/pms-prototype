import { create } from 'zustand';
import type { StoreApi, UseBoundStore } from 'zustand';
import { useDb } from './store';
import { useAlloc } from './allocations';
import { useHome } from './home';
import { useOc } from './offcampus';
import { useInv } from './inventory';
import { useRms } from './residents';
import { useOrg } from './org';
import { useWorkspace } from './workspace';

/* Demo "Empty states" switch in the account menu: the app as a user sees it on their first login to a new workspace.
   Every list goes empty so its first-run state shows.
   Setup that other screens need (campuses, structures, templates, roles, the portal) stays. The real data is kept
   in sessionStorage and comes back when the switch goes off. */
type AnyStore = UseBoundStore<StoreApi<object>>;
const STORES: [string, AnyStore, string[]][] = [
  // [name, store, keys emptied]
  ['db', useDb as unknown as AnyStore, ['properties', 'units', 'cycles', 'applications', 'offers', 'bookings', 'residents', 'maintenance', 'requests', 'notices', 'landlordApps', 'listings', 'enquiries', 'tasks', 'activity', 'customFields']],
  ['alloc', useAlloc as unknown as AnyStore, ['cycles', 'apps', 'offers', 'recent', 'waitlist', 'bookings', 'conflicts', 'used', 'usedUnits', 'hidden']],
  ['home', useHome as unknown as AnyStore, ['rows']],
  ['oc', useOc as unknown as AnyStore, ['landlords', 'reviews', 'hmos', 'pbsa', 'hidden', 'enquiries']],
  ['inv', useInv as unknown as AnyStore, ['properties', 'templates', 'fees', 'imports', 'archived', 'tags', 'archivedFlats']],
  ['rms', useRms as unknown as AnyStore, ['residents', 'requests', 'notices', 'faults']],
  ['org', useOrg as unknown as AnyStore, ['members', 'campuses', 'teams', 'audit']],
  ['ws', useWorkspace as unknown as AnyStore, ['schedules', 'integrations']],
];
/* Keys that a new workspace still has, in their first-login form: you are the only member, and every integration
   is offered but none is connected yet. */
const FIRST_LOGIN: Record<string, (v: unknown) => unknown> = {
  members: (v) => (v as unknown[]).slice(0, 1),
  integrations: (v) => (v as { state: string; meta: string }[]).map((i) => ({ ...i, state: 'available', meta: '' })),
};
const KEY = 'pms-empty';
const BACKUP = 'pms-empty-backup';

/** The empty version of a value: arrays → [], counts → 0, records of those → emptied per key. */
const blank = (v: unknown): unknown => {
  if (Array.isArray(v)) return [];
  if (typeof v === 'number') return 0;
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blank(x)]));
  return v;
};

const read = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } };

export const useEmpty = create<{ on: boolean; setOn: (on: boolean) => void }>((set) => ({
  on: read(),
  setOn: (on) => {
    if (on === read()) return set({ on });
    if (on) {
      const backup: Record<string, Record<string, unknown>> = {};
      for (const [name, store, keys] of STORES) {
        const st = store.getState() as Record<string, unknown>;
        backup[name] = Object.fromEntries(keys.map((k) => [k, st[k]]));
        store.setState(Object.fromEntries(keys.map((k) => [k, FIRST_LOGIN[k] ? FIRST_LOGIN[k](st[k]) : blank(st[k])])));
      }
      try { sessionStorage.setItem(BACKUP, JSON.stringify(backup)); sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ }
    } else {
      try {
        const backup = JSON.parse(sessionStorage.getItem(BACKUP) ?? '{}') as Record<string, Record<string, unknown>>;
        for (const [name, store] of STORES) if (backup[name]) store.setState(backup[name]);
        sessionStorage.removeItem(BACKUP); sessionStorage.removeItem(KEY);
      } catch { /* ignore */ }
    }
    set({ on });
  },
}));
