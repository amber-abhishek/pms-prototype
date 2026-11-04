import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CaretUpDown, Image, X, type Icon } from '../../components/icons';
import { Button, cx } from '../../components/ui';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '../../components/shadcn/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/shadcn/popover';
import { Tabs, TabsList, TabsTrigger } from '../../components/shadcn/tabs';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '../../components/shadcn/command';
import type { Tone } from '../../data/seed';

/** Big title + description used at the top of every off-campus page. */
export function Title({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="px-6 pt-6 pb-3 flex items-start gap-4">
      <div className="flex-1 min-w-0"><h2 className="text-xl font-semibold">{title}</h2>{sub && <p className="text-sm text-gray-500 mt-1">{sub}</p>}</div>
      {children}
    </div>
  );
}

/** Underline tabs (HMO / Amber PBSA, Portal settings sections). */
export function UnderTabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (v: T) => void; tabs: { id: T; label: string }[] }) {
  /* shadcn Tabs, underline style. */
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as T)}>
      <TabsList slide={false} className="flex justify-start gap-6 rounded-none bg-transparent p-0 px-6 border-b border-line">
        {tabs.map((t) => (
          <TabsTrigger key={t.id} value={t.id} className="h-9 px-0 rounded-none -mb-px border-b-2 border-transparent text-gray-500 hover:text-ink data-[state=active]:border-[#111827] data-[state=active]:text-ink data-[state=active]:shadow-none data-[state=active]:bg-transparent">{t.label}</TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/** Grey photo placeholder tile. */
export function Thumb({ tint = '#E8EEF6', w = 40, h = 28, size = 12 }: { tint?: string; w?: number; h?: number; size?: number }) {
  return <span className="inline-flex items-center justify-center rounded-md shrink-0" style={{ width: w, height: h, background: tint }}><Image size={size} className="text-gray-400" /></span>;
}

/** The "See details" text action at the end of a row. */
export const RowLink = ({ onClick, children = 'See details' }: { onClick: () => void; children?: ReactNode }) => (
  <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} className="h-7 px-2.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-[#F3F4F6]">{children}</button>
);

const toneTile: Record<'blue' | 'green' | 'grey' | 'red', string> = { blue: 'bg-[#D9E3FF] text-primary', green: 'bg-[#E8F7EE] text-[#0B8A4C]', grey: 'bg-[#F3F4F6] text-gray-500', red: 'bg-[#FFE4E8] text-[#E0243A]' };

/** Confirm/compose dialog as drawn in the flows: icon tile, title, description, body, grey footer. */
export function ODialog({ open, onClose, icon: I, tone = 'blue', title, sub, children, footer, width = 520 }: {
  open: boolean; onClose: () => void; icon?: Icon; tone?: keyof typeof toneTile; title: string; sub?: ReactNode; children?: ReactNode; footer: ReactNode; width?: number;
}) {
  /* shadcn Dialog. */
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent style={{ maxWidth: width }} {...(sub ? {} : { 'aria-describedby': undefined })}>
        <div className="px-5 pt-5 pb-4 overflow-auto">
          <div className="flex items-center gap-2.5">
            {I && <span className={cx('size-8 rounded-lg flex items-center justify-center shrink-0', toneTile[tone])}><I size={16} /></span>}
            <DialogTitle>{title}</DialogTitle>
          </div>
          {sub && <DialogDescription className="mt-2">{sub}</DialogDescription>}
          {children && <div className="mt-4">{children}</div>}
        </div>
        <DialogFooter>{footer}</DialogFooter>
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
        <span className="block text-sm font-medium text-ink mb-1.5">{label}{optional && <span className="ml-1.5 text-xs font-normal text-gray-400">(optional)</span>}</span>
        <textarea ref={ref} rows={4} value={text} placeholder={placeholder} onChange={(e) => { setText(e.target.value); setErr(false); }} className={cx('w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 placeholder:text-gray-400 min-h-[88px]', err && 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/25')} />
        {err && <span className="block text-xs text-[#E0243A] mt-1">A message is required.</span>}
      </label>
    </ODialog>
  );
}

/** Plain pill without a leading icon, or with one. */
export function Tag({ tone, icon: I, children, outline }: { tone: Tone; icon?: Icon; children: ReactNode; outline?: boolean }) {
  const cls: Record<Tone, string> = {
    green: 'bg-[#E8F7EE] text-[#0B8A4C]', blue: 'bg-[#EFF6FF] text-[#1F45E0]', amber: 'bg-[#FFF6E0] text-[#C47A00]', orange: 'bg-[#FFF0E0] text-[#E5530C]',
    red: 'bg-[#FFF5F6] text-[#E0243A]', purple: 'bg-[#F1E7FF] text-[#8B2CF5]', grey: 'bg-[#F3F4F6] text-[#4B5563]',
  };
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2 h-[22px] text-xs font-medium whitespace-nowrap', outline ? 'border border-line bg-white text-gray-700 !rounded-lg' : cls[tone])}>{I && <I size={12} weight="bold" />}{children}</span>;
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
            <CommandEmpty className="px-2 h-8 flex items-center text-sm text-gray-400">No region matches</CommandEmpty>
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
    <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 h-11 pl-4 pr-2 rounded-xl bg-[#111827] text-white flex items-center gap-3 shadow-pop animate-[pop_.15s_cubic-bezier(0.23,1,0.32,1)]">
      <span className="text-sm">{count} selected</span>
      <span className="w-px h-5 bg-white/20" />
      {children}
      <button type="button" aria-label="Clear selection" onClick={onClear} className="size-7 rounded-md hover:bg-white/10 flex items-center justify-center"><X size={14} /></button>
    </div>
  );
}

/** Blue tonal illustration box for empty states (kit-style). */
export function EmptyArt({ icon: I, accent }: { icon: Icon; accent?: ReactNode }) {
  return (
    <div className="relative w-[150px] h-[110px] mx-auto">
      <div className="absolute inset-x-2 inset-y-3 rounded-[28px] bg-[#EFF6FF]" />
      <div className="absolute inset-0 flex items-center justify-center"><I size={56} weight="duotone" className="text-[#3B82F6]" /></div>
      {accent && <div className="absolute left-9 top-5">{accent}</div>}
    </div>
  );
}

/** Small segmented buttons (Enquiries source): selected is a white bordered button, the rest are ghost. */
