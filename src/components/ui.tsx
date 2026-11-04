import { Children, Fragment, isValidElement, useEffect, useState, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { Button as UIButton, type ButtonProps as UIButtonProps } from './shadcn/button';
import { Badge } from './shadcn/badge';
import { Card as UICard } from './shadcn/card';
import { Tabs as UITabs, TabsList, TabsTrigger } from './shadcn/tabs';
import { Popover, PopoverContent, PopoverTrigger } from './shadcn/popover';
import { Table as UITable, TableBody, TableCell, TableHead, TableHeader, TableRow } from './shadcn/table';
import { Input as UIInput } from './shadcn/input';
import { Textarea as UITextarea } from './shadcn/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './shadcn/dropdown-menu';
import { Label } from './shadcn/label';
import { Switch as UISwitch } from './shadcn/switch';
import { Checkbox } from './shadcn/checkbox';
import { Sheet as UISheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from './shadcn/sheet';
import { Dialog as UIDialog, DialogBody, DialogCloseButton, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './shadcn/dialog';
import { toneCls, toneDot } from './tones';
import { rowAttrs, useRowMotion } from './rowMotion';
import { CaretLeft, CaretRight, Check as CheckIcon, ChevronsUpDown, CheckCircle, FunnelSimple, MagnifyingGlass, MinusCircle, RadioButton, Clock, WarningCircle, XCircle, PencilSimple, type Icon } from './icons';
import { X } from './icons';
export { toneCls, toneDot, toneLine } from './tones';
import type { Tone } from '../data/seed';
export type { Tone };

export const cx = clsx;

/* ---------- Buttons ---------- */
/* shadcn Button (./shadcn/button) under the prototype's names: `secondary` is shadcn `outline`, `danger` is `destructive`.
   Adds a leading 16px `icon`, and `type="button"` by default so a button inside a form doesn't submit it. */
type BtnProps = Omit<UIButtonProps, 'variant' | 'size'> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'danger-outline'; size?: 'sm' | 'md'; icon?: Icon };
const btnVariant = { primary: 'default', secondary: 'outline', ghost: 'ghost', danger: 'destructive', success: 'success', 'danger-outline': 'destructive-outline' } as const;
export function Button({ variant = 'secondary', size = 'md', icon: I, children, type = 'button', ...p }: BtnProps) {
  const solid = variant === 'primary' || variant === 'danger' || variant === 'success';
  return (
    <UIButton type={type} variant={btnVariant[variant]} size={size === 'sm' ? 'sm' : 'default'} {...p}>
      {I && <I size={16} weight="regular" className={cx('shrink-0', !solid && variant !== 'danger-outline' && 'text-gray-700')} />}
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
  Urgent: 'red', High: 'orange', Normal: 'grey', Pending: 'amber', Approved: 'green', Rejected: 'red', Draft: 'grey', Scheduled: 'blue',
  Published: 'green', Inactive: 'grey', Replied: 'green', Closed: 'grey', Occupied: 'blue', Available: 'green', Held: 'amber', Maintenance: 'red', Upcoming: 'purple',
};
Object.assign(statusTone, { Active: 'green', Submitted: 'blue', 'Awaiting info': 'amber', Suspended: 'red', Live: 'green', Allocated: 'green', Lapsed: 'grey', 'Lease sent': 'blue', Conflict: 'red', Overdue: 'red', Paused: 'amber' } satisfies Record<string, Tone>);
const statusIcon: Record<Tone, Icon> = { green: CheckCircle, blue: RadioButton, amber: Clock, orange: Clock, red: WarningCircle, purple: RadioButton, grey: MinusCircle };
/** Status pill with the leading icon the designs use (✓ Active, ◉ Submitted, ⊖ Inactive…). Pass `tone`/`icon` to override. */
export const Status = ({ s, tone, icon }: { s: string; tone?: Tone; icon?: Icon }) => {
  const t = tone ?? statusTone[s] ?? 'grey';
  const I = icon ?? (s === 'Rejected' || s === 'Declined' || s === 'Cancelled' ? XCircle : s === 'Draft' ? PencilSimple : statusIcon[t]);
  /* Status pills are fully round (2820:111 "Active", 2825:897 "Inactive"). */
  return (
    <Badge tone={t} look="status">
      <I size={12} weight="regular" className="shrink-0" />{s}
    </Badge>
  );
};

/* ---------- Layout ---------- */
/** 52px header (2820:111): 16px grey-500 icon, 14px #646A78 crumbs with 12px grey-400 chevrons, 14px semibold title. */
export function PageHeader({ icon: I, title, crumbs, children }: { icon?: Icon; title: string; crumbs?: string[]; children?: ReactNode }) {
  return (
    <div className="h-[52px] shrink-0 border-b border-line flex items-center gap-3 px-5">
      {I && <I size={16} className="text-gray-500 shrink-0" />}
      <div className="flex items-center gap-1.5 min-w-0 text-sm leading-5">
        {crumbs?.map((c) => (
          <span key={c} className="flex items-center gap-1.5 text-[#646A78] whitespace-nowrap">{c}<CaretRight size={12} className="text-gray-400" /></span>
        ))}
        <h1 className="font-semibold text-[#111827] truncate">{title}</h1>
      </div>
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  );
}
/** The row under the page header: tabs on the left, search/filter/display on the right. 16px sides, #F3F4F6 rule. */
export function Toolbar({ children, right, className }: { children?: ReactNode; right?: ReactNode; className?: string }) {
  return <div className={cx('h-14 shrink-0 px-4 flex items-center gap-2 border-b border-[#F3F4F6]', className)}>{children}<div className="ml-auto flex items-center gap-2">{right}</div></div>;
}
/** Large page title + one-line description, as on the off-campus and settings screens. */
export function PageTitle({ title, sub, children }: { title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    /* 3057:2: in-content section header, 32px side padding; 16px semibold #111827 title, 14px #646A78 sub. */
    <div className="px-8 pt-6 pb-5 flex items-end gap-4">
      <div className="flex-1"><h2 className="text-base leading-6 font-semibold text-[#111827]">{title}</h2>{sub && <p className="text-sm leading-5 text-[#646A78] mt-1">{sub}</p>}</div>
      {children}
    </div>
  );
}
export const Page = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cx('flex-1 overflow-auto p-5', className)}>{children}</div>;
/** A card you can click: the drop deepens on hover (border stays put) and it squeezes to .99 on press. */
export const pressCard = 'transition-[box-shadow,transform] duration-150 ease-[cubic-bezier(.23,1,.32,1)] hover:shadow-[0_0_0_1px_rgba(17,24,39,0.04),0_1px_2px_rgba(17,24,39,0.12)] active:scale-[.99] dark:transition-[box-shadow,transform,background-color,border-color] dark:hover:bg-[#1F2026] dark:hover:border-[#4A4D57] motion-reduce:transition-none motion-reduce:active:scale-100';
export const Card = ({ children, className }: { children: ReactNode; className?: string }) => <UICard className={className}>{children}</UICard>;
export function CardHead({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return <div className="h-12 px-4 flex items-center justify-between border-b border-line"><h2 className="text-sm font-semibold">{title}</h2>{children}</div>;
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

export function Bar({ value, color }: { value: number; color: string }) {
  return <div className="h-1.5 rounded-full bg-[#F3F4F6] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: color }} /></div>;
}
/* 3355:117563: green #0B8A4C, blue #2563EB, amber #F59E0B on a #F3F4F6 track. */
export const occColor = (pct: number) => (pct >= 95 ? '#0B8A4C' : pct >= 80 ? '#2563EB' : '#F59E0B');

/* Figma gives named people fixed colours (3010:2, 3023:2); everyone else gets one from their name. */
const personColor: Record<string, string> = { 'Priya Shah': '#E5530C', 'Tom Baker': '#0E7A80', 'Aisha Khan': '#6E3BD8' };
const avatarBg = ['#0E7A80', '#6E3BD8', '#E5530C', '#0B8A4C', '#C0266D', '#1F45E0', '#C47A00', '#E0243A'];
export function Avatar({ name, size = 24, color }: { name: string; size?: number; color?: string }) {
  const i = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % avatarBg.length;
  const ini = name.split(/\s+/).filter((w) => /[A-Za-z]/.test(w[0] ?? '')).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return <span className="inline-flex items-center justify-center rounded-full text-white font-semibold shrink-0" style={{ width: size, height: size, background: color ?? personColor[name] ?? avatarBg[i], fontSize: size * 0.39 }}>{ini}</span>;
}

/* ---------- Filter tabs: segmented track, raised selected ---------- */
export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { id: T; label: string; count?: number }[] }) {
  /* shadcn Tabs (Radix): arrow keys move between tabs. Styled as the 2820:111 segmented track in ./shadcn/tabs. */
  return (
    <UITabs value={value} onValueChange={(v) => onChange(v as T)}>
      <TabsList>
        {tabs.map((t) => (
          <TabsTrigger key={t.id} value={t.id}>
            {t.label}{t.count !== undefined && <span className="text-xs font-medium text-gray-400 group-data-[state=active]:text-[#2B5CFF]">{t.count.toLocaleString('en-GB')}</span>}
          </TabsTrigger>
        ))}
      </TabsList>
    </UITabs>
  );
}

/* ---------- Search + Filter with applied-count badge ---------- */
export function SearchInput({ value, onChange, placeholder = 'Search' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    /* 2820:111: 28px tall, 220px wide, #D1D5DB border, 8px radius, 14px grey-400 search icon, 14px text. */
    <label className="h-7 w-[220px] flex items-center gap-2 px-2.5 rounded-lg border border-gray-300 bg-white text-sm text-[#111827] focus-within:ring-2 focus-within:ring-primary/25 focus-within:border-primary">
      <MagnifyingGlass size={14} className="text-gray-400 shrink-0" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 bg-transparent outline-none placeholder:text-gray-400 min-w-0" />
      {value && <button type="button" aria-label="Clear" onClick={() => onChange('')}><X size={12} className="text-gray-400" /></button>}
    </label>
  );
}
/** chips: show the options as toggle chips instead of a dropdown (short lists such as Priority). */
export type FilterDef = { id: string; label: string; options: string[]; chips?: boolean };
export function FilterButton({ defs, value, onChange }: { defs: FilterDef[]; value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const [open, setOpen] = useState(false);
  const n = Object.values(value).filter(Boolean).length;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      {/* 3105:2: 28px secondary, 14px list-filter icon, 12px label, count badge 18×16 #2B5CFF, 8px radius, 11px semibold. */}
      <PopoverTrigger asChild>
        <Button size="sm" className={cx(open && 'bg-gray-50')}>
          <FunnelSimple size={14} className="text-gray-700" />
          Filter{n > 0 && <span className="min-w-[18px] h-4 px-1 rounded-lg bg-[#2B5CFF] text-white text-[11px] font-semibold inline-flex items-center justify-center">{n}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="space-y-3">
        <div className="flex items-center justify-between"><span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active filters</span>{n > 0 && <button type="button" className="text-xs font-medium text-[#E0243A] hover:text-[#C81E33]" onClick={() => onChange({})}>Clear all</button>}</div>
        {defs.map((d) => d.chips ? (
          <div key={d.id} role="group" aria-label={d.label}>
            <span className="block text-sm leading-5 font-medium text-[#111827] mb-1.5">{d.label}</span>
            <div className="flex flex-wrap gap-1.5">
              {d.options.map((o) => {
                const on = value[d.id] === o;
                return (
                  <button key={o} type="button" aria-pressed={on} onClick={() => onChange({ ...value, [d.id]: on ? '' : o })}
                    className={cx('h-7 px-3 rounded-full border text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 ease-snappy active:scale-[0.97]',
                      on ? 'border-primary bg-[#EFF6FF] text-[#1D4ED8]' : 'border-line bg-white text-[#374151] hover:bg-gray-50')}>{o}</button>
                );
              })}
            </div>
          </div>
        ) : (
          <Field key={d.id} label={d.label}>
            <Select value={value[d.id] ?? ''} onChange={(e) => onChange({ ...value, [d.id]: e.target.value })}>
              <option value="">Any</option>
              {d.options.map((o) => <option key={o}>{o}</option>)}
            </Select>
          </Field>
        ))}
      </PopoverContent>
    </Popover>
  );
}

/* ---------- Table: full-bleed, footer bar with summary + pager ---------- */
export type Col<T> = { key: string; label: ReactNode; render: (r: T) => ReactNode; className?: string };
export function Table<T extends { id: string }>({ cols, rows, onRow, empty, pageSize = 50, selected, summary, card, footerRight, footer: showFooter = true, paginate = true }: {
  cols: Col<T>[]; rows: T[]; onRow?: (r: T) => void; empty?: ReactNode; pageSize?: number; selected?: string;
  /** Footer text on the left, e.g. "7 properties · 2,749 units". Defaults to "N rows". */ summary?: ReactNode;
  /** Render inside a bordered card instead of full-bleed. */ card?: boolean; footerRight?: ReactNode;
  /** false hides the footer (settings card tables, 3057:2 / 3058:2, have none). It still shows when there is more than one page. */ footer?: boolean;
  /** false shows every row and drops the pager; the footer keeps only the summary. */ paginate?: boolean;
}) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [rows.length]);
  const pages = paginate ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
  const shown = paginate ? rows.slice(page * pageSize, page * pageSize + pageSize) : rows;
  const { items, bodyRef } = useRowMotion(shown);
  if (!rows.length) return <div className={cx(!card && 'flex-1 p-5')}>{empty ?? <Empty title="Nothing here" sub="Try a different tab or clear the filters." />}</div>;
  const table = (
    /* 2820:111: 36px header, 12px medium #646A78, #E5E7EB rule; 40px rows, 14px, #F3F4F6 rules; 20px outer padding. */
    <UITable className="text-[#111827]">
      <TableHeader className="sticky top-0 z-[1]"><TableRow>{cols.map((c, i) => <TableHead key={c.key} className={cx(i === 0 && 'pl-5', i === cols.length - 1 && 'pr-5', c.className)}>{c.label}</TableHead>)}</TableRow></TableHeader>
      <TableBody ref={bodyRef}>
        {items.map(({ row: r, motion }) => (
          <TableRow key={r.id} {...rowAttrs(r.id, motion)} onClick={() => onRow?.(r)} aria-selected={selected === r.id || undefined} data-state={selected === r.id ? 'selected' : undefined} className={cx(onRow && 'cursor-pointer hover:bg-subtle data-[state=selected]:hover:bg-[#EFF6FF]')}>
            {cols.map((c, i) => <TableCell key={c.key} className={cx(i === 0 && 'pl-5', i === cols.length - 1 && 'pr-5', c.className)}>{c.render(r)}</TableCell>)}
          </TableRow>
        ))}
      </TableBody>
    </UITable>
  );
  const footer = (
    /* 40px footer, #E5E7EB top rule, 12px #646A78. */
    <div className="h-10 shrink-0 px-5 flex items-center gap-2 border-t border-line text-xs text-[#646A78] bg-white">
      <span>{summary ?? `${rows.length} ${rows.length === 1 ? 'row' : 'rows'}`}</span>
      <div className="ml-auto flex items-center gap-1.5">
        {footerRight}
        {pages > 1 && <span className="mr-1">{page * pageSize + 1}–{Math.min(rows.length, (page + 1) * pageSize)} of {rows.length}</span>}
        {pages > 1 && <>
        <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)} className="size-7 rounded-md border border-line bg-white hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center"><CaretLeft size={13} /></button>
        <button type="button" aria-label="Next page" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="size-7 rounded-md border border-line bg-white hover:bg-gray-50 disabled:opacity-40 flex items-center justify-center"><CaretRight size={13} /></button>
        </>}
      </div>
    </div>
  );
  const foot = showFooter || pages > 1 ? footer : null;
  if (card) return <Card className="overflow-hidden">{table}{foot}</Card>;
  return <div className="flex-1 min-h-0 flex flex-col"><div className="flex-1 overflow-auto">{table}</div>{foot}</div>;
}

/* ---------- Empty state ---------- */
/** Centred empty state, no card (3103:2): 14px semibold title, 14px #646A78 sub up to 440px, actions 16px below. */
export function Empty({ title, sub, icon: I = MagnifyingGlass, action }: { title: string; sub?: string; icon?: Icon; action?: ReactNode }) {
  return (
    <div className="py-14 flex flex-col items-center text-center">
      <div className="size-16 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mb-4"><I size={28} weight="duotone" className="text-[#3B82F6]" /></div>
      <div className="text-sm font-semibold text-[#111827]">{title}</div>
      {sub && <div className="text-sm leading-5 text-[#646A78] mt-1 max-w-[440px]">{sub}</div>}
      {action && <div className="mt-4 flex gap-2">{action}</div>}
    </div>
  );
}

/* ---------- Alert note: white ground, tone border, coloured title ---------- */
/** 3056:2 / 3031:2: white ground, 8px radius, tone border at 30–35%, 16px outline icon, 14px medium tone title, 12px #646A78 sub.
 *  `grey` is the neutral info box (2825:897): #F9FAFB ground, #E5E7EB border, #374151 title. */
export function Note({ tone = 'amber', title, children, icon: I }: { tone?: 'amber' | 'red' | 'blue' | 'green' | 'grey'; title: string; children?: ReactNode; icon?: Icon }) {
  const c = { amber: ['#A16207', '#A16207', '#A1620759'], red: ['#E0243A', '#E0243A', '#E0243A4D'], blue: ['#2563EB', '#2563EB', '#2563EB4D'], green: ['#0B8A4C', '#0B8A4C', '#0B8A4C4D'], grey: ['#6B7280', '#374151', '#E5E7EB'] }[tone];
  return (
    <div className={cx('rounded-lg border px-3 py-2.5 flex items-center gap-2.5', tone === 'grey' ? 'bg-[#F9FAFB]' : 'bg-white')} style={{ borderColor: c[2] }}>
      {I && <I size={16} weight="regular" style={{ color: c[0] }} className="shrink-0" />}
      <div className="min-w-0"><div className="text-sm leading-5 font-medium" style={{ color: c[1] }}>{title}</div>{children && <div className="text-xs leading-4 text-[#646A78]">{children}</div>}</div>
    </div>
  );
}

/* ---------- Form controls ---------- */
/** 3054:2: 14px medium #111827 label, 6px gap, 32px control; hint 12px #646A78. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <Label className="block"><span className="block text-sm leading-5 font-medium text-[#111827] mb-1.5">{label}</span>{children}{hint && <span className="block text-xs leading-4 font-normal text-[#646A78] mt-1.5">{hint}</span>}</Label>;
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
      {/* Same box as the old select: 32px, #D1D5DB border, 8px radius, chevrons-up-down at the right. */}
      <DropdownMenuTrigger id={id} aria-label={ariaLabel} disabled={disabled}
        className={cx('h-data w-full min-w-0 flex items-center gap-2 rounded-lg border border-input bg-background pl-2.5 pr-2 text-sm text-[#111827] text-left outline-none transition-[border-color,box-shadow] duration-150',
          'hover:bg-gray-50 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/25 disabled:opacity-50 disabled:cursor-not-allowed', className)}>
        {I && <I size={14} className="text-[#646A78] shrink-0" />}
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
/** 3056:2: 32×18 track, 14px knob, green #0B8A4C on, #D1D5DB off. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return <UISwitch checked={checked} onCheckedChange={onChange} aria-label={label} />;
}
/** 3031:2: 16px box, 4px radius; checked #2563EB with a white tick, unchecked white with #D1D5DB border. */
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
/** 2824:497: 8px inset, 12px radius; 56px header (16px grey-500 icon, 14px semibold title, 28px close), 20px body, 64px footer. */
export function Sheet({ open, onClose, title, sub, icon: I, children, footer, width = 480 }: { open: boolean; onClose: () => void; title: ReactNode; sub?: ReactNode; icon?: Icon; children: ReactNode; footer?: ReactNode; width?: number }) {
  return (
    <UISheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent style={{ width }} {...noDesc(sub)}>
        <SheetHeader>
          {I && <I size={16} className="text-gray-500 shrink-0" />}
          <div className="min-w-0"><SheetTitle>{title}</SheetTitle>{sub && <SheetDescription>{sub}</SheetDescription>}</div>
        </SheetHeader>
        <SheetBody>{children}</SheetBody>
        {footer && <SheetFooter>{footer}</SheetFooter>}
      </SheetContent>
    </UISheet>
  );
}
/** 3032:2 / 2825:897: 16px semibold title, optional 14px #646A78 `sub` and 32px tone `icon` tile; 64px #F9FAFB footer. */
export function Dialog({ open, onClose, title, sub, icon: I, tone = 'blue', children, footer, width = 480 }: { open: boolean; onClose: () => void; title: string; sub?: ReactNode; icon?: Icon; tone?: Tone; children: ReactNode; footer?: ReactNode; width?: number }) {
  return (
    <UIDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ maxWidth: width }} {...noDesc(sub)}>
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            {I && <span className={cx('size-8 rounded-lg flex items-center justify-center shrink-0', toneCls[tone])}><I size={16} /></span>}
            <DialogTitle>{title}</DialogTitle>
            <DialogCloseButton />
          </div>
          {sub && <DialogDescription>{sub}</DialogDescription>}
        </DialogHeader>
        <DialogBody>{children}</DialogBody>
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </UIDialog>
  );
}

export function DL({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[140px_1fr] gap-y-2.5 text-sm">
      {rows.map(([k, v]) => <Fragment key={k}><dt className="text-gray-500">{k}</dt><dd className="text-ink">{v}</dd></Fragment>)}
    </dl>
  );
}

export const fmtDate = (d: string) => new Date(d + (d.length === 10 ? 'T00:00:00Z' : '')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
export const gbp = (n: number) => `£${n.toLocaleString('en-GB')}`;
