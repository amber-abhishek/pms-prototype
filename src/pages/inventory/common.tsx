import { Fragment, type ReactNode } from 'react';
import { CaretRight, CaretUpDown, Check, CheckCircle, RadioButton, Minus, MinusCircle, PauseCircle, PencilSimple, Plus, WarningCircle, XCircle, Archive, type Icon } from '../../components/icons';
import { ConfirmFrame, Pill, Status, cx, isConfirmTitle, noAutoFocus } from '../../components/ui';
import type { Tone } from '../../data/seed';
import { Dialog, DialogBody, DialogCloseButton, DialogContent, DialogDescription, DialogFooter, DialogFrame, DialogTitle } from '../../components/shadcn/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/shadcn/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '../../components/shadcn/tabs';
import type { PStatus, Tag, UStatus } from '../../data/inventory';

/* Status pills as the CMS frames draw them: Draft is a white outlined chip. */
export function PropStatus({ s }: { s: PStatus | UStatus | 'Running' | 'Queued' | 'Succeeded' | 'Failed' }) {
  /* Figma 3884:43935: Draft is the amber tag; Queued stays grey. */
  if (s === 'Draft') return <Status s="Draft" tone="amber" />;
  if (s === 'Queued') return <Status s="Queued" tone="grey" />;
  if (s === 'Active' || s === 'Succeeded') return <Status s={s} tone="green" icon={CheckCircle} />;
  if (s === 'Inactive') return <Status s="Inactive" tone="grey" icon={MinusCircle} />;
  if (s === 'Archived') return <Status s="Archived" tone="grey" icon={Archive} />;
  if (s === 'Closed to allocations') return <Status s="Closed to allocations" tone="amber" icon={PauseCircle} />;
  if (s === 'Failed') return <Status s="Failed" tone="red" icon={XCircle} />;
  return <Status s={s} tone="blue" icon={RadioButton} />;
}

/* Tag text colours from 2820:111; the border is the same colour at 35%. Self-catered/Riverside are teal, Common room pink. */
const TAG_HEX: Record<string, string> = { green: '#087A43', blue: '#1F45E0', amber: '#9A5B00', orange: '#C2410C', red: '#C8102E', purple: '#6E3BD8', grey: '#404040' };
const TAG_BY_LABEL: Record<string, string> = { 'Self-catered': '#0E7A80', Riverside: '#0E7A80', 'Common room': '#C0266D' };
const tagColor = (t: Tag) => TAG_BY_LABEL[t.label] ?? TAG_HEX[t.tone] ?? '#404040';
export function Tags({ tags, max = 2 }: { tags: Tag[]; max?: number }) {
  if (!tags.length) return <span className="text-[#737373]">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {/* Figma 3884:39809 tag: Connect chip, 20px, r6, 6px sides, the tag colour at 10% over white, Geist Mono 12 medium uppercase. */}
      {tags.slice(0, max).map((t) => { const c = tagColor(t); return <span key={t.label} className="inline-flex items-center h-5 px-1.5 rounded-[6px] font-mono text-xs leading-4 font-medium uppercase whitespace-nowrap" style={{ color: c, background: `linear-gradient(${c}1A, ${c}1A), #fff` }}>{t.label}</span>; })}
      {tags.length > max && <span className="font-mono text-xs text-[#737373]">+{tags.length - max}</span>}
    </span>
  );
}

/* Icon tile used in front of a property name and in dialog headers. */
export function IconTile({ icon: I, tone = 'grey', size = 28 }: { icon: Icon; tone?: 'grey' | 'blue' | 'red' | 'green' | 'amber'; size?: number }) {
  const c = { grey: 'bg-[#F5F5F5] text-gray-500', blue: 'bg-[#EFF6FF] text-[#2563EB]', red: 'bg-[#FFE3E7] text-[#E0243A]', green: 'bg-[#E8F7EE] text-[#0B8A4C]', amber: 'bg-[#FFF6E0] text-[#A16207]' }[tone];
  return <span className={cx('inline-flex items-center justify-center shrink-0', c, size >= 36 ? 'rounded-[10px]' : 'rounded-lg')} style={{ width: size, height: size }}><I size={size <= 28 ? 14 : size <= 32 ? 16 : Math.round(size * 0.5)} /></span>;
}

/* ---- Add property design system (Figma "Modal · Add property", 3884:41314), shared by every inventory modal. ---- */

/** Each layout level's tone, used by its pill and tile. */
export const LV = { Property: 'blue', Block: 'purple', Floor: 'orange', Flat: 'amber', Room: 'green' } as const satisfies Record<string, Tone>;
export type Level = keyof typeof LV;
export type Layout = 'College' | 'House';
const LAYOUTS: [Layout, number, Level[]][] = [['College', 6, ['Property', 'Block', 'Floor', 'Flat', 'Room']], ['House', 2, ['Property', 'Room']]];

/** Property layout radio cards: name, "Used by n", then the level pills joined by carets. */
export function LayoutRadios({ value, onChange }: { value: Layout; onChange: (l: Layout) => void }) {
  return (
    <div role="radiogroup" aria-label="Property layout" className="flex flex-col gap-2">
      {LAYOUTS.map(([s, n, lv]) => (
        <div key={s} role="radio" aria-checked={value === s} tabIndex={0} onClick={() => onChange(s)} onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && onChange(s)}
          className={cx('rounded-xl border p-4 flex gap-3 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring', value === s ? 'border-[#2563EB] bg-[#2563EB]/[0.03]' : 'border-[#E5E5E5] hover:bg-[#FAFAFA]')}>
          <span className={cx('size-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0', value === s ? 'border-[#2563EB] bg-[#2563EB]' : 'border-[#D4D4D4] bg-white')}>{value === s && <span className="size-1.5 rounded-full bg-white" />}</span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2"><span className="text-sm font-medium text-[#0A0A0A]">{s}</span><span className="text-xs text-[#737373]">Used by {n} properties</span></div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">{lv.map((l, i) => <span key={l} className="flex items-center gap-1.5">{i > 0 && <CaretRight size={12} strokeWidth={1.5} className="text-[#A3A3A3]" />}<Pill tone={LV[l]}>{l}</Pill></span>)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Card: r12, a 32px #FAFAFA mono strip (grey label, ink value or an action on the right), then its body. */
export function ACard({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden">
      <div className="h-8 px-3 flex items-center gap-2 bg-[#FAFAFA] border-b border-[#E5E5E5] font-mono uppercase text-xs leading-4 font-medium tracking-[0.48px]">
        <span className="flex-1 text-[#737373]">{title}</span>{right && <span className="text-[#0A0A0A]">{right}</span>}
      </div>
      {children}
    </div>
  );
}

/** A form label (14px Medium) over its control, with an optional 12px grey line under it. */
export function FormRow({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="text-sm leading-5 font-medium text-[#0A0A0A] mb-1.5">{label}</div>
      {children}
      {hint && <p className="text-xs text-[#737373] mt-1.5">{hint}</p>}
    </div>
  );
}

/** The Add property modal frame: 56px header (16px title, plain ✕), a scrolling body, a 64px footer
 *  (`left`: the ghost Cancel/Back; `right`: the primary action). */
export function InvModal({ open, onClose, title, width = 600, left, right, children }: { open: boolean; onClose: () => void; title: string; width?: number; left?: ReactNode; right?: ReactNode; children: ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent aria-describedby={undefined} style={{ maxWidth: width }} onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement | null)?.focus(); }}>
        <div className="h-14 shrink-0 border-b border-[#E5E5E5] pl-6 pr-4 flex items-center gap-3">
          <DialogTitle className="flex-1 text-base leading-5 font-medium text-[#0A0A0A]">{title}</DialogTitle>
          <DialogCloseButton />
        </div>
        <div className="flex-1 min-h-0 overflow-auto px-6 py-6 flex flex-col gap-6">{children}</div>
        <div className="h-16 shrink-0 border-t border-[#E5E5E5] px-6 flex items-center">{left}<div className="ml-auto flex items-center gap-2">{right}</div></div>
      </DialogContent>
    </Dialog>
  );
}

/* Dialog: title, grey sub, body, grey footer bar. No header icon (2026-11-09); `icon`/`tone` are ignored. */
export function Modal({ open, onClose, title, sub, children, footer, width = 560, center }: {
  open: boolean; onClose: () => void; icon?: Icon; tone?: 'grey' | 'blue' | 'red' | 'green' | 'amber'; title?: ReactNode; sub?: ReactNode; children?: ReactNode; footer?: ReactNode; width?: number; center?: boolean;
}) {
  /* shadcn Dialog. A dialog with no title still needs an accessible name, so it gets a hidden one.
     A question title with a footer is a confirmation, so it takes the shared confirm layout. */
  const confirm = footer != null && isConfirmTitle(title);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ maxWidth: width }} {...(sub ? {} : { 'aria-describedby': undefined })} {...(confirm ? noAutoFocus : {})}>
        {confirm ? <ConfirmFrame title={title} sub={sub} footer={footer}>{children}</ConfirmFrame> : title ? <DialogFrame title={title} sub={sub} footer={footer} close={!center}>{children}</DialogFrame> : (
          <>
            <DialogTitle className="sr-only">Dialog</DialogTitle>
            <DialogBody className={cx(center && 'text-center')}>{sub && <DialogDescription>{sub}</DialogDescription>}{children && <div className={sub ? 'mt-4' : undefined}>{children}</div>}</DialogBody>
            {footer && <DialogFooter>{footer}</DialogFooter>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* Radio card: white card, blue ring + soft blue ground when picked. */
export function RadioCard({ checked, onClick, title, sub, right, disabled }: { checked: boolean; onClick: () => void; title: ReactNode; sub?: ReactNode; right?: ReactNode; disabled?: boolean }) {
  return (
    <div role="radio" aria-checked={checked} tabIndex={0} onClick={() => !disabled && onClick()} onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !disabled && onClick()}
      className={cx('w-full text-left rounded-[10px] border px-3 py-2.5 flex items-center gap-3 transition-colors cursor-pointer', checked ? 'border-primary bg-white' : 'border-line bg-white hover:bg-gray-50', disabled && 'opacity-50 cursor-not-allowed')}>
      <span className={cx('size-4 rounded-full shrink-0 bg-white', checked ? 'border-[5px] border-primary' : 'border border-gray-300')} />
      <span className="flex-1 min-w-0"><span className="block text-sm leading-5 font-medium text-[#0A0A0A]">{title}</span>{sub && <span className="block text-xs leading-4 text-[#737373]">{sub}</span>}</span>
      {right}
    </div>
  );
}

/* Segmented control (Weekly | Monthly, Flat | Percentage | Per unit). */
export function Seg<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: T[]; className?: string }) {
  /* shadcn Tabs list: the same segmented track as the filter tabs. */
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as T)} className={cx('inline-flex', className)}>
      <TabsList className="w-full">{options.map((o) => <TabsTrigger key={o} value={o} className="flex-1">{o}</TabsTrigger>)}</TabsList>
    </Tabs>
  );
}

/* Underline tabs used on the property page (shadcn Tabs, underline style). */
export function LineTabs<T extends string>({ value, onChange, tabs, className }: { value: T; onChange: (v: T) => void; tabs: { id: T; label: string }[]; className?: string }) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as T)}>
      {/* The blue underline slides to the picked tab (2026-11-13). */}
      <TabsList slide="underline" className={cx('flex h-auto justify-start gap-4 rounded-none bg-transparent p-0 px-5 border-b border-line', className)}>
        {tabs.map((t) => (
          <TabsTrigger key={t.id} value={t.id} className="h-10 px-2.5 rounded-none text-[#737373] hover:text-[#0A0A0A] data-[state=active]:text-[#2563EB] data-[state=active]:shadow-none data-[state=active]:bg-transparent">{t.label}</TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/* Dropdown menu anchored to a trigger. */
export type MenuItem = { label: string; icon?: Icon; onClick: () => void; danger?: boolean; disabled?: boolean } | 'sep';
export function Menu({ trigger, items, align = 'right', width = 200 }: { trigger: (open: () => void) => ReactNode; items: MenuItem[]; align?: 'left' | 'right'; width?: number }) {
  /* shadcn DropdownMenu. The wrapper is the trigger, so the caller's button needs no handler of its own. */
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild><span className="relative inline-flex" onClick={(e) => e.stopPropagation()}>{trigger(() => {})}</span></DropdownMenuTrigger>
      <DropdownMenuContent align={align === 'right' ? 'end' : 'start'} style={{ width }} onClick={(e) => e.stopPropagation()}>
        {items.map((it, i) => it === 'sep' ? <DropdownMenuSeparator key={i} /> : (
          <Fragment key={it.label}>
            {it.danger && i > 0 && items[i - 1] !== 'sep' && !(items[i - 1] as { danger?: boolean }).danger && <DropdownMenuSeparator />}
            <DropdownMenuItem disabled={it.disabled} onSelect={() => it.onClick()} variant={it.danger ? 'destructive' : 'default'} className="px-2.5">
              {it.icon && <it.icon size={16} />}{it.label}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* Stepper −  n  + */
export function Stepper({ value, onChange, min = 1, max = 99 }: { value: number; onChange: (n: number) => void; min?: number; max?: number }) {
  return (
    <div className="inline-flex h-8 rounded-lg border border-input bg-white overflow-hidden">
      <button type="button" aria-label="Fewer" onClick={() => onChange(Math.max(min, value - 1))} className="w-8 flex items-center justify-center text-[#737373] hover:bg-gray-50 border-r border-gray-200"><Minus size={13} /></button>
      <input aria-label="Count" value={value} onChange={(e) => { const n = parseInt(e.target.value, 10); if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n))); }} className="w-12 text-center text-sm outline-none" />
      <button type="button" aria-label="More" onClick={() => onChange(Math.min(max, value + 1))} className="w-8 flex items-center justify-center text-[#737373] hover:bg-gray-50 border-l border-gray-200"><Plus size={13} /></button>
    </div>
  );
}

/* ---- Shared checks (molades-attack, 2026-11-10). Money is digits with at most one point and two decimals;
   dates are "19 Sep 2027". A failed check shows its reason in words under the field and blocks Save. ---- */
export const isMoney = (v: string) => /^\d+(\.\d{1,2})?$/.test(v.trim());
export const isWhole = (v: string) => /^\d+$/.test(v.trim());
export const parseDay = (v: string) => { if (!/^\d{1,2} [A-Za-z]{3,9} \d{4}$/.test(v.trim())) return null; const t = Date.parse(v); return Number.isNaN(t) ? null : t; };
export const moneyErr = (v: string, what: string, { allowZero = false } = {}) => (!v.trim() ? `Enter ${what}.` : !isMoney(v) ? `${what[0].toUpperCase()}${what.slice(1).replace(/^(a|an) /, '')} must be a number, e.g. 168 or 168.50.` : !allowZero && +v <= 0 ? `${what[0].toUpperCase()}${what.slice(1).replace(/^(a|an) /, '')} must be more than £0.` : '');
export const rangeErr = (from: string, to: string) => { const a = parseDay(from), b = parseDay(to); return !a ? 'Enter Available from as a date, e.g. 19 Sep 2027.' : !b ? 'Enter Available to as a date, e.g. 24 Jul 2028.' : b <= a ? 'Available to must be after Available from.' : ''; };
export function FieldErr({ children }: { children?: ReactNode }) {
  return children ? <p className="text-xs text-[#C8102E] mt-1.5 flex items-center gap-1"><WarningCircle size={14} className="shrink-0" />{children}</p> : null;
}
/* Letters are dropped as you type; a malformed number like "1.2.3" is left as typed so the field can say what is wrong. */
const digits = (v: string) => v.replace(/[^0-9.]/g, '');

/* £ prefixed input with an optional suffix (/ wk). */
export function MoneyInput({ value, onChange, suffix, className, autoFocusRef }: { value: string; onChange: (v: string) => void; suffix?: string; className?: string; autoFocusRef?: React.Ref<HTMLInputElement> }) {
  return (
    <label className={cx('h-8 flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 text-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25', className)}>
      <span className="text-[#737373]">£</span>
      <input ref={autoFocusRef} value={value} inputMode="decimal" onChange={(e) => onChange(digits(e.target.value))} className="flex-1 min-w-0 outline-none bg-transparent" />
      {suffix && <span className="text-gray-400">{suffix}</span>}
    </label>
  );
}

/* Custom select that looks like the frames' (icon + value + ⇕). */
export function Picker<T extends string>({ value, onChange, options, icon: I, placeholder, footer, className }: { value: T | ''; onChange: (v: T) => void; options: { id: T; label: ReactNode; icon?: Icon }[]; icon?: Icon; placeholder?: string; footer?: ReactNode; className?: string }) {
  /* shadcn DropdownMenu as a rich select: options can carry icons, and a footer action sits under them. */
  const cur = options.find((o) => o.id === value);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className={cx('w-full h-8 rounded-lg border border-gray-300 bg-white px-2.5 text-sm flex items-center gap-2 text-left outline-none data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/25 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25', className)}>
        {I && <I size={14} className="text-gray-500" />}
        <span className={cx('flex-1 truncate', !cur && 'text-gray-400')}>{cur?.label ?? placeholder ?? 'Pick one'}</span>
        <CaretUpDown size={14} className="text-gray-400" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-72">
        {options.map((o) => (
          <DropdownMenuItem key={o.id} onSelect={() => onChange(o.id)} className="px-2.5 focus:bg-gray-50">
            {o.icon && <o.icon size={15} className="text-[#737373]" />}<span className="flex-1">{o.label}</span>{o.id === value && <Check size={13} className="text-primary" />}
          </DropdownMenuItem>
        ))}
        {footer && <div className="border-t border-line mt-1 pt-1">{footer}</div>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded border border-line bg-white text-xs text-[#737373] font-sans">{children}</kbd>;
}

/* Thin progress bar in primary or green. */
export function Progress({ value, tone = 'blue', className }: { value: number; tone?: 'blue' | 'green' | 'grey'; className?: string }) {
  return <div className={cx('h-1.5 rounded-full bg-gray-100 overflow-hidden', className)}><div className="h-full w-full rounded-full origin-left transition-transform duration-300 ease-snappy" style={{ transform: `scaleX(${Math.min(100, Math.max(0, value)) / 100})`, background: tone === 'green' ? '#0B8A4C' : tone === 'grey' ? '#D4D4D4' : '#2563EB' }} /></div>;
}

export function EditLink({ onClick, children = 'Edit' }: { onClick: () => void; children?: ReactNode }) {
  return <button type="button" onClick={onClick} className="-my-1 -mx-1.5 h-6 px-1.5 rounded-md text-xs font-medium text-primary hover:bg-[#EFF6FF] inline-flex items-center gap-1">{children}</button>;
}
export { PencilSimple };
