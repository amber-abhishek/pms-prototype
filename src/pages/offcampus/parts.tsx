import { Badge } from '../../components/shadcn/badge';
import { Illustration, type Illo } from '../../components/Illustration';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CaretUpDown, Image, X, type Icon } from '../../components/icons';
import { Button, TitleH1, cx } from '../../components/ui';
import { Dialog, DialogContent, DialogFrame } from '../../components/shadcn/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/shadcn/popover';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '../../components/shadcn/command';
import type { Tone } from '../../data/seed';

/** Big title + description used at the top of every off-campus page. */
export function Title({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    /* Same page heading as every screen (PageHeading): 20px medium ink, lined up with the table's first column. */
    <div className="px-[var(--tx,16px)] pt-6 pb-3 flex items-center gap-4">
      <div className="flex-1 min-w-0 ml-[calc(var(--gx,16px)+var(--cx,12px)-var(--tx,16px))]"><TitleH1 className="text-xl leading-7 font-medium text-ink truncate">{title}</TitleH1>{sub && <p className="text-sm text-gray-500 mt-1">{sub}</p>}</div>
      {children}
    </div>
  );
}

/** Underline tabs (HMO / Amber PBSA, Portal settings sections). */
/** Grey photo placeholder tile. */
export function Thumb({ tint = '#E8EEF6', w = 40, h = 28, size = 12 }: { tint?: string; w?: number; h?: number; size?: number }) {
  return <span className="inline-flex items-center justify-center rounded-md shrink-0" style={{ width: w, height: h, background: tint }}><Image size={size} className="text-gray-400" /></span>;
}

/** The "See details" text action at the end of a row. */
export const RowLink = ({ onClick, children = 'See details' }: { onClick: () => void; children?: ReactNode }) => (
  <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} className="h-7 px-2.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-[#F5F5F5]">{children}</button>
);

const toneTile: Record<'blue' | 'green' | 'grey' | 'red', string> = { blue: 'bg-[#D9E3FF] text-primary', green: 'bg-[#E8F7EE] text-[#0B8A4C]', grey: 'bg-[#F5F5F5] text-gray-500', red: 'bg-[#FFE4E8] text-[#E0243A]' };

/** Confirm/compose dialog as drawn in the flows: icon tile, title, description, body, grey footer. */
export function ODialog({ open, onClose, title, sub, children, footer, width = 520 }: {
  open: boolean; onClose: () => void; icon?: Icon; tone?: keyof typeof toneTile; title: string; sub?: ReactNode; children?: ReactNode; footer: ReactNode; width?: number;
}) {
  /* shadcn Dialog. */
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ maxWidth: width }} {...(sub ? {} : { 'aria-describedby': undefined })}>
        <DialogFrame title={title} sub={sub} footer={footer}>{children}</DialogFrame>
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
    <ODialog open={open} onClose={onClose} icon={icon} tone={danger ? 'red' : optional ? 'grey' : 'blue'} title={title} sub={sub}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} onClick={go}>{submit}</Button></>}>
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

/** Typeahead combobox used for the Amber region override. */
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
    <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 h-11 pl-4 pr-2 rounded-xl bg-[#0A0A0A] text-white flex items-center gap-3 shadow-pop animate-[pop_.15s_cubic-bezier(0.23,1,0.32,1)]">
      <span className="text-sm">{count} selected</span>
      <span className="w-px h-5 bg-white/20" />
      {children}
      <button type="button" aria-label="Clear selection" onClick={onClear} className="size-7 rounded-md hover:bg-white/10 flex items-center justify-center"><X size={14} /></button>
    </div>
  );
}

/** Figma empty-state illustration (Workspace · Empty states). */
export function EmptyArt({ art }: { art: Illo }) {
  return <Illustration name={art} />;
}

/** Small segmented buttons (Enquiries source): selected is a white bordered button, the rest are ghost. */
