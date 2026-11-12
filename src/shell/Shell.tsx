import { Fragment, useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../data/auth';
import { SigningOut } from '../pages/auth/Login';
import { ArrowCounterClockwise, ChevronDown, ChevronRight, ChevronsUpDown, Moon, Tray, Check as CheckIcon, Lock, MagnifyingGlass, PinOff, Plus, SidebarSimple, SignOut } from '../components/icons';
import { toast } from 'sonner';
import { modules, moduleFor, pinnable, useNavCounts, type Module, type NavCounts, type NavItem } from '../nav';
import { usePins, isCurrent, useNavHref, useNavPath, within } from '../data/pins';
import { useDb, type Role } from '../data/store';
import { cx, Pill } from '../components/ui';
import { OrgLogo, PersonPhoto } from '../components/Logo';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/shadcn/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/shadcn/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '../components/shadcn/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/shadcn/command';
import { Palette } from './Palette';
import { Switch } from '../components/shadcn/switch';
import { useTheme } from '../data/theme';
import { useEmpty } from '../data/empty';
import { NoAccess } from '../pages/Misc';

/* Amber Connect shell (Figma 3882:39269, code: amber-connect NavigationMenu). One sidebar, 256px (68 folded with ⌘.),
   #FAFAFA with a right line: 56px logo header, 36px rows (8/12 padding, r8, 4px apart, 16px icons), the selected row
   raised white with a hairline edge and blue label, a 68px profile footer. Hover moves the row 2px, it never tints it.
   PMS adds what Connect's flat list doesn't need: the open module's pages hang under it on a guide line. */
export function Shell() {
  const { pathname, search } = useLocation();
  const role = useDb((s) => s.role);
  const [open, setOpen] = useState(true);
  const [palette, setPalette] = useState(false);
  /* Page scroll: mark <main> once the table header is stuck under the page header, so its line runs edge to edge. */
  const mainRef = useRef<HTMLElement>(null);
  const onMainScroll = () => {
    const m = mainRef.current; if (!m) return;
    const th = m.querySelector('[data-scroller] thead, [data-scroller] [data-head]');
    const stuck = !!th && m.scrollTop > 0 && th.getBoundingClientRect().top - m.getBoundingClientRect().top <= 56.5;
    if (stuck !== m.hasAttribute('data-stuck')) m.toggleAttribute('data-stuck', stuck);
  };
  useEffect(() => { const m = mainRef.current; if (m) { m.scrollTop = 0; m.removeAttribute('data-stuck'); } }, [pathname]);
  const via = usePins((s) => s.via);
  const pins = usePins((s) => s.pins);
  const path = useNavPath(pathname);
  /* Opened from a pin: Home stays open while you are on any pinned page (or a page under one). */
  const fromPin = !!via && pins.some((p) => within(p, path));
  useEffect(() => {
    const st = usePins.getState();
    if (st.pending) usePins.setState({ pending: null });
    if (st.via && !st.pins.some((p) => within(p, pathname))) st.setVia(null);
  }, [pathname, search]);
  const mod = fromPin ? modules[0] : moduleFor(path);
  const visible = modules.filter((m) => m.roles.includes(role));
  const allowed = moduleFor(pathname).roles.includes(role);
  const emptyKey = useEmpty((s) => s.on);
  const signedIn = useAuth((s) => s.signedIn);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); }
      if ((e.metaKey || e.ctrlKey) && e.key === '.') { e.preventDefault(); setOpen((p) => !p); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  if (!signedIn) return <Navigate to="/login" replace />;

  return (
    <div className="h-full flex bg-white min-w-[1024px]">
      <Sidebar visible={visible} active={mod} collapsed={!open} onToggle={() => setOpen((p) => !p)} onSearch={() => setPalette(true)} />
      <main ref={mainRef} onScroll={onMainScroll} className="pms-main flex-1 min-w-0 flex flex-col bg-white">{allowed ? <Outlet key={emptyKey ? 'empty' : 'full'} /> : <NoAccess />}</main>
      <Palette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}

/** Figma 3884:39271 selected row: white, 1px #E5E5E5, drops (0 1 3 / 0 1 2 -1 at 10%), ink label; the module icon goes blue. */
const RAISED = 'bg-white border-[#E5E5E5] shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)] text-[#2563EB] font-medium [&>svg:first-child]:text-[#2563EB]';
/** Rows: 14px, 8px padding, 8px gap, r8, packed with no gap. Hover nudges 2px right (Connect's whileHover x: 2). */
const ROW = 'flex items-center gap-2 rounded-lg border border-transparent text-sm leading-5 outline-none transition-[transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring';
/* Connect sidebar (127.0.0.1:5180): idle labels #777777, icons #737373 at 65%; hover nudges right 2px and scales 1.02 over 0.3s, no colour change. */
const IDLE = 'text-[#777777] [&>svg:first-child]:text-[#737373] [&>svg:first-child]:opacity-[0.65] hover:translate-x-0.5 hover:scale-[1.02]';
/* The open module's row (Inventory while you're in it): near-black text, icon and chevron, unraised (2026-11-12). */
const OPEN = 'text-[#0A0A0A] [&>svg:first-child]:text-[#0A0A0A]';

function Sidebar({ visible, active, collapsed, onToggle, onSearch }: { visible: Module[]; active: Module; collapsed: boolean; onToggle: () => void; onSearch: () => void }) {
  const counts = useNavCounts();
  const main = visible.filter((m) => m.group !== 'bottom');
  const system = visible.filter((m) => m.group === 'bottom');
  return (
    <TooltipProvider delayDuration={300}>
      <aside aria-label="Main" className={cx('shrink-0 h-full flex flex-col bg-[#FAFAFA] border-r border-[#E5E5E5] transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]', collapsed ? 'w-[68px]' : 'w-64')}>
        {/* Header (Figma 3884:39272): 56px, 16/12 sides, logo + org name + chevron, the collapse square on the right. */}
        <div className={cx('h-14 shrink-0 flex items-center border-b border-[#E5E5E5]', collapsed ? 'justify-center px-3' : 'gap-2 pl-4 pr-3')}>
          {!collapsed && (
            <button type="button" className="flex items-center gap-2 min-w-0 rounded-lg hover:opacity-80" onClick={() => toast('Durham University is the only organisation on this account')}>
              <OrgLogo size={26} />
              <span className="text-sm leading-5 font-semibold text-[#0A0A0A] truncate">Durham University</span>
              <ChevronDown size={16} strokeWidth={1.75} absoluteStrokeWidth className="text-[#737373] shrink-0" />
            </button>
          )}
          <button type="button" aria-label={collapsed ? 'Show sidebar' : 'Hide sidebar'} title="Toggle sidebar (⌘.)" onClick={onToggle}
            className={cx('size-7 shrink-0 rounded-md border border-[#E5E5E5] bg-white text-[#404040] hover:bg-[#F5F5F5] flex items-center justify-center', !collapsed && 'ml-auto')}>
            <SidebarSimple size={16} strokeWidth={1.75} absoluteStrokeWidth className={cx('transition-transform duration-[250ms]', collapsed && '-scale-x-100')} />
          </button>
        </div>
        {/* Nav (3884:39283): 8/16 padding, 36px rows packed with no gap; "System" label (12px medium #404040, 24px above) before Organisation and Settings. */}
        <nav className={cx('flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col py-2', collapsed ? 'px-3' : 'px-4')}>
          {collapsed && <SearchRow collapsed onSearch={onSearch} />}
          {main.map((m) => <ModuleRow key={m.id} m={m} on={m.id === active.id} counts={counts} collapsed={collapsed} />)}
          {system.length > 0 && (collapsed
            ? <div className="h-px bg-[#E5E5E5] mx-2 my-3" aria-hidden />
            : <div className="h-12 shrink-0 px-2 pt-6 pb-2 text-xs leading-4 font-medium uppercase text-[#404040]">System</div>)}
          {system.map((m) => <ModuleRow key={m.id} m={m} on={m.id === active.id} counts={counts} collapsed={collapsed} />)}
        </nav>
        <UserMenu collapsed={collapsed} />
      </aside>
    </TooltipProvider>
  );
}

/** Search as the first row, with Connect's ⌘K key cap. */
function SearchRow({ collapsed, onSearch }: { collapsed: boolean; onSearch: () => void }) {
  const row = (
    <button type="button" aria-label="Search" onClick={onSearch} className={cx(ROW, IDLE, 'h-9 shrink-0 mb-2', collapsed ? 'justify-center px-2' : 'px-2')}>
      <MagnifyingGlass size={16} strokeWidth={1.75} absoluteStrokeWidth className="shrink-0" />
      {!collapsed && <><span className="flex-1 text-left">Search</span><Kbd>⌘K</Kbd></>}
    </button>
  );
  return collapsed ? <Tooltip><TooltipTrigger asChild>{row}</TooltipTrigger><TooltipContent side="right" sideOffset={8}>Search · ⌘K</TooltipContent></Tooltip> : row;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="h-5 px-1.5 rounded border border-[#E5E5E5] bg-white font-mono text-xs leading-4 font-medium uppercase tracking-[0.48px] text-[#737373] flex items-center">{children}</kbd>;
}

/** A module row. The open module lists its pages under it (with their counts); closed ones show a chevron. */
function ModuleRow({ m, on, counts, collapsed }: { m: Module; on: boolean; counts: NavCounts; collapsed: boolean }) {
  const I = m.icon;
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <NavLink to={m.home} aria-label={m.label} onClick={() => usePins.getState().go(m.home, null)}
            className={cx(ROW, 'relative h-9 shrink-0 justify-center px-2', on ? RAISED : IDLE)}>
            <I size={16} strokeWidth={1.75} absoluteStrokeWidth className={on ? 'text-[#2563EB]' : ''} />
            {m.locked && <span className="absolute right-1 bottom-0.5 size-3.5 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center"><Lock size={8} className="text-[#737373]" /></span>}
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>{m.label}{m.locked && <span className="text-gray-400"> · locked</span>}</TooltipContent>
      </Tooltip>
    );
  }
  /* With no pages to list, the module row itself is the selection. */
  /* Home's pages are folder tabs on the page (Figma 3884:39270), so its row stays flat with no sub-list. */
  const single = m.id === 'home' || m.sections.every((s) => s.items.length <= 1 && !s.pinned);
  const flat = on && single;
  return (
    <>
      <NavLink to={m.home} onClick={() => usePins.getState().go(m.home, null)} aria-current={on ? 'true' : undefined}
        className={cx(ROW, 'h-9 shrink-0 px-2 font-medium', flat ? RAISED : on ? OPEN : IDLE)}>
        <I size={16} strokeWidth={1.75} absoluteStrokeWidth className={cx('shrink-0', flat && 'text-[#2563EB]')} />
        <span className="flex-1 truncate">{m.label}</span>
        {m.locked && <Lock size={14} strokeWidth={1.75} absoluteStrokeWidth className="text-[#737373]" />}
        {/* A module with pages shows a chevron, not a count: right when closed, down when open (2026-11-12). */}
        {!single && (on
          ? <ChevronDown size={16} strokeWidth={1.75} absoluteStrokeWidth className="shrink-0 text-[#0A0A0A]" />
          : <ChevronRight size={16} strokeWidth={1.75} absoluteStrokeWidth className="shrink-0 text-[#737373] opacity-[0.65]" />)}
      </NavLink>
      {on && !flat && <ModulePages mod={m} counts={counts} />}
    </>
  );
}

/** The open module's pages, on a guide line under its row (lined up with the module icon). */
function ModulePages({ mod, counts }: { mod: Module; counts: NavCounts }) {
  return (
    /* Figma "Sub · Inventory": 24px indent, 2px top / 6px bottom, 2px gap; the 1px #E5E5E5 rail sits 15px in, under the module icon. */
    <div className="relative pl-6 pt-0.5 pb-1.5 flex flex-col gap-0.5 before:absolute before:left-[15px] before:top-0.5 before:bottom-1.5 before:w-px before:bg-[#E5E5E5]">
      {mod.sections.map((s, i) => s.pinned ? <PinnedSection key={i} counts={counts} /> : (
        <Fragment key={i}>
          {s.label && <div className="h-7 mt-1 px-2 flex items-center text-xs leading-4 font-medium uppercase text-[#737373]">{s.label}</div>}
          {s.items.map((it) => <PanelRow key={it.label} it={it} count={it.count?.(counts)} locked={mod.locked} mode={mod.id === 'home' ? 'plain' : 'module'} />)}
        </Fragment>
      ))}
      {mod.locked && (
        <div className="mt-2 rounded-lg border border-[#E5E5E5] bg-white p-4">
          <div className="text-sm font-semibold text-[#171717]">Not in your plan</div>
          <div className="text-xs text-[#737373] mt-1">Listing site (LMS) lets you publish your halls on your own website.</div>
        </div>
      )}
    </div>
  );
}

/** A small icon button that appears on the right of a row when you hover it. */
function RowAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label={label} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
          className="absolute right-1.5 top-1.5 size-6 rounded-md flex items-center justify-center text-[#A3A3A3] hover:text-ink hover:bg-black/[0.05] opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}

function pinToggle(it: NavItem) {
  const { pins, pin, unpin } = usePins.getState();
  const at = pins.indexOf(it.to);
  if (at >= 0) {
    unpin(it.to);
    toast(`Unpinned ${it.label}`, { duration: 6000, action: { label: 'Undo', onClick: () => usePins.getState().pin(it.to, at) } });
  } else {
    pin(it.to);
    toast.success(`Pinned ${it.label} to Home`);
  }
}

/** Every module row target, so a row without ?tab can tell when a sibling row owns the current tab. */
const ALL_TO = modules.flatMap((m) => m.sections.flatMap((s) => s.items.map((i) => i.to)));

/* mode: 'plain' = Home's own pages; 'module' = a module page; 'pinned' = a row in Home's Pinned list, with unpin on hover. */
function PanelRow({ it, count, locked, mode }: { it: NavItem; count?: number; locked?: boolean; mode: 'plain' | 'module' | 'pinned' }) {
  const { pathname: route, search } = useLocation();
  const pathname = useNavPath(route);
  const href = useNavHref(route, search);
  const disabled = !!(it.soon || locked);
  const on = !disabled && (mode === 'pinned' ? within(it.to, pathname) : isCurrent(it.to, href, ALL_TO));
  const action = !disabled && mode === 'pinned';
  /* A page's views open under its row, only while the page is open. */
  const open = !disabled && !!it.sub && within(it.to, pathname);
  const counts = useNavCounts();
  const inner = (
    <>
      <span className="flex-1 truncate">{it.label}</span>
      {it.soon && <Pill tone="purple">Soon</Pill>}
      {!open && count !== undefined && count > 0 && <span className={cx('font-mono text-xs font-normal tabular-nums', action && 'group-hover/row:invisible group-focus-within/row:invisible', it.alert ? 'text-[#DC2626]' : 'text-[#737373]')}>{count}</span>}
    </>
  );
  const tabNow = new URLSearchParams(href.split('?')[1] ?? '').get('tab');
  const rowSel = on && (!open || (!!it.landing && !tabNow));
  /* Sub rows (3884:43935): 32px, 6/8 padding, Geist Regular 14 #3F404D; the selected one is the raised white row. */
  const cls = cx(ROW, 'h-8 shrink-0 px-2', rowSel ? RAISED : on ? 'text-[#0A0A0A] font-medium' : IDLE, disabled && 'opacity-60 cursor-default hover:translate-x-0 hover:scale-100');
  if (disabled) return <div className={cls} aria-disabled>{inner}</div>;
  const curTab = tabNow ?? (it.landing ? undefined : it.sub?.[0].tab);
  return (
    <>
      <div className="relative group/row">
        <NavLink to={it.to} end draggable={false} className={cls} onClick={() => usePins.getState().go(it.to, mode === 'pinned' ? it.to : null)}>{inner}</NavLink>
        {mode === 'pinned' && <RowAction label="Unpin" onClick={() => pinToggle(it)}><PinOff size={14} /></RowAction>}
      </div>
      {open && (
        <div className="relative ml-3 pl-2.5 flex flex-col gap-0.5 before:absolute before:left-0 before:top-0 before:bottom-1 before:w-px before:bg-[#E5E5E5]">
          {it.sub!.map((v) => {
            const to = `${it.to}?tab=${encodeURIComponent(v.tab)}`;
            const sel = curTab === v.tab;
            const n = v.count?.(counts);
            return (
              <NavLink key={v.tab} to={to} draggable={false} aria-current={sel ? 'page' : undefined} onClick={() => usePins.getState().go(to, mode === 'pinned' ? it.to : null)}
                className={cx(ROW, 'h-8 px-2', sel ? RAISED : IDLE)}>
                <span className="flex-1 truncate">{v.label}</span>
                {n !== undefined && n > 0 && <span className="font-mono text-xs font-normal tabular-nums text-[#737373]">{n}</span>}
              </NavLink>
            );
          })}
        </div>
      )}
    </>
  );
}

/** Home's Pinned list: drag (or Alt+↑/↓) to reorder, hover to unpin, + to pin any page. */
function PinnedSection({ counts }: { counts: NavCounts }) {
  const role = useDb((s) => s.role);
  const { pins, move } = usePins();
  const pages = pins.map((to) => pinnable.find((p) => p.to === to)).filter((p): p is (typeof pinnable)[number] => !!p && p.roles.includes(role));
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);

  const over = (e: DragEvent, i: number) => {
    if (!drag) return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    const at = e.clientY < r.top + r.height / 2 ? i : i + 1;
    if (at !== drag.over) setDrag({ ...drag, over: at });
  };
  const drop = () => {
    if (drag && drag.over !== drag.from && drag.over !== drag.from + 1) {
      move(pins.indexOf(pages[drag.from].to), drag.over < pages.length ? pins.indexOf(pages[drag.over].to) : pins.length);
    }
    setDrag(null);
  };
  const keys = (e: ReactKeyboardEvent, i: number) => {
    if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const j = e.key === 'ArrowUp' ? i - 1 : i + 2;
    if (j < 0 || j > pages.length) return;
    const to = pages[i].to;
    move(pins.indexOf(to), j < pages.length ? pins.indexOf(pages[j].to) : pins.length);
    requestAnimationFrame(() => (document.querySelector(`[data-pin="${to}"] a`) as HTMLElement | null)?.focus());
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="h-7 mt-1 pl-2 pr-1 flex items-center justify-between text-xs leading-4 font-medium uppercase text-[#737373]">
        Pinned
        <PinPicker />
      </div>
      {pages.length === 0 && (
        <div className="rounded-lg border border-dashed border-[#D4D4D4] px-3 py-2.5 text-xs leading-4 text-[#737373]">
          Pin the pages you open most. Use + to add one.
        </div>
      )}
      <div className="flex flex-col gap-1" onDragOver={(e) => drag && e.preventDefault()} onDrop={drop}>
        {pages.map((p, i) => (
          <div key={p.to} data-pin={p.to} draggable
            onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', p.label); setDrag({ from: i, over: i }); }}
            onDragOver={(e) => over(e, i)} onDragEnd={() => setDrag(null)} onKeyDown={(e) => keys(e, i)}
            className={cx('relative', drag?.from === i && 'opacity-40')}>
            {drag && drag.over === i && drag.over !== drag.from && drag.over !== drag.from + 1 && <span className="absolute -top-[3px] left-2 right-2 h-0.5 rounded-full bg-primary" />}
            {drag && i === pages.length - 1 && drag.over === pages.length && drag.from !== i && <span className="absolute -bottom-[3px] left-2 right-2 h-0.5 rounded-full bg-primary" />}
            <PanelRow it={p} count={p.count?.(counts)} mode="pinned" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** "+" in the Pinned header: a searchable list of every page; picking one pins or unpins it. */
function PinPicker() {
  const role = useDb((s) => s.role);
  const pins = usePins((s) => s.pins);
  const pages = pinnable.filter((p) => p.roles.includes(role));
  const groups = [...new Set(pages.map((p) => p.module))];
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger aria-label="Pin a page" className="size-5 rounded flex items-center justify-center text-[#A3A3A3] hover:text-ink hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Plus size={14} />
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={6}>Pin a page</TooltipContent>
      </Tooltip>
      <PopoverContent side="right" align="start" sideOffset={10} className="w-64 p-0">
        <Command loop>
          <CommandInput placeholder="Pin a page…" />
          <CommandList className="max-h-72 p-1">
            <CommandEmpty className="py-6 text-center text-sm text-gray-500">No page matches</CommandEmpty>
            {groups.map((g) => (
              <CommandGroup key={g} heading={g} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-1.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-gray-500">
                {pages.filter((p) => p.module === g).map((p) => {
                  const I = p.icon;
                  const on = pins.includes(p.to);
                  return (
                    <CommandItem key={p.to} value={`${g} ${p.label}`} onSelect={() => pinToggle(p)} className="gap-2.5 data-[selected=true]:bg-[#F5F5F5]">
                      <I size={16} className="text-gray-500" /><span className="flex-1 truncate">{p.label}</span>
                      {on && <CheckIcon size={14} className="text-primary" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** The profile in the sidebar footer (68px, Connect): r10 photo, name, light email, up/down chevrons. Opens the account menu. */
function UserMenu({ collapsed }: { collapsed: boolean }) {
  const { role, setRole, reset } = useDb();
  const nav = useNavigate();
  const roles: { id: Role; label: string; sub: string }[] = useMemo(() => [
    { id: 'admin', label: 'Super admin', sub: 'Every module' },
    { id: 'offcampus', label: 'Off-campus reviewer', sub: 'Home, Off-campus and Settings only' },
  ], []);
  /* Sign out: cover the app ("Signing you out…"), confirm it, then land on the sign-in page, which now says Welcome back. */
  const me = useAuth((s) => s.remembered) ?? { name: 'Priya Shah', email: 'priya.shah@durham.ac.uk' };
  const [leaving, setLeaving] = useState<'pending' | 'done'>();
  const { theme, setTheme } = useTheme();
  const { on: emptyOn, setOn: setEmpty } = useEmpty();
  const signOut = () => {
    setLeaving('pending');
    setTimeout(() => setLeaving('done'), 900);
    setTimeout(() => { useAuth.getState().signOut(); nav('/login', { replace: true }); }, 1800);
  };
  return (
    <>
    <DropdownMenu modal={false}>
      {/* Profile (3884:39336): 59px so its line meets the page footer's; 16px sides, 10px gap, round photo. */}
      <DropdownMenuTrigger aria-label="Account" className={cx('h-[59px] shrink-0 border-t border-[#E5E5E5] flex items-center gap-2.5 px-4 outline-none transition-colors duration-150 hover:bg-black/[0.02] data-[state=open]:bg-[#F4F4F5] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring text-left', collapsed && 'justify-center px-0')}>
        <PersonPhoto name={me.name} size={32} />
        {!collapsed && <>
          <span className="flex-1 min-w-0"><span className="block text-sm leading-5 font-medium text-[#0A0A0A] truncate">{me.name}</span><span className="block text-xs leading-4 font-light text-[#737373] truncate">{me.email}</span></span>
          <ChevronsUpDown size={16} strokeWidth={1.75} absoluteStrokeWidth className="text-[#404040] shrink-0" />
        </>}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-60 p-0 overflow-hidden">
        <DropdownMenuLabel className="px-5 py-3 font-normal bg-[#F5F5F5] border-b border-[#E5E5E5] flex items-center gap-2.5">
          <PersonPhoto name={me.name} size={32} />
          <span className="min-w-0"><span className="block font-medium text-sm text-ink truncate">{me.name}</span><span className="block text-xs text-[#737373] truncate">{me.email}</span></span>
        </DropdownMenuLabel>
        <div className="p-2">
          <DropdownMenuLabel className="px-3 pt-1.5 pb-1 font-mono uppercase text-xs font-medium tracking-[0.48px] text-[#737373]">View as (demo)</DropdownMenuLabel>
          {roles.map((r) => (
            <DropdownMenuItem key={r.id} className="h-auto items-start px-3 py-1.5 focus:bg-[#F5F5F5]"
              onSelect={() => { setRole(r.id); nav('/'); toast.success(`Viewing as ${r.label}`); }}>
              <span className="size-4 mt-0.5 shrink-0">{role === r.id && <CheckIcon size={16} weight="bold" className="text-primary" />}</span>
              <span><span className="block">{r.label}</span><span className="block text-xs text-[#737373]">{r.sub}</span></span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-[#E5E5E5]" />
          {/* Stays open when toggled, so you see the switch flip and the app change behind it. */}
          <DropdownMenuItem className="px-3 focus:bg-[#F5F5F5]" onSelect={(e) => { e.preventDefault(); setTheme(theme === 'dark' ? 'light' : 'dark'); }}>
            <Moon size={16} strokeWidth={1.5} className="text-[#404040]" /><span className="flex-1">Dark mode</span>
            <Switch checked={theme === 'dark'} tabIndex={-1} aria-hidden className="pointer-events-none" />
          </DropdownMenuItem>
          {/* Demo: every list goes empty so its first-run state shows. Off brings the data back. */}
          <DropdownMenuItem className="px-3 focus:bg-[#F5F5F5]" onSelect={(e) => { e.preventDefault(); setEmpty(!emptyOn); }}>
            <Tray size={16} strokeWidth={1.5} className="text-[#404040]" /><span className="flex-1">Empty states</span>
            <Switch checked={emptyOn} tabIndex={-1} aria-hidden className="pointer-events-none" />
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-[#E5E5E5]" />
          <DropdownMenuItem className="px-3 focus:bg-[#F5F5F5]" onSelect={() => { reset(); nav('/'); toast.success('Demo data reset'); }}>
            <ArrowCounterClockwise size={16} strokeWidth={1.5} className="text-[#404040]" />Reset demo data
          </DropdownMenuItem>
          <DropdownMenuItem className="px-3 text-[#DC2626] focus:bg-[#F5F5F5] focus:text-[#DC2626]" onSelect={signOut}>
            <SignOut size={16} strokeWidth={1.5} />Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
    {leaving && <SigningOut name={me.name} done={leaving === 'done'} />}
    </>
  );
}
