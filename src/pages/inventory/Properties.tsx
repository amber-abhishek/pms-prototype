import { useEffect, useMemo, useRef, useState } from 'react';
import { Illustration } from '../../components/Illustration';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Archive, ArrowsDownUp, Buildings, CaretDown, ClockCounterClockwise, Copy, DotsThree, DownloadSimple, FileCsv, FileText, Info, PauseCircle, PencilSimple, Plus, SlidersHorizontal, Tag as TagIcon, TreeStructure, UploadSimple, WarningCircle, X, Clock, CheckCircle,
} from '../../components/icons';
import { Button, Check, Empty, Field, PageHeader, SearchInput, Table, cx } from '../../components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/shadcn/popover';
import { invId, logAct, useInv, type Property } from '../../data/inventory';
import { Menu, Modal, Picker, PropStatus, RadioCard, Tags } from './common';

type Tab = 'all' | 'city' | 'queens';
const COLS = ['Campus', 'Layout', 'Tags', 'Units', 'Status'] as const;

export function PropertiesPage() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const props = useInv((s) => s.properties);
  const patchProp = useInv((s) => s.patchProp);
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [hidden, setHidden] = useState<string[]>([]);
  const [archiving, setArchiving] = useState<Property | null>(null);
  const importOpen = sp.get('import') === '1';
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

  const [layoutF, setLayoutF] = useState<string | null>(null);
  const [statusF, setStatusF] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: 'name' | 'units'; dir: 1 | -1 } | null>(null);
  const list = useMemo(() => (empty ? [] : props).filter((p) => p.status !== 'Archived'), [props, empty]);
  const rows = list
    .filter((p) => (tab === 'all' || (tab === 'city' ? p.campus === 'Durham City' : p.campus === 'Queen’s Campus')) && (!layoutF || p.structure === layoutF) && (!statusF || p.status === statusF) && (!q || (p.name + p.address).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => !sort ? 0 : sort.dir * (sort.key === 'units' ? a.units - b.units : a.name.localeCompare(b.name)));
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
      if (e.key === 'c' && !e.metaKey && !e.ctrlKey && !/INPUT|TEXTAREA|SELECT/.test(t.tagName) && !document.querySelector('[role=dialog]')) nav('/inventory/properties/new');
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [nav]);

  const archive = (p: Property) => {
    if (p.liveTenancies > 0) return setArchiving(p);
    patchProp(p.id, (x) => ({ status: 'Archived', activity: logAct(x, `${x.name} archived`) }));
    toast.success(`${p.name} archived`, { action: { label: 'Undo', onClick: () => patchProp(p.id, () => ({ status: p.status })) } });
  };
  const duplicate = (p: Property) => {
    const id = invId('p');
    useInv.getState().set('properties', (ps) => [...ps, { ...p, id, name: `${p.name} (copy)`, status: 'Draft', units: 0, blocks: [], liveTenancies: 0, counts: { all: 0, active: 0, draft: 0, inactive: 0, archived: 0 }, activity: [{ who: 'Priya Shah', what: `Duplicated from ${p.name}`, when: 'Just now' }], createdBy: 'Priya Shah', created: 'Today' }]);
    toast.success(`${p.name} duplicated as a draft`);
  };

  const cols = [
    /* Figma 3884:39809 row: 116×62 photo (r6), then a 12px blue kicker, the 14px medium name and a grey street · postcode line; 84px tall. */
    { key: 'name', label: head('Property', 'name'), className: 'py-[11px]', render: (p: Property) => {
      const k = KICKER[p.id] ?? (p.status === 'Active' ? null : 'Not letting 2026/27');
      return (
        <span className="flex items-center gap-4 min-w-0">
          {PHOTO[p.id] ? <img src={PHOTO[p.id]} alt="" loading="lazy" className="w-[116px] h-[62px] rounded-md object-cover shrink-0 bg-[#F5F5F5]" />
            : <span className="w-[116px] h-[62px] rounded-md bg-[#F5F5F5] shrink-0 flex items-center justify-center"><Buildings size={20} className="text-[#A3A3A3]" /></span>}
          <span className="min-w-0 flex flex-col gap-0.5">
            {k && <span className={cx('text-xs leading-4 font-medium', KICKER[p.id] ? 'text-[#1D4ED8]' : 'text-[#737373]')}>{k}</span>}
            <span className="font-medium truncate max-w-[260px]" title={p.name}>{p.name}</span>
            <span className="text-[#737373] truncate max-w-[260px]">{shortAddress(p.address)}</span>
          </span>
        </span>
      );
    } },
    { key: 'Campus', label: 'Campus', render: (p: Property) => <span className="text-[#404040]">{p.campus}</span> },
    { key: 'Layout', label: 'Layout', render: (p: Property) => <span className="text-[#404040]">{p.structure}</span> },
    { key: 'Tags', label: 'Tags', render: (p: Property) => <Tags tags={p.tags} /> },
    { key: 'Units', label: <span className="flex justify-end">{head('Units', 'units')}</span>, className: 'text-right', render: (p: Property) => <span className="font-medium tabular-nums">{p.units.toLocaleString('en-GB')}</span> },
    { key: 'Status', label: 'Status', className: 'pl-8', render: (p: Property) => <PropStatus s={p.status} /> },
    {
      key: 'menu', label: <span className="sr-only">Actions</span>, className: 'w-14 text-right', render: (p: Property) => (
        <Menu width={168} trigger={(o) => <button type="button" aria-label={`More for ${p.name}`} onClick={(e) => { e.stopPropagation(); o(); }} className="size-8 rounded-lg border border-[#E5E5E5] bg-white hover:bg-[#F5F5F5] inline-flex items-center justify-center text-[#404040]"><DotsThree size={16} strokeWidth={1.75} /></button>}
          items={[{ label: 'Edit', icon: PencilSimple, onClick: () => nav(`/inventory/properties/${p.id}`) }, { label: 'Duplicate', icon: Copy, onClick: () => duplicate(p) }, 'sep', { label: 'Archive', icon: Archive, danger: true, onClick: () => archive(p) }]} />
      ),
    },
  ].filter((c) => !hidden.includes(c.key));

  return (
    <>
      <PageHeader icon={Buildings} title="Properties" crumbs={['Inventory']}>
        <Button icon={TagIcon} onClick={() => nav('/inventory/tags')}>Manage tags</Button>
        {/* While empty, the empty state carries Add and Import; the header doesn't repeat them. */}
        {list.length > 0 && <>
          <Button icon={UploadSimple} onClick={() => setImport(true)}>Import</Button>
          <Button variant="primary" icon={Plus} onClick={() => nav('/inventory/properties/new')}>Add property</Button>
        </>}
      </PageHeader>
      {!list.length ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <EmptyArt />
            <div className="font-semibold mt-5">No properties yet</div>
            <p className="text-sm text-[#737373] mt-1">Build one from a layout, or import its rooms from a spreadsheet.</p>
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="primary" icon={Plus} onClick={() => nav('/inventory/properties/new')}>Add a property</Button>
              <Button icon={UploadSimple} onClick={() => setImport(true)}>Import from a spreadsheet</Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Figma 3884:39809 toolbar: 68px, 16/24 padding; 280×36 search on the left; campus, layout and status dropdowns and Display on the right. */}
          <div className="shrink-0 px-6 py-4 flex items-center gap-3">
            <div className="[&>label]:w-[280px] [&>label]:h-9"><SearchInput value={q} onChange={setQ} placeholder="Search properties" /></div>
            <div className="ml-auto flex items-center gap-3">
              <DropFilter value={tab === 'all' ? null : tab === 'city' ? 'Durham City' : 'Queen’s Campus'} placeholder="All campuses" all="All campuses"
                options={['Durham City', 'Queen’s Campus']} onChange={(v) => setTab(v === 'Durham City' ? 'city' : v ? 'queens' : 'all')} />
              <DropFilter value={layoutF} placeholder="Layout" all="All layouts" options={['College', 'House']} onChange={setLayoutF} />
              <DropFilter value={statusF} placeholder="Status" all="All statuses" options={['Active', 'Draft', 'Inactive', 'Closed to allocations']} onChange={setStatusF} />
              <Display hidden={hidden} setHidden={setHidden} />
            </div>
          </div>
          <Table rows={rows} cols={cols} onRow={(p) => nav(`/inventory/properties/${p.id}`)} paginate={rows.length > 50}
            empty={<Empty title="No properties match" sub="Try another campus or clear the search." />}
            summary={`Showing ${rows.length} of ${list.length} properties`} />
        </>
      )}
      <ImportDialog open={importOpen} onClose={() => setImport(false)} />
      <LiveTenanciesDialog p={archiving} onClose={() => setArchiving(null)} />
    </>
  );
}

/* Dummy row details for the Figma kicker and photo (the backend has neither yet). */
const PHOTO: Record<string, string> = { col: '/properties/p1.jpg', jb: '/properties/p2.jpg', ust: '/properties/p3.jpg', ste: '/properties/p4.jpg', hb: '/properties/p5.jpg', js: '/properties/p6.jpg', erh: '/properties/p7.jpg' };
const KICKER: Record<string, string> = { col: '88% pre-let', jb: '83% pre-let', ust: '94% pre-let', ste: '91% pre-let', hb: '86% pre-let', js: '89% pre-let' };
/** "South Road, Durham DH1 3DF" → "South Road · DH1 3DF". */
const shortAddress = (a: string) => { const parts = a.split(', '); const pc = parts[parts.length - 1].split(' ').slice(-2).join(' '); return parts.length > 1 ? `${parts[0]} · ${pc}` : a; };

/** Figma 3884:39809 dropdown: 34px, r8, #E5E5E5 edge, 14px medium #404040, chevron; picks one option or clears to all. */
function DropFilter({ value, placeholder, all, options, onChange }: { value: string | null; placeholder: string; all: string; options: string[]; onChange: (v: string | null) => void }) {
  return (
    <Menu width={200} trigger={(o) => (
      <button type="button" onClick={o} className={cx('h-[34px] pl-3 pr-2.5 rounded-lg border bg-white text-sm font-medium flex items-center gap-1.5 hover:bg-[#F5F5F5]', value ? 'border-[#2563EB] text-[#2563EB]' : 'border-[#E5E5E5] text-[#404040]')}>
        {value ?? placeholder}<CaretDown size={16} strokeWidth={1.75} className={value ? 'text-[#2563EB]' : 'text-[#404040]'} />
      </button>
    )} items={[{ label: all, onClick: () => onChange(null) }, 'sep', ...options.map((x) => ({ label: x, onClick: () => onChange(x) }))]} />
  );
}

function Display({ hidden, setHidden }: { hidden: string[]; setHidden: (h: string[]) => void }) {
  /* shadcn Popover. */
  return (
    <Popover>
      <PopoverTrigger asChild><Button variant="control" icon={SlidersHorizontal}>Display</Button></PopoverTrigger>
      <PopoverContent align="end" className="w-56 space-y-2">
        <div className="text-xs font-semibold text-[#737373] uppercase tracking-wide">Columns</div>
        {COLS.map((c) => <div key={c}><Check label={c} checked={!hidden.includes(c)} onChange={(v) => setHidden(v ? hidden.filter((h) => h !== c) : [...hidden, c])} /></div>)}
      </PopoverContent>
    </Popover>
  );
}

/* Figma empty-state illustrations (Inventory · Empty states): properties for a new tenant, rooms for a property with none. */
export function EmptyArt({ kind = 'building' }: { kind?: 'building' | 'clipboard' }) {
  return <Illustration name={kind === 'clipboard' ? 'rooms' : 'properties'} />;
}

/* ---------------- Flow 2 · Import a property ---------------- */
type ImpStage = 'pick' | 'problems' | 'ok' | 'queued';
export function ImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const [stage, setStage] = useState<ImpStage>('pick');
  const [structure, setStructure] = useState<'College' | 'House'>('College');
  const tries = useRef(0);
  const busy = useRef(false);
  useEffect(() => { if (open) { setStage('pick'); tries.current = 0; } }, [open]);
  const cols = structure === 'College' ? ['Property', 'Block', 'Floor', 'Flat', 'Room', 'Room.roomSize*', 'Room.accessible'] : ['Property', 'Room', 'Room.roomSize*', 'Room.accessible'];
  const choose = () => { tries.current += 1; setStage(tries.current === 1 ? 'problems' : 'ok'); };
  const upload = () => {
    if (busy.current) return;
    busy.current = true;
    useInv.getState().set('imports', (l) => [{ id: invId('im'), name: 'st-marys-rooms.csv', kind: 'Spreadsheet', status: 'Running', done: 88, total: 144, by: 'Priya Shah', started: 'Today 11:42', structure, creates: '1 property · 175 entities' }, ...l.filter((x) => x.name !== 'st-marys-rooms.csv')]);
    setStage('queued');
    busy.current = false;
  };
  if (stage === 'queued') {
    return (
      <Modal open={open} onClose={onClose} center icon={Clock} tone="blue" width={520} title="Import queued"
        sub={<>One import is running ahead of it; yours starts when that one ends. We’ll email <span className="text-ink">priya.shah@durham.ac.uk</span> the outcome.</>}
        footer={<><Button icon={ClockCounterClockwise} onClick={() => { onClose(); nav('/inventory/imports'); }}>View imports</Button><Button variant="primary" onClick={onClose}>Done</Button></>}>
        <div className="mx-auto max-w-[312px] rounded-xl border border-line p-3 flex items-center gap-3">
          <FileCsv size={20} className="text-[#0B8A4C]" />
          <div className="flex-1 text-center"><div className="text-sm font-medium">st-marys-rooms.csv</div><div className="text-xs text-[#737373]">144 rows · {structure} layout · uploaded</div></div>
          <button type="button" aria-label="Cancel import" onClick={() => { useInv.getState().set('imports', (l) => l.filter((x) => x.name !== 'st-marys-rooms.csv')); onClose(); toast('Import cancelled'); }} className="text-[#737373] hover:text-ink"><X size={14} /></button>
        </div>
      </Modal>
    );
  }
  return (
    <Modal open={open} onClose={onClose} icon={FileCsv} tone="green" width={600} title="Import a property"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={UploadSimple} disabled={stage !== 'ok'} onClick={upload}>Upload</Button></>}>
      <p className="text-sm text-[#737373] -mt-3 ml-11">One row per room.</p>
      <div className="space-y-4 mt-4">
        <Field label="Property layout" hint="The template’s columns come from this layout">
          <Picker value={structure} onChange={(v) => { setStructure(v); setStage('pick'); tries.current = 0; }} icon={TreeStructure} options={[{ id: 'College', label: 'College' }, { id: 'House', label: 'House' }]} />
        </Field>
        <div className="rounded-xl border border-line p-3.5">
          <div className="flex items-center justify-between"><span className="text-sm font-medium">Template columns</span><Button size="sm" icon={DownloadSimple} onClick={() => toast.success(`${structure.toLowerCase()}-template.csv downloaded`)}>Download template</Button></div>
          <div className="flex flex-wrap gap-1.5 mt-3">{cols.map((c) => <span key={c} className="h-6 px-2 rounded-md border border-line font-mono text-xs flex items-center">{c}</span>)}</div>
          <p className="text-xs text-[#737373] mt-2.5">* means required.</p>
        </div>
        {stage === 'pick' && (
          <div className="rounded-xl border-2 border-dashed border-gray-200 py-8 flex flex-col items-center text-center">
            <FileText size={24} className="text-gray-400" />
            <div className="text-sm font-medium mt-2">Drop the CSV here</div>
            <div className="text-xs text-[#737373]">Up to 5,000 rows and 1 MB</div>
            <Button className="mt-3" size="sm" icon={FileText} onClick={choose}>Choose file</Button>
          </div>
        )}
        {stage === 'problems' && (<>
          <FileCard bad sub="144 rows · 18 KB · 3 problems" onRemove={() => setStage('pick')} />
          <div className="rounded-xl border border-[#F5A3A3] overflow-hidden">
            <div className="h-11 px-3.5 flex items-center gap-2 text-sm text-[#E0243A]"><WarningCircle size={16} />3 problems · nothing was uploaded<Button size="sm" variant="ghost" className="ml-auto" icon={DownloadSimple} onClick={() => toast.success('st-marys-rooms-problems.csv downloaded')}>Download list</Button></div>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-[#737373] border-y border-line bg-[#FAFAFA]"><th className="font-medium h-9 px-3.5">Where</th><th className="font-medium px-3">Column</th><th className="font-medium px-3">Problem</th></tr></thead>
              <tbody>
                {[['Header', 'Column 6', 'Is “Room size”; the template says “Room.roomSize*”'], ['Row 38', 'Room.roomSize*', 'Required, but empty'], ['Row 91', 'Room.accessible', '“maybe” isn’t yes or no']].map(([a, b, c]) => (
                  <tr key={a} className="border-b border-[#F5F5F5] last:border-0"><td className="h-10 px-3.5 font-medium">{a}</td><td className="px-3 font-mono text-xs">{b}</td><td className="px-3 text-[#737373]">{c}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3">
            <p className="flex-1 text-xs text-[#737373] flex gap-1.5"><Info size={14} className="shrink-0 mt-px" />Fix them in the spreadsheet and choose it again. Nothing is changed for you.</p>
            <Button size="sm" icon={FileText} onClick={choose}>Choose file</Button>
          </div>
        </>)}
        {stage === 'ok' && (<>
          <FileCard sub="144 rows · 18 KB" onRemove={() => setStage('pick')} />
          <div className="rounded-xl border border-[#86D3A8] p-3.5 flex gap-2.5">
            <CheckCircle size={18} weight="fill" className="text-[#16A34A] shrink-0" />
            <div><div className="text-sm font-semibold text-[#0B8A4C]">No problems found</div><div className="text-sm text-[#737373] mt-0.5">Makes 1 new property, 2 blocks, 6 floors, 24 flats and 144 rooms. The rooms get no tenancies.</div></div>
          </div>
        </>)}
      </div>
    </Modal>
  );
}
function FileCard({ bad, sub, onRemove }: { bad?: boolean; sub: string; onRemove: () => void }) {
  return (
    <div className={cx('rounded-xl border p-3.5 flex items-center gap-3', bad ? 'border-[#F5A3A3]' : 'border-line')}>
      <FileCsv size={20} className={bad ? 'text-[#E0243A]' : 'text-[#0B8A4C]'} />
      <div className="flex-1"><div className="text-sm font-medium">st-marys-rooms.csv</div><div className="text-xs text-[#737373]">{sub}</div></div>
      <button type="button" aria-label="Remove file" onClick={onRemove} className="text-[#737373] hover:text-ink"><X size={14} /></button>
    </div>
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
      toast.success(`${short} is out of the 2027/28 cycle · archives on 19 Jun 2027`, { action: { label: 'Undo', onClick: () => patchProp(p.id, () => ({ status: prev, archiveOn: undefined })) } });
    } else {
      patchProp(p.id, (x) => ({ archiveOn: '19 Jun 2027', activity: logAct(x, 'Archive scheduled for 19 Jun 2027') }));
      toast.success(`${short} archives on 19 Jun 2027`);
    }
    onClose();
  };
  return (
    <Modal open={!!p} onClose={onClose} width={540} title={`${short} has ${p?.liveTenancies ?? 0} live tenancies`}
      sub="Archiving hides a property and stops allocations. It can’t happen while residents live there."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={choice === 'stop' ? PauseCircle : Archive} onClick={go}>{choice === 'stop' ? 'Stop allocations' : 'Schedule archive'}</Button></>}>
      <div className="space-y-2.5">
        <RadioCard checked={choice === 'stop'} onClick={() => setChoice('stop')} title="Stop new allocations now" sub={`${short} leaves the 2027/28 cycle; current residents stay until 18 Jun 2027.`} />
        <RadioCard checked={choice === 'schedule'} onClick={() => setChoice('schedule')} title="Archive on 19 Jun 2027" sub="Scheduled for the day after the last tenancy ends." />
      </div>
    </Modal>
  );
}

