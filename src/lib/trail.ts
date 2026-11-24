import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { create } from 'zustand';
import { modules } from '../nav';
import { usePageTitle } from '../components/headerCtx';

/* Breadcrumb trail (2026-11-24). When an action inside a page (a task row, a "Review applications" button, a link in a
   sheet) takes you to a different page, the page you left joins the trail, so the header reads
   "Overview › Applications" and each step links back. Going there from the sidebar, the rail or ⌘K starts a fresh
   trail, and switching tabs, filters or opening a record on the same page never adds a step. */

export type Stop = { path: string; title: string };
export const useTrail = create<{ stops: Stop[] }>(() => ({ stops: [] }));

/** How the next navigation was started. `reset`: sidebar / search. `keep`: a tab. `push`: an action in a page.
 *  A number: a trail crumb, back to that step. */
type Intent = 'push' | 'reset' | 'keep' | number;
/* Kept on window, not in a module variable, so a hot-reloaded copy of this file still reads the click the old copy saw. */
type Mark = { kind: Intent; at: number } | null;
const box = window as unknown as { __pmsTrailIntent?: Mark };
export const markIntent = (kind: Intent) => { box.__pmsTrailIntent = { kind, at: Date.now() }; };
const takeIntent = (): Intent | null => { const i = box.__pmsTrailIntent; box.__pmsTrailIntent = null; return i && Date.now() - i.at < 4000 ? i.kind : null; };

/** The longest trail kept; older steps drop off the front. */
const MAX = 3;

/** The page a path belongs to: the longest sidebar row it sits under, so a record (/residents/r12) or a tab
 *  (/reports/library?tab=shared) counts as its list's page. */
let roots: string[] | null = null; // built on first use, so importing this file never races nav.ts
const ROOTS = () => (roots ??= [...new Set(modules.flatMap((m) => [m.home, ...m.sections.flatMap((s) => s.items.map((i) => i.to.split('?')[0]))]))].filter(Boolean));
export function pageOf(pathname: string) {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/') return '/';
  const hit = ROOTS().filter((r) => r !== '/' && (p === r || p.startsWith(r + '/'))).sort((a, b) => b.length - a.length)[0];
  return hit ?? p.split('/').slice(0, 3).join('/');
}

function classify(t: Element): Intent {
  if (t.closest('[data-trail]')) return 'keep'; // the crumbs set their own step
  if (t.closest('aside[aria-label], nav[aria-label="Modules"], [cmdk-root]')) return 'reset';
  if (t.closest('[role="tab"], [role="tablist"], [data-tabs]')) return 'keep';
  return 'push';
}

/** Mounted once in the shell: watches clicks to learn how each navigation started, and updates the trail. */
export function useTrailTracker() {
  const { pathname, search } = useLocation();
  const title = usePageTitle();
  const prev = useRef<{ path: string; page: string; title: string } | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (e.target instanceof Element) markIntent(classify(e.target)); };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    const page = pageOf(pathname);
    const p = prev.current;
    const full = pathname + search;
    if (p && p.page !== page) {
      const kind = takeIntent();
      const stops = useTrail.getState().stops;
      /* Back to a page already on the trail (browser back, or an action that returns there): cut the trail to it. */
      const at = stops.map((s) => pageOf(s.path.split('?')[0])).lastIndexOf(page);
      let next: Stop[];
      if (typeof kind === 'number') next = stops.slice(0, kind);
      else if (kind === 'reset' || kind === null) next = at >= 0 && kind === null ? stops.slice(0, at) : [];
      else if (kind === 'keep') next = stops;
      else if (at >= 0) next = stops.slice(0, at);
      else next = [...stops, { path: p.path, title: p.title }].slice(-MAX);
      useTrail.setState({ stops: next });
    } else if (p && p.page === page) {
      takeIntent();
    }
    prev.current = { path: full, page, title: prev.current && prev.current.page === page ? prev.current.title : title };
  }, [pathname, search]);

  /* The page's header publishes its title after it mounts; keep the latest for the step it may become. */
  useEffect(() => { if (prev.current) prev.current.title = title; }, [title]);
}
