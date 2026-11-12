import { Children, Fragment, isValidElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { Illustration, type Illo } from './Illustration';
import { GhostZone, useHeadingTaken, useOwnHeading, usePageTitle, usePublishTitle } from './headerCtx';

/** The breadcrumb's current page: the h1 unless the page shows its own title. */
export function CrumbTitle({ className, children }: { className: string; children: ReactNode }) {
  const taken = useHeadingTaken();
  return taken ? <span aria-current="page" className={className}>{children}</span> : <h1 className={className}>{children}</h1>;
}
/** A visible page title; registers so the breadcrumb steps down. */
export function TitleH1({ className, children }: { className: string; children: ReactNode }) {
  useOwnHeading();
  return <h1 className={className}>{children}</h1>;
}
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { Button as UIButton, type ButtonProps as UIButtonProps } from './shadcn/button';
import { Badge } from './shadcn/badge';
import { Card as UICard } from './shadcn/card';
import { Tabs as UITabs, TabsList, TabsTrigger } from './shadcn/tabs';
import { Popover, PopoverContent, PopoverTrigger } from './shadcn/popover';
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow, monoize } from './shadcn/table';
import { Input as UIInput } from './shadcn/input';
import { Textarea as UITextarea } from './shadcn/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './shadcn/dropdown-menu';
import { Label } from './shadcn/label';
import { Switch as UISwitch } from './shadcn/switch';
import { Checkbox } from './shadcn/checkbox';
import { Sheet as UISheet, sheetStep, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from './shadcn/sheet';
import { Dialog as UIDialog, DialogContent, DialogFrame } from './shadcn/dialog';
import { toneCls, toneDot } from './tones';
import { rowAttrs, useRowMotion } from './rowMotion';
import { ArrowLeft as ArrowL, ArrowRight as ArrowR, ArrowUpRight as ArrowUR, CaretDown, CaretLeft, CaretRight, Check as CheckIcon, ChevronsUpDown, FunnelSimple, MagnifyingGlass, type Icon } from './icons';
import { X, ArrowDown, ArrowUp, Prohibit, Lock, MagicWand, UserCheck, XCircle, Trash, Archive, ArrowCounterClockwise, Bell, UserPlus, PaperPlaneTilt, ChatCenteredText, Copy, PencilSimple, DownloadSimple, UploadSimple, Plus, Eye, ArrowSquareOut, CalendarPlus, Pause, ArrowClockwise, Tag, House } from './icons';
export { toneCls, toneDot, toneLine } from './tones';
import type { Tone } from '../data/seed';
export type { Tone };

export const cx = clsx;

/* ---------- Buttons ---------- */
/* shadcn Button (./shadcn/button) under the prototype's names: `secondary` is shadcn `outline`, `danger` is `destructive`.
   Adds a leading 16px `icon`, and `type="button"` by default so a button inside a form doesn't submit it. */
/* `tertiary` is the grey quick-action pill; `control` is the bordered r8 square for filters, sort pickers and header pickers. */
type BtnProps = Omit<UIButtonProps, 'variant' | 'size'> & { variant?: 'primary' | 'secondary' | 'tertiary' | 'control' | 'ghost' | 'danger' | 'success' | 'danger-outline' | 'danger-ghost'; size?: 'sm' | 'md'; icon?: Icon | null };
const btnVariant = { primary: 'default', secondary: 'outline', tertiary: 'tertiary', control: 'control', ghost: 'ghost', danger: 'destructive', success: 'success', 'danger-outline': 'destructive-outline', 'danger-ghost': 'destructive-ghost' } as const;
/* In the page header every action is a borderless ghost, never filled or blue; header pickers (`control`) keep their border. */
const headerVariant = (v: NonNullable<BtnProps['variant']>, zone: boolean | 'multi'): NonNullable<BtnProps['variant']> =>
  zone === 'multi' && v === 'primary' ? 'primary' : v === 'control' || v === 'ghost' || v === 'danger-ghost' ? v : v === 'danger' || v === 'danger-outline' ? 'danger-ghost' : 'ghost';
/* Every action button carries a leading icon (2026-11-09: "in all the buttons we need to have the icons"). When a call
   site passes none, the label picks one; dismiss buttons (Cancel, Close, Back, Keep…) stay text only. */
const AUTO_ICON: [RegExp, Icon | null][] = [
  [/^(cancel|close|back|keep|got it|not now|skip|no,)\b(?! (booking|offer|cycle|the booking))/i, null],
  [/^cancel (booking|offer|the booking)/i, Prohibit], [/^close cycle/i, Lock],
  [/^auto-allocate/i, MagicWand], [/^(allocate|assign|reassign|hand)/i, UserCheck],
  [/^(reject|decline)/i, XCircle], [/^(delete|remove|disconnect)/i, Trash], [/^archive/i, Archive],
  [/^(restore|reopen|undo|revert|unarchive)/i, ArrowCounterClockwise],
  [/^(remind|send a reminder|send reminder|chase)/i, Bell], [/^invite/i, UserPlus],
  [/^(send|resend|email)/i, PaperPlaneTilt], [/^(request more|message|reply|comment)/i, ChatCenteredText],
  [/^(duplicate|copy)/i, Copy], [/^(edit|rename|change)/i, PencilSimple],
  [/^(export|download|error file)/i, DownloadSimple], [/^(import|upload|replace)/i, UploadSimple],
  [/^(new|add|create|log)\b/i, Plus], [/^(view|preview)/i, Eye], [/^(open|see|go to)/i, ArrowSquareOut],
  [/^(extend|schedule|snooze|let it lapse)/i, CalendarPlus], [/^(stop|pause|suspend)/i, Pause],
  [/^(retry|refresh|sync|try again|reconnect)/i, ArrowClockwise], [/^set status/i, Tag],
  [/^(approve|accept|confirm|mark|done|claim|save|apply|verify|publish|finish|continue|next|check in)/i, CheckIcon],
];
const labelOf = (c: ReactNode): string => (typeof c === 'string' || typeof c === 'number' ? String(c) : Array.isArray(c) ? c.map(labelOf).join('') : '');
const autoIcon = (c: ReactNode): Icon | undefined => { const t = labelOf(c).trim(); if (!t) return; for (const [re, ic] of AUTO_ICON) if (re.test(t)) return ic ?? undefined; };
export function Button({ variant: asked = 'secondary', size = 'md', icon, children, type = 'button', ...p }: BtnProps) {
  /* No arrows in buttons (2026-11-09): an arrow icon falls back to the label's icon, and trailing arrow glyphs are dropped. */
  if (icon === ArrowL || icon === ArrowR || icon === ArrowUR) icon = undefined;
  children = Children.toArray(children).filter((c) => !(isValidElement(c) && (c.type === ArrowL || c.type === ArrowR || c.type === ArrowUR)));
  const zone = useContext(GhostZone);
  const variant = zone ? headerVariant(asked, zone) : asked;
  /* `icon={null}` opts out of the label icon (repeated row actions such as Change rent, Pick unit). */
  const I = icon === null ? undefined : icon ?? (variant === 'control' ? undefined : autoIcon(children));
  const solid = variant === 'primary' || variant === 'danger' || variant === 'success';
  return (
    <UIButton type={type} variant={btnVariant[variant]} size={size === 'sm' ? 'sm' : 'default'} {...p}>
      {I && <I size={16} weight="regular" className={cx('shrink-0', !solid && variant !== 'danger-outline' && variant !== 'danger-ghost' && 'text-gray-700')} />}
      {children}
    </UIButton>
  );
}

/* ---------- Pills: shadcn Badge with the vibrant tones (./tones) ---------- */
/** Pill: 22px, 8px radius, 12px medium. `outline` is the tag style (white ground, tone border at 35%). */
export function Pill({ tone = 'grey', icon: I, dot, outline, children }: { tone?: Tone; icon?: Icon; dot?: boolean; outline?: boolean; children: ReactNode }) {
  return (
    <Badge tone={tone} look={outline ? 'outline' : 'soft'}>
      {dot && <span className="size-1.5 rounded-full" style={{ background: toneDot[tone] }} />}
      {I && <I size={12} weight="regular" className="shrink-0" />}
      {children}
    </Badge>
  );
}

const statusTone: Record<string, Tone> = {
  New: 'blue', 'In review': 'purple', Offered: 'amber', Accepted: 'green', Waitlisted: 'orange', Declined: 'grey',
  Sent: 'blue', Expired: 'grey', Confirmed: 'green', 'Lease unsigned': 'amber', 'Checked in': 'green', Cancelled: 'grey',
  'In residence': 'green', Arriving: 'blue', Leaving: 'amber', Open: 'red', 'In progress': 'amber', Resolved: 'green',
  Urgent: 'red', High: 'orange', Normal: 'grey', Pending: 'amber', Approved: 'green', Rejected: 'red', Draft: 'amber', Scheduled: 'blue',
  Published: 'green', Inactive: 'grey', Replied: 'green', Closed: 'grey', Occupied: 'blue', Available: 'green', Held: 'amber', Maintenance: 'red', Upcoming: 'purple',
};
Object.assign(statusTone, { Active: 'green', Submitted: 'blue', 'Awaiting info': 'amber', Suspended: 'red', Live: 'green', Allocated: 'green', Lapsed: 'grey', 'Lease sent': 'blue', Conflict: 'red', Overdue: 'red', Paused: 'amber' } satisfies Record<string, Tone>);
/** Status pill with the leading icon the designs use (✓ Active, ◉ Submitted, ⊖ Inactive…). Pass `tone`/`icon` to override. */
export const Status = ({ s, tone, icon }: { s: string; tone?: Tone; icon?: Icon }) => {
  const t = tone ?? statusTone[s] ?? 'grey';
  /* Status chips are text only (2026-11-09: "no icon needed" on Submitted, Rejected, Suspended). Pass `icon` to add one. */
  const I = icon;
  /* Status chips: r8 with a 12px leading icon (3755:15780). */
  return (
    <Badge tone={t} look="status">
      {I && <I size={12} weight="regular" className="shrink-0" />}{s}
    </Badge>
  );
};

/* ---------- Layout ---------- */
/** 52px header (2820:111): 16px grey-500 icon, 14px #737373 crumbs with 12px grey-400 chevrons; the current page is 14px regular ink, never bold. */
/** Only a real parent page links (the list a record was opened from). Section names (Inventory, Allocations,
 *  Organisation…) are sidebar groups, not pages, so they stay plain text. */
const CRUMB_TO: Record<string, string> = { Properties: '/inventory/properties' };
export type Crumb = string | { label: string; to?: string; onClick?: () => void };
/** One clickable crumb + chevron. Strings resolve through CRUMB_TO; a crumb with neither `to` nor `onClick` stays plain text. */
export function CrumbLink({ c }: { c: Crumb }) {
  const { label, to, onClick } = typeof c === 'string' ? { label: c, to: CRUMB_TO[c], onClick: undefined } : { ...c, to: c.to ?? (c.onClick ? undefined : CRUMB_TO[c.label]) };
  const cls = 'rounded hover:text-ink hover:underline underline-offset-4 decoration-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  return (
    <span className="flex items-center gap-2 text-[#737373] whitespace-nowrap">
      {to ? <Link to={to} className={cls}>{label}</Link> : onClick ? <button type="button" onClick={onClick} className={cls}>{label}</button> : label}
      <CaretRight size={16} strokeWidth={1.5} className="text-[#737373]" />
    </span>
  );
}
/** Amber Connect page header (Figma 3884:39809): 56px #F5F5F5 band with a bottom line; a home link and a divider, then
 *  Geist Mono uppercase crumbs (#737373) and the current page in ink. Actions keep their own variants: bordered
 *  secondaries and one blue primary. */
/* Figma 3884:39270 top bar: 56px #F5F5F5 band, 24/16 sides, 12px gap; 20px #404040 house, a 1×20 rule, then
   Geist Mono Medium 14 uppercase crumbs (#737373 parents with a 16px chevron, the page in #0A0A0A).
   `search` adds the 280px "Search anything ⌘K" field, which opens the palette. */
export function PageHeader({ title, crumbs, children, search, meta }: { icon?: Icon; title: string; crumbs?: Crumb[]; children?: ReactNode; search?: boolean; meta?: ReactNode }) {
  usePublishTitle(title);
  return (
    <div data-page-head className="h-14 shrink-0 border-b border-[#E5E5E5] bg-[#F5F5F5] flex items-center gap-3 pl-6 pr-4">
      <Link to="/" aria-label="Home" className="size-7 -mx-1 rounded-lg flex items-center justify-center text-[#404040] hover:bg-black/[0.04] shrink-0"><House size={20} strokeWidth={1.5} /></Link>
      <span aria-hidden className="w-px h-5 bg-[#E5E5E5] shrink-0" />
      <div className="flex items-center gap-2 min-w-0 font-mono uppercase text-sm leading-5 font-medium">
        {crumbs?.filter((c) => (typeof c === 'string' ? c : c.label)).map((c, i) => <CrumbLink key={i} c={c} />)}
        <CrumbTitle className="text-[#0A0A0A] truncate">{title}</CrumbTitle>
      </div>
      {meta}
      <div className="ml-auto flex items-center gap-3">
        {search && (
          <button type="button" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
            className="h-8 w-[280px] flex items-center gap-1.5 pl-2 pr-1.5 rounded-lg border border-[#E5E5E5] bg-white text-sm leading-5 text-[#737373] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:border-[#D4D4D4]">
            <MagnifyingGlass size={16} strokeWidth={1.5} className="shrink-0" /><span className="flex-1 text-left">Search anything</span>
            <kbd className="h-[22px] px-1.5 rounded border border-[#E5E5E5] text-xs leading-4 font-medium text-[#737373] flex items-center">⌘K</kbd>
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
/** Joined header filters (Figma "Button group"): one white r8 box with a #E5E5E5 edge, items split by a 1px rule. */
export function ButtonGroup({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-stretch h-8 rounded-lg border border-[#E5E5E5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden [&>*]:!h-[30px] [&>*]:!rounded-none [&>*]:!border-0 [&>*]:!shadow-none [&>*:not(:last-child)]:!border-r [&>*:not(:last-child)]:!border-[#E5E5E5] [&>*]:!text-[#404040]">
      {children}
    </div>
  );
}
/** The row under the page header: tabs on the left, search/filter/display on the right.
 *  24px below the header line, no bottom rule; sides follow the table gutter (--gx: 120px under 6 columns, 16px for 6+). */
export const toolbarCls = 'shrink-0 px-[var(--tx,16px)] pt-6 pb-2 flex items-center gap-2';
/** No visible page heading (Amber Connect has none; the breadcrumb names the page). The title stays as a screen-reader h1,
 *  and `right` becomes the toolbar row on its own. */
export function PageHeading({ title, right, className }: { title?: ReactNode; right?: ReactNode; className?: string }) {
  const t = usePageTitle();
  const h1 = <TitleH1 className="sr-only">{title ?? t}</TitleH1>;
  if (!right) return h1;
  return <div className={cx(toolbarCls, className)}>{h1}<div className="ml-auto shrink-0 flex items-center gap-2 whitespace-nowrap">{right}</div></div>;
}
/** One toolbar row: tabs on the left, search/filter/display on the right. The title is screen-reader only; `heading={false}` drops it. */
export function Toolbar({ children, right, className, heading }: { children?: ReactNode; right?: ReactNode; className?: string; heading?: ReactNode | false }) {
  const t = usePageTitle();
  return <div className={cx(toolbarCls, className)}>{heading !== false && <TitleH1 className="sr-only">{heading ?? t}</TitleH1>}{children}<div className="ml-auto min-w-0 flex items-center gap-2 whitespace-nowrap [&>label]:shrink [&>label]:min-w-[140px]">{right}</div></div>;
}
/** Mercury-style metric links above a table: a bold label, then "value label ›" links that filter the table. */
export type Metric = { label: string; value: ReactNode; tone?: 'red' | 'orange' | 'amber' | 'green'; onClick?: () => void; active?: boolean };
const metricTone = { red: 'text-[#C11F14]', orange: 'text-[#C2410C]', amber: 'text-[#9A5B00]', green: 'text-[#087A43]' } as const;
export function Metrics({ title, items, right }: { title: string; items: Metric[]; right?: ReactNode }) {
  return (
    <div className="h-10 shrink-0 px-[calc(var(--gx,16px)+var(--cx,12px))] flex items-center gap-5 text-sm whitespace-nowrap overflow-x-auto">
      <span className="font-semibold text-[#0A0A0A]">{title}</span>
      {items.map((m) => (
        <button key={m.label} type="button" onClick={m.onClick} disabled={!m.onClick} aria-pressed={m.onClick ? !!m.active : undefined}
          className={cx('group inline-flex items-center gap-1 rounded-md -mx-1 px-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-default', m.active ? 'text-[#0A0A0A] underline underline-offset-4 decoration-[#D4D4D4]' : 'text-[#404040]')}>
          <span className={cx('font-medium tabular-nums', m.tone ? metricTone[m.tone] : 'text-[#0A0A0A]')}>{m.value}</span>{m.label}
          {m.onClick && <CaretRight size={12} className="text-gray-400 group-hover:text-[#404040] transition-colors" />}
        </button>
      ))}
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}
/** Large page title + one-line description, as on the off-campus and settings screens. */
export function PageTitle({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    /* 3057:2: in-content section header, 32px side padding; 16px semibold #0A0A0A title, 14px #737373 sub. */
    <div className="px-8 pt-6 pb-5 flex items-end gap-4">
      <div className="flex-1"><h2 className="text-base leading-6 font-semibold text-[#0A0A0A]">{title}</h2>{sub && <p className="text-sm leading-5 text-[#737373] mt-1">{sub}</p>}</div>
      {children}
    </div>
  );
}
export const Page = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cx('flex-1 overflow-auto p-5', className)}>{children}</div>;
/** A card you can click: the drop deepens on hover (border stays put) and it squeezes to .99 on press. */
export const pressCard = 'transition-[box-shadow,transform] duration-150 ease-[cubic-bezier(.23,1,.32,1)] hover:shadow-[0_0_0_1px_rgba(17,24,39,0.04),0_1px_2px_rgba(17,24,39,0.12)] active:scale-[.99] dark:transition-[box-shadow,transform,background-color,border-color] dark:hover:bg-[#1F2026] dark:hover:border-[#4A4D57] motion-reduce:transition-none motion-reduce:active:scale-100';
export const Card = ({ children, className }: { children: ReactNode; className?: string }) => <UICard className={className}>{children}</UICard>;
/** Amber Connect card strip: 36px #FAFAFA band, Geist Mono uppercase label. */
export function CardHead({ title, children }: { title: ReactNode; children?: ReactNode }) {
  /* Connect section strip: 6/20 padding, #FAFAFA, Geist Mono 12 medium uppercase at 0.48px, #171717. */
  return <div className="min-h-8 px-5 py-1.5 flex items-center justify-between gap-3 border-b border-[#E5E5E5] bg-[#FAFAFA] rounded-t-2xl"><h2 className="font-mono uppercase text-xs leading-5 tracking-[0.48px] font-medium text-[#171717]">{title}</h2>{children}</div>;
}
export function Intro({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <div><h2 className="text-lg font-semibold tracking-tight">{title}</h2>{sub && <p className="text-sm text-gray-500 mt-0.5">{sub}</p>}</div>
      <div className="flex gap-2">{children}</div>
    </div>
  );
}

export function Stat({ label, value, sub, tone, icon: I }: { label: string; value: ReactNode; sub?: ReactNode; tone?: Tone; icon?: Icon }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-xs text-gray-500">{label}{I && <I size={14} />}</div>
      <div className="text-2xl font-semibold mt-2 tracking-tight">{value}</div>
      {sub && <div className={cx('text-xs mt-1', tone ? toneCls[tone].split(' ')[1] : 'text-gray-500')}>{sub}</div>}
    </Card>
  );
}

/** Number strip (Connect "Total Amount Pending" row): cells split by dashed rules; 14px grey label, 28px mono figure,
 *  and a trend line (▲/▼ in green or red when the sub starts with + or −, else grey). No colour bar. */
export type StatItem = { label: string; value: ReactNode; sub?: ReactNode; color?: string; good?: boolean };
export function StatStrip({ items, className }: { items: StatItem[]; className?: string }) {
  return (
    <div className={cx('grid rounded-xl border border-[#E5E5E5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)] py-5', className)} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((it, i) => {
        const s = typeof it.sub === 'string' ? it.sub : null;
        const dir = s && /^[+▲]/.test(s) ? 'up' : s && /^[−▼-]/.test(s) ? 'down' : null;
        const tc = (it.good ?? dir === 'up') ? '#16A34A' : '#DC2626';
        const [num, ...rest] = dir && s ? s.replace(/^[+−▲▼-]\s*/, '').split(' ') : [];
        return (
          <div key={it.label} className={cx('min-w-0 px-5 flex flex-col', i > 0 && 'border-l border-dashed border-[#E5E5E5]')}>
            <div className="text-sm leading-5 text-[#737373] truncate">{it.label}</div>
            <div className="mt-1 font-mono text-[28px] leading-9 font-semibold tracking-tight tabular-nums text-[#0A0A0A] truncate">{it.value}</div>
            <div className="mt-2 h-5 text-sm leading-5 text-[#737373] truncate">
              {dir ? <><span aria-hidden className="text-[10px] mr-1.5" style={{ color: tc }}>{dir === 'up' ? '▲' : '▼'}</span><span className="font-medium" style={{ color: tc }}>{num}</span> {rest.join(' ')}</> : it.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Bar({ value, color }: { value: number; color: string }) {
  return <div className="h-1.5 rounded-full bg-[#F5F5F5] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: color }} /></div>;
}
/* 3355:117563: green #0B8A4C, blue #2563EB, amber #F59E0B on a #F5F5F5 track. */
export const occColor = (pct: number) => (pct >= 95 ? '#0B8A4C' : pct >= 80 ? '#2563EB' : '#F59E0B');

/* Avatars (3770:15786): initials in the person's tone on a soft gradient circle, with a white top highlight and a
   20% tone ring. Named people keep fixed tones (3010:2, 3023:2); everyone else gets one from their name. */
const personColor: Record<string, string> = { 'Priya Shah': '#E5530C', 'Tom Baker': '#0E7A80', 'Aisha Khan': '#8B2CF5' };
const avatarBg = ['#0E7A80', '#8B2CF5', '#E5530C', '#0B8A4C', '#C0266D', '#1F45E0', '#C47A00', '#E0243A'];
const avatarGround: Record<string, [string, string]> = {
  '#E5530C': ['#FFF0E0', '#FFDDBA'], '#0E7A80': ['#E3F6F6', '#C8ECEC'], '#8B2CF5': ['#F1E7FF', '#E2CFFF'], '#6E3BD8': ['#F1E7FF', '#E2CFFF'],
  '#C0266D': ['#FDEDF4', '#FAD5E6'], '#0B8A4C': ['#E8F7EE', '#CDEEDB'], '#1F45E0': ['#EAF0FF', '#D3E0FF'], '#C47A00': ['#FFF6E0', '#FFE9B8'],
  '#E0243A': ['#FEEFEE', '#FCD9D9'], '#A3A3A3': ['#F5F5F5', '#E5E5E5'],
  '#2563EB': ['#EAF0FF', '#D3E0FF'], '#DB2777': ['#FDEDF4', '#FAD5E6'], '#64748B': ['#F5F5F5', '#E5E5E5'],
};
export function Avatar({ name, size = 24, color }: { name: string; size?: number; color?: string }) {
  const i = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % avatarBg.length;
  const ini = name.split(/\s+/).filter((w) => /[A-Za-z]/.test(w[0] ?? '')).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const fg = (color ?? personColor[name] ?? avatarBg[i]).toUpperCase();
  const [a, b] = avatarGround[fg] ?? ['#F5F5F5', '#E5E5E5'];
  return (
    <span data-avatar className="inline-flex items-center justify-center rounded-full font-semibold shrink-0"
      style={{ width: size, height: size, color: fg, fontSize: Math.max(10, Math.round(size * 0.4)), background: `linear-gradient(180deg, ${a}, ${b})`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.7), inset 0 0 0 1px ${fg}33` }}>{ini}</span>
  );
}

/* ---------- Filter tabs: segmented track, raised selected ---------- */
export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { id: T; label: string; count?: number }[] }) {
  /* shadcn Tabs (Radix): arrow keys move between tabs. Styled as the 2820:111 segmented track in ./shadcn/tabs.
     Nothing to split yet (every count is 0, e.g. a first login): no tabs at all, only the empty state below. */
  if (tabs.length && tabs.every((t) => t.count === 0)) return null;
  return (
    <UITabs value={value} onValueChange={(v) => onChange(v as T)}>
      <TabsList>
        {tabs.map((t) => (
          <TabsTrigger key={t.id} value={t.id}>
            {t.label}{t.count !== undefined && <span className="font-mono text-xs font-medium tabular-nums text-[#A3A3A3] group-data-[state=active]:text-[#737373]">{t.count.toLocaleString('en-GB')}</span>}
          </TabsTrigger>
        ))}
      </TabsList>
    </UITabs>
  );
}

/* ---------- Search + Filter with applied-count badge ---------- */
export function SearchInput({ value, onChange, placeholder = 'Search' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    /* 2820:111: 28px tall, 220px wide, #D4D4D4 border, 8px radius, 14px grey-400 search icon, 14px text. */
    /* Connect search: 36px, up to 320px, r8, #E5E5E5 edge; focus is a #2563EB edge plus a 1px ring of the same blue. */
    /* Connect 2.0 (3095:16041) search: 320×32, 6/6/6/8, r8, 20px #737373 icon and placeholder; focus = #2563EB edge + 1px ring. */
    <label className="h-8 w-[320px] max-w-full flex items-center gap-1.5 pl-2 pr-1.5 rounded-lg border border-[#E5E5E5] bg-white text-sm text-[#0A0A0A] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-[border-color,box-shadow] duration-150 focus-within:border-[#2563EB] focus-within:shadow-[0_0_0_1px_#2563EB]">
      <MagnifyingGlass size={20} strokeWidth={1.5} className="text-[#737373] shrink-0" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 bg-transparent outline-none placeholder:text-[#737373] min-w-0" />
      {value && <button type="button" aria-label="Clear" onClick={() => onChange('')}><X size={12} className="text-gray-400" /></button>}
    </label>
  );
}
const FILTER_TRIGGER = 'shrink-0 h-8 min-w-[96px] max-w-[280px] px-3 rounded-lg border bg-white text-sm font-medium flex items-center justify-between gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:bg-[#F5F5F5] transition-colors data-[state=open]:bg-[#F5F5F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
/** Amber Connect multi-select filter (its Status dropdown): a 34px bordered trigger reading "Status" or "Status (2)";
 *  a 200px popover of checkbox rows (16px sides, 10px tall padding), each option a plain label or a tinted chip
 *  (13px medium, 2/8 padding, r6, the tone at 10%); a rule, then Clear and Apply side by side. Picks stay a draft until Apply. */
export function MultiFilter({ label, options, value, onChange, width = 200 }: {
  label: string; options: { value: string; label?: string; tone?: Tone }[]; value: string[]; onChange: (v: string[]) => void; width?: number;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(value);
  useEffect(() => { if (open) setDraft(value); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const on = value.length > 0;
  const toggle = (v: string) => setDraft((d) => (d.includes(v) ? d.filter((x) => x !== v) : [...d, v]));
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cx(FILTER_TRIGGER, on ? 'border-[#2563EB] text-[#2563EB]' : 'border-[#E5E5E5] text-[#404040]')}>
          <span>{label}{on && ` (${value.length})`}</span><CaretDown size={20} strokeWidth={1.5} className="text-[#737373]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="p-0 overflow-hidden" style={{ width }}>
        <div className="max-h-[240px] overflow-y-auto py-1">
          {options.map((o) => (
            <label key={o.value} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#F5F5F5] transition-colors">
              <Checkbox checked={draft.includes(o.value)} onCheckedChange={() => toggle(o.value)} />
              {o.tone
                ? <span className={cx('inline-flex items-center px-2 py-0.5 rounded-md text-[13px] leading-5 font-medium whitespace-nowrap', toneCls[o.tone])}>{o.label ?? o.value}</span>
                : <span className="text-sm text-[#0A0A0A]">{o.label ?? o.value}</span>}
            </label>
          ))}
        </div>
        <div className="flex gap-2 p-3 border-t border-[#E5E5E5]">
          <UIButton variant="outline" size="sm" className="flex-1 h-8" onClick={() => { onChange([]); setOpen(false); }}>Clear</UIButton>
          <UIButton size="sm" className="flex-1 h-8" onClick={() => { onChange(draft); setOpen(false); }}>Apply</UIButton>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type SelectOption = { value: string; label?: string; tone?: Tone; meta?: ReactNode };
/** Amber Connect single-choice dropdown: MultiFilter's 34px trigger and 16/10 popover rows, a blue check on the chosen row;
 *  a pick applies straight away (one choice needs no Apply). With `label` it is a filter: an "All" row clears it, and the
 *  trigger turns blue and reads the choice. Without `label` it is a picker (hall, block, year) and shows its value. */
export function SelectFilter({ label, icon: I, value, options, onChange, width = 220, suffix }: {
  label?: string; icon?: Icon; value: string; options: SelectOption[]; onChange: (v: string) => void; width?: number; suffix?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const sel = options.find((o) => o.value === value);
  const on = !!label && !!sel;
  const row = (v: string, body: ReactNode, chosen: boolean) => (
    <button key={v || '_all'} type="button" role="menuitemradio" aria-checked={chosen} onClick={() => { onChange(v); setOpen(false); }}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-[#F5F5F5] focus-visible:bg-[#F5F5F5] outline-none transition-colors">
      <span className="flex-1 min-w-0 flex items-center gap-2">{body}</span>
      {chosen && <CheckIcon size={16} className="text-[#2563EB] shrink-0" />}
    </button>
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={label ? `${label}: ${sel ? sel.label ?? sel.value : 'All'}` : undefined} className={cx(FILTER_TRIGGER, on ? 'border-[#2563EB] text-[#2563EB]' : 'border-[#E5E5E5] text-[#404040]')}>
          <span className="flex items-center gap-2 min-w-0">
            {I && <I size={16} strokeWidth={1.5} className="shrink-0" />}
            {/* A set filter reads as its value in blue (as Connect's "Status (1)" stays short); the field name is in the aria-label. */}
            <span className="truncate">{sel ? sel.label ?? sel.value : label ?? value}</span>{suffix}
          </span>
          <CaretDown size={20} strokeWidth={1.5} className="text-[#737373] shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align={label ? 'end' : 'start'} className="p-0 overflow-hidden" style={{ width }}>
        <div role="menu" aria-label={label} className="max-h-[280px] overflow-y-auto py-1">
          {label && row('', <span className="text-sm text-[#0A0A0A]">All</span>, !sel)}
          {options.map((o) => row(o.value, <>
            {o.tone
              ? <span className={cx('inline-flex items-center px-2 py-0.5 rounded-md text-[13px] leading-5 font-medium whitespace-nowrap', toneCls[o.tone])}>{o.label ?? o.value}</span>
              : <span className="text-sm text-[#0A0A0A] truncate">{o.label ?? o.value}</span>}
            {o.meta != null && <span className="ml-auto font-mono text-xs text-[#737373] tabular-nums">{o.meta}</span>}
          </>, o.value === value))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** The list-filter icon with the applied dot on its top-right corner (3755:15832). */
export function FilterIcon({ on, size = 14, icon: I = FunnelSimple }: { on: boolean; size?: number; icon?: Icon }) {
  return (
    <span className="relative inline-flex shrink-0">
      <I size={size} className="text-gray-700" />
      {on && <span aria-hidden className="absolute -top-[2px] -right-[2px] size-1.5 rounded-full bg-[#2B5CFF] ring-[1.5px] ring-white" />}
    </span>
  );
}
/** Option pill (3778:15786 / 3778:15796): white with a gradient edge and a faint 1px shadow; selected is #EFF6FF,
 *  a blue gradient edge and blue-600 text. Not the button look: no gradient fill. */
export const optionPill = (on: boolean) => cx(
  'h-7 px-3 rounded-full border border-transparent text-sm font-medium shadow-[0_1px_1px_rgba(17,24,39,0.03)] transition-[background,color,transform] duration-150 ease-snappy active:scale-[0.97]',
  on ? 'text-[#2563EB] [background:linear-gradient(#EFF6FF,#EFF6FF)_padding-box,linear-gradient(180deg,#DBEAFE,#93C5FD)_border-box]'
    : 'text-[#404040] [background:linear-gradient(#FFFFFF,#FFFFFF)_padding-box,linear-gradient(180deg,#F7F8FA,#D3D7DE)_border-box] hover:[background:linear-gradient(#FAFAFA,#FAFAFA)_padding-box,linear-gradient(180deg,#F1F2F5,#C9CED7)_border-box]');
/** chips: show the options as toggle chips instead of a dropdown (short lists such as Priority). */
export type FilterDef = { id: string; label: string; options: string[]; chips?: boolean };
/** One Connect dropdown per field (as Connect's Status filter), each a single choice that applies straight away. */
export function FilterButton({ defs, value, onChange }: { defs: FilterDef[]; value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  return <>{defs.map((d) => <SelectFilter key={d.id} label={d.label} value={value[d.id] ?? ''} options={d.options.map((o) => ({ value: o }))} onChange={(v) => onChange({ ...value, [d.id]: v })} />)}</>;
}

/* ---------- Table: inset rows, end-to-end footer bar with summary + pager ---------- */
/** Empty cells read as a quiet grey dash, as Mercury's tables do. */
const muteDash = (v: ReactNode) => (v === '—' ? <span className="text-[#A3A3A3]">—</span> : v);
const PAGER_STEP = 'h-7 px-1.5 rounded-lg inline-flex items-center gap-1 text-sm font-medium text-[#0A0A0A] hover:bg-[#F5F5F5] disabled:text-[#A3A3A3] disabled:pointer-events-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
/** Connect pager pages: all of them up to 5, otherwise 1 2 3 … last (or first … around the current … last). */
const pageList = (n: number, cur: number): (number | '…')[] => {
  if (n <= 5) return Array.from({ length: n }, (_, i) => i);
  if (cur < 3) return [0, 1, 2, '…', n - 1];
  if (cur > n - 4) return [0, '…', n - 3, n - 2, n - 1];
  return [0, '…', cur, '…', n - 1];
};
export type Col<T> = { key: string; label: ReactNode; render: (r: T) => ReactNode; className?: string };
export function Table<T extends { id: string }>({ cols, rows, onRow, empty, pageSize = 50, selected, summary, card, footerRight, footer: showFooter = true, paginate = true, fill, sort, group }: {
  cols: Col<T>[]; rows: T[]; onRow?: (r: T) => void; empty?: ReactNode; pageSize?: number; selected?: string;
  /** Footer text on the left, e.g. "7 properties · 2,749 units". Defaults to "N rows". */ summary?: ReactNode;
  /** Render inside a bordered card instead of full-bleed. */ card?: boolean; footerRight?: ReactNode;
  /** false hides the footer (settings card tables, 3057:2 / 3058:2, have none). It still shows when there is more than one page, with only the range and the ‹ › pager. */ footer?: boolean;
  /** false shows every row and drops the pager; the footer keeps only the summary. */ paginate?: boolean;
  /** Fill mode: rows run edge to edge (no side gutter). Default: on for 6+ columns. The whole screen follows it (see styles.css). */ fill?: boolean;
  /** Mercury-style sorted column: the header goes ink with a 12px arrow; with onToggle it flips the order. */ sort?: { key: string; dir: 'asc' | 'desc'; onToggle?: () => void };
  /** Mercury-style leading date column: the day shows on the first row of each run, blank below it; row lines inside a run start after the date column, a full line closes the run. */ group?: { label: string; get: (r: T) => string; className?: string };
}) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [rows.length]);
  const pages = paginate ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  const shown = paginate ? rows.slice(page * pageSize, page * pageSize + pageSize) : rows;
  const { items, bodyRef } = useRowMotion(shown);
  /* Stepping with the sheet chevrons can cross a page boundary: follow the selected row to its page. */
  useEffect(() => { if (!paginate || selected == null) return; const i = rows.findIndex((r) => r.id === selected); if (i >= 0) setPage(Math.floor(i / pageSize)); }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!rows.length) return <div className={cx(!card && 'flex-1 p-5')}>{empty ?? <Empty title="Nothing here" sub="Try a different tab or clear the filters." />}</div>;
  const table = (
    /* 2820:111: 36px header, 12px medium #737373, #E5E5E5 rule; 40px rows, 14px, #F5F5F5 rules; 20px outer padding. */
    <UITable className="text-[#0A0A0A]">
      <TableHeader className="sticky top-0 z-[1]"><TableRow>{group && <TableHead className={cx(card ? 'pl-5' : 'pl-[var(--cx,12px)]', 'w-[120px]', group.className)}>{group.label}</TableHead>}{cols.map((c, i) => <TableHead key={c.key} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined} className={cx(i === 0 && !group && (card ? 'pl-5' : 'pl-[var(--cx,12px)]'), i === cols.length - 1 && (card ? 'pr-5' : 'pr-[var(--cx,12px)]'), c.className)}>{sort?.key === c.key ? (
        <button type="button" disabled={!sort.onToggle} onClick={sort.onToggle} className="relative inline-flex items-center gap-1 text-[#0A0A0A] font-medium disabled:cursor-default after:absolute after:-inset-y-1 after:-inset-x-1 after:content-['']">{c.label}{sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</button>
      ) : c.label}</TableHead>)}</TableRow></TableHeader>
      <TableBody ref={bodyRef}>
        {items.map(({ row: r, motion }, ri) => (
          <TableRow key={r.id} {...rowAttrs(r.id, motion)} onClick={() => onRow?.(r)} aria-selected={selected === r.id || undefined} data-state={selected === r.id ? 'selected' : undefined} className={cx(onRow && 'cursor-pointer hover:bg-subtle data-[state=selected]:hover:bg-[#EFF6FF]', (group || ri === items.length - 1) && 'border-b-0')}>
            {group && <TableCell className={cx(card ? 'pl-5' : 'pl-[var(--cx,12px)]', 'text-[#737373] whitespace-nowrap border-b', ri === items.length - 1 || group.get(items[ri + 1].row) === group.get(r) ? 'border-transparent' : 'border-[#F5F5F5]', group.className)}>{ri === 0 || group.get(items[ri - 1].row) !== group.get(r) ? group.get(r) : null}</TableCell>}
            {cols.map((c, i) => <TableCell key={c.key} className={cx(i === 0 && !group && (card ? 'pl-5' : 'pl-[var(--cx,12px)]'), i === cols.length - 1 && (card ? 'pr-5' : 'pr-[var(--cx,12px)]'), i === cols.length - 1 && c.label === '' && 'row-act', group && ri < items.length - 1 && 'border-b border-[#F5F5F5]', c.className)}>{muteDash(c.render(r))}</TableCell>)}
          </TableRow>
        ))}
      </TableBody>
    </UITable>
  );
  const footer = (
    /* Connect footer: #E5E5E5 top rule, 24px sides, 14px #737373 "Showing 10 of 25 entries" on the left;
       "‹ Previous · 1 2 3 … · Next ›" on the right, the current page a 28px blue-tinted square. */
    <div data-foot className={cx('shrink-0 px-6 flex items-center gap-2 border-t border-line text-sm text-[#737373] bg-white', card ? 'h-12' : 'h-[59px]')}>
      <span>{showFooter && summary ? summary : `Showing ${shown.length} of ${rows.length} entries`}</span>
      <div className="ml-auto flex items-center gap-1.5">
        {footerRight}
        {pages > 1 && <nav aria-label="Pages" className="flex items-center gap-1">
          <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className={cx(PAGER_STEP, 'mr-1')}><CaretLeft size={16} strokeWidth={1.75} />Previous</button>
          {pageList(pages, page).map((p, i) => p === '…'
            ? <span key={`e${i}`} className="w-5 text-center text-[#0A0A0A]">…</span>
            : <button key={p} type="button" aria-current={p === page ? 'page' : undefined} onClick={() => setPage(p)}
                className={cx('size-7 rounded-lg text-sm font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', p === page ? 'bg-[#EDF3FF] border border-[#1A6CF8] text-[#1A6CF8]' : 'text-[#0A0A0A] hover:bg-[#F5F5F5]')}>{p + 1}</button>)}
          <button type="button" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className={cx(PAGER_STEP, 'ml-1')}>Next<CaretRight size={16} strokeWidth={1.75} /></button>
        </nav>}
      </div>
    </div>
  );
  /* Connect logic: the footer always shows the count; the pager only when there is more than one page; footer={false} hides it unless there is more than one page. */
  const foot = showFooter || pages > 1 ? footer : null;
  if (card) return <Card className="overflow-hidden">{table}{foot}</Card>;
  /* Inset Mercury-style: the rows sit inside the --gx gutter (set on <main> from data-gx); the footer stays end to end. */
  return <div {...((fill ?? cols.length >= 6) ? { 'data-fill': '' } : { 'data-inset': '' })} className="flex-1 min-h-0 flex flex-col"><div data-scroller className="flex-1 overflow-auto px-[var(--gx,16px)]">{table}</div>{foot}</div>;
}

/* ---------- Empty state ---------- */
/** Centred empty state, no card (3103:2): 14px semibold title, 14px #737373 sub up to 440px, actions 16px below. */
export function Empty({ title, sub, icon: I = MagnifyingGlass, action, art }: { title: string; sub?: string; icon?: Icon; action?: ReactNode; /** A Figma empty-state illustration in place of the icon tile. */ art?: Illo }) {
  return (
    <div className="py-14 flex flex-col items-center text-center">
      {art ? <Illustration name={art} className="block w-[203px] h-[160px] mb-5" /> : <div className="size-16 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mb-4"><I size={28} weight="duotone" className="text-[#3B82F6]" /></div>}
      <div className="text-sm font-semibold text-[#0A0A0A]">{title}</div>
      {sub && <div className="text-sm leading-5 text-[#737373] mt-1 max-w-[440px]">{sub}</div>}
      {action && <div className="mt-4 flex gap-2">{action}</div>}
    </div>
  );
}

/* ---------- Alert note: white ground, tone border, coloured title ---------- */
/** 3056:2 / 3031:2: white ground, 8px radius, tone border at 30–35%, 16px outline icon, 14px medium tone title, 12px #737373 sub.
 *  `grey` is the neutral info box (2825:897): #FAFAFA ground, #E5E5E5 border, #404040 title. */
export function Note({ tone = 'amber', title, children, icon: I }: { tone?: 'amber' | 'red' | 'blue' | 'green' | 'grey'; title: string; children?: ReactNode; icon?: Icon }) {
  const c = { amber: ['#A16207', '#A16207', '#A1620759'], red: ['#E0243A', '#E0243A', '#E0243A4D'], blue: ['#2563EB', '#2563EB', '#2563EB4D'], green: ['#0B8A4C', '#0B8A4C', '#0B8A4C4D'], grey: ['#737373', '#404040', '#E5E5E5'] }[tone];
  return (
    <div className={cx('rounded-lg border px-3 py-2.5 flex items-center gap-2.5', tone === 'grey' ? 'bg-[#FAFAFA]' : 'bg-white')} style={{ borderColor: c[2] }}>
      {I && <I size={16} weight="regular" style={{ color: c[0] }} className="shrink-0" />}
      <div className="min-w-0"><div className="text-sm leading-5 font-medium" style={{ color: c[1] }}>{title}</div>{children && <div className="text-xs leading-4 text-[#737373]">{children}</div>}</div>
    </div>
  );
}

/* ---------- Form controls ---------- */
/** 3054:2: 14px medium #0A0A0A label, 6px gap, 32px control; hint 12px #737373. */
export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  /* An error replaces the hint, in red, under the field it belongs to. */
  return <Label className="block"><span className="block text-sm leading-5 font-medium text-[#0A0A0A] mb-1.5">{label}</span>{children}{error ? <span role="alert" className="block text-xs leading-4 font-normal text-[#C11F14] mt-1.5">{error}</span> : hint && <span className="block text-xs leading-4 font-normal text-[#737373] mt-1.5">{hint}</span>}</Label>;
}
/* shadcn Input / Textarea / NativeSelect, styled in ./shadcn. */
export const Input = (p: React.ComponentProps<typeof UIInput>) => <UIInput {...p} />;
/* ---------- Dropdown: our own menu in place of the browser's native <select> list ---------- */
export type DropdownOption = { value: string; label: ReactNode; disabled?: boolean };
export function Dropdown({ value, onChange, options, icon: I, className, ariaLabel, id, disabled, placeholder }: {
  value: string; onChange: (v: string) => void; options: DropdownOption[]; icon?: Icon; className?: string; ariaLabel?: string; id?: string; disabled?: boolean; placeholder?: string;
}) {
  const sel = options.find((o) => o.value === value);
  return (
    <DropdownMenu modal={false}>
      {/* Same box as the old select: 32px, #D4D4D4 border, 8px radius, chevrons-up-down at the right. */}
      <DropdownMenuTrigger id={id} aria-label={ariaLabel} disabled={disabled}
        className={cx('h-data w-full min-w-0 flex items-center gap-2 rounded-lg border border-input bg-background pl-2.5 pr-2 text-sm text-[#0A0A0A] text-left outline-none transition-[border-color,box-shadow] duration-150',
          'hover:bg-gray-50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/25 disabled:opacity-50 disabled:cursor-not-allowed', className)}>
        {I && <I size={14} className="text-[#737373] shrink-0" />}
        <span className={cx('flex-1 min-w-0 truncate', !sel && 'text-gray-400')}>{sel ? sel.label : placeholder ?? 'Select'}</span>
        <ChevronsUpDown size={14} className="text-gray-400 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-72">
        {options.map((o) => (
          <DropdownMenuItem key={o.value} disabled={o.disabled} onSelect={() => onChange(o.value)}
            className={cx('justify-between gap-3 [&>svg]:text-primary', o.value === value && 'font-medium')}>
            <span className="truncate">{o.label}</span>{o.value === value && <CheckIcon size={14} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
function readOptions(children: ReactNode): DropdownOption[] {
  const out: DropdownOption[] = [];
  Children.forEach(children, (c) => {
    if (!isValidElement(c)) return;
    const p = c.props as { value?: string | number; children?: ReactNode; disabled?: boolean };
    if (c.type === Fragment) out.push(...readOptions(p.children));
    else if (c.type === 'option') out.push({ value: p.value != null ? String(p.value) : Children.toArray(p.children).join(''), label: p.children, disabled: p.disabled });
  });
  return out;
}
/** Drop-in for <select>: same props and <option> children, rendered as our Dropdown. onChange gets { target: { value } }. */
export function Select({ value, defaultValue, onChange, children, className, disabled, id, 'aria-label': ariaLabel }: React.ComponentProps<'select'>) {
  const options = readOptions(children);
  const [inner, setInner] = useState(String(defaultValue ?? options[0]?.value ?? ''));
  const cur = value != null ? String(value) : inner;
  return (
    <Dropdown value={cur} options={options} className={className} disabled={disabled} id={id} ariaLabel={ariaLabel}
      onChange={(v) => { if (value == null) setInner(v); onChange?.({ target: { value: v }, currentTarget: { value: v } } as unknown as React.ChangeEvent<HTMLSelectElement>); }} />
  );
}
export const Textarea = (p: React.ComponentProps<'textarea'>) => <UITextarea {...p} />;
/** 3056:2: 32×18 track, 14px knob, green #0B8A4C on, #D4D4D4 off. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return <UISwitch checked={checked} onCheckedChange={onChange} aria-label={label} />;
}
/** 20px box; checked #2563EB with a white tick, unchecked white with the --input border. */
export function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Label className="inline-flex items-center gap-2 text-sm font-normal text-gray-700 cursor-pointer select-none">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      {label}
    </Label>
  );
}

/* ---------- Side sheet and dialog: shadcn Sheet / Dialog (Radix), styled in ./shadcn ---------- */
/* Radix wants a description or an explicit `aria-describedby={undefined}` when there is none. */
const noDesc = (sub: ReactNode) => (sub ? {} : { 'aria-describedby': undefined });
/** 2824:497: 8px inset, 12px radius; 56px header (14px semibold title, 28px close; no icon since 2026-11-09, `icon` is ignored), 20px body, 64px footer. */
/** Prev/next through the list a sheet was opened from. `undefined` ends disable that chevron. */
export type SheetNav = { prev?: () => void; next?: () => void; pos?: string };
/** Builds a SheetNav from the visible rows: `isCur` finds the open row, `go` opens another. */
export function listNav<T>(rows: readonly T[], isCur: (r: T) => boolean, go: (r: T) => void): SheetNav | undefined {
  const i = rows.findIndex(isCur);
  if (i < 0 || rows.length < 2) return undefined;
  return { prev: i > 0 ? () => go(rows[i - 1]) : undefined, next: i < rows.length - 1 ? () => go(rows[i + 1]) : undefined, pos: `${i + 1} of ${rows.length}` };
}
const navBtn = 'size-7 rounded-lg border border-[#E5E5E5] bg-white text-[#0A0A0A] shadow-[0_1px_2px_rgba(17,24,39,0.05)] hover:bg-subtle disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-[background-color,transform] duration-150 ease-snappy active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
/** The list row of the open record, outside the sheet: a table row, a list option, or a queue row. */
const SELECTED_ROW = '[data-state="selected"], [aria-selected="true"], [data-selected]';
/** Step to another record, then bring its (now highlighted) row into view in the list behind the sheet. */
function step(go: () => void) {
  sheetStep.at = Date.now();
  go();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const row = [...document.querySelectorAll<HTMLElement>(SELECTED_ROW)].find((el) => !el.closest('[role=dialog]'));
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }));
}
/** Header chevrons (Connect drawer: two 30px bordered buttons before the title): ↑/↓ or K/J step through the list without closing the sheet. */
export function SheetNavButtons({ nav }: { nav?: SheetNav }) {
  useEffect(() => {
    if (!nav) return;
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) return;
      const f = e.key === 'ArrowUp' || e.key === 'k' ? nav.prev : e.key === 'ArrowDown' || e.key === 'j' ? nav.next : undefined;
      if (f) { e.preventDefault(); step(f); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [nav]);
  if (!nav) return null;
  return (
    <div className="flex items-center gap-3 shrink-0">
      <button type="button" className={navBtn} onClick={() => nav.prev && step(nav.prev)} disabled={!nav.prev} aria-label={nav.pos ? `Previous (${nav.pos})` : 'Previous'} title="Previous (↑)"><CaretLeft size={16} strokeWidth={1.75} /></button>
      <button type="button" className={navBtn} onClick={() => nav.next && step(nav.next)} disabled={!nav.next} aria-label={nav.pos ? `Next (${nav.pos})` : 'Next'} title="Next (↓)"><CaretRight size={16} strokeWidth={1.75} /></button>
    </div>
  );
}
/* When a sheet closes on a click, the second click of a double click would land on whatever is
   behind it (a row, a link). A clear layer eats clicks for a moment after the close. */
function shieldClicks(ms = 350) {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;z-index:2147483647';
  document.body.appendChild(d);
  setTimeout(() => d.remove(), ms);
}
export function Sheet({ open, onClose, title, sub, children, footer, width = 520, nav }: { open: boolean; onClose: () => void; title: ReactNode; sub?: ReactNode; icon?: Icon; children: ReactNode; footer?: ReactNode; width?: number; nav?: SheetNav }) {
  useEffect(() => { if (!open) return; return () => shieldClicks(); }, [open]);
  return (
    <UISheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent style={{ width }} {...noDesc(sub)}>
        <SheetHeader>
          <SheetNavButtons nav={nav} />
          <div className="min-w-0 flex-1"><SheetTitle>{title}</SheetTitle>{sub && <SheetDescription>{sub}</SheetDescription>}</div>
        </SheetHeader>
        <SheetBody>{children}</SheetBody>
        {footer && <SheetFooter>{footer}</SheetFooter>}
      </SheetContent>
    </UISheet>
  );
}
/** 3032:2 / 2825:897: 16px semibold title, optional 14px #737373 `sub`; 64px #FAFAFA footer.
 *  Modals carry no header icon (2026-11-07); `icon` and `tone` are accepted for old call sites and ignored. */
export function Dialog({ open, onClose, title, sub, children, footer, width = 480 }: { open: boolean; onClose: () => void; title: string; sub?: ReactNode; icon?: Icon; tone?: Tone; children: ReactNode; footer?: ReactNode; width?: number }) {
  return (
    <UIDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ maxWidth: width }} {...noDesc(sub)}>
        <DialogFrame title={title} sub={sub} footer={footer}>{children}</DialogFrame>
      </DialogContent>
    </UIDialog>
  );
}

/* Mercury-style detail sheet body (2026-11-09): a hero (avatar, 20px Medium name, grey meta, chips), then titled
   sections split by a 1px #F5F5F5 rule. Section rows: 12px-gap grid, grey label column, ink value. */
/** `action`: a secondary action that sits top-right of the hero, keeping the footer to its main choices. */
export function SheetHero({ name, meta, avatar = true, action, children }: { name: ReactNode; meta?: ReactNode; avatar?: boolean; action?: ReactNode; children?: ReactNode }) {
  return (
    <div className="pb-5">
      <div className="flex items-center gap-3">
        {avatar && typeof name === 'string' && <Avatar name={name} size={40} />}
        <div className="min-w-0 flex-1">
          <div className="text-xl font-medium text-ink leading-7 [overflow-wrap:anywhere]">{name}</div>
          {meta && <div className="text-sm text-gray-500 leading-5 truncate">{meta}</div>}
        </div>
        {action && <div className="shrink-0 self-start">{action}</div>}
      </div>
      {children && <div className="mt-4 flex items-center gap-2 flex-wrap">{children}</div>}
    </div>
  );
}
/** Connect drawer section: a full-width #FAFAFA strip with the Geist Mono uppercase title, then a 20px body over a #E5E5E5 rule. */
export function SheetSection({ title, rows, children }: { title: string; rows?: [string, ReactNode][]; children?: ReactNode }) {
  return (
    <section className="-mx-5 first:-mt-5 last:-mb-5">
      <h3 className="h-9 px-5 flex items-center bg-[#FAFAFA] font-mono text-xs leading-4 font-medium uppercase tracking-[0.48px] text-[#171717]">{title}</h3>
      <div className="p-5">
        {rows && <DL rows={rows} />}
        {children && <div className={rows ? 'mt-4' : undefined}>{children}</div>}
      </div>
    </section>
  );
}

/** Connect key/value rows: label left in ink, value right in medium #737373 (numbers and dates in Geist Mono), 16px apart. */
export function DL({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="flex flex-col gap-4 text-sm leading-5">
      {rows.map(([k, v]) => <div key={k} className="flex items-start justify-between gap-4"><dt className="shrink-0 text-[#0A0A0A]">{k}</dt><dd className="min-w-0 text-right font-medium text-[#737373] break-words">{monoize(muteDash(v))}</dd></div>)}
    </dl>
  );
}

export const fmtDate = (d: string) => new Date(d + (d.length === 10 ? 'T00:00:00Z' : '')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
export const gbp = (n: number) => `£${n.toLocaleString('en-GB')}`;
