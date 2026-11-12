// Workspace › Reports. Figma Flow 8 (3035–3038), empty 3130:2, E4 report bounces (3236, 3238, 3239).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Bed, Buildings, CalendarBlank, CaretRight, ChartBar, ChatCircleText, Clock, CurrencyGbp, DownloadSimple, EnvelopeSimple, Funnel as FunnelIcon, Megaphone, Plus,
  ShareNetwork, Info, UsersThree, Warning, Wrench, type Icon,
} from '../../components/icons';
import { toast } from 'sonner';
import { Avatar, Button, Dropdown, Input, Pill, Sheet, Switch, Table, Toolbar, cx, SheetSection, StatStrip, listNav, type SheetNav } from '../../components/ui';
import { useTab } from '../hooks';
import { useDb } from '../../data/store';
import { useAlloc, appCounts, offerCounts } from '../../data/allocations';
import { HALL_OCC, HALL_OCC_2025, type HallOcc } from '../../data/occupancy';
import { useInv } from '../../data/inventory';
import { useRms, type Fault } from '../../data/residents';
import { REPORTS, badgeLabel, scheduleUndo, useWorkspace, whenLabel, wid, type Recipient, type ReportDef, type Schedule } from '../../data/workspace';
import { Alert, EmptyState, Header, IconSelect, RowMenu } from '../org/parts';
import { useEmpty } from '../../data/empty';
import { Empty } from '../../components/ui';

/** Empty-states demo: a report with nothing to count yet. */
function NoReportData({ icon, title }: { icon: Icon; title: string }) {
  return <><Header icon={icon} crumbs={crumbs} title={title} /><div className="flex-1 flex items-center justify-center"><Empty icon={icon} title="No data yet" sub="Numbers show here once there are halls, applications and residents." /></div></>;
}

const AREA_ICON: Record<string, Icon> = { occupancy: Bed, applications: FunnelIcon, rent: CurrencyGbp, sla: Wrench, requests: ChatCircleText, notices: Megaphone };
const LIB = '/reports/library';
const crumbs = [{ label: 'Reports', to: LIB }];
/** Runs fn at most once per `ms`: a double click on Export makes one file. */
function useOnceFor(ms: number) {
  const busy = useRef(false);
  return (fn: () => void) => { if (busy.current) return; busy.current = true; fn(); setTimeout(() => { busy.current = false; }, ms); };
}
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMES = ['07:00', '08:00', '09:00', '12:00', '17:00', '18:00'];

/* ======================= Library / Scheduled / Shared ======================= */
type LibTab = 'library' | 'scheduled' | 'shared';
export function ReportsLibrary() {
  const nav = useNavigate();
  const schedules = useWorkspace((s) => s.schedules);
  const [tab, setTab] = useTab<LibTab>('library');
  const [fix, setFix] = useState<Schedule | null>(null);
  const list = REPORTS;
  const [sp, setSp] = useSearchParams();
  // ?demo=empty shows the "Nothing scheduled" state (3130:2).
  useEffect(() => {
    if (sp.get('demo') !== 'empty') return;
    useWorkspace.getState().set('schedules', []);
    setSp((p) => { const n = new URLSearchParams(p); n.delete('demo'); n.set('tab', 'scheduled'); return n; }, { replace: true });
  }, [sp, setSp]);
  return (
    <>
      <Header icon={ChartBar} crumbs={[{ label: 'Reports' }]} title={{ library: 'Library', scheduled: 'Scheduled', shared: 'Shared with me' }[tab]}>
        <Button icon={Plus} onClick={() => toast('Custom reports are coming soon', { description: 'Start from a library report and schedule it for now.' })}>New report</Button>
      </Header>
      {/* Library, Scheduled and Shared with me are rows in the Reports panel, so the page has no tabs. */}
      {tab === 'library' && (
        /* Connect 2.0 list page (3120:63572): a centred 900px column, 48px down; title, a rule, then rows 20px apart split by rules. */
        <div className="flex-1 overflow-auto">
          <div className="max-w-[900px] mx-auto px-6 pt-12 pb-16">
            <h2 className="text-base leading-6 font-medium text-[#0A0A0A]">All reports</h2>
            <ul className="mt-5 border-t border-[#E5E5E5] divide-y divide-[#E5E5E5]">
              {list.map((r) => <ReportRow key={r.id} r={r} badge={schedules.find((s) => s.reportId === r.id)} onOpen={() => nav(r.to)} />)}
            </ul>
          </div>
        </div>
      )}
      {tab === 'scheduled' && (schedules.length === 0 ? (
        <div className="flex-1 overflow-auto flex items-center justify-center">
          <EmptyState art="schedule" icon={CalendarBlank} title="Nothing scheduled" sub="Open a report and choose Schedule to email it.">
            <Button variant="primary" onClick={() => setTab('library')}>Browse the library</Button>
          </EmptyState>
        </div>
      ) : <ScheduledList onFix={setFix} selected={fix?.id} />)}
      {tab === 'shared' && (<div className="flex-1 min-h-0 flex flex-col pt-6">
        <Table rows={[{ id: 'sh1' }]} onRow={() => nav('/reports')} cols={[
          { key: 'r', label: 'Report', render: () => <span className="flex items-center gap-2.5"><span className="size-7 rounded-lg bg-[#DBEAFE] flex items-center justify-center"><Bed size={14} className="text-[#2563EB]" /></span><span className="text-sm font-medium">Arrivals this week · Collingwood</span></span> },
          { key: 'b', label: 'Shared by', render: () => <span className="flex items-center gap-2 text-sm"><Avatar name="Tom Baker" size={20} />Tom Baker</span> },
          { key: 'f', label: 'From', render: () => <span className="text-sm text-[#737373]">Occupancy</span> },
          { key: 'w', label: 'Shared', render: () => <span className="text-sm text-[#737373]">12 Sep</span> },
        ]} />
      </div>)}
      {fix && <RecipientSheet key={fix.id} s={fix} nav={listNav(schedules, (x) => x.id === fix.id, (x) => setFix(x))} onClose={() => setFix(null)} />}
    </>
  );
}

/* Icon tints alternate blue and purple, as the Connect list does. */
const AREA_TINT: Record<string, [string, string]> = { occupancy: ['#EFF6FF', '#2563EB'], applications: ['#FAF5FF', '#9333EA'], rent: ['#EFF6FF', '#2563EB'], sla: ['#FAF5FF', '#9333EA'], requests: ['#EFF6FF', '#2563EB'], notices: ['#FAF5FF', '#9333EA'] };
/** One library row: 48px tinted circle, 16px medium name over a 14px grey line, the schedule tag, and a View button. */
function ReportRow({ r, badge, onOpen }: { r: ReportDef; badge?: Schedule; onOpen: () => void }) {
  const I = AREA_ICON[r.id] ?? ChartBar;
  const [bg, fg] = AREA_TINT[r.id] ?? AREA_TINT.occupancy;
  return (
    <li className="py-5 flex items-center gap-3.5">
      <span className="size-12 shrink-0 rounded-full border border-[#E5E5E5] shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-center" style={{ background: bg }}>
        <I size={22} strokeWidth={1.75} style={{ color: fg }} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2"><span className="text-base leading-6 font-medium text-[#0A0A0A] truncate">{r.name}</span>{badge && <Pill tone="green">{badgeLabel(badge)}</Pill>}</span>
        <span className="block mt-1 text-sm leading-5 text-[#737373] truncate">{r.desc}</span>
      </span>
      <Button icon={null} onClick={onOpen} aria-label={`View ${r.name}`}>View<CaretRight size={16} strokeWidth={1.75} /></Button>
    </li>
  );
}

function ScheduledList({ onFix, selected }: { onFix: (s: Schedule) => void; selected?: string }) {
  const { schedules, set } = useWorkspace();
  const nav = useNavigate();
  const bounced = schedules.filter((s) => s.lastSend === 'Not delivered');
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {bounced.map((s) => (
        <div key={s.id} className="px-[var(--tx,16px)] pt-4">
          <Alert tone="red" icon={Warning} title={`${s.sendsTo} bounced on ${s.bounced ?? 'Mon 08:00'}`} action={<Button size="sm" onClick={() => onFix(s)}>Change recipient</Button>}>
            The mailbox no longer exists.
          </Alert>
        </div>
      ))}
      <div className="flex-1 min-h-0 flex flex-col pt-6">
        <Table rows={schedules} onRow={onFix} selected={selected} cols={[
          { key: 'r', label: 'Report', className: 'w-[26%]', render: (s) => <span className="text-sm font-medium">{s.name}</span> },
          { key: 't', label: 'Sends to', render: (s) => <span className="text-sm text-gray-700">{s.sendsTo}</span> },
          { key: 'w', label: 'When', render: (s) => <span className="text-sm text-gray-700">{whenLabel(s)}</span> },
          { key: 'l', label: 'Last send', render: (s) => s.lastSend === 'Delivered' ? <Pill tone="green" icon={EnvelopeSimple}>Delivered</Pill> : s.lastSend === 'Not delivered' ? <Pill tone="red" icon={Warning}>Not delivered</Pill> : <Pill tone="grey">Not sent yet</Pill> },
          { key: 'x', label: '', className: 'w-12 text-right', render: (s) => <RowMenu items={[
            { label: 'Edit schedule', onClick: () => onFix(s) },
            { label: 'Open report', onClick: () => nav(REPORTS.find((r) => r.id === s.reportId)?.to ?? '/reports') },
            { label: 'Send now', onClick: () => { set('schedules', (ss) => ss.map((x) => (x.id === s.id && x.lastSend !== 'Not delivered' ? { ...x, lastSend: 'Delivered' as const } : x))); if (s.lastSend === 'Not delivered') onFix(s); else toast.success(`${s.name} sent to ${s.sendsTo}`); } },
            { label: 'Stop sending', danger: true, onClick: () => { const u = scheduleUndo(); set('schedules', (ss) => ss.filter((x) => x.id !== s.id)); toast.success(`${s.name} won’t be sent any more`, { action: { label: 'Undo', onClick: u.arm() } }); } },
          ]} /> },
        ]} />
      </div>
    </div>
  );
}

/** E4 · 02: change a bounced schedule's recipient and send this week's copy. Also the general schedule editor from the list. */
function RecipientSheet({ s, onClose , nav }: { nav?: SheetNav;  s: Schedule; onClose: () => void }) {
  const { set } = useWorkspace();
  const bouncedNow = s.lastSend === 'Not delivered';
  const [to, setTo] = useState(bouncedNow ? 'warden.collingwood@durham.ac.uk' : s.sendsTo);
  const [day, setDay] = useState(s.day);
  const [time, setTime] = useState(s.time);
  const [now, setNow] = useState(bouncedNow);
  const busy = useRef(false);
  const multi = s.recipients.length > 1 || s.recipients.some((r) => r.count > 1);
  const save = () => {
    if (busy.current) return;
    if (!multi && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) { toast.error('Enter an email address'); return; }
    busy.current = true;
    const u = scheduleUndo();
    const email = to.trim();
    set('schedules', (ss) => ss.map((x) => (x.id === s.id ? {
      ...x, day, time, bounced: now ? undefined : x.bounced,
      ...(multi ? {} : { sendsTo: email, recipients: [{ id: wid('x'), name: email, sub: 'Email', count: 1, email }] }),
      lastSend: now ? 'Delivered' as const : x.lastSend,
    } : x)));
    onClose();
    toast.success(now ? `${s.name} sent to ${multi ? s.sendsTo : email}` : `${s.name} · schedule saved`, { action: { label: 'Undo', onClick: u.arm() } });
  };
  return (
    <Sheet open onClose={onClose} nav={nav} width={500} title={`${s.name} · schedule`} sub={whenLabel(s)}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{now ? 'Save and send' : 'Save'}</Button></>}>
      <div className="[&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">
        <SheetSection title="Send to">
          {multi ? <div className="text-sm text-gray-700">{s.sendsTo}</div> : (
            <label className="relative flex items-center"><EnvelopeSimple size={14} className="absolute left-2.5 text-[#737373]" /><Input value={to} onChange={(e) => setTo(e.target.value)} className="pl-8" /></label>
          )}
          {bouncedNow && <p className="text-xs text-[#E0243A] mt-1.5">{s.sendsTo} bounced: the mailbox no longer exists.</p>}
        </SheetSection>
        <SheetSection title="When">
          <div className="grid grid-cols-2 gap-3">
            <IconSelect ariaLabel="Day" value={day} onChange={setDay} options={[...DAYS.map((d) => ({ value: d, label: `${d}s` })), { value: '1st', label: '1st of the month' }]} />
            <IconSelect ariaLabel="Time" icon={Clock} value={time} onChange={setTime} options={TIMES.map((t) => ({ value: t, label: t }))} />
          </div>
        </SheetSection>
        <SheetSection title="This week">
        <div className="rounded-xl border border-line p-3.5 flex items-center gap-3">
          <span className="flex-1"><span className="block text-sm font-medium">Send this week’s now</span><span className="block text-xs text-[#737373] mt-0.5">{bouncedNow ? 'Monday’s copy never arrived' : 'Sends the latest copy straight away'}</span></span>
          <Switch checked={now} onChange={setNow} label="Send this week’s now" />
        </div>
        </SheetSection>
      </div>
    </Sheet>
  );
}

/* ======================= Occupancy report (F8 · 02–04) ======================= */
/* Hall rows come from the same figures as Inventory › Occupancy (data/occupancy.ts). */
type HallRow = HallOcc;
const HALL_ROWS: HallRow[] = HALL_OCC;
/** 2025/26 is archived: only its final week is kept, so no weekly detail and no arrivals. */
const ARCHIVE_ROWS: HallRow[] = HALL_OCC_2025;
const CURRENT = '2026/27';
/** Bar heights (px of a 180px plot) for in residence / arriving, as drawn in 3036:2. No screen keeps weekly history,
    so this is a seed curve; the chart rescales it so the last week lands on today's live occupancy. */
const WEEKS: { label: string; pct: number; res: number; arr: number }[] = [
  { label: '31 Aug', pct: 28, res: 42, arr: 14 }, { label: '7 Sep', pct: 41, res: 62, arr: 27 }, { label: '14 Sep', pct: 63, res: 95, arr: 33 },
  { label: '21 Sep', pct: 88, res: 132, arr: 9 }, { label: '28 Sep', pct: 94, res: 141, arr: 3 }, { label: '5 Oct', pct: 95, res: 143, arr: 2 },
];
const MAIN = 'occ-main';
const fmt = (n: number) => n.toLocaleString('en-GB');
/** Weekly rent per bed and the room type most often empty, per hall (ref 2061:285). */
/* No rent ledger per hall exists yet, so these weekly rents are a seed; Collingwood's is its Standard single rent in Inventory. */
const MONEY: Record<string, { rent: number; type: string }> = {
  ust: { rent: 189, type: 'Ensuite single' }, col: { rent: 182, type: 'Standard single' }, vm: { rent: 182, type: 'Standard single' },
  jb: { rent: 168, type: 'Ensuite single' }, stm: { rent: 204, type: 'Standard single' },
};
/** Weeks left on a 44-week tenancy from mid-September: what an empty bed loses if it stays empty. */
const WEEKS_LEFT = 42;
const gbp = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;
const gbpM = (n: number) => `£${(n / 1e6).toFixed(2)}m`;
const atRisk = (r: HallRow) => r.vac * MONEY[r.id].rent * WEEKS_LEFT;
const rentRoll = (r: HallRow) => (r.res + r.arr) * MONEY[r.id].rent * 44;

/* 3036:2: filter chips lead with a 14px gray-500 icon (calendar, building, calendar). */
function Chip({ value, onChange, options, label, icon }: { value: string; onChange: (v: string) => void; options: string[]; label: string; icon?: Icon }) {
  /* The dropdown trigger is w-full, which beats a width passed to it; a shrink-0 wrapper lets the chip hug its text. */
  return <div className="shrink-0"><Dropdown icon={icon} value={value} onChange={onChange} options={options.map((o) => ({ value: o, label: o }))} ariaLabel={label}
    className="h-7 border-line shadow-tile text-xs font-medium" /></div>;
}

export function OccupancyReport() {
  const nav = useNavigate();
  const props = useInv((s) => s.properties);
  const openHall = (id: string) => nav(props.some((p) => p.id === id) ? `/inventory/properties?open=${id}` : '/inventory/occupancy');
  const schedules = useWorkspace((s) => s.schedules);
  const [year, setYear] = useState('2026/27');
  const [hall, setHall] = useState('All halls');
  const [by, setBy] = useState('By week');
  const [sheet, setSheet] = useState(false);
  const exportOnce = useOnceFor(1000);
  /* A schedule sends the view you're looking at: each hall + grouping is its own schedule. */
  const viewId = hall === 'All halls' && by === 'By week' ? MAIN : `occ-${hall}-${by}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const mine = schedules.find((s) => s.id === viewId);
  if (useEmpty.getState().on) return <NoReportData icon={ChartBar} title="Occupancy" />;
  const archived = year !== CURRENT;
  const view = archived ? 'By hall' : by;
  const pick = (src: HallRow[]) => (hall === 'All halls' ? src : src.filter((r) => r.hall === hall));
  const total = (rs: HallRow[]) => rs.reduce((a, r) => ({ beds: a.beds + r.beds, res: a.res + r.res, arr: a.arr + r.arr, vac: a.vac + r.vac, blk: a.blk + r.blk, risk: a.risk + atRisk(r), roll: a.roll + rentRoll(r) }), { beds: 0, res: 0, arr: 0, vac: 0, blk: 0, risk: 0, roll: 0 });
  const rows = pick(archived ? ARCHIVE_ROWS : HALL_ROWS);
  const t = total(rows);
  const voids = [...rows].filter((r) => r.vac > 0).sort((a, b) => atRisk(b) - atRisk(a));
  /* One definition everywhere: occupancy = beds let (in residence + arriving) ÷ beds. */
  const pct = (r: { res: number; arr: number; beds: number }) => Math.round(((r.res + r.arr) / r.beds) * 100);
  const occ = pct(t);
  const lastYear = pct(total(pick(ARCHIVE_ROWS)));
  /* Weekly detail exists for all halls; one hall's weeks follow the same curve, ending at its own occupancy. */
  const k = occ / WEEKS[WEEKS.length - 1].pct;
  const bars = view === 'By week' ? WEEKS.map((w) => ({ ...w, pct: Math.min(100, Math.round(w.pct * k)), res: w.res * k, arr: w.arr * k })) : rows.map((r) => ({ label: r.hall, pct: pct(r), res: (r.res / r.beds) * 150, arr: (r.arr / r.beds) * 150 }));
  const diff = occ - lastYear;

  return (
    <>
      <Header icon={ChartBar} crumbs={crumbs} title="Occupancy">
        <Button icon={DownloadSimple} onClick={() => exportOnce(() => toast.success('Occupancy.csv downloaded', { description: `${rows.length} ${rows.length === 1 ? 'hall' : 'halls'} · ${year} · ${view.toLowerCase()}` }))}>Export CSV</Button>
        {mine ? <Button icon={Clock} onClick={() => setSheet(true)}>Every {mine.day === '1st' ? '1st of the month' : mine.day} {mine.time}</Button>
          : <Button variant="primary" icon={Clock} onClick={() => setSheet(true)}>Schedule</Button>}
      </Header>
      <Toolbar right={<span className="text-xs text-[#737373] whitespace-nowrap shrink-0">Updated 5 min ago</span>}>
        <Chip icon={CalendarBlank} label="Academic year" value={year} onChange={setYear} options={[CURRENT, '2025/26']} />
        <Chip icon={Buildings} label="Halls" value={hall} onChange={setHall} options={['All halls', ...HALL_ROWS.map((r) => r.hall)]} />
        <Chip icon={CalendarBlank} label="Group by" value={view} onChange={setBy} options={archived ? ['By hall'] : ['By week', 'By hall']} />
        {archived && <span className="text-xs text-[#737373] whitespace-nowrap">Archived · final week only</span>}
      </Toolbar>
      <div className="flex-1 overflow-auto p-5 space-y-4">
        <StatStrip items={[
          { label: 'Occupancy', value: `${occ}%`, sub: archived ? `Final week of ${year}` : `${diff >= 0 ? '+' : '−'}${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'pt' : 'pts'} vs 2025/26` },
          { label: 'Rent roll', value: gbpM(t.roll), sub: `${fmt(t.res + t.arr)} beds let · ${year}` },
          { label: archived ? 'Void beds at year end' : 'Void beds today', value: fmt(t.vac), color: '#F97316', sub: archived ? 'the year has ended' : `${gbp(t.risk)} rent at risk` },
          { label: 'Held units', value: fmt(t.blk), sub: 'excluded from occupancy' },
          { label: 'Avg days void', value: archived ? '—' : '11.6', sub: archived ? 'kept for the current year only' : 'from release to re-let' },
        ]} />
        <div className="grid grid-cols-[minmax(0,1fr)_460px] gap-4">
        <div className="rounded-xl border border-line bg-white p-4 min-w-0">
          <div className="flex items-center"><h2 className="text-sm font-semibold">{view === 'By week' ? 'Beds filled by week' : 'Beds filled by hall'}</h2>
            <span className="ml-auto flex items-center gap-4 text-xs text-[#737373]"><span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-[#2563EB]" />In residence</span><span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-[#93C5FD]" />Arriving</span></span></div>
          <div className="mt-4 h-[180px] border-b border-line flex items-end justify-around px-6">
            {bars.map((b) => (
              <div key={b.label} className="flex flex-col items-center w-11">
                <span className="text-xs font-medium mb-1.5">{b.pct}%</span>
                <div className="w-11 rounded-t-md bg-[#93C5FD]" style={{ height: b.arr }} />
                <div className="w-11 bg-[#2563EB]" style={{ height: b.res }} />
              </div>
            ))}
          </div>
          <div className="flex justify-around px-6 mt-2">{bars.map((b) => <span key={b.label} className="w-11 text-center text-xs text-[#737373] whitespace-nowrap">{b.label}</span>)}</div>
        </div>
        <div className="rounded-xl border border-line bg-white overflow-hidden flex flex-col">
          <div className="h-12 px-4 flex items-center border-b border-line"><h2 className="text-sm font-semibold">Voids by property</h2>{!archived && <span className="ml-auto text-xs text-[#737373]">{WEEKS_LEFT} weeks left on the tenancy</span>}</div>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-[#737373] border-b border-line bg-[#FAFAFA]">
              <th className="text-left font-medium h-9 pl-4">Property</th><th className="text-right font-medium px-3">Void beds</th><th className="text-left font-medium px-3">Most void type</th><th className="text-right font-medium pr-4">{archived ? 'Rent lost' : 'Rent at risk'}</th>
            </tr></thead>
            <tbody>{voids.map((r) => (
              <tr key={r.id} className="border-b border-[#F5F5F5] last:border-0 hover:bg-[#FAFAFA] cursor-pointer" onClick={() => openHall(r.id)}>
                <td className="h-10 pl-4 font-medium">{r.hall}</td>
                <td className="text-right px-3 tabular-nums">{r.vac}</td>
                <td className="px-3 text-[#737373]">{MONEY[r.id].type}</td>
                <td className="text-right pr-4 font-semibold tabular-nums">{gbp(atRisk(r))}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        </div>
        <div className="rounded-xl border border-line bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-xs font-medium text-[#737373] border-b border-line">
              <th className="text-left font-medium h-9 pl-5">Hall</th>{['Beds', 'In residence', 'Arriving', 'Vacant', 'Blocked', 'Rent roll', 'Rent at risk'].map((h) => <th key={h} className="text-right font-medium px-3">{h}</th>)}<th className="text-left font-medium pl-8 pr-5 w-[220px]">Filled</th>
            </tr></thead>
            <tbody>{rows.map((r) => { const p = pct(r); return (
              <tr key={r.id} className="border-b border-[#F5F5F5] last:border-0 hover:bg-[#FAFAFA] cursor-pointer" onClick={() => openHall(r.id)}>
                <td className="h-10 pl-5 font-medium">{r.hall}</td>
                {[r.beds, r.res, r.arr, r.vac, r.blk].map((v, i) => <td key={i} className="text-right px-3 tabular-nums">{fmt(v)}</td>)}
                <td className="text-right px-3 tabular-nums">{gbpM(rentRoll(r))}</td>
                <td className="text-right px-3 tabular-nums text-[#B91C1C]">{gbp(atRisk(r))}</td>
                <td className="pl-8 pr-5"><span className="flex items-center gap-2"><span className="w-[107px] h-1.5 rounded-full bg-[#F5F5F5] overflow-hidden"><span className="block h-full rounded-full bg-[#0B8A4C]" style={{ width: `${p}%` }} /></span><span className="text-xs text-[#737373]">{p}%</span></span></td>
              </tr>
            ); })}</tbody>
          </table>
        </div>
      </div>
      {sheet && <ScheduleSheet id={viewId} hall={hall} by={view} existing={mine} onClose={() => setSheet(false)} />}
    </>
  );
}

const DEFAULT_RECIPIENTS: Recipient[] = [
  { id: 'r1', name: 'Priya Shah', sub: 'You', count: 1 },
  { id: 'r2', name: 'James Reed', sub: 'Finance', count: 1 },
  { id: 'r3', name: 'Heads of college', sub: '5 people · group', count: 5 },
];

/** F8 · 03: schedule the occupancy report. */
function ScheduleSheet({ id, hall, by, existing, onClose }: { id: string; hall: string; by: string; existing?: Schedule; onClose: () => void }) {
  const { set } = useWorkspace();
  const what = `Occupancy · ${hall === 'All halls' ? 'all halls' : hall} · ${by.toLowerCase()}`;
  const [err, setErr] = useState('');
  const people = useDb((s) => s.people);
  const [day, setDay] = useState(existing?.day ?? 'Monday');
  const [time, setTime] = useState(existing?.time ?? '08:00');
  const [rec, setRec] = useState<Recipient[]>(existing?.recipients ?? DEFAULT_RECIPIENTS);
  const [fmts, setFmts] = useState(existing?.formats ?? { pdf: true, csv: true });
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const busy = useRef(false);
  const total = rec.reduce((a, r) => a + r.count, 0);
  const sugg = useMemo(() => {
    const t = q.trim().toLowerCase();
    const groups: Recipient[] = [{ id: 'g-wardens', name: 'Hall wardens', sub: '4 people · group', count: 4 }, { id: 'g-estates', name: 'Estates', sub: '3 people · group', count: 3 }];
    const ps: Recipient[] = people.map((p) => ({ id: p.id, name: p.name, sub: p.role, count: 1 }));
    /* Hide anyone already on the list, by id or by name ("Priya Shah" is also "You"). */
    return [...groups, ...ps].filter((r) => !rec.some((x) => x.id === r.id || x.name === r.name) && (!t || r.name.toLowerCase().includes(t))).slice(0, 5);
  }, [q, people, rec]);
  const add = (r: Recipient) => { setRec([...rec, r]); setQ(''); setErr(''); setAdding(false); };
  const enter = () => {
    const v = q.trim();
    if (!v) return;
    if (v.includes('@')) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setErr('Enter a full email address, like name@durham.ac.uk'); return; }
      if (rec.some((x) => x.email?.toLowerCase() === v.toLowerCase())) { setErr(`${v} is already on the list`); return; }
      add({ id: wid('e'), name: v, sub: 'Email', count: 1, email: v }); return;
    }
    if (sugg[0]) add(sugg[0]); else setErr(`No one called “${v}”. Use their email address instead.`);
  };
  const save = () => {
    if (busy.current) return;
    if (!rec.length) { toast.error('Add at least one recipient'); return; }
    if (!fmts.pdf && !fmts.csv) { toast.error('Pick a format'); return; }
    busy.current = true;
    const u = scheduleUndo();
    const s: Schedule = { id, reportId: 'occupancy', name: what.replace(' · by week', ''), sendsTo: `${total} ${total === 1 ? 'person' : 'people'}`, recipients: rec, day, time, lastSend: 'Not sent yet', formats: fmts };
    set('schedules', (ss) => (ss.some((x) => x.id === id) ? ss.map((x) => (x.id === id ? s : x)) : [...ss, s]));
    onClose();
    toast.success(`${s.name} scheduled · every ${day === '1st' ? '1st of the month' : day} ${time} · ${s.sendsTo}`, { action: { label: 'Undo', onClick: u.arm() } });
  };
  const stop = () => {
    const u = scheduleUndo();
    set('schedules', (ss) => ss.filter((x) => x.id !== id)); onClose();
    toast.success(`${existing?.name ?? 'Occupancy'} won’t be sent any more`, { action: { label: 'Undo', onClick: u.arm() } });
  };
  return (
    <Sheet open onClose={onClose} width={500}
      title="Schedule this report" sub={what}
      footer={<>{existing && <Button variant="danger-ghost" className="mr-auto" onClick={stop}>Stop sending</Button>}<Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{existing ? 'Save' : 'Schedule'}</Button></>}>
      <div className="[&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">
        <SheetSection title="When">
        <div className="grid grid-cols-2 gap-3">
          <div><div className="text-sm font-medium mb-1.5">Every</div><IconSelect ariaLabel="Every" icon={CalendarBlank} value={day} onChange={setDay} options={[...DAYS.map((d) => ({ value: d, label: d })), { value: '1st', label: '1st of the month' }]} /></div>
          <div><div className="text-sm font-medium mb-1.5">At</div><IconSelect ariaLabel="At" icon={Clock} value={time} onChange={setTime} options={TIMES.map((t) => ({ value: t, label: t }))} /></div>
        </div>
        </SheetSection>
        <SheetSection title="Send to">
          <div className="rounded-[10px] border border-line px-3 py-1">
            {rec.map((r) => (
              <div key={r.id} className="group h-8 flex items-center gap-2.5">
                {r.count > 1 ? <span className="size-6 rounded-full bg-[#F5F5F5] flex items-center justify-center"><UsersThree size={12} className="text-[#737373]" /></span> : <Avatar name={r.name} size={24} />}
                <span className="text-sm font-medium flex-1">{r.name}</span>
                <span className="text-xs text-[#737373]">{r.sub}</span>
                {r.sub !== 'You' && <button type="button" onClick={() => setRec(rec.filter((x) => x.id !== r.id))} className="text-xs text-gray-400 hover:text-[#E0243A] opacity-0 group-hover:opacity-100 focus:opacity-100">Remove</button>}
              </div>
            ))}
            {adding ? (
              <div className="py-1.5 relative">
                <Input value={q} aria-label="Add people or a group" aria-invalid={!!err || undefined} onChange={(e) => { setQ(e.target.value); setErr(''); }} placeholder="Name, group or email" onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); enter(); }
                  if (e.key === 'Escape') setAdding(false);
                }} ref={(el) => el?.focus()} />
                {err && <p role="alert" className="text-xs text-[#C11F14] mt-1.5">{err}</p>}
                {sugg.length > 0 && <div className="mt-1 rounded-lg border border-line divide-y divide-line">{sugg.map((r) => <button key={r.id} type="button" onClick={() => add(r)} className="w-full h-8 px-2.5 flex items-center gap-2 text-left text-sm hover:bg-gray-50">{r.name}<span className="ml-auto text-xs text-[#737373]">{r.sub}</span></button>)}</div>}
              </div>
            ) : <button type="button" onClick={() => setAdding(true)} className="h-8 flex items-center gap-2 text-sm text-primary"><Plus size={13} />Add people or a group</button>}
          </div>
          <div className="mt-3 rounded-lg border border-primary/30 p-3 flex gap-2.5"><Info size={16} className="text-primary shrink-0 mt-0.5" />
            <div><div className="text-sm font-medium text-primary">Recipients only see halls they have access to</div><div className="text-xs text-[#737373] mt-0.5">Heads of college get their own college’s rows.</div></div></div>
        </SheetSection>
        <SheetSection title="Format">
          <div className="grid grid-cols-2 gap-2">
            {([['pdf', 'PDF summary'], ['csv', 'CSV data']] as const).map(([k, l]) => (
              <div key={k} className="h-10 rounded-[10px] border border-line px-3 flex items-center gap-2"><DownloadSimple size={14} className="text-[#737373]" /><span className="text-sm font-medium flex-1">{l}</span><Switch checked={fmts[k]} onChange={(v) => setFmts({ ...fmts, [k]: v })} label={l} /></div>
            ))}
          </div>
        </SheetSection>
      </div>
    </Sheet>
  );
}

/* ======================= Applications funnel ======================= */
export function ApplicationsReport() {
  const d = useAlloc();
  const [cycle, setCycle] = useState('2027/28');
  const exportOnce = useOnceFor(1000);
  if (useEmpty.getState().on || !d.apps.length) return <NoReportData icon={FunnelIcon} title="Applications funnel" />;
  /* The live cycle counts the same rows as Allocations › Applications and Offers; a closed cycle uses its totals
     from Allocations › Cycles (every application in it was reviewed; offers went to the allocated ones). */
  const live = d.cycles.find((c) => c.status === 'open')?.name ?? '2027/28';
  const f = (() => {
    if (cycle === live) {
      const ac = appCounts(d), oc = offerCounts(d);
      return { applied: ac.all, reviewed: ac.all - ac.review, offered: oc.open + oc.accepted + oc.declined + oc.lapsed, accepted: oc.accepted };
    }
    const c = d.cycles.find((x) => x.name === cycle);
    return { applied: c?.apps ?? 0, reviewed: c?.apps ?? 0, offered: c?.allocated ?? 0, accepted: c?.accepted ?? c?.allocated ?? 0 };
  })();
  const stages = [
    ['Applied', f.applied, '#2563EB'], ['Reviewed', f.reviewed, '#7E22CE'], ['Offered', f.offered, '#F59E0B'], ['Accepted', f.accepted, '#087A43'],
  ] as const;
  return (
    <>
      <Header icon={FunnelIcon} crumbs={crumbs} title="Applications funnel">
        <Button icon={DownloadSimple} onClick={() => exportOnce(() => toast.success('Applications funnel.csv downloaded'))}>Export CSV</Button>
        <Button icon={ShareNetwork} onClick={() => { void navigator.clipboard?.writeText(location.href).catch(() => {}); toast.success('Link copied', { description: 'People see only the halls they have access to.' }); }}>Share</Button>
      </Header>
      <Toolbar right={<span className="text-xs text-[#737373] whitespace-nowrap shrink-0">Updated 5 min ago</span>}>
        <Chip label="Cycle" value={cycle} onChange={setCycle} options={['2027/28', '2026/27']} />
      </Toolbar>
      <div className="flex-1 overflow-auto p-5 space-y-4">
        {/* Each stage keeps its chart colour on the bar. £182 a week is the seed average rent (Collingwood's Standard single). */}
        <StatStrip items={[...stages.map(([l, n, c]) => ({ label: l, value: fmt(n), color: c })), { label: 'Rent booked', value: gbpM(f.accepted * 182 * 44), sub: 'accepted × 44 weeks' }]} />
        <div className="rounded-xl border border-line bg-white p-5">
          <h2 className="text-sm font-semibold mb-4">From application to booking · {cycle} cycle</h2>
          <div className="space-y-3">
            {stages.map(([label, n, c]) => (
              <div key={label} className="grid grid-cols-[110px_1fr_60px] items-center gap-4 text-sm">
                <span className="font-medium">{label}</span>
                <div className="h-7 rounded-md bg-[#F5F5F5] overflow-hidden"><div className="h-full rounded-md" style={{ width: `${stages[0][1] ? (n / stages[0][1]) * 100 : 0}%`, background: c }} /></div>
                <span className="text-right font-semibold tabular-nums">{stages[0][1] ? Math.round((n / stages[0][1]) * 100) : 0}%</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#737373] mt-5">Median time from application to offer: 6 days. Target: 5.</p>
        </div>
      </div>
    </>
  );
}

/* ======================= The other library reports ======================= */
type Simple = { title: string; tiles: [string, string, string?, string?][]; cols: string[]; rows: (string | number)[][] };
/* The figures these reports had before they were derived; kept only as a fallback shape. Live builders below replace them. */
const SIMPLE: Record<string, Simple> = {
  rent: { title: 'Rent and arrears', tiles: [['Billed', '£4.12m', undefined, 'Michaelmas term'], ['Collected', '£3.86m', '#087A43', '94% of billed'], ['Overdue', '£61,240', '#E0243A', '£1,612 average'], ['Residents in arrears', '38', '#C2410C', '9 over 30 days']], cols: ['Hall', 'Billed', 'Collected', 'Overdue', 'In arrears'],
    rows: [['Ustinov', '£1.09m', '£1.01m', '£22,180', 14], ['Collingwood', '£0.92m', '£0.88m', '£9,460', 6], ['Van Mildert', '£1.06m', '£0.99m', '£18,120', 11], ['Josephine Butler', '£0.79m', '£0.74m', '£8,980', 5], ["St Mary’s", '£0.26m', '£0.24m', '£2,500', 2]] },
  'maintenance-sla': { title: 'Maintenance deadlines', tiles: [['Jobs closed', '412'], ['On time', '91%', '#087A43', '+3 pts vs last term'], ['Open and overdue', '9', '#E0243A'], ['Cost', '£18,640', undefined, '£45 a job']], cols: ['Hall', 'Jobs', 'On time', 'Median fix', 'Cost'],
    rows: [['Ustinov', 121, '88%', '2.1 days', '£5,980'], ['Collingwood', 84, '94%', '1.4 days', '£3,410'], ['Van Mildert', 97, '90%', '1.9 days', '£4,720'], ['Josephine Butler', 78, '93%', '1.6 days', '£3,220'], ["St Mary’s", 32, '97%', '1.1 days', '£1,310']] },
  requests: { title: 'Requests', tiles: [['Requests', '286'], ['Answered in 2 days', '84%', '#087A43'], ['Waiting', '6', '#C2410C'], ['Most asked', 'Room swap']], cols: ['Kind', 'Requests', 'Approved', 'Median reply'],
    rows: [['Room swap', 112, '61%', '1.8 days'], ['Early arrival', 74, '89%', '0.9 days'], ['Guest stay', 63, '95%', '0.6 days'], ['Lease change', 37, '46%', '3.2 days']] },
  'notice-reach': { title: 'Notice reach', tiles: [['Notices sent', '18'], ['Delivered', '99%', '#087A43'], ['Opened', '72%', '#1F45E0'], ['Clicked', '31%']], cols: ['Notice', 'Sent', 'Delivered', 'Opened', 'Clicked'],
    rows: [['Fire alarm test, Thursday', '10 Sep', '1,876', '81%', '12%'], ['Welcome week timetable', '7 Sep', '2,098', '77%', '46%'], ['Rent due for Michaelmas', '1 Sep', '2,203', '69%', '38%'], ['Water off in Fenwick Block', '28 Aug', '47', '91%', '4%']] },
};

/* ---- Derived from the screens that own the data ---- */
const pctS = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : '—');
const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const hallOfFault = (f: Fault) => f.where.split(' · ')[0];
const hallKey = (h: string) => h.replace(/ College$/, '').replace("'", '’');
/** "1d 2h", "19h 08m", "6h" → hours. */
const hoursOf = (s?: string) => { if (!s) return null; const d = /(\d+)d/.exec(s), h = /(\d+)h/.exec(s), m = /(\d+)m/.exec(s); return (d ? +d[1] * 24 : 0) + (h ? +h[1] : 0) + (m ? +m[1] / 60 : 0); };
/* Deadlines by priority, as Residents › Maintenance sets them on a new job. */
const SLA_H: Record<string, number> = { Urgent: 24, High: 48, Normal: 120 };
/* No job-cost ledger exists yet: a seed average per closed job. */
const COST_PER_JOB = 45;
/* No billing ledger exists yet: overdue rent and residents in arrears per hall are a seed. Billed is live:
   beds let (Inventory › Occupancy) × weekly rent × Michaelmas weeks (Settings › Academic year). */
const OVERDUE: Record<string, [number, number]> = { ust: [22180, 14], col: [9460, 6], vm: [18120, 11], jb: [8980, 5], stm: [2500, 2] };

function useLiveSimple(id: string): Simple | undefined {
  const faults = useRms((s) => s.faults);
  const requests = useRms((s) => s.requests);
  const notices = useRms((s) => s.notices);
  const terms = useWorkspace((s) => s.terms);
  if (id === 'rent') {
    const weeks = terms[0]?.weeks ?? 10;
    const rows = HALL_OCC.map((h) => { const billed = (h.res + h.arr) * MONEY[h.id].rent * weeks; const [over, n] = OVERDUE[h.id]; return { h, billed, coll: billed - over, over, n }; });
    const t = rows.reduce((a, r) => ({ billed: a.billed + r.billed, coll: a.coll + r.coll, over: a.over + r.over, n: a.n + r.n }), { billed: 0, coll: 0, over: 0, n: 0 });
    return { title: 'Rent and arrears', tiles: [['Billed', gbpM(t.billed), undefined, `${terms[0]?.name ?? 'Michaelmas'} term`], ['Collected', gbpM(t.coll), '#087A43', `${pctS(t.coll, t.billed)} of billed`], ['Overdue', gbp(t.over), '#E0243A', `${gbp(t.n ? t.over / t.n : 0)} average`], ['Residents in arrears', fmt(t.n), '#C2410C']],
      cols: ['Hall', 'Billed', 'Collected', 'Overdue', 'In arrears'], rows: rows.map((r) => [r.h.hall, gbpM(r.billed), gbpM(r.coll), gbp(r.over), r.n]) };
  }
  if (id === 'maintenance-sla') {
    const fixed = faults.filter((f) => f.status === 'Fixed');
    const onTime = (f: Fault) => (hoursOf(f.fixedIn) ?? 0) <= SLA_H[f.priority];
    /* Same rule as the Overdue filter in Residents › Maintenance. */
    const overdue = faults.filter((f) => f.slaMins < 0 && f.status !== 'Waiting on parts' && f.status !== 'Fixed').length;
    const halls = HALL_OCC.map((h) => {
      const mine = faults.filter((f) => hallKey(hallOfFault(f)) === h.hall), done = mine.filter((f) => f.status === 'Fixed');
      const med = median(done.map((f) => hoursOf(f.fixedIn) ?? 0));
      return [h.hall, mine.length, pctS(done.filter(onTime).length, done.length), med === null ? '—' : med >= 24 ? `${(med / 24).toFixed(1)} days` : `${Math.round(med)} h`, gbp(done.length * COST_PER_JOB)];
    });
    return { title: 'Maintenance deadlines', tiles: [['Jobs closed', fmt(fixed.length)], ['On time', pctS(fixed.filter(onTime).length, fixed.length), '#087A43', 'fixed within the deadline'], ['Open and overdue', fmt(overdue), '#E0243A'], ['Cost', gbp(fixed.length * COST_PER_JOB), undefined, `£${COST_PER_JOB} a job`]],
      cols: ['Hall', 'Jobs', 'On time', 'Median fix', 'Cost'], rows: halls };
  }
  if (id === 'requests') {
    const kinds = [...new Set(requests.map((r) => r.kind))].sort((a, b) => requests.filter((r) => r.kind === b).length - requests.filter((r) => r.kind === a).length);
    const decided = (rs: typeof requests) => rs.filter((r) => r.status === 'Approved' || r.status === 'Declined');
    const waiting = requests.filter((r) => r.status === 'Open' || r.status === 'Waiting on resident');
    return { title: 'Requests', tiles: [['Requests', fmt(requests.length)], ['Approved', pctS(requests.filter((r) => r.status === 'Approved').length, decided(requests).length), '#087A43', 'of decided requests'], ['Waiting', fmt(waiting.length), '#C2410C'], ['Most asked', kinds[0] ?? '—']],
      cols: ['Kind', 'Requests', 'Approved', 'Median wait'],
      rows: kinds.map((k) => { const rs = requests.filter((r) => r.kind === k); const w = median(rs.filter((r) => r.status === 'Open' || r.status === 'Waiting on resident').map((r) => r.waitDays)); return [k, rs.length, pctS(rs.filter((r) => r.status === 'Approved').length, decided(rs).length), w === null ? '—' : `${w} ${w === 1 ? 'day' : 'days'}`]; }) };
  }
  if (id === 'notice-reach') {
    const sent = notices.filter((n) => n.status === 'Sent');
    const reach = sent.reduce((a, n) => a + n.count, 0);
    const opened = sent.reduce((a, n) => a + n.count * (n.opened ?? 0), 0) / (reach || 1);
    return { title: 'Notice reach', tiles: [['Notices sent', fmt(sent.length)], ['Recipients', fmt(reach)], ['Opened', `${Math.round(opened)}%`, '#1F45E0'], ['Scheduled', fmt(notices.filter((n) => n.status === 'Scheduled').length)]],
      cols: ['Notice', 'Sent', 'Recipients', 'Opened'], rows: sent.map((n) => [n.title, (n.when ?? '').split(',')[0], fmt(n.count), n.opened === undefined ? '—' : `${n.opened}%`]) };
  }
  return undefined;
}

export function SimpleReport() {
  const { id = '' } = useParams();
  const live = useLiveSimple(id);
  const r = live ?? SIMPLE[id];
  const def = REPORTS.find((x) => x.to === `/reports/${id}`);
  if (!r) return <><Header icon={ChartBar} crumbs={crumbs} title="Report not found" /><div className="p-6 text-sm text-[#737373]">There’s no report here. Pick one from the library.</div></>;
  const I = (def && AREA_ICON[def.id]) ?? ChartBar;
  if (useEmpty.getState().on) return <NoReportData icon={I} title={r.title} />;
  return (
    <>
      <Header icon={I} crumbs={crumbs} title={r.title}>
        <Button icon={DownloadSimple} onClick={() => toast.success(`${r.title}.csv downloaded`)}>Export CSV</Button>
        <Button variant="primary" icon={CalendarBlank} onClick={() => toast('Scheduling is set up on Occupancy in the prototype', { description: 'Open Occupancy and choose Schedule.' })}>Schedule</Button>
      </Header>
      <Toolbar right={<span className="text-xs text-[#737373] whitespace-nowrap shrink-0">Updated 5 min ago</span>}><Chip label="Academic year" value="2026/27" onChange={() => {}} options={['2026/27']} /><Chip label="Halls" value="All halls" onChange={() => {}} options={['All halls']} /></Toolbar>
      <div className="flex-1 overflow-auto p-5 space-y-4">
        <StatStrip items={r.tiles.map(([l, v, c, sub]) => ({ label: l, value: v, color: c, sub }))} />
        <div className="rounded-xl border border-line bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-[#737373] border-b border-line">{r.cols.map((c, i) => <th key={c} className={cx('font-medium h-9 px-3', i === 0 ? 'text-left pl-5' : 'text-right', i === r.cols.length - 1 && 'pr-5')}>{c}</th>)}</tr></thead>
            <tbody>{r.rows.map((row) => <tr key={String(row[0])} className="border-b border-[#F5F5F5] last:border-0">{row.map((v, i) => <td key={i} className={cx('h-10 px-3 tabular-nums', i === 0 ? 'pl-5 font-medium' : 'text-right', i === row.length - 1 && 'pr-5')}>{v}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}
