import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CaretRight, CheckCircle, Circle, Image as ImageIcon, XCircle, type Icon } from '../../components/icons';
import { toast } from 'sonner';
import { Avatar, Card, Switch, cx } from '../../components/ui';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../../components/shadcn/dialog';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '../../components/shadcn/sheet';

/** The 52px header row, with breadcrumbs that link back. */
export function RHeader({ icon: I, crumbs, title, meta, children }: { icon: Icon; crumbs: [string, string][]; title: string; meta?: ReactNode; children?: ReactNode }) {
  return (
    <div className="h-[52px] shrink-0 border-b border-line flex items-center gap-2 px-4">
      <I size={16} className="text-gray-500" />
      {crumbs.map(([c, to]) => (
        <span key={c} className="flex items-center gap-2 text-sm text-[#646A78]"><Link to={to} className="hover:text-ink">{c}</Link><CaretRight size={12} className="text-gray-400" /></span>
      ))}
      <h1 className="text-sm font-semibold text-[#111827]">{title}</h1>
      {meta}
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  );
}

/** Figma avatar grounds for the named residents (the kit Avatar hashes its own colour). */
const PERSON_BG: Record<string, string> = { 'Ella Morgan': '#C0266D', 'Josh Patel': '#0E7A80', 'Leo Grant': '#0E7A80' };
/** Round initials avatar: the frame's colour when the person has one, else the kit Avatar. */
export function Person({ name, size = 28 }: { name: string; size?: number }) {
  const bg = PERSON_BG[name];
  if (!bg) return <Avatar name={name} size={size} />;
  return <span className="rounded-full text-white font-semibold flex items-center justify-center shrink-0" style={{ width: size, height: size, background: bg, fontSize: size <= 28 ? 11 : 12 }}>{name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('')}</span>;
}

/** Guards a submit handler against a fast double click. */
export function useOnce() {
  const busy = useRef(false);
  return (fn: () => void) => {
    if (busy.current) return;
    busy.current = true;
    try { fn(); } finally { setTimeout(() => { busy.current = false; }, 400); }
  };
}

export const undoToast = (msg: string, undo: () => void) => toast.success(msg, { action: { label: 'Undo', onClick: undo } });

/** Centred confirm dialog (shadcn Dialog): title and sub in the body, grey footer. */
export function Modal({ open, onClose, title, sub, children, footer, width = 500 }: { open: boolean; onClose: () => void; title: string; sub?: ReactNode; children?: ReactNode; footer: ReactNode; width?: number }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ maxWidth: width }} {...(sub ? {} : { 'aria-describedby': undefined })}>
        <div className="p-5 pb-4">
          <DialogTitle>{title}</DialogTitle>
          {sub && <DialogDescription>{sub}</DialogDescription>}
          {children && <div className="mt-4 space-y-3">{children}</div>}
        </div>
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Right side sheet (shadcn Sheet) with an icon tile in the header (Assign, Check in). */
export function SideSheet({ open, onClose, icon: I, tone = 'blue', title, sub, children, footer, width = 520 }: { open: boolean; onClose: () => void; icon: Icon; tone?: 'blue' | 'green'; title: string; sub?: string; children: ReactNode; footer: ReactNode; width?: number }) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent style={{ width }} {...(sub ? {} : { 'aria-describedby': undefined })}>
        <SheetHeader className="gap-3">
          <span className={cx('size-8 shrink-0 rounded-lg flex items-center justify-center', tone === 'green' ? 'bg-[#E8F7EE] text-[#0B8A4C]' : 'bg-[#EAF2FF] text-primary')}><I size={16} /></span>
          <div className="min-w-0"><SheetTitle>{title}</SheetTitle>{sub && <SheetDescription>{sub}</SheetDescription>}</div>
        </SheetHeader>
        <SheetBody className="space-y-5">{children}</SheetBody>
        <SheetFooter>{footer}</SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** A selectable option card with a radio dot. */
export function RadioCard({ checked, onClick, title, sub, right, avatar }: { checked: boolean; onClick: () => void; title: ReactNode; sub?: ReactNode; right?: ReactNode; avatar?: string }) {
  return (
    <button type="button" role="radio" aria-checked={checked} onClick={onClick}
      className={cx('w-full text-left rounded-xl border px-3.5 py-3 flex items-center gap-3 transition-colors', checked ? 'border-primary bg-[#EFF6FF]' : 'border-line bg-white hover:bg-gray-50')}>
      <span className={cx('size-4 rounded-full border shrink-0 flex items-center justify-center', checked ? 'border-primary bg-primary' : 'border-gray-300 bg-white')}>{checked && <span className="size-1.5 rounded-full bg-white" />}</span>
      {avatar && <Avatar name={avatar} size={24} />}
      <span className="flex-1 min-w-0"><span className="block text-sm leading-5 font-semibold text-[#111827]">{title}</span>{sub && <span className="block text-xs text-gray-500 mt-0.5">{sub}</span>}</span>
      {right}
    </button>
  );
}

/** A bordered row with a label, a description and a green switch. */
export function ToggleRow({ title, sub, checked, onChange }: { title: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="rounded-xl border border-line px-3.5 py-3 flex items-center gap-3">
      <div className="flex-1"><div className="text-sm">{title}</div>{sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}</div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

/** Card with a title row (no border under it), as the detail pages use. */
export function Panel({ title, right, children, className }: { title: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={cx('p-4', className)}>
      <div className="flex items-center justify-between mb-3"><h3 className="text-sm font-semibold">{title}</h3>{right && <span className="text-xs text-gray-500">{right}</span>}</div>
      {children}
    </Card>
  );
}

/** Label / value rows with a 140px label column. */
export function KV({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[140px_1fr] gap-y-3.5 text-sm">
      {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-gray-500">{k}</dt><dd className="text-ink">{v}</dd></div>)}
    </dl>
  );
}

/** Check rows: green tick or red cross, label, then grey (or red) detail. */
export function Checks({ items }: { items: { label: string; sub: string; ok: boolean }[] }) {
  return (
    <div>
      {items.map((c) => (
        <div key={c.label} className="h-9 flex items-center gap-2.5 border-b border-[#F3F4F6] last:border-0">
          {c.ok ? <CheckCircle size={16} className="text-[#0B8A4C] shrink-0" /> : <XCircle size={16} className="text-[#B91C1C] shrink-0" />}
          <span className="w-[250px] shrink-0 text-sm leading-5 font-medium text-[#111827]">{c.label}</span>
          <span className={cx('text-xs', c.ok ? 'text-gray-500' : 'text-[#B91C1C]')}>{c.sub}</span>
        </div>
      ))}
    </div>
  );
}

/** A vertical progress timeline; done steps get a green tick, the rest an empty dashed ring. */
export function Timeline({ steps }: { steps: { title: string; sub?: string; when?: string; done: boolean }[] }) {
  return (
    <ol className="relative">
      {steps.map((s, i) => (
        <li key={s.title} className="relative flex gap-3 pb-4 last:pb-0">
          {i < steps.length - 1 && <span className="absolute left-[9px] top-5 bottom-0 w-px bg-line" />}
          {s.done ? <span className="size-[19px] rounded-full bg-[#E8F7EE] text-[#16A34A] flex items-center justify-center shrink-0 z-[1]"><CheckCircle size={19} weight="fill" /></span>
            : <Circle size={19} className="text-gray-300 shrink-0 z-[1] bg-white" />}
          <div className="flex-1 min-w-0"><div className="text-sm">{s.title}</div>{s.sub && <div className="text-xs text-gray-500 mt-0.5">{s.sub}</div>}</div>
          {s.when && <span className="text-sm text-gray-500">{s.when}</span>}
        </li>
      ))}
    </ol>
  );
}

export const Photo = ({ size = 96 }: { size?: number }) => (
  <span className="rounded-lg bg-[#F3F4F6] border border-line flex items-center justify-center text-gray-400" style={{ width: size, height: size * 0.75 }}><ImageIcon size={18} /></span>
);

/** "Now → After" room tile used on the swap cards. */
export function RoomMove({ now, after }: { now: [string, string]; after: [string, string] }) {
  return (
    <div className="rounded-[10px] bg-[#F9FAFB] px-3 py-2.5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div><div className="text-xs text-gray-500">Now</div><div className="text-sm leading-5 font-semibold">{now[0]}</div><div className="text-xs text-gray-500">{now[1]}</div></div>
      <ArrowRight size={16} className="text-gray-400" />
      <div><div className="text-xs text-gray-500">After the swap</div><div className="text-sm leading-5 font-semibold">{after[0]}</div><div className="text-xs text-gray-500">{after[1]}</div></div>
    </div>
  );
}
