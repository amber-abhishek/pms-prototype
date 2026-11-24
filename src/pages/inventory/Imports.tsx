import { useEffect, useState, type ReactNode } from 'react';
import { PersonName, Empty } from '../../components/ui';
import { StatusTabsBar } from '../offcampus/parts';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, FileArrowUp, FileCsv, Stack, UploadSimple } from '../../components/icons';
import { Button, IconTile, listNav, PageHeader, Pill, Sheet, SheetHero, SheetRow, SheetSection, Table, PageHeading, type SheetNav } from '../../components/ui';
import type { Tone } from '../../data/seed';
import { useInv, type ImportJob, type Property } from '../../data/inventory';
import { useOpen } from '../hooks';
import { LineTabs, PropStatus, Progress } from './common';

type TabId = 'all' | 'Running' | 'Queued' | 'Failed';

/** Ticks running imports forward; when St Mary's spreadsheet finishes, the property appears as a Draft. */
function useImportTicker(jobs: ImportJob[]) {
  const running = jobs.some((j) => j.status === 'Running' && j.kind === 'Spreadsheet');
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => {
      const st = useInv.getState();
      const finished: ImportJob[] = [];
      st.set('imports', (l) => l.map((j) => {
        if (j.status !== 'Running' || j.kind !== 'Spreadsheet') return j;
        const done = Math.min(j.total, j.done + 8);
        if (done >= j.total) { const f = { ...j, done, status: 'Succeeded' as const }; finished.push(f); return f; }
        return { ...j, done };
      }));
      finished.forEach((j) => {
        if (j.name === 'st-marys-rooms.csv' && !useInv.getState().properties.some((p) => p.id === 'stm')) {
          const p: Property = {
            id: 'stm', name: 'St Mary’s College', campus: 'Durham City', structure: 'Building', tags: [], units: 144, status: 'Draft', address: 'Elvet Hill Road, Durham DH1 3LR', zone: 'Elvet', invNo: 'SMC-001', letting: 'Weekly',
            blocks: [{ name: 'Main House', floors: 4, flats: 4, rooms: 96, roomType: 'Ensuite single', size: 14 }, { name: 'Fenwick Block', floors: 2, flats: 4, rooms: 48, roomType: 'Standard single', size: 12 }],
            build: null, photos: 0, description: '', amenities: [], wardenPhone: '', createdBy: 'Arjun Mehta', created: 'Today', activity: [{ who: 'Arjun Mehta', what: 'Imported from st-marys-rooms.csv', when: 'Just now' }],
            roomTypes: [{ name: 'Ensuite single', rooms: 96, rent: null }, { name: 'Standard single', rooms: 48, rent: null }], liveTenancies: 0, fees: 1, tenancies: false,
            counts: { all: 145, active: 0, draft: 145, inactive: 0, archived: 0 },
          };
          useInv.getState().set('properties', (ps) => [...ps, p]);
        }
        toast.success(`${j.name} imported · ${j.total} rooms`, { description: 'Emailed to Arjun Mehta' });
      });
    }, 900);
    return () => window.clearInterval(t);
  }, [running]);
}

export function ImportsPage() {
  const nav = useNavigate();
  const jobs = useInv((s) => s.imports);
  const [tab, setTab] = useState<TabId>('all');
  const [open, setOpen] = useOpen();
  useImportTicker(jobs);
  const rows = jobs.filter((j) => tab === 'all' || j.status === tab);
  const sel = jobs.find((j) => j.id === open) ?? null;
  const cnt = (s: ImportJob['status']) => jobs.filter((j) => j.status === s).length;
  return (
    <>
      <PageHeader icon={FileArrowUp} title="Imports" crumbs={['Properties']}>
        <Button icon={UploadSimple} onClick={() => nav('/inventory/properties?import=1')}>Import</Button>
      </PageHeader>
      <PageHeading />
      {/* Underline tabs on the bottom rule, as Approvals and Custom pricing (2026-11-24). */}
      <StatusTabsBar value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All', count: jobs.length }, { id: 'Running', label: 'Running', count: cnt('Running') }, { id: 'Queued', label: 'Queued', count: cnt('Queued') }, { id: 'Failed', label: 'Failed', count: cnt('Failed') }]} />
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col">
          <Table rows={rows} empty={<Empty art="nothingToShow" title="No imports yet" sub="Imported spreadsheets show here." />} onRow={(j) => setOpen(j.id)} selected={open ?? undefined} summary="Latest 100 imports"
            cols={[
              { key: 'n', label: 'Import', render: (j) => <span className="flex items-center gap-2.5">{j.kind === 'Spreadsheet' ? <IconTile icon={FileCsv} tone="green" /> : <IconTile icon={Stack} tone="purple" />}<span className="font-medium">{j.name}</span></span> },
              { key: 'k', label: 'Kind', render: (j) => <span className="text-[#737373]">{j.kind}</span> },
              { key: 's', label: 'Status', render: (j) => <PropStatus s={j.status} /> },
              { key: 'b', label: 'Started by', render: (j) => <PersonName name={j.by} /> },
              { key: 't', label: 'Started', render: (j) => <span className="text-[#737373]">{j.started}</span> },
            ]} />
        </div>
      </div>
      {sel && <ImportSheet key={sel.id} j={sel} nav={listNav(rows, (j) => j.id === open, (j) => setOpen(j.id))} onClose={() => setOpen(null)} />}
    </>
  );
}

/* ---------------- Import side panel (Figma "Side panel · Import" 4073:17185: Overview, Rows, Errors) ---------------- */
const STATE: Record<ImportJob['status'], [string, Tone]> = { Succeeded: ['Done', 'green'], Running: ['Running', 'blue'], Queued: ['Queued', 'grey'], Failed: ['Failed', 'red'] };
const ERRORS = ['Room code is missing', 'Room type “Ensuite dbl” isn’t set up', 'Floor 7 is above the block’s 6 floors', 'Duplicate room code'];
const TYPES = ['En-suite', 'En-suite', 'Standard', 'En-suite', 'Standard', 'Standard'];
const hashOf = (k: string) => [...k].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
/** Prototype rows for an import, stable by id: a code prefix from the file name, then one row per unit. */
function importRows(j: ImportJob) {
  const words = j.name.replace(/\.csv$/, '').split(/[^A-Za-z]+/).filter(Boolean);
  const pre = words.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  const errRows = j.errors ? Array.from({ length: j.errors }, (_, i) => 14 + i * 23) : [];
  return Array.from({ length: Math.min(j.total, 8) }, (_, i) => ({
    code: `${pre}-M-${101 + i}`, n: i + 1, type: TYPES[(hashOf(j.id) + i) % TYPES.length],
    state: j.status === 'Failed' ? 'Not created' : i < j.done ? 'Created' : 'Waiting',
    err: errRows.includes(i + 1),
  }));
}

function ImportSheet({ j, nav, onClose }: { j: ImportJob; nav?: SheetNav; onClose: () => void }) {
  const go = useNavigate();
  const [tab, setTab] = useState<'overview' | 'rows' | 'errors'>('overview');
  const [label, tone] = STATE[j.status];
  const h = hashOf(j.id);
  const took = j.status === 'Succeeded' ? `${20 + (h % 40)} s` : j.status === 'Failed' ? `${4 + (h % 9)} s` : '—';
  const sheet = j.kind === 'Spreadsheet';
  const download = () => toast.success(`${j.name} downloaded`);
  const rows = importRows(j);
  const errList = j.errors ? Array.from({ length: j.errors }, (_, i) => ({ row: 14 + i * 23, what: ERRORS[(h + i) % ERRORS.length] })) : [];
  const footer = j.status === 'Failed'
    ? <><Button icon={null} onClick={() => toast.success(`${j.name.replace(/\.csv$/, '')}-errors.csv downloaded`)}>Download errors</Button><Button variant="primary" icon={null} onClick={() => { useInv.getState().set('imports', (l) => l.map((x) => (x.id === j.id ? { ...x, status: 'Queued' as const, errors: undefined } : x))); toast.success(`${j.name} queued again`); }}>Retry</Button></>
    /* Done: open what it made. Running or queued: no footer; the file downloads from its row in Import. */
    : j.status === 'Succeeded' ? <Button variant="primary" icon={null} onClick={() => go(j.name === 'st-marys-rooms.csv' ? '/inventory/properties/stm' : '/inventory/units')}>{j.name === 'st-marys-rooms.csv' ? 'Open St Mary’s College' : 'Open in Units'}</Button>
      : undefined;
  return (
    <Sheet open onClose={onClose} title="Import" nav={nav} footer={footer}>
      <SheetHero icon={FileArrowUp} name={j.name} meta={`${j.creates} · ${j.done} of ${j.total} rows`}
        facts={[['Rows', String(j.total)], ['Errors', String(j.errors ?? 0), j.errors ? 'red' : j.status === 'Succeeded' ? 'green' : undefined], ['Took', took]]}>
        <Pill tone={tone}>{label}</Pill>
      </SheetHero>
      <div className="-mx-5 mb-5">
        <LineTabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'rows', label: 'Rows' }, { id: 'errors', label: 'Errors' }]} />
      </div>
      {tab === 'overview' && <>
        <SheetSection title="Import" rows={[
          ['Kind', sheet ? 'Spreadsheet' : j.kind],
          ['Layout', j.structure],
          ['Creates', j.creates],
          ...(sheet ? [['File', <button key="f" type="button" className="text-primary hover:underline underline-offset-2" onClick={download}>{j.name} · {40 + (h % 90)} KB</button>] as [string, ReactNode]] : []),
        ]} />
        <SheetSection title="Run" rows={[
          ['Started by', j.by],
          ['Started', j.started],
          ['Result', j.status === 'Succeeded' ? <span className="text-[#0B8A4C]">{j.total} created · 0 failed</span>
            : j.status === 'Failed' ? <span className="text-[#DC2626]">{j.errors ?? 0} rows failed · nothing created</span>
              : j.status === 'Running' ? `${j.done} of ${j.total} so far · emailed when it ends` : 'Waiting to start · emailed when it ends'],
        ]}>
          {j.status === 'Running' && <Progress value={(j.done / j.total) * 100} tone="blue" />}
          {j.status !== 'Succeeded' && <p className="mt-3 text-sm text-[#737373]">All or nothing: if any row fails, nothing is created.</p>}
        </SheetSection>
      </>}
      {tab === 'rows' && (
        <SheetSection title={`Rows · ${j.total}`}>
          {rows.map((r) => (
            <SheetRow key={r.n} title={r.code} sub={`Row ${r.n} · Main building · Floor 1 · ${r.type}`}
              end={<Pill tone={r.err ? 'red' : r.state === 'Created' ? 'green' : 'grey'}>{r.err ? 'Error' : r.state}</Pill>} />
          ))}
          {j.total > rows.length && <p className="pt-3 text-sm text-[#737373]">And {j.total - rows.length} more in the file</p>}
        </SheetSection>
      )}
      {tab === 'errors' && (
        <SheetSection title={errList.length ? `Errors · ${errList.length}` : 'Errors'}>
          {errList.length ? errList.map((e) => <SheetRow key={e.row} title={`Row ${e.row}`} sub={e.what} end={<Pill tone="red">Error</Pill>} />) : (
            <div className="py-6 flex flex-col items-center text-center">
              <span className="size-10 rounded-full bg-[#0B8A4C]/10 text-[#0B8A4C] flex items-center justify-center"><Check size={20} /></span>
              <div className="mt-3 text-sm font-medium text-[#0A0A0A]">No errors</div>
              <div className="text-[13px] text-[#737373]">{j.status === 'Succeeded' ? `All ${j.total} rows were created` : 'None so far'}</div>
            </div>
          )}
        </SheetSection>
      )}
    </Sheet>
  );
}
