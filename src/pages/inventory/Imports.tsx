import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowClockwise, DownloadSimple, FileArrowUp, FileText, Stack, UploadSimple, X } from '../../components/icons';
import { Button, PageHeader, Table, Tabs } from '../../components/ui';
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
      <div className="h-12 shrink-0 px-4 flex items-center border-b border-[#F3F4F6]">
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All', count: jobs.length }, { id: 'Running', label: 'Running', count: cnt('Running') }, { id: 'Queued', label: 'Queued', count: cnt('Queued') }, { id: 'Failed', label: 'Failed', count: cnt('Failed') }]} />
      </div>
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col">
          <Table rows={rows} onRow={(j) => setOpen(j.id)} selected={open ?? undefined} summary="Latest 100 imports for Durham University"
            cols={[
              { key: 'n', label: 'Import', render: (j) => { const ic = open === j.id ? 'text-primary' : 'text-gray-500'; return <span className="flex items-center gap-2.5">{j.kind === 'Spreadsheet' ? <FileText size={16} className={ic} /> : <Stack size={16} className={ic} />}<span className="font-medium">{j.name}</span></span>; } },
              { key: 'k', label: 'Kind', render: (j) => <span className="text-[#646A78]">{j.kind}</span> },
              { key: 's', label: 'Status', render: (j) => <PropStatus s={j.status} /> },
              { key: 'p', label: 'Progress', render: (j) => <span className="flex items-center gap-2"><Progress value={j.status === 'Failed' ? 0 : (j.done / j.total) * 100} tone={j.status === 'Succeeded' ? 'green' : j.status === 'Queued' ? 'grey' : 'blue'} className="w-24" /><span className="text-xs text-[#646A78] tabular-nums">{j.status === 'Failed' ? `${j.errors} errors` : `${j.done} / ${j.total}`}</span></span> },
              { key: 'b', label: 'Started by', render: (j) => <span className="text-[#646A78]">{j.by}</span> },
              { key: 't', label: 'Started', render: (j) => <span className="text-[#646A78]">{j.started}</span> },
            ]} />
        </div>
        {sel && (
          /* 2821:3169: 360px panel; 48px header (14px semibold); status + "n of N rows"; 34px detail rows; plain "If it fails" note under a #F3F4F6 rule. */
          <aside className="w-[360px] shrink-0 border-l border-line overflow-auto">
            <div className="h-12 px-4 flex items-center border-b border-[#F3F4F6]"><span className="text-sm font-semibold text-[#111827] truncate">{sel.name}</span><button type="button" aria-label="Close" onClick={() => setOpen(null)} className="ml-auto size-7 rounded-lg text-gray-700 hover:bg-gray-100 flex items-center justify-center"><X size={14} /></button></div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-2"><PropStatus s={sel.status} /><span className="ml-auto text-sm font-semibold text-[#111827] tabular-nums">{sel.status === 'Failed' ? `${sel.errors} errors` : `${sel.done} of ${sel.total} rows`}</span></div>
              {sel.status !== 'Failed' && <Progress value={(sel.done / sel.total) * 100} tone={sel.status === 'Succeeded' ? 'green' : 'blue'} />}
              <dl className="grid grid-cols-[108px_1fr] text-sm leading-5 text-[#111827] [&>dt]:py-[7px] [&>dd]:py-[7px]">
                <dt className="text-[#646A78]">Kind</dt><dd>{sel.kind === 'Spreadsheet' ? 'Spreadsheet import' : sel.kind}</dd>
                <dt className="text-[#646A78]">Layout</dt><dd>{sel.structure}</dd>
                <dt className="text-[#646A78]">Creates</dt><dd>{sel.creates}</dd>
                <dt className="text-[#646A78]">Started by</dt><dd>{sel.by} · {sel.started}</dd>
                {sel.kind === 'Spreadsheet' && <><dt className="text-[#646A78]">File</dt><dd><button type="button" className="font-medium text-[#2B5CFF] inline-flex items-center gap-1.5" onClick={() => toast.success(`${sel.name} downloaded`)}><DownloadSimple size={14} />Original file</button></dd></>}
                <dt className="text-[#646A78]">Result</dt><dd>Emailed when it ends</dd>
              </dl>
              <div className="pt-4 border-t border-[#F3F4F6] text-xs text-[#646A78]"><div className="font-medium mb-2">If it fails</div>Nothing is created: a run is all or nothing. The errors list each row and column, here and in the email.</div>
              {sel.status === 'Failed' && <div className="flex gap-2"><Button size="sm" icon={DownloadSimple} onClick={() => toast.success('hild-bede-flats-errors.csv downloaded')}>Error file</Button><Button size="sm" icon={ArrowClockwise} onClick={() => { useInv.getState().set('imports', (l) => l.map((j) => (j.id === sel.id ? { ...j, status: 'Queued' as const, errors: undefined } : j))); toast.success(`${sel.name} queued again`); }}>Retry</Button></div>}
              {sel.status === 'Succeeded' && sel.name === 'st-marys-rooms.csv' && <Button size="sm" onClick={() => nav('/inventory/properties/stm')}>Open St Mary’s College</Button>}
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
