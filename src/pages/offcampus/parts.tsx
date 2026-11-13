import { Badge } from '../../components/shadcn/badge';
import { Illustration, type Illo } from '../../components/Illustration';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CaretUpDown, Image, X, type Icon } from '../../components/icons';
import { Button, ConfirmFrame, TitleH1, cx, PIN, isConfirmTitle, noAutoFocus } from '../../components/ui';
import { Dialog, DialogContent, DialogFrame } from '../../components/shadcn/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/shadcn/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '../../components/shadcn/command';
import type { Tone } from '../../data/seed';
import { PHOTO } from '../inventory/photos';

/** Big title + description used at the top of every off-campus page. */
export function Title({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    /* No visible page heading (as Amber Connect): the title is screen-reader only, its actions keep a toolbar row. */
    children ? <div {...PIN} className="px-[var(--tx,16px)] pt-6 pb-4 flex items-center gap-4"><TitleH1 className="sr-only">{title}</TitleH1>{sub && <span className="sr-only">{sub}</span>}<div className="ml-auto flex items-center gap-2">{children}</div></div>
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
export function Combo({ value, options, onPick, noneLabel = 'None', icon: I }: { value: string | null; options: string[]; onPick: (v: string | null) => void; noneLabel?: string; icon?: Icon }) {
  /* shadcn Combobox: Popover + Command, so the list filters as you type and arrow keys move through it. */
  const [open, setOpen] = useState(false);
  const pick = (v: string | null) => { onPick(v); setOpen(false); };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger aria-label="Override region" className="w-[200px] h-8 flex items-center rounded-lg border border-gray-300 bg-white px-2.5 text-sm text-left outline-none data-[state=open]:border-primary data-[state=open]:ring-2 data-[state=open]:ring-primary/25 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25">
        <span className="flex-1 truncate">{value ?? noneLabel}</span>
        <CaretUpDown size={14} className="text-gray-400" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Find a region" />
          <CommandList className="p-1">
            <CommandEmpty className="px-2 h-8 flex items-center text-sm text-[#737373]">No region matches</CommandEmpty>
            <CommandItem value={`__none ${noneLabel}`} onSelect={() => pick(null)}><X size={14} className="text-gray-400" />{noneLabel}</CommandItem>
            {options.map((o) => (
              <CommandItem key={o} value={o} onSelect={() => pick(o)} className={cx(value === o && 'bg-gray-50')}>
                {I && <I size={14} className="text-gray-500" />}{o}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Dark floating bar for bulk actions. */
export function BulkBar({ count, children, onClear }: { count: number; children: ReactNode; onClear: () => void }) {
  if (!count) return null;
  return (
    /* The toast's look (shadcn/sonner.tsx): a near-black 12px-radius bar, 14px white text, light pill actions and a round
       grey × at the end, so a selection reads like the feedback toasts. */
    <div role="toolbar" aria-label="Selection" className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 min-h-11 py-2 pl-3.5 pr-1.5 rounded-xl bg-[#0A0A0A] text-white text-sm flex items-center gap-3 shadow-[0_2px_2px_rgba(17,24,39,0.12)] animate-[pop_.15s_cubic-bezier(0.23,1,0.32,1)]">
      <span className="mr-3 font-medium leading-5 tabular-nums whitespace-nowrap">{count} selected</span>
      {children}
      <button type="button" aria-label="Clear selection" onClick={onClear} className="shrink-0 size-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"><X size={14} /></button>
    </div>
  );
}

/** An action in the BulkBar, styled as the toast's action button (Undo). */
export const BulkAction = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => (
  <button type="button" onClick={onClick} className="shrink-0 -mr-1 h-7 px-2.5 rounded-full bg-[#0C63F8] text-sm font-medium text-white hover:bg-[#0A56D9] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 whitespace-nowrap">{children}</button>
);

/** Figma empty-state illustration (Workspace · Empty states). */
export function EmptyArt({ art }: { art: Illo }) {
  return <Illustration name={art} />;
}

/** Small segmented buttons (Enquiries source): selected is a white bordered button, the rest are ghost. */
