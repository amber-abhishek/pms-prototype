import { Badge } from '../../components/shadcn/badge';
import { Illustration, type Illo } from '../../components/Illustration';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowCounterClockwise, CaretUpDown, Check, Image, type Icon } from '../../components/icons';
import { Button, ConfirmFrame, Tabs, TitleH1, cx, PIN, isConfirmTitle, noAutoFocus } from '../../components/ui';
import { Dialog, DialogContent, DialogFrame } from '../../components/shadcn/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/shadcn/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '../../components/shadcn/command';
import type { Tone } from '../../data/seed';
import { PHOTO } from '../inventory/photos';

/** Big title + description used at the top of every off-campus page. */
export function Title({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    /* No visible page heading (as Amber Connect): the title is screen-reader only, its actions keep a toolbar row. */
    children ? <div {...PIN} className="px-[var(--tx,16px)] py-4 flex items-center gap-4"><TitleH1 className="sr-only">{title}</TitleH1>{sub && <span className="sr-only">{sub}</span>}<div className="ml-auto flex items-center gap-2">{children}</div></div>
      : <TitleH1 className="sr-only">{title}</TitleH1>
  );
}

/** Underline tabs (HMO / Amber PBSA, Portal settings sections). */
/* Dummy listing photos: the stock property set. The n-th listing's cover is photo n; its other photos cycle on after it. */
const LISTING_PHOTOS = Object.values(PHOTO);
export const listingPhoto = (n: number, i = 0) => LISTING_PHOTOS[(Math.max(0, n) + i) % LISTING_PHOTOS.length];

/** Photo tile; a grey placeholder when there is no src. */
export function Thumb({ tint = '#E8EEF6', w = 40, h = 28, size = 12, src }: { tint?: string; w?: number; h?: number; size?: number; src?: string }) {
  if (src) return <img src={src} alt="" className="rounded-md shrink-0 object-cover bg-[#F5F5F5]" style={{ width: w, height: h }} />;
  return <span className="inline-flex items-center justify-center rounded-md shrink-0" style={{ width: w, height: h, background: tint }}><Image size={size} className="text-gray-400" /></span>;
}

/** The "See details" text action at the end of a row. */
export const RowLink = ({ onClick, children = 'See details' }: { onClick: () => void; children?: ReactNode }) => (
  <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} className="h-7 px-2.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-[#F5F5F5]">{children}</button>
);

const toneTile: Record<'blue' | 'green' | 'grey' | 'red', string> = { blue: 'bg-[#D9E3FF] text-primary', green: 'bg-[#E8F7EE] text-[#0B8A4C]', grey: 'bg-[#F5F5F5] text-gray-500', red: 'bg-[#FFE4E8] text-[#E0243A]' };

/** Confirm/compose dialog as drawn in the flows: icon tile, title, description, body, grey footer. */
export function ODialog({ open, onClose, title, sub, children, footer, width, confirm }: {
  open: boolean; onClose: () => void; icon?: Icon; tone?: keyof typeof toneTile; title: string; sub?: ReactNode; children?: ReactNode; footer: ReactNode; width?: number;
  /** Confirmation look (ConfirmFrame): safe choice left, the action right at normal width, no icons. Defaults on for a question title. */ confirm?: boolean;
}) {
  /* shadcn Dialog. */
  const c = confirm ?? isConfirmTitle(title);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ maxWidth: width ?? (c ? 440 : 520) }} {...(sub ? {} : { 'aria-describedby': undefined })} {...(c ? noAutoFocus : {})}>
        {c ? <ConfirmFrame title={title} sub={sub} footer={footer}>{children}</ConfirmFrame> : <DialogFrame title={title} sub={sub} footer={footer}>{children}</DialogFrame>}
      </DialogContent>
    </Dialog>
  );
}

/** A dialog that collects a note. `required` blocks submit on an empty note. */
export function NoteDialog({ open, onClose, icon, title, sub, label, optional, placeholder, initial, submit, onSubmit, danger }: {
  open: boolean; initial?: string; onClose: () => void; icon: Icon; title: string; sub: string; label: string; optional?: boolean; placeholder?: string;
  submit: string; onSubmit: (text: string) => void; danger?: boolean;
}) {
  const [text, setText] = useState('');
  const [err, setErr] = useState(false);
  const busy = useRef(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (open) { setText(initial ?? ''); setErr(false); busy.current = false; setTimeout(() => ref.current?.focus(), 0); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const go = () => {
    if (busy.current) return;
    if (!optional && !text.trim()) { setErr(true); ref.current?.focus(); return; }
    busy.current = true;
    onSubmit(text.trim());
  };
  return (
    <ODialog confirm width={480} open={open} onClose={onClose} icon={icon} tone={danger ? 'red' : optional ? 'grey' : 'blue'} title={title} sub={sub}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} icon={null} onClick={go}>{submit}</Button></>}>
      <label className="block">
        <span className="block text-sm font-medium text-ink mb-1.5">{label}{optional && <span className="ml-1.5 text-xs font-normal text-[#737373]">(optional)</span>}</span>
        <textarea ref={ref} rows={4} value={text} placeholder={placeholder} onChange={(e) => { setText(e.target.value); setErr(false); }} className={cx('w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 placeholder:text-gray-400 min-h-[88px]', err && 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/25')} />
        {err && <span className="block text-xs text-[#E0243A] mt-1">A message is required.</span>}
      </label>
    </ODialog>
  );
}

/** Plain pill without a leading icon, or with one. */
export function Tag({ tone, icon: I, children, outline }: { tone: Tone; icon?: Icon; children: ReactNode; outline?: boolean }) {
  return <Badge tone={outline ? 'grey' : tone} look={outline ? 'outline' : 'soft'}>{I && <I size={12} />}{children}</Badge>;
}

/** Typeahead combobox used for the Partner region override. */
/** Partner region picker (2026-11-24). The trigger names the region the campus actually uses and how it got it:
 *  "Durham · auto" (nearest match) or "Newcastle · manual" (picked here). The list ticks the current region and, once
 *  one was picked by hand, offers "Reset to nearest" to go back to the automatic match. */
export function Combo({ value, auto, options, onPick, icon: I }: { /** The region picked by hand, if any. */ value: string | null; /** The nearest region, found automatically. */ auto: string | null; options: string[]; onPick: (v: string | null) => void; icon?: Icon }) {
  /* shadcn Combobox: Popover + Command, so the list filters as you type and arrow keys move through it. */
  const [open, setOpen] = useState(false);
  const pick = (v: string | null) => { onPick(v); setOpen(false); };
  const current = value ?? auto;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger aria-label="Partner region" className="w-[248px] h-8 flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 text-sm text-left outline-none data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/25 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25">
        {I && <I size={14} className="shrink-0 text-gray-500" />}
        <span className="flex-1 min-w-0 truncate">
          {current ? <>{current}<span className="text-[#737373]"> · {value ? 'manual' : 'auto'}</span></> : <span className="text-[#737373]">Pick a region</span>}
        </span>
        <CaretUpDown size={14} className="shrink-0 text-gray-400" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] p-0">
        <Command>
          <CommandInput placeholder="Find a region" />
          <CommandList className="p-1">
            <CommandEmpty className="px-2 h-8 flex items-center text-sm text-[#737373]">No region matches</CommandEmpty>
            {value && <CommandItem value={`__reset ${auto ?? ''}`} onSelect={() => pick(null)}><ArrowCounterClockwise size={14} className="text-gray-500" /><span className="flex-1">Reset to nearest</span>{auto && <span className="text-xs text-[#737373]">{auto}</span>}</CommandItem>}
            {options.map((o) => (
              <CommandItem key={o} value={o} onSelect={() => pick(o === auto && !value ? null : o)}>
                <span className="flex-1 truncate">{o}</span>
                {o === auto && <span className="text-xs text-[#737373]">nearest</span>}
                {o === current && <Check size={14} className="text-primary" />}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** The bulk footer while rows are ticked (2026-11-27): the Units page's footer, not a floating dark bar. A 59px bar
 *  across the foot of the list, in line with the sidebar profile: "N selected" on the left, then Clear in red and the
 *  bulk actions on the right. The list above it is the flex-1 part, so it shrinks to make room. */
export function BulkBar({ count, children, onClear }: { count: number; children: ReactNode; onClear: () => void }) {
  if (!count) return null;
  return (
    <div role="toolbar" aria-label="Selection" className="h-[59px] shrink-0 px-6 flex items-center gap-3 border-t border-[#E5E5E5] bg-white text-sm text-[#737373]">
      <span className="text-ink font-medium tabular-nums whitespace-nowrap">{count} selected</span>
      <span className="ml-auto shrink-0 flex items-center gap-2">
        <Button size="sm" variant="danger-ghost" icon={null} onClick={onClear}>Clear</Button>
        {children}
      </span>
    </div>
  );
}

/** A bulk action in the BulkBar: a small primary button, as Edit units on the Units footer. */
export const BulkAction = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => (
  <Button size="sm" variant="primary" icon={null} onClick={onClick}>{children}</Button>
);

/** Figma empty-state illustration (Workspace · Empty states). */
export function EmptyArt({ art }: { art: Illo }) {
  return <Illustration name={art} />;
}

/** Small segmented buttons (Enquiries source): selected is a white bordered button, the rest are ghost. */

/** Off-campus queues (Figma 4159:17418, 2026-11-23): one row of underline status tabs, each with its count. The right end holds
 *  the search, or `aside` (Approvals puts its Owners / Listings switch there and the search in the header). */
export function StatusTabsBar<T extends string>({ value, onChange, tabs, search, aside }: { value: T; onChange: (v: T) => void; tabs: { id: T; label: string; count: number }[]; search?: ReactNode; aside?: ReactNode }) {
  return (
    /* The folder-tab band (Connect 2.0 3095:25465, 2026-11-24): the row is the band, see styles.css [data-tab-band]. */
    <div {...PIN} className="shrink-0 px-[var(--tx,16px)] flex items-stretch gap-3">
      <div className="min-w-0"><Tabs value={value} onChange={onChange} tabs={tabs} /></div>
      {aside ? <div className="ml-auto self-center shrink-0">{aside}</div>
        : search ? <div className="ml-auto self-center w-[240px] min-w-[140px] shrink [&>label]:!w-full">{search}</div> : null}
    </div>
  );
}

/* ---------- Approvals queue toolbar (Figma 4159:17532 "V3", 2026-11-23) ---------- */
/** Days since a relative stamp the seeds use ("12 min ago", "Yesterday", "3 days ago", "2 weeks ago"). */
export const daysAgo = (s: string) => {
  const m = /^(\d+)\s+(min|hour|day|week)/.exec(s);
  if (/yesterday/i.test(s)) return 1;
  if (!m) return 0;
  const n = Number(m[1]);
  return m[2] === 'day' ? n : m[2] === 'week' ? n * 7 : 0;
};
export const WHEN = ['Today', 'This week', 'This month', 'Older'] as const;
export const whenOf = (s: string): (typeof WHEN)[number] => { const d = daysAgo(s); return d < 1 ? 'Today' : d <= 7 ? 'This week' : d <= 30 ? 'This month' : 'Older'; };

/** Search on the left; the Status and date filters, then Needs action / All, at the right edge. */
export function QueueToolbar({ search, filters, view, onView, needs, all }: {
  search: ReactNode; filters: ReactNode; view: 'needs' | 'all'; onView: (v: 'needs' | 'all') => void; needs: number; all: number;
}) {
  return (
    <div {...PIN} data-subbar className="shrink-0 px-[var(--tx,16px)] py-4 flex items-center gap-3">
      <div className="w-[280px] min-w-[140px] shrink [&>label]:!w-full">{search}</div>
      <div className="ml-auto flex items-center gap-2">
        {filters}
        <Tabs variant="segmented" value={view} onChange={onView} tabs={[{ id: 'needs', label: 'Needs action', count: needs }, { id: 'all', label: 'All', count: all }]} />
      </div>
    </div>
  );
}
