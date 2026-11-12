import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { ArrowsDownUp, CaretLeft, CaretRight, Check, CheckCircle, DownloadSimple, Flag, FunnelX, MagicWand, ShieldWarning, Tray } from '../../components/icons';
import { toast } from 'sonner';
import { Button, PageHeader, Sheet, Toolbar, cx, listNav } from '../../components/ui';
import { Checkbox } from '../../components/shadcn/checkbox';
import { appCounts, fmtN, useAlloc, type App, type AppStatus } from '../../data/allocations';
import { useOpen, useTab } from '../hooks';
import { DisplayButton, EmptyArea, Foot, Grid, Ini, Person, Pop, St, type C } from './common';
import { AppDetail, statusLabel, type Pref } from './AppDetail';
import { AllocateSheet, AutoAllocateDialog, RejectDialog } from './AppSheets';
import { applyFilters, describe, fieldsFor, FilterPanel, type Filters } from './filters';

type TabId = 'To review' | 'Flagged' | 'Allocated' | 'Rejected' | 'All';
const LEGACY: Record<string, TabId> = { 'Manual review': 'Flagged', New: 'To review', 'In review': 'To review', Offered: 'Allocated', Accepted: 'Allocated', Waitlisted: 'All', Declined: 'Rejected' };
const tabStatus: Record<TabId, AppStatus | null> = { 'To review': 'review', Flagged: 'manual', Allocated: 'allocated', Rejected: 'rejected', All: null };
const PAGE = 50;

/* "24 Oct" within a cycle → a sortable number: newer cycles first, then the date inside the cycle's
   September-to-August year. A plain string sort put 28 May next to 28 Sep. */
const MON = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
function dayKey(cycle: string, label?: string) {
  if (!label) return 0;
  const [d, m] = label.split(' ');
  return (+cycle.slice(0, 4) || 0) * 10000 + Math.max(0, MON.indexOf(m)) * 100 + (+d || 0);
}

/* Filters live at module level so they survive tab switches within the session (Flow 1 keeps them while she works). */
let saved: Filters | null = null;
/** Land on Applications filtered to one cycle (from the Cycles page). */
export const filterToCycle = (name: string) => { saved = { vals: { cycle: { v: name } }, order: ['cycle'] }; };

export function Applications() {
  const d = useAlloc();
  const nav = useNavigate();
  const [sort, setSort] = useState('Oldest first');
  const [raw, setTab] = useTab<TabId>('To review');
  const tab: TabId = LEGACY[raw] ?? (tabStatus[raw] !== undefined ? raw : 'To review');
  const [open, setOpen] = useOpen();
  const liveCycle = d.cycles.find((c) => c.status === 'open')?.name ?? '2027/28';
  const defaults: Filters = { vals: { cycle: { v: liveCycle } }, order: ['cycle'] };
  const [fs, setFsState] = useState<Filters>(saved ?? defaults);
  const setFs = (f: Filters) => { saved = f; setFsState(f); };
  const fields = useMemo(() => fieldsFor(d.cycles.map((c) => c.name)), [d.cycles]);
  const [auto, setAuto] = useState(() => new URLSearchParams(window.location.hash.split('?')[1]).get('auto') === '1');
  const counts = appCounts(d);
  const status = tabStatus[tab];
  const base = d.apps.filter((a) => (status ? a.status === status : true));
  const rows = applyFilters(base, fs, fields);
  const isDefault = fs.order.length === 1 && fs.order[0] === 'cycle' && fs.vals.cycle?.v === liveCycle;
  const split = tab === 'To review';
  const cycleSel = d.cycles.find((c) => c.name === fs.vals.cycle?.v);
  const notOpenYet = cycleSel?.status === 'upcoming';
  return (
    <>
      <PageHeader icon={Tray} title="Applications" crumbs={['Allocations']}>
        {/* Nothing to export or allocate before the first application. */}
        {d.apps.length > 0 && <>
        <Button icon={DownloadSimple} onClick={() => toast.success(`Exporting ${fmtN(rows.length)} applications`, { description: 'The CSV downloads when it’s ready · filters are kept' })}>Export</Button>
        <Button variant="primary" icon={MagicWand} onClick={() => setAuto(true)}>Auto-allocate</Button>
        </>}
      </PageHeader>
      <Toolbar className={cx('!py-3', split && 'border-b border-line')} right={<>
        <FilterPanel rows={base} fs={fs} setFs={setFs} fields={fields} />
        {split ? <SortButton s={sort} setS={setSort} /> : <TableDisplay tab={tab} />}
      </>} heading={tab} />
      {notOpenYet ? (
        <EmptyArea art="applications" icon={Tray} title="No applications yet" sub={`Applications for ${cycleSel!.name} open on ${cycleSel!.opens}. They arrive here once the application form is published on the on-campus portal.`}>
          <Button variant="primary" onClick={() => toast('The form builder opens on the on-campus portal', { description: `Application form ${cycleSel!.name} · Draft` })}>Open the form</Button>
          <Button onClick={() => { void navigator.clipboard?.writeText('https://accommodation.durham.ac.uk/apply'); toast.success('Portal link copied'); }}>Copy portal link</Button>
        </EmptyArea>
      ) : !d.apps.length ? (
        /* First login: nothing has come in yet, whatever the tab. The next step is a cycle to apply to. */
        <EmptyArea art="applications" icon={Tray} title="No applications yet" sub={d.cycles.length ? 'Applications arrive here once students apply through the on-campus portal.' : 'Open a cycle, and applications arrive here once students apply through the on-campus portal.'}>
          {d.cycles.length
            ? <Button onClick={() => { void navigator.clipboard?.writeText('https://accommodation.durham.ac.uk/apply'); toast.success('Portal link copied'); }}>Copy portal link</Button>
            : <Button variant="primary" onClick={() => nav('/allocations/cycles?new=1')}>Open a cycle</Button>}
        </EmptyArea>
      ) : tab === 'To review' && counts.review === 0 ? (
        <EmptyArea art="queueClear" icon={CheckCircle} title="Queue clear" sub="New applications land here as students apply.">
          <Button onClick={() => setTab('Flagged')}>Open flagged · {counts.manual}</Button>
        </EmptyArea>
      ) : split ? (
        <Queue key={tab} sort={sort} tab={tab} rows={rows} total={isDefault ? counts.review : rows.length} filtered={!isDefault} open={open} setOpen={setOpen} fs={fs} setFs={setFs} fields={fields} base={base} defaults={defaults} />
      ) : (
        <AppTable key={tab} tab={tab} rows={rows} open={open} setOpen={setOpen} />
      )}
      <AutoAllocateDialog open={auto} onClose={() => setAuto(false)} />
    </>
  );
}

function SortButton({ s, setS }: { s: string; setS: (s: string) => void }) {
  return (
    <Pop width={180} button={(_, t) => <Button variant="control" icon={ArrowsDownUp} onClick={t}>{s}</Button>}>
      {(close) => <div className="p-1">{['Oldest first', 'Newest first'].map((o) => (
        <button key={o} type="button" onClick={() => { setS(o); close(); }} className="w-full h-8 px-2 rounded-md hover:bg-gray-50 text-left text-sm flex items-center">{o}{o === s && <Check size={13} className="ml-auto text-primary" />}</button>
      ))}</div>}
    </Pop>
  );
}

/* ---------------- Split view: list on the left, detail on the right ---------------- */
function Queue({ sort, tab, rows, total, filtered, open, setOpen, fs, setFs, fields, base, defaults }: {
  sort: string; tab: TabId; rows: App[]; total: number; filtered: boolean; open: string | null; setOpen: (id: string | null) => void;
  fs: Filters; setFs: (f: Filters) => void; fields: ReturnType<typeof fieldsFor>; base: App[]; defaults: Filters;
}) {
  const [page, setPage] = useState(0);
  const [allocating, setAllocating] = useState<{ a: App; p: Pref } | null>(null);
  const [rejecting, setRejecting] = useState<App | null>(null);
  const [checked, setChecked] = useState(false);
  // Keep the list order stable while she works: sorted oldest first (longest waiting).
  const sorted = useMemo(() => [...rows].sort((x, y) => (sort === 'Newest first' ? x.waiting - y.waiting || +y.ref - +x.ref : y.waiting - x.waiting || +x.ref - +y.ref)), [rows, sort]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const shown = sorted.slice(page * PAGE, page * PAGE + PAGE);
  const sel = sorted.find((a) => a.id === open) ?? sorted[0];
  useEffect(() => { const i = sorted.findIndex((a) => a.id === open); if (i >= 0) setPage(Math.floor(i / PAGE)); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const [order, setOrder] = useState<string[]>([]);
  useEffect(() => { setOrder(sorted.map((a) => a.id)); }, [sorted.length, sort]); // eslint-disable-line react-hooks/exhaustive-deps
  const after = (a: App) => {
    // The next application opens: the one below it in the list as it was before the action.
    const ids = order.length ? order : sorted.map((x) => x.id);
    const i = ids.indexOf(a.id);
    const next = ids.slice(i + 1).find((id) => id !== a.id) ?? ids.slice(0, i).reverse()[0] ?? null;
    setOpen(tab === 'All' ? a.id : next);
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input,textarea,select,[role=dialog]')) return;
      if (e.key !== 'j' && e.key !== 'k') return;
      const i = sorted.findIndex((x) => x.id === sel?.id);
      const n = sorted[i + (e.key === 'j' ? 1 : -1)];
      if (n) setOpen(n.id);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });
  const last = fs.order[fs.order.length - 1];
  const lastField = fields.find((f) => f.id === last);
  const without = last ? applyFilters(base, { vals: Object.fromEntries(Object.entries(fs.vals).filter(([k]) => k !== last)), order: [] }, fields).length : 0;
  return (
    <div className="flex-1 min-h-0 flex">
      <div className="w-[340px] shrink-0 border-r border-line flex flex-col">
        <div className="h-10 shrink-0 px-3 flex items-center gap-2 border-b border-[#F3F4F6] text-xs text-gray-500">
          <Checkbox aria-label="Select all on this page" checked={checked} onCheckedChange={(v) => setChecked((v === true))} />
          {checked ? <>
            <span className="text-ink">{shown.length} selected</span>
            <button type="button" className="ml-auto text-primary" onClick={() => { setChecked(false); toast(`${shown.length} applications exported`, { description: 'Bulk actions arrive in a later release' }); }}>Export</button>
          </> : <>
            <span>{fmtN(total)} {tab === 'To review' ? (filtered || fs.order.length ? 'to review' : 'applications') : 'applications'}</span>
            <span className="ml-auto">{sorted.length ? `${page * PAGE + 1}–${Math.min(sorted.length, page * PAGE + PAGE)}` : '0'}</span>
            <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)} className="size-7 rounded-lg border border-line bg-white text-[#111827] shadow-[0_1px_2px_rgba(17,24,39,0.05)] hover:bg-subtle disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-[background-color,transform] duration-150 ease-snappy active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CaretLeft size={12} /></button>
            <button type="button" aria-label="Next page" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="size-7 rounded-lg border border-line bg-white text-[#111827] shadow-[0_1px_2px_rgba(17,24,39,0.05)] hover:bg-subtle disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-[background-color,transform] duration-150 ease-snappy active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CaretRight size={12} /></button>
          </>}
        </div>
        <div className="flex-1 overflow-auto">
          {shown.map((a) => (
            <button key={a.id} type="button" onClick={() => setOpen(a.id)} data-selected={sel?.id === a.id || undefined}
              className={cx('w-full text-left h-14 px-3 flex items-center gap-2.5 border-b border-[#F3F4F6] border-l-2', sel?.id === a.id ? 'bg-[#EFF6FF] border-l-primary' : 'border-l-transparent hover:bg-[#F9FAFB]')}>
              <Ini name={a.name} size={24} />
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate"><span className="font-semibold">{a.name}</span>{a.tag && <span className={cx('text-xs font-medium', a.tag === 'No study offer' ? 'text-[#9A5B00]' : 'text-[#8B2CF5]')}> · {a.tag}</span>}</div>
                <div className="text-xs text-gray-500 truncate">{a.hall} · {a.room}</div>
              </div>
              <div className="text-right shrink-0">
                <div className={cx('text-xs', a.waiting >= 7 ? 'font-semibold text-[#C11F14]' : a.waiting >= 5 ? 'font-semibold text-[#C2410C]' : 'font-medium text-gray-500')}>{a.waiting} d</div>
                <div className="text-xs text-[#646A78] font-mono mt-0.5">{a.ref}</div>
              </div>
            </button>
          ))}
          {!sorted.length && <div className="p-4 text-sm text-gray-500">No applications match.</div>}
        </div>
      </div>
      {sel ? (
        <AppDetail key={sel.id} a={sel} onAllocate={(p) => setAllocating({ a: sel, p })} onReject={() => setRejecting(sel)} onAfter={() => after(sel)} />
      ) : (
        <EmptyArea icon={FunnelX} title={tab === 'To review' ? 'No applications match these filters' : 'No applications match'}
          sub={lastField ? `${describe(lastField, fs.vals[last])} leaves nothing. Without it, ${without} application${without === 1 ? '' : 's'} match${without === 1 ? 'es' : ''}.` : 'Try another search.'}>
          {lastField && <Button variant="primary" onClick={() => { const vals = { ...fs.vals }; delete vals[last]; setFs({ vals, order: fs.order.filter((o) => o !== last) }); }}>Remove {lastField.label}</Button>}
          <Button onClick={() => setFs(defaults)}>Clear all filters</Button>
        </EmptyArea>
      )}
      {allocating && <AllocateSheet a={allocating.a} pref={allocating.p} onClose={() => setAllocating(null)} onDone={() => { const a = allocating.a; setAllocating(null); after(a); }} />}
      {rejecting && <RejectDialog a={rejecting} onClose={() => setRejecting(null)} onDone={() => { const a = rejecting; setRejecting(null); after(a); }} />}
    </div>
  );
}

/* ---------------- Table tabs: Flagged, Allocated, Rejected ---------------- */
const COLS: Record<string, { key: string; label: string }[]> = {
  All: [{ key: 'ref', label: 'Reference' }, { key: 'pref', label: '1st preference' }, { key: 'status', label: 'Status' }, { key: 'sub', label: 'Submitted' }],
  Flagged: [{ key: 'why', label: 'Why it’s here' }, { key: 'pref', label: '1st preference' }, { key: 'wait', label: 'Waiting' }, { key: 'who', label: 'Assigned to' }],
  Allocated: [{ key: 'unit', label: 'Unit' }, { key: 'by', label: 'Allocated by' }, { key: 'on', label: 'On' }, { key: 'offer', label: 'Offer' }],
  Rejected: [{ key: 'reason', label: 'Reason' }, { key: 'by', label: 'Rejected by' }, { key: 'on', label: 'On' }, { key: 'emailed', label: 'Emailed' }],
};
let hiddenCols: Record<string, string[]> = {};
function TableDisplay({ tab }: { tab: TabId }) {
  const [, force] = useState(0);
  return <DisplayButton cols={COLS[tab] ?? []} hidden={hiddenCols[tab] ?? []} onChange={(h) => { hiddenCols = { ...hiddenCols, [tab]: h }; force((n) => n + 1); window.dispatchEvent(new Event('alloc-cols')); }} />;
}

function AppTable({ tab, rows, open, setOpen }: { tab: TabId; rows: App[]; open: string | null; setOpen: (id: string | null) => void }) {
  const [, force] = useState(0);
  useEffect(() => { const h = () => force((n) => n + 1); window.addEventListener('alloc-cols', h); return () => window.removeEventListener('alloc-cols', h); }, []);
  const [allocating, setAllocating] = useState<{ a: App; p: Pref } | null>(null);
  const [rejecting, setRejecting] = useState<App | null>(null);
  const sel = rows.find((a) => a.id === open);
  const [page, setPage] = useState(0);
  const [newest, setNewest] = useState(false);
  useEffect(() => setPage(0), [rows.length]);
  const applicant: C<App> = { key: 'name', label: 'Applicant', render: (a) => <Person name={a.name} /> };
  const order = useMemo(() => (tab === 'Flagged' ? [...rows].sort((x, y) => y.waiting - x.waiting) : tab === 'All' ? [...rows].sort((x, y) => (dayKey(x.cycle, x.submitted) - dayKey(y.cycle, y.submitted) || +x.ref - +y.ref) * (newest ? -1 : 1))
    : [...rows].sort((x, y) => dayKey(y.cycle, y.allocOn ?? y.rejOn) - dayKey(x.cycle, x.allocOn ?? x.rejOn) || +y.ref - +x.ref)), [rows, tab, newest]);
  const pages = Math.max(1, Math.ceil(order.length / PAGE));
  const shown = order.slice(page * PAGE, page * PAGE + PAGE);
  useEffect(() => { const i = order.findIndex((a) => a.id === open); if (i >= 0) setPage(Math.floor(i / PAGE)); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const cols: C<App>[] = tab === 'Flagged' ? [
    applicant,
    { key: 'why', label: 'Why it’s here', render: (a) => <span className="flex items-center gap-2"><Flag size={14} className="text-[#8B2CF5]" />{a.why}</span> },
    { key: 'pref', label: '1st preference', render: (a) => <span className="text-gray-500">{a.hall} · {a.room}</span> },
    { key: 'wait', label: 'Waiting', render: (a) => <span className={cx(a.waiting >= 7 ? 'font-semibold text-[#C11F14]' : a.waiting >= 5 ? 'font-semibold text-[#C2410C]' : 'font-medium text-gray-500')}>{a.waiting} d</span> },
    { key: 'who', label: 'Assigned to', render: (a) => (a.assignee ? <span className="flex items-center gap-2 font-medium"><Ini name={a.assignee} size={24} />{a.assignee}</span> : <span className="text-gray-500">Unassigned</span>) },
  ] : tab === 'All' ? [
    applicant,
    { key: 'ref', label: 'Reference', render: (a) => <span className="font-mono text-xs text-gray-500">APP-{a.ref}</span> },
    { key: 'pref', label: '1st preference', render: (a) => <span className="text-gray-500">{a.hall} · {a.room}</span> },
    { key: 'status', label: 'Status', render: (a) => <St s={statusLabel[a.status]} /> },
    { key: 'sub', label: 'Submitted', render: (a) => <span className="text-gray-500">{a.submitted}</span> },
  ] : tab === 'Allocated' ? [
    { key: 'name', label: 'Applicant', render: (a) => <span className="flex items-center gap-2"><Person name={a.name} />{a.override && <ShieldWarning size={14} className="text-[#C47A00] shrink-0" aria-label="Allocated with an override" />}</span> },
    { key: 'unit', label: 'Unit', render: (a) => a.unit },
    { key: 'by', label: 'Allocated by', render: (a) => (a.allocBy === 'Auto-allocate' ? <span className="flex items-center gap-1.5 text-gray-500"><MagicWand size={14} className="text-gray-400" />Auto-allocate</span> : <span className="text-gray-500">{a.allocBy}</span>) },
    { key: 'on', label: 'On', render: (a) => <span className="text-gray-500">{a.allocOn}</span> },
    { key: 'offer', label: 'Offer', render: (a) => <St s={a.offer ?? 'Offer open'} /> },
  ] : [
    { key: 'name', label: 'Applicant', render: (a) => <span className="flex items-center gap-2"><Ini name={a.name} size={24} /><span className="font-medium text-gray-400 truncate">{a.name}</span></span> },
    { key: 'reason', label: 'Reason', render: (a) => a.reason },
    { key: 'by', label: 'Rejected by', render: (a) => <span className="text-gray-400">{a.rejBy}</span> },
    { key: 'on', label: 'On', render: (a) => <span className="text-gray-400">{a.rejOn}</span> },
    { key: 'emailed', label: 'Emailed', render: (a) => (a.emailed ? <span className="flex items-center gap-1.5"><Check size={14} className="text-[#0B8A4C]" />Yes</span> : <span className="text-gray-400">No</span>) },
  ];
  /* The foot counts the rows in the list (all filters applied), so it always matches what you can page through. */
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 overflow-auto">
        {order.length ? <Grid cols={cols} rows={shown} onRow={(a) => setOpen(a.id)} selected={open} hidden={hiddenCols[tab]} sort={tab === 'All' ? { key: 'sub', dir: newest ? 'desc' : 'asc', onToggle: () => setNewest((v) => !v) } : undefined} /> : <EmptyArea icon={Tray} title={`Nothing in ${tab.toLowerCase()} for these filters`} sub="Clear a filter to see more." />}
      </div>
      <Foot right={<>
        {pages > 1 && <span className="flex items-center gap-1 tabular-nums">
          {page * PAGE + 1}–{Math.min(order.length, page * PAGE + PAGE)} of {fmtN(order.length)}
          <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)} className="size-7 rounded-lg border border-line bg-white text-[#111827] shadow-[0_1px_2px_rgba(17,24,39,0.05)] hover:bg-subtle disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-[background-color,transform] duration-150 ease-snappy active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CaretLeft size={12} /></button>
          <button type="button" aria-label="Next page" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="size-7 rounded-lg border border-line bg-white text-[#111827] shadow-[0_1px_2px_rgba(17,24,39,0.05)] hover:bg-subtle disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center transition-[background-color,transform] duration-150 ease-snappy active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CaretRight size={12} /></button>
        </span>}
      </>} />
      <Sheet open={!!sel && !allocating && !rejecting} onClose={() => setOpen(null)} width={600} title="Application" nav={listNav(order, (a) => a.id === open, (a) => setOpen(a.id))}>
        {sel && <div className="-m-5 h-[calc(100vh-16px-56px)] flex"><AppDetail a={sel} onAllocate={(p) => setAllocating({ a: sel, p })} onReject={() => setRejecting(sel)} onAfter={() => setOpen(null)} /></div>}
      </Sheet>
      {allocating && <AllocateSheet a={allocating.a} pref={allocating.p} onClose={() => setAllocating(null)} onDone={() => { setAllocating(null); setOpen(null); }} />}
      {rejecting && <RejectDialog a={rejecting} onClose={() => setRejecting(null)} onDone={() => { setRejecting(null); setOpen(null); }} />}
    </div>
  );
}
