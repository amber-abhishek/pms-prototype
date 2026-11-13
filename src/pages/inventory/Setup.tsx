import { useEffect, useRef, useState } from 'react';
import { Empty } from '../../components/ui';
import { flushSync } from 'react-dom';
import { toast } from 'sonner';
import { Bed, Buildings, CaretRight, Door, DoorOpen, House, Lock, Plus, Stack, Tag, Textbox, Trash, TreeStructure, type Icon } from '../../components/icons';
import { Checkbox } from '../../components/shadcn/checkbox';
import { Button, IconTile, PageHeading, Field, Input, Note, PageHeader, Pill, SearchInput, type Tone, Sheet, Switch, Table, cx, toneCls, toneDot, SheetSection, listNav, type SheetNav } from '../../components/ui';
import { invId, useInv, type Field as CField, type Property, type Structure, type TagDef } from '../../data/inventory';
import { FieldErr, Modal, Picker } from './common';

/* ---------------- Property layouts (code: /cms/structures; Figma 3057:2) ---------------- */
export function StructuresPage() {
  const structures = useInv((s) => s.structures);
  const [open, setOpen] = useState<Structure | 'new' | null>(null);
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const rows = structures.filter((s) => !needle || [s.name, ...s.levels.map((l) => l.name)].some((v) => v.toLowerCase().includes(needle)));
  return (
    <>
      <PageHeader icon={TreeStructure} title="Property layouts" crumbs={['Inventory']}>
        {/* Search is the page's only control, so it sits in the header (no toolbar row). */}
        <div className="w-[240px] [&>label]:!w-full"><SearchInput value={q} onChange={setQ} placeholder="Search layouts" /></div>
        <Button variant="primary" icon={Plus} onClick={() => setOpen('new')}>New layout</Button>
      </PageHeader>
      <PageHeading />
      {/* The levels rule sits above the list as a plain line (no box), so it reads as page context, not an alert. */}
      <div className="shrink-0 px-[calc(var(--gx,16px)+var(--cx,12px))] pt-6 pb-5">
        <Note plain tone="blue" icon={Lock} title="A layout in use can’t change its levels">Make a new layout instead, or rename a level.</Note>
      </div>
      <Table rows={rows} empty={<Empty title="No layouts match" sub="Try a layout or level name." />} onRow={setOpen} selected={open && open !== 'new' ? open.id : undefined}
            cols={[
              { key: 'n', label: 'Layout', render: (s) => <span className="font-semibold">{s.name}</span> },
              { key: 'l', label: 'Levels', render: (s) => <Levels s={s} /> },
              { key: 'p', label: 'Properties', render: (s) => <span className={cx('inline-flex items-center gap-1.5 tabular-nums', !s.properties && 'text-gray-400')}>{s.properties}{s.properties > 0 && <Lock size={13} className="text-[#A3A3A3]" aria-label="In use: levels are fixed" />}</span> },
              { key: 'u', label: 'Updated', render: (s) => <span className="text-[#737373]">{s.updated}</span> },
            ]} />
      <StructureSheet s={open} nav={open && open !== 'new' ? listNav(rows, (x) => x.id === open.id, (x) => setOpen(x)) : undefined} key={open && open !== 'new' ? open.id : 'new'} onClose={() => setOpen(null)} />
    </>
  );
}

function Levels({ s }: { s: Pick<Structure, 'levels'> }) {
  return (
    /* 3057:2: 22px chips, 8px radius, 12px medium; BSU levels #1F45E0 with a 35% border; 12px #A3A3A3 chevrons between. */
    <span className="flex items-center gap-2.5 flex-wrap">
      {s.levels.map((l, i) => (
        <span key={i} className="flex items-center gap-2.5">
          {i > 0 && <CaretRight size={10} className="text-gray-400" />}
          <Pill tone={l.bsu ? 'blue' : 'grey'}>{l.name}</Pill>
        </span>
      ))}
    </span>
  );
}

function StructureSheet({ s, onClose , nav }: { nav?: SheetNav;  s: Structure | 'new' | null; onClose: () => void }) {
  const [name, setName] = useState('');
  const [levels, setLevels] = useState<{ key: string; name: string; bsu: boolean }[]>([]);
  const refs = useRef<Record<string, HTMLInputElement | null>>({});
  const busy = useRef(false);
  const isNew = s === 'new';
  const locked = !!s && s !== 'new' && s.properties > 0;
  useEffect(() => {
    if (!s) return;
    busy.current = false;
    if (s === 'new') { setName(''); setLevels([{ key: 'a', name: 'Building', bsu: false }, { key: 'b', name: 'Room', bsu: true }, { key: 'c', name: 'Tenancy', bsu: true }]); }
    else { setName(s.name); setLevels(s.levels.map((l, i) => ({ key: String(i), ...l }))); }
  }, [s]);
  if (!s) return null;
  const addLevel = () => {
    const key = invId('l');
    flushSync(() => setLevels((l) => [...l.slice(0, -2), { key, name: '', bsu: false }, ...l.slice(-2)]));
    refs.current[key]?.focus();
  };
  const save = () => {
    if (busy.current || !name.trim() || levels.some((l) => !l.name.trim())) return;
    busy.current = true;
    const lv = levels.map(({ name: n, bsu }) => ({ name: n.trim(), bsu }));
    useInv.getState().set('structures', (l) => (isNew ? [...l, { id: invId('st'), name: name.trim(), levels: lv, properties: 0, updated: 'Priya Shah · Just now' }] : l.map((x) => (x.id === s.id ? { ...x, name: name.trim(), levels: locked ? x.levels.map((o, i) => ({ ...o, name: lv[i]?.name ?? o.name })) : lv, updated: 'Priya Shah · Just now' } : x))));
    onClose();
    toast.success(isNew ? `${name.trim()} layout created` : `${name.trim()} saved`);
  };
  return (
    <Sheet open onClose={onClose} nav={nav} title={isNew ? 'New property layout' : s.name} sub={isNew ? undefined : `Used by ${s.properties} properties`} width={480}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name.trim() || levels.some((l) => !l.name.trim())} onClick={save}>{isNew ? 'Create layout' : 'Save'}</Button></>}>
      <div className="[&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">
        <SheetSection title="Layout">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Halls with flats" /></Field>
        </SheetSection>
        <SheetSection title="Levels · top first">
          {locked && <div className="mb-4"><Note tone="blue" icon={Lock} title={`In use by ${s.properties} ${s.properties === 1 ? 'property' : 'properties'}`}>Rename levels here; to add, remove or reorder them, make a new layout.</Note></div>}
          <div className="flex flex-col gap-2">{/* Inputs only: no box or row rules around them. */}
            {levels.map((l, i) => (
              <div key={l.key} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-4 tabular-nums">{i + 1}</span>
                <Input ref={(el: HTMLInputElement | null) => { refs.current[l.key] = el; }} aria-label={`Level ${i + 1}`} value={l.name} onChange={(e) => setLevels((x) => x.map((y) => (y.key === l.key ? { ...y, name: e.target.value } : y)))} className="flex-1" placeholder="Level name" />
                <span className="flex items-center gap-1.5 text-xs text-[#737373]">BSU<Switch checked={l.bsu} onChange={(b) => !locked && setLevels((x) => x.map((y) => (y.key === l.key ? { ...y, bsu: b } : y)))} label={`${l.name} bookable`} /></span>
                {!locked && levels.length > 2 && <button type="button" aria-label={`Remove ${l.name}`} onClick={() => setLevels((x) => x.filter((y) => y.key !== l.key))} className="size-7 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-400"><Trash size={14} /></button>}
              </div>
            ))}
          </div>
          {!locked && <Button type="button" size="sm" icon={Plus} className="mt-4 ml-7" onClick={addLevel}>Add level</Button>}
        </SheetSection>
        <SheetSection title="Preview">
          <Levels s={{ levels: levels.map((l) => ({ name: l.name || "…", bsu: l.bsu })) }} />
        </SheetSection>
      </div>
    </Sheet>
  );
}

/* ---------------- Custom fields (Settings › Custom fields, 3058:2) ---------------- */
const TYPES = ['Text', 'Number', 'Yes / no', 'Pick one', 'Date'];
export function CustomFieldsPage() {
  const fields = useInv((s) => s.fields);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<CField | 'new' | null>(null);
  const rows = fields.filter((f) => !q || (f.name + f.key).toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader icon={Textbox} title="Custom fields" crumbs={['Inventory']}>
        {/* Search is the page's only control, so it sits in the header (no toolbar row). */}
        <div className="w-[240px] [&>label]:!w-full"><SearchInput value={q} onChange={setQ} placeholder="Search fields" /></div>
        <Button variant="primary" icon={Plus} onClick={() => setOpen('new')}>New field</Button>
      </PageHeader>
      <PageHeading />
      <Table rows={rows} onRow={setOpen} selected={open && open !== 'new' ? open.id : undefined}
            cols={[
              /* Numbered in list order, so a search renumbers what's left. */
              { key: 'no', label: '#', className: 'w-14', render: (f) => <span className="font-mono text-[#737373] tabular-nums">{rows.indexOf(f) + 1}</span> },
              { key: 'n', label: 'Field', render: (f) => <span><span className="block font-medium text-[#0A0A0A] leading-[18px]">{f.name}</span><span className="block text-xs leading-4 text-[#2563EB] font-mono">{f.key}</span></span> },
              { key: 't', label: 'Type', render: (f) => <span className="text-[#737373]">{f.type}</span> },
              { key: 'a', label: 'Attached to', render: (f) => <span className="flex flex-wrap gap-1">{f.attached.map((a) => <Pill key={a} tone={lookOf(a.split(' › ').pop() ?? '')[1]}>{a}</Pill>)}</span> },
            ]} />
      <FieldSheet f={open} no={open && open !== 'new' ? rows.findIndex((x) => x.id === open.id) + 1 : 0} nav={open && open !== 'new' ? listNav(rows, (x) => x.id === open.id, (x) => setOpen(x)) : undefined} key={open && open !== 'new' ? open.id : 'new'} onClose={() => setOpen(null)} />
    </>
  );
}

function FieldSheet({ f, no, onClose , nav }: { nav?: SheetNav; f: CField | 'new' | null; no: number; onClose: () => void }) {
  const structures = useInv((s) => s.structures);
  const [name, setName] = useState('');
  const [type, setType] = useState('Text');
  const [attached, setAttached] = useState<string[]>([]);
  const [required, setRequired] = useState(false);
  const [asking, setAsking] = useState(false);
  const fields = useInv((s) => s.fields);
  const busy = useRef(false);
  useEffect(() => {
    if (!f) return;
    busy.current = false;
    if (f === 'new') { setName(''); setType('Text'); setAttached([]); setRequired(false); } else { setName(f.name); setType(f.type.split(' · ')[0]); setAttached(f.attached); setRequired(false); }
  }, [f]);
  if (!f) return null;
  const isNew = f === 'new';
  const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const nameErr = !name.trim() ? '' : !key ? 'Use letters or numbers in the name.' : fields.some((x) => (isNew || x.id !== f.id) && (x.name.trim().toLowerCase() === name.trim().toLowerCase() || x.key === key)) ? `A field called ${name.trim()} already exists.` : '';
  const del = () => { useInv.getState().set('fields', (l) => l.filter((x) => x.id !== (f as CField).id)); setAsking(false); onClose(); toast.success(`${(f as CField).name} field deleted`); };
  const save = () => {
    if (busy.current || !name.trim() || nameErr) return;
    busy.current = true;
    const t = type === 'Pick one' ? 'Pick one · 3' : type;
    useInv.getState().set('fields', (l) => (isNew ? [...l, { id: invId('cf'), name: name.trim(), key, type: t, attached }] : l.map((x) => (x.id === f.id ? { ...x, name: name.trim(), type: t, attached } : x))));
    onClose();
    toast.success(isNew ? `${name.trim()} field created` : `${name.trim()} saved`);
  };
  return (
    <Sheet open onClose={onClose} nav={nav} title={isNew ? 'New field' : no > 0 ? `Field #${no}` : 'Field'} width={480}
      footer={<>{!isNew && <Button variant="danger-ghost" className="mr-auto" onClick={() => setAsking(true)}>Delete</Button>}<Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name.trim() || !!nameErr} onClick={save}>{isNew ? 'Create field' : 'Save'}</Button></>}>
      {!isNew && <Modal open={asking} onClose={() => setAsking(false)} icon={Trash} width={440} title={`Delete ${f.name}?`}
        sub={f.attached.length ? `It’s on ${f.attached.join(', ')}. Every value already entered for it is deleted too.` : 'It isn’t attached to anything yet.'}
        footer={<><Button onClick={() => setAsking(false)}>Keep</Button><Button variant="danger" icon={null} onClick={del}>Delete field</Button></>}>{null}</Modal>}
      <div className="[&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">
        <SheetSection title="Field">
        <div className="space-y-4">
        <Field label="Name" hint={key ? `Key: ${isNew ? key : f.key}` : undefined}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Warden phone" /><FieldErr>{nameErr}</FieldErr></Field>
        <Field label="Type"><Picker value={type} onChange={setType} options={TYPES.map((t) => ({ id: t, label: t }))} /></Field>
        </div>
        </SheetSection>
        <SheetSection title="Attached to">
          <AttachGrid structures={structures} attached={attached} onChange={setAttached} />
        </SheetSection>
        <SheetSection title="Rules">
        <div className="h-12 px-3 rounded-xl border border-line flex items-center"><span className="flex-1"><span className="block text-sm">Required</span><span className="block text-xs text-[#737373]">An entity can’t go active while it’s empty</span></span><Switch checked={required} onChange={setRequired} label="Required" /></div>
        </SheetSection>
      </div>
    </Sheet>
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
        <div className="flex flex-wrap gap-1.5">{picked.map(([lv, n]) => <Pill key={lv} tone={lookOf(lv)[1]}>{lv} · {n} {n === 1 ? 'layout' : 'layouts'}</Pill>)}</div>
      )}
      <div className="rounded-xl border border-[#E5E5E5] bg-white overflow-hidden">
        <table className="w-full table-fixed text-sm">
          <colgroup><col />{levels.map((lv) => <col key={lv} className="w-[47px]" />)}<col className="w-2" /></colgroup>
          <thead>
            <tr className="bg-[#FAFAFA]">
              <th scope="col" className="h-16 pl-3.5 text-left font-mono text-xs font-medium uppercase tracking-[0.48px] text-[#737373]">Layout</th>
              {levels.map((lv) => { const [I, tone] = lookOf(lv); return (
                <th key={lv} scope="col" className="x-keep font-normal"><span className="flex flex-col items-center gap-1"><IconTile icon={I} tone={tone} size={22} /><span className="text-[11px] leading-[14px] text-[#737373]">{lv}</span></span></th>
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
export function TagsPage() {
  const tags = useInv((s) => s.tags);
  const properties = useInv((s) => s.properties);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<TagDef | 'new' | null>(null);
  const used = (t: TagDef) => properties.filter((p) => p.tags.some((x) => x.label === t.label));
  const rows = tags.filter((t) => !q || t.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader icon={Tag} title="Tags" crumbs={['Inventory']}>
        {/* Search is the page's only control, so it sits in the header (no toolbar row). */}
        <div className="w-[240px] [&>label]:!w-full"><SearchInput value={q} onChange={setQ} placeholder="Search tags" /></div>
        <Button variant="primary" icon={Plus} onClick={() => setOpen('new')}>New tag</Button>
      </PageHeader>
      <PageHeading />
      <Table rows={rows} empty={<Empty title="No tags yet" sub="Tags label properties, like Catered or Postgraduate." />} onRow={setOpen} selected={open && open !== 'new' ? open.id : undefined}
            cols={[
              { key: 'no', label: '#', className: 'w-14', render: (t) => <span className="font-mono text-[#737373] tabular-nums">{rows.indexOf(t) + 1}</span> },
              { key: 'n', label: 'Tag', render: (t) => <Pill tone={t.tone} outline>{t.label}</Pill> },
              { key: 'u', label: 'Used on', render: (t) => { const u = used(t); return <span className="text-[#737373]">{u.length ? `${u.length} ${u.length === 1 ? 'property' : 'properties'}` : 'Not used yet'}</span>; } },
              { key: 'p', label: 'Properties', render: (t) => <span className="text-[#737373] truncate block max-w-[420px]">{used(t).map((p) => p.name).join(', ') || '—'}</span> },
            ]} />
      <TagSheet t={open} nav={open && open !== 'new' ? listNav(rows, (x) => x.id === open.id, (x) => setOpen(x)) : undefined} key={open && open !== 'new' ? open.id : 'new'} usedOn={open && open !== 'new' ? used(open) : []} onClose={() => setOpen(null)} />
    </>
  );
}

function TagSheet({ t, usedOn, onClose , nav }: { nav?: SheetNav;  t: TagDef | 'new' | null; usedOn: Property[]; onClose: () => void }) {
  const tags = useInv((s) => s.tags);
  const [label, setLabel] = useState('');
  const [tone, setTone] = useState<TagDef['tone']>('blue');
  const [asking, setAsking] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    if (!t) return;
    busy.current = false;
    if (t === 'new') { setLabel(''); setTone('blue'); } else { setLabel(t.label); setTone(t.tone); }
  }, [t]);
  if (!t) return null;
  const isNew = t === 'new';
  const name = label.trim();
  const clash = tags.some((x) => x.label.toLowerCase() === name.toLowerCase() && (isNew || x.id !== t.id));
  const inv = useInv.getState();
  const save = () => {
    if (busy.current || !name || clash) return;
    busy.current = true;
    if (isNew) inv.set('tags', (l) => [...l, { id: invId('tg'), label: name, tone }]);
    else {
      inv.set('tags', (l) => l.map((x) => (x.id === t.id ? { ...x, label: name, tone } : x)));
      inv.set('properties', (l) => l.map((p) => ({ ...p, tags: p.tags.map((x) => (x.label === t.label ? { label: name, tone } : x)) })));
    }
    onClose();
    toast.success(isNew ? `${name} tag created` : `${name} saved`);
  };
  const remove = () => {
    if (isNew) return;
    inv.set('tags', (l) => l.filter((x) => x.id !== t.id));
    inv.set('properties', (l) => l.map((p) => ({ ...p, tags: p.tags.filter((x) => x.label !== t.label) })));
    setAsking(false);
    onClose();
    toast.success(usedOn.length ? `${t.label} deleted and removed from ${usedOn.length} ${usedOn.length === 1 ? 'property' : 'properties'}` : `${t.label} deleted`);
  };
  return (
    <Sheet open onClose={onClose} nav={nav} title={isNew ? 'New tag' : t.label} sub={isNew ? undefined : usedOn.length ? `On ${usedOn.length} ${usedOn.length === 1 ? 'property' : 'properties'}` : 'Not on any property yet'} width={480}
      footer={<>{!isNew && <Button variant="danger-ghost" className="mr-auto" onClick={() => setAsking(true)}>Delete</Button>}<Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name || clash} onClick={save}>{isNew ? 'Create tag' : 'Save'}</Button></>}>
      {!isNew && <Modal open={asking} onClose={() => setAsking(false)} icon={Trash} width={440} title={`Delete ${t.label}?`}
        sub={usedOn.length ? `It comes off ${usedOn.length} ${usedOn.length === 1 ? 'property' : 'properties'}: ${usedOn.map((x) => x.name).join(', ')}.` : 'It isn’t on any property.'}
        footer={<><Button onClick={() => setAsking(false)}>Keep</Button><Button variant="danger" icon={null} onClick={remove}>Delete tag</Button></>}>{null}</Modal>}
      <div className="[&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">
        <SheetSection title="Tag">
        <Field label="Name"><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Catered" /><FieldErr>{clash ? `A tag called ${name} already exists.` : ''}</FieldErr></Field>
        </SheetSection>
        <SheetSection title="Colour">
          <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-2">
            {TONES.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={tone === c} onClick={() => setTone(c)}
                className={cx('h-8 pl-2.5 pr-3 rounded-lg border flex items-center gap-1.5 text-sm font-medium transition-colors',
                  tone === c ? cx(toneCls[c], 'border-current') : 'border-line bg-white text-[#404040] hover:bg-gray-50')}>
                <span className="size-2 rounded-full shrink-0" style={{ background: toneDot[c] }} />
                {TONE_NAME[c]}
              </button>
            ))}
          </div>
        </SheetSection>
        {!isNew && (
          <SheetSection title={usedOn.length ? `Used on · changes update all ${usedOn.length}` : 'Used on'}>
            {usedOn.length ? (
              <div className="flex flex-col gap-2">{/* Inputs only: no box or row rules around them. */}
                {usedOn.map((p) => (
                  <div key={p.id} className="h-10 px-3 flex items-center gap-2.5 text-sm">
                    <Buildings size={16} className="text-gray-400 shrink-0" />
                    <span className="flex-1 truncate text-[#0A0A0A]">{p.name}</span>
                    <span className="text-xs text-[#737373]">{p.campus}</span>
                  </div>
                ))}
              </div>
            ) : <div className="h-10 px-3 rounded-xl border border-dashed border-line flex items-center text-sm text-[#737373]">Not on any property yet</div>}
          </SheetSection>
        )}
      </div>
    </Sheet>
  );
}
