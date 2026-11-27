import { Fragment, useLayoutEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { House, Lock, SidebarSimple } from '../components/icons';
import { modules, rollup, useNavCounts, type Module, type NavCounts, type NavItem } from '../nav';
import { usePins, isCurrent, useNavHref } from '../data/pins';
import { cx, Pill } from '../components/ui';
import { OrgLogo } from '../components/Logo';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/shadcn/tooltip';

/* Shell v2 (Figma 3966:17148): a 56px icon rail on the #F5F5F5 chrome, then one white r12 card holding the open
   module's page panel (232px) and the page. Same Connect parts as v1: the selected item is the raised white tile
   with a hairline edge and blue icon/label, labels are #3F404D, lines are #E5E5E5. */

/** Selected rail tile and panel row: white, 1px #E5E5E5, a 0 1 2 drop at 6%, blue icon and label. */
const RAISED = 'bg-white border-[#E5E5E5] shadow-[0_1px_3px_rgba(10,13,20,0.10),0_2px_6px_-2px_rgba(10,13,20,0.08)] text-[#2563EB]';
const FOCUS = 'outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** A module with one page has no panel: the rail icon is the page. */
const isSingle = (m: Module) => m.sections.every((s) => s.items.length <= 1 && !s.pinned);

/* Overview, My tasks and Activity are separate top-level rows in the v1 sidebar. On the rail they sit under one Home
   icon, and its panel lists them like any other module's pages. */
const HOME_IDS = ['overview', 'tasks', 'activity'];
function homeOf(visible: Module[]): Module | null {
  const parts = visible.filter((m) => HOME_IDS.includes(m.id));
  if (parts.length === 0) return null;
  return {
    id: 'home', label: 'Home', icon: House, home: parts[0].home, group: 'top', roles: parts[0].roles,
    match: (p) => parts.some((m) => m.match(p)),
    sections: [{ items: parts.flatMap((m) => m.sections.flatMap((s) => s.items)) }],
  };
}

export function ShellV2({ visible, active, panelOpen, onToggle, userMenu, children }: {
  visible: Module[]; active: Module; panelOpen: boolean; onToggle: () => void;
  /** The account menu, as the rail's avatar. */ userMenu: ReactNode; /** <main> */ children: ReactNode;
}) {
  const counts = useNavCounts();
  const home = homeOf(visible);
  const current = home && HOME_IDS.includes(active.id) ? home : active;
  /* Rail groups: Home · the modules · Reports, Organisation, Settings. */
  const groups = [
    home ? [home] : [],
    visible.filter((m) => m.group === 'modules'),
    visible.filter((m) => m.id === 'reports' || m.group === 'bottom'),
  ].filter((g) => g.length > 0);
  return (
    <TooltipProvider delayDuration={300}>
      <div className="shell-chrome h-full flex bg-[#F5F5F5] min-w-[1024px]">
        <nav aria-label="Modules" className="w-14 shrink-0 flex flex-col items-center gap-1 py-4 overflow-y-auto overflow-x-hidden">
          <div className="size-9 shrink-0 mb-3 flex items-center justify-center"><OrgLogo size={26} /></div>
          {groups.map((g, i) => (
            <Fragment key={i}>
              {i > 0 && <div className="shrink-0 w-5 h-px my-1.5 bg-[#E5E5E5]" aria-hidden />}
              {g.map((m) => <RailItem key={m.id} m={m} on={m.id === current.id} counts={counts} />)}
            </Fragment>
          ))}
          <div className="flex-1 min-h-3" />
          {userMenu}
        </nav>
        <div className="flex-1 min-w-0 flex my-2 mr-2 rounded-xl border border-[#E5E5E5] bg-white overflow-hidden">
          {!isSingle(current) && <Panel mod={current} counts={counts} collapsed={!panelOpen} onToggle={onToggle} />}
          {children}
        </div>
      </div>
    </TooltipProvider>
  );
}

function RailItem({ m, on, counts }: { m: Module; on: boolean; counts: NavCounts }) {
  const I = m.icon;
  /* Work waiting inside the module (or on its single page), named in the tooltip. A dot on the tile marks it: red when
     something is overdue (an alert), blue when there is just work to pick up. Home never gets one: its count is your own tasks. */
  const sum = isSingle(m) ? { n: m.sections[0]?.items[0]?.count?.(counts) ?? 0, alert: false } : rollup(m, counts);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NavLink to={m.home} aria-label={m.label} aria-current={on ? 'page' : undefined} onClick={() => usePins.getState().go(m.home, null)}
          className={cx('relative size-9 shrink-0 flex items-center justify-center rounded-lg border transition-[transform,color,background-color,box-shadow] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.96]', FOCUS,
            on ? RAISED : 'border-transparent text-[#3F404D] hover:text-[#0A0A0A] hover:scale-[1.06]')}>
          <I size={18} strokeWidth={1.5} absoluteStrokeWidth />
          {sum.n > 0 && !on && m.id !== 'home' && <span className={cx('absolute right-1.5 top-1.5 size-1.5 rounded-full', sum.alert ? 'bg-[#DC2626]' : 'bg-[#2563EB]')} />}
          {m.locked && <span className="absolute right-0.5 bottom-0.5 size-3.5 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center"><Lock size={8} className="text-[#737373]" /></span>}
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {m.label}
        {sum.n > 0 && <span className={sum.alert ? 'text-[#FCA5A5]' : 'text-gray-400'}> · {sum.n}</span>}
        {m.locked && <span className="text-gray-400"> · locked</span>}
      </TooltipContent>
    </Tooltip>
  );
}

/** The open module's pages. Folded (⌘.), it narrows to the page icons with tooltips; section labels become short rules. */
function Panel({ mod, counts, collapsed: target, onToggle }: { mod: Module; counts: NavCounts; collapsed: boolean; onToggle: () => void }) {
  /* The width animates (200ms, as the v1 sidebar does) and the edge clips the full rows: they keep their 232px layout
     while it moves, so nothing re-wraps mid-way. Opening switches to the full layout at once and the width grows over
     it; closing shrinks over the full layout and the icon-only layout takes over at the end. The page icons sit at the
     same x in both layouts, so they hold still; the header's title clips and its button rides the edge. */
  const [folded, setFolded] = useState(target);
  useLayoutEffect(() => {
    if (!target) { setFolded(false); return; }
    const t = window.setTimeout(() => setFolded(true), 200);
    return () => window.clearTimeout(t);
  }, [target]);
  const collapsed = folded;
  return (
    <aside aria-label={`${mod.label} pages`} className={cx('shrink-0 h-full flex flex-col overflow-hidden border-r border-[#E5E5E5] transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]', target ? 'w-14' : 'w-[232px]')}>
      <div className={cx('h-14 shrink-0 flex items-center border-b border-[#E5E5E5]', collapsed ? 'justify-center' : 'gap-1 pl-4 pr-3')}>
        {!collapsed && <div className="flex-1 min-w-0 overflow-hidden whitespace-nowrap font-mono uppercase text-sm leading-5 font-medium text-[#0A0A0A]">{mod.label}</div>}
        <button type="button" aria-label={target ? 'Show pages' : 'Hide pages'} title="Toggle pages (⌘.)" onClick={onToggle}
          className="size-7 shrink-0 rounded-md border border-[#E5E5E5] bg-white text-[#404040] hover:bg-[#F5F5F5] flex items-center justify-center">
          <SidebarSimple size={16} strokeWidth={1.5} absoluteStrokeWidth className={cx('transition-transform duration-200', target && '-scale-x-100')} />
        </button>
      </div>
      <div className={cx('flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col gap-0.5 pt-3 pb-3', collapsed ? 'items-center' : 'w-[231px] px-3')}>
        {mod.sections.map((s, i) => (
          <Fragment key={i}>
            {s.label && (collapsed
              ? <div className="shrink-0 w-5 h-px my-2 bg-[#E5E5E5]" aria-hidden />
              : <div className="shrink-0 pt-3 pb-1 pl-2 text-xs leading-4 font-medium uppercase text-[#737373]">{s.label}</div>)}
            {s.items.map((it) => <PageRow key={it.label} it={it} count={it.count?.(counts)} locked={mod.locked} collapsed={collapsed} />)}
          </Fragment>
        ))}
        {mod.locked && !collapsed && (
          <div className="mt-2 rounded-lg border border-[#E5E5E5] bg-white p-4">
            <div className="text-sm font-semibold text-[#171717]">Not in your plan</div>
            <div className="text-xs text-[#737373] mt-1">Listing site (LMS) lets you publish your properties on your own website.</div>
          </div>
        )}
      </div>
    </aside>
  );
}

/** Every module row target, so a row without ?tab can tell when a sibling row owns the current tab. */
const ALL_TO = modules.flatMap((m) => m.sections.flatMap((s) => s.items.map((i) => i.to)));

/** A page row (Figma "Nav · Properties"): 36px (32px when collapsed), 10px sides, 8px gap, r8, 16px icon, 14px medium label, 12px count. */
function PageRow({ it, count, locked, collapsed }: { it: NavItem; count?: number; locked?: boolean; collapsed: boolean }) {
  const { pathname: route, search } = useLocation();
  const href = useNavHref(route, search);
  const disabled = !!(it.soon || locked);
  const on = !disabled && isCurrent(it.to, href, ALL_TO);
  const I = it.icon;
  const has = count !== undefined && count > 0;
  const cls = cx('shrink-0 flex items-center gap-2 rounded-lg border text-sm leading-5 font-medium transition-[transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]', FOCUS,
    collapsed ? 'relative size-8 justify-center' : 'h-9 px-2.5',
    on ? RAISED : 'border-transparent text-[#3F404D]',
    disabled ? 'opacity-60 cursor-default' : cx('active:scale-[0.98]', !on && (collapsed ? 'hover:scale-[1.06]' : 'hover:translate-x-0.5')));
  const go = () => usePins.getState().go(it.to, null);
  if (collapsed) {
    const inner = <><I size={16} strokeWidth={1.5} absoluteStrokeWidth />{has && it.alert && !on && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-[#DC2626]" />}</>;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {disabled
            ? <div className={cls} aria-disabled aria-label={it.label}>{inner}</div>
            : <NavLink to={it.to} end draggable={false} aria-label={it.label} className={cls} onClick={go}>{inner}</NavLink>}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {it.label}{has && <span className={it.alert ? 'text-[#FCA5A5]' : 'text-gray-400'}> · {count}</span>}{it.soon && <span className="text-gray-400"> · soon</span>}
        </TooltipContent>
      </Tooltip>
    );
  }
  const inner = (
    <>
      <I size={16} strokeWidth={1.5} absoluteStrokeWidth className="shrink-0" />
      <span className="flex-1 truncate">{it.label}</span>
      {it.soon && <Pill tone="purple">Soon</Pill>}
      {has && (() => {
        const badge = <span className={cx('text-xs leading-4 font-medium tabular-nums', it.alert ? 'text-[#DC2626]' : 'text-[#737373]')}>{count}</span>;
        return it.countTip ? <Tooltip><TooltipTrigger asChild>{badge}</TooltipTrigger><TooltipContent side="right">{it.countTip}</TooltipContent></Tooltip> : badge;
      })()}
    </>
  );
  if (disabled) return <div className={cls} aria-disabled>{inner}</div>;
  return <NavLink to={it.to} end draggable={false} className={cls} onClick={go}>{inner}</NavLink>;
}
