import { useRef, useState, type ReactNode } from 'react';
import { Check as CheckMark, CheckCircle, Clock, EnvelopeSimple, FileText, Flag, Hourglass, House, MinusCircle, PaperPlaneTilt, PencilSimple, RadioButton, SlidersHorizontal, UserCheck, WarningCircle, XCircle, type Icon } from '../../components/icons';
import { Button, Check, Pill, cx } from '../../components/ui';
import { Popover, PopoverAnchor, PopoverContent } from '../../components/shadcn/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/shadcn/table';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../../components/shadcn/dialog';
import type { Tone } from '../../data/seed';
import { initials } from '../../data/allocations';
import { rowAttrs, useRowMotion } from '../../components/rowMotion';

/** Small grey initials badge, as in the design's tables and lists. */
export function Ini({ name, size = 24 }: { name: string; size?: number }) {
  const fs = size <= 18 ? 9 : size <= 24 ? 10 : Math.round(size * 0.35);
  return <span className="inline-flex items-center justify-center rounded-full bg-[#F3F4F6] text-gray-700 font-semibold shrink-0" style={{ width: size, height: size, fontSize: fs }}>{initials(name)}</span>;
}
export function Person({ name, sub }: { name: string; sub?: ReactNode }) {
  return <div className="flex items-center gap-2 min-w-0"><Ini name={name} size={24} /><div className="min-w-0"><div className="font-medium truncate">{name}</div>{sub && <div className="text-xs text-gray-500 truncate">{sub}</div>}</div></div>;
}

/** Status pill with an icon chosen for this module's words. */
const T: Record<string, [Tone, Icon]> = {
  'In review': ['blue', Hourglass], 'Manual review': ['purple', Flag], Allocated: ['green', UserCheck], Waitlist: ['orange', Clock], Declined: ['grey', XCircle],
  Accepted: ['green', CheckMark], Open: ['blue', EnvelopeSimple], 'Offer open': ['blue', EnvelopeSimple], Lapsed: ['grey', MinusCircle], 'Offer sent': ['blue', PaperPlaneTilt],
  Signed: ['green', FileText], Sent: ['orange', PaperPlaneTilt], Draft: ['grey', PencilSimple], Cancelled: ['grey', XCircle], Conflict: ['red', WarningCircle],
  'Applications open': ['blue', RadioButton], 'In tenancy': ['green', House], 'Not open yet': ['purple', Clock], Active: ['green', CheckCircle],
};
export function St({ s }: { s: string }) {
  // Closed cycles and rejected applications use the outlined grey tag (frames 2837:394, 2838:2043).
  if (s === 'Closed' || s === 'Rejected') return <span className="inline-flex items-center h-[22px] px-2 rounded-lg border border-line bg-white text-xs font-medium text-gray-700">{s}</span>;
  const [tone, I] = T[s] ?? ['grey', MinusCircle];
  return <Pill tone={tone} icon={I}>{s}</Pill>;
}

/** Thin caption row above a table ("Applications here are left out of auto-allocate"). */
export const Caption = ({ children, left }: { children?: ReactNode; left?: ReactNode }) => (
  <div className="h-14 shrink-0 px-5 flex items-center gap-2 border-b border-line text-xs text-gray-500">{left}<div className="ml-auto">{children}</div></div>
);

/** Underline tabs for the application detail. */
export function LineTabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (t: T) => void; tabs: T[] }) {
  return (
    <div className="flex gap-4 border-b border-line">
      {tabs.map((t) => (
        <button key={t} type="button" onClick={() => onChange(t)} className={cx('h-9 -mb-px border-b-2 text-sm font-medium transition-colors', value === t ? 'border-[#111827] text-ink' : 'border-transparent text-gray-500 hover:text-ink')}>{t}</button>
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
    <Pop width={220} button={(_, t) => <Button icon={SlidersHorizontal} onClick={t}>Display</Button>}>
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
    <label className={cx('flex items-center gap-3 min-h-16 px-4 py-2.5 rounded-xl border cursor-pointer transition-colors', checked ? 'bg-[#EFF6FF] border-primary' : 'border-line hover:bg-[#F9FAFB]', disabled && 'opacity-50 pointer-events-none')}>
      <input type="radio" checked={checked} onChange={onChange} className="sr-only peer" />
      <span aria-hidden className={cx('size-4 rounded-full bg-white shrink-0 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/30', checked ? 'border-[5px] border-primary' : 'border border-gray-300')} />
      <span className="min-w-0"><span className="block text-sm font-semibold text-ink">{title}</span>{sub && <span className="block text-xs text-gray-500 mt-0.5">{sub}</span>}</span>
    </label>
  );
}

/** Centered empty state in a content area (blue tonal illustration box). */
export function EmptyArea({ icon: I, title, sub, children }: { icon: Icon; title: string; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
      <div className="w-[203px] h-[160px] rounded-2xl bg-[#EFF6FF] flex items-center justify-center mb-5 relative overflow-hidden">
        <div className="absolute -right-6 -bottom-8 size-28 rounded-full bg-[#DBEAFE]" />
        <div className="absolute left-6 top-6 size-10 rounded-xl bg-white/80" />
        <I size={56} weight="duotone" className="text-[#3B82F6] relative" />
      </div>
      <div className="text-base font-semibold">{title}</div>
      {sub && <div className="text-sm text-gray-500 mt-1.5 max-w-md">{sub}</div>}
      {children && <div className="mt-5 flex gap-2">{children}</div>}
    </div>
  );
}

/** Footer bar under a full-bleed list. */
export const Foot = ({ children, right }: { children: ReactNode; right?: ReactNode }) => (
  <div className="h-10 shrink-0 px-5 flex items-center gap-2 border-t border-line text-xs text-gray-500 bg-white"><span>{children}</span><div className="ml-auto flex items-center gap-1.5">{right}</div></div>
);
export const Kbd = ({ children }: { children: ReactNode }) => <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded border border-line text-[11px] text-gray-500 bg-white">{children}</span>;

/** Simple full-bleed table: 36px header, 40px rows. */
export type C<T> = { key: string; label: ReactNode; render: (r: T) => ReactNode; className?: string };
export function Grid<T extends { id: string }>({ cols, rows, onRow, hidden = [], selected }: { cols: C<T>[]; rows: T[]; onRow?: (r: T) => void; hidden?: string[]; selected?: string | null }) {
  const cs = cols.filter((c) => !hidden.includes(c.key));
  const { items, bodyRef } = useRowMotion(rows);
  return (
    <Table>
      <TableHeader className="sticky top-0 z-[1]"><TableRow>{cs.map((c, i) => <TableHead key={c.key} className={cx(i === 0 && 'pl-5', i === cs.length - 1 && 'pr-5', c.className)}>{c.label}</TableHead>)}</TableRow></TableHeader>
      <TableBody ref={bodyRef}>
        {items.map(({ row: r, motion }) => (
          <TableRow key={r.id} {...rowAttrs(r.id, motion)} onClick={() => onRow?.(r)} data-state={selected === r.id ? 'selected' : undefined} className={cx('data-[state=selected]:shadow-none', onRow && 'cursor-pointer hover:bg-subtle data-[state=selected]:hover:bg-[#EFF6FF]')}>
            {cs.map((c, i) => <TableCell key={c.key} className={cx(i === 0 && 'pl-5', i === cs.length - 1 && 'pr-5', c.className)}>{c.render(r)}</TableCell>)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Undo action for a toast: restores a snapshot of the module data. */
export const undoAction = (restore: () => void) => ({ label: 'Undo', onClick: restore });

/** Centered modal: title, description, then the body; grey footer (frames 3199:285, 3191:343). `icon`/`tone` are kept for callers but the frames show no header icon. */
export function Modal({ open, onClose, title, sub, children, footer, width = 560 }: { open: boolean; onClose: () => void; title: string; icon?: Icon; tone?: 'red' | 'blue' | 'amber' | 'green'; sub?: ReactNode; children: ReactNode; footer: ReactNode; width?: number }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ maxWidth: width }} {...(sub ? {} : { 'aria-describedby': undefined })}>
        <div className="px-5 pt-5 pb-4">
          <DialogTitle>{title}</DialogTitle>
          {sub && <DialogDescription className="mt-1.5">{sub}</DialogDescription>}
        </div>
        <DialogBody className="pt-0">{children}</DialogBody>
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
