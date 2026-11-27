import { useEffect, useMemo, useRef, useState } from 'react';
import { Illustration } from '../../components/Illustration';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Archive, ArrowCounterClockwise, CaretDown, Stack, ArrowsDownUp, Buildings, DotsThree, FileCsv, PauseCircle, PencilSimple, UploadSimple, X, CheckCircle,
} from '../../components/icons';
import { Button, Empty, MultiFilter, PageHeader, Pill, SearchInput, SelectFilter, SheetRow, SheetSection, Table, cx, PIN, avatarFx } from '../../components/ui';
import { PHOTO } from './photos';
import { EditSheet } from './PropertyDetail';
import { invId, logAct, useInv, type Property } from '../../data/inventory';
import { useOrg } from '../../data/org';
import { layoutOf } from './LevelSheet';
import { EditLink, LayoutRadios, useLayout, Menu, Modal, PanelModal, PropStatus, RadioCard, Stepper, Tags } from './common';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/shadcn/dropdown-menu';
import { Dropdown, Input } from '../../components/ui';


/** The Properties rows in their on-screen order (search, filters, sort), so the property modal's ↑ ↓ steps through what the list shows. */
export const shownOrder: { ids: string[] } = { ids: [] };

export function PropertiesPage() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const props = useInv((s) => s.properties);
  const patchProp = useInv((s) => s.patchProp);
  const [q, setQ] = useState('');
  const [archiving, setArchiving] = useState<Property | null>(null);
  /* Edit in the row menu opens the edit sheet straight away, not the property sheet first (2026-11-18). */
  const [editing, setEditing] = useState<Property | null>(null);
  const importOpen = sp.get('import') === '1';
  const [bulk, setBulk] = useState(false);
  const setImport = (v: boolean) => setSp((p) => { const n = new URLSearchParams(p); if (v) n.set('import', '1'); else n.delete('import'); return n; });
  const empty = sp.get('empty') === '1';
  /* The property page's Archive sends a property with live tenancies here (?archive=<id>) to close it first. */
  const askArchive = sp.get('archive');
  useEffect(() => {
    if (!askArchive) return;
    const p = props.find((x) => x.id === askArchive);
    if (p) setArchiving(p);
    setSp((x) => { const n = new URLSearchParams(x); n.delete('archive'); return n; }, { replace: true });
  }, [askArchive]); // eslint-disable-line react-hooks/exhaustive-deps

  const [campusF, setCampusF] = useState<string[]>([]);
  const [layoutF, setLayoutF] = useState<string[]>([]);
  const layoutNames = useInv((st) => st.structures).map((x) => x.name);
  const [statusF, setStatusF] = useState<string[]>([]);
  const [sort, setSort] = useState<{ key: 'name' | 'units'; dir: 1 | -1 } | null>(null);
  const list = useMemo(() => (empty ? [] : props).filter((p) => p.status !== 'Archived'), [props, empty]);
  /* Archived properties stay out of the list until the Status filter asks for them. */
  const archivedShown = !empty && statusF.includes('Archived');
  /* The list and its toolbar stay while anything exists, archived included, so the Archived filter is always reachable. */
  const anyProps = !empty && props.length > 0;
  const rows = (archivedShown ? props : list)
    .filter((p) => (!campusF.length || campusF.includes(p.campus)) && (!layoutF.length || layoutF.includes(layoutOf(p))) && (!statusF.length || statusF.includes(p.status)) && (!q || (p.name + p.address).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => !sort ? 0 : sort.dir * (sort.key === 'units' ? a.units - b.units : a.name.localeCompare(b.name)));
  shownOrder.ids = rows.map((p) => p.id);
  const sortBy = (key: 'name' | 'units') => setSort((s) => (s?.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  /* Figma 3884:39809 heads: Property and Units carry the ↕ sort glyph, ink while that column sorts the table. */
  const head = (label: string, key: 'name' | 'units') => (
    <button type="button" onClick={() => sortBy(key)} aria-label={`Sort by ${label}`} className="inline-flex items-center gap-1.5 uppercase hover:text-[#0A0A0A]">
      {label}<ArrowsDownUp size={14} strokeWidth={2} className={sort?.key === key ? 'text-[#0A0A0A]' : 'text-[#737373]'} />
    </button>
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !/INPUT|TEXTAREA|SELECT/.test(t.tagName) && !document.querySelector('[role=dialog]')) nav('/properties/new');
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [nav]);

  const archive = (p: Property) => {
    if (p.liveTenancies > 0) return setArchiving(p);
    patchProp(p.id, (x) => ({ status: 'Archived', archivedFrom: x.status, activity: logAct(x, `Archived ${x.name}`) }));
    toast.success(`${p.name} archived`, { action: { label: 'Undo', onClick: () => patchProp(p.id, () => ({ status: p.status })) } });
  };
  /* Restore puts it back as it was when archived (Inactive if that isn't known), so nothing starts letting by surprise. */
  const restore = (p: Property) => {
    const to = p.archivedFrom && p.archivedFrom !== 'Archived' ? p.archivedFrom : 'Inactive';
    patchProp(p.id, (x) => ({ status: to, archivedFrom: undefined, activity: logAct(x, `Restored ${x.name}`) }));
    toast.success(`${p.name} restored · ${to.toLowerCase()}`, { action: { label: 'Undo', onClick: () => patchProp(p.id, () => ({ status: 'Archived', archivedFrom: p.archivedFrom })) } });
  };

  const cols = [
    /* Figma 3884:39809 row: 116×62 photo (r6), then a 12px blue kicker, the 14px medium name and a grey street · postcode line; 84px tall. */
    { key: 'name', label: head('Property', 'name'), className: 'py-[11px]', render: (p: Property) => {
      const k = KICKER[p.id] ?? (p.status === 'Active' ? null : 'No occupancy 2026/27');
      return (
        <span className="flex items-center gap-4 min-w-0">
          {PHOTO[p.id] ? <img src={PHOTO[p.id]} alt="" loading="lazy" className="w-[120px] h-16 rounded-[5px] object-cover shrink-0 bg-[#F5F5F5]" />
            : <span className="w-[120px] h-16 rounded-[5px] bg-[#F5F5F5] shrink-0 flex items-center justify-center"><Buildings size={20} className="text-[#A3A3A3]" /></span>}
          <span className="min-w-0 flex flex-col gap-1">
            {k && <span className={cx('text-xs leading-4 font-medium', KICKER[p.id] ? 'text-[#0284C7]' : 'text-[#737373]')}>{k}</span>}
            <span className="text-base leading-6 font-medium text-[#0A0A0A] truncate max-w-[320px]" title={p.name}>{p.name}</span>
            <span className="text-sm leading-5 text-[#737373] truncate max-w-[320px]">{shortAddress(p.address)}</span>
          </span>
        </span>
      );
    } },
    { key: 'Location', label: 'Location', render: (p: Property) => <span className="text-[#404040]">{p.campus}</span> },
    { key: 'Layout', label: 'Layout', render: (p: Property) => <span className="text-[#404040]">{layoutOf(p)}</span> },
    { key: 'Tags', label: 'Tags', render: (p: Property) => <Tags tags={p.tags} /> },
    { key: 'Units', label: head('Units', 'units'), render: (p: Property) => <span className="font-medium tabular-nums">{p.units.toLocaleString('en-GB')}</span> },
    { key: 'Status', label: 'Status', render: (p: Property) => <PropStatus s={p.status} /> },
    {
      key: 'menu', label: <span className="sr-only">Actions</span>, className: 'w-14 text-right', render: (p: Property) => (
        <Menu width={168} trigger={(o) => <button type="button" aria-label={`More for ${p.name}`} onClick={(e) => { e.stopPropagation(); o(); }} className="size-8 rounded-lg border border-[#E5E5E5] bg-white hover:bg-[#F5F5F5] inline-flex items-center justify-center text-[#404040]"><DotsThree size={16} strokeWidth={1.75} /></button>}
          items={p.status === 'Archived' ? [{ label: 'Restore', icon: ArrowCounterClockwise, onClick: () => restore(p) }] : [{ label: 'Edit', icon: PencilSimple, onClick: () => setEditing(p) }, 'sep', { label: 'Archive', icon: Archive, danger: true, onClick: () => archive(p) }]} />
      ),
    },
  ];

  return (
    <>
      <PageHeader icon={Buildings} title="All properties" crumbs={[{ label: 'Properties', plain: true }]}>
        {/* While empty, the empty state carries the create choices; the header doesn't repeat them. */}
        {anyProps && <CreateButton onSingle={() => nav('/properties/new')} onBulk={() => setBulk(true)} onImport={() => setImport(true)} />}
      </PageHeader>
      {!anyProps ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <EmptyArt />
            <div className="text-base leading-6 font-medium mt-5">No properties yet</div>
            <p className="text-sm text-[#737373] mt-1">Create one, or import from another PMS.</p>
            <div className="flex justify-center gap-2 mt-4">
              <CreateButton onSingle={() => nav('/properties/new')} onBulk={() => setBulk(true)} onImport={() => setImport(true)} />
              <Button icon={UploadSimple} onClick={() => setImport(true)}>Import from another PMS</Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Figma 3884:39809 toolbar: 68px, 16/24 padding; 280×36 search on the left; campus, layout and status dropdowns and Display on the right. */}
          <div {...PIN} className="shrink-0 px-6 py-4 flex items-center gap-3">
            <div className="[&>label]:w-[280px] [&>label]:h-9"><SearchInput value={q} onChange={setQ} placeholder="Search properties" /></div>
            <div className="ml-auto flex items-center gap-3">
              {/* Location is one pick with an All row and counts, as on Units (2026-11-26). */}
              <SelectFilter label="Location" width={220} value={campusF[0] ?? ''} onChange={(v) => setCampusF(v ? [v] : [])}
                options={[...new Set(props.map((x) => x.campus))].map((c) => ({ value: c, meta: props.filter((x) => x.campus === c).length }))} />
              <MultiFilter label="Layout" value={layoutF} onChange={setLayoutF} options={layoutNames.map((value) => ({ value }))} />
              <MultiFilter label="Status" value={statusF} onChange={setStatusF} width={240} options={[{ value: 'Active', tone: 'green' }, { value: 'Draft', tone: 'amber' }, { value: 'Inactive', tone: 'grey' }, { value: 'Closed to allocations', tone: 'amber' }, { value: 'Archived', tone: 'red' }]} />
            </div>
          </div>
          <Table rows={rows} cols={cols} onRow={(p) => nav(`/properties/${p.id}`)}
            empty={<Empty title="No properties match" sub="Try another location or clear the search." />}
            footer="always" summary={archivedShown ? `${rows.length} ${rows.length === 1 ? 'property' : 'properties'}` : rows.length === list.length ? `${list.length} ${list.length === 1 ? 'property' : 'properties'}` : `${rows.length} of ${list.length} properties`} />
        </>
      )}
      <ImportDialog open={importOpen} onClose={() => setImport(false)} />
      <BulkCreateDialog open={bulk} onClose={() => setBulk(false)} />
      <LiveTenanciesDialog p={archiving} onClose={() => setArchiving(null)} />
      {editing && <EditSheet p={editing} which="basics" onClose={() => setEditing(null)} />}
    </>
  );
}

/* Dummy row details for the Figma kicker (the backend has none yet); photos come from ./photos. */
/** Dummy pre-let share per property (no backend yet); the list's kicker and the property sheet's key facts share it. */
export const PRE_LET: Record<string, number> = { col: 88, jb: 83, ust: 94, ste: 91, hb: 86, js: 89 };
const KICKER: Record<string, string> = Object.fromEntries(Object.entries(PRE_LET).map(([k, v]) => [k, `${v}% occupancy`]));
/** "South Road, Durham DH1 3DF" → "South Road · DH1 3DF". */
const shortAddress = (a: string) => { const parts = a.split(', '); const pc = parts[parts.length - 1].split(' ').slice(-2).join(' '); return parts.length > 1 ? `${parts[0]} · ${pc}` : a; };

/* Figma empty-state illustrations (Inventory · Empty states): properties for a new tenant, rooms for a property with none. */
export function EmptyArt({ kind = 'building' }: { kind?: 'building' | 'clipboard' }) {
  return <Illustration name={kind === 'clipboard' ? 'rooms' : 'properties'} />;
}

/** Create property: a split button. The main part opens the single-property wizard; the chevron offers bulk create
 *  and import, each with one line saying who it's for (2026-11-19). */
function CreateButton({ onSingle, onBulk, onImport }: { onSingle: () => void; onBulk: () => void; onImport: () => void }) {
  const items = [
    { icon: Stack, title: 'Bulk create', sub: 'Many similar properties from one layout.', onClick: onBulk },
    { icon: UploadSimple, title: 'Import from another PMS', sub: 'Moving over? Upload your data as a CSV.', onClick: onImport },
  ];
  return (
    <span className="inline-flex">
      <Button variant="primary" icon={null} className="rounded-r-none" onClick={onSingle}>Create property</Button>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="primary" icon={null} aria-label="More ways to create" className="rounded-l-none px-2 border-l border-white/25"><CaretDown size={16} /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" style={{ width: 300 }}>
          {items.map((it) => (
            <DropdownMenuItem key={it.title} onSelect={it.onClick} className="h-auto px-2.5 py-2 items-start gap-2.5">
              <it.icon size={16} className="mt-0.5" />
              <span className="min-w-0"><span className="block text-sm text-[#0A0A0A]">{it.title}</span><span className="block text-xs leading-[18px] text-[#737373]">{it.sub}</span></span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}

/** An example cell for a level's template column. */
const sampleOf = (level: string) => (/house/i.test(level) ? '1' : /build|block|hall/i.test(level) ? 'A' : /floor|level|storey/i.test(level) ? '1' : /flat|apartment|cluster/i.test(level) ? 'A1' : 'A1-01');

/* ---------------- Bulk create: several similar properties from one layout ---------------- */
const BULK_TYPES = ['Ensuite single', 'Standard single', 'Studio'] as const;
function BulkCreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [layoutName, setStructure] = useState('Shared houses');
  const shape = useLayout(layoutName);
  const structure = shape.kind;
  const orgCampuses = useOrg((o) => o.campuses);
  const campusNames = orgCampuses.length ? orgCampuses.filter((c) => c.status !== 'Inactive').map((c) => c.name) : ['Durham City', 'Queen’s Campus'];
  const [campus, setCampus] = useState(campusNames[0] ?? '');
  const [pattern, setPattern] = useState('Mill Lane {n}');
  const [count, setCount] = useState(6);
  const [roomsEach, setRoomsEach] = useState(5);
  const [roomType, setRoomType] = useState<(typeof BULK_TYPES)[number]>('Standard single');
  const [done, setDone] = useState(0);
  const busy = useRef(false);
  useEffect(() => { if (open) { busy.current = false; setDone(0); } }, [open]);
  const names = Array.from({ length: count }, (_, i) => (pattern.includes('{n}') ? pattern.replace('{n}', String(i + 1)) : `${pattern} ${i + 1}`).trim());
  const valid = !!pattern.replace('{n}', '').trim();
  const create = () => {
    if (busy.current || !valid) return;
    busy.current = true;
    const made: Property[] = names.map((name) => ({
      id: invId('p'), name, campus, structure, layout: shape.name, tags: [], units: roomsEach, status: 'Draft', address: '', zone: '', invNo: '', letting: 'Weekly',
      blocks: [{ name, floors: 1, flats: 1, rooms: roomsEach, roomType, size: 12 }], build: null, photos: 0, description: '', amenities: [], wardenPhone: '',
      createdBy: 'Arjun Mehta', created: '19 Nov', activity: [{ who: 'Arjun Mehta', what: `${name} created in bulk`, when: 'Just now' }],
      roomTypes: [{ name: roomType, rooms: roomsEach, rent: 0 }], liveTenancies: 0, fees: 1,
      counts: { all: roomsEach, active: 0, draft: roomsEach, inactive: 0, archived: 0 },
    }));
    useInv.getState().set('properties', (ps) => [...ps, ...made]);
    /* Logged on Imports like every other build, so the team can see what was made and by whom (2026-11-20). */
    useInv.getState().set('imports', (l) => [{ id: invId('im'), name: made.length > 1 ? `${made[0].name} – ${made[made.length - 1].name}` : made[0].name, kind: 'Bulk create', status: 'Succeeded', done: made.length * roomsEach, total: made.length * roomsEach, by: 'Arjun Mehta', started: 'Just now', structure: shape.name, creates: `${made.length} properties · ${made.length * roomsEach} rooms` }, ...l]);
    setDone(made.length);
  };
  if (done) {
    return (
      <Modal open={open} onClose={onClose} width={440} title={`${done} properties created`} sub={`Saved as drafts with ${roomsEach} rooms each.`}
        footer={<Button variant="primary" icon={null} onClick={onClose}>Done</Button>} />
    );
  }
  return (
    <PanelModal open={open} onClose={onClose} eyebrow="Bulk create properties"
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} disabled={!valid} onClick={create}>Create {count} properties</Button></>}>
      {/* The side panels' language: r16 section cards with a 48px grey strip. Plain divs for the labels, not <label>: a
          label around a stepper would press its − button when the label text is clicked. */}
      <SheetSection title="Layout"><LayoutRadios value={shape.name} onChange={setStructure} /></SheetSection>
      <SheetSection title="Properties">
        {/* Campus is a dropdown, not a segmented control: an organisation can have any number of campuses. */}
        <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-x-3 gap-y-4">
          <div className="col-span-2">
            <div className="text-sm leading-5 text-[#525252] mb-1.5">Location</div>
            <Dropdown ariaLabel="Location" value={campus} onChange={setCampus} options={campusNames.map((c) => ({ value: c, label: c }))} />
          </div>
          <div>
            <div className="text-sm leading-5 text-[#525252] mb-1.5">Name</div>
            <Input aria-label="Name pattern" value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="e.g. Mill Lane {n}" />
            <div className="text-[13px] leading-5 text-[#737373] mt-1">{'{n}'} counts up from 1</div>
          </div>
          <div>
            <div className="text-sm leading-5 text-[#525252] mb-1.5">How many</div>
            <Stepper value={count} onChange={setCount} min={2} max={50} fill />
          </div>
        </div>
      </SheetSection>
      <SheetSection title="Rooms">
        <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-x-3">
          <div>
            <div className="text-sm leading-5 text-[#525252] mb-1.5">Room type</div>
            <Dropdown ariaLabel="Room type" value={roomType} onChange={(v) => setRoomType(v as (typeof BULK_TYPES)[number])} options={BULK_TYPES.map((t) => ({ value: t, label: t }))} />
          </div>
          <div>
            <div className="text-sm leading-5 text-[#525252] mb-1.5">In each</div>
            <Stepper value={roomsEach} onChange={setRoomsEach} min={1} max={40} fill />
          </div>
        </div>
      </SheetSection>
      {/* Every name is listed (up to 50); the body scrolls. */}
      <SheetSection title={`Preview · ${count} properties · ${count * roomsEach} rooms`}>
        {/* A long pattern truncates before the number, so each row still shows which one it is. */}
        {names.map((n, i) => { const [head, tail] = pattern.includes('{n}') ? [pattern.split('{n}')[0], `${i + 1}${pattern.split('{n}').slice(1).join('{n}')}`] : [`${pattern} `, String(i + 1)];
          return <SheetRow key={i} title={n ? <span className="flex min-w-0" title={n}><span className="truncate">{head.trimEnd()}</span><span className={cx('shrink-0 whitespace-pre', /\s$/.test(head) && 'pl-1')}>{tail}</span></span> : 'Untitled'} end={<span className="shrink-0 text-sm leading-5 text-[#737373]">{roomsEach} × {roomType.toLowerCase()}</span>} />; })}
      </SheetSection>
    </PanelModal>
  );
}

/* ---------------- Flow 2 · Import from another PMS ---------------- */
type ImpStage = 'pick' | 'problems' | 'ok' | 'queued';
export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const [stage, setStage] = useState<ImpStage>('pick');
  const [layoutName, setStructure] = useState('Blocks with flats');
  const shape = useLayout(layoutName);
  const structure = shape.name;
  const tries = useRef(0);
  const busy = useRef(false);
  useEffect(() => { if (open) { setStage('pick'); tries.current = 0; } }, [open]);
  const cols = ['Property', ...shape.levels, `${shape.unit}.roomSize*`, `${shape.unit}.accessible`];
  const choose = () => { tries.current += 1; setStage(tries.current === 1 ? 'problems' : 'ok'); };
  const upload = () => {
    if (busy.current) return;
    busy.current = true;
    useInv.getState().set('imports', (l) => [{ id: invId('im'), name: 'st-marys-rooms.csv', kind: 'Spreadsheet', status: 'Running', done: 88, total: 144, by: 'Arjun Mehta', started: 'Today 11:42', structure, creates: '1 property · 175 entities' }, ...l.filter((x) => x.name !== 'st-marys-rooms.csv')]);
    setStage('queued');
    busy.current = false;
  };
  if (stage === 'queued') {
    return (
      <Modal open={open} onClose={onClose} width={520} title="Import started" sub="It runs in the background and shows on Imports. We’ll email you the outcome."
        footer={<><Button icon={null} onClick={() => { onClose(); nav('/properties/imports'); }}>View imports</Button><Button variant="primary" icon={null} onClick={onClose}>Done</Button></>}>
        <Illustration name="importSent" className="block w-[203px] h-[160px] mx-auto mb-2" />
        <SheetRow lead={<FileCsv size={20} className="shrink-0 text-[#737373]" />} title="st-marys-rooms.csv" sub={`144 rows · ${structure}`}
          end={<button type="button" aria-label="Cancel import" onClick={() => { useInv.getState().set('imports', (l) => l.filter((x) => x.name !== 'st-marys-rooms.csv')); onClose(); toast('Import cancelled'); }} className="text-[#737373] hover:text-ink"><X size={14} /></button>} />
      </Modal>
    );
  }
  return (
    <PanelModal open={open} onClose={onClose} width={640} eyebrow="Import" title="Import from another PMS" meta="One row per room · up to 5,000 rows"
      lead={<span className="size-10 shrink-0 rounded-[10px] flex items-center justify-center" style={avatarFx('#64748B')}><UploadSimple size={20} strokeWidth={1.75} /></span>}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} disabled={stage !== 'ok'} onClick={upload}>Upload</Button></>}>
      <SheetSection title="Property layout">
        <LayoutRadios value={shape.name} onChange={(v) => { setStructure(v); setStage('pick'); tries.current = 0; }} />
      </SheetSection>
      <SheetSection title={`Template · ${cols.length} columns`} action={<EditLink onClick={() => toast.success(`${structure.toLowerCase().replace(/\s+/g, '-')}-template.csv downloaded`)}>Download</EditLink>}>
        {/* The template's header row and one example room; * marks a required column. */}
        <div className="-mx-4 -my-3.5 overflow-x-auto font-mono text-[11px] leading-4 whitespace-nowrap grid" style={{ gridTemplateColumns: cols.map((c) => `minmax(max-content, ${c.length}fr)`).join(' ') }}>
          {cols.map((c, k) => <span key={c} className={cx('h-8 px-3 flex items-center border-b border-[#E5E5E5] text-[#0A0A0A] font-medium', k < cols.length - 1 && 'border-r')}>{c}</span>)}
          {['St Mary’s', ...shape.levels.map(sampleOf), '12.5', 'no'].map((v, k) => <span key={k} className={cx('h-8 px-3 flex items-center border-[#E5E5E5] text-[#A3A3A3]', k < cols.length - 1 && 'border-r')}>{v}</span>)}
        </div>
      </SheetSection>
      <SheetSection title="CSV file">
        {stage === 'pick' && (
          <button type="button" onClick={choose} className="w-full rounded-xl border border-dashed border-[#D4D4D4] bg-[#FAFAFA] hover:bg-[#F5F5F5] py-6 flex flex-col items-center gap-2.5 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Illustration name="importFile" className="block w-[152px] h-[120px]" />
            <span className="text-sm text-[#0A0A0A]">Drop the CSV here or <span className="text-primary">choose a file</span></span>
          </button>
        )}
        {stage !== 'pick' && <FileRow bad={stage === 'problems'} sub={stage === 'problems' ? '144 rows · 18 KB · 3 problems' : '144 rows · 18 KB'} onRemove={() => setStage('pick')} />}
        {stage === 'ok' && (
          <SheetRow lead={<CheckCircle size={18} weight="fill" className="shrink-0 text-[#16A34A]" />} title="No problems found" sub="Makes 1 property, 2 blocks, 6 floors, 24 flats and 144 rooms, with no tenancies" />
        )}
      </SheetSection>
      {stage === 'problems' && (
        <SheetSection title="Problems · 3" action={<><EditLink onClick={() => toast.success('st-marys-rooms-problems.csv downloaded')}>Download list</EditLink><EditLink onClick={choose}>Choose file</EditLink></>}>
          {[['Header', 'Column 6', 'Is “Room size”; the template says “Room.roomSize*”'], ['Row 38', 'Room.roomSize*', 'Required, but empty'], ['Row 91', 'Room.accessible', '“maybe” isn’t yes or no']].map(([a, b, c]) => (
            <SheetRow key={a} title={<>{a} · <span className="font-mono text-[13px]">{b}</span></>} sub={c} end={<Pill tone="red">Problem</Pill>} />
          ))}
          <p className="pt-3 text-sm leading-5 text-[#737373]">Nothing was uploaded. Fix the file and choose it again.</p>
        </SheetSection>
      )}
    </PanelModal>
  );
}
function FileRow({ bad, sub, onRemove }: { bad?: boolean; sub: string; onRemove: () => void }) {
  return (
    <SheetRow lead={<FileCsv size={20} className={cx('shrink-0', bad ? 'text-[#E0243A]' : 'text-[#737373]')} />} title="st-marys-rooms.csv" sub={sub}
      end={<button type="button" aria-label="Remove file" onClick={onRemove} className="text-[#737373] hover:text-ink"><X size={14} /></button>} />
  );
}

/* ---------------- E3 · Archive a lived-in hall ---------------- */
function LiveTenanciesDialog({ p, onClose }: { p: Property | null; onClose: () => void }) {
  const patchProp = useInv((s) => s.patchProp);
  const [choice, setChoice] = useState<'stop' | 'schedule'>('stop');
  const short = p?.name.split(' ')[0] ?? '';
  const go = () => {
    if (!p) return;
    const prev = p.status;
    if (choice === 'stop') {
      patchProp(p.id, (x) => ({ status: 'Closed to allocations', archiveOn: '19 Jun 2027', activity: logAct(x, 'Closed to allocations · archive booked for 19 Jun 2027') }));
      toast.success(`${short} is out of the 2027/28 term · archives on 19 Jun 2027`, { action: { label: 'Undo', onClick: () => patchProp(p.id, () => ({ status: prev, archiveOn: undefined })) } });
    } else {
      patchProp(p.id, (x) => ({ archiveOn: '19 Jun 2027', activity: logAct(x, 'Scheduled the archive for 19 Jun 2027') }));
      toast.success(`${short} archives on 19 Jun 2027`);
    }
    onClose();
  };
  return (
    <Modal open={!!p} onClose={onClose} width={540} title={`${short} has ${p?.liveTenancies ?? 0} live tenancies`}
      sub="It can’t be archived while residents live there."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={choice === 'stop' ? PauseCircle : Archive} onClick={go}>{choice === 'stop' ? 'Stop allocations' : 'Schedule archive'}</Button></>}>
      <div className="space-y-2.5">
        <RadioCard checked={choice === 'stop'} onClick={() => setChoice('stop')} title="Stop new allocations now" sub={`${short} leaves the 2027/28 term; current residents stay until 18 Jun 2027.`} />
        <RadioCard checked={choice === 'schedule'} onClick={() => setChoice('schedule')} title="Archive on 19 Jun 2027" sub="Scheduled for the day after the last tenancy ends." />
      </div>
    </Modal>
  );
}

