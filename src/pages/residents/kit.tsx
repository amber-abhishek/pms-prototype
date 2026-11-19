import { useRef, type ReactNode } from 'react';
import { ArrowRight, CheckCircle, Circle, Image as ImageIcon, XCircle, type Icon } from '../../components/icons';
import { toast } from 'sonner';
import { Avatar, Card, ConfirmFrame, PageHeader, Switch, cx, isConfirmTitle, noAutoFocus } from '../../components/ui';
import { Dialog, DialogContent, DialogFrame } from '../../components/shadcn/dialog';

/** The shared top bar (Figma 3884:39270), with breadcrumbs that link back. */
export function RHeader({ icon, crumbs, title, meta, children }: { icon: Icon; crumbs: [string, string?][]; title: string; meta?: ReactNode; children?: ReactNode }) {
  return <PageHeader icon={icon} title={title} crumbs={crumbs.map(([label, to]) => ({ label, to }))} meta={meta}>{children}</PageHeader>;
}

/** Figma avatar grounds for the named residents (the kit Avatar hashes its own colour). */
const PERSON_BG: Record<string, string> = { 'Ella Morgan': '#C0266D', 'Josh Patel': '#0E7A80', 'Leo Grant': '#0E7A80' };
/** Round initials avatar: the frame's colour when the person has one, else the kit Avatar. */
export function Person({ name, size = 28 }: { name: string; size?: number }) {
  return <Avatar name={name} size={size} color={PERSON_BG[name]} />;
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

/** Centred dialog (shadcn Dialog): title and sub in the body, grey footer. A question title is a confirmation, so it
    takes the shared confirm layout (both buttons right, no icons). */
export function Modal({ open, onClose, title, sub, children, footer, width = 500 }: { open: boolean; onClose: () => void; title: string; sub?: ReactNode; children?: ReactNode; footer: ReactNode; width?: number }) {
  const confirm = isConfirmTitle(title);
  const body = children ? <div className="space-y-3">{children}</div> : null;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ maxWidth: width }} {...(sub ? {} : { 'aria-describedby': undefined })} {...(confirm ? noAutoFocus : {})}>
        {confirm ? <ConfirmFrame title={title} sub={sub} footer={footer}>{body}</ConfirmFrame> : <DialogFrame title={title} sub={sub} footer={footer}>{body}</DialogFrame>}
      </DialogContent>
    </Dialog>
  );
}

const RadioDot = ({ on }: { on: boolean }) => <span className={cx('size-4 rounded-full shrink-0 bg-white', on ? 'border-[5px] border-primary' : 'border border-gray-300')} />;

/** A selectable option card with a radio dot, for dialogs. Neutral: a blue ring marks the pick, no tinted ground. */
export function RadioCard({ checked, onClick, title, sub, right, avatar }: { checked: boolean; onClick: () => void; title: ReactNode; sub?: ReactNode; right?: ReactNode; avatar?: string }) {
  return (
    <button type="button" role="radio" aria-checked={checked} onClick={onClick}
      className={cx('w-full text-left rounded-xl border px-3.5 py-3 flex items-center gap-3 transition-colors bg-white', checked ? 'border-primary' : 'border-line hover:bg-gray-50')}>
      <RadioDot on={checked} />
      {avatar && <Avatar name={avatar} size={24} />}
      <span className="flex-1 min-w-0"><span className="block text-sm leading-5 font-medium text-[#0A0A0A]">{title}</span>{sub && <span className="block text-xs text-[#737373] mt-0.5">{sub}</span>}</span>
      {right}
    </button>
  );
}

/* Rows inside a SheetSection card: split by hairlines like SheetRow, no boxes inside the box. */
const ROW = 'w-full py-2.5 flex items-center gap-3 border-t border-[#EBEBEB] first:border-t-0 first:pt-0 last:pb-0';
const rowText = (title: ReactNode, sub?: ReactNode) => <span className="min-w-0 flex-1"><span className="block text-sm leading-5 text-[#0A0A0A]">{title}</span>{sub != null && <span className="block text-[13px] leading-5 text-[#737373]">{sub}</span>}</span>;

/** An option inside a section card: radio dot, title, grey sub, optional end (a pill). Wrap a set in role="radiogroup". */
export function RadioRow({ checked, onClick, title, sub, right, avatar }: { checked: boolean; onClick: () => void; title: ReactNode; sub?: ReactNode; right?: ReactNode; avatar?: string }) {
  return (
    <button type="button" role="radio" aria-checked={checked} onClick={onClick} className={cx(ROW, 'text-left hover:opacity-80')}>
      <RadioDot on={checked} />
      {avatar && <Avatar name={avatar} size={24} />}
      {rowText(title, sub)}
      {right}
    </button>
  );
}

/** A switch row: label, grey sub and a green switch, split from its neighbours by a hairline (no bordered box). */
export function ToggleRow({ title, sub, checked, onChange }: { title: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className={ROW}>
      {rowText(title, sub)}
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

/** Card with a title row (no border under it), as the detail pages use. */
export function Panel({ title, right, children, className }: { title: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    /* The property modal's card: 48px header (title, grey note on the right) over a light rule, then a 16px-inset body. */
    <Card className={cx('overflow-hidden', className)}>
      <div className="h-12 px-4 flex items-center border-b border-[#F5F5F5]"><h3 className="text-sm font-semibold">{title}</h3>{right && <span className="ml-auto text-xs text-[#737373]">{right}</span>}</div>
      <div className="px-4 py-3">{children}</div>
    </Card>
  );
}

/** Label / value rows with a 140px label column. */
export function KV({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[132px_minmax(0,1fr)] gap-y-3.5 text-sm">
      {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-gray-500">{k}</dt><dd className="text-ink min-w-0 break-words">{v}</dd></div>)}
    </dl>
  );
}

/** Check rows: green tick or red cross, label, then grey (or red) detail. */
export function Checks({ items }: { items: { label: string; sub: string; ok: boolean }[] }) {
  return (
    <div>
      {items.map((c) => (
        <div key={c.label} className="h-9 flex items-center gap-2.5 border-b border-[#F5F5F5] last:border-0">
          {c.ok ? <CheckCircle size={16} className="text-[#0B8A4C] shrink-0" /> : <XCircle size={16} className="text-[#B91C1C] shrink-0" />}
          <span className="w-[250px] shrink-0 text-sm leading-5 font-medium text-[#0A0A0A]">{c.label}</span>
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
  <span className="rounded-lg bg-[#F5F5F5] border border-line flex items-center justify-center text-gray-400" style={{ width: size, height: size * 0.75 }}><ImageIcon size={18} /></span>
);

/** "Now → After" room tile used on the swap cards. */
export function RoomMove({ now, after }: { now: [string, string]; after: [string, string] }) {
  return (
    <div className="rounded-[10px] bg-[#FAFAFA] px-3 py-2.5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div><div className="text-xs text-gray-500">Now</div><div className="text-sm leading-5 font-semibold">{now[0]}</div><div className="text-xs text-gray-500">{now[1]}</div></div>
      <ArrowRight size={16} className="text-gray-400" />
      <div><div className="text-xs text-gray-500">After the swap</div><div className="text-sm leading-5 font-semibold">{after[0]}</div><div className="text-xs text-gray-500">{after[1]}</div></div>
    </div>
  );
}
