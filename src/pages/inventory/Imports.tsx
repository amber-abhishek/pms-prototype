import { useEffect, useState, type ReactNode } from 'react';
import { Empty, PIN } from '../../components/ui';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowClockwise, DownloadSimple, FileArrowUp, FileCsv, Stack, UploadSimple } from '../../components/icons';
import { Button, IconTile, listNav, PageHeader, Sheet, SheetHero, SheetSection, Table, Tabs, PageHeading } from '../../components/ui';
import { useInv, type ImportJob, type Property } from '../../data/inventory';
import { useOpen } from '../hooks';
import { PropStatus, Progress } from './common';

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
            id: 'stm', name: 'St Mary’s College', campus: 'Durham City', structure: 'College', tags: [], units: 144, status: 'Draft', address: 'Elvet Hill Road, Durham DH1 3LR', zone: 'Elvet', invNo: 'SMC-001', letting: 'Weekly',
            blocks: [{ name: 'Main House', floors: 4, flats: 4, rooms: 96, roomType: 'Ensuite single', size: 14 }, { name: 'Fenwick Block', floors: 2, flats: 4, rooms: 48, roomType: 'Standard single', size: 12 }],
            build: null, photos: 0, description: '', amenities: [], wardenPhone: '', createdBy: 'Priya Shah', created: 'Today', activity: [{ who: 'Priya Shah', what: 'Imported from st-marys-rooms.csv', when: 'Just now' }],
            roomTypes: [{ name: 'Ensuite single', rooms: 96, rent: null }, { name: 'Standard single', rooms: 48, rent: null }], liveTenancies: 0, fees: 1, tenancies: false,
            counts: { all: 145, active: 0, draft: 145, inactive: 0, archived: 0 },
          };
          useInv.getState().set('properties', (ps) => [...ps, p]);
        }
        toast.success(`${j.name} imported · ${j.total} rooms`, { description: 'Emailed to Priya Shah' });
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
      <PageHeader icon={FileArrowUp} title="Imports" crumbs={['Inventory']}>
        <Button icon={UploadSimple} onClick={() => nav('/inventory/properties?import=1')}>Import</Button>
      </PageHeader>
      <PageHeading />
      <div {...PIN} className="shrink-0 px-[var(--tx,16px)] pt-6 pb-4 flex items-center gap-2 empty:hidden">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All', count: jobs.length }, { id: 'Running', label: 'Running', count: cnt('Running') }, { id: 'Queued', label: 'Queued', count: cnt('Queued') }, { id: 'Failed', label: 'Failed', count: cnt('Failed') }]} />
      </div>
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col">
          <Table rows={rows} empty={<Empty art="rooms" title="No imports yet" sub="Spreadsheets you import show here with what was added." />} onRow={(j) => setOpen(j.id)} selected={open ?? undefined} summary="Latest 100 imports"
            cols={[
              { key: 'n', label: 'Import', render: (j) => <span className="flex items-center gap-2.5">{j.kind === 'Spreadsheet' ? <IconTile icon={FileCsv} tone="green" /> : <IconTile icon={Stack} tone="purple" />}<span className="font-medium">{j.name}</span></span> },
              { key: 'k', label: 'Kind', render: (j) => <span className="text-[#737373]">{j.kind}</span> },
              { key: 's', label: 'Status', render: (j) => <PropStatus s={j.status} /> },
              { key: 'p', label: 'Progress', render: (j) => <span className="flex items-center gap-2"><Progress value={j.status === 'Failed' ? 0 : (j.done / j.total) * 100} tone={j.status === 'Succeeded' ? 'green' : j.status === 'Queued' ? 'grey' : 'blue'} className="w-24" /><span className="text-xs text-[#737373] tabular-nums">{j.status === 'Failed' ? `${j.errors} errors` : `${j.done} / ${j.total}`}</span></span> },
              { key: 'b', label: 'Started by', render: (j) => <span className="text-[#737373]">{j.by}</span> },
              { key: 't', label: 'Started', render: (j) => <span className="text-[#737373]">{j.started}</span> },
            ]} />
        </div>
      </div>
      <Sheet open={!!sel} onClose={() => setOpen(null)} title="Import" nav={listNav(rows, (j) => j.id === open, (j) => setOpen(j.id))}
        footer={sel?.status === 'Failed' ? <><Button variant="ghost" className="mr-auto" onClick={() => toast.success('hild-bede-flats-errors.csv downloaded')}>Error file</Button><Button variant="primary" icon={ArrowClockwise} onClick={() => { useInv.getState().set('imports', (l) => l.map((j) => (j.id === sel.id ? { ...j, status: 'Queued' as const, errors: undefined } : j))); toast.success(`${sel.name} queued again`); }}>Retry</Button></>
          : sel?.status === 'Succeeded' && sel.name === 'st-marys-rooms.csv' ? <Button variant="primary" onClick={() => nav('/inventory/properties/stm')}>Open St Mary’s College</Button> : undefined}>
        {sel && <>
          <SheetHero avatar={false} name={sel.name} meta={sel.status === 'Failed' ? `${sel.errors} errors` : `${sel.done} of ${sel.total} rows`}>
            <PropStatus s={sel.status} />
          </SheetHero>
          {sel.status !== 'Failed' && <div className="pb-5"><Progress value={(sel.done / sel.total) * 100} tone={sel.status === 'Succeeded' ? 'green' : 'blue'} /></div>}
          <SheetSection title="Import" rows={[
            ['Kind', sel.kind === 'Spreadsheet' ? 'Spreadsheet import' : sel.kind],
            ['Layout', sel.structure],
            ['Creates', sel.creates],
            ...(sel.kind === 'Spreadsheet' ? [['File', <button key="f" type="button" className="font-medium text-[#2B5CFF] inline-flex items-center gap-1.5" onClick={() => toast.success(`${sel.name} downloaded`)}><DownloadSimple size={14} />Original file</button>] as [string, ReactNode]] : []),
          ]} />
          <SheetSection title="Run" rows={[['Started by', `${sel.by} · ${sel.started}`], ['Result', 'Emailed when it ends']]}>
            <p className="mt-3 text-xs text-[#737373]">All or nothing: if any row fails, nothing is created.</p>
          </SheetSection>
        </>}
      </Sheet>
    </>
  );
}
