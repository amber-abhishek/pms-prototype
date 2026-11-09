import { Fragment, useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../data/auth';
import { SigningOut } from '../pages/auth/Login';
import { ArrowCounterClockwise, CaretDown, Moon, Tray, Check as CheckIcon, Lock, MagnifyingGlass, PinOff, Plus, SidebarSimple, SignOut } from '../components/icons';
import { toast } from 'sonner';
import { modules, moduleFor, pinnable, useNavCounts, type Module, type NavCounts, type NavItem } from '../nav';
import { usePins, isCurrent, useNavHref, useNavPath, within } from '../data/pins';
import { useDb, type Role } from '../data/store';
import { cx, Pill } from '../components/ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/shadcn/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/shadcn/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '../components/shadcn/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../components/shadcn/command';
import { Palette } from './Palette';
import { Switch } from '../components/shadcn/switch';
import { useTheme } from '../data/theme';
import { useEmpty } from '../data/empty';
import { RailSolid, hasSolid } from './railIcons';
import { SolidIcon, hasSolidIcon } from './solidIcons';
import { NoAccess } from '../pages/Misc';

export function Shell() {
  const { pathname, search } = useLocation();
  const role = useDb((s) => s.role);
  const [panelOpen, setPanelOpen] = useState(true);
  const [palette, setPalette] = useState(false);
  /* Mercury page scroll: mark <main> once the table header is stuck under the breadcrumb, so its line runs edge to edge. */
  const mainRef = useRef<HTMLElement>(null);
  const onMainScroll = () => {
    const m = mainRef.current; if (!m) return;
    const th = m.querySelector('[data-scroller] thead, [data-scroller] [data-head]');
    const stuck = !!th && m.scrollTop > 0 && th.getBoundingClientRect().top - m.getBoundingClientRect().top <= 52.5;
    if (stuck !== m.hasAttribute('data-stuck')) m.toggleAttribute('data-stuck', stuck);
  };
  useEffect(() => { const m = mainRef.current; if (m) { m.scrollTop = 0; m.removeAttribute('data-stuck'); } }, [pathname]);
  const via = usePins((s) => s.via);
  const pins = usePins((s) => s.pins);
  const path = useNavPath(pathname);
  /* Opened from a pin: Home stays selected while you are on any pinned page (or a page under one). Checked against
     the pin list, not just the clicked pin, so the render between the click and the route change stays on Home too. */
  const fromPin = !!via && pins.some((p) => within(p, path));
  useEffect(() => {
    const st = usePins.getState();
    /* The route has caught up with the click (or the click was to the page you are on): drop the pending target. */
    if (st.pending) usePins.setState({ pending: null });
    if (st.via && !st.pins.some((p) => within(p, pathname))) st.setVia(null);
  }, [pathname, search]); /* search too: in-page tab changes (?tab=) must move the sidebar selection */
  const mod = fromPin ? modules[0] : moduleFor(path);
  const visible = modules.filter((m) => m.roles.includes(role));
  const allowed = moduleFor(pathname).roles.includes(role);
  const emptyKey = useEmpty((s) => s.on);
  const signedIn = useAuth((s) => s.signedIn);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); }
      if ((e.metaKey || e.ctrlKey) && e.key === '.') { e.preventDefault(); setPanelOpen((p) => !p); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  if (!signedIn) return <Navigate to="/login" replace />;

  return (
    <div className="h-full flex flex-col bg-chrome min-w-[1024px]">
      {/* Top bar on the chrome */}
      <header className="h-12 shrink-0 flex items-center pl-[14px] pr-2">
        <div className="w-[280px] flex items-center justify-between pr-3">
          <button type="button" className="flex items-center gap-2 rounded-lg px-0 py-1 hover:opacity-80" onClick={() => toast('Durham University is the only organisation on this account')}>
            <span className="size-7 rounded-[7px] bg-[#2563EB] text-white text-sm leading-5 font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(37,99,235,0.35)] flex items-center justify-center">D</span>
            <span className="flex items-center gap-1"><span className="text-sm leading-[18px] font-medium text-ink">Durham University</span><CaretDown size={14} className="text-gray-500" /></span>
          </button>
          <button type="button" aria-label={panelOpen ? 'Hide panel' : 'Show panel'} title="Toggle panel (⌘.)" onClick={() => setPanelOpen((p) => !p)} className="size-7 rounded-md flex items-center justify-center text-gray-500 hover:bg-white hover:text-ink">
            <SidebarSimple size={16} />
          </button>
        </div>
        <button type="button" onClick={() => setPalette(true)} className="ml-auto h-8 w-80 flex items-center gap-2 pl-2.5 pr-1.5 rounded-lg border border-line bg-white text-sm leading-5 text-[#646A78] hover:border-gray-300 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <MagnifyingGlass size={14} className="text-gray-500" />Search anything
          <span className="ml-auto flex gap-1">{['⌘', 'K'].map((k) => <kbd key={k} className="min-w-[18px] h-[18px] px-1 rounded border border-line bg-white text-[11px] leading-4 text-[#646A78] font-sans flex items-center justify-center">{k}</kbd>)}</span>
        </button>
      </header>

      <div className="flex-1 flex min-h-0 pr-2 pb-2">
        <Rail visible={visible} active={mod} />
        <div className="flex-1 flex min-w-0 rounded-xl border border-line bg-white shadow-card overflow-hidden">
          <Panel mod={mod} collapsed={!panelOpen} />
          <main ref={mainRef} onScroll={onMainScroll} className="pms-main flex-1 min-w-0 flex flex-col">{allowed ? <Outlet key={emptyKey ? 'empty' : 'full'} /> : <NoAccess />}</main>
        </div>
      </div>
      <Palette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}

function Rail({ visible, active }: { visible: Module[]; active: Module }) {
  const groups = (['top', 'modules', 'bottom'] as const).map((g) => visible.filter((m) => m.group === g));
  return (
    <TooltipProvider delayDuration={300}>
    <nav aria-label="Modules" className="w-14 shrink-0 flex flex-col items-center pt-1 pb-1 gap-1">
      {groups.map((g, i) => (
        <Fragment key={i}>
          {i === 2 && <div className="flex-1" />}
          {i > 0 && g.length > 0 && <div className="w-5 h-px bg-[#E2E3E7] my-1" />}
          {g.map((m) => <RailItem key={m.id} m={m} on={m.id === active.id} />)}
        </Fragment>
      ))}
      <UserMenu />
    </nav>
    </TooltipProvider>
  );
}

function RailItem({ m, on }: { m: Module; on: boolean }) {
  const I = m.icon;
  return (
    <Tooltip>
    <TooltipTrigger asChild>
      <NavLink to={m.home} aria-label={m.label} onClick={() => usePins.getState().go(m.home, null)}
        className={cx('group relative size-10 flex items-center justify-center transition-colors duration-0 hover:duration-150', /* 3783:48441 RailItem: pressed into the chrome — #E8EAEE, inset drop + hairline ring, white lip below. */ on ? 'rounded-[10px] bg-[#E8EAEE] text-[#111827] shadow-[inset_0_1px_3px_rgba(17,24,39,0.16),inset_0_0_0_1px_rgba(17,24,39,0.08),0_1px_0_#FFFFFF]' : 'rounded-[10px] text-gray-500 hover:bg-[#ECEEF1] hover:text-[#111827]')}>
        <span key={on ? 'on' : 'off'} className={cx('nav-ic', on && 'nav-ic-on')}>{on && hasSolid(m.id) ? <RailSolid id={m.id} /> : <I size={16} />}</span>
        {/* Locked module (not in the plan): a small lock badge on the icon's bottom-right corner. */}
        {m.locked && <span className="absolute right-1 bottom-1 size-4 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center"><Lock size={10} weight="fill" className="text-gray-500" /></span>}
      </NavLink>
    </TooltipTrigger>
    {/* Same tooltip as the collapsed panel's page icons: to the right, 8px off. */}
    <TooltipContent side="right" sideOffset={8}>
      {m.label}{m.locked && <span className="text-gray-400"> · locked</span>}
    </TooltipContent>
    </Tooltip>
  );
}

/* Collapsed (⌘.): the panel narrows to its page icons, each with a tooltip; section labels become short dividers. */
function Panel({ mod, collapsed }: { mod: Module; collapsed: boolean }) {
  const counts = useNavCounts();
  return (
    <TooltipProvider delayDuration={collapsed ? 300 : 400}>
    <aside aria-label={`${mod.label} pages`} className={cx('shrink-0 border-r border-line flex flex-col pb-4', collapsed ? 'w-14 px-3' : 'w-56 px-3')}>
      <div className={cx('shrink-0 flex items-center', collapsed ? 'h-3' : 'h-[52px] pl-2 pr-1')}>
        {!collapsed && <div className="text-[15px] leading-5 font-semibold text-ink">{mod.label}</div>}
      </div>
      <div className={cx('flex-1 flex flex-col gap-1', collapsed ? 'overflow-y-auto overflow-x-hidden' : 'overflow-auto')}>
        {mod.sections.map((s, i) => s.pinned ? <PinnedSection key={i} counts={counts} collapsed={collapsed} /> : (
          <div key={i} className="flex flex-col gap-1">
            {s.label && (collapsed
              ? <div className="h-px w-5 mx-auto my-2.5 bg-[#E2E3E7]" aria-hidden />
              : <div className="h-6 mt-2 px-2 flex items-center justify-between text-xs leading-5 font-medium text-gray-500">{s.label}</div>
            )}
            {s.items.map((it) => <PanelRow key={it.label} it={it} count={it.count?.(counts)} locked={mod.locked} mode={mod.id === 'home' ? 'plain' : 'module'} collapsed={collapsed} />)}
          </div>
        ))}
        {mod.locked && !collapsed && (
          <div className="mt-4 mx-1 rounded-xl border border-[#A855F7]/30 p-3">
            <div className="text-sm font-semibold text-[#7E22CE]">Not in your plan</div>
            <div className="text-xs text-gray-500 mt-0.5">Listing site (LMS) lets you publish your halls on your own website.</div>
          </div>
        )}
      </div>
    </aside>
    </TooltipProvider>
  );
}

/** A small icon button that appears on the right of a panel row when you hover it. */
function RowAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" aria-label={label} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
          className="absolute right-1 top-1 size-6 rounded-md flex items-center justify-center text-gray-400 hover:text-ink hover:bg-black/[0.05] opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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

/* mode: 'plain' = Home's own pages; 'module' = a module page (no pin control: pins are added from Home's Pinned +);
   'pinned' = a row in Home's Pinned list, with unpin on hover. */
/** Every module row target, so a row without ?tab can tell when a sibling row owns the current tab. */
const ALL_TO = modules.flatMap((m) => m.sections.flatMap((s) => s.items.map((i) => i.to)));

function PanelRow({ it, count, locked, mode, collapsed }: { it: NavItem; count?: number; locked?: boolean; mode: 'plain' | 'module' | 'pinned'; collapsed?: boolean }) {
  const { pathname: route, search } = useLocation();
  const pathname = useNavPath(route);
  const href = useNavHref(route, search);
  const disabled = !!(it.soon || locked);
  const on = !disabled && (mode === 'pinned' ? within(it.to, pathname) : isCurrent(it.to, href, ALL_TO));
  /* Only Home's Pinned rows have a hover action (unpin); pinning itself happens from Pinned's + button. */
  const action = !disabled && mode === 'pinned';
  /* Mercury-style: a page's views open under its row, on a thin guide line, only while the page is open. */
  const open = !disabled && !collapsed && !!it.sub && within(it.to, pathname);
  const counts = useNavCounts();
  const I = it.icon;
  const inner = (
    <>
      <span key={on ? 'on' : 'off'} className={cx('nav-ic', on && 'nav-ic-on')}>{on && hasSolidIcon(I) ? <SolidIcon icon={I} className="shrink-0 text-[#111827]" /> : <I size={16} className={on ? 'text-[#111827]' : 'text-gray-500'} />}</span>
      <span className="flex-1 truncate">{it.label}</span>
      {it.soon && <Pill tone="purple">Soon</Pill>}
      {!open && count !== undefined && count > 0 && <span className={cx('text-xs leading-5 font-medium tabular-nums', action && 'group-hover/row:invisible group-focus-within/row:invisible', it.alert ? 'text-[#DC2626]' : 'text-gray-500')}>{count}</span>}
    </>
  );
  const tabNow = new URLSearchParams(href.split('?')[1] ?? '').get('tab');
  const rowSel = on && (!open || (!!it.landing && !tabNow));
  const cls = cx(!disabled && 'group', 'h-8 shrink-0 px-2 rounded-lg flex items-center gap-2 text-sm leading-5 font-medium transition-colors duration-0 hover:duration-150', rowSel ? 'bg-[#F3F4F6] text-ink shadow-[inset_0_1px_2px_rgba(17,24,39,0.08),inset_0_0_0_1px_rgba(17,24,39,0.06),0_1px_0_#fff]' : on ? 'text-ink hover:bg-[#F6F7F8]' : 'text-gray-700 hover:bg-[#F6F7F8]', disabled && 'opacity-60 cursor-default');
  if (collapsed) {
    const icon = <span key={on ? 'on' : 'off'} className={cx('nav-ic', on && 'nav-ic-on')}>{on && hasSolidIcon(I) ? <SolidIcon icon={I} className="shrink-0 text-[#111827]" /> : <I size={16} className={on ? 'text-[#111827]' : 'text-gray-500'} />}</span>;
    const dot = count !== undefined && count > 0 && it.alert && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-[#DC2626]" />;
    const ccls = cx(cls, 'relative w-8 px-0 justify-center');
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {disabled
            ? <div className={ccls} aria-disabled aria-label={it.label}>{icon}</div>
            : <NavLink to={it.to} end draggable={false} aria-label={it.label} className={ccls} onClick={() => usePins.getState().go(it.to, mode === 'pinned' ? it.to : null)}>{icon}{dot}</NavLink>}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {it.label}{count !== undefined && count > 0 && <span className={it.alert ? 'text-[#FCA5A5]' : 'text-gray-400'}> · {count}</span>}{it.soon && <span className="text-gray-400"> · soon</span>}
        </TooltipContent>
      </Tooltip>
    );
  }
  if (disabled) return <div className={cls} aria-disabled>{inner}</div>;
  const curTab = tabNow ?? (it.landing ? undefined : it.sub?.[0].tab);
  return (
    <>
      <div className="relative group/row">
        <NavLink to={it.to} end draggable={false} className={cls} onClick={() => usePins.getState().go(it.to, mode === 'pinned' ? it.to : null)}>{inner}</NavLink>
        {mode === 'pinned' && <RowAction label="Unpin" onClick={() => pinToggle(it)}><PinOff size={14} /></RowAction>}
      </div>
      {open && (
        <div className="relative ml-4 pl-2 py-1 flex flex-col gap-1 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-px before:bg-[#E5E7EB]">
          {it.sub!.map((v) => {
            const to = `${it.to}?tab=${encodeURIComponent(v.tab)}`;
            const sel = curTab === v.tab;
            const n = v.count?.(counts);
            return (
              <NavLink key={v.tab} to={to} draggable={false} aria-current={sel ? 'page' : undefined} onClick={() => usePins.getState().go(to, mode === 'pinned' ? it.to : null)}
                className={cx('h-8 px-2 rounded-lg flex items-center gap-2 text-sm leading-5 transition-colors duration-0 hover:duration-150', sel ? 'text-ink font-medium bg-[#F3F4F6] shadow-[inset_0_1px_2px_rgba(17,24,39,0.08),inset_0_0_0_1px_rgba(17,24,39,0.06),0_1px_0_#fff]' : 'text-gray-500 hover:text-ink hover:bg-[#F6F7F8]')}>
                <span className="flex-1 truncate">{v.label}</span>
                {n !== undefined && n > 0 && <span className="text-xs font-medium tabular-nums text-gray-500">{n}</span>}
              </NavLink>
            );
          })}
        </div>
      )}
    </>
  );
}

/** Home's Pinned list: drag (or Alt+↑/↓) to reorder, hover to unpin, + to pin any page. */
function PinnedSection({ counts, collapsed }: { counts: NavCounts; collapsed?: boolean }) {
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

  if (collapsed) return pages.length === 0 ? null : (
    <div className="flex flex-col gap-1">
      <div className="h-px w-5 mx-auto my-2.5 bg-[#E2E3E7]" aria-hidden />
      {pages.map((p) => <PanelRow key={p.to} it={p} count={p.count?.(counts)} mode="pinned" collapsed />)}
    </div>
  );

  return (
    <div className="flex flex-col gap-1">
      <div className="h-6 mt-2 pl-2 pr-1 flex items-center justify-between text-xs leading-5 font-medium text-gray-500">
        Pinned
        <PinPicker />
      </div>
      {pages.length === 0 && (
        <div className="mx-1 mt-0.5 rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-xs leading-[18px] text-gray-500">
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
          <PopoverTrigger aria-label="Pin a page" className="size-5 rounded flex items-center justify-center text-gray-400 hover:text-ink hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
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
                    <CommandItem key={p.to} value={`${g} ${p.label}`} onSelect={() => pinToggle(p)} className="gap-2.5 data-[selected=true]:bg-[#F3F4F6]">
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

function UserMenu() {
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
  /* shadcn DropdownMenu, opening to the right of the avatar. */
  return (
    <>
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger aria-label="Account" className="mt-1 size-10 flex items-center justify-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="size-7 rounded-full bg-gradient-to-br from-[#F97316] to-[#EC4899] text-white text-[11px] font-semibold flex items-center justify-center ring-2 ring-white">{me.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-64 p-1.5">
        <DropdownMenuLabel className="px-2 py-1.5 font-normal"><div className="font-medium text-sm text-ink">{me.name}</div><div className="text-xs text-gray-500">{me.email}</div></DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-line" />
        <DropdownMenuLabel className="px-2 pt-1 pb-0.5 text-xs font-normal text-gray-500">View as (demo)</DropdownMenuLabel>
        {roles.map((r) => (
          <DropdownMenuItem key={r.id} className="h-auto items-start px-2 py-1.5 focus:bg-gray-50"
            onSelect={() => { setRole(r.id); nav('/'); toast.success(`Viewing as ${r.label}`); }}>
            <span className="size-4 mt-0.5">{role === r.id && <CheckIcon size={16} weight="bold" className="text-primary" />}</span>
            <span><span className="block">{r.label}</span><span className="block text-xs text-gray-500">{r.sub}</span></span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-line" />
        {/* Stays open when toggled, so you see the switch flip and the app change behind it. */}
        <DropdownMenuItem className="px-2 focus:bg-gray-50" onSelect={(e) => { e.preventDefault(); setTheme(theme === 'dark' ? 'light' : 'dark'); }}>
          <Moon size={16} className="text-gray-500" /><span className="flex-1">Dark mode</span>
          <Switch checked={theme === 'dark'} tabIndex={-1} aria-hidden className="pointer-events-none" />
        </DropdownMenuItem>
        {/* Demo: every list goes empty so its first-run state (with its Figma illustration) shows. Off brings the data back. */}
        <DropdownMenuItem className="px-2 focus:bg-gray-50" onSelect={(e) => { e.preventDefault(); setEmpty(!emptyOn); }}>
          <Tray size={16} className="text-gray-500" /><span className="flex-1">Empty states</span>
          <Switch checked={emptyOn} tabIndex={-1} aria-hidden className="pointer-events-none" />
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-line" />
        <DropdownMenuItem className="px-2 focus:bg-gray-50" onSelect={() => { reset(); nav('/'); toast.success('Demo data reset'); }}>
          <ArrowCounterClockwise size={16} className="text-gray-500" />Reset demo data
        </DropdownMenuItem>
        <DropdownMenuItem className="px-2 focus:bg-gray-50" onSelect={signOut}>
          <SignOut size={16} className="text-gray-500" />Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    {leaving && <SigningOut name={me.name} done={leaving === 'done'} />}
    </>
  );
}
