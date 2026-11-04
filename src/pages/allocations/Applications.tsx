import { useEffect, useMemo, useState } from 'react';
import { ArrowsDownUp, CaretLeft, CaretRight, Check, CheckCircle, DownloadSimple, Flag, FunnelX, MagicWand, ShieldWarning, Tray } from '../../components/icons';
import { toast } from 'sonner';
import { Button, PageHeader, SearchInput, Sheet, Tabs, Toolbar, cx } from '../../components/ui';
import { Checkbox } from '../../components/shadcn/checkbox';
import { TODAY, appCounts, fmtN, useAlloc, type App, type AppStatus } from '../../data/allocations';
import { useOpen, useTab } from '../hooks';
import { Caption, DisplayButton, EmptyArea, Foot, Grid, Ini, Kbd, Person, Pop, St, type C } from './common';
import { AppDetail, statusLabel, type Pref } from './AppDetail';
import { AllocateSheet, AutoAllocateDialog, RejectDialog } from './AppSheets';
import { applyFilters, describe, fieldsFor, FilterPanel, type Filters } from './filters';

type TabId = 'To review' | 'Manual review' | 'Allocated' | 'Rejected' | 'All';
const LEGACY: Record<string, TabId> = { New: 'To review', 'In review': 'To review', Offered: 'Allocated', Accepted: 'Allocated', Waitlisted: 'All', Declined: 'Rejected' };
const tabStatus: Record<TabId, AppStatus | null> = { 'To review': 'review', 'Manual review': 'manual', Allocated: 'allocated', Rejected: 'rejected', All: null };
const PAGE = 50;

/* Filters live at module level so they survive tab switches within the session (Flow 1 keeps them while she works). */
let saved: Filters | null = null;
/** Land on Applications filtered to one cycle (from the Cycles page). */
export const filterToCycle = (name: string) => { saved = { vals: { cycle: { v: name } }, order: ['cycle'] }; };

export function Applications() {
  const d = useAlloc();
  const [sort, setSort] = useState('Oldest first');
  const [raw, setTab] = useTab<TabId>('To review');
  const tab: TabId = LEGACY[raw] ?? (tabStatus[raw] !== undefined ? raw : 'To review');
  const [open, setOpen] = useOpen();
  const liveCycle = d.cycles.find((c) => c.status === 'open')?.name ?? '2027/28';
  const defaults: Filters = { vals: { cycle: { v: liveCycle } }, order: ['cycle'] };
  const [fs, setFsState] = useState<Filters>(saved ?? defaults);
  const setFs = (f: Filters) => { saved = f; setFsState(f); };
  const fields = useMemo(() => fieldsFor(d.cycles.map((c) => c.name)), [d.cycles]);
  const [auto, setAuto] = useState(false);
  const [q, setQ] = useState('');
  const counts = appCounts(d);
  const status = tabStatus[tab];
  const base = d.apps.filter((a) => (status ? a.status === status : true) && (!q || (a.name + ' APP-' + a.ref).toLowerCase().includes(q.toLowerCase())));
  const rows = applyFilters(base, fs, fields);
  const isDefault = fs.order.length === 1 && fs.order[0] === 'cycle' && fs.vals.cycle?.v === liveCycle && !q;
  const split = tab === 'To review';
  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'To review', label: 'To review', count: counts.review }, { id: 'Manual review', label: 'Manual review', count: counts.manual },
    { id: 'Allocated', label: 'Allocated', count: counts.allocated }, { id: 'Rejected', label: 'Rejected', count: counts.rejected }, { id: 'All', label: 'All', count: counts.all },
  ];
  const cycleSel = d.cycles.find((c) => c.name === fs.vals.cycle?.v);
  const notOpenYet = cycleSel?.status === 'upcoming';
  return (
    <>
      <PageHeader icon={Tray} title="Applications" crumbs={['Allocations']}>
        <Button icon={DownloadSimple} onClick={() => toast.success(`Exporting ${fmtN(rows.length)} applications`, { description: 'The CSV downloads when it’s ready · filters are kept' })}>Export</Button>
        <Button icon={MagicWand} onClick={() => setAuto(true)}>Auto-allocate…</Button>
      </PageHeader>
      <Toolbar right={<>
        {tab === 'All' && <SearchInput value={q} onChange={setQ} placeholder="Search name or APP-" />}
        <FilterPanel rows={base} fs={fs} setFs={setFs} fields={fields} />
        {split ? <SortButton s={sort} setS={setSort} /> : <TableDisplay tab={tab} />}
      </>}>
        <Tabs value={tab} onChange={(t) => setTab(t)} tabs={tabs} />
      </Toolbar>
      {notOpenYet ? (
        <EmptyArea icon={Tray} title="No applications yet" sub={`Applications for ${cycleSel!.name} open on ${cycleSel!.opens}. They arrive here once the application form is published on the on-campus portal.`}>
          <Button variant="primary" onClick={() => toast('The form builder opens on the on-campus portal', { description: `Application form ${cycleSel!.name} · Draft` })}>Open the form</Button>
          <Button onClick={() => { void navigator.clipboard?.writeText('https://accommodation.durham.ac.uk/apply'); toast.success('Portal link copied'); }}>Copy portal link</Button>
        </EmptyArea>
      ) : tab === 'To review' && counts.review === 0 ? (
        <EmptyArea icon={CheckCircle} title="Queue clear" sub="Every application has been allocated, rejected or sent for manual review. New ones land here as students apply.">
          <Button onClick={() => setTab('Manual review')}>Open manual review · {counts.manual}</Button>
        </EmptyArea>
      ) : split ? (
        <Queue key={tab} sort={sort} tab={tab} rows={rows} total={isDefault ? counts.review : rows.length} filtered={!isDefault} open={open} setOpen={setOpen} fs={fs} setFs={setFs} fields={fields} base={base} defaults={defaults} />
      ) : (
        <AppTable tab={tab} rows={rows} counts={counts} open={open} setOpen={setOpen} />
      )}
      <AutoAllocateDialog open={auto} onClose={() => setAuto(false)} />
    </>
  );
}

function SortButton({ s, setS }: { s: string; setS: (s: string) => void }) {
  return (
    <Pop width={180} button={(_, t) => <Button icon={ArrowsDownUp} onClick={t}>{s}</Button>}>
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
            <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)} className="size-6 rounded hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center"><CaretLeft size={12} /></button>
            <button type="button" aria-label="Next page" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="size-6 rounded hover:bg-gray-100 disabled:opacity-30 flex items-center justify-center"><CaretRight size={12} /></button>
          </>}
        </div>
        <div className="flex-1 overflow-auto">
          {shown.map((a) => (
            <button key={a.id} type="button" onClick={() => setOpen(a.id)}
              className={cx('w-full text-left h-14 px-3 flex items-center gap-2.5 border-b border-[#F3F4F6] border-l-2', sel?.id === a.id ? 'bg-[#EFF6FF] border-l-primary' : 'border-l-transparent hover:bg-[#F9FAFB]')}>
              <Ini name={a.name} size={24} />
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate"><span className="font-semibold">{a.name}</span>{a.tag && <span className={cx('text-xs font-medium', a.tag === 'No study offer' ? 'text-[#C47A00]' : 'text-[#8B2CF5]')}> · {a.tag}</span>}</div>
                <div className="text-xs text-gray-500 truncate">{a.hall} · {a.room}</div>
              </div>
              <div className="text-right shrink-0">
                <div className={cx('text-xs', a.waiting >= 7 ? 'font-semibold text-[#E0243A]' : a.waiting >= 5 ? 'font-semibold text-[#E5530C]' : 'font-medium text-gray-500')}>{a.waiting} d</div>
                <div className="text-xs text-gray-400 font-mono mt-0.5">{a.ref}</div>
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

/* ---------------- Table tabs: Manual review, Allocated, Rejected ---------------- */
const COLS: Record<string, { key: string; label: string }[]> = {
  All: [{ key: 'ref', label: 'Reference' }, { key: 'pref', label: '1st preference' }, { key: 'status', label: 'Status' }, { key: 'sub', label: 'Submitted' }],
  'Manual review': [{ key: 'why', label: 'Why it’s here' }, { key: 'pref', label: '1st preference' }, { key: 'wait', label: 'Waiting' }, { key: 'who', label: 'Assigned to' }],
  Allocated: [{ key: 'unit', label: 'Unit' }, { key: 'by', label: 'Allocated by' }, { key: 'on', label: 'On' }, { key: 'offer', label: 'Offer' }],
  Rejected: [{ key: 'reason', label: 'Reason' }, { key: 'by', label: 'Rejected by' }, { key: 'on', label: 'On' }, { key: 'emailed', label: 'Emailed' }],
};
let hiddenCols: Record<string, string[]> = {};
function TableDisplay({ tab }: { tab: TabId }) {
  const [, force] = useState(0);
  return <DisplayButton cols={COLS[tab] ?? []} hidden={hiddenCols[tab] ?? []} onChange={(h) => { hiddenCols = { ...hiddenCols, [tab]: h }; force((n) => n + 1); window.dispatchEvent(new Event('alloc-cols')); }} />;
}

function AppTable({ tab, rows, counts, open, setOpen }: { tab: TabId; rows: App[]; counts: ReturnType<typeof appCounts>; open: string | null; setOpen: (id: string | null) => void }) {
  const [, force] = useState(0);
  useEffect(() => { const h = () => force((n) => n + 1); window.addEventListener('alloc-cols', h); return () => window.removeEventListener('alloc-cols', h); }, []);
  const [allocating, setAllocating] = useState<{ a: App; p: Pref } | null>(null);
  const [rejecting, setRejecting] = useState<App | null>(null);
  const sel = rows.find((a) => a.id === open);
  const applicant: C<App> = { key: 'name', label: 'Applicant', render: (a) => <Person name={a.name} /> };
  const order = tab === 'Manual review' ? [...rows].sort((x, y) => y.waiting - x.waiting) : tab === 'All' ? [...rows].sort((x, y) => +x.ref - +y.ref) : [...rows].sort((x, y) => (y.allocOn ?? y.rejOn ?? '').localeCompare(x.allocOn ?? x.rejOn ?? '', undefined, { numeric: true }));
  const cols: C<App>[] = tab === 'Manual review' ? [
    applicant,
    { key: 'why', label: 'Why it’s here', render: (a) => <span className="flex items-center gap-2"><Flag size={14} className="text-[#8B2CF5]" />{a.why}</span> },
    { key: 'pref', label: '1st preference', render: (a) => <span className="text-gray-500">{a.hall} · {a.room}</span> },
    { key: 'wait', label: 'Waiting', render: (a) => <span className={cx(a.waiting >= 7 ? 'font-semibold text-[#E0243A]' : a.waiting >= 5 ? 'font-semibold text-[#E5530C]' : 'font-medium text-gray-500')}>{a.waiting} d</span> },
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
  const sessionRej = rows.filter((a) => a.status === 'rejected' && a.rejOn === TODAY);
  const cat = (k: RegExp) => sessionRej.filter((a) => k.test(a.reason ?? '')).length;
  const caption = tab === 'All' ? null : tab === 'Manual review' ? 'Applications here are left out of auto-allocate' : tab === 'Rejected' ? 'Reasons are counted in the cycle report' : 'Each allocation sends an offer · the student has 5 days to accept';
  const foot = tab === 'All' ? `${fmtN(counts.all)} applications in 2027/28` : tab === 'Manual review' ? `${counts.manual} in manual review`
    : tab === 'Allocated' ? `${fmtN(counts.allocated)} allocated · ${3 + rows.filter((a) => a.override).length} with an override`
    : `${counts.rejected} rejected · ${41 + cat(/study/)} no study offer · ${22 + cat(/Duplicate/)} duplicate · ${19 + cat(/Withdrawn/)} withdrawn · ${14 + cat(/eligible|Other/)} other`;
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {caption && <Caption>{caption}</Caption>}
      <div className="flex-1 overflow-auto">
        {order.length ? <Grid cols={cols} rows={order} onRow={(a) => setOpen(a.id)} selected={open} hidden={hiddenCols[tab]} /> : <EmptyArea icon={Tray} title={`Nothing in ${tab.toLowerCase()} for these filters`} sub="Clear a filter to see more." />}
      </div>
      <Foot right={<><Kbd>↵</Kbd><span>open</span></>}>{foot}</Foot>
      <Sheet open={!!sel && !allocating && !rejecting} onClose={() => setOpen(null)} width={920} title={sel ? `APP-${sel.ref}` : ''} sub={sel ? statusLabel[sel.status] : ''}>
        {sel && <div className="-m-4 h-[calc(100vh-16px-56px)] flex"><AppDetail a={sel} onAllocate={(p) => setAllocating({ a: sel, p })} onReject={() => setRejecting(sel)} onAfter={() => setOpen(null)} /></div>}
      </Sheet>
      {allocating && <AllocateSheet a={allocating.a} pref={allocating.p} onClose={() => setAllocating(null)} onDone={() => { setAllocating(null); setOpen(null); }} />}
      {rejecting && <RejectDialog a={rejecting} onClose={() => setRejecting(null)} onDone={() => { setRejecting(null); setOpen(null); }} />}
    </div>
  );
}
