import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Avatar, Empty } from '../../components/ui';
import { photoOf } from './photos';
import { flushSync } from 'react-dom';
import { toast } from 'sonner';
import { Bed, Info, Buildings, Door, DoorOpen, House, Key, Plus, Stack, Tag, Textbox, Trash, TreeStructure, X, type Icon } from '../../components/icons';
import { Checkbox } from '../../components/shadcn/checkbox';
import { Button, IconTile, PageHeading, Field, Input, PageHeader, Pill, SearchInput, type Tone, Sheet, Switch, Table, cx, toneDot, SheetHero, SheetRow, SheetSection, listNav, type SheetNav, avatarFx } from '../../components/ui';
import { useNavigate } from 'react-router-dom';
import { choicesOf, invId, pickOneType, useInv, type Field as CField, type Property, type Structure, type TagDef } from '../../data/inventory';
import { EditLink, FieldErr, LineTabs, levelTone, Modal, PanelModal, Picker, PropStack, PropStatus } from './common';

/* ---------------- Property layouts (code: /cms/structures; Figma 3057:2) ---------------- */
export function StructuresPage() {
  const structures = useInv((s) => s.structures);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const open = structures.find((x) => x.id === openId) ?? null;
  const setOpen = (x: Structure | null) => setOpenId(x ? x.id : null);
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const rows = structures.filter((s) => !needle || [s.name, ...s.levels.map((l) => l.name)].some((v) => v.toLowerCase().includes(needle)));
  return (
    <>
      <PageHeader icon={TreeStructure} title="Property layouts" crumbs={['Properties']}>
        {/* Search is the page's only control, so it sits in the header (no toolbar row). */}
        {structures.length > 0 && <div className="w-[240px] [&>label]:!w-full"><SearchInput value={q} onChange={setQ} placeholder="Search layouts" /></div>}
        <Button variant="primary" icon={Plus} onClick={() => setCreating(true)}>New layout</Button>
      </PageHeader>
      <PageHeading />
      {/* The levels rule lives in the page footer (2026-11-23): one line, blue title then the grey way out. */}
      <Table rows={rows} empty={<Empty title="No layouts match" sub="Try a layout or level name." />} footer="always"
            summary={<span className="flex items-center gap-2 min-w-0"><Info size={16} className="shrink-0 text-[#2563EB]" /><span className="font-medium text-[#2563EB] whitespace-nowrap">A layout in use can’t change its levels</span><span className="text-[#737373] truncate">(Make a new layout instead, or rename a level)</span></span>} onRow={setOpen} selected={open?.id}
            cols={[
              { key: 'n', label: 'Layout', render: (s) => (
                <span className="flex items-center gap-3 min-w-0 py-1">
                  <IconTile icon={levelIcon(s.levels[0]?.name ?? '')} size={36} />
                  <span className="min-w-0 flex flex-col">
                    <span className="font-medium text-[#0A0A0A] truncate">{s.name}</span>
                    <span className="text-[13px] leading-[18px] text-[#737373] truncate">{describe(s)}</span>
                  </span>
                </span>
              ) },
              { key: 'l', label: 'Levels', render: (s) => <Levels s={s} /> },
              { key: 'p', label: 'Properties', render: (s) => <UsedBy s={s} /> },
              { key: 'u', label: 'Updated', render: (s) => { const [who, when] = s.updated.split(' · '); return <span className="inline-flex items-center gap-2 min-w-0"><Avatar name={who} size={24} /><span className="text-[#0A0A0A] truncate">{who}</span>{when && <span className="text-[#737373] whitespace-nowrap">· {when}</span>}</span>; } },
            ]} />
      {open && <StructureSheet s={open} nav={listNav(rows, (x) => x.id === open.id, (x) => setOpen(x))} key={open.id} onClose={() => setOpen(null)} />}
      <NewLayoutDialog open={creating} onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); setOpenId(id); }} />
    </>
  );
}

/** Icon for a level by its name, so a layout reads as a picture: building › floor › flat › room. */
function levelIcon(name: string): Icon {
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
const DESC: Record<string, string> = {
  'Blocks with flats': 'Blocks split into floors and flats of shared rooms',
  'Rooms only': 'Corridors of rooms on each floor, no flats',
  'Studio block': 'Self-contained studios on each floor',
  'Shared houses': 'Houses let room by room',
};
/** One line under the layout name: the seeded description, or what gets booked. */
function describe(s: Structure) {
  if (DESC[s.name]) return DESC[s.name];
  const b = s.levels.find((l) => l.bsu);
  return b ? `Booked by ${b.name.toLowerCase()}` : `${s.levels.length} levels`;
}

/* Levels as a path of icon + name, all neutral. Bookable levels are ink, the levels above them grey. */
function Levels({ s }: { s: Pick<Structure, 'levels'> }) {
  return (
    <span className="flex items-center gap-1">
      {s.levels.map((l, i) => {
        const I = levelIcon(l.name);
        return (
          <span key={i} className="flex items-center gap-1 shrink-0">
            {i > 0 && <span aria-hidden className="w-1.5 h-px bg-[#D4D4D4]" />}
            <span title={l.bsu ? `${l.name} · bookable` : l.name}
              className={cx('h-6 pl-1.5 pr-2 rounded-md flex items-center gap-1 text-[13px] whitespace-nowrap border', l.bsu ? 'border-[#E5E5E5] bg-white text-[#0A0A0A]' : 'border-transparent bg-[#F5F5F5] text-[#525252]')}>
              <I size={14} className={l.bsu ? 'text-[#0A0A0A]' : 'text-[#737373]'} />{l.name}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Prototype: properties aren't linked to layouts yet, so which ones use a layout is dummy, stable by layout id. */
function usedBy(s: Structure, props: Property[]) {
  const h = [...s.id].reduce((n, c) => n + c.charCodeAt(0), 0);
  const pool = [...props.filter((p) => p.structure === 'Building'), ...props.filter((p) => p.structure !== 'Building')];
  return Array.from({ length: Math.min(s.properties, pool.length) }, (_, i) => pool[(h + i) % pool.length]);
}
/** 40px cover photo for a property row; a grey building tile when it has none. */
function PropThumb({ id }: { id: string }) {
  const src = photoOf(id);
  return src ? <img src={src} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
    : <span className="size-10 shrink-0 rounded-lg bg-[#F5F5F5] grid place-items-center"><Buildings size={16} className="text-[#737373]" /></span>;
}
/** Properties cell: up to three cover photos, then the count (names on hover). */
function UsedBy({ s }: { s: Structure }) {
  const props = useInv((st) => st.properties);
  if (!s.properties) return <span className="text-[#A3A3A3]">Not in use</span>;
  const used = usedBy(s, props);
  return <PropStack props={used} label={`${s.properties} ${s.properties === 1 ? 'property' : 'properties'}`} />;
}
type LevelDraft = { key: string; name: string; bsu: boolean };
/** Name + levels form, shared by the New layout dialog and the panel's Edit state. In use (`locked`): levels can only be
 *  renamed — bookable switches are locked and add / remove are hidden. */
function useLayoutForm(s: Structure | null) {
  const [name, setName] = useState(s?.name ?? '');
  const [levels, setLevels] = useState<LevelDraft[]>(() => s ? s.levels.map((l, i) => ({ key: String(i), ...l })) : [{ key: 'a', name: 'Building', bsu: false }, { key: 'b', name: 'Room', bsu: true }, { key: 'c', name: 'Tenancy', bsu: true }]);
  const reset = () => { setName(s?.name ?? ''); setLevels(s ? s.levels.map((l, i) => ({ key: String(i), ...l })) : []); };
  const valid = !!name.trim() && !levels.some((l) => !l.name.trim());
  return { name, setName, levels, setLevels, reset, valid };
}
function LevelsList({ levels, setLevels, locked }: { levels: LevelDraft[]; setLevels: (f: (l: LevelDraft[]) => LevelDraft[]) => void; locked: boolean }) {
  const refs = useRef<Record<string, HTMLInputElement | null>>({});
  const addLevel = () => {
    const key = invId('l');
    flushSync(() => setLevels((l) => [...l.slice(0, -2), { key, name: '', bsu: false }, ...l.slice(-2)]));
    refs.current[key]?.focus();
  };
  return (
    <>
      <div className="-my-1">
        {levels.map((l, i) => (
          <div key={l.key} className="h-10 flex items-center gap-3 border-t border-[#EBEBEB] first:border-t-0">
            <span className="w-4 font-mono text-xs text-[#A3A3A3] tabular-nums">{i + 1}</span>
            <input ref={(el) => { refs.current[l.key] = el; }} aria-label={`Level ${i + 1}`} value={l.name} placeholder="Level name"
              onChange={(e) => setLevels((x) => x.map((y) => (y.key === l.key ? { ...y, name: e.target.value } : y)))}
              className="flex-1 min-w-0 h-7 -ml-1.5 px-1.5 rounded-md bg-transparent text-sm text-[#0A0A0A] placeholder:text-gray-400 hover:bg-[#F5F5F5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/25 transition-colors" />
            <span className="text-[13px] text-[#A3A3A3]">{l.bsu ? 'Bookable' : 'Not bookable'}</span>
            <span className={cx(locked && 'opacity-45 pointer-events-none')} aria-disabled={locked || undefined}>
              <Switch checked={l.bsu} onChange={(b) => !locked && setLevels((x) => x.map((y) => (y.key === l.key ? { ...y, bsu: b } : y)))} label={`${l.name} bookable`} />
            </span>
            {!locked && levels.length > 2 && <button type="button" aria-label={`Remove ${l.name}`} onClick={() => setLevels((x) => x.filter((y) => y.key !== l.key))} className="size-7 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-400"><Trash size={14} /></button>}
          </div>
        ))}
      </div>
      {!locked && <Button type="button" size="sm" icon={Plus} className="mt-3" onClick={addLevel}>Add level</Button>}
    </>
  );
}

/** New layout: a centred dialog (create forms are centre modals). */
function NewLayoutDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const f = useLayoutForm(null);
  const busy = useRef(false);
  useEffect(() => { if (open) { busy.current = false; f.setName(''); f.setLevels([{ key: 'a', name: 'Building', bsu: false }, { key: 'b', name: 'Room', bsu: true }, { key: 'c', name: 'Tenancy', bsu: true }]); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const create = () => {
    if (busy.current || !f.valid) return;
    busy.current = true;
    const id = invId('st');
    useInv.getState().set('structures', (l) => [...l, { id, name: f.name.trim(), levels: f.levels.map(({ name: n, bsu }) => ({ name: n.trim(), bsu })), properties: 0, updated: 'Arjun Mehta · Just now' }]);
    toast.success(`${f.name.trim()} layout created`);
    onCreated(id);
  };
  return (
    <PanelModal open={open} onClose={onClose} eyebrow="New layout" title="New property layout" width={560}
      lead={<span className="size-10 shrink-0 rounded-[10px] flex items-center justify-center" style={avatarFx(GREY_FG)}><Stack size={20} strokeWidth={1.75} /></span>}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} disabled={!f.valid} onClick={create}>Create layout</Button></>}>
      <SheetSection title="Layout"><Field label="Name"><Input value={f.name} onChange={(e) => f.setName(e.target.value)} placeholder="e.g. Blocks with flats" /></Field></SheetSection>
      <SheetSection title="Levels · top first"><LevelsList levels={f.levels} setLevels={f.setLevels} locked={false} /></SheetSection>
      <SheetSection title="Path"><Levels s={{ levels: f.levels.map((l) => ({ name: l.name || '…', bsu: l.bsu })) }} /></SheetSection>
    </PanelModal>
  );
}

/* Property layout panel (Figma "Side panel · Property layout" 4100:17176): Overview (Levels, Path), Properties, Fields,
   Activity. The panel stays read-only: the Levels card's Edit opens the centred Edit layout dialog (Name + Levels).
   No footer: Delete is a bin button in the control bar, and only when no property uses the layout. */
function StructureSheet({ s, onClose, nav }: { nav?: SheetNav; s: Structure; onClose: () => void }) {
  const navTo = useNavigate();
  const props = useInv((st) => st.properties);
  const allFields = useInv((st) => st.fields);
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<'overview' | 'properties' | 'fields' | 'activity'>('overview');
  const locked = s.properties > 0;
  const bookable = s.levels.filter((l) => l.bsu).map((l) => l.name);
  const fields = s.levels.flatMap((l) => allFields.filter((x) => x.attached.includes(`${s.name} › ${l.name}`)).map((x) => ({ f: x, level: l })));
  const used = usedBy(s, props);
  const [who, when] = s.updated.split(' · ');
  const activity = [
    { who, what: `edited ${s.name}`, when: when || '' },
    ...fields.slice(0, 2).map((x, i) => ({ who: i ? 'Tom Baker' : who, what: `attached ${x.f.name} to ${x.level.name}`, when: ['28 Aug', '14 Aug'][i] })),
    ...(bookable[0] ? [{ who, what: `made ${bookable[bookable.length - 1]} bookable`, when: '4 Jul' }] : []),
    { who, what: `created ${s.name}`, when: '3 Jul' },
  ];
  const del = () => {
    const before = useInv.getState().structures;
    useInv.getState().set('structures', (l) => l.filter((x) => x.id !== s.id));
    onClose();
    toast.success(`${s.name} deleted`, { action: { label: 'Undo', onClick: () => useInv.getState().set('structures', () => before) } });
  };
  return (
    <Sheet open onClose={onClose} nav={nav} title="Property layout"
      onDelete={locked ? undefined : { label: 'Delete layout', onClick: del }}>
      <SheetHero icon={levelIcon(s.levels[0]?.name ?? '')} tone="grey" name={s.name} meta={`${s.levels.length} levels${bookable.length ? ` · bookable at ${bookable.join(' and ')}` : ''}`}
        facts={[['Levels', String(s.levels.length)], ['Properties', String(s.properties)], ['Fields', String(fields.length)]]}>
        {locked ? <Pill tone="green">In use</Pill> : <Pill tone="grey">Not used</Pill>}
      </SheetHero>
      <div className="-mx-5 mb-5"><LineTabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'properties', label: 'Properties' }, { id: 'fields', label: 'Fields' }, { id: 'activity', label: 'Activity' }]} /></div>
      <>
        {tab === 'overview' && <>
          <SheetSection title={`Levels · ${s.levels.length}`} action={<EditLink onClick={() => setEditing(true)}>Edit</EditLink>}>
            {s.levels.map((l, i) => <SheetRow key={i} title={l.name} sub={`Level ${i + 1}${i === 0 ? ' · top' : i === s.levels.length - 1 ? ' · lowest' : ''}`} end={l.bsu ? <Pill tone="blue">Bookable</Pill> : undefined} />)}
          </SheetSection>
          <SheetSection title="Path"><Levels s={s} /></SheetSection>
          {locked && <p className="mt-3 text-sm leading-5 text-[#737373]">In use by {s.properties} {s.properties === 1 ? 'property' : 'properties'}, so levels can only be renamed. Make a new layout to change them.</p>}
        </>}
        {tab === 'properties' && (
          <SheetSection title={`Properties · ${s.properties}`}>
            {used.length ? used.map((p, i) => <SheetRow key={`${p.id}${i}`} lead={<PropThumb id={p.id} />} title={p.name} sub={`${p.campus} · ${p.units} rooms`} end={<PropStatus s={p.status} />} onClick={() => navTo(`/inventory/properties/${p.id}`)} />)
              : <p className="text-sm text-[#737373]">No property uses this layout yet.</p>}
          </SheetSection>
        )}
        {tab === 'fields' && (
          <SheetSection title={`Fields · ${fields.length}`} action={<EditLink onClick={() => navTo('/inventory/custom-fields')}>Manage</EditLink>}>
            {fields.length ? fields.map(({ f: x, level }) => <SheetRow key={`${x.id}${level.name}`} title={x.name} sub={x.type} end={<Pill tone={level.bsu ? 'blue' : 'grey'}>{level.name}</Pill>} />)
              : <p className="text-sm text-[#737373]">No custom fields on this layout.</p>}
          </SheetSection>
        )}
        {tab === 'activity' && (
          <SheetSection title="Activity">
            {activity.map((a, i) => <SheetRow key={i} lead={<Avatar name={a.who} size={24} />} title={`${a.who} ${a.what}`} sub={a.when} />)}
          </SheetSection>
        )}
      </>
      <EditLayoutDialog s={s} open={editing} onClose={() => setEditing(false)} />
    </Sheet>
  );
}

/** Edit layout: a centred dialog over the read-only panel. In use, levels can only be renamed. */
function EditLayoutDialog({ s, open, onClose }: { s: Structure; open: boolean; onClose: () => void }) {
  const f = useLayoutForm(s);
  const busy = useRef(false);
  const locked = s.properties > 0;
  useEffect(() => { if (open) { busy.current = false; f.reset(); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = () => {
    if (busy.current || !f.valid) return;
    busy.current = true;
    const lv = f.levels.map(({ name: n, bsu }) => ({ name: n.trim(), bsu }));
    useInv.getState().set('structures', (l) => l.map((x) => (x.id === s.id ? { ...x, name: f.name.trim(), levels: locked ? x.levels.map((o, i) => ({ ...o, name: lv[i]?.name ?? o.name })) : lv, updated: 'Arjun Mehta · Just now' } : x)));
    toast.success(`${f.name.trim()} saved`);
    onClose();
  };
  return (
    <PanelModal open={open} onClose={onClose} eyebrow="Edit layout" title={s.name} width={560}
      lead={(() => { const I = levelIcon(s.levels[0]?.name ?? ''); return <span className="size-10 shrink-0 rounded-[10px] flex items-center justify-center" style={avatarFx(GREY_FG)}><I size={20} strokeWidth={1.75} /></span>; })()}
      meta={locked ? `In use by ${s.properties} ${s.properties === 1 ? 'property' : 'properties'}, so levels can only be renamed.` : undefined}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} disabled={!f.valid} onClick={save}>Save</Button></>}>
      <SheetSection title="Layout"><Field label="Name"><Input value={f.name} onChange={(e) => f.setName(e.target.value)} placeholder="e.g. Blocks with flats" /></Field></SheetSection>
      <SheetSection title="Levels · top first"><LevelsList levels={f.levels} setLevels={f.setLevels} locked={locked} /></SheetSection>
    </PanelModal>
  );
}

/* ---------------- Custom fields (Settings › Custom fields, 3058:2) ---------------- */
/* Grey tone ink, the same the panel hero's icon tile uses. */
const GREY_FG = '#64748B';
const TYPES = ['Text', 'Number', 'Yes / no', 'Pick one', 'Date'];
const isPickOne = (f: CField) => f.type.startsWith('Pick one');
/** Answer type as shown: just "Pick one"; its options are listed under Details, so no count (2026-11-23). */
const typeLabel = (f: CField) => f.type.split(' · ')[0];
/** Options under Details: sits on as one more row (same gap as the rows above, no rule), in the same 140px label column. */
function OptionsBlock({ edit, children }: { edit?: boolean; children: ReactNode }) {
  return (
    <div className={cx(edit ? '-mt-[22px]' : '-mt-6', '-mb-2.5 grid grid-cols-[140px_minmax(0,1fr)] gap-x-4 text-sm leading-5')}>
      <span className={cx('text-[#737373]', edit ? 'py-1' : 'py-1.5')}>Options</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
/** Trimmed, blank rows dropped; the error names what's wrong (too few, or the same option twice). */
function cleanChoices(list: string[]): [string[], string] {
  const out = list.map((c) => c.trim()).filter(Boolean);
  const seen = new Set<string>();
  const dup = out.find((c) => { const k = c.toLowerCase(); if (seen.has(k)) return true; seen.add(k); return false; });
  return [out, out.length < 2 ? 'Add at least two options.' : dup ? `${dup} is listed twice.` : ''];
}
export function CustomFieldsPage() {
  const fields = useInv((s) => s.fields);
  const [q, setQ] = useState('');
  const [pick, setOpen] = useState<CField | 'new' | null>(null);
  /* Re-read the open field from the store, so edits made in its panel (attach switches) show at once. */
  const open = pick && pick !== 'new' ? fields.find((x) => x.id === pick.id) ?? null : pick;
  const rows = fields.filter((f) => !q || (f.name + f.key).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader icon={Textbox} title="Custom fields" crumbs={['Properties']}>
        {/* Search is the page's only control, so it sits in the header (no toolbar row). */}
        {fields.length > 0 && <div className="w-[240px] [&>label]:!w-full"><SearchInput value={q} onChange={setQ} placeholder="Search fields" /></div>}
        <Button variant="primary" icon={Plus} onClick={() => setOpen('new')}>New field</Button>
      </PageHeader>
      <PageHeading />
      <Table columns={false} rows={rows} onRow={setOpen} selected={open && open !== 'new' ? open.id : undefined}
            empty={fields.length ? <Empty title="No fields match" sub="Try a field name or key." /> : <Empty art="records" title="No custom fields yet" sub="Add your own details to rooms, flats or buildings." />}
            cols={[
              /* Numbered in list order, so a search renumbers what's left. */
              { key: 'no', label: 'S.No.', className: 'w-14', render: (f) => <span className="font-mono text-[#737373] tabular-nums">{rows.indexOf(f) + 1}</span> },
              { key: 'n', label: 'Field', className: 'w-[240px] min-w-[240px]', render: (f) => <span className="font-medium text-[#0A0A0A] whitespace-nowrap">{f.name}</span> },
              { key: 't', label: 'Answer type', className: 'w-[200px] min-w-[200px]', render: (f) => <span className="text-[#737373] whitespace-nowrap">{typeLabel(f)}</span> },
              { key: 'a', label: 'Attached to', render: (f) => <span className="flex flex-wrap gap-1">{f.attached.map((a) => <Pill key={a} tone={lookOf(a.split(' › ').pop() ?? '')[1]}>{a}</Pill>)}</span> },
            ]} />
      <FieldSheet f={open} nav={open && open !== 'new' ? listNav(rows, (x) => x.id === open.id, (x) => setOpen(x)) : undefined} key={open && open !== 'new' ? open.id : 'new'} onClose={() => setOpen(null)} />
    </>
  );
}

/* Custom field panel, record-panel language (2026-11-19): control bar "CUSTOM FIELD · 2 OF 8" with Delete, a hero, and
   read-only sections. Details' Edit opens the centred Edit field dialog (2026-11-24); Attached to
   saves on each switch. Creating a field still uses the centred dialog. */
function FieldSheet({ f, onClose, nav }: { nav?: SheetNav; f: CField | 'new' | null; onClose: () => void }) {
  const structures = useInv((s) => s.structures);
  const [editing, setEditing] = useState(false);
  const [asking, setAsking] = useState(false);
  const fid = f && f !== 'new' ? f.id : '';
  useEffect(() => { setEditing(false); }, [fid]);
  if (!f) return null;
  if (f === 'new') return <FieldDialog f={null} open onClose={onClose} />;
  const type = typeLabel(f);
  const choices = choicesOf(f);
  const del = () => { useInv.getState().set('fields', (l) => l.filter((x) => x.id !== f.id)); setAsking(false); onClose(); toast.success(`${f.name} field deleted`); };
  return (
    <Sheet open onClose={onClose} nav={nav} title="Custom field" width={520} onDelete={{ label: 'Delete field', onClick: () => setAsking(true) }}>
      <Modal open={asking} onClose={() => setAsking(false)} icon={Trash} width={440} title={`Delete ${f.name}?`}
        sub={f.attached.length ? `It’s on ${f.attached.join(', ')}. Every value already entered for it is deleted too.` : 'It isn’t attached to anything yet.'}
        footer={<><Button onClick={() => setAsking(false)}>Keep</Button><Button variant="danger" icon={null} onClick={del}>Delete field</Button></>}>{null}</Modal>
      <SheetHero icon={Textbox} tone="grey" name={f.name} meta={`${type} · on ${f.attached.length} ${f.attached.length === 1 ? 'level' : 'levels'}`} />
      {/* A pick-one field's options are a Details row (2026-11-23): listed when reading, edited in place with the rest. */}
      {/* Edit opens the field's centred dialog (2026-11-24), the same one New field uses; the panel stays read-only. */}
      <FieldDialog f={f} open={editing} onClose={() => setEditing(false)} />
      <SheetSection title="Details" action={<EditLink onClick={() => setEditing(true)}>Edit</EditLink>}
          rows={[['Name', f.name], ['Answer type', type]]}>
          {isPickOne(f) && (
            <OptionsBlock>
              {choices.length ? (
                <ol className="py-1.5 flex flex-col gap-3">
                  {choices.map((c, i) => <li key={c} className="flex gap-2"><span className="min-w-[1ch] shrink-0 font-mono text-[#737373] tabular-nums">{i + 1}</span><span className="min-w-0 break-words text-[#0A0A0A]">{c}</span></li>)}
                </ol>
              ) : <span className="block py-1.5 text-[#A3A3A3]">None yet</span>}
            </OptionsBlock>
          )}
        </SheetSection>
      <SheetSection title="Attached to"><AttachPicker f={f} structures={structures} /></SheetSection>
      <SheetSection title="Rules">
        <SheetRow title="Required" sub={requiredCopy(f)} end={<Switch checked={!!f.required} onChange={(b) => { useInv.getState().set('fields', (l) => l.map((x) => (x.id === f.id ? { ...x, required: b } : x))); toast.success(`${f.name} is ${b ? 'required' : 'optional'}`); }} label="Required" />} />
      </SheetSection>
    </Sheet>
  );
}

/* Attached to (Figma 3933:51435): the levels it's on as a chip row, then layouts down the left (count of levels it's on)
   and the picked layout's levels on the right, each with a switch. Switching saves straight away (toast), so the
   section needs no Edit. Tenancy is a record, not a place, so it never shows. Counts are prototype numbers. */
function AttachPicker({ f, structures }: { f: CField; structures: Structure[] }) {
  const first = structures.find((st) => f.attached.some((a) => a.startsWith(`${st.name} › `))) ?? structures[0];
  const [sel, setSel] = useState(first?.id ?? '');
  const st = structures.find((x) => x.id === sel) ?? first;
  if (!st) return null;
  const on = (layout: string, lv: string) => f.attached.includes(`${layout} › ${lv}`);
  const toggle = (lv: string) => {
    const k = `${st.name} › ${lv}`;
    const next = on(st.name, lv) ? f.attached.filter((a) => a !== k) : [...f.attached, k];
    useInv.getState().set('fields', (l) => l.map((x) => (x.id === f.id ? { ...x, attached: next } : x)));
    toast.success(on(st.name, lv) ? `${f.name} removed from ${lv.toLowerCase()}s in ${st.name}` : `${f.name} added to ${lv.toLowerCase()}s in ${st.name}`);
  };
  const levels = st.levels.filter((l) => l.name !== 'Tenancy');
  /* The right pane reserves room for the longest layout's levels, so switching layouts never changes the card's height. */
  const most = Math.max(...structures.map((x) => x.levels.filter((l) => l.name !== 'Tenancy').length));
  const paneMin = 32 + 32 + most * 38 + (most - 1) * 12;
  const MULT = [1, 5, 16, 140];
  const count = (i: number) => (st.properties ? Math.round(st.properties * MULT[Math.min(i, MULT.length - 1)] * (i === levels.length - 1 && i < 3 ? 6 : 1)) : 0);
  return (
    <div className="-mx-4 -my-3.5">
      <div className="px-4 py-3 border-b border-[#EBEBEB] flex flex-wrap gap-1.5">
        {f.attached.length ? f.attached.map((a) => { const [layout, lv] = [a.split(' › ')[0], a.split(' › ').pop() ?? '']; return <Pill key={a} tone={levelTone(lv)}>{lv} · {layout}</Pill>; })
          : <span className="text-sm leading-5 text-[#737373]">Not on any level yet</span>}
      </div>
      <div className="grid grid-cols-[180px_minmax(0,1fr)]">
        <div className="bg-[#FAFAFA] border-r border-[#EBEBEB] p-2 flex flex-col gap-0.5">
          <div className="h-7 px-2 flex items-center font-mono text-[11px] leading-4 font-medium uppercase tracking-[0.04em] text-[#737373]">Layout</div>
          {structures.map((x) => {
            const n = f.attached.filter((a) => a.startsWith(`${x.name} › `)).length;
            const active = x.id === st.id;
            return (
              <button key={x.id} type="button" onClick={() => setSel(x.id)}
                className={cx('h-9 px-2.5 rounded-lg flex items-center gap-2 text-left text-sm transition-colors', active ? 'bg-white text-[#0A0A0A] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06),0_0_0_1px_#E5E5E5]' : 'text-[#404040] hover:bg-[#F0F0F0]')}>
                <span className="flex-1 min-w-0 truncate">{x.name}</span>
                <span className={cx('shrink-0 font-mono text-xs tabular-nums', active && n ? 'text-[#2563EB]' : n ? 'text-[#525252]' : 'text-[#A3A3A3]')}>{n}</span>
              </button>
            );
          })}
        </div>
        <div className="p-4" style={{ minHeight: paneMin }}>
          <div className="text-sm leading-5 font-medium text-[#0A0A0A] mb-3">{st.name}</div>
          <ol className="relative flex flex-col gap-3">
            <span aria-hidden className="absolute left-[15px] top-4 bottom-4 w-px bg-[#E5E5E5]" />
            {levels.map((l, i) => (
              <li key={l.name} className="relative flex items-center gap-3">
                <span className="relative bg-white rounded-lg"><IconTile icon={levelIcon(l.name)} tone={levelTone(l.name)} size={32} /></span>
                <span className="flex-1 min-w-0">
                  <span className={cx('block text-sm leading-5 truncate', on(st.name, l.name) ? 'font-medium text-[#0A0A0A]' : 'text-[#0A0A0A]')}>{l.name}</span>
                  <span className="block text-[13px] leading-[18px] text-[#737373]">{count(i) ? `${count(i).toLocaleString('en-GB')} in this layout` : 'None yet'}</span>
                </span>
                <Switch checked={on(st.name, l.name)} onChange={() => toggle(l.name)} label={`${f.name} on ${l.name} in ${st.name}`} />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

/** Rules › Required line, named after what the field sits on: "Rooms and floors can’t go active until it’s filled in." */
function requiredCopy(f: CField) {
  const lv = [...new Set(f.attached.map((a) => (a.split(' › ').pop() ?? '').toLowerCase()))].filter(Boolean).map((l) => `${l}s`);
  if (!lv.length) return 'Once it’s on a level, that level can’t go active until it’s filled in';
  const who = lv.length === 1 ? lv[0] : `${lv.slice(0, -1).join(', ')} and ${lv[lv.length - 1]}`;
  return `${who.charAt(0).toUpperCase()}${who.slice(1)} can’t go active until it’s filled in`;
}

/** Create or edit a field in a centred dialog: name, answer type, and the layout × level grid. */
/** Editable list of pick-one choices, shared by the panel's Options edit and the New / Edit field dialog. */
function ChoicesEditor({ value, onChange, onEscape, autoFocus, compact }: { value: string[]; onChange: (v: string[]) => void; onEscape?: () => void; autoFocus?: boolean; compact?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { if (autoFocus) refs.current[0]?.select(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  /* flushSync so the new row exists before it's focused (jsx-a11y/no-autofocus). */
  const addAt = (i: number) => { flushSync(() => onChange([...value.slice(0, i), '', ...value.slice(i)])); refs.current[i]?.focus(); };
  const remove = (i: number) => { onChange(value.filter((_, j) => j !== i)); refs.current[Math.max(0, i - 1)]?.focus(); };
  return (
    <div>
      <ol className={cx('flex flex-col', compact ? 'gap-1' : 'gap-2')}>
        {value.map((c, i) => (
          <li key={i} className={cx('flex items-center', compact ? 'gap-2' : 'gap-3')}>
            {!compact && <span className="w-5 shrink-0 font-mono text-sm text-[#737373] tabular-nums">{i + 1}</span>}
            <input ref={(el) => { refs.current[i] = el; }} aria-label={`Option ${i + 1}`} value={c} placeholder={`Option ${i + 1}`}
              onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addAt(i + 1); }
                else if (e.key === 'Backspace' && !c && value.length > 1) { e.preventDefault(); remove(i); }
                else if (e.key === 'Escape' && onEscape) { e.stopPropagation(); onEscape(); }
              }}
              className={cx('flex-1 min-w-0 rounded-md', compact ? 'h-7 px-2' : 'h-8 px-2.5', 'border border-[#E5E5E5] bg-white text-sm leading-5 text-[#0A0A0A] placeholder:text-[#A3A3A3] outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15')} />
            <button type="button" aria-label={`Remove ${c.trim() || `option ${i + 1}`}`} onClick={() => remove(i)} disabled={value.length === 1}
              className="size-6 shrink-0 rounded-md grid place-items-center text-[#737373] hover:bg-[#F0F0F0] hover:text-[#0A0A0A] disabled:opacity-40 disabled:pointer-events-none"><X size={14} /></button>
          </li>
        ))}
      </ol>
      <button type="button" onClick={() => addAt(value.length)} className={cx(compact ? 'mt-2 ml-0.5' : 'mt-3 ml-9', 'h-6 px-1.5 rounded-md text-sm font-medium text-primary hover:bg-[#EFF6FF] inline-flex items-center gap-1')}><Plus size={14} />Add option</button>
    </div>
  );
}

function FieldDialog({ f, open, onClose }: { f: CField | null; open: boolean; onClose: () => void }) {
  const structures = useInv((s) => s.structures);
  const fields = useInv((s) => s.fields);
  const [name, setName] = useState(f?.name ?? '');
  const [type, setType] = useState(f ? f.type.split(' · ')[0] : 'Text');
  const [attached, setAttached] = useState<string[]>(f?.attached ?? []);
  const startChoices = () => { const c = f ? choicesOf(f) : []; return c.length ? c : ['', '']; };
  const [choices, setChoices] = useState<string[]>(startChoices);
  const busy = useRef(false);
  useEffect(() => { if (open) { busy.current = false; setName(f?.name ?? ''); setType(f ? f.type.split(' · ')[0] : 'Text'); setAttached(f?.attached ?? []); setChoices(startChoices()); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const pick = type === 'Pick one';
  const [clean, cErr] = cleanChoices(choices);
  /* Two blank starter rows aren't an error yet; Create just stays off until there are two options. */
  const choiceErr = pick ? cErr : '';
  const showChoiceErr = pick && clean.length >= 2 && cErr;
  const nameErr = !name.trim() ? '' : !key ? 'Use letters or numbers in the name.' : fields.some((x) => (!f || x.id !== f.id) && (x.name.trim().toLowerCase() === name.trim().toLowerCase() || x.key === key)) ? `A field called ${name.trim()} already exists.` : '';
  const save = () => {
    if (busy.current || !name.trim() || nameErr || choiceErr) return;
    busy.current = true;
    /* A pick-one field's type counts its choices. */
    const opts = pick ? clean : [];
    const t = pick ? pickOneType(opts.length) : type;
    useInv.getState().set('fields', (l) => (!f ? [...l, { id: invId('cf'), name: name.trim(), key, type: t, choices: opts, attached }] : l.map((x) => (x.id === f.id ? { ...x, name: name.trim(), key, type: t, choices: opts, attached } : x))));
    onClose();
    toast.success(!f ? `${name.trim()} field created` : `${name.trim()} saved`);
  };
  return (
    <PanelModal open={open} onClose={onClose} eyebrow={f ? 'Edit field' : 'New field'} title={f ? f.name : 'New custom field'} icon={Textbox} meta={f ? undefined : 'Pick the levels it appears on in each layout.'} width={f ? 560 : 640}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} disabled={!name.trim() || !!nameErr || !!choiceErr} onClick={save}>{f ? 'Save' : 'Create field'}</Button></>}>
      <SheetSection title="Field">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Resident manager phone" /><FieldErr>{nameErr}</FieldErr></Field>
          <Field label="Answer type"><Picker value={type} onChange={setType} options={TYPES.map((t) => ({ id: t, label: t }))} /></Field>
        </div>
      </SheetSection>
      {pick && <SheetSection title={`Options · ${clean.length}`}><ChoicesEditor value={choices} onChange={setChoices} />{showChoiceErr && <FieldErr>{cErr}</FieldErr>}</SheetSection>}
      {/* Editing an existing field: its levels are switched in the panel's own Attached to section, so the dialog holds only name, type and options. */}
      {!f && <SheetSection title="Attached to"><AttachGrid structures={structures} attached={attached} onChange={setAttached} /></SheetSection>}
    </PanelModal>
  );
}

/* Figma 3934:52927 (V3 · Grid): layouts down the side, every level across the top, a box where a layout has that
   level and a dash where it doesn't. Ticking a box attaches the field to that level of that layout. */
const LEVEL_LOOK: Record<string, [Icon, Tone]> = { Building: [Buildings, 'blue'], Floor: [Stack, 'purple'], Flat: [DoorOpen, 'amber'], Room: [Bed, 'green'], Studio: [Door, 'orange'], House: [House, 'blue'] };
const lookOf = (level: string): [Icon, Tone] => LEVEL_LOOK[level] ?? [Stack, 'grey'];
function AttachGrid({ structures, attached, onChange }: { structures: Structure[]; attached: string[]; onChange: (v: string[]) => void }) {
  /* Every level any layout has, in the order they first appear; Tenancy is a record, not a place, so it never shows. */
  const levels: string[] = [];
  for (const st of structures) for (const l of st.levels) if (l.name !== 'Tenancy' && !levels.includes(l.name)) levels.push(l.name);
  const toggle = (t: string) => onChange(attached.includes(t) ? attached.filter((x) => x !== t) : [...attached, t]);
  const picked = levels.map((lv) => [lv, structures.filter((st) => attached.includes(`${st.name} › ${lv}`)).length] as const).filter(([, n]) => n > 0);
  return (
    <div className="space-y-3">
      {/* What it's on, read first; the grid below is where it's changed. */}
      {picked.length > 0 && (
        <div className="flex flex-wrap gap-1.5">{picked.map(([lv, n]) => <Pill key={lv} tone="grey">{lv} · {n} {n === 1 ? 'layout' : 'layouts'}</Pill>)}</div>
      )}
      <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden">
        <table className="w-full table-fixed text-sm">
          <colgroup><col />{levels.map((lv) => <col key={lv} className="w-[47px]" />)}<col className="w-2" /></colgroup>
          <thead>
            <tr className="bg-[#FAFAFA]">
              <th scope="col" className="h-16 pl-3.5 text-left font-mono text-xs font-medium uppercase tracking-[0.48px] text-[#737373]">Layout</th>
              {levels.map((lv) => { const I = levelIcon(lv); return (
                <th key={lv} scope="col" className="x-keep font-normal py-3"><span className="flex flex-col items-center gap-1"><IconTile icon={I} size={22} /><span className="text-[11px] leading-[14px] text-[#737373]">{lv}</span></span></th>
              ); })}
              <th aria-hidden />
            </tr>
          </thead>
          <tbody>
            {structures.map((st) => (
              <tr key={st.id}>
                <th scope="row" className="h-14 pl-3.5 text-left font-normal">
                  <span className="block text-sm leading-5 font-medium text-[#0A0A0A] truncate">{st.name}</span>
                  <span className="block text-xs leading-4 text-[#737373]">{st.properties} {st.properties === 1 ? 'property' : 'properties'}</span>
                </th>
                {levels.map((lv) => {
                  const t = `${st.name} › ${lv}`;
                  return (
                    <td key={lv} className="text-center">
                      {st.levels.some((l) => l.name === lv)
                        ? <Checkbox aria-label={`${lv} in ${st.name}`} checked={attached.includes(t)} onCheckedChange={() => toggle(t)} className="mx-auto" />
                        : <span aria-label={`${st.name} has no ${lv.toLowerCase()}`} title={`${st.name} has no ${lv.toLowerCase()}`} className="text-[#D4D4D4] cursor-default">—</span>}
                    </td>
                  );
                })}
                <td aria-hidden />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Tags (code: Inventories › Setup › Tags, /cms/tags) ---------------- */
const TONES = ['blue', 'green', 'orange', 'amber', 'purple', 'red', 'grey'] as const;
const TONE_NAME: Record<(typeof TONES)[number], string> = { blue: 'Blue', green: 'Green', orange: 'Orange', amber: 'Amber', purple: 'Purple', red: 'Red', grey: 'Grey' };
/** Prototype: tags carry no history yet, so who last edited one is dummy, stable by its place in the list. */
function tagUpdated(t: TagDef, all: TagDef[]): [string, string] {
  const i = Math.max(0, all.findIndex((x) => x.id === t.id));
  return [['Arjun Mehta', 'Tom Baker', 'Priya Shah'][i % 3], ['2 Sep', '28 Aug', '14 Sep', '9 Sep', '20 Aug'][i % 5]];
}
export function TagsPage() {
  const tags = useInv((s) => s.tags);
  const properties = useInv((s) => s.properties);
  const [q, setQ] = useState('');
  const [pick, setOpen] = useState<TagDef | 'new' | null>(null);
  const open = pick && pick !== 'new' ? tags.find((x) => x.id === pick.id) ?? null : pick;
  const used = (t: TagDef) => properties.filter((p) => p.tags.some((x) => x.label === t.label));
  const rows = tags.filter((t) => !q || t.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader icon={Tag} title="Tags" crumbs={['Properties']}>
        {/* Search is the page's only control, so it sits in the header (no toolbar row). */}
        {tags.length > 0 && <div className="w-[240px] [&>label]:!w-full"><SearchInput value={q} onChange={setQ} placeholder="Search tags" /></div>}
        <Button variant="primary" icon={Plus} onClick={() => setOpen('new')}>New tag</Button>
      </PageHeader>
      <PageHeading />
      <Table columns={false} rows={rows} empty={<Empty art="noResults" title="No tags yet" sub="Tags label properties, like Catered or Pet friendly." />} onRow={setOpen} selected={open && open !== 'new' ? open.id : undefined}
            cols={[
              { key: 'no', label: 'S.No.', className: 'w-14', render: (t) => <span className="font-mono text-[#737373] tabular-nums">{rows.indexOf(t) + 1}</span> },
              { key: 'n', label: 'Tag', render: (t) => <Pill tone={t.tone} outline>{t.label}</Pill> },
              { key: 'u', label: 'Used on', render: (t) => { const u = used(t); return u.length
                ? <PropStack props={u} label={<>{u[0].name}{u.length > 1 && <span className="text-[#737373]"> +{u.length - 1}</span>}</>} />
                : <span className="text-[#A3A3A3]">Not used yet</span>; } },
              { key: 'up', label: 'Updated', render: (t) => { const [who, when] = tagUpdated(t, tags); return <span className="inline-flex items-center gap-2 min-w-0"><Avatar name={who} size={24} /><span className="text-[#0A0A0A] truncate">{who}</span><span className="text-[#737373] whitespace-nowrap">· {when}</span></span>; } },
            ]} />
      <TagSheet t={open} nav={open && open !== 'new' ? listNav(rows, (x) => x.id === open.id, (x) => setOpen(x)) : undefined} key={open && open !== 'new' ? open.id : 'new'} usedOn={open && open !== 'new' ? used(open) : []} onClose={() => setOpen(null)} />
    </>
  );
}

/* Tag panel, record-panel language (2026-11-19): read-only hero + Details + Used on; Details' Edit and New tag open the
   centred tag dialog; Delete sits in the control bar. Untagging one property stays inline (the row's hover ✕). */
function TagSheet({ t, usedOn, onClose, nav }: { nav?: SheetNav; t: TagDef | 'new' | null; usedOn: Property[]; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const [asking, setAsking] = useState(false);
  if (!t) return null;
  if (t === 'new') return <TagDialog t={null} open onClose={onClose} />;
  const inv = useInv.getState();
  /* Take this tag off one property, from the Used on list (2026-11-18). */
  const untag = (p: Property) => {
    const tag = p.tags.find((x) => x.label === t.label);
    inv.set('properties', (l) => l.map((x) => (x.id === p.id ? { ...x, tags: x.tags.filter((y) => y.label !== t.label) } : x)));
    toast.success(`${t.label} removed from ${p.name}`, tag ? { action: { label: 'Undo', onClick: () => inv.set('properties', (l) => l.map((x) => (x.id === p.id && !x.tags.some((y) => y.label === tag.label) ? { ...x, tags: [...x.tags, tag] } : x))) } } : undefined);
  };
  const remove = () => {
    inv.set('tags', (l) => l.filter((x) => x.id !== t.id));
    inv.set('properties', (l) => l.map((p) => ({ ...p, tags: p.tags.filter((x) => x.label !== t.label) })));
    setAsking(false);
    onClose();
    toast.success(usedOn.length ? `${t.label} deleted and removed from ${usedOn.length} ${usedOn.length === 1 ? 'property' : 'properties'}` : `${t.label} deleted`);
  };
  const rooms = usedOn.reduce((n, p) => n + p.units, 0);
  return (
    <Sheet open onClose={onClose} nav={nav} title="Tag" width={520} onDelete={{ label: 'Delete tag', onClick: () => setAsking(true) }}>
      <Modal open={asking} onClose={() => setAsking(false)} width={440} title={`Delete ${t.label}?`}
        sub={usedOn.length ? `It comes off ${usedOn.length} ${usedOn.length === 1 ? 'property' : 'properties'}: ${usedOn.map((x) => x.name).join(', ')}.` : 'It isn’t on any property.'}
        footer={<><Button onClick={() => setAsking(false)}>Keep</Button><Button variant="danger" icon={null} onClick={remove}>Delete tag</Button></>}>{null}</Modal>
      <SheetHero icon={Tag} name={t.label} meta={usedOn.length ? `On ${usedOn.length} ${usedOn.length === 1 ? 'property' : 'properties'}` : 'Not on any property yet'}
        facts={[['Properties', String(usedOn.length)], ['Rooms', rooms.toLocaleString('en-GB')], ['Colour', TONE_NAME[t.tone]]]}>
        <Pill tone={t.tone}>{t.label}</Pill>
      </SheetHero>
      <SheetSection title="Details" action={<EditLink onClick={() => setEditing(true)}>Edit</EditLink>}
        rows={[['Name', t.label], ['Colour', <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: toneDot[t.tone] }} />{TONE_NAME[t.tone]}</span>]]} />
      <SheetSection title={`Used on · ${usedOn.length}`}>
        {usedOn.length ? usedOn.map((p) => (
          <div key={p.id} className="group py-2.5 first:pt-0 last:pb-0 border-t border-[#EBEBEB] first:border-t-0 flex items-center gap-3">
            <PropThumb id={p.id} />
            <span className="flex-1 min-w-0">
              <span className="block truncate text-sm leading-5 text-[#0A0A0A]">{p.name}</span>
              <span className="block text-[13px] leading-5 text-[#737373] truncate">{p.campus} · {p.units} rooms</span>
            </span>
            {/* Remove sits at the row's right end, centred on it, shown on hover (2026-11-23). */}
            <button type="button" onClick={() => untag(p)} aria-label={`Remove ${t.label} from ${p.name}`} title="Remove from this property"
              className="size-6 shrink-0 rounded-md flex items-center justify-center text-[#A3A3A3] hover:text-[#0A0A0A] hover:bg-[#F5F5F5] opacity-0 group-hover:opacity-100 focus-visible:opacity-100 outline-none focus-visible:ring-2 focus-visible:ring-ring transition-opacity"><X size={14} /></button>
          </div>
        )) : <p className="text-sm leading-5 text-[#737373]">Not on any property yet.</p>}
      </SheetSection>
      <TagDialog t={t} open={editing} onClose={() => setEditing(false)} />
    </Sheet>
  );
}

/** Create or edit a tag in a centred dialog: name and colour. Renaming updates every property that carries it. */
function TagDialog({ t, open, onClose }: { t: TagDef | null; open: boolean; onClose: () => void }) {
  const tags = useInv((s) => s.tags);
  const [label, setLabel] = useState(t?.label ?? '');
  const [tone, setTone] = useState<TagDef['tone']>(t?.tone ?? 'blue');
  const busy = useRef(false);
  useEffect(() => { if (open) { busy.current = false; setLabel(t?.label ?? ''); setTone(t?.tone ?? 'blue'); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const name = label.trim();
  const clash = tags.some((x) => x.label.toLowerCase() === name.toLowerCase() && (!t || x.id !== t.id));
  const save = () => {
    if (busy.current || !name || clash) return;
    busy.current = true;
    const inv = useInv.getState();
    if (!t) inv.set('tags', (l) => [...l, { id: invId('tg'), label: name, tone }]);
    else {
      inv.set('tags', (l) => l.map((x) => (x.id === t.id ? { ...x, label: name, tone } : x)));
      inv.set('properties', (l) => l.map((p) => ({ ...p, tags: p.tags.map((x) => (x.label === t.label ? { label: name, tone } : x)) })));
    }
    onClose();
    toast.success(!t ? `${name} tag created` : `${name} saved`);
  };
  return (
    <PanelModal open={open} onClose={onClose} eyebrow={t ? 'Edit tag' : 'New tag'} title={t?.label} icon={Tag} width={520}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} disabled={!name || clash} onClick={save}>{t ? 'Save' : 'Create tag'}</Button></>}>
      <SheetSection title="Tag" action={name ? <Pill tone={tone}>{name}</Pill> : undefined}>
        <div className="space-y-4">
          <Field label="Name"><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Catered" /><FieldErr>{clash ? `A tag called ${name} already exists.` : ''}</FieldErr></Field>
          <div>
            <div className="text-sm text-[#525252] mb-2">Colour</div>
            <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-2">
              {TONES.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={tone === c} onClick={() => setTone(c)}
                  className={cx('h-8 pl-2.5 pr-3 rounded-lg border flex items-center gap-1.5 text-sm font-medium transition-colors',
                    tone === c ? 'border-[#0A0A0A] bg-white text-[#0A0A0A]' : 'border-line bg-white text-[#404040] hover:bg-gray-50')}>
                  <span className="size-2 rounded-full shrink-0" style={{ background: toneDot[c] }} />
                  {TONE_NAME[c]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SheetSection>
    </PanelModal>
  );
}
