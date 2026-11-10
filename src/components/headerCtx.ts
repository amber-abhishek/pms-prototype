import { Children, Fragment, createContext, isValidElement, useLayoutEffect, useSyncExternalStore, type ReactNode } from 'react';

/* One h1 per page: a visible 20px title registers itself, and the breadcrumb's current crumb
   is the h1 only on pages that have no such title. */
let headings = 0;
const headingSubs = new Set<() => void>();
const emitHeadings = () => headingSubs.forEach((f) => f());
export function useOwnHeading() {
  useLayoutEffect(() => { headings++; emitHeadings(); return () => { headings--; emitHeadings(); }; }, []);
}
export function useHeadingTaken() {
  return useSyncExternalStore((f) => { headingSubs.add(f); return () => { headingSubs.delete(f); }; }, () => headings > 0);
}
/** True in the page header's action slot and in table bodies: Button renders filled and outlined variants as
 *  borderless ghosts there (pms-header-action-buttons, 2026-11-07). Overlay contents reset it, so a dialog or
 *  menu opened from the header or a row keeps its real buttons.
 *  'multi' (2026-11-09): a header with two or more actions keeps the one marked `primary` as the page's main action. */
export const GhostZone = createContext<boolean | 'multi'>(false);

/** Count the header's actions (fragments flattened) to pick the zone. */
const count = (c: ReactNode): number => Children.toArray(c).reduce<number>((n, ch) => n + (isValidElement(ch) && ch.type === Fragment ? count((ch.props as { children?: ReactNode }).children) : 1), 0);
export const headerZone = (children: ReactNode): true | 'multi' => (count(children) > 1 ? 'multi' : true);

/* The current page's title, published by the breadcrumb header (PageHeader / Header / RHeader) and shown as the
   20px page heading at the start of the toolbar row (2026-11-09: "use this page heading on every page"). */
let pageTitle = '';
const subs = new Set<() => void>();
export const usePublishTitle = (t: string) => useLayoutEffect(() => { pageTitle = t; subs.forEach((f) => f()); }, [t]);
export const usePageTitle = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => pageTitle);
