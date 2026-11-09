import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Pages pinned to Home, in the order shown. Kept with the demo data, so "Reset demo data" restores them. */
const DEFAULT = ['/allocations/applications', '/residents/maintenance', '/offcampus/landlords'];

type State = {
  pins: string[];
  /** The pinned page you opened from Home. While you stay on it (or a page under it), Home stays selected. */
  via: string | null;
  pin: (to: string, at?: number) => void;
  unpin: (to: string) => void;
  /** Move the pin at index `from` so it lands before index `to` (to = length puts it last). */
  move: (from: number, to: number) => void;
  setVia: (to: string | null) => void;
  /** Where a nav click is heading. React Router renders the next page in a transition, so the sidebar shows this
      straight away instead of waiting for that render; cleared once the route arrives. */
  pending: string | null;
  /** A sidebar click: set the pin context and the pending target in one urgent update. */
  go: (to: string, via: string | null) => void;
};

export const usePins = create<State>()(
  persist(
    (set) => ({
      pins: DEFAULT,
      via: null,
      pin: (to, at) => set((s) => {
        if (s.pins.includes(to)) return s;
        const pins = [...s.pins];
        pins.splice(at ?? pins.length, 0, to);
        return { pins };
      }),
      unpin: (to) => set((s) => ({ pins: s.pins.filter((p) => p !== to), via: s.via === to ? null : s.via })),
      move: (from, to) => set((s) => {
        const pins = [...s.pins];
        const [x] = pins.splice(from, 1);
        pins.splice(to > from ? to - 1 : to, 0, x);
        return { pins };
      }),
      setVia: (via) => set({ via }),
      pending: null,
      go: (to, via) => set({ pending: to, via }),
    }),
    { name: 'pms-pins-v1', storage: createJSONStorage(() => sessionStorage), partialize: (s) => ({ pins: s.pins }) },
  ),
);

/** The path part of a nav target ("/reports/library?tab=x" → "/reports/library"). */
export const pathOf = (to: string) => to.split('?')[0];
/** True when `pathname` is the page `to` or a page under it. */
export const within = (to: string, pathname: string) => {
  const p = pathOf(to);
  return pathname === p || (p !== '/' && pathname.startsWith(p + '/'));
};

/** The path the sidebar should show as current: the pending click target if there is one, else the route. */
export function useNavPath(pathname: string) {
  const pending = usePins((s) => s.pending);
  return pending ? pathOf(pending) : pathname;
}

/** Query-aware match for rows that share a path ("Library" /reports/library vs "Scheduled" ?tab=scheduled):
 *  a row with a ?tab needs that tab; a row without one is current unless another row claims the current tab. */
export const tabOf = (to: string) => new URLSearchParams(to.split('?')[1] ?? '').get('tab');
export function isCurrent(to: string, current: string, all: string[]) {
  const tp = pathOf(to), p = pathOf(current);
  /* A detail page under a row (/org/people/roles/x, /residents/r1, /inventory/properties/col) keeps that row selected:
     the deepest row whose path contains the page wins, unless a row matches the page exactly. */
  if (tp !== p) {
    if (tp === '/' || !p.startsWith(tp + '/') || all.some((t) => pathOf(t) === p)) return false;
    if (all.some((t) => { const q = pathOf(t); return q.length > tp.length && q !== '/' && p.startsWith(q + '/'); })) return false;
    return !tabOf(to) || !all.some((t) => pathOf(t) === tp && !tabOf(t));
  }
  const want = tabOf(to), cur = tabOf(current);
  if (want) return want === cur;
  return !cur || !all.some((t) => pathOf(t) === pathOf(to) && tabOf(t) === cur);
}

/** Full current location (path + query) for the sidebar: the pending click target, else the route. */
export function useNavHref(pathname: string, search: string) {
  const pending = usePins((s) => s.pending);
  return pending ?? pathname + search;
}
