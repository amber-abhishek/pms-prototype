import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { toast } from 'sonner';
import { Buildings, CaretRight, Info, Lock, Plus, Tag, Textbox, Trash, TreeStructure } from '../../components/icons';
import { Button, Field, Input, Note, PageHeader, PageTitle, Pill, SearchInput, Sheet, Switch, Table, cx, toneCls, toneDot } from '../../components/ui';
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
      <div className="flex-1 overflow-auto">
        <PageTitle title="Property layouts" sub="The levels a property is built from. Rooms and tenancies are the bookable (BSU) levels." />
        <div className="px-8 pb-6 space-y-5">
          <Table card footer={false} rows={structures} onRow={setOpen} summary={`${structures.length} layouts`}
            cols={[
              { key: 'n', label: 'Layout', render: (s) => <span className="font-semibold">{s.name}</span> },
              { key: 'l', label: 'Levels', render: (s) => <Levels s={s} /> },
              { key: 'p', label: 'Properties', className: 'text-right', render: (s) => <span className={cx('tabular-nums', !s.properties && 'text-gray-400')}>{s.properties}</span> },
              { key: 'u', label: 'Updated', render: (s) => <span className="text-[#646A78]">{s.updated}</span> },
            ]} />
          <Note tone="blue" icon={Info} title="A layout in use can’t change its levels">Make a new layout instead, or rename a level. Properties keep the layout they were built from.</Note>
        </div>
      </div>
      <StructureSheet s={open} onClose={() => setOpen(null)} />
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
          <span className={cx('h-[22px] px-2 rounded-lg border bg-white text-xs font-medium flex items-center', l.bsu ? 'border-[#1F45E059] text-[#1F45E0]' : 'border-line text-[#374151]')}>{l.name}</span>
        </span>
      ))}
    </span>
  );
}

function StructureSheet({ s, onClose }: { s: Structure | 'new' | null; onClose: () => void }) {
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
    <Sheet open onClose={onClose} title={isNew ? 'New property layout' : s.name} sub={isNew ? 'Top level first; the last levels are bookable' : `Used by ${s.properties} properties`} width={480}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name.trim() || levels.some((l) => !l.name.trim())} onClick={save}>{isNew ? 'Create layout' : 'Save'}</Button></>}>
      <div className="space-y-4">
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Halls with flats" /></Field>
        <div>
          <div className="text-sm font-medium text-gray-700 mb-1.5">Levels</div>
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
        </div>
        <div className="rounded-xl border border-line bg-[#FAFAFB] p-3"><div className="text-xs text-[#646A78] mb-2">Preview</div><Levels s={{ levels: levels.map((l) => ({ name: l.name || '…', bsu: l.bsu })) }} /></div>
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
      <div className="flex-1 overflow-auto">
        <PageTitle title="Custom fields" sub="Extra details kept on a level of a property layout, like room size or lift access.">
          <SearchInput value={q} onChange={setQ} placeholder="Search fields" />
        </PageTitle>
        <div className="px-8 pb-6">
          <Table card footer={false} rows={rows} onRow={setOpen} summary={`${rows.length} fields`}
            cols={[
              { key: 'n', label: 'Field', render: (f) => <span><span className="block font-medium text-[#111827] leading-[18px]">{f.name}</span><span className="block text-[11px] leading-4 text-[#646A78] font-mono">{f.key}</span></span> },
              { key: 't', label: 'Type', render: (f) => <span className="text-[#646A78]">{f.type}</span> },
              { key: 'a', label: 'Attached to', render: (f) => <span className="flex flex-wrap gap-1">{f.attached.map((a) => <span key={a} className="h-[22px] px-2 rounded-lg border border-line bg-white text-xs text-[#111827] flex items-center">{a}</span>)}</span> },
            ]} />
        </div>
      </div>
      <FieldSheet f={open} onClose={() => setOpen(null)} />
    </>
  );
}

function FieldSheet({ f, onClose }: { f: CField | 'new' | null; onClose: () => void }) {
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
    <Sheet open onClose={onClose} title={isNew ? 'New field' : f.name} sub={isNew ? 'Kept on every entity of the levels you pick' : <span className="font-mono">{f.key}</span>} width={480}
      footer={<>{!isNew && <Button variant="danger-ghost" className="mr-auto" icon={Trash} onClick={() => { useInv.getState().set('fields', (l) => l.filter((x) => x.id !== f.id)); onClose(); toast.success(`${f.name} deleted`); }}>Delete</Button>}<Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name.trim()} onClick={save}>{isNew ? 'Create field' : 'Save'}</Button></>}>
      <div className="space-y-4">
        <Field label="Name" hint={key ? `Key: ${isNew ? key : f.key}` : undefined}><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Warden phone" /></Field>
        <Field label="Type"><Picker value={type} onChange={setType} options={TYPES.map((t) => ({ id: t, label: t }))} /></Field>
        <div>
          <div className="text-sm font-medium text-gray-700 mb-1.5">Attached to</div>
          <div className="rounded-xl border border-line divide-y divide-line max-h-64 overflow-auto">
            {targets.map((t) => <label key={t} className="h-10 px-3 flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50"><Checkbox checked={attached.includes(t)} onCheckedChange={(v) => setAttached((v === true) ? [...attached, t] : attached.filter((x) => x !== t))} />{t}</label>)}
          </div>
        </div>
        <div className="h-12 px-3 rounded-xl border border-line flex items-center"><span className="flex-1"><span className="block text-sm">Required</span><span className="block text-xs text-[#646A78]">An entity can’t go active while it’s empty</span></span><Switch checked={required} onChange={setRequired} label="Required" /></div>
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
      <div className="flex-1 overflow-auto">
        <PageTitle title="Tags" sub="Labels you put on properties to group and filter them, like Catered or Postgraduate.">
          <SearchInput value={q} onChange={setQ} placeholder="Search tags" />
        </PageTitle>
        <div className="px-8 pb-6">
          <Table card footer={false} rows={rows} onRow={setOpen} summary={`${rows.length} tags`}
            cols={[
              { key: 'n', label: 'Tag', render: (t) => <Pill tone={t.tone} outline>{t.label}</Pill> },
              { key: 'u', label: 'Used on', render: (t) => { const u = used(t); return <span className="text-[#646A78]">{u.length ? `${u.length} ${u.length === 1 ? 'property' : 'properties'}` : 'Not used yet'}</span>; } },
              { key: 'p', label: 'Properties', render: (t) => <span className="text-[#646A78] truncate block max-w-[420px]">{used(t).map((p) => p.name).join(', ') || '—'}</span> },
            ]} />
        </div>
      </div>
      <TagSheet t={open} usedOn={open && open !== 'new' ? used(open) : []} onClose={() => setOpen(null)} />
    </>
  );
}

function TagSheet({ t, usedOn, onClose }: { t: TagDef | 'new' | null; usedOn: Property[]; onClose: () => void }) {
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
    <Sheet open onClose={onClose} title={isNew ? 'New tag' : t.label} sub={isNew ? 'Add it to properties from their details page' : usedOn.length ? `On ${usedOn.length} ${usedOn.length === 1 ? 'property' : 'properties'}` : 'Not on any property yet'} width={480}
      footer={<>{!isNew && <Button variant="danger-ghost" className="mr-auto" icon={Trash} onClick={remove}>Delete</Button>}<Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!name || clash} onClick={save}>{isNew ? 'Create tag' : 'Save'}</Button></>}>
      <div className="space-y-5">
        <Field label="Name" hint={clash ? 'A tag with this name already exists' : undefined}><Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Catered" /></Field>
        <div>
          <div className="text-sm font-medium text-gray-700 mb-1.5">Colour</div>
          <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-2">
            {TONES.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={tone === c} onClick={() => setTone(c)}
                className={cx('h-8 pl-2.5 pr-3 rounded-lg border flex items-center gap-1.5 text-sm font-medium transition-colors',
                  tone === c ? cx(toneCls[c], 'border-current') : 'border-line bg-white text-[#374151] hover:bg-gray-50')}>
                <span className="size-3 rounded-full shrink-0" style={{ background: toneDot[c] }} />
                {TONE_NAME[c]}
              </button>
            ))}
          </div>
        </div>
        {!isNew && (
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-700">Used on</span>
              {usedOn.length > 0 && <span className="text-xs text-[#646A78]">Changes here update all {usedOn.length}</span>}
            </div>
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
          </div>
        )}
      </div>
    </Sheet>
  );
}
