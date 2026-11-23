import { isValidElement, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from './shadcn/popover';
import { DotsSixVertical, Eye, EyeSlash, SlidersHorizontal } from './icons';

/* Column customisation (2026-11-23), as Notion's view Properties: one Columns button in the table header opens a
   list of the table's columns; drag a row (or focus its handle and press ↑ ↓) to reorder, the eye shows or hides it.
   S.No. and the first named column are the row's identity, so they stay put and can't be hidden; a header-less
   action column always stays last. The choice is kept per table, in this browser. */

type C = { key: string; label: ReactNode };
type Saved = { order: string[]; hidden: string[] };

/** A header's visible words: a sortable header is a button around its label, so read the text out of the element. */
function textOf(n: ReactNode): string {
  if (n == null || typeof n === 'boolean') return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(n)) return textOf(n.props.children);
  return '';
}
/** A header-less action column: no label, or one only screen readers see ("Actions"). */
const isAction = (c: C) => c.label === '' || c.label == null || (isValidElement<{ className?: string }>(c.label) && /\bsr-only\b/.test(c.label.props.className ?? ''));
const nameOf = (c: C) => textOf(c.label).trim() || c.key;
const read = (k: string): Saved | null => { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as Saved) : null; } catch { return null; } };
const write = (k: string, v: Saved | null) => { try { if (v) localStorage.setItem(k, JSON.stringify(v)); else localStorage.removeItem(k); } catch { /* storage off */ } };

/** Splits a table's columns into the fixed lead (S.No. + the first named column), the movable middle and the fixed tail. */
function parts<T extends C>(cols: T[]) {
  const tail = cols.filter(isAction);
  const body = cols.filter((c) => !isAction(c));
  const leadN = body[0]?.key === 'no' ? 2 : 1;
  return { lead: body.slice(0, leadN), mid: body.slice(leadN), tail };
}

export function useColumns<T extends C>(cols: T[], enabled: boolean) {
  const { pathname } = useLocation();
  const id = `pms-cols:${pathname}:${cols.map((c) => c.key).join(',')}`;
  const [saved, setSaved] = useState<Saved | null>(() => (enabled ? read(id) : null));
  const [forId, setForId] = useState(id);
  if (forId !== id) { setForId(id); setSaved(enabled ? read(id) : null); }
  const { lead, mid, tail } = parts(cols);
  const order = saved ? [...saved.order.filter((k) => mid.some((c) => c.key === k)), ...mid.map((c) => c.key).filter((k) => !saved.order.includes(k))] : mid.map((c) => c.key);
  const hidden = saved?.hidden.filter((k) => mid.some((c) => c.key === k)) ?? [];
  const midOrdered = order.map((k) => mid.find((c) => c.key === k)!);
  const visible = [...lead, ...midOrdered.filter((c) => !hidden.includes(c.key)), ...tail];
  const save = (v: Saved | null) => { setSaved(v); write(id, v); };
  const can = enabled && mid.length > 0;
  return {
    visible: can ? visible : cols,
    picker: can ? <ColumnPicker mid={midOrdered} hidden={hidden} changed={!!saved}
      onChange={(o, h) => save({ order: o, hidden: h })} onReset={() => save(null)} /> : null,
  };
}

function ColumnPicker({ mid, hidden, changed, onChange, onReset }: {
  /* Only columns that can move or hide are listed; the fixed ones (S.No., the main column, actions) aren't shown. */
  mid: C[]; hidden: string[]; changed: boolean; onChange: (order: string[], hidden: string[]) => void; onReset: () => void;
}) {
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const keys = mid.map((c) => c.key);
  const move = (from: string, to: number) => {
    const next = keys.filter((k) => k !== from);
    next.splice(Math.max(0, Math.min(to, next.length)), 0, from);
    onChange(next, hidden);
  };
  const toggle = (k: string) => onChange(keys, hidden.includes(k) ? hidden.filter((x) => x !== k) : [...hidden, k]);
  const onKey = (e: KeyboardEvent, k: string) => {
    const i = keys.indexOf(k);
    if (e.key === 'ArrowUp' && i > 0) { e.preventDefault(); move(k, i - 1); requestAnimationFrame(() => document.getElementById(`colgrip-${k}`)?.focus()); }
    if (e.key === 'ArrowDown' && i < keys.length - 1) { e.preventDefault(); move(k, i + 1); requestAnimationFrame(() => document.getElementById(`colgrip-${k}`)?.focus()); }
  };
  const row = 'h-9 px-2 rounded-md flex items-center gap-2 text-sm';
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Columns" title="Columns" onClick={(e) => e.stopPropagation()}
          className="relative size-6 shrink-0 rounded-md inline-flex items-center justify-center text-[#737373] hover:text-[#0A0A0A] hover:bg-black/[0.05] data-[state=open]:bg-black/[0.05] data-[state=open]:text-[#0A0A0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30">
          <SlidersHorizontal size={16} strokeWidth={1.5} />
          {changed && <span aria-hidden className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-[#2563EB] ring-2 ring-white" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="p-0 overflow-hidden normal-case tracking-normal font-sans" style={{ width: 264 }}>
        <div className="h-10 px-3 flex items-center justify-between border-b border-[#E5E5E5]">
          <span className="font-mono text-[11px] leading-4 font-medium uppercase tracking-[0.04em] text-[#737373]">Columns</span>
          {changed && <button type="button" onClick={onReset} className="-mx-1.5 h-6 px-1.5 rounded-md text-sm font-medium text-primary hover:bg-[#EFF6FF]">Reset</button>}
        </div>
        <div className="p-1.5 max-h-[360px] overflow-y-auto">
          <ul onDragLeave={() => setOver(null)}>
            {mid.map((c, i) => {
              const off = hidden.includes(c.key);
              return (
                <li key={c.key} draggable onDragStart={(e) => { setDrag(c.key); e.dataTransfer.effectAllowed = 'move'; }}
                  onDragEnd={() => { setDrag(null); setOver(null); }}
                  onDragOver={(e) => { e.preventDefault(); if (over !== c.key) setOver(c.key); }}
                  onDrop={(e) => { e.preventDefault(); if (drag && drag !== c.key) move(drag, i); setDrag(null); setOver(null); }}
                  className={`${row} group/col hover:bg-[#F5F5F5] ${drag === c.key ? 'opacity-40' : ''} ${over === c.key && drag && drag !== c.key ? 'shadow-[inset_0_2px_0_#2563EB]' : ''}`}>
                  <button type="button" id={`colgrip-${c.key}`} aria-label={`Move ${nameOf(c)}`} title="Drag, or use ↑ ↓" onKeyDown={(e) => onKey(e, c.key)}
                    className="w-4 h-6 shrink-0 -ml-0.5 rounded flex items-center justify-center text-[#A3A3A3] cursor-grab active:cursor-grabbing group-hover/col:text-[#525252] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30">
                    <DotsSixVertical size={14} strokeWidth={1.75} />
                  </button>
                  <span className={`flex-1 truncate ${off ? 'text-[#A3A3A3]' : 'text-[#0A0A0A]'}`}>{nameOf(c)}</span>
                  <button type="button" aria-label={off ? `Show ${nameOf(c)}` : `Hide ${nameOf(c)}`} aria-pressed={!off} onClick={() => toggle(c.key)}
                    className={`size-6 shrink-0 rounded-md flex items-center justify-center hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 ${off ? 'text-[#A3A3A3]' : 'text-[#525252]'}`}>
                    {off ? <EyeSlash size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}
