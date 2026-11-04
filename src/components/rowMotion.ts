import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/* Row motion for lists and tables: when one or a few rows arrive or leave because of something the user did
   (approve, reject, delete, undo, create), the row fades in with a short blue wash, or fades out, and the rows
   around it slide to their new place instead of jumping.

   It stays out of the way the rest of the time: no motion on first render, paging, tab switches, search or any
   change that swaps more than a handful of rows at once.

   Usage:
     const { items, bodyRef } = useRowMotion(rows);
     <tbody ref={bodyRef}>{items.map(({ row, motion }) => <tr key={row.id} {...rowAttrs(row.id, motion)}>…)}</tbody>
   The look lives in styles.css under [data-motion]. */

export type Motion = 'in' | 'out' | undefined;
export const ROW_IN_MS = 240;
export const ROW_OUT_MS = 180;
const SLIDE_MS = 240;
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)';
/** More rows than this changing at once is a new view (tab, filter, page), not an action: no motion. */
const MAX_ANIMATED = 6;

type Ghost<T> = { row: T; index: number };
type St<T> = { prev: T[]; key: string; ghosts: Ghost<T>[]; fresh: string[]; tick: number };
const keyOf = (rows: { id: string }[]) => rows.map((r) => r.id).join('\u0001');

function usePresence<T extends { id: string }>(rows: T[]) {
  const key = keyOf(rows);
  const [st, setSt] = useState<St<T>>({ prev: rows, key, ghosts: [], fresh: [], tick: 0 });

  /* Derive from the new rows during render (React's "adjust state when a prop changes" pattern). Compared by ids, not
     by array identity: callers usually build a fresh array (filter, slice) on every render. */
  let cur = st;
  if (st.key !== key) {
    const now = new Set(rows.map((r) => r.id));
    const before = new Set(st.prev.map((r) => r.id));
    const removed = st.prev.map((row, index) => ({ row, index })).filter((g) => !now.has(g.row.id));
    const added = rows.filter((r) => !before.has(r.id)).map((r) => r.id);
    const swapped = removed.length > 0 && removed.length === st.prev.length && added.length > 0;
    const small = removed.length + added.length > 0 && removed.length + added.length <= MAX_ANIMATED && !swapped;
    cur = small
      ? { prev: rows, key, ghosts: [...st.ghosts.filter((g) => !now.has(g.row.id)), ...removed], fresh: [...st.fresh, ...added], tick: st.tick + 1 }
      : { prev: rows, key, ghosts: [], fresh: [], tick: st.tick };
    setSt(cur);
  }

  /* Ghosts leave after their fade; fresh rows lose the flag once their entrance has played. */
  useEffect(() => {
    if (!cur.ghosts.length) return;
    const ids = cur.ghosts.map((g) => g.row.id);
    const t = window.setTimeout(() => setSt((s) => ({ ...s, ghosts: s.ghosts.filter((g) => !ids.includes(g.row.id)), tick: s.tick + 1 })), ROW_OUT_MS);
    return () => window.clearTimeout(t);
  }, [cur.ghosts]);
  useEffect(() => {
    if (!cur.fresh.length) return;
    const ids = cur.fresh;
    const t = window.setTimeout(() => setSt((s) => ({ ...s, fresh: s.fresh.filter((id) => !ids.includes(id)) })), 1400);
    return () => window.clearTimeout(t);
  }, [cur.fresh]);

  const items: { row: T; motion: Motion }[] = rows.map((row) => ({ row, motion: cur.fresh.includes(row.id) ? 'in' : undefined }));
  for (const g of [...cur.ghosts].sort((a, b) => a.index - b.index)) items.splice(Math.min(g.index, items.length), 0, { row: g.row, motion: 'out' });
  return { items, tick: cur.tick };
}

/** FLIP: after rows arrive or leave, slide every other row from where it was to where it is now. */
function useSlide(bodyRef: React.RefObject<HTMLElement | null>, tick: number) {
  const tops = useRef(new Map<string, number>());
  const lastTick = useRef(tick);
  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const animate = tick !== lastTick.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    lastTick.current = tick;
    const next = new Map<string, number>();
    body.querySelectorAll<HTMLElement>(':scope > [data-row]').forEach((el) => {
      const id = el.dataset.row!;
      const top = el.offsetTop;
      next.set(id, top);
      const was = tops.current.get(id);
      if (animate && was !== undefined && was !== top && el.dataset.motion !== 'in') {
        el.animate([{ transform: `translateY(${was - top}px)` }, { transform: 'none' }], { duration: SLIDE_MS, easing: EASE });
      }
    });
    tops.current = next;
  });
}

export function useRowMotion<T extends { id: string }, E extends HTMLElement = HTMLTableSectionElement>(rows: T[]) {
  const bodyRef = useRef<E | null>(null);
  const { items, tick } = usePresence(rows);
  useSlide(bodyRef, tick);
  return { items, bodyRef };
}

/** Attributes for a moving row: its id for the slide, and its phase for the CSS. A leaving row can't be clicked. */
export const rowAttrs = (id: string, motion: Motion) => ({
  'data-row': id,
  'data-motion': motion,
  'aria-hidden': motion === 'out' ? true : undefined,
  inert: motion === 'out' ? true : undefined,
});
