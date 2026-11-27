import { useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Archive, ArrowRight, Buildings, Door, MagnifyingGlass, Plus, Stack, X, type Icon } from '../../components/icons';
import { Button, Confirm, Dropdown, Input, Sheet, SheetHero, SheetSection, Switch, cx, type SheetNav } from '../../components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/shadcn/popover';
import { choicesOf, invId, useInv, type Field, type Property } from '../../data/inventory';
import { EditActions, EditLink, FieldErr, PanelModal } from './common';

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
/** Plain words for removing a field (2026-11-27): it comes off the level across a whole layout, so say how far that
 *  reaches, name the layout, and say it can come back. "Lift access will be removed from all 12 blocks that use the
 *  Blocks with flats layout, not just Block A and Block B. You can add it back later." */
export function removeCopy(f: string, props: Property[], layouts: string[], kind: FieldLevel, picked: string[]) {
  const n = kind.toLowerCase();
  const reach = props.filter((p) => layouts.includes(layoutOf(p)));
  const count = kind === 'Block' ? reach.reduce((t, p) => t + p.blocks.length, 0) : 0;
  const lay = layouts.length === 1 ? `the ${layouts[0]} layout` : `the ${layouts.slice(0, -1).join(', ')} or ${layouts.at(-1)} layouts`;
  const who = picked.length === 1 ? picked[0] : picked.length === 2 ? `${picked[0]} and ${picked[1]}` : `the ${picked.length} you picked`;
  const all = count > picked.length ? `all ${count} ${n}s` : `every ${n}`;
  return `${f} will be removed from ${all} that use ${lay}, not just ${who}. You can add it back later.`;
}

/** A review's old and new values (2026-11-26): old red and struck, new green. Shared by Edit units and the level edits. */
export const Old = ({ children }: { children: ReactNode }) => <span className="inline-block max-w-full truncate align-middle rounded-md px-1.5 py-0.5 bg-[#DC2626]/10 text-[#B91C1C] line-through decoration-[#B91C1C]/60">{children}</span>;
export const New = ({ children }: { children: ReactNode }) => <span className="inline-block max-w-full truncate align-middle rounded-md px-1.5 py-0.5 bg-[#0B8A4C]/10 text-[#0B6B3C] font-medium">{children}</span>;

/** Apply a level edit with Undo in its toast (2026-11-27), as Edit units has: keeps what the edit can touch (the named
 *  properties' blocks, the unit edits it matches, the named records' field values) and puts exactly that back. */
export function withUndo(msg: string, scope: { props?: string[]; edit?: (k: string) => boolean; values?: string[] }, apply: () => void) {
  const st = useInv.getState();
  const prevBlocks = new Map(st.properties.filter((p) => scope.props?.includes(p.id)).map((p) => [p.id, p.blocks]));
  const prevE = scope.edit ? Object.fromEntries(Object.entries(st.unitEdits).filter(([k]) => scope.edit!(k))) : {};
  const prevV = Object.fromEntries((scope.values ?? []).map((id) => [id, st.fieldValues[id]]));
  apply();
  /* 8s, not sonner's 4s: long enough to read what changed and reach Undo. */
  toast.success(msg, { duration: 8000, action: { label: 'Undo', onClick: () => {
    const s = useInv.getState();
    if (prevBlocks.size) s.set('properties', (ps) => ps.map((p) => (prevBlocks.has(p.id) ? { ...p, blocks: prevBlocks.get(p.id)! } : p)));
    if (scope.edit) s.set('unitEdits', (m) => ({ ...Object.fromEntries(Object.entries(m).filter(([k]) => !scope.edit!(k))), ...prevE }));
    if (scope.values?.length) s.set('fieldValues', (m) => { const o = { ...m }; for (const [id, v] of Object.entries(prevV)) { if (v) o[id] = v; else delete o[id]; } return o; });
    toast.success('Change undone');
  } } });
}

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

/** Details rows; the ones named in `edit` are edited in place: Edit swaps their values for inputs and the strip's
 *  link for Cancel / Save (Enter saves, Escape cancels). No modal for a field or two (2026-11-26). */
export type LevelDetails = {
  rows: [string, string][];
  edit: { fields: { label: string; options?: string[] }[]; validate: (v: Record<string, string>) => string; save: (v: Record<string, string>) => void };
};
export function DetailsCard({ rows, edit }: LevelDetails) {
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [tried, setTried] = useState(false);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => { if (draft) first.current?.focus(); }, [!!draft]); // eslint-disable-line react-hooks/exhaustive-deps
  const start = () => { setTried(false); setDraft(Object.fromEntries(rows.filter(([k]) => edit.fields.some((x) => x.label === k)))); };
  const cancel = () => setDraft(null);
  const err = draft ? edit.validate(draft) : '';
  const save = () => { if (!draft) return; setTried(true); if (err) return; edit.save(draft); setDraft(null); };
  const keys = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); save(); } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancel(); } };
  const shown: [string, ReactNode][] = rows.map(([k, v]) => {
    const fld = edit.fields.find((x) => x.label === k);
    if (!draft || !fld) return [k, v];
    const set = (nv: string) => setDraft((d) => ({ ...d, [k]: nv }));
    const isFirst = edit.fields[0].label === k;
    /* 28px fields that fit the 32px row (no taller row while editing); the box starts on the value column's edge. */
    return [k, <div className="-my-1">{fld.options
      ? <Dropdown ariaLabel={k} className="h-7 rounded-md" value={draft[k]} onChange={set} options={fld.options.map((o) => ({ value: o, label: o }))} />
      : <Input ref={isFirst ? first : undefined} aria-label={k} className="h-7 rounded-md" value={draft[k]} onChange={(e) => set(e.target.value)} onKeyDown={keys} />}
      {isFirst && tried && <FieldErr>{err}</FieldErr>}</div>];
  });
  return <SheetSection title="Details" action={draft ? <EditActions onCancel={cancel} onSave={save} /> : <EditLink onClick={start}>Edit</EditLink>} rows={shown} />;
}

const NEW_TYPES = ['Text', 'Number', 'Yes / no', 'Date'] as const;

export function LevelSheet({ p, kind, label, id, name, meta, facts, onClose, nav, onArchive, details }: {
  p: Property; kind: LevelKind; /** The layout's own name for the level (House), when it isn't the kind. */ label?: string; id: string; name: string; meta: string; facts: [string, string][]; onClose: () => void; nav?: SheetNav; /** Archive in the control bar (it asks first). */ onArchive?: () => void;
  /** A details card whose Edit turns the editable rows into inputs in place (2026-11-26). */ details?: LevelDetails;
}) {
  return (
    <Sheet open onClose={onClose} nav={nav} title={label ?? kind} width={520}
      onDelete={onArchive ? { label: `Archive ${name}`, text: 'Archive', icon: Archive, onClick: onArchive } : undefined}>
      <SheetHero icon={ICON[kind]} tone="grey" name={name} meta={meta} facts={facts} />
      {/* The level's Details card, then its Custom fields card with Add field and × back (2026-11-26, asked for again):
          a field can be attached to or taken off the level here as well as in Setup › Custom fields. */}
      {details && <DetailsCard {...details} />}
      <LevelFields p={p} kind={kind} id={id} view name={name} meta={meta} />
      <p className="mt-3 text-[13px] leading-5 text-[#737373]">Custom fields apply to every {levelName(p, kind).toLowerCase()} in {layoutOf(p)}; each one keeps its own value.</p>
    </Sheet>
  );
}

/** A field's value as text (2026-11-27): yes / no as Yes or No, nothing as a grey dash. */
const shownValue = (f: Field, v: string | undefined): ReactNode => (!v ? <span className="text-[#A3A3A3]">—</span> : f.type === 'Yes / no' ? (v === 'yes' ? 'Yes' : 'No') : v);

/** The custom fields on one record at a level (block, floor, flat or room): fill values, attach an existing field or create
 *  one inline, remove one from the level. Shared by the level panels and the unit panel (2026-11-20). */
export function LevelFields({ p, kind, id, local, title, rows, onEdit, fillOnly: fillOnlyProp, view, name, meta }: { p: Property; kind: FieldLevel; id: string;
  /** The record's name and where it sits, for the Edit modal's headline (2026-11-27). */ name?: string; meta?: string;
  /** An existing record (2026-11-27): the values read as text, and Edit turns them into inputs with Cancel / Save. Without
      it (records being made) the inputs show straight away and save as you type. */ view?: boolean;
  /** Values only: no Add field, no ×, and no card at all when the level has no fields. */ fillOnly?: boolean;
  /** For records being made (Add units): × only leaves the field out of this one, it doesn't come off the level. */ local?: boolean;
  /** The level's own card in the unit panel (2026-11-26): its details and Edit on top, its custom fields below, one card. */
  title?: string; rows?: [string, ReactNode][]; onEdit?: () => void }) {
  const [left, setLeft] = useState<string[]>([]);
  const all = useInv((s) => s.fields);
  const allProps = useInv((s) => s.properties);
  const values = useInv((s) => s.fieldValues[id]) ?? {};
  const key = attachKey(p, kind);
  const lv = levelName(p, kind).toLowerCase();
  // Toggles first, then the fields that take a typed or picked value, each group in the order they were added.
  const isToggle = (f: Field) => f.type === 'Yes / no';
  const attached = all.filter((f) => f.attached.includes(key));
  const fields = [...attached.filter(isToggle), ...attached.filter((f) => !isToggle(f))].filter((f) => !left.includes(f.id));
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const setValue = (fid: string, v: string) => (view ? setDraft((d) => ({ ...d, [fid]: v }))
    : useInv.getState().set('fieldValues', (m) => ({ ...m, [id]: { ...m[id], [fid]: v } })));
  /* Saved with Undo in the toast (2026-11-27), as the multi-record edits; only values that actually changed count. */
  const saveDraft = () => {
    const ch = Object.entries(draft ?? {}).filter(([fid, v]) => v !== (values[fid] ?? ''));
    if (ch.length) withUndo(`${ch.length} ${ch.length === 1 ? 'value' : 'values'} changed on ${name ?? lv}`, { values: [id] },
      () => useInv.getState().set('fieldValues', (m) => ({ ...m, [id]: { ...m[id], ...Object.fromEntries(ch) } })));
    setDraft(null);
  };
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
  const fillOnly = fillOnlyProp || !!rows;
  const detach = (f: Field) => {
    useInv.getState().set('fields', (l) => l.map((x) => (x.id === f.id ? { ...x, attached: x.attached.filter((a) => a !== key) } : x)));
    toast.success(`${f.name} removed from ${lv}s`);
  };
  if (fillOnlyProp && !fields.length) return null;
  const picker = !fillOnly && <FieldPicker have={fields} onAttach={(f) => (left.includes(f.id) ? setLeft((x) => x.filter((y) => y !== f.id)) : attach(f))} onCreate={create} />;
  /* The fields as inputs: in the card for records being made, in the Edit modal for existing ones. */
  const inputs = fields.length ? <div>{fields.map((f) => (
    <div key={f.id} className="py-3 first:pt-0 last:pb-0 border-t border-[#EBEBEB] first:border-t-0 group/row grid grid-cols-[160px_minmax(0,1fr)] gap-3 items-center">
      <span className="min-w-0 flex items-center gap-1">
        <span className="min-w-0 truncate text-sm leading-5 text-[#737373]">{f.name}</span>
        {/* A level's details card only fills values; removing a field from the level is Setup's job there. */}
        {!fillOnly && <button type="button" aria-label={local ? `Leave out ${f.name}` : `Remove ${f.name}`} title={local ? 'Leave out of these units' : undefined}
          onClick={() => { if (local) { setLeft((x) => [...x, f.id]); useInv.getState().set('fieldValues', (m) => { const { [f.id]: _, ...rest } = m[id] ?? {}; return { ...m, [id]: rest }; }); } else setRemoving(f); }}
          className="shrink-0 size-6 rounded-md grid place-items-center text-[#A3A3A3] opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 hover:bg-[#F5F5F5] hover:text-[#0A0A0A]"><X size={14} /></button>}
      </span>
      <FieldInput f={f} value={draft?.[f.id] ?? values[f.id] ?? ''} onChange={(v) => setValue(f.id, v)} />
    </div>
  ))}</div> : null;
  const empty = <p className="text-sm leading-5 text-[#737373]">No fields on {lv}s yet. Add one to record details here.</p>;
  return (
    <>
      {view && !rows ? (
        /* An existing record (2026-11-27): the values read in the Details card's own rows, and Edit (the card's only
           action) opens them in a centre modal, with Add field there too. */
        <SheetSection title={title ?? 'Custom fields'} action={<EditLink onClick={() => setDraft({})}>Edit</EditLink>}
          rows={fields.length ? fields.map((f): [string, ReactNode] => [f.name, shownValue(f, values[f.id])]) : undefined}>
          {!fields.length && empty}
        </SheetSection>
      ) : (
        <SheetSection title={title ?? 'Custom fields'} rows={rows}
          /* A level's own details card (rows given) carries Edit only; fields are added in Setup › Custom fields. */
          action={<span className="flex items-center gap-3">{onEdit && <EditLink onClick={onEdit}>Edit</EditLink>}{picker}</span>}>
          {/* In a level's details card, a mono caption under the rule says these rows are custom fields. */}
          {rows && fields.length > 0 && <div className="pb-2 font-mono text-[11px] leading-4 font-medium uppercase tracking-[0.04em] text-[#737373]">Custom fields</div>}
          {inputs ?? (title ? null : empty)}
        </SheetSection>
      )}
      {view && (
        /* Edit opens the record's centre modal, as Edit units does (2026-11-27): the mono eyebrow bar, the record's tile,
           name and place, the fields in a card with Add field, and Cancel / Save in the footer. */
        <PanelModal open={draft != null} onClose={() => setDraft(null)} width={560} eyebrow="Edit custom fields"
          title={name} meta={meta} icon={kind === 'Room' ? Door : ICON[kind]}
          right={<><Button onClick={() => setDraft(null)}>Cancel</Button><Button variant="primary" onClick={saveDraft}>Save</Button></>}>
          <SheetSection title="Custom fields" action={picker || undefined}>{inputs ?? empty}</SheetSection>
        </PanelModal>
      )}
      <Confirm open={!!removing} onClose={() => setRemoving(null)} danger title={`Remove ${removing?.name ?? ''}?`}
        sub={removing ? removeCopy(removing.name, allProps, [layoutOf(p)], kind, [name ?? levelName(p, kind)]) : ''}
        confirm="Remove" onConfirm={() => { if (removing) detach(removing); setRemoving(null); }} />
    </>
  );
}

/** Where several records differ (2026-11-27): each value with the records that have it, instead of a bare "Mixed".
 *  "Ensuite single · Block A" / "Studio · Block B, Block C"; a long list of names ends "+2". */
export function Spread({ entries }: { entries: { name: string; value: ReactNode; key: string }[] }) {
  const groups = [...new Map(entries.map((e) => [e.key, e])).values()].map((g) => ({ g, names: entries.filter((e) => e.key === g.key).map((e) => e.name) }));
  return (
    <div className="flex flex-col gap-1">
      {groups.map(({ g, names }) => (
        <div key={g.key} className="min-w-0 flex items-baseline gap-1.5 text-sm leading-5">
          <span className="shrink-0 text-ink">{g.value}</span>
          <span className="min-w-0 truncate text-[#737373]" title={names.join(', ')}>· {names.length > 3 ? `${names.slice(0, 3).join(', ')} +${names.length - 3}` : names.join(', ')}</span>
        </div>
      ))}
    </div>
  );
}

/** Several records' values for each field (2026-11-27): the field on the left, and under it each record's name with its
 *  value beside it, names and values in their own aligned columns. Reads at any count without squeezing; past
 *  COMPARE_MAX the values are grouped instead (Spread). */
export const COMPARE_MAX = 12;
export function CompareTable({ cols, rows }: { cols: string[]; rows: { label: string; values: ReactNode[] }[] }) {
  return (
    <div>
      {rows.map((r) => (
        <div key={r.label} className="py-3 first:pt-0 last:pb-0 border-t border-[#EBEBEB] first:border-t-0 grid grid-cols-[132px_minmax(0,1fr)] gap-3">
          <span className="min-w-0 truncate text-sm leading-5 text-[#737373]" title={r.label}>{r.label}</span>
          {/* Names give way before values: a long name ("Block A · Collingwood College") truncates, the value stays whole. */}
          <div className="min-w-0 grid grid-cols-[minmax(0,max-content)_minmax(max-content,1fr)] gap-x-4 gap-y-1.5 text-sm leading-5">
            {cols.map((c, i) => [
              <span key={`n${i}`} className="min-w-0 truncate text-[#737373]" title={c}>{c}</span>,
              <span key={`v${i}`} className="whitespace-nowrap text-ink">{r.values[i]}</span>,
            ])}
          </div>
        </div>
      ))}
    </div>
  );
}

/** The custom fields shared by several records at one level (2026-11-27, V3 multi-select): only the fields every one of
 *  them has; a field where they agree shows the value, one where they differ reads "Mixed". A change writes to them all. */
export function MultiLevelFields({ items, kind, name, meta, noun }: { items: { p: Property; id: string; name: string }[]; kind: FieldLevel; name?: string; meta?: string; /** What the property calls this level, e.g. "wing" (2026-11-27). */ noun?: string }) {
  const these = `these ${noun ?? kind.toLowerCase()}s`;
  const all = useInv((s) => s.fields);
  const allProps = useInv((s) => s.properties);
  const vals = useInv((s) => s.fieldValues);
  const keys = [...new Set(items.map((x) => attachKey(x.p, kind)))];
  const isToggle = (f: Field) => f.type === 'Yes / no';
  const shared = all.filter((f) => keys.every((k) => f.attached.includes(k)));
  const fields = [...shared.filter(isToggle), ...shared.filter((f) => !isToggle(f))];
  /* Values read as text first; Edit gives each record its own control under each field, as the panel lists them, and
   * Save writes only what changed, record by record (2026-11-27). */
  const [draft, setDraft] = useState<Record<string, Record<string, string>> | null>(null);
  /* Review, then Undo (2026-11-27), as Edit units: Save first lists each value that changes, old → new. */
  const [review, setReview] = useState(false);
  const diffs = !draft ? [] : fields.flatMap((f) => items.flatMap((x) => {
    const was = vals[x.id]?.[f.id] ?? '', now = draft[x.id]?.[f.id];
    return now == null || now === was || (f.type === 'Yes / no' && (now || 'no') === (was || 'no')) ? [] : [{ f, x, was, now }];
  }));
  const close = () => { setDraft(null); setReview(false); };
  const save = () => {
    const ids = [...new Set(diffs.map((d) => d.x.id))];
    if (diffs.length) withUndo(`${diffs.length} ${diffs.length === 1 ? 'value' : 'values'} changed on ${ids.length === 1 ? items.find((x) => x.id === ids[0])?.name : `${ids.length} ${noun ?? kind.toLowerCase()}s`}`, { values: ids },
      () => useInv.getState().set('fieldValues', (m) => { const n = { ...m }; diffs.forEach(({ f, x, now }) => { n[x.id] = { ...n[x.id], [f.id]: now }; }); return n; }));
    close();
  };
  /* Add field (2026-11-27): attaches to every layout level the picked records sit on, so it shows on all of them. */
  const attach = (f: Field) => {
    useInv.getState().set('fields', (l) => l.map((x) => (x.id === f.id ? { ...x, attached: [...new Set([...x.attached, ...keys])] } : x)));
    toast.success(`${f.name} added to ${these}`);
  };
  const create = (fname: string, type: string) => {
    const f: Field = { id: invId('cf'), name: fname, key: fname.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), type, attached: keys };
    useInv.getState().set('fields', (l) => [...l, f]);
    toast.success(`${fname} created on ${these}`);
  };
  /* Remove (2026-11-27): the field comes off the layout levels these records sit on, as on a single record. */
  const [removing, setRemoving] = useState<Field | null>(null);
  const detach = (f: Field) => {
    useInv.getState().set('fields', (l) => l.map((x) => (x.id === f.id ? { ...x, attached: x.attached.filter((a) => !keys.includes(a)) } : x)));
    toast.success(`${f.name} removed from ${these}`);
  };
  return (
    <>
      {/* Read as the Details card's rows; Edit opens the shared fields in a centre modal (2026-11-27). */}
      <SheetSection title="Custom fields" action={<EditLink onClick={() => setDraft({})}>Edit</EditLink>}
        rows={fields.length && items.length > COMPARE_MAX ? fields.map((f): [string, ReactNode] => { const vs = [...new Set(items.map(({ id }) => vals[id]?.[f.id] ?? ''))];
          return [f.name, vs.length > 1 ? <Spread entries={items.map((x) => { const v = vals[x.id]?.[f.id] ?? ''; return { name: x.name, key: v, value: shownValue(f, v) }; })} /> : shownValue(f, vs[0])]; }) : undefined}>
        {fields.length > 0 && items.length <= COMPARE_MAX && <CompareTable cols={items.map((x) => x.name)} rows={fields.map((f) => ({ label: f.name, values: items.map((x) => shownValue(f, vals[x.id]?.[f.id])) }))} />}
        {!fields.length && <p className="text-sm leading-5 text-[#737373]">{keys.length > 1 ? 'These share no custom fields.' : 'No custom fields here yet.'}</p>}
      </SheetSection>
      <PanelModal open={draft != null} onClose={close} width={560} eyebrow="Edit custom fields" pos={review ? 'Review' : undefined}
        title={name ?? `${items.length} ${kind.toLowerCase()}s`} meta={meta} icon={kind === 'Room' ? Door : ICON[kind]}
        left={review ? <Button variant="ghost" icon={null} onClick={() => setReview(false)}>Back</Button> : undefined}
        right={review
          ? <><Button onClick={close}>Cancel</Button><Button variant="primary" disabled={!diffs.length} onClick={save}>{diffs.length ? `Change ${diffs.length} ${diffs.length === 1 ? 'value' : 'values'}` : 'Nothing to change'}</Button></>
          : <><Button onClick={close}>Cancel</Button><Button variant="primary" onClick={() => setReview(true)}>Review</Button></>}>
        {review ? (
          <SheetSection title="What changes">
            {!diffs.length ? <p className="text-sm leading-5 text-[#737373]">No values changed.</p> : (
              <div className="divide-y divide-[#F0F0F0] -my-1">
                {fields.filter((f) => diffs.some((d) => d.f.id === f.id)).map((f) => (
                  <div key={f.id} className="py-3 first:pt-1 last:pb-1">
                    <div className="font-mono text-xs font-medium uppercase tracking-wide text-[#737373]">{f.name}</div>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {diffs.filter((d) => d.f.id === f.id).map(({ x, was, now }) => (
                        <div key={x.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center text-sm">
                          <span className="min-w-0 truncate text-ink">{x.name}</span>
                          <span className="flex items-center gap-2">{was ? <Old>{shownValue(f, was)}</Old> : <span className="text-[#A3A3A3]">—</span>}<ArrowRight size={14} className="shrink-0 text-[#737373]" />{now ? <New>{shownValue(f, now)}</New> : <span className="text-[#A3A3A3]">—</span>}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SheetSection>
        ) : <>
        <SheetSection title="Custom fields" action={<FieldPicker have={fields} onAttach={attach} onCreate={create} />}>
        {!fields.length && <p className="text-sm leading-5 text-[#737373]">No shared custom fields yet.</p>}
        <div>{fields.map((f) => (
          <div key={f.id} className="py-3 first:pt-0 last:pb-0 border-t border-[#EBEBEB] first:border-t-0 group/row grid grid-cols-[132px_minmax(0,1fr)] gap-3">
            <span className={cx('min-w-0 flex items-center gap-1', f.type === 'Yes / no' ? 'h-6' : 'h-input')}>
              <span className="min-w-0 truncate text-sm leading-5 text-[#737373]" title={f.name}>{f.name}</span>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setRemoving(f)}
                className="shrink-0 size-6 rounded-md grid place-items-center text-[#A3A3A3] opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 hover:bg-[#F5F5F5] hover:text-[#0A0A0A]"><X size={14} /></button>
            </span>
            <div className={cx('min-w-0 flex flex-col', f.type === 'Yes / no' ? 'gap-2' : 'gap-1.5')}>
              {items.map((x) => (
                <div key={x.id} className={cx('grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center', f.type === 'Yes / no' && '[&>span:last-child]:h-6')}>
                  <span className="min-w-0 truncate text-sm leading-5 text-ink">{x.name}</span>
                  <FieldInput f={f} value={draft?.[x.id]?.[f.id] ?? vals[x.id]?.[f.id] ?? ''}
                    onChange={(v) => setDraft((d) => ({ ...d, [x.id]: { ...d?.[x.id], [f.id]: v } }))} />
                </div>
              ))}
            </div>
          </div>
        ))}</div>
        </SheetSection>
        </>}
      </PanelModal>
      <Confirm open={!!removing} onClose={() => setRemoving(null)} danger title={`Remove ${removing?.name ?? ''}?`}
        sub={removing ? removeCopy(removing.name, allProps, [...new Set(items.map((x) => layoutOf(x.p)))], kind, items.map((x) => x.name)) : ''}
        confirm="Remove" onConfirm={() => { if (removing) detach(removing); setRemoving(null); }} />
    </>
  );
}

/** Every value sits in the same 220px slot on the right, one row height (the input's), so toggles, pickers and boxes line up. */
function FieldInput({ f, value, onChange, mixed }: { f: Field; value: string; onChange: (v: string) => void;
  /** Several records differ on this field (2026-11-27): it reads "Mixed" until a value is set for them all. */ mixed?: boolean }) {
  const slot = (c: ReactNode, end?: boolean) => <span className={cx('w-[160px] justify-self-end h-input flex items-center', end && 'justify-end')}>{c}</span>;
  /* A mixed yes / no can't be a switch (it has no "both"), so it's a Yes / No pick reading Mixed. */
  if (f.type === 'Yes / no' && mixed) return slot(<Dropdown ariaLabel={f.name} value="" placeholder="Mixed" onChange={onChange} options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />);
  if (f.type === 'Yes / no') return slot(<Switch checked={value === 'yes'} onChange={(b) => onChange(b ? 'yes' : 'no')} label={f.name} />, true);
  if (f.type.startsWith('Pick one')) {
    const opts = choicesOf(f);
    return slot(<Dropdown ariaLabel={f.name} value={value} placeholder={mixed ? 'Mixed' : 'Choose'} onChange={onChange} options={opts.map((o) => ({ value: o, label: o }))} />);
  }
  const num = f.type.startsWith('Number');
  return slot(<Input aria-label={f.name} value={value} inputMode={num ? 'decimal' : undefined} placeholder={mixed ? 'Mixed' : num ? '0' : f.type === 'Date' ? 'e.g. 19 Sep 2027' : 'Add a value'}
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
