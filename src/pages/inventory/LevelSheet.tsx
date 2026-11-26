import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Archive, Buildings, Door, MagnifyingGlass, Plus, Stack, X, type Icon } from '../../components/icons';
import { Confirm, Dropdown, Input, Sheet, SheetHero, SheetSection, Switch, cx, type SheetNav } from '../../components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/shadcn/popover';
import { choicesOf, invId, useInv, type Field, type Property } from '../../data/inventory';
import { EditLink } from './common';

/* Side panel for a level above the unit (Block, Floor, Flat), in the record-panel language (2026-11-19). Its job: fill in the
   custom fields attached to that level, and attach or create a field inline (the Add tag pattern). Values are prototype
   state (useInv.fieldValues), keyed by the level's id. */
export type LevelKind = 'Block' | 'Floor' | 'Flat';
/** A room (the unit) takes custom fields too; its panel lives in Units.tsx and shows them with LevelFields. */
type FieldLevel = LevelKind | 'Room';
const ICON: Record<LevelKind, Icon> = { Block: Buildings, Floor: Stack, Flat: Door };
/** The layout a property uses and the level name inside it, as custom fields store their attachment ("Halls with flats › Floor"). */
export const layoutOf = (p: Property) => p.layout ?? (p.structure === 'House' ? 'Shared houses' : 'Blocks with flats');
/* In Shared houses the houses are stored as the data's flats, so a Flat there is a House. */
const levelName = (p: Property, k: FieldLevel) => { const house = layoutOf(p) === 'Shared houses' || p.structure === 'House'; return k === 'Block' ? (house ? 'House' : 'Building') : k === 'Flat' && house ? 'House' : k; };
export const attachKey = (p: Property, k: FieldLevel) => `${layoutOf(p)} › ${levelName(p, k)}`;

/** The custom fields a level's record has a value in, as read-only rows (an off toggle counts as no value). */
export function useFilledFields(p: Property, kind: FieldLevel, id: string): [string, string][] {
  const all = useInv((s) => s.fields);
  const values = useInv((s) => s.fieldValues[id]) ?? {};
  const key = attachKey(p, kind);
  return all.filter((f) => f.attached.includes(key)).flatMap((f) => {
    const v = (values[f.id] ?? '').trim();
    if (!v || (f.type === 'Yes / no' && v !== 'yes')) return [];
    return [[f.name, f.type === 'Yes / no' ? 'Yes' : v] as [string, string]];
  });
}

/** Custom field values edited in a modal: work on a copy, keep it on Save, drop it on Cancel or close. */
export function useDraftValues(id: string) {
  const draft = `draft:${id}`;
  const [ready, setReady] = useState(false);
  const drop = () => useInv.getState().set('fieldValues', (m) => { const { [draft]: _, ...rest } = m; return rest; });
  useEffect(() => { useInv.getState().set('fieldValues', (m) => ({ ...m, [draft]: { ...(m[id] ?? {}) } })); setReady(true); return drop; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const changed = () => { const m = useInv.getState().fieldValues; return JSON.stringify(m[draft] ?? {}) !== JSON.stringify(m[id] ?? {}); };
  const commit = () => useInv.getState().set('fieldValues', (m) => ({ ...m, [id]: { ...(m[draft] ?? {}) } }));
  return { draft: ready ? draft : id, changed, commit };
}

const NEW_TYPES = ['Text', 'Number', 'Yes / no', 'Date'] as const;

export function LevelSheet({ p, kind, label, id, name, meta, facts, onClose, nav, onArchive, details }: {
  p: Property; kind: LevelKind; /** The layout's own name for the level (House), when it isn't the kind. */ label?: string; id: string; name: string; meta: string; facts: [string, string][]; onClose: () => void; nav?: SheetNav; /** Archive in the control bar (it asks first). */ onArchive?: () => void;
  /** A details card with Edit (name and the like), as the unit panel's Room card (2026-11-26). */ details?: { rows: [string, string][]; onEdit: () => void };
}) {
  return (
    <Sheet open onClose={onClose} nav={nav} title={label ?? kind} width={520}
      onDelete={onArchive ? { label: `Archive ${name}`, text: 'Archive', icon: Archive, onClick: onArchive } : undefined}>
      <SheetHero icon={ICON[kind]} tone="grey" name={name} meta={meta} facts={facts} />
      {details && <SheetSection title={label ?? kind} action={<EditLink onClick={details.onEdit}>Edit</EditLink>} rows={details.rows} />}
      <LevelFields p={p} kind={kind} id={id} />
      <p className="mt-3 text-[13px] leading-5 text-[#737373]">Custom fields apply to every {levelName(p, kind).toLowerCase()} in {layoutOf(p)}; each one keeps its own value.</p>
    </Sheet>
  );
}

/** The custom fields on one record at a level (block, floor, flat or room): fill values, attach an existing field or create
 *  one inline, remove one from the level. Shared by the level panels and the unit panel (2026-11-20). */
export function LevelFields({ p, kind, id, local, title, rows, onEdit }: { p: Property; kind: FieldLevel; id: string;
  /** For records being made (Add units): × only leaves the field out of this one, it doesn't come off the level. */ local?: boolean;
  /** The level's own card in the unit panel (2026-11-26): its details and Edit on top, its custom fields below, one card. */
  title?: string; rows?: [string, ReactNode][]; onEdit?: () => void }) {
  const [left, setLeft] = useState<string[]>([]);
  const all = useInv((s) => s.fields);
  const values = useInv((s) => s.fieldValues[id]) ?? {};
  const key = attachKey(p, kind);
  const lv = levelName(p, kind).toLowerCase();
  // Toggles first, then the fields that take a typed or picked value, each group in the order they were added.
  const isToggle = (f: Field) => f.type === 'Yes / no';
  const attached = all.filter((f) => f.attached.includes(key));
  const fields = [...attached.filter(isToggle), ...attached.filter((f) => !isToggle(f))].filter((f) => !left.includes(f.id));
  const setValue = (fid: string, v: string) => useInv.getState().set('fieldValues', (m) => ({ ...m, [id]: { ...m[id], [fid]: v } }));
  const attach = (f: Field) => {
    useInv.getState().set('fields', (l) => l.map((x) => (x.id === f.id ? { ...x, attached: [...x.attached, key] } : x)));
    toast.success(`${f.name} added to every ${lv} in ${layoutOf(p)}`);
  };
  const create = (fname: string, type: string) => {
    const f: Field = { id: invId('cf'), name: fname, key: fname.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), type, attached: [key] };
    useInv.getState().set('fields', (l) => [...l, f]);
    toast.success(`${fname} created on ${lv}s`);
  };
  const [removing, setRemoving] = useState<Field | null>(null);
  const detach = (f: Field) => {
    useInv.getState().set('fields', (l) => l.map((x) => (x.id === f.id ? { ...x, attached: x.attached.filter((a) => a !== key) } : x)));
    toast.success(`${f.name} removed from ${lv}s`);
  };
  return (
    <>
      <SheetSection title={title ?? 'Custom fields'} rows={rows}
        action={<>{onEdit && <EditLink onClick={onEdit}>Edit</EditLink>}<FieldPicker have={fields} onAttach={(f) => (left.includes(f.id) ? setLeft((x) => x.filter((y) => y !== f.id)) : attach(f))} onCreate={create} /></>}>
        {fields.length ? fields.map((f) => (
          <div key={f.id} className="py-3 first:pt-0 last:pb-0 border-t border-[#EBEBEB] first:border-t-0 group/row grid grid-cols-[160px_minmax(0,1fr)] gap-3 items-center">
            <span className="min-w-0 flex items-center gap-1">
              <span className="min-w-0 truncate text-sm leading-5 text-[#737373]">{f.name}</span>
              <button type="button" aria-label={local ? `Leave out ${f.name}` : `Remove ${f.name}`} title={local ? 'Leave out of these units' : undefined}
                onClick={() => { if (local) { setLeft((x) => [...x, f.id]); useInv.getState().set('fieldValues', (m) => { const { [f.id]: _, ...rest } = m[id] ?? {}; return { ...m, [id]: rest }; }); } else setRemoving(f); }}
                className="shrink-0 size-6 rounded-md grid place-items-center text-[#A3A3A3] opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 hover:bg-[#F5F5F5] hover:text-[#0A0A0A]"><X size={14} /></button>
            </span>
            <FieldInput f={f} value={values[f.id] ?? ''} onChange={(v) => setValue(f.id, v)} />
          </div>
        )) : title ? null : <p className="text-sm leading-5 text-[#737373]">No fields on {lv}s yet. Add one to record details here.</p>}
      </SheetSection>
      <Confirm open={!!removing} onClose={() => setRemoving(null)} danger title={`Remove ${removing?.name ?? ''}?`}
        sub={`It comes off every ${lv} in ${layoutOf(p)}. The field stays in Custom fields.`}
        confirm="Remove" onConfirm={() => { if (removing) detach(removing); setRemoving(null); }} />
    </>
  );
}

/** Every value sits in the same 220px slot on the right, one row height (the input's), so toggles, pickers and boxes line up. */
function FieldInput({ f, value, onChange }: { f: Field; value: string; onChange: (v: string) => void }) {
  const slot = (c: ReactNode, end?: boolean) => <span className={cx('w-[220px] justify-self-end h-input flex items-center', end && 'justify-end')}>{c}</span>;
  if (f.type === 'Yes / no') return slot(<Switch checked={value === 'yes'} onChange={(b) => onChange(b ? 'yes' : 'no')} label={f.name} />, true);
  if (f.type.startsWith('Pick one')) {
    const opts = choicesOf(f);
    return slot(<Dropdown ariaLabel={f.name} value={value} placeholder="Choose" onChange={onChange} options={opts.map((o) => ({ value: o, label: o }))} />);
  }
  const num = f.type.startsWith('Number');
  return slot(<Input aria-label={f.name} value={value} inputMode={num ? 'decimal' : undefined} placeholder={num ? '0' : f.type === 'Date' ? 'e.g. 19 Sep 2027' : 'Add a value'}
    onChange={(e) => onChange(num ? e.target.value.replace(/[^0-9.]/g, '') : e.target.value)} className="w-full" />);
}

/** "Add field": find an existing custom field to attach to this level, or type a new name and pick its type (Add tag pattern). */
function FieldPicker({ have, onAttach, onCreate }: { have: Field[]; onAttach: (f: Field) => void; onCreate: (name: string, type: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const all = useInv((s) => s.fields);
  const text = q.trim();
  const pool = all.filter((f) => !have.some((h) => h.id === f.id) && f.name.toLowerCase().includes(text.toLowerCase()));
  const exact = all.some((f) => f.name.toLowerCase() === text.toLowerCase());
  const close = () => { setOpen(false); setQ(''); };
  return (
    <Popover open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <PopoverTrigger asChild>
        <button type="button" className="-my-1 -mx-1.5 h-6 px-1.5 rounded-md text-sm font-medium text-primary hover:bg-[#EFF6FF] inline-flex items-center gap-1"><Plus size={14} />Add field</button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[264px] p-0 overflow-hidden rounded-xl border-[#E5E5E5] shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
        <label className="h-10 px-3 flex items-center gap-2 border-b border-[#E5E5E5]">
          <MagnifyingGlass size={14} className="shrink-0 text-[#A3A3A3]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find or create a field" aria-label="Find or create a field"
            className="flex-1 min-w-0 h-full text-sm text-[#0A0A0A] caret-primary outline-none bg-transparent placeholder:text-[#A3A3A3]" />
        </label>
        <div className="max-h-[280px] overflow-auto p-1 flex flex-col gap-0.5">
          {pool.map((f) => (
            <button key={f.id} type="button" onClick={() => { onAttach(f); close(); }} className="w-full h-8 shrink-0 px-2 rounded-lg flex items-center gap-2 text-left hover:bg-[#F5F5F5]">
              <span className="flex-1 min-w-0 truncate text-sm text-[#0A0A0A]">{f.name}</span><span className="shrink-0 text-xs text-[#A3A3A3]">{f.type.replace(/ · .*/, '')}</span>
            </button>
          ))}
          {!pool.length && !text && <div className="h-8 px-2 flex items-center text-sm text-[#737373]">Type a name to create a field</div>}
          {text && !exact && <>
            {pool.length > 0 && <div aria-hidden className="h-px my-0.5 shrink-0 bg-[#EBEBEB]" />}
            <div className="px-2 pt-1.5 pb-1 text-xs text-[#737373] truncate">Create “{text}” as</div>
            {NEW_TYPES.map((t) => (
              <button key={t} type="button" onClick={() => { onCreate(text, t); close(); }} className="w-full h-8 shrink-0 px-2 rounded-lg flex items-center gap-2 text-left text-sm text-[#0A0A0A] hover:bg-[#F5F5F5]">
                {t}
              </button>
            ))}
          </>}
        </div>
      </PopoverContent>
    </Popover>
  );
}
