import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Archive, Buildings, ClockCounterClockwise, Copy, DotsThree, DownloadSimple, FileCsv, FileText, Info, PauseCircle, PencilSimple, Plus, SlidersHorizontal, Tag as TagIcon, TreeStructure, UploadSimple, WarningCircle, X, Clock, CheckCircle,
} from '../../components/icons';
import { Button, Check, Empty, Field, Input, PageHeader, SearchInput, Sheet, Table, Tabs, cx } from '../../components/ui';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/shadcn/popover';
import { invId, logAct, useInv, type Property } from '../../data/inventory';
import { IconTile, Kbd, Menu, Modal, Picker, PropStatus, RadioCard, Tags } from './common';

type Tab = 'all' | 'city' | 'queens';
const COLS = ['Campus', 'Structure', 'Tags', 'Units', 'Status'] as const;

export function PropertiesPage() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const props = useInv((s) => s.properties);
  const patchProp = useInv((s) => s.patchProp);
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [hidden, setHidden] = useState<string[]>([]);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [archiving, setArchiving] = useState<Property | null>(null);
  const importOpen = sp.get('import') === '1';
  const setImport = (v: boolean) => setSp((p) => { const n = new URLSearchParams(p); if (v) n.set('import', '1'); else n.delete('import'); return n; });
  const empty = sp.get('empty') === '1';

  const list = useMemo(() => (empty ? [] : props).filter((p) => p.status !== 'Archived'), [props, empty]);
  const rows = list.filter((p) => (tab === 'all' || (tab === 'city' ? p.campus === 'Durham City' : p.campus === 'Queen’s Campus')) && (!q || (p.name + p.address).toLowerCase().includes(q.toLowerCase())));
  const units = rows.reduce((a, p) => a + p.units, 0);

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
    { key: 'name', label: 'Property', render: (p: Property) => <span className="flex items-center gap-2.5"><IconTile icon={Buildings} /><span className="font-medium">{p.name}</span></span> },
    { key: 'Campus', label: 'Campus', render: (p: Property) => <span className="text-[#646A78]">{p.campus}</span> },
    { key: 'Structure', label: 'Structure', render: (p: Property) => <span className="text-[#646A78]">{p.structure}</span> },
    { key: 'Tags', label: 'Tags', render: (p: Property) => <Tags tags={p.tags} /> },
    { key: 'Units', label: 'Units', className: 'text-right', render: (p: Property) => <span className="tabular-nums">{p.units.toLocaleString('en-GB')}</span> },
    { key: 'Status', label: 'Status', render: (p: Property) => <PropStatus s={p.status} /> },
    {
      key: 'menu', label: '', className: 'w-10', render: (p: Property) => (
        <Menu width={168} trigger={(o) => <button type="button" aria-label={`More for ${p.name}`} onClick={o} className="size-7 rounded-md hover:bg-gray-100 flex items-center justify-center text-[#646A78]"><DotsThree size={18} weight="bold" /></button>}
          items={[{ label: 'Edit', icon: PencilSimple, onClick: () => nav(`/inventory/properties/${p.id}`) }, { label: 'Duplicate', icon: Copy, onClick: () => duplicate(p) }, 'sep', { label: 'Archive', icon: Archive, danger: true, onClick: () => archive(p) }]} />
      ),
    },
  ].filter((c) => !hidden.includes(c.key));

  return (
    <>
      <PageHeader icon={Buildings} title="Properties" crumbs={['Inventory']}>
        <Button icon={TagIcon} onClick={() => setTagsOpen(true)}>Manage tags</Button>
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
            <p className="text-sm text-[#646A78] mt-1">A property is a hall or building. Build it from a structure step by step, or import its rooms from a spreadsheet.</p>
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="primary" icon={Plus} onClick={() => nav('/inventory/properties/new')}>Add a property</Button>
              <Button icon={UploadSimple} onClick={() => setImport(true)}>Import from a spreadsheet</Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="h-14 shrink-0 px-4 flex items-center gap-2 border-b border-line">
            <Tabs value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All', count: list.length }, { id: 'city', label: 'Durham City', count: list.filter((p) => p.campus === 'Durham City').length }, { id: 'queens', label: 'Queen’s Campus', count: list.filter((p) => p.campus === 'Queen’s Campus').length }]} />
            <div className="ml-auto flex items-center gap-2">
              <SearchInput value={q} onChange={setQ} placeholder="Search properties" />
              <Display hidden={hidden} setHidden={setHidden} />
            </div>
          </div>
          <Table rows={rows} cols={cols} onRow={(p) => nav(`/inventory/properties/${p.id}`)}
            empty={<Empty title="No properties match" sub="Try another campus or clear the search." />}
            summary={`${rows.length} ${rows.length === 1 ? 'property' : 'properties'} · ${units.toLocaleString('en-GB')} units`}
            footerRight={<span className="flex items-center gap-1.5 mr-2"><Kbd>C</Kbd> new property</span>} />
        </>
      )}
      <ImportDialog open={importOpen} onClose={() => setImport(false)} />
      <TagsSheet open={tagsOpen} onClose={() => setTagsOpen(false)} />
      <LiveTenanciesDialog p={archiving} onClose={() => setArchiving(null)} />
    </>
  );
}

function Display({ hidden, setHidden }: { hidden: string[]; setHidden: (h: string[]) => void }) {
  /* shadcn Popover. */
  return (
    <Popover>
      <PopoverTrigger asChild><Button icon={SlidersHorizontal}>Display</Button></PopoverTrigger>
      <PopoverContent align="end" className="w-56 space-y-2">
        <div className="text-xs font-semibold text-[#646A78] uppercase tracking-wide">Columns</div>
        {COLS.map((c) => <div key={c}><Check label={c} checked={!hidden.includes(c)} onChange={(v) => setHidden(v ? hidden.filter((h) => h !== c) : [...hidden, c])} /></div>)}
      </PopoverContent>
    </Popover>
  );
}

/* Blue tonal "empty" illustration: a building on a soft card, like the IconScout empty states. */
export function EmptyArt({ kind = 'building' }: { kind?: 'building' | 'search' | 'clipboard' }) {
  return (
    <svg width="203" height="160" viewBox="0 0 203 160" className="mx-auto" aria-hidden>
      <rect x="20" y="22" width="163" height="118" rx="18" fill="#EFF6FF" />
      {kind === 'building' && (<g>
        <rect x="70" y="40" width="64" height="86" rx="4" fill="#93C5FD" /><rect x="78" y="30" width="48" height="12" rx="3" fill="#1D4ED8" />
        {[0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={80 + c * 16} y={50 + r * 16} width="10" height="10" rx="2" fill="#EFF6FF" />))}
        <rect x="94" y="108" width="16" height="18" rx="2" fill="#1D4ED8" /><rect x="40" y="96" width="26" height="30" rx="4" fill="#BFDBFE" /><rect x="138" y="88" width="26" height="38" rx="4" fill="#BFDBFE" />
        <circle cx="54" cy="80" r="8" fill="#86EFAC" /><rect x="52" y="86" width="4" height="12" fill="#16A34A" />
      </g>)}
      {kind === 'search' && (<g>
        <rect x="92" y="44" width="56" height="70" rx="4" fill="#93C5FD" /><rect x="100" y="54" width="40" height="5" rx="2" fill="#EFF6FF" /><rect x="100" y="64" width="32" height="5" rx="2" fill="#EFF6FF" /><rect x="100" y="74" width="36" height="5" rx="2" fill="#EFF6FF" />
        <rect x="128" y="40" width="10" height="70" rx="3" fill="#1D4ED8" />
        <circle cx="82" cy="78" r="20" fill="none" stroke="#3B82F6" strokeWidth="7" /><circle cx="82" cy="78" r="16" fill="#DBEAFE" opacity=".8" /><rect x="58" y="96" width="8" height="24" rx="4" transform="rotate(40 62 108)" fill="#1D4ED8" />
      </g>)}
      {kind === 'clipboard' && (<g>
        <rect x="74" y="34" width="62" height="88" rx="4" fill="#93C5FD" /><rect x="80" y="44" width="50" height="72" rx="2" fill="#EFF6FF" /><rect x="90" y="28" width="30" height="12" rx="3" fill="#1D4ED8" />
        {[0, 1, 2, 3].map((i) => <rect key={i} x="88" y={74 + i * 9} width="34" height="3" rx="1.5" fill="#93C5FD" />)}
        <path d="M105 52 l8 14 h-16 z" fill="#FCD34D" /><rect x="104" y="57" width="2" height="5" fill="#B45309" />
        <rect x="46" y="64" width="18" height="12" rx="2" fill="#1D4ED8" /><rect x="146" y="88" width="18" height="12" rx="2" fill="#1D4ED8" />
        <rect x="52" y="92" width="26" height="30" rx="3" fill="#BFDBFE" transform="rotate(-8 65 107)" />
      </g>)}
    </svg>
  );
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
          <div className="flex-1 text-center"><div className="text-sm font-medium">st-marys-rooms.csv</div><div className="text-xs text-[#646A78]">144 rows · {structure} structure · uploaded</div></div>
          <button type="button" aria-label="Cancel import" onClick={() => { useInv.getState().set('imports', (l) => l.filter((x) => x.name !== 'st-marys-rooms.csv')); onClose(); toast('Import cancelled'); }} className="text-[#646A78] hover:text-ink"><X size={14} /></button>
        </div>
      </Modal>
    );
  }
  return (
    <Modal open={open} onClose={onClose} icon={FileCsv} tone="green" width={600} title="Import a property"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={UploadSimple} disabled={stage !== 'ok'} onClick={upload}>Upload</Button></>}>
      <p className="text-sm text-[#646A78] -mt-3 ml-11">Each row is one room. The property, blocks, floors and flats are made from the rows.</p>
      <div className="space-y-4 mt-4">
        <Field label="Structure" hint="The template’s columns come from this structure">
          <Picker value={structure} onChange={(v) => { setStructure(v); setStage('pick'); tries.current = 0; }} icon={TreeStructure} options={[{ id: 'College', label: 'College' }, { id: 'House', label: 'House' }]} />
        </Field>
        <div className="rounded-xl border border-line p-3.5">
          <div className="flex items-center justify-between"><span className="text-sm font-medium">Template columns</span><Button size="sm" icon={DownloadSimple} onClick={() => toast.success(`${structure.toLowerCase()}-template.csv downloaded`)}>Download template</Button></div>
          <div className="flex flex-wrap gap-1.5 mt-3">{cols.map((c) => <span key={c} className="h-6 px-2 rounded-md border border-line font-mono text-[11px] flex items-center">{c}</span>)}</div>
          <p className="text-xs text-[#646A78] mt-2.5">One column per level, then one per custom field. * means required. New properties only.</p>
        </div>
        {stage === 'pick' && (
          <div className="rounded-xl border-2 border-dashed border-gray-200 py-8 flex flex-col items-center text-center">
            <FileText size={24} className="text-gray-400" />
            <div className="text-sm font-medium mt-2">Drop the CSV here</div>
            <div className="text-xs text-[#646A78]">Up to 5,000 rows and 1 MB</div>
            <Button className="mt-3" size="sm" icon={FileText} onClick={choose}>Choose file</Button>
          </div>
        )}
        {stage === 'problems' && (<>
          <FileCard bad sub="144 rows · 18 KB · 3 problems" onRemove={() => setStage('pick')} />
          <div className="rounded-xl border border-[#F5A3A3] overflow-hidden">
            <div className="h-11 px-3.5 flex items-center gap-2 text-sm text-[#E0243A]"><WarningCircle size={16} />3 problems · nothing was uploaded<Button size="sm" variant="ghost" className="ml-auto" icon={DownloadSimple} onClick={() => toast.success('st-marys-rooms-problems.csv downloaded')}>Download list</Button></div>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-[#646A78] border-y border-line bg-[#F9FAFB]"><th className="font-medium h-9 px-3.5">Where</th><th className="font-medium px-3">Column</th><th className="font-medium px-3">Problem</th></tr></thead>
              <tbody>
                {[['Header', 'Column 6', 'Is “Room size”; the template says “Room.roomSize*”'], ['Row 38', 'Room.roomSize*', 'Required, but empty'], ['Row 91', 'Room.accessible', '“maybe” isn’t yes or no']].map(([a, b, c]) => (
                  <tr key={a} className="border-b border-[#F3F4F6] last:border-0"><td className="h-10 px-3.5 font-medium">{a}</td><td className="px-3 font-mono text-xs">{b}</td><td className="px-3 text-[#646A78]">{c}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3">
            <p className="flex-1 text-xs text-[#646A78] flex gap-1.5"><Info size={14} className="shrink-0 mt-px" />Fix them in the spreadsheet and choose it again. Nothing is changed for you.</p>
            <Button size="sm" icon={FileText} onClick={choose}>Choose file</Button>
          </div>
        </>)}
        {stage === 'ok' && (<>
          <FileCard sub="144 rows · 18 KB" onRemove={() => setStage('pick')} />
          <div className="rounded-xl border border-[#86D3A8] p-3.5 flex gap-2.5">
            <CheckCircle size={18} weight="fill" className="text-[#16A34A] shrink-0" />
            <div><div className="text-sm font-semibold text-[#0B8A4C]">No problems found</div><div className="text-sm text-[#646A78] mt-0.5">Makes 1 new property, 2 blocks, 6 floors, 24 flats and 144 rooms. The rooms get no tenancies.</div></div>
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
      <div className="flex-1"><div className="text-sm font-medium">st-marys-rooms.csv</div><div className="text-xs text-[#646A78]">{sub}</div></div>
      <button type="button" aria-label="Remove file" onClick={onRemove} className="text-[#646A78] hover:text-ink"><X size={14} /></button>
    </div>
  );
}

/* ---------------- Manage tags ---------------- */
function TagsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const props = useInv((s) => s.properties);
  const [name, setName] = useState('');
  const all = new Map<string, { tone: string; n: number }>();
  props.forEach((p) => p.tags.forEach((t) => all.set(t.label, { tone: t.tone, n: (all.get(t.label)?.n ?? 0) + 1 })));
  const [extra, setExtra] = useState<string[]>([]);
  return (
    <Sheet open={open} onClose={onClose} title="Manage tags" sub="Tags group properties for filters and reports" footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
      <form className="flex gap-2 mb-4" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; setExtra((x) => [...x, name.trim()]); toast.success(`Tag “${name.trim()}” created`); setName(''); }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New tag name" /><Button type="submit" icon={Plus}>Add</Button>
      </form>
      <div className="divide-y divide-line rounded-xl border border-line">
        {[...all.entries()].map(([label, v]) => <div key={label} className="h-11 px-3 flex items-center justify-between text-sm"><span>{label}</span><span className="text-sm text-[#646A78]">{v.n} {v.n === 1 ? 'property' : 'properties'}</span></div>)}
        {extra.map((label) => <div key={label} className="h-11 px-3 flex items-center justify-between text-sm"><span>{label}</span><span className="text-sm text-[#646A78]">0 properties</span></div>)}
      </div>
    </Sheet>
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

