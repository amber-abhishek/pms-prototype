import { useRef, useState, type ReactNode } from 'react';
import { Illustration, type Illo } from '../../components/Illustration';
import { ArrowDown, ArrowUp, Check as CheckMark, CheckCircle, Clock, EnvelopeSimple, FileText, Flag, Hourglass, House, MinusCircle, PaperPlaneTilt, PencilSimple, RadioButton, SlidersHorizontal, UserCheck, WarningCircle, XCircle, type Icon } from '../../components/icons';
import { Avatar, Button, Check, Pill, cx } from '../../components/ui';
import { Popover, PopoverAnchor, PopoverContent } from '../../components/shadcn/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/shadcn/table';
import { Dialog, DialogContent, DialogFrame } from '../../components/shadcn/dialog';
import type { Tone } from '../../data/seed';
import { rowAttrs, useRowMotion } from '../../components/rowMotion';

/** Initials avatar: the shared toned Avatar (Figma 3770:15786 — soft tone gradient, tone initials). */
export function Ini({ name, size = 24 }: { name: string; size?: number }) {
  return <Avatar name={name} size={size} />;
}
export function Person({ name, sub }: { name: string; sub?: ReactNode }) {
  return <div className="flex items-center gap-2 min-w-0"><Ini name={name} size={24} /><div className="min-w-0"><div className="font-medium truncate">{name}</div>{sub && <div className="text-xs text-gray-500 truncate">{sub}</div>}</div></div>;
}

/** Status pill with an icon chosen for this module's words. */
const T: Record<string, [Tone, Icon]> = {
  'In review': ['blue', Hourglass], Flagged: ['purple', Flag], Allocated: ['green', UserCheck], Waitlist: ['orange', Clock], Declined: ['grey', XCircle],
  Accepted: ['green', CheckMark], Open: ['blue', EnvelopeSimple], 'Offer open': ['blue', EnvelopeSimple], Lapsed: ['grey', MinusCircle], 'Offer sent': ['blue', PaperPlaneTilt],
  Signed: ['green', FileText], Sent: ['orange', PaperPlaneTilt], Draft: ['grey', PencilSimple], Cancelled: ['grey', XCircle], Conflict: ['red', WarningCircle],
  'Applications open': ['blue', RadioButton], 'In tenancy': ['green', House], 'Not open yet': ['purple', Clock], Active: ['green', CheckCircle],
};
export function St({ s }: { s: string }) {
  // Closed cycles and rejected applications: the grey pill.
  if (s === 'Closed' || s === 'Rejected') return <Pill tone="grey">{s}</Pill>;
  const [tone, I] = T[s] ?? ['grey', MinusCircle];
  return <Pill tone={tone} icon={I}>{s}</Pill>;
}

/** Thin caption row above a table, left-aligned with the first column ("Applications here are left out of auto-allocate"). */
export const Caption = ({ children, left }: { children?: ReactNode; left?: ReactNode }) => (
  <div className="h-10 shrink-0 px-[calc(var(--gx,16px)+var(--cx,12px))] flex items-center gap-2 text-xs text-gray-500">{children}{left && <div className="ml-auto">{left}</div>}</div>
);

/** Underline tabs for the application detail. */
export function LineTabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (t: T) => void; tabs: T[] }) {
  return (
    <div className="flex gap-4 border-b border-line">
      {tabs.map((t) => (
        <button key={t} type="button" onClick={() => onChange(t)} className={cx('h-9 -mb-px border-b-2 text-sm font-medium transition-colors', value === t ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-gray-500 hover:text-ink')}>{t}</button>
      ))}
    </div>
  );
}

/** A popover anchored under a button (shadcn Popover). The button toggles it; outside clicks and Escape close it. */
export function Pop({ button, children, width = 300, align = 'right' }: { button: (open: boolean, toggle: () => void) => ReactNode; children: (close: () => void) => ReactNode; width?: number; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild><div className="relative" ref={anchor}>{button(open, () => setOpen((o) => !o))}</div></PopoverAnchor>
      <PopoverContent align={align === 'right' ? 'end' : 'start'} className="p-0 rounded-[10px]" style={{ width }}
        onInteractOutside={(e) => { if (anchor.current?.contains(e.target as Node)) e.preventDefault(); }}>
        {children(() => setOpen(false))}
      </PopoverContent>
    </Popover>
  );
}

/** "Display" button: show or hide a table's columns. */
export function DisplayButton({ cols, hidden, onChange }: { cols: { key: string; label: string }[]; hidden: string[]; onChange: (h: string[]) => void }) {
  return (
    <Pop width={220} button={(_, t) => <Button variant="control" icon={SlidersHorizontal} onClick={t}>Display</Button>}>
      {() => (
        <div className="p-3 space-y-2">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Columns</div>
          {cols.map((c) => <div key={c.key}><Check label={c.label} checked={!hidden.includes(c.key)} onChange={(v) => onChange(v ? hidden.filter((h) => h !== c.key) : [...hidden, c.key])} /></div>)}
        </div>
      )}
    </Pop>
  );
}

/** Radio card used in dialogs and sheets (frames 3199:285, 3191:343): selected = blue ground + blue border, ring-style dot. */
export function Radio({ checked, onChange, title, sub, disabled }: { checked: boolean; onChange: () => void; title: ReactNode; sub?: ReactNode; disabled?: boolean }) {
  return (
    <label className={cx('flex items-center gap-3 min-h-16 px-4 py-2.5 rounded-xl border cursor-pointer transition-colors', checked ? 'bg-[#EFF6FF] border-primary' : 'border-line hover:bg-[#FAFAFA]', disabled && 'opacity-50 pointer-events-none')}>
      <input type="radio" checked={checked} onChange={onChange} className="sr-only peer" />
      <span aria-hidden className={cx('size-4 rounded-full bg-white shrink-0 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30', checked ? 'border-[5px] border-primary' : 'border border-gray-300')} />
      <span className="min-w-0"><span className="block text-sm font-semibold text-ink">{title}</span>{sub && <span className="block text-xs text-gray-500 mt-0.5">{sub}</span>}</span>
    </label>
  );
}

/** Centered empty state in a content area (blue tonal illustration box). */
export function EmptyArea({ icon: I, title, sub, children, art }: { icon: Icon; title: string; sub?: ReactNode; children?: ReactNode; art?: Illo }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
      {art ? <Illustration name={art} className="block w-[203px] h-[160px] mb-5" /> : <div className="w-[203px] h-[160px] rounded-2xl bg-[#EFF6FF] flex items-center justify-center mb-5 relative overflow-hidden">
        <div className="absolute -right-6 -bottom-8 size-28 rounded-full bg-[#DBEAFE]" />
        <div className="absolute left-6 top-6 size-10 rounded-xl bg-white/80" />
        <I size={56} weight="duotone" className="text-[#3B82F6] relative" />
      </div>}
      <div className="text-base font-semibold">{title}</div>
      {sub && <div className="text-sm text-gray-500 mt-1.5 max-w-md">{sub}</div>}
      {children && <div className="mt-5 flex gap-2">{children}</div>}
    </div>
  );
}

/** Footer bar under a full-bleed list. */
/** Table footer. No left-side counts (2026-11-09): pass only real text; with neither text nor pager it renders nothing. */
export const Foot = ({ children, right }: { children?: ReactNode; right?: ReactNode }) => (!children && !right) ? null : (
  <div data-foot className="h-10 shrink-0 px-5 flex items-center gap-2 border-t border-line text-xs text-gray-500 bg-white"><span>{children}</span><div className="ml-auto flex items-center gap-1.5">{right}</div></div>
);
export const Kbd = ({ children }: { children: ReactNode }) => <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded border border-line text-[11px] text-gray-500 bg-white">{children}</span>;

/** Simple full-bleed table: 36px header, 40px rows. */
export type C<T> = { key: string; label: ReactNode; render: (r: T) => ReactNode; className?: string };
export function Grid<T extends { id: string }>({ cols, rows, onRow, hidden = [], selected, fill, sort }: { cols: C<T>[]; rows: T[]; onRow?: (r: T) => void; hidden?: string[]; selected?: string | null; /** edge-to-edge rows; default on for 6+ columns */ fill?: boolean;
  /** Sorted column: its header goes ink with an arrow, like `Table sort`; click flips it. */ sort?: { key: string; dir: 'asc' | 'desc'; onToggle?: () => void } }) {
  const cs = cols.filter((c) => !hidden.includes(c.key));
  const { items, bodyRef } = useRowMotion(rows);
  return (
    <div data-scroller {...((fill ?? cs.length >= 6) ? { 'data-fill': '' } : { 'data-inset': '' })} className="px-[var(--gx,16px)]">
    <Table>
      <TableHeader className="sticky top-0 z-[1]"><TableRow>{cs.map((c, i) => <TableHead key={c.key} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined} className={cx(i === 0 && 'pl-[var(--cx,12px)]', i === cs.length - 1 && 'pr-[var(--cx,12px)]', c.className)}>{sort?.key === c.key ? <button type="button" onClick={sort.onToggle} className="inline-flex items-center gap-1 text-[#0A0A0A] font-medium">{c.label}{sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</button> : c.label}</TableHead>)}</TableRow></TableHeader>
      <TableBody ref={bodyRef}>
        {items.map(({ row: r, motion }) => (
          <TableRow key={r.id} {...rowAttrs(r.id, motion)} onClick={() => onRow?.(r)} data-state={selected === r.id ? 'selected' : undefined} className={cx(onRow && 'cursor-pointer hover:bg-subtle data-[state=selected]:hover:bg-[#EFF6FF]')}>
            {cs.map((c, i) => <TableCell key={c.key} className={cx(i === 0 && 'pl-[var(--cx,12px)]', i === cs.length - 1 && 'pr-[var(--cx,12px)]', c.className)}>{c.render(r)}</TableCell>)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}

/** Undo action for a toast: restores a snapshot of the module data. */
export const undoAction = (restore: () => void) => ({ label: 'Undo', onClick: restore });

/** Centered modal: title, description, then the body; grey footer (frames 3199:285, 3191:343). `icon`/`tone` are kept for callers but the frames show no header icon. */
export function Modal({ open, onClose, title, sub, children, footer, width = 560 }: { open: boolean; onClose: () => void; title: string; icon?: Icon; tone?: 'red' | 'blue' | 'amber' | 'green'; sub?: ReactNode; children: ReactNode; footer: ReactNode; width?: number }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ maxWidth: width }} {...(sub ? {} : { 'aria-describedby': undefined })}>
        <DialogFrame title={title} sub={sub} footer={footer}>{children}</DialogFrame>
      </DialogContent>
    </Dialog>
  );
}
