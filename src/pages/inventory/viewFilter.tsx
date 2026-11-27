/* Database-style filters (2026-11-27, Units V2): one Filter button with a compact menu of every field (Linear's 32px
   rows, grey icons, values in a flyout), and the applied filters as chips in a row under the toolbar. A chip opens its
   own rule to change; "+ Add filter" opens the same menu. Columns stays its own button. Rules are the RuleFilter's: a typed field's value is [op, ...args]; [] takes it off. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CaretDown, CaretLeft, CaretRight, Check, Funnel, MagnifyingGlass, Plus, SlidersHorizontal, X } from '../../components/icons';
import { cx } from '../../components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/shadcn/popover';
import type { Tone } from '../../data/seed';
import { NO_ARG, RULE_OPS, RuleEditor, type RuleField } from './common';

const ANY = 'any';
/** On opening, the cursor goes to the "Filter by…" search rather than the first button (Clear all). */
const focusSearch = (e: Event) => { const el = e.currentTarget as HTMLElement | null; const inp = el?.querySelector<HTMLInputElement>('input[data-field-search]'); if (inp) { e.preventDefault(); inp.focus({ preventScroll: true }); } };
const TONES: Tone[] = ['blue', 'green', 'purple', 'amber', 'orange', 'red'];
const toneOf = (fields: RuleField[], f: RuleField): Tone => f.tone ?? TONES[Math.max(0, fields.indexOf(f)) % TONES.length];
const optName = (f: RuleField, x: string) => f.options.find((o) => o.value === x)?.label ?? x;

/** A chip's words: "Room type: Studio, Ensuite single", "Room type: not Studio", "Avg rent: > £180". */
export function chipText(f: RuleField, vs: string[]): { field: string; value: string } {
  const list = (xs: string[]) => (xs.length > 2 ? `${optName(f, xs[0])} +${xs.length - 1}` : xs.map((x) => optName(f, x)).join(', '));
  if (!f.kind) return { field: f.label, value: list(vs) };
  const [op, ...args] = vs;
  if (NO_ARG.includes(op)) return { field: f.label, value: RULE_OPS[f.kind].find(([k]) => k === op)?.[1] ?? op };
  if (f.kind === 'number') return { field: f.label, value: `${op === 'gt' ? '>' : op === 'lt' ? '<' : '='} ${f.id.toLowerCase().includes('rent') ? '£' : ''}${args[0]}` };
  if (f.kind === 'text') return { field: f.label, value: `${op === 'eq' ? 'is' : 'contains'} “${args[0]}”` };
  return { field: f.label, value: `${op === 'not' ? 'not ' : ''}${list(args)}` };
}

type Props = { fields: RuleField[]; value: Record<string, string[]>; onChange: (id: string, v: string[]) => void };

/** A filter's values, in a flyout beside the menu (2026-11-27, Linear's): the row stays in view and the rule opens to
    its right. Apply or Clear closes the flyout and the menu. */
function FlyRow({ f, cur, open, onOpen, onChange, onDone, children, className }: { f: RuleField; cur: string[]; open: boolean; onOpen: (o: boolean) => void;
  onChange: (id: string, v: string[]) => void; onDone?: () => void; children: ReactNode; className?: string }) {
  return (
    <Popover open={open} onOpenChange={onOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cx(ROW, 'data-[state=open]:bg-[#F5F5F5]', className)}>{children}</button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" sideOffset={6} className="w-[280px] p-0 rounded-[10px] overflow-hidden" onFocusOutside={(e) => e.preventDefault()}>
        <RuleEditor key={f.id} field={f} tone="grey" cur={cur} fromActive backLabel={null} onBack={() => onOpen(false)}
          onApply={(v) => { onChange(f.id, v); onOpen(false); onDone?.(); }} />
      </PopoverContent>
    </Popover>
  );
}
/** A compact menu row (2026-11-27): 32px, a grey 16px icon, no coloured tile; rows sit 2px apart so an open row and a
    hovered one don't merge. */
const ROW = 'w-[calc(100%-8px)] mx-1 h-8 px-2 rounded-md hover:bg-[#F5F5F5] flex items-center gap-2 text-sm text-ink text-left outline-none focus-visible:bg-[#F5F5F5]';
const RowIcon = ({ f }: { f: RuleField }) => <f.icon size={16} strokeWidth={1.75} className="shrink-0 text-[#8A8A8A]" />;

/** The field list: a "Filter by…" search, then every field in one list, split by thin lines between their groups (no
    headers, no step-in pages); a field's values open in a flyout beside it. Set fields carry a tick. */
function FieldList({ fields, value, onChange, onDone, startEdit }: Props & { /** After a filter applies: closes the menu. */ onDone?: () => void;
  /** Opens with this field's flyout already out (a column header's "Filter"). */ startEdit?: string | null }) {
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<string | null>(startEdit ?? null);
  /* The cursor starts in the search, so typing finds a field (or any word) straight away. */
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => { requestAnimationFrame(() => inp.current?.focus({ preventScroll: true })); }, []);
  const ql = q.trim().toLowerCase();
  /* "Any field" isn't listed: typing offers it, for a word that isn't one of the fields (2026-11-27). */
  const anyF = fields.find((f) => f.id === ANY);
  /* A search looks through every field; otherwise a nest's fields (Custom fields) stay behind its own row, which steps
     into them in the same menu, split by level, as before (2026-11-27). */
  const [sub, setSub] = useState<string | null>(null);
  /* A pick-from-a-list field with one option (or none) can't narrow anything, so it isn't offered (2026-11-27), unless
     it's already set. Number, text and yes/no fields always can. */
  const useful = (f: RuleField) => (f.kind && f.kind !== 'choice') || f.options.length > 1 || (value[f.id]?.length ?? 0) > 0;
  const pool = fields.filter((f) => f.id !== ANY && useful(f) && (sub ? f.nest === sub : ql || !f.nest) && f.label.toLowerCase().includes(ql));
  const groups = [...new Set(pool.map((f) => f.group))];
  const nests = ql || sub ? [] : [...new Set(fields.filter(useful).map((f) => f.nest).filter((x): x is string => !!x))];
  /* Inside a nest, each level gets its name over its fields (Unit, Flat, Floor…). */
  const heads = !!sub && !ql;
  const anyNow = () => { onChange(ANY, ['has', q.trim()]); setQ(''); onDone?.(); };
  return (
    <div>
      {sub && (
        <div className="h-10 px-2 flex items-center gap-1.5 border-b border-[#F0F0F0] text-sm">
          <button type="button" onClick={() => { setSub(null); setEdit(null); }} className="h-7 pl-1 pr-2 shrink-0 rounded-md flex items-center gap-0.5 text-[#737373] hover:bg-[#F5F5F5] hover:text-ink"><CaretLeft size={14} />Fields</button>
          <span aria-hidden className="text-[#D4D4D4]">/</span><span className="font-medium truncate">{sub}</span>
        </div>
      )}
      <label className="h-10 px-3 flex items-center gap-2 border-b border-[#F0F0F0] text-sm">
        <MagnifyingGlass size={16} className="shrink-0 text-gray-400" />
        <input ref={inp} data-field-search value={q} onChange={(e) => { setQ(e.target.value); setEdit(null); }} onKeyDown={(e) => { if (e.key === 'Enter' && anyF && q.trim() && !pool.length) anyNow(); }} placeholder={sub ? `Search ${sub.toLowerCase()}` : 'Filter by…'} className="flex-1 min-w-0 outline-none bg-transparent placeholder:text-gray-400" />
        {q && <button type="button" aria-label="Clear search" onClick={() => setQ('')} className="size-5 shrink-0 rounded hover:bg-gray-100 flex items-center justify-center text-gray-400"><X size={12} /></button>}
      </label>
      <div className="max-h-[400px] overflow-auto py-1">
        {/* Any field containing the typed words: on top while typing, picked by Enter when no field matches. */}
        {anyF && q.trim() && (
          <button type="button" onClick={anyNow} className={cx(ROW, !pool.length && 'bg-[#F5F5F5]')}>
            <MagnifyingGlass size={16} strokeWidth={1.75} className="shrink-0 text-[#8A8A8A]" />
            <span className="truncate"><span className="text-[#737373]">Any field contains</span> “{q.trim()}”</span>
            {!pool.length && <span className="ml-auto shrink-0 font-mono text-[11px] text-[#A3A3A3]">↵</span>}
          </button>
        )}
        {groups.map((g, i) => (
          <div key={g} className={cx('flex flex-col gap-0.5', (i > 0 || (anyF && q.trim())) && 'mt-1 pt-1 border-t border-[#F0F0F0]')}>
            {heads && <div className="h-7 px-3 flex items-center text-[11px] font-medium text-gray-400">{g}</div>}
            {pool.filter((f) => f.group === g).map((f) => (
              <FlyRow key={f.id} f={f} cur={value[f.id] ?? []} open={edit === f.id} onOpen={(o) => setEdit(o ? f.id : null)} onChange={onChange} onDone={onDone}>
                <RowIcon f={f} /><span className="flex-1 truncate">{f.label}</span>
                {(value[f.id]?.length ?? 0) > 0 && <Check size={14} className="shrink-0 text-primary" />}
                <CaretRight size={12} className="shrink-0 text-[#C4C4C4]" />
              </FlyRow>
            ))}
          </div>
        ))}
        {nests.length > 0 && (
          <div className="mt-1 pt-1 flex flex-col gap-0.5 border-t border-[#F0F0F0]">
            {nests.map((n) => {
              const inN = fields.filter((f) => f.nest === n && useful(f)), on = inN.filter((f) => (value[f.id]?.length ?? 0) > 0).length;
              return (
                <button key={n} type="button" onClick={() => { setSub(n); setEdit(null); }} className={ROW}>
                  <SlidersHorizontal size={16} strokeWidth={1.75} className="shrink-0 text-[#8A8A8A]" />
                  <span className="flex-1 truncate">{n}</span>
                  <span className="shrink-0 font-mono text-xs text-gray-400 tabular-nums">{on ? `${on} on · ` : ''}{inN.length}</span>
                  <CaretRight size={12} className="shrink-0 text-[#C4C4C4]" />
                </button>
              );
            })}
          </div>
        )}
        {!pool.length && !nests.length && !(anyF && q.trim()) && <div className="px-3 py-1.5 text-sm text-gray-400">No fields match</div>}
      </div>
    </div>
  );
}

/** The Filter button: the applied filters on top (click one to change it in a flyout, × to drop it), then the field
    list. Quick filters (Location, Room type, Occupancy) sit on the toolbar instead (2026-11-27). */
export function FilterGroupButton({ fields, value, onChange, compact, ease, focus }: Props & { compact?: boolean; /** Transition timing for going compact, to move with a sliding panel. */ ease?: string;
  /** Open the menu with one field's values out (a column header's "Filter"); `n` changes on every ask. */ focus?: { id: string; n: number } | null }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<string | null>(null);
  const [startEdit, setStartEdit] = useState<string | null>(null);
  useEffect(() => { if (focus) { setStartEdit(focus.id); setOpen(true); } }, [focus?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  const active = fields.filter((f) => (value[f.id]?.length ?? 0) > 0);
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEdit(null); setStartEdit(null); } }}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={compact ? 'Filter' : undefined} title={compact ? 'Filter' : undefined}
          className={cx('px-[7px] shrink-0 h-8 rounded-lg border border-[#E5E5E5] bg-white text-sm font-medium text-[#404040] flex items-center shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:bg-[#F5F5F5] data-[state=open]:bg-[#F5F5F5] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring')}>
          <span className="relative flex shrink-0">
            <Funnel size={16} strokeWidth={1.75} />
            {active.length > 0 && <span aria-hidden className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-[#2563EB] ring-2 ring-white" />}
          </span>
          {/* The word eases out rather than popping, so the toolbar can go compact mid-slide. */}
          <span className={cx('overflow-hidden whitespace-nowrap motion-reduce:transition-none transition-[max-width,margin,opacity]', ease ?? 'duration-200', compact ? 'max-w-0 ml-0 mr-0 opacity-0' : 'max-w-[60px] ml-1.5 mr-[5px] opacity-100')}>Filter</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[280px] p-0 rounded-[10px] overflow-hidden" onOpenAutoFocus={focusSearch} onFocusOutside={(e) => e.preventDefault()}>
        {active.length > 0 && <div className="py-1 flex flex-col gap-0.5 border-b border-[#F0F0F0]">
          <div className="h-7 pl-3 pr-1 flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-400">Active filters</span>
            <button type="button" onClick={() => active.forEach((f) => onChange(f.id, []))} className="h-6 px-1.5 rounded-md text-xs text-[#DC2626] hover:bg-[#FEF2F2]">Clear all</button>
          </div>
          {active.map((f) => {
            const t = chipText(f, value[f.id]);
            return (
              <div key={f.id} className="relative group">
                <FlyRow f={f} cur={value[f.id]} open={edit === f.id} onOpen={(o) => setEdit(o ? f.id : null)} onChange={onChange} onDone={() => setOpen(false)} className="pr-8">
                  <RowIcon f={f} /><span className="truncate"><span className="text-[#737373]">{t.field}</span> {t.value}</span>
                </FlyRow>
                <button type="button" aria-label={`Remove ${f.label} filter`} onClick={() => onChange(f.id, [])} className="absolute right-2 top-1 size-6 rounded hover:bg-gray-200 flex items-center justify-center text-gray-500"><X size={12} /></button>
              </div>
            );
          })}
        </div>}
        <FieldList key={startEdit ?? ''} fields={fields} value={value} onChange={onChange} startEdit={startEdit} onDone={() => { setOpen(false); setStartEdit(null); }} />
      </PopoverContent>
    </Popover>
  );
}

/** One applied filter: "Field: value ▾", opening its rule. A, B and C looks were tried and dropped (2026-11-27). */
function Chip({ fields, f, vs, onChange }: { fields: RuleField[]; f: RuleField; vs: string[]; onChange: (id: string, v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const t = chipText(f, vs);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="h-7 max-w-[320px] pl-2 pr-1.5 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] text-sm text-[#1D4ED8] flex items-center gap-1.5 hover:bg-[#DBEAFE] data-[state=open]:bg-[#DBEAFE] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <f.icon size={14} strokeWidth={1.75} className="shrink-0" />
          <span className="truncate"><span className="text-[#1D4ED8]/70">{t.field}:</span> <span className="font-medium">{t.value}</span></span>
          <CaretDown size={12} className="shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[300px] p-0 rounded-[10px] overflow-hidden" onFocusOutside={(e) => e.preventDefault()}>
        <RuleEditor key={f.id} field={f} tone={toneOf(fields, f)} cur={vs} fromActive backLabel={null} onBack={() => setOpen(false)}
          onApply={(v) => { onChange(f.id, v); setOpen(false); }} />
      </PopoverContent>
    </Popover>
  );
}

/** "+ Add filter": the same field list, values in a flyout. */
function AddChip({ fields, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="h-7 px-2 rounded-full text-sm text-[#737373] flex items-center gap-1 hover:bg-[#F5F5F5] hover:text-ink data-[state=open]:bg-[#F5F5F5] outline-none focus-visible:ring-2 focus-visible:ring-ring"><Plus size={14} />Add filter</button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-0 rounded-[10px] overflow-hidden" onOpenAutoFocus={focusSearch} onFocusOutside={(e) => e.preventDefault()}>
        <FieldList fields={fields} value={value} onChange={onChange} onDone={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

/** The chip row under the toolbar: one chip per applied filter, "+ Add filter", and Clear. Only while a filter is on. */
export function FilterChips({ fields, value, onChange }: Props) {
  const active = Object.keys(value).map((id) => fields.find((f) => f.id === id)).filter((f): f is RuleField => !!f && (value[f.id]?.length ?? 0) > 0);
  if (!active.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {active.map((f) => <Chip key={f.id} fields={fields} f={f} vs={value[f.id]} onChange={onChange} />)}
      <AddChip fields={fields} value={value} onChange={onChange} />
      <span aria-hidden className="w-px h-4 bg-[#E5E5E5]" />
      <button type="button" onClick={() => active.forEach((f) => onChange(f.id, []))} className="h-7 px-2 rounded-md text-sm text-[#737373] hover:bg-[#F5F5F5] hover:text-ink">Clear</button>
    </div>
  );
}
