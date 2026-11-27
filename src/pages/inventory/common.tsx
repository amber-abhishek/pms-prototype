import { FooterZone } from '../../components/headerCtx';
import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { SlidersHorizontal, CaretLeft, CaretRight, CaretUpDown, Check, Funnel, X, CheckCircle, RadioButton, Minus, MinusCircle, PauseCircle, PencilSimple, Plus, MagnifyingGlass, WarningCircle, XCircle, Archive, Bed, Buildings, Door, DoorOpen, House, Key, Stack, type Icon } from '../../components/icons';
import { Avatar, Button, ConfirmFrame, IconTile as ToneTile, Pill, Status, avatarFx, cx, isConfirmTitle, noAutoFocus, toneFg } from '../../components/ui';
import type { Tone } from '../../data/seed';
import { Dialog, DialogBody, DialogCloseButton, DialogContent, DialogDescription, DialogFooter, DialogFrame, DialogTitle } from '../../components/shadcn/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/shadcn/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '../../components/shadcn/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/shadcn/popover';
import { invId, useInv, type PStatus, type Tag, type UStatus } from '../../data/inventory';
import { photoOf } from './photos';
import { Checkbox } from '../../components/shadcn/checkbox';

/* Status pills as the CMS frames draw them: Draft is a white outlined chip. */
export function PropStatus({ s }: { s: PStatus | UStatus | 'Running' | 'Queued' | 'Succeeded' | 'Failed' }) {
  /* Figma 3884:43935: Draft is the amber tag; Queued stays grey. */
  if (s === 'Draft') return <Status s="Draft" tone="amber" />;
  if (s === 'Queued') return <Status s="Queued" tone="grey" />;
  if (s === 'Active' || s === 'Succeeded') return <Status s={s} tone="green" icon={CheckCircle} />;
  if (s === 'Inactive') return <Status s="Inactive" tone="grey" icon={MinusCircle} />;
  if (s === 'Archived') return <Status s="Archived" tone="red" icon={Archive} />;
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
      {tags.slice(0, max).map((t) => { const c = tagColor(t); return <span key={t.label} className="inline-flex items-center h-5 px-1.5 rounded-[6px] tone-tag font-mono text-xs leading-4 font-medium uppercase whitespace-nowrap" style={toneFg(c)}>{t.label}</span>; })}
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
/** Level colour by its name, as in Figma 3933:51435: building blue, floor purple, flat amber, room green, studio orange. */
export function levelTone(name: string): Tone {
  const n = name.toLowerCase();
  if (/studio/.test(n)) return 'orange';
  if (/house|build|block|hall/.test(n)) return 'blue';
  if (/floor|level|storey/.test(n)) return 'purple';
  if (/flat|apartment|cluster/.test(n)) return 'amber';
  if (/room|bed/.test(n)) return 'green';
  return 'grey';
}
/** Icon for a level by its name, as on Property layouts, so a layout reads as a picture (the Units tree uses it too): building › floor › flat › room. */
export function levelIcon(name: string): Icon {
  const n = name.toLowerCase();
  if (/house/.test(n)) return House;
  if (/build|block|hall/.test(n)) return Buildings;
  if (/floor|level|storey/.test(n)) return Stack;
  if (/flat|apartment|cluster/.test(n)) return DoorOpen;
  if (/studio/.test(n)) return Door;
  if (/room|bed/.test(n)) return Bed;
  if (/tenanc|lease|contract/.test(n)) return Key;
  return Stack;
}
/** What a layout asks the build forms for: floors, flats, and what its bookable unit is called. A layout the
    Property layouts page no longer has falls back to the first one. */
export function useLayout(name: string) {
  const all = useInv((s) => s.structures);
  const st = all.find((x) => x.name === name) ?? all[0];
  const levels = (st?.levels ?? []).filter((l) => !/tenanc|lease|contract/i.test(l.name));
  const unit = levels.find((l) => l.bsu)?.name ?? levels[levels.length - 1]?.name ?? 'Room';
  return { name: st?.name ?? name, levels: levels.map((l) => l.name), unit, floors: levels.some((l) => /floor|level|storey/i.test(l.name)), flats: levels.some((l) => /flat|apartment|cluster/i.test(l.name)), kind: (/house/i.test(levels[0]?.name ?? '') ? 'House' : 'Building') as 'Building' | 'House' };
}

/** Property layout radio cards, one per layout on the Property layouts page: name, "Used by n", then its level pills. */
export function LayoutRadios({ value, onChange }: { value: string; onChange: (l: string) => void }) {
  const layouts = useInv((s) => s.structures);
  return (
    <div role="radiogroup" aria-label="Property layout" className="flex flex-col gap-2">
      {layouts.map((st) => { const s = st.name; return (
        <div key={st.id} role="radio" aria-checked={value === s} tabIndex={0} onClick={() => onChange(s)} onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && onChange(s)}
          className={cx('rounded-xl border p-4 flex gap-3 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring', value === s ? 'border-[#2563EB] bg-[#2563EB]/[0.03]' : 'border-[#E5E5E5] hover:bg-[#FAFAFA]')}>
          <span className={cx('size-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0', value === s ? 'border-[#2563EB] bg-[#2563EB]' : 'border-[#D4D4D4] bg-white')}>{value === s && <span className="size-1.5 rounded-full bg-white" />}</span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2"><span className="text-sm font-medium text-[#0A0A0A]">{s}</span><span className="text-xs text-[#737373]">{st.properties ? `Used by ${st.properties} ${st.properties === 1 ? 'property' : 'properties'}` : 'Not in use'}</span></div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">{st.levels.map((l, i) => <span key={i} className="flex items-center gap-1.5">{i > 0 && <CaretRight size={12} strokeWidth={1.5} className="text-[#A3A3A3]" />}<Pill tone={levelTone(l.name)}>{l.name}</Pill></span>)}</div>
          </div>
        </div>
      ); })}
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
        <FooterZone.Provider value><div className="h-16 shrink-0 border-t border-[#E5E5E5] px-6 flex items-center">{left}<div className="ml-auto flex items-center gap-2">{right}</div></div></FooterZone.Provider>
      </DialogContent>
    </Dialog>
  );
}

/** A modal in the side panels' language (2026-11-19, memory pms-panel-v2-design-language): a 61px control bar with the
 *  flow in mono caps (+ an optional "STEP 1 OF 5"), then the ✕; a hero (20px Medium title, one grey line); the body as
 *  SheetSection cards; a 64px footer with `left` (Cancel) and `right` (the action). */
export function PanelModal({ open, onClose, eyebrow, pos, title, meta, lead, icon: I, person, width = 640, left, right, children }: {
  open: boolean; onClose: () => void; eyebrow: string; pos?: string; title?: ReactNode; meta?: ReactNode; width?: number; left?: ReactNode; right?: ReactNode; children: ReactNode;
  /** The record's icon tile beside the headline, as in its panel's hero (2026-11-23). */ lead?: ReactNode;
  /** Every headline carries the record's mark (2026-11-24): `icon` draws the neutral 40px tile its panel hero uses,
   *  `person` the person's avatar; `lead` overrides both. */ icon?: Icon; person?: string;
}) {
  const mark = lead ?? (I ? <span className="size-10 shrink-0 rounded-[10px] flex items-center justify-center" style={avatarFx('#64748B')}><I size={20} strokeWidth={1.75} /></span>
    : person ? <Avatar name={person} size={40} /> : null);
  const EYEBROW = 'font-mono text-[11px] leading-4 font-medium uppercase tracking-[0.04em]';
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent aria-describedby={undefined} style={{ maxWidth: width }} {...noAutoFocus}>
        <div className="h-[61px] shrink-0 border-b border-[#E5E5E5] pl-6 pr-5 flex items-center gap-2">
          <DialogTitle className={cx(EYEBROW, 'flex-none w-auto text-[#737373]')}>{eyebrow}</DialogTitle>
          {pos && <><span aria-hidden className="text-xs text-[#A3A3A3]">·</span><span className={cx(EYEBROW, 'text-[#A3A3A3] tabular-nums')}>{pos}</span></>}
          <span aria-hidden className="flex-1" />
          <DialogCloseButton />
        </div>
        {/* 20px under the header rule, like every other dialog body (2026-11-20). */}
        <div className="flex-1 min-h-0 overflow-auto px-6 py-5">
          {/* No headline when it would only repeat the eyebrow (create modals, 2026-11-20). */}
          {title && (
            <div className="mb-4 flex items-center gap-3">
              {mark}
              <div className="min-w-0">
                <div className="text-xl leading-7 font-medium text-[#0A0A0A]">{title}</div>
                {meta && <p className="text-sm leading-5 text-[#737373]">{meta}</p>}
              </div>
            </div>
          )}
          {children}
        </div>
        <FooterZone.Provider value><div className="h-16 shrink-0 border-t border-[#E5E5E5] px-6 flex items-center gap-2">{left}<div className="ml-auto flex items-center gap-2">{right}</div></div></FooterZone.Provider>
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
      {/* Record panel tabs (2026-11-19): 24px apart from a 20px inset, 14px Medium label (grey, ink when picked; same weight so tabs never shift), a count after
          " · " in grey 12px mono, 2px ink underline, #E5E5E5 rule. */}
      <TabsList slide="underline" className={cx('flex h-auto justify-start gap-6 rounded-none bg-transparent p-0 px-5 border-b border-[#E5E5E5] [&>[data-slide-bar]]:bg-[#0A0A0A]', className)}>
        {tabs.map((t) => {
          const [label, ...count] = t.label.split(' · ');
          return (
            <TabsTrigger key={t.id} value={t.id} className="h-10 px-0 gap-1.5 rounded-none font-sans normal-case tracking-normal text-sm font-medium text-[#737373] hover:text-[#0A0A0A] data-[state=active]:text-[#0A0A0A] data-[state=active]:shadow-none data-[state=active]:bg-transparent">
              {label}{count.length > 0 && <span className="font-mono text-xs font-medium text-[#A3A3A3] tabular-nums">{count.join(' · ')}</span>}
            </TabsTrigger>
          );
        })}
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
/** `fill`: takes its column's width and the field height, so it lines up with the inputs beside it (bulk create, 2026-11-23). */
export function Stepper({ value, onChange, min = 1, max = 99, fill }: { value: number; onChange: (n: number) => void; min?: number; max?: number; fill?: boolean }) {
  return (
    <div className={fill ? 'flex w-full h-input rounded-lg border border-input bg-white overflow-hidden [&>input]:flex-1 [&>input]:min-w-0' : 'inline-flex h-8 rounded-lg border border-input bg-white overflow-hidden'}>
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

/* Picker's look with several choices (2026-11-26, Units' Property): ticks apply straight away; the top row clears them.
   The trigger names one pick, or how many; it is as wide as the longest name. */
export function MultiPicker({ value, onChange, options, icon: I, all, noun, className }: { value: string[]; onChange: (v: string[]) => void; options: { id: string; label: string }[]; icon?: Icon; all: string; noun: [string, string]; className?: string }) {
  const picked = options.filter((o) => value.includes(o.id));
  const text = !picked.length ? all : picked.length === 1 ? picked[0].label : `${picked.length} ${noun[1]}`;
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const row = 'w-full flex items-center gap-2.5 px-2.5 h-8 rounded-md text-sm text-left text-[#0A0A0A] hover:bg-gray-50 outline-none focus-visible:bg-gray-50';
  return (
    <Popover>
      <PopoverTrigger className={cx('w-full h-8 rounded-lg border border-gray-300 bg-white px-2.5 text-sm flex items-center gap-2 text-left outline-none data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/25 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25', className)}
        aria-label={`${noun[0][0].toUpperCase()}${noun[0].slice(1)}: ${text}`}>
        {I && <I size={14} className="text-gray-500" />}
        {/* Every label stacked unseen in one grid cell, so the trigger is as wide as the longest and never truncates or jumps. */}
        <span className="flex-1 min-w-0 grid">
          {[all, ...options.map((o) => o.label)].map((l) => <span key={l} aria-hidden className="col-start-1 row-start-1 invisible whitespace-nowrap">{l}</span>)}
          <span className="col-start-1 row-start-1 truncate">{text}</span>
        </span>
        <CaretUpDown size={14} className="text-gray-400" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-1 max-h-72 overflow-y-auto">
        <button type="button" onClick={() => onChange([])} className={row}><span className="flex-1">{all}</span>{!value.length && <Check size={13} className="text-primary" />}</button>
        <div className="h-px bg-[#E5E5E5] my-1" />
        {options.map((o) => (
          <label key={o.id} className={cx(row, 'cursor-pointer')}>
            <Checkbox checked={value.includes(o.id)} onCheckedChange={() => toggle(o.id)} />
            <span className="flex-1 truncate">{o.label}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
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
  return <button type="button" onClick={onClick} className="-my-1 -mx-1.5 h-6 px-1.5 rounded-md text-sm font-medium text-primary hover:bg-[#EFF6FF] inline-flex items-center gap-1">{children}</button>;
}
export { PencilSimple };
/* A section in edit mode (2026-11-20): grey Cancel throws the edit away, blue Save keeps it. Replaces the Edit link. */
export function EditActions({ onCancel, onSave, save = 'Save' }: { onCancel: () => void; onSave: () => void; save?: string }) {
  return (
    <span className="flex items-center gap-3">
      <button type="button" onClick={onCancel} className="-my-1 -mx-1.5 h-6 px-1.5 rounded-md text-sm font-medium text-[#525252] hover:bg-[#F0F0F0]">Cancel</button>
      <EditLink onClick={onSave}>{save}</EditLink>
    </span>
  );
}

/* Add a tag, Notion style (2026-11-18): type to filter the workspace's tags; when nothing matches the text exactly,
   a last row offers "Create <text>", which adds it to the workspace tags (Setup › Tags) in the next free colour and
   puts it on the record. Enter takes the highlighted row; ↑ ↓ move. */
const NEW_TAG_TONES: Tone[] = ['blue', 'green', 'purple', 'orange', 'amber', 'red', 'grey'];
/** Add tag trigger (Figma "Add tag"): a 20px dashed r6 chip with a plus and TAG in mono caps, the same height as the tag pills beside it. Pass as TagPicker's trigger. */
export const addTagChip = (label = 'Tag') => (
  <button type="button" aria-label="Add tag" className="h-5 px-1.5 inline-flex items-center gap-0.5 rounded-md border border-dashed border-[#A3A3A3] text-[#737373] hover:text-[#0A0A0A] hover:border-[#737373] hover:bg-[#F5F5F5] font-mono text-[11px] leading-4 font-medium uppercase tracking-[0.04em] transition-colors">
    <Plus size={12} />{label}
  </button>
);

/** Figma "Tag picker (open)" 4052:17322: a 248px r12 popover. Search row (40px, grey magnifier), then the workspace tags as
 *  pills; tags already on the record show a blue check and, with onRemove, click off. Below a divider, "Create" previews
 *  the new tag as a pill in the colour it will get. */
export function TagPicker({ have, onPick, onRemove, trigger }: { have: Tag[]; onPick: (t: Tag, created: boolean) => void; onRemove?: (t: Tag) => void; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const all = useInv((st) => st.tags);
  const text = q.trim();
  const on = (t: Tag) => have.some((x) => x.label.toLowerCase() === t.label.toLowerCase());
  const pool = onRemove ? all : all.filter((t) => !on(t));
  const shown = pool.filter((t) => t.label.toLowerCase().includes(text.toLowerCase()));
  const exact = all.some((t) => t.label.toLowerCase() === text.toLowerCase());
  const canCreate = !!text && !exact;
  const rows = shown.length + (canCreate ? 1 : 0);
  const used = all.map((t) => t.tone);
  const nextTone = NEW_TAG_TONES.find((x) => !used.includes(x)) ?? NEW_TAG_TONES[all.length % NEW_TAG_TONES.length];
  const close = () => { setOpen(false); setQ(''); setHi(0); };
  const pick = (t: Tag) => {
    if (on(t)) { onRemove?.(have.find((x) => x.label.toLowerCase() === t.label.toLowerCase())!); return; }
    onPick({ label: t.label, tone: t.tone }, false); close();
  };
  const create = () => {
    useInv.getState().set('tags', (l) => [...l, { id: invId('tg'), label: text, tone: nextTone }]);
    onPick({ label: text, tone: nextTone }, true); close();
  };
  const choose = (i: number) => (i < shown.length ? pick(shown[i]) : canCreate && create());
  return (
    <Popover open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-[248px] p-0 overflow-hidden rounded-xl border-[#E5E5E5] shadow-[0_8px_24px_rgba(0,0,0,0.12)]" onClick={(e) => e.stopPropagation()}>
        <label className="h-10 px-3 flex items-center gap-2 border-b border-[#E5E5E5]">
          <MagnifyingGlass size={14} className="shrink-0 text-[#A3A3A3]" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setHi(0); }} placeholder="Find or create a tag" aria-label="Find or create a tag"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(rows - 1, h + 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
              else if (e.key === 'Enter' && rows) { e.preventDefault(); choose(hi); }
            }}
            className="flex-1 min-w-0 h-full text-sm text-[#0A0A0A] caret-primary outline-none bg-transparent placeholder:text-[#A3A3A3]" />
        </label>
        <div role="listbox" aria-label="Tags" className="max-h-[248px] overflow-auto p-1 flex flex-col gap-0.5">
          {!rows && <div className="h-8 px-2 flex items-center text-sm text-[#737373]">{pool.length ? 'No tags match' : 'Type to create a tag'}</div>}
          {shown.map((t, i) => (
            <button key={t.label} type="button" role="option" aria-selected={on(t)} onMouseEnter={() => setHi(i)} onClick={() => pick(t)}
              className={cx('w-full h-8 shrink-0 px-2 rounded-lg flex items-center gap-2 text-left', hi === i && 'bg-[#F5F5F5]')}>
              <Tags tags={[t]} /><span className="flex-1" />{on(t) && <Check size={14} weight="bold" className="shrink-0 text-primary" />}
            </button>
          ))}
          {canCreate && <>
            {shown.length > 0 && <div aria-hidden className="h-px shrink-0 bg-[#EBEBEB]" />}
            <button type="button" role="option" aria-selected={false} onMouseEnter={() => setHi(shown.length)} onClick={create}
              className={cx('w-full h-8 shrink-0 px-2 rounded-lg flex items-center gap-2 text-left text-sm text-[#737373] min-w-0', hi === shown.length && 'bg-[#F5F5F5]')}>
              <span className="shrink-0">Create</span><span className="min-w-0 truncate"><Tags tags={[{ label: text, tone: nextTone }]} /></span>
            </button>
          </>}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Up to three overlapping cover photos, then a label; the names show on hover. */
export function PropStack({ props, label }: { props: { id: string; name: string }[]; label: ReactNode }) {
  return (
    <span className="flex items-center gap-2.5 min-w-0">
      <span className="flex shrink-0">
        {props.slice(0, 3).map((p, i) => {
          const src = photoOf(p.id);
          return src
            ? <img key={p.id + i} src={src} alt="" className={cx('size-6 rounded-md object-cover ring-2 ring-white', i > 0 && '-ml-2')} />
            : <span key={p.id + i} className={cx('size-6 rounded-md bg-[#F5F5F5] ring-2 ring-white grid place-items-center', i > 0 && '-ml-2')}><Buildings size={12} className="text-[#737373]" /></span>;
        })}
      </span>
      <span className="min-w-0 truncate text-[#0A0A0A]" title={props.map((p) => p.name).join(', ')}>{label}</span>
    </span>
  );
}



/* Filter (2026-11-26), the Allocations queue's panel: active filters first, each with ×, then a "Filter by…" search and
   every field in groups. A field opens its options (one choice, or several to tick) with Apply; Back returns. A 6px
   blue dot on the button's icon marks applied filters (no count, no chip row).
   Typed fields (2026-11-26, custom fields): a field with a `kind` picks an operator first, then its value; its value is
   [op, ...args]. Choice: is / is not / is empty / is not empty; Number: is / more than / less than / is empty; Text:
   contains / is / is empty; Yes / no: Yes / No / is empty. A field without a kind is the plain pick-from-list. */
export type RuleKind = 'choice' | 'number' | 'text' | 'yesno';
export type RuleField = { id: string; label: string; group: string; icon: Icon; /** Its icon tile's colour; by position when unset. */ tone?: Tone; options: { value: string; label?: string; meta?: number }[]; multi?: boolean; kind?: RuleKind;
  /** Kept behind one row of this name (Custom fields ›) so the main list stays short; a search still finds it (2026-11-26). */ nest?: string };
const RULE_TONES: Tone[] = ['blue', 'green', 'purple', 'amber', 'orange', 'red'];
const RULE_OPS: Record<RuleKind, [string, string][]> = {
  choice: [['is', 'is'], ['not', 'is not'], ['empty', 'is empty'], ['filled', 'is not empty']],
  number: [['eq', 'is'], ['gt', 'more than'], ['lt', 'less than'], ['empty', 'is empty']],
  text: [['has', 'contains'], ['eq', 'is'], ['empty', 'is empty']],
  yesno: [['yes', 'is Yes'], ['no', 'is No'], ['empty', 'is empty']],
};
const NO_ARG = ['empty', 'filled', 'yes', 'no'];
/** Does a record's value pass a typed rule? `v` is the record's raw value ('' or undefined when it has none). */
export function ruleMatch(kind: RuleKind, rule: string[], v: string | number | undefined | null): boolean {
  const [op, ...args] = rule;
  const s = v == null ? '' : String(v).trim();
  if (op === 'empty') return !s;
  if (op === 'filled') return !!s;
  if (kind === 'yesno') return s === op;
  if (kind === 'choice') return op === 'not' ? !args.includes(s) : args.includes(s);
  if (kind === 'number') { if (!s) return false; const n = +s, a = +args[0]; return op === 'gt' ? n > a : op === 'lt' ? n < a : n === a; }
  const t = s.toLowerCase(), a = (args[0] ?? '').trim().toLowerCase();
  return op === 'eq' ? t === a : t.includes(a);
}
export function RuleFilter({ fields, value, onChange, focus, compact }: {
  fields: RuleField[]; value: Record<string, string[]>; onChange: (id: string, v: string[]) => void;
  /** Icon only (32px square), for a toolbar squeezed by a side panel; the dot still marks applied filters. */ compact?: boolean;
  /** Open the panel on one field's editor (a column header's "Filter"); `n` changes on every ask. */ focus?: { id: string; n: number } | null;
}) {
  const [open, setOpen] = useState(false);
  /* Coloured icon tiles (2026-11-26), as the Pricing rows: each field keeps its own colour, set or by its place in the list. */
  const toneOf = (f: RuleField): Tone => f.tone ?? RULE_TONES[Math.max(0, fields.indexOf(f)) % RULE_TONES.length];
  const [edit, setEdit] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [sub, setSub] = useState<string | null>(null);
  useEffect(() => { if (focus) { setOpen(true); setEdit(focus.id); } }, [focus?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  const active = fields.filter((f) => (value[f.id]?.length ?? 0) > 0);
  const name = (f: RuleField, x: string) => f.options.find((o) => o.value === x)?.label ?? x;
  const describe = (f: RuleField) => {
    const vs = value[f.id] ?? [];
    if (f.kind) {
      const [op, ...args] = vs; const opL = RULE_OPS[f.kind].find(([k]) => k === op)?.[1] ?? op;
      if (NO_ARG.includes(op)) return `${f.label} ${opL}`;
      if (f.kind === 'text') return `${f.label} ${opL} “${args[0]}”`;
      return `${f.label} ${opL} ${args.length > 2 ? `${name(f, args[0])} +${args.length - 1}` : args.map((x) => name(f, x)).join(', ')}`;
    }
    return `${f.label} is ${vs.length > 2 ? `${name(f, vs[0])} +${vs.length - 1}` : vs.map((x) => name(f, x)).join(', ')}`;
  };
  const field = fields.find((f) => f.id === edit);
  /* The main list holds the plain fields and one row per nest; a nest's page (or any search) lists its fields by group. */
  const ql = q.trim().toLowerCase();
  const pool = fields.filter((f) => (sub ? f.nest === sub : ql ? true : !f.nest) && f.label.toLowerCase().includes(ql));
  const groups = [...new Set(pool.map((f) => f.group))].map((g, i) => ({ g, i, items: pool.filter((f) => f.group === g) }));
  const nests = sub || ql ? [] : [...new Set(fields.map((f) => f.nest).filter((x): x is string => !!x))];
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEdit(null); setQ(''); setSub(null); } }}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={compact ? 'Filter' : undefined} title={compact ? 'Filter' : undefined} className={cx(compact ? 'w-8 justify-center' : 'px-3', 'shrink-0 h-8 rounded-lg border border-[#E5E5E5] bg-white text-sm font-medium text-[#404040] flex items-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:bg-[#F5F5F5] data-[state=open]:bg-[#F5F5F5] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring')}>
          <span className="relative flex">
            <Funnel size={16} strokeWidth={1.75} />
            {active.length > 0 && <span aria-hidden className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-[#2563EB] ring-2 ring-white" />}
          </span>
          {!compact && 'Filter'}{active.length > 0 && <span className="sr-only">, {active.length} applied</span>}
        </button>
      </PopoverTrigger>
      {/* Focus moving elsewhere doesn't shut it (a column's menu opens it and hands focus back); a click outside still does. */}
      <PopoverContent align="end" className="w-[300px] p-0 rounded-[10px] overflow-hidden" onFocusOutside={(e) => e.preventDefault()}>
        {field ? <RuleEditor key={field.id} field={field} tone={toneOf(field)} cur={value[field.id] ?? []} fromActive={active.includes(field)} onBack={() => setEdit(null)}
          onApply={(v) => { onChange(field.id, v); setEdit(null); setOpen(false); }} /> : (
          <div className="max-h-[520px] overflow-auto pb-2">
            {sub && (
              <div className="h-11 px-3 flex items-center gap-2 border-b border-[#F5F5F5] text-sm">
                <BackCrumb label="Filters" onClick={() => { setSub(null); setQ(''); }} />
                <span className="font-medium truncate">{sub}</span>
              </div>
            )}
            {/* The search is the panel's top row (2026-11-26): no box of its own, a rule under it, its icon in line with the
                field icons below; it stays in view while the list scrolls. */}
            <label className="sticky top-0 z-[1] h-11 px-4 flex items-center gap-2 bg-white border-b border-[#F5F5F5] text-sm">
              <MagnifyingGlass size={16} className="shrink-0 text-gray-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={sub ? `Search ${sub.toLowerCase()}` : 'Filter by…'} className="flex-1 min-w-0 outline-none bg-transparent placeholder:text-gray-400" />
              {q && <button type="button" aria-label="Clear search" onClick={() => setQ('')} className="size-5 shrink-0 rounded hover:bg-gray-100 flex items-center justify-center text-gray-400"><X size={12} /></button>}
            </label>
            {/* Active filters only while there are some. */}
            {!sub && !q && active.length > 0 && <>
              <div className="px-3 pt-3 pb-1 text-[11px] font-medium text-gray-400">Active filters</div>
              {active.map((f) => (
                <div key={f.id} className="mx-2 flex items-center gap-2 h-9 px-2 rounded-md hover:bg-[#F5F5F5]">
                  <button type="button" className="flex-1 min-w-0 text-left text-sm text-ink truncate flex items-center gap-2" onClick={() => setEdit(f.id)}><ToneTile icon={f.icon} tone={toneOf(f)} size={24} /><span className="truncate">{describe(f)}</span></button>
                  <button type="button" aria-label={`Remove ${f.label}`} onClick={() => onChange(f.id, [])} className="size-6 rounded hover:bg-gray-200 flex items-center justify-center text-gray-500"><X size={12} /></button>
                </div>
              ))}
              <div className="border-t border-[#F5F5F5] mt-2" />
            </>}
            {groups.map(({ g, i, items }) => (
              <div key={g} className={i === 0 ? 'mt-2' : 'mt-1'}>
                <div className="px-3 py-1 text-[11px] font-medium text-gray-400">{g}</div>
                {items.map((f) => (
                  <button key={f.id} type="button" onClick={() => setEdit(f.id)} className="w-[calc(100%-16px)] mx-2 h-9 px-2 rounded-md hover:bg-[#F5F5F5] flex items-center gap-2.5 text-sm text-ink">
                    <ToneTile icon={f.icon} tone={toneOf(f)} size={24} /><span className="truncate">{f.label}</span>
                    {active.includes(f) ? <Check size={14} className="ml-auto shrink-0 text-primary" /> : <CaretRight size={12} className="ml-auto shrink-0 text-gray-400" />}
                  </button>
                ))}
              </div>
            ))}
            {nests.map((n) => {
              const inN = fields.filter((f) => f.nest === n), on = inN.filter((f) => active.includes(f)).length;
              return (
                <div key={n} className="mt-2 pt-2 border-t border-[#F5F5F5]">
                  <button type="button" onClick={() => setSub(n)} className="w-[calc(100%-16px)] mx-2 h-9 px-2 rounded-md hover:bg-[#F5F5F5] flex items-center gap-2.5 text-sm text-ink">
                    {/* A toned tile like the fields above it (2026-11-27). */}<ToneTile icon={SlidersHorizontal} tone="grey" size={24} /><span className="truncate">{n}</span>
                    <span className="ml-auto font-mono text-xs text-gray-400 tabular-nums">{on ? `${on} on · ` : ''}{inN.length}</span>
                    <CaretRight size={12} className="shrink-0 text-gray-400" />
                  </button>
                </div>
              );
            })}
            {!pool.length && !nests.length && <div className="px-3 py-2 text-sm text-gray-400">No fields match</div>}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
/* Back in a filter panel (2026-11-26): a breadcrumb, "‹ Filters /", where it goes named instead of a bare arrow. */
function BackCrumb({ label, onClick }: { label: string; onClick: () => void }) {
  return <>
    <button type="button" onClick={onClick} className="-ml-1 h-7 pl-1 pr-2 shrink-0 rounded-md flex items-center gap-0.5 text-sm text-[#737373] hover:bg-[#F5F5F5] hover:text-ink whitespace-nowrap"><CaretLeft size={14} />{label}</button>
    <span aria-hidden className="shrink-0 text-[#D4D4D4]">/</span>
  </>;
}
function RuleEditor({ field, tone, cur, fromActive, onBack, onApply }: { field: RuleField; /** The field's tile colour in the list, kept here. */ tone: Tone; cur: string[]; fromActive: boolean; onBack: () => void; onApply: (v: string[]) => void }) {
  const kind = field.kind;
  /* Typed: cur is [op, ...args]; plain: cur is the picked values. */
  const [op, setOp] = useState(kind ? cur[0] ?? RULE_OPS[kind][0][0] : '');
  const [vs, setVs] = useState<string[]>(kind ? cur.slice(1) : cur);
  const [q, setQ] = useState('');
  const opts = field.options.filter((o) => (o.label ?? o.value).toLowerCase().includes(q.trim().toLowerCase()));
  const noArg = !!kind && NO_ARG.includes(op);
  const multi = field.multi || kind === 'choice';
  const ready = noArg || (kind === 'number' ? vs[0] != null && vs[0].trim() !== '' && !Number.isNaN(+vs[0]) : kind === 'text' ? !!vs[0]?.trim() : vs.length > 0);
  const apply = () => { if (ready) onApply(kind ? [op, ...(noArg ? [] : vs)] : vs); };
  const showList = !kind || (kind === 'choice' && !noArg);
  return (
    <div>
      <div className="h-11 px-3 flex items-center gap-2 border-b border-[#F5F5F5] text-sm">
        {/* One line: the trail never wraps; a long field name truncates instead. */}
        <BackCrumb label={fromActive ? 'Active filters' : 'Filters'} onClick={onBack} />
        <ToneTile icon={field.icon} tone={tone} size={24} /><span className="min-w-0 font-medium truncate" title={field.label}>{field.label}</span>
      </div>
      {kind === 'yesno' && (
        /* Yes / no reads as a pick-one list (2026-11-26): Yes, No, or Empty, each a radio row, like a choice field's values. */
        <div className="py-2">
          {([['yes', 'Yes'], ['no', 'No'], ['empty', 'Empty']] as const).map(([k, l]) => (
            <label key={k} className="mx-2 h-8 px-2 rounded-md hover:bg-[#F5F5F5] flex items-center gap-2.5 text-sm cursor-pointer">
              <input type="radio" name={field.id} checked={op === k} onChange={() => setOp(k)} className="size-4 rounded accent-primary" />
              <span className={cx('flex-1', k === 'empty' && 'text-[#737373]')}>{l}</span>
            </label>
          ))}
        </div>
      )}
      {kind && kind !== 'yesno' && (
        /* Conditions as radio rows (2026-11-26), like Yes / no: the picked one that takes a value grows its box in the
           row (a number or text). A choice field's values follow under a rule when the condition needs them. */
        <div role="radiogroup" aria-label="Condition" className="py-2">
          {RULE_OPS[kind].map(([k, l]) => {
            const on = op === k, arg = !NO_ARG.includes(k) && (kind === 'number' || kind === 'text');
            return (
              <label key={k} className="mx-2 h-9 px-2 rounded-md hover:bg-[#F5F5F5] flex items-center gap-2.5 text-sm cursor-pointer">
                <input type="radio" name={`${field.id}-op`} checked={on} onChange={() => setOp(k)} className="size-4 shrink-0 rounded accent-primary" />
                <span className={cx('whitespace-nowrap', k === 'empty' || k === 'filled' ? 'text-[#737373]' : 'text-ink')}>{l[0].toUpperCase() + l.slice(1)}</span>
                {on && arg && (
                  <input aria-label={`${l} value`} inputMode={kind === 'number' ? 'decimal' : undefined} value={vs[0] ?? ''} ref={(el) => el?.focus({ preventScroll: true })}
                    onChange={(e) => setVs([e.target.value])} onKeyDown={(e) => e.key === 'Enter' && apply()} onClick={(e) => e.preventDefault()}
                    placeholder={kind === 'number' ? '0' : 'Text'}
                    className="ml-auto w-[120px] h-7 px-2 rounded-md border border-input bg-white text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25" />
                )}
              </label>
            );
          })}
        </div>
      )}
      {kind === 'choice' && !noArg && <div className="border-t border-[#F5F5F5]" />}
      {showList && (
        <div className="py-2 max-h-[300px] overflow-auto">
          {field.options.length > 8 && (
            <label className="mx-3 mb-1 h-8 flex items-center gap-2 px-2 rounded-lg border border-line text-sm">
              <MagnifyingGlass size={14} className="text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${field.label.toLowerCase()}`} className="flex-1 outline-none bg-transparent placeholder:text-gray-400" />
            </label>
          )}
          {opts.map((o) => (
            <label key={o.value} className="mx-2 h-8 px-2 rounded-md hover:bg-[#F5F5F5] flex items-center gap-2.5 text-sm cursor-pointer">
              {multi
                ? <Checkbox checked={vs.includes(o.value)} onCheckedChange={(c) => setVs(c === true ? [...vs, o.value] : vs.filter((x) => x !== o.value))} />
                : <input type="radio" name={field.id} checked={vs[0] === o.value} onChange={() => setVs([o.value])} className="size-4 rounded accent-primary" />}
              <span className="flex-1">{o.label ?? o.value}</span>{o.meta != null && <span className="text-xs text-gray-400 tabular-nums">{o.meta}</span>}
            </label>
          ))}
          {!opts.length && <div className="px-3 py-1.5 text-sm text-gray-400">No options</div>}
        </div>
      )}
      <div className="h-12 px-3 flex items-center gap-2 border-t border-[#F5F5F5]">
        <span className="text-xs text-gray-500">{kind === 'yesno' ? (op === 'empty' ? 'Empty' : op === 'yes' ? 'Yes' : 'No') : !showList ? '' : multi ? `${vs.length} selected` : vs.length ? name1(field, vs[0]) : 'Pick one'}</span>
        {/* Clear (2026-11-26): takes the filter off when it's applied, else just empties the ticks; beside Apply. */}
        <div className="ml-auto flex items-center gap-2">
          {(cur.length > 0 || vs.length > 0) && <Button size="sm" variant="danger-ghost" icon={null} onClick={() => (cur.length ? onApply([]) : setVs([]))}>Clear</Button>}
          <Button size="sm" variant="primary" disabled={!ready} onClick={apply}>Apply</Button>
        </div>
      </div>
    </div>
  );
}
const name1 = (f: RuleField, x: string) => f.options.find((o) => o.value === x)?.label ?? x;
