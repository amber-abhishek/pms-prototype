// Workspace › Reports. Figma Flow 8 (3035–3038), empty 3130:2, E4 report bounces (3236, 3238, 3239).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Bed, Buildings, CalendarBlank, ChartBar, ChatCircleText, Clock, CurrencyGbp, DownloadSimple, EnvelopeSimple, Funnel as FunnelIcon, Megaphone, Plus,
  ShareNetwork, Info, UsersThree, Warning, Wrench, type Icon,
} from '../../components/icons';
import { toast } from 'sonner';
import { Avatar, Button, Dropdown, FilterButton, Input, Pill, Sheet, Switch, Table, Toolbar, cx, pressCard } from '../../components/ui';
import { useTab } from '../hooks';
import { useDb } from '../../data/store';
import { REPORTS, badgeLabel, useWorkspace, whenLabel, wid, type Recipient, type ReportDef, type Schedule } from '../../data/workspace';
import { Alert, EmptyState, Header, IconSelect, RowMenu } from '../org/parts';

const AREA_ICON: Record<string, Icon> = { occupancy: Bed, applications: FunnelIcon, rent: CurrencyGbp, sla: Wrench, requests: ChatCircleText, notices: Megaphone };
const LIB = '/reports/library';
const crumbs = [{ label: 'Reports', to: LIB }];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMES = ['07:00', '08:00', '09:00', '12:00', '17:00', '18:00'];

/* ======================= Library / Scheduled / Shared ======================= */
type LibTab = 'library' | 'scheduled' | 'shared';
export function ReportsLibrary() {
  const nav = useNavigate();
  const schedules = useWorkspace((s) => s.schedules);
  const [tab, setTab] = useTab<LibTab>('library');
  const [f, setF] = useState<Record<string, string>>({});
  const [fix, setFix] = useState<Schedule | null>(null);
  const list = REPORTS.filter((r) => !f.area || r.area === f.area);
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
      {tab === 'library' && <Toolbar right={<FilterButton value={f} onChange={setF} defs={[{ id: 'area', label: 'Area', options: ['Inventory', 'Allocations', 'Finance', 'Maintenance', 'Residents'] }]} />} />}
      {tab === 'library' && (
        <div className="flex-1 overflow-auto p-5">
          <div className="grid grid-cols-3 gap-4">
            {list.map((r) => <ReportCard key={r.id} r={r} badge={schedules.find((s) => s.reportId === r.id)} onOpen={() => nav(r.to)} />)}
          </div>
        </div>
      )}
      {tab === 'scheduled' && (schedules.length === 0 ? (
        <div className="flex-1 overflow-auto flex items-center justify-center">
          <EmptyState icon={CalendarBlank} title="Nothing scheduled" sub="Open any report and choose Schedule to email it on a day and time. Recipients don’t need a PMS account.">
            <Button variant="primary" onClick={() => setTab('library')}>Browse the library</Button>
          </EmptyState>
        </div>
      ) : <ScheduledList onFix={setFix} />)}
      {tab === 'shared' && (
        <Table rows={[{ id: 'sh1' }]} onRow={() => nav('/reports')} summary="1 report shared with you" cols={[
          { key: 'r', label: 'Report', render: () => <span className="flex items-center gap-2.5"><span className="size-7 rounded-lg bg-[#DBEAFE] flex items-center justify-center"><Bed size={14} className="text-[#2563EB]" /></span><span className="text-sm font-medium">Arrivals this week · Collingwood</span></span> },
          { key: 'b', label: 'Shared by', render: () => <span className="flex items-center gap-2 text-sm"><Avatar name="Tom Baker" size={20} />Tom Baker</span> },
          { key: 'f', label: 'From', render: () => <span className="text-sm text-[#646A78]">Occupancy</span> },
          { key: 'w', label: 'Shared', render: () => <span className="text-sm text-[#646A78]">12 Sep</span> },
        ]} />
      )}
      {fix && <RecipientSheet key={fix.id} s={fix} onClose={() => setFix(null)} />}
    </>
  );
}

function ReportCard({ r, badge, onOpen }: { r: ReportDef; badge?: Schedule; onOpen: () => void }) {
  const I = AREA_ICON[r.id] ?? ChartBar;
  return (
    <button type="button" onClick={onOpen} className={cx('text-left rounded-xl border border-line bg-white p-4 shadow-tile', pressCard)}>
      <div className="flex items-start gap-2.5">
        <span className="size-8 rounded-lg bg-[#DBEAFE] flex items-center justify-center shrink-0"><I size={16} className="text-[#2563EB]" /></span>
        <span className="flex-1 min-w-0 leading-tight"><span className="block text-sm font-semibold">{r.name}</span><span className="block text-xs text-[#646A78] mt-0.5">{r.area}</span></span>
        {badge && <Pill tone="green" icon={Clock}>{badgeLabel(badge)}</Pill>}
      </div>
      <p className="text-xs text-[#646A78] mt-3 truncate">{r.desc}</p>
    </button>
  );
}

function ScheduledList({ onFix }: { onFix: (s: Schedule) => void }) {
  const { schedules, set, restore } = useWorkspace();
  const nav = useNavigate();
  const bounced = schedules.filter((s) => s.lastSend === 'Not delivered');
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {bounced.map((s) => (
        <div key={s.id} className="px-5 pt-4">
          <Alert tone="red" icon={Warning} title={`${s.sendsTo} bounced on ${s.bounced ?? 'Mon 08:00'}`} action={<Button size="sm" onClick={() => onFix(s)}>Change recipient</Button>}>
            The mailbox no longer exists. Pick a new recipient; the report is kept in Reports meanwhile.
          </Alert>
        </div>
      ))}
      <div className={cx('flex-1 min-h-0 flex flex-col', bounced.length && 'mt-4 border-t border-line')}>
        <Table rows={schedules} onRow={onFix} summary={`${schedules.length} scheduled · recipients only see halls they have access to`} cols={[
          { key: 'r', label: 'Report', className: 'w-[26%]', render: (s) => <span className="text-sm font-medium">{s.name}</span> },
          { key: 't', label: 'Sends to', render: (s) => <span className="text-sm text-gray-700">{s.sendsTo}</span> },
          { key: 'w', label: 'When', render: (s) => <span className="text-sm text-gray-700">{whenLabel(s)}</span> },
          { key: 'l', label: 'Last send', render: (s) => s.lastSend === 'Delivered' ? <Pill tone="green" icon={EnvelopeSimple}>Delivered</Pill> : s.lastSend === 'Not delivered' ? <Pill tone="red" icon={Warning}>Not delivered</Pill> : <Pill tone="grey">Not sent yet</Pill> },
          { key: 'x', label: '', className: 'w-12 text-right', render: (s) => <RowMenu items={[
            { label: 'Edit schedule', onClick: () => onFix(s) },
            { label: 'Open report', onClick: () => nav(REPORTS.find((r) => r.id === s.reportId)?.to ?? '/reports') },
            { label: 'Send now', onClick: () => { set('schedules', (ss) => ss.map((x) => (x.id === s.id && x.lastSend !== 'Not delivered' ? { ...x, lastSend: 'Delivered' as const } : x))); if (s.lastSend === 'Not delivered') onFix(s); else toast.success(`${s.name} sent to ${s.sendsTo}`); } },
            { label: 'Stop sending', danger: true, onClick: () => { const before = useWorkspace.getState().schedules; set('schedules', (ss) => ss.filter((x) => x.id !== s.id)); toast.success(`${s.name} won’t be sent any more`, { action: { label: 'Undo', onClick: () => restore({ schedules: before }) } }); } },
          ]} /> },
        ]} />
      </div>
    </div>
  );
}

/** E4 · 02: change a bounced schedule's recipient and send this week's copy. Also the general schedule editor from the list. */
function RecipientSheet({ s, onClose }: { s: Schedule; onClose: () => void }) {
  const { set, restore } = useWorkspace();
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
    const before = useWorkspace.getState().schedules;
    const email = to.trim();
    set('schedules', (ss) => ss.map((x) => (x.id === s.id ? {
      ...x, day, time, bounced: now ? undefined : x.bounced,
      ...(multi ? {} : { sendsTo: email, recipients: [{ id: wid('x'), name: email, sub: 'Email', count: 1, email }] }),
      lastSend: now ? 'Delivered' as const : x.lastSend,
    } : x)));
    onClose();
    toast.success(now ? `${s.name} sent to ${multi ? s.sendsTo : email}` : `${s.name} · schedule saved`, { action: { label: 'Undo', onClick: () => restore({ schedules: before }) } });
  };
  return (
    <Sheet open onClose={onClose} width={500} title={<span className="flex items-center gap-2.5"><span className="size-8 rounded-lg bg-[#DBEAFE] flex items-center justify-center"><CalendarBlank size={16} className="text-[#2563EB]" /></span>{s.name} · schedule</span>} sub={whenLabel(s)}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{now ? 'Save and send' : 'Save'}</Button></>}>
      <div className="space-y-5">
        <div><div className="text-sm font-medium mb-1.5">Send to</div>
          {multi ? <div className="text-sm text-gray-700">{s.sendsTo}</div> : (
            <label className="relative flex items-center"><EnvelopeSimple size={14} className="absolute left-2.5 text-[#646A78]" /><Input value={to} onChange={(e) => setTo(e.target.value)} className="pl-8" /></label>
          )}
          {bouncedNow && <p className="text-xs text-[#E0243A] mt-1.5">{s.sendsTo} bounced: the mailbox no longer exists.</p>}
        </div>
        <div><div className="text-sm font-medium mb-1.5">When</div>
          <div className="grid grid-cols-2 gap-3">
            <IconSelect ariaLabel="Day" value={day} onChange={setDay} options={[...DAYS.map((d) => ({ value: d, label: `${d}s` })), { value: '1st', label: '1st of the month' }]} />
            <IconSelect ariaLabel="Time" icon={Clock} value={time} onChange={setTime} options={TIMES.map((t) => ({ value: t, label: t }))} />
          </div></div>
        <div className="rounded-xl border border-line p-3.5 flex items-center gap-3">
          <span className="flex-1"><span className="block text-sm font-medium">Send this week’s now</span><span className="block text-xs text-[#646A78] mt-0.5">{bouncedNow ? 'Monday’s copy never arrived' : 'Sends the latest copy straight away'}</span></span>
          <Switch checked={now} onChange={setNow} label="Send this week’s now" />
        </div>
      </div>
    </Sheet>
  );
}

/* ======================= Occupancy report (F8 · 02–04) ======================= */
type HallRow = { id: string; hall: string; beds: number; res: number; arr: number; vac: number; blk: number };
const HALL_ROWS: HallRow[] = [
  { id: 'p1', hall: 'Ustinov', beds: 600, res: 371, arr: 211, vac: 12, blk: 6 },
  { id: 'p2', hall: 'Collingwood', beds: 481, res: 455, arr: 14, vac: 9, blk: 3 },
  { id: 'p5', hall: 'Van Mildert', beds: 557, res: 520, arr: 21, vac: 14, blk: 2 },
  { id: 'p4', hall: 'Josephine Butler', beds: 450, res: 398, arr: 40, vac: 10, blk: 2 },
  { id: 'p3', hall: 'St Mary’s', beds: 144, res: 139, arr: 2, vac: 3, blk: 0 },
];
/** Bar heights (px of a 180px plot) for in residence / arriving, as drawn in 3036:2. */
const WEEKS: { label: string; pct: number; res: number; arr: number }[] = [
  { label: '31 Aug', pct: 28, res: 42, arr: 14 }, { label: '7 Sep', pct: 41, res: 62, arr: 27 }, { label: '14 Sep', pct: 63, res: 95, arr: 33 },
  { label: '21 Sep', pct: 88, res: 132, arr: 9 }, { label: '28 Sep', pct: 94, res: 141, arr: 3 }, { label: '5 Oct', pct: 95, res: 143, arr: 2 },
];
const MAIN = 'occ-main';
const fmt = (n: number) => n.toLocaleString('en-GB');
/** Weekly rent per bed and the room type most often empty, per hall (ref 2061:285). */
const MONEY: Record<string, { rent: number; type: string }> = {
  p1: { rent: 189, type: 'Ensuite single' }, p2: { rent: 176, type: 'Studio' }, p5: { rent: 182, type: 'Standard single' },
  p4: { rent: 168, type: 'Ensuite single' }, p3: { rent: 204, type: 'Standard single' },
};
/** Weeks left on a 44-week tenancy from mid-September: what an empty bed loses if it stays empty. */
const WEEKS_LEFT = 42;
const gbp = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;
const gbpM = (n: number) => `£${(n / 1e6).toFixed(2)}m`;
const atRisk = (r: HallRow) => r.vac * MONEY[r.id].rent * WEEKS_LEFT;
const rentRoll = (r: HallRow) => (r.res + r.arr) * MONEY[r.id].rent * 44;

/* 3036:2: filter chips lead with a 14px gray-500 icon (calendar, building, calendar). */
function Chip({ value, onChange, options, label, icon }: { value: string; onChange: (v: string) => void; options: string[]; label: string; icon?: Icon }) {
  return <Dropdown icon={icon} value={value} onChange={onChange} options={options.map((o) => ({ value: o, label: o }))} ariaLabel={label}
    className="h-7 w-auto border-line shadow-tile text-xs font-medium" />;
}

function Tile({ label, value, color, sub, subColor }: { label: string; value: ReactNode; color?: string; sub?: ReactNode; subColor?: string }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <div className="text-xs font-medium text-[#646A78]">{label}</div>
      <div className="text-xl font-semibold mt-1 tabular-nums" style={{ color }}>{value}</div>
      {sub && <div className="text-xs mt-1 truncate" style={{ color: subColor ?? '#646A78' }}>{sub}</div>}
    </div>
  );
}

export function OccupancyReport() {
  const nav = useNavigate();
  const schedules = useWorkspace((s) => s.schedules);
  const mine = schedules.find((s) => s.id === MAIN);
  const [year, setYear] = useState('2026/27');
  const [hall, setHall] = useState('All halls');
  const [by, setBy] = useState('By week');
  const [sheet, setSheet] = useState(false);
  const rows = hall === 'All halls' ? HALL_ROWS : HALL_ROWS.filter((r) => r.hall === hall);
  const t = rows.reduce((a, r) => ({ beds: a.beds + r.beds, res: a.res + r.res, arr: a.arr + r.arr, vac: a.vac + r.vac, blk: a.blk + r.blk, risk: a.risk + atRisk(r), roll: a.roll + rentRoll(r) }), { beds: 0, res: 0, arr: 0, vac: 0, blk: 0, risk: 0, roll: 0 });
  const voids = [...rows].filter((r) => r.vac > 0).sort((a, b) => atRisk(b) - atRisk(a));
  const pct = (r: { res: number; beds: number }) => Math.round((r.res / r.beds) * 100);
  const bars = by === 'By week' ? WEEKS : rows.map((r) => ({ label: r.hall, pct: Math.round(((r.res + r.arr) / r.beds) * 100), res: (r.res / r.beds) * 150, arr: (r.arr / r.beds) * 150 }));

  return (
    <>
      <Header icon={ChartBar} crumbs={crumbs} title="Occupancy">
        <Button icon={DownloadSimple} onClick={() => toast.success('Occupancy.csv downloaded', { description: `${rows.length} halls · ${year} · ${by.toLowerCase()}` })}>Export CSV</Button>
        {mine ? <Button icon={Clock} onClick={() => setSheet(true)}>Every {mine.day === '1st' ? '1st of the month' : mine.day} {mine.time}</Button>
          : <Button variant="primary" icon={Clock} onClick={() => setSheet(true)}>Schedule</Button>}
      </Header>
      <Toolbar right={<span className="text-xs text-[#646A78] whitespace-nowrap shrink-0">Updated 5 min ago</span>}>
        <Chip icon={CalendarBlank} label="Academic year" value={year} onChange={(v) => { setYear(v); if (v !== '2026/27') toast(`${v} is archived`, { description: 'Showing its final week. Weekly detail is kept for the current year only.' }); }} options={['2026/27', '2025/26']} />
        <Chip icon={Buildings} label="Halls" value={hall} onChange={setHall} options={['All halls', ...HALL_ROWS.map((r) => r.hall)]} />
        <Chip icon={CalendarBlank} label="Group by" value={by} onChange={setBy} options={['By week', 'By hall']} />
      </Toolbar>
      <div className="flex-1 overflow-auto p-5 space-y-4">
        <div className="grid grid-cols-5 gap-3">
          <Tile label="Occupancy" value={`${pct({ res: t.res + t.arr, beds: t.beds })}%`} sub="+1.2 pts vs 2025/26" subColor="#0B8A4C" />
          <Tile label="Rent roll" value={gbpM(t.roll)} sub={`${fmt(t.res + t.arr)} beds let · ${year}`} />
          <Tile label="Void beds today" value={fmt(t.vac)} color="#E5530C" sub={`${gbp(t.risk)} rent at risk`} subColor="#B91C1C" />
          <Tile label="Held units" value={fmt(t.blk)} sub="excluded from occupancy" />
          <Tile label="Avg days void" value="11.6" sub="from release to re-let" />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_460px] gap-4">
        <div className="rounded-xl border border-line bg-white p-4 min-w-0">
          <div className="flex items-center"><h3 className="text-sm font-semibold">{by === 'By week' ? 'Beds filled by week' : 'Beds filled by hall'}</h3>
            <span className="ml-auto flex items-center gap-4 text-xs text-[#646A78]"><span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-[#2563EB]" />In residence</span><span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-[#93C5FD]" />Arriving</span></span></div>
          <div className="mt-4 h-[180px] border-b border-line flex items-end justify-around px-6">
            {bars.map((b) => (
              <div key={b.label} className="flex flex-col items-center w-11">
                <span className="text-xs font-medium mb-1.5">{b.pct}%</span>
                <div className="w-11 rounded-t-md bg-[#93C5FD]" style={{ height: b.arr }} />
                <div className="w-11 bg-[#2563EB]" style={{ height: b.res }} />
              </div>
            ))}
          </div>
          <div className="flex justify-around px-6 mt-2">{bars.map((b) => <span key={b.label} className="w-11 text-center text-xs text-[#646A78] whitespace-nowrap">{b.label}</span>)}</div>
        </div>
        <div className="rounded-xl border border-line bg-white overflow-hidden flex flex-col">
          <div className="h-12 px-4 flex items-center border-b border-line"><h3 className="text-sm font-semibold">Voids by property</h3><span className="ml-auto text-xs text-[#646A78]">{WEEKS_LEFT} weeks left on the tenancy</span></div>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-[#646A78] border-b border-line bg-[#F9FAFB]">
              <th className="text-left font-medium h-9 pl-4">Property</th><th className="text-right font-medium px-3">Void beds</th><th className="text-left font-medium px-3">Most void type</th><th className="text-right font-medium pr-4">Rent at risk</th>
            </tr></thead>
            <tbody>{voids.map((r) => (
              <tr key={r.id} className="border-b border-[#F3F4F6] hover:bg-[#FAFAFB] cursor-pointer" onClick={() => nav(`/inventory/properties?open=${r.id}`)}>
                <td className="h-10 pl-4 font-medium">{r.hall}</td>
                <td className="text-right px-3 tabular-nums">{r.vac}</td>
                <td className="px-3 text-[#646A78]">{MONEY[r.id].type}</td>
                <td className="text-right pr-4 font-semibold tabular-nums">{gbp(atRisk(r))}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        </div>
        <div className="rounded-xl border border-line bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-xs font-medium text-[#646A78] border-b border-line">
              <th className="text-left font-medium h-9 pl-5">Hall</th>{['Beds', 'In residence', 'Arriving', 'Vacant', 'Blocked', 'Rent roll', 'Rent at risk'].map((h) => <th key={h} className="text-right font-medium px-3">{h}</th>)}<th className="text-left font-medium pl-8 pr-5 w-[220px]">Filled</th>
            </tr></thead>
            <tbody>{rows.map((r) => { const p = pct(r); return (
              <tr key={r.id} className="border-b border-[#F3F4F6] last:border-0 hover:bg-[#FAFAFB] cursor-pointer" onClick={() => nav(`/inventory/properties?open=${r.id}`)}>
                <td className="h-10 pl-5 font-medium">{r.hall}</td>
                {[r.beds, r.res, r.arr, r.vac, r.blk].map((v, i) => <td key={i} className="text-right px-3 tabular-nums">{fmt(v)}</td>)}
                <td className="text-right px-3 tabular-nums">{gbpM(rentRoll(r))}</td>
                <td className="text-right px-3 tabular-nums text-[#B91C1C]">{gbp(atRisk(r))}</td>
                <td className="pl-8 pr-5"><span className="flex items-center gap-2"><span className="w-[107px] h-1.5 rounded-full bg-[#F3F4F6] overflow-hidden"><span className="block h-full rounded-full bg-[#0B8A4C]" style={{ width: `${p}%` }} /></span><span className="text-xs text-[#646A78]">{p}%</span></span></td>
              </tr>
            ); })}</tbody>
          </table>
        </div>
      </div>
      {sheet && <ScheduleSheet existing={mine} onClose={() => setSheet(false)} />}
    </>
  );
}

const DEFAULT_RECIPIENTS: Recipient[] = [
  { id: 'r1', name: 'Priya Shah', sub: 'You', count: 1 },
  { id: 'r2', name: 'James Reed', sub: 'Finance', count: 1 },
  { id: 'r3', name: 'Heads of college', sub: '5 people · group', count: 5 },
];

/** F8 · 03: schedule the occupancy report. */
function ScheduleSheet({ existing, onClose }: { existing?: Schedule; onClose: () => void }) {
  const { set, restore } = useWorkspace();
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
    return [...groups, ...ps].filter((r) => !rec.some((x) => x.id === r.id) && (!t || r.name.toLowerCase().includes(t))).slice(0, 5);
  }, [q, people, rec]);
  const add = (r: Recipient) => { setRec([...rec, r]); setQ(''); setAdding(false); };
  const save = () => {
    if (busy.current) return;
    if (!rec.length) { toast.error('Add at least one recipient'); return; }
    if (!fmts.pdf && !fmts.csv) { toast.error('Pick a format'); return; }
    busy.current = true;
    const before = useWorkspace.getState().schedules;
    const s: Schedule = { id: MAIN, reportId: 'occupancy', name: 'Occupancy · all halls', sendsTo: `${total} people`, recipients: rec, day, time, lastSend: 'Not sent yet', formats: fmts };
    set('schedules', (ss) => (ss.some((x) => x.id === MAIN) ? ss.map((x) => (x.id === MAIN ? s : x)) : [...ss, s]));
    onClose();
    toast.success(`Occupancy scheduled · every ${day === '1st' ? '1st of the month' : day} ${time} · ${total} people`, { action: { label: 'Undo', onClick: () => restore({ schedules: before }) } });
  };
  const stop = () => {
    const before = useWorkspace.getState().schedules;
    set('schedules', (ss) => ss.filter((x) => x.id !== MAIN)); onClose();
    toast.success('Occupancy won’t be sent any more', { action: { label: 'Undo', onClick: () => restore({ schedules: before }) } });
  };
  return (
    <Sheet open onClose={onClose} width={500}
      title={<span className="flex items-center gap-2.5"><span className="size-8 rounded-lg bg-[#DBEAFE] flex items-center justify-center"><CalendarBlank size={16} className="text-[#2563EB]" /></span><span className="leading-tight"><span className="block text-sm font-semibold">Schedule this report</span><span className="block text-xs font-normal text-[#646A78]">Occupancy · all halls · by week</span></span></span>}
      footer={<>{existing && <Button variant="danger-ghost" className="mr-auto" onClick={stop}>Stop sending</Button>}<Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>{existing ? 'Save' : 'Schedule'}</Button></>}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div><div className="text-sm font-medium mb-1.5">Every</div><IconSelect ariaLabel="Every" icon={CalendarBlank} value={day} onChange={setDay} options={[...DAYS.map((d) => ({ value: d, label: d })), { value: '1st', label: '1st of the month' }]} /></div>
          <div><div className="text-sm font-medium mb-1.5">At</div><IconSelect ariaLabel="At" icon={Clock} value={time} onChange={setTime} options={TIMES.map((t) => ({ value: t, label: t }))} /></div>
        </div>
        <div><div className="text-sm font-medium mb-1.5">Send to</div>
          <div className="rounded-[10px] border border-line px-3 py-1">
            {rec.map((r) => (
              <div key={r.id} className="group h-8 flex items-center gap-2.5">
                {r.count > 1 ? <span className="size-6 rounded-full bg-[#F3F4F6] flex items-center justify-center"><UsersThree size={12} className="text-[#646A78]" /></span> : <Avatar name={r.name} size={24} />}
                <span className="text-sm font-medium flex-1">{r.name}</span>
                <span className="text-xs text-[#646A78]">{r.sub}</span>
                {r.sub !== 'You' && <button type="button" onClick={() => setRec(rec.filter((x) => x.id !== r.id))} className="text-xs text-gray-400 hover:text-[#E0243A] opacity-0 group-hover:opacity-100 focus:opacity-100">Remove</button>}
              </div>
            ))}
            {adding ? (
              <div className="py-1.5 relative">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, group or email" onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.trim())) add({ id: wid('e'), name: q.trim(), sub: 'Email', count: 1, email: q.trim() }); else if (sugg[0]) add(sugg[0]); }
                  if (e.key === 'Escape') setAdding(false);
                }} ref={(el) => el?.focus()} />
                {sugg.length > 0 && <div className="mt-1 rounded-lg border border-line divide-y divide-line">{sugg.map((r) => <button key={r.id} type="button" onClick={() => add(r)} className="w-full h-8 px-2.5 flex items-center gap-2 text-left text-sm hover:bg-gray-50">{r.name}<span className="ml-auto text-xs text-[#646A78]">{r.sub}</span></button>)}</div>}
              </div>
            ) : <button type="button" onClick={() => setAdding(true)} className="h-8 flex items-center gap-2 text-sm text-primary"><Plus size={13} />Add people or a group</button>}
          </div></div>
        <div><div className="text-sm font-medium mb-1.5">Format</div>
          <div className="grid grid-cols-2 gap-2">
            {([['pdf', 'PDF summary'], ['csv', 'CSV data']] as const).map(([k, l]) => (
              <div key={k} className="h-10 rounded-[10px] border border-line px-3 flex items-center gap-2"><DownloadSimple size={14} className="text-[#646A78]" /><span className="text-sm font-medium flex-1">{l}</span><Switch checked={fmts[k]} onChange={(v) => setFmts({ ...fmts, [k]: v })} label={l} /></div>
            ))}
          </div></div>
        <div className="rounded-lg border border-primary p-3 flex gap-2.5"><Info size={16} className="text-primary shrink-0 mt-0.5" />
          <div><div className="text-sm font-medium text-primary">Recipients only see halls they have access to</div><div className="text-xs text-[#646A78] mt-0.5">Heads of college get their own college’s rows.</div></div></div>
      </div>
    </Sheet>
  );
}

/* ======================= Applications funnel ======================= */
export function ApplicationsReport() {
  const apps = useDb((s) => s.applications);
  const [cycle, setCycle] = useState('2027/28');
  const stages = [
    ['Applied', apps.length, '#2563EB'], ['Reviewed', apps.filter((a) => a.status !== 'New').length, '#7E22CE'],
    ['Offered', apps.filter((a) => ['Offered', 'Accepted'].includes(a.status)).length, '#F59E0B'], ['Accepted', apps.filter((a) => a.status === 'Accepted').length, '#0B8A4C'],
  ] as const;
  return (
    <>
      <Header icon={FunnelIcon} crumbs={crumbs} title="Applications funnel">
        <Button icon={DownloadSimple} onClick={() => toast.success('Applications funnel.csv downloaded')}>Export CSV</Button>
        <Button icon={ShareNetwork} onClick={() => { void navigator.clipboard?.writeText(location.href).catch(() => {}); toast.success('Link copied', { description: 'People see only the halls they have access to.' }); }}>Share</Button>
      </Header>
      <Toolbar right={<span className="text-xs text-[#646A78] whitespace-nowrap shrink-0">Updated 5 min ago</span>}>
        <Chip label="Cycle" value={cycle} onChange={setCycle} options={['2027/28', '2026/27']} />
      </Toolbar>
      <div className="flex-1 overflow-auto p-5 space-y-4">
        <div className="grid grid-cols-5 gap-3">
          {stages.map(([l, n, c]) => <Tile key={l} label={l} value={fmt(cycle === '2027/28' ? n : n * 19)} color={c} />)}
          <Tile label="Rent booked" value={gbpM((cycle === '2027/28' ? stages[3][1] : stages[3][1] * 19) * 182 * 44)} sub="accepted × 44 weeks" />
        </div>
        <div className="rounded-xl border border-line bg-white p-5">
          <h3 className="text-sm font-semibold mb-4">From application to booking · {cycle} cycle</h3>
          <div className="space-y-3">
            {stages.map(([label, n, c]) => (
              <div key={label} className="grid grid-cols-[110px_1fr_60px] items-center gap-4 text-sm">
                <span className="font-medium">{label}</span>
                <div className="h-7 rounded-md bg-[#F3F4F6] overflow-hidden"><div className="h-full rounded-md" style={{ width: `${(n / stages[0][1]) * 100}%`, background: c }} /></div>
                <span className="text-right font-semibold tabular-nums">{Math.round((n / stages[0][1]) * 100)}%</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#646A78] mt-5">Median time from application to offer: 6 days. Target: 5.</p>
        </div>
      </div>
    </>
  );
}

/* ======================= The other library reports ======================= */
type Simple = { title: string; tiles: [string, string, string?, string?][]; cols: string[]; rows: (string | number)[][] };
const SIMPLE: Record<string, Simple> = {
  rent: { title: 'Rent and arrears', tiles: [['Billed', '£4.12m', undefined, 'Michaelmas term'], ['Collected', '£3.86m', '#0B8A4C', '94% of billed'], ['Overdue', '£61,240', '#E0243A', '£1,612 average'], ['Residents in arrears', '38', '#E5530C', '9 over 30 days']], cols: ['Hall', 'Billed', 'Collected', 'Overdue', 'In arrears'],
    rows: [['Ustinov', '£1.09m', '£1.01m', '£22,180', 14], ['Collingwood', '£0.92m', '£0.88m', '£9,460', 6], ['Van Mildert', '£1.06m', '£0.99m', '£18,120', 11], ['Josephine Butler', '£0.79m', '£0.74m', '£8,980', 5], ["St Mary’s", '£0.26m', '£0.24m', '£2,500', 2]] },
  'maintenance-sla': { title: 'Maintenance deadlines', tiles: [['Jobs closed', '412'], ['On time', '91%', '#0B8A4C', '+3 pts vs last term'], ['Open and overdue', '9', '#E0243A'], ['Cost', '£18,640', undefined, '£45 a job']], cols: ['Hall', 'Jobs', 'On time', 'Median fix', 'Cost'],
    rows: [['Ustinov', 121, '88%', '2.1 days', '£5,980'], ['Collingwood', 84, '94%', '1.4 days', '£3,410'], ['Van Mildert', 97, '90%', '1.9 days', '£4,720'], ['Josephine Butler', 78, '93%', '1.6 days', '£3,220'], ["St Mary’s", 32, '97%', '1.1 days', '£1,310']] },
  requests: { title: 'Requests', tiles: [['Requests', '286'], ['Answered in 2 days', '84%', '#0B8A4C'], ['Waiting', '6', '#E5530C'], ['Most asked', 'Room swap']], cols: ['Kind', 'Requests', 'Approved', 'Median reply'],
    rows: [['Room swap', 112, '61%', '1.8 days'], ['Early arrival', 74, '89%', '0.9 days'], ['Guest stay', 63, '95%', '0.6 days'], ['Lease change', 37, '46%', '3.2 days']] },
  'notice-reach': { title: 'Notice reach', tiles: [['Notices sent', '18'], ['Delivered', '99%', '#0B8A4C'], ['Opened', '72%', '#1F45E0'], ['Clicked', '31%']], cols: ['Notice', 'Sent', 'Delivered', 'Opened', 'Clicked'],
    rows: [['Fire alarm test, Thursday', '10 Sep', '1,876', '81%', '12%'], ['Welcome week timetable', '7 Sep', '2,098', '77%', '46%'], ['Rent due for Michaelmas', '1 Sep', '2,203', '69%', '38%'], ['Water off in Fenwick Block', '28 Aug', '47', '91%', '4%']] },
};

export function SimpleReport() {
  const { id = '' } = useParams();
  const r = SIMPLE[id];
  const def = REPORTS.find((x) => x.to === `/reports/${id}`);
  if (!r) return <><Header icon={ChartBar} crumbs={crumbs} title="Report not found" /><div className="p-6 text-sm text-[#646A78]">There’s no report here. Pick one from the library.</div></>;
  const I = (def && AREA_ICON[def.id]) ?? ChartBar;
  return (
    <>
      <Header icon={I} crumbs={crumbs} title={r.title}>
        <Button icon={DownloadSimple} onClick={() => toast.success(`${r.title}.csv downloaded`)}>Export CSV</Button>
        <Button variant="primary" icon={CalendarBlank} onClick={() => toast('Scheduling is set up on Occupancy in the prototype', { description: 'Open Occupancy and choose Schedule.' })}>Schedule</Button>
      </Header>
      <Toolbar right={<span className="text-xs text-[#646A78] whitespace-nowrap shrink-0">Updated 5 min ago</span>}><Chip label="Academic year" value="2026/27" onChange={() => {}} options={['2026/27']} /><Chip label="Halls" value="All halls" onChange={() => {}} options={['All halls']} /></Toolbar>
      <div className="flex-1 overflow-auto p-5 space-y-4">
        <div className="grid grid-cols-4 gap-3">{r.tiles.map(([l, v, c, sub]) => <Tile key={l} label={l} value={v} color={c} sub={sub} />)}</div>
        <div className="rounded-xl border border-line bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-[#646A78] border-b border-line">{r.cols.map((c, i) => <th key={c} className={cx('font-medium h-9 px-3', i === 0 ? 'text-left pl-5' : 'text-right', i === r.cols.length - 1 && 'pr-5')}>{c}</th>)}</tr></thead>
            <tbody>{r.rows.map((row) => <tr key={String(row[0])} className="border-b border-[#F3F4F6] last:border-0">{row.map((v, i) => <td key={i} className={cx('h-10 px-3 tabular-nums', i === 0 ? 'pl-5 font-medium' : 'text-right', i === row.length - 1 && 'pr-5')}>{v}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}
