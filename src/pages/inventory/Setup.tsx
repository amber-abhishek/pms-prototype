import { useEffect, useRef, useState } from 'react';
import { Empty } from '../../components/ui';
import { flushSync } from 'react-dom';
import { toast } from 'sonner';
import { Buildings, CaretRight, Info, Lock, Plus, Tag, Textbox, Trash, TreeStructure } from '../../components/icons';
import { Button, PageHeading, Field, Input, Note, PageHeader, Toolbar, Pill, SearchInput, Sheet, Switch, Table, cx, toneCls, toneDot, SheetSection, listNav, type SheetNav } from '../../components/ui';
import { Checkbox } from '../../components/shadcn/checkbox';
import { invId, useInv, type Field as CField, type Property, type Structure, type TagDef } from '../../data/inventory';
import { Picker } from './common';

/* ---------------- Property layouts (code: /cms/structures; Figma 3057:2) ---------------- */
export function StructuresPage() {
  const structures = useInv((s) => s.structures);
  const [open, setOpen] = useState<Structure | 'new' | null>(null);
  return (
    <>
      <PageHeader icon={TreeStructure} title="Property layouts" crumbs={['Inventory']}>
        <Button variant="primary" icon={Plus} onClick={() => setOpen('new')}>New layout</Button>
      </PageHeader>
      <PageHeading />
      <div className="shrink-0 px-[var(--tx,16px)] pb-2">
        <Note tone="blue" icon={Info} title="A layout in use can’t change its levels">Make a new layout instead, or rename a level.</Note>
      </div>
      <Table rows={structures} onRow={setOpen} selected={open && open !== 'new' ? open.id : undefined}
            cols={[
              { key: 'n', label: 'Layout', render: (s) => <span className="font-semibold">{s.name}</span> },
              { key: 'l', label: 'Levels', render: (s) => <Levels s={s} /> },
              { key: 'p', label: 'Properties', className: 'text-right', render: (s) => <span className={cx('tabular-nums', !s.properties && 'text-gray-400')}>{s.properties}</span> },
              { key: 'u', label: 'Updated', render: (s) => <span className="text-[#646A78]">{s.updated}</span> },
            ]} />
      <StructureSheet s={open} nav={open && open !== 'new' ? listNav(structures, (x) => x.id === open.id, (x) => setOpen(x)) : undefined} key={open && open !== 'new' ? open.id : 'new'} onClose={() => setOpen(null)} />
    </>
  );
}

function Levels({ s }: { s: Pick<Structure, 'levels'> }) {
  return (
    /* 3057:2: 22px chips, 8px radius, 12px medium; BSU levels #1F45E0 with a 35% border; 12px #9CA3AF chevrons between. */
    <span className="flex items-center gap-2.5 flex-wrap">
      {s.levels.map((l, i) => (
        <span key={i} className="flex items-center gap-2.5">
          {i > 0 && <CaretRight size={10} className="text-gray-400" />}
          <span className={cx('h-[22px] px-2 rounded-md border bg-white text-xs font-medium flex items-center', l.bsu ? 'border-[#1F45E059] text-[#1F45E0]' : 'border-line text-[#374151]')}>{l.name}</span>
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
          <div className="rounded-xl border border-line divide-y divide-line">
            {levels.map((l, i) => (
              <div key={l.key} className="h-12 px-3 flex items-center gap-2.5">
                <span className="text-xs text-gray-400 w-4 tabular-nums">{i + 1}</span>
                <Input ref={(el: HTMLInputElement | null) => { refs.current[l.key] = el; }} aria-label={`Level ${i + 1}`} value={l.name} onChange={(e) => setLevels((x) => x.map((y) => (y.key === l.key ? { ...y, name: e.target.value } : y)))} className="flex-1" placeholder="Level name" />
                <span className="flex items-center gap-1.5 text-xs text-[#646A78]">BSU<Switch checked={l.bsu} onChange={(b) => !locked && setLevels((x) => x.map((y) => (y.key === l.key ? { ...y, bsu: b } : y)))} label={`${l.name} bookable`} /></span>
                {!locked && levels.length > 2 && <button type="button" aria-label={`Remove ${l.name}`} onClick={() => setLevels((x) => x.filter((y) => y.key !== l.key))} className="size-7 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-400"><Trash size={14} /></button>}
              </div>
            ))}
          </div>
          {locked ? <p className="mt-2 text-xs text-[#646A78] flex gap-1.5"><Lock size={13} />In use, so you can rename levels but not add, remove or reorder them.</p>
            : <Button type="button" size="sm" icon={Plus} className="mt-2" onClick={addLevel}>Add level</Button>}
        </SheetSection>
        <SheetSection title="Preview">
          <div className="rounded-xl border border-line bg-[#FAFAFB] p-3"><Levels s={{ levels: levels.map((l) => ({ name: l.name || '…', bsu: l.bsu })) }} /></div>
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
        <Button variant="primary" icon={Plus} onClick={() => setOpen('new')}>New field</Button>
      </PageHeader>
      <Toolbar right={<SearchInput value={q} onChange={setQ} placeholder="Search fields" />} />
      <Table rows={rows} onRow={setOpen} selected={open && open !== 'new' ? open.id : undefined}
            cols={[
              { key: 'n', label: 'Field', render: (f) => <span><span className="block font-medium text-[#111827] leading-[18px]">{f.name}</span><span className="block text-[11px] leading-4 text-[#646A78] font-mono">{f.key}</span></span> },
              { key: 't', label: 'Type', render: (f) => <span className="text-[#646A78]">{f.type}</span> },
              { key: 'a', label: 'Attached to', render: (f) => <span className="flex flex-wrap gap-1">{f.attached.map((a) => <span key={a} className="h-[22px] px-2 rounded-md border border-line bg-white text-xs text-[#111827] flex items-center">{a}</span>)}</span> },
            ]} />
      <FieldSheet f={open} nav={open && open !== 'new' ? listNav(rows, (x) => x.id === open.id, (x) => setOpen(x)) : undefined} key={open && open !== 'new' ? open.id : 'new'} onClose={() => setOpen(null)} />
    </>
  );
}

function FieldSheet({ f, onClose , nav }: { nav?: SheetNav;  f: CField | 'new' | null; onClose: () => void }) {
  const structures = useInv((s) => s.structures);
  const [name, setName] = useState('');
  const [type, setType] = useState('Text');
  const [attached, setAttached] = useState<string[]>([]);
  const [required, setRequired] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    if (!f) return;
    busy.current = false;
    if (f === 'new') { setName(''); setType('Text'); setAttached([]); setRequired(false); } else { setName(f.name); setType(f.type.split(' · ')[0]); setAttached(f.attached); setRequired(false); }
  }, [f]);
  if (!f) return null;
  const isNew = f === 'new';
  const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const targets = structures.flatMap((s) => s.levels.filter((l) => l.name !== 'Tenancy').map((l) => `${s.name} › ${l.name}`));
  const save = () => {
    if (busy.current || !name.trim()) return;
    busy.current = true;
    const t = type === 'Pick one' ? 'Pick one · 3' : type;
    useInv.getState().set('fields', (l) => (isNew ? [...l, { id: invId('cf'), name: name.trim(), key, type: t, attached }] : l.map((x) => (x.id === f.id ? { ...x, name: name.trim(), type: t, attached } : x))));
    onClose();
    toast.success(isNew ? `${name.trim()} field created` : `${name.trim()} saved`);
  };
  return (
    <Sheet open onClose={onClose} nav={nav} title={isNew ? 'New field' : f.name} sub={isNew ? undefined : <span className="font-mono">{f.key}</span>} width={480}
      footer={<>{!isNew && <Button variant="danger-ghost" className="mr-auto" onClick={() => { useInv.getState().set('fields', (l) => l.filter((x) => x.id !== f.id)); onClose(); toast.success(`${f.name} deleted`); }}>Delete</Button>}<Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name.trim()} onClick={save}>{isNew ? 'Create field' : 'Save'}</Button></>}>
      <div className="[&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">
        <SheetSection title="Field">
        <div className="space-y-4">
        <Field label="Name" hint={key ? `Key: ${isNew ? key : f.key}` : undefined}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Warden phone" /></Field>
        <Field label="Type"><Picker value={type} onChange={setType} options={TYPES.map((t) => ({ id: t, label: t }))} /></Field>
        </div>
        </SheetSection>
        <SheetSection title="Attached to">
          <div className="rounded-xl border border-line divide-y divide-line max-h-64 overflow-auto">
            {targets.map((t) => <label key={t} className="h-10 px-3 flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50"><Checkbox checked={attached.includes(t)} onCheckedChange={(v) => setAttached((v === true) ? [...attached, t] : attached.filter((x) => x !== t))} />{t}</label>)}
          </div>
        </SheetSection>
        <SheetSection title="Rules">
        <div className="h-12 px-3 rounded-xl border border-line flex items-center"><span className="flex-1"><span className="block text-sm">Required</span><span className="block text-xs text-[#646A78]">An entity can’t go active while it’s empty</span></span><Switch checked={required} onChange={setRequired} label="Required" /></div>
        </SheetSection>
      </div>
    </Sheet>
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
        <Button variant="primary" icon={Plus} onClick={() => setOpen('new')}>New tag</Button>
      </PageHeader>
      <Toolbar right={<SearchInput value={q} onChange={setQ} placeholder="Search tags" />} />
      <Table rows={rows} empty={<Empty title="No tags yet" sub="Tags label properties, like Catered or Postgraduate." />} onRow={setOpen} selected={open && open !== 'new' ? open.id : undefined}
            cols={[
              { key: 'n', label: 'Tag', render: (t) => <Pill tone={t.tone} outline>{t.label}</Pill> },
              { key: 'u', label: 'Used on', render: (t) => { const u = used(t); return <span className="text-[#646A78]">{u.length ? `${u.length} ${u.length === 1 ? 'property' : 'properties'}` : 'Not used yet'}</span>; } },
              { key: 'p', label: 'Properties', render: (t) => <span className="text-[#646A78] truncate block max-w-[420px]">{used(t).map((p) => p.name).join(', ') || '—'}</span> },
            ]} />
      <TagSheet t={open} nav={open && open !== 'new' ? listNav(rows, (x) => x.id === open.id, (x) => setOpen(x)) : undefined} key={open && open !== 'new' ? open.id : 'new'} usedOn={open && open !== 'new' ? used(open) : []} onClose={() => setOpen(null)} />
    </>
  );
}

function TagSheet({ t, usedOn, onClose , nav }: { nav?: SheetNav;  t: TagDef | 'new' | null; usedOn: Property[]; onClose: () => void }) {
  const tags = useInv((s) => s.tags);
  const [label, setLabel] = useState('');
  const [tone, setTone] = useState<TagDef['tone']>('blue');
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
    onClose();
    toast.success(`${t.label} deleted`);
  };
  return (
    <Sheet open onClose={onClose} nav={nav} title={isNew ? 'New tag' : t.label} sub={isNew ? undefined : usedOn.length ? `On ${usedOn.length} ${usedOn.length === 1 ? 'property' : 'properties'}` : 'Not on any property yet'} width={480}
      footer={<>{!isNew && <Button variant="danger-ghost" className="mr-auto" onClick={remove}>Delete</Button>}<Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name || clash} onClick={save}>{isNew ? 'Create tag' : 'Save'}</Button></>}>
      <div className="[&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">
        <SheetSection title="Tag">
        <Field label="Name" hint={clash ? 'A tag with this name already exists' : undefined}><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Catered" /></Field>
        </SheetSection>
        <SheetSection title="Colour">
          <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-2">
            {TONES.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={tone === c} onClick={() => setTone(c)}
                className={cx('h-8 pl-2.5 pr-3 rounded-lg border flex items-center gap-1.5 text-sm font-medium transition-colors',
                  tone === c ? cx(toneCls[c], 'border-current') : 'border-line bg-white text-[#374151] hover:bg-gray-50')}>
                <span className="size-2 rounded-full shrink-0" style={{ background: toneDot[c] }} />
                {TONE_NAME[c]}
              </button>
            ))}
          </div>
        </SheetSection>
        {!isNew && (
          <SheetSection title={usedOn.length ? `Used on · changes update all ${usedOn.length}` : 'Used on'}>
            {usedOn.length ? (
              <div className="rounded-xl border border-line divide-y divide-line">
                {usedOn.map((p) => (
                  <div key={p.id} className="h-10 px-3 flex items-center gap-2.5 text-sm">
                    <Buildings size={16} className="text-gray-400 shrink-0" />
                    <span className="flex-1 truncate text-[#111827]">{p.name}</span>
                    <span className="text-xs text-[#646A78]">{p.campus}</span>
                  </div>
                ))}
              </div>
            ) : <div className="h-10 px-3 rounded-xl border border-dashed border-line flex items-center text-sm text-[#646A78]">Not on any property yet</div>}
          </SheetSection>
        )}
      </div>
    </Sheet>
  );
}
