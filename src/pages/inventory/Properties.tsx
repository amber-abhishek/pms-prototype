import { useEffect, useMemo, useRef, useState } from 'react';
import { Illustration } from '../../components/Illustration';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Archive, ArrowsDownUp, Buildings, ClockCounterClockwise, Copy, DotsThree, DownloadSimple, FileCsv, FileText, Info, PauseCircle, PencilSimple, Plus, SlidersHorizontal, UploadSimple, WarningCircle, X, Clock, CheckCircle,
} from '../../components/icons';
import { Button, Check, Empty, MultiFilter, PageHeader, SearchInput, Table, cx, PIN } from '../../components/ui';
import { PHOTO } from './photos';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/shadcn/popover';
import { invId, logAct, useInv, type Property } from '../../data/inventory';
import { ACard, FormRow, InvModal, LayoutRadios, Menu, Modal, PropStatus, RadioCard, Tags } from './common';

const COLS = ['Campus', 'Layout', 'Tags', 'Units', 'Status'] as const;

/** The Properties rows in their on-screen order (search, filters, sort), so the property modal's ↑ ↓ steps through what the list shows. */
export const shownOrder: { ids: string[] } = { ids: [] };

export function PropertiesPage() {
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const props = useInv((s) => s.properties);
  const patchProp = useInv((s) => s.patchProp);
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

  const [campusF, setCampusF] = useState<string[]>([]);
  const [layoutF, setLayoutF] = useState<string[]>([]);
  const [statusF, setStatusF] = useState<string[]>([]);
  const [sort, setSort] = useState<{ key: 'name' | 'units'; dir: 1 | -1 } | null>(null);
  const list = useMemo(() => (empty ? [] : props).filter((p) => p.status !== 'Archived'), [props, empty]);
  const rows = list
    .filter((p) => (!campusF.length || campusF.includes(p.campus)) && (!layoutF.length || layoutF.includes(p.structure)) && (!statusF.length || statusF.includes(p.status)) && (!q || (p.name + p.address).toLowerCase().includes(q.toLowerCase())))
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
    { key: 'Campus', label: 'Campus', render: (p: Property) => <span className="text-[#404040]">{p.campus}</span> },
    { key: 'Layout', label: 'Layout', render: (p: Property) => <span className="text-[#404040]">{p.structure}</span> },
    { key: 'Tags', label: 'Tags', render: (p: Property) => <Tags tags={p.tags} /> },
    { key: 'Units', label: head('Units', 'units'), render: (p: Property) => <span className="font-medium tabular-nums">{p.units.toLocaleString('en-GB')}</span> },
    { key: 'Status', label: 'Status', render: (p: Property) => <PropStatus s={p.status} /> },
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
          <div {...PIN} className="shrink-0 px-6 py-4 flex items-center gap-3">
            <div className="[&>label]:w-[280px] [&>label]:h-9"><SearchInput value={q} onChange={setQ} placeholder="Search properties" /></div>
            <div className="ml-auto flex items-center gap-3">
              <MultiFilter label="Campus" value={campusF} onChange={setCampusF} options={[{ value: 'Durham City' }, { value: 'Queen’s Campus' }]} />
              <MultiFilter label="Layout" value={layoutF} onChange={setLayoutF} options={[{ value: 'College' }, { value: 'House' }]} />
              <MultiFilter label="Status" value={statusF} onChange={setStatusF} width={240} options={[{ value: 'Active', tone: 'green' }, { value: 'Draft', tone: 'amber' }, { value: 'Inactive', tone: 'grey' }, { value: 'Closed to allocations', tone: 'amber' }]} />
              <Display hidden={hidden} setHidden={setHidden} />
            </div>
          </div>
          <Table rows={rows} cols={cols} onRow={(p) => nav(`/inventory/properties/${p.id}`)}
            empty={<Empty title="No properties match" sub="Try another campus or clear the search." />}
            footer="always" summary={rows.length === list.length ? `${list.length} ${list.length === 1 ? 'property' : 'properties'}` : `${rows.length} of ${list.length} properties`} />
        </>
      )}
      <ImportDialog open={importOpen} onClose={() => setImport(false)} />
      <LiveTenanciesDialog p={archiving} onClose={() => setArchiving(null)} />
    </>
  );
}

/* Dummy row details for the Figma kicker (the backend has none yet); photos come from ./photos. */
const KICKER: Record<string, string> = { col: '88% pre-let', jb: '83% pre-let', ust: '94% pre-let', ste: '91% pre-let', hb: '86% pre-let', js: '89% pre-let' };
/** "South Road, Durham DH1 3DF" → "South Road · DH1 3DF". */
const shortAddress = (a: string) => { const parts = a.split(', '); const pc = parts[parts.length - 1].split(' ').slice(-2).join(' '); return parts.length > 1 ? `${parts[0]} · ${pc}` : a; };

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
    <InvModal open={open} onClose={onClose} width={640} title="Import a property"
      left={<Button variant="ghost" onClick={onClose}>Cancel</Button>}
      right={<Button variant="primary" icon={UploadSimple} disabled={stage !== 'ok'} onClick={upload}>Upload</Button>}>
      {/* Built from the Add property modal's parts (Figma 3884:41314): layout radio cards, a mono-strip card, labelled rows. */}
      <FormRow label="Property layout">
        <LayoutRadios value={structure} onChange={(v) => { setStructure(v); setStage('pick'); tries.current = 0; }} />
      </FormRow>
      <FormRow label="Template" hint="One row per room · * required">
        <ACard title={`${structure} · ${cols.length} columns`} right={
          <button type="button" onClick={() => toast.success(`${structure.toLowerCase()}-template.csv downloaded`)} className="normal-case tracking-normal font-sans text-xs text-[#2563EB] hover:underline underline-offset-2 flex items-center gap-1"><DownloadSimple size={14} strokeWidth={1.5} />Download</button>}>
          {/* The template's header row and one example room. */}
          <div className="overflow-x-auto font-mono text-[11px] leading-4 whitespace-nowrap grid" style={{ gridTemplateColumns: cols.map((c) => `minmax(max-content, ${c.length}fr)`).join(' ') }}>
            {cols.map((c, k) => <span key={c} className={cx('h-8 px-3 flex items-center border-b border-[#E5E5E5] text-[#0A0A0A] font-medium', k < cols.length - 1 && 'border-r')}>{c}</span>)}
            {(structure === 'College' ? ['St Mary’s', 'A', '1', 'A1', 'A1-01', '12.5', 'no'] : ['Mill Lane', '1', '11.0', 'yes']).map((v, k) => <span key={k} className={cx('h-8 px-3 flex items-center border-[#E5E5E5] text-[#A3A3A3]', k < cols.length - 1 && 'border-r')}>{v}</span>)}
          </div>
        </ACard>
      </FormRow>
      <FormRow label="CSV file" hint={stage === 'pick' ? 'Up to 5,000 rows · 1 MB' : undefined}>
        <div className="flex flex-col gap-3">
        {stage === 'pick' && (
          <button type="button" onClick={choose} className="w-full rounded-xl border border-dashed border-[#D4D4D4] bg-[#FAFAFA] hover:bg-[#F5F5F5] py-6 flex flex-col items-center gap-2.5 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="size-8 rounded-lg bg-white border border-[#E5E5E5] flex items-center justify-center text-[#737373]"><UploadSimple size={16} strokeWidth={1.5} /></span>
            <span className="text-sm text-[#0A0A0A]">Drop the CSV here or <span className="text-[#2563EB]">choose a file</span></span>
          </button>
        )}
        {stage === 'problems' && (<>
          <FileCard bad sub="144 rows · 18 KB · 3 problems" onRemove={() => setStage('pick')} />
          <div className="rounded-xl border border-[#F5A3A3] overflow-hidden">
            <div className="h-11 px-3.5 flex items-center gap-2 text-sm text-[#E0243A]"><WarningCircle size={16} />3 problems · nothing was uploaded<Button size="sm" variant="ghost" className="ml-auto" icon={DownloadSimple} onClick={() => toast.success('st-marys-rooms-problems.csv downloaded')}>Download list</Button></div>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-[#737373] border-y border-line bg-[#FAFAFA]"><th className="font-medium h-9 px-3.5">Where</th><th className="font-medium px-3">Column</th><th className="font-medium px-3">Problem</th></tr></thead>
              <tbody>
                {[['Header', 'Column 6', 'Is “Room size”; the template says “Room.roomSize*”'], ['Row 38', 'Room.roomSize*', 'Required, but empty'], ['Row 91', 'Room.accessible', '“maybe” isn’t yes or no']].map(([a, b, c]) => (
                  <tr key={a} className="border-b border-[#F5F5F5] last:border-0"><td className="h-10 px-3.5 font-medium whitespace-nowrap">{a}</td><td className="px-3 font-mono text-xs">{b}</td><td className="px-3 text-[#737373]">{c}</td></tr>
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
      </FormRow>
    </InvModal>
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

