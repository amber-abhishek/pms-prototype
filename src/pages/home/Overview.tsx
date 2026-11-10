import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarBlank, Check, MapPin, Megaphone, Plus, SquaresFour, Tray, Wrench } from '../../components/icons';
import { useDb } from '../../data/store';
import { useRms } from '../../data/residents';
import { useInv } from '../../data/inventory';
import { useOrg } from '../../data/org';
import { useAlloc } from '../../data/allocations';
import { Button, Card, PageHeader, cx } from '../../components/ui';
import { OverviewPage, RankCard, Split, Stats, SummaryCard, TrendCard, ViewLink } from '../../components/overview';
import { MenuButton } from './parts';
import { useEmpty } from '../../data/empty';
import { ME, useHome } from '../../data/home';

function Header() {
  const campuses = useDb((s) => s.campuses);
  const [year, setYear] = useState('2026/27');
  const [campus, setCampus] = useState('All campuses');
  return (
    <PageHeader icon={SquaresFour} title="Overview">
      <MenuButton icon={CalendarBlank} value={year} options={['2025/26', '2026/27', '2027/28']} onChange={setYear} />
      <MenuButton icon={MapPin} value={campus} options={['All campuses', ...campuses.map((c) => c.name)]} onChange={setCampus} />
    </PageHeader>
  );
}

export function Overview() {
  const [sp] = useSearchParams();
  const empty = useEmpty((s) => s.on);
  if (empty || sp.get('empty') === '1') return <FirstDay />;
  return <Today />;
}

/* ---------- 3783:47863 · Start the day: occupancy trend, pre-let, funnel, six summary cards ---------- */
const DAYS = Array.from({ length: 30 }, (_, i) => new Date(Date.UTC(2026, 7, 16 + i)));
const dayLabel = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
/* Beds let: slow first week, a block of college offers on 23 Aug, a late-applicant batch on 5 Sep. */
const LET = DAYS.map((_, i) => Math.round(i < 7 ? 2290 + i * 1.6 : i < 20 ? 2378 + (i - 7) * 3 : i === 20 ? 2453 : 2453 + (i - 20) * 2.8));
const OCC_POINTS = DAYS.map((d, i) => {
  const delta = i ? LET[i] - LET[i - 1] : 0;
  return { label: dayLabel(d), value: LET[i], note: `${LET[i].toLocaleString('en-GB')} beds let · ${delta >= 0 ? '+' : ''}${delta}` };
});
const PRELET = [
  { id: 'p1', name: 'Ustinov College', pct: 94 }, { id: 'p2', name: 'Collingwood College', pct: 88 }, { id: 'p6', name: 'Hild Bede', pct: 86 },
  { id: 'p4', name: 'Josephine Butler', pct: 83 }, { id: 'p7', name: 'Stephenson College', pct: 91 }, { id: 'p3', name: "St Mary's College", pct: 97 },
  { id: 'p5', name: 'Van Mildert', pct: 71 },
];

function Today() {
  const nav = useNavigate();
  const open = useRms((st) => st.faults).filter((f) => f.status !== 'Fixed');
  const urgent = open.filter((f) => f.priority === 'Urgent').length;
  const overdue = open.filter((f) => f.slaMins < 0).length;
  /* Empty-states demo: a workspace with no beds, applications or residents yet, so every number reads zero. */
  const e = useEmpty((s) => s.on);
  /* The same open tasks My tasks counts: Priya's, not done, not snoozed. */
  const mine = useHome((s) => s.rows.main).filter((r) => !r.done && !r.snoozed && r.owner === ME);
  const due = (['overdue', 'today', 'week'] as const).map((d) => mine.filter((r) => r.due === d).length);
  const first = mine.find((r) => r.due === 'overdue') ?? mine.find((r) => r.due === 'today');
  return (
    <>
      <Header />
      <OverviewPage title="Good morning, Priya" sub={e ? 'Monday 14 September' : 'Monday 14 September · 5 days to move-in weekend'} actions={<>
        <Button variant="primary" icon={Tray} onClick={() => nav('/allocations/applications?tab=To%20review')}>Review applications</Button>
        <Button variant="tertiary" icon={Wrench} onClick={() => nav('/residents/maintenance?log=1')}>Log a fault</Button>
        <Button variant="tertiary" icon={Megaphone} onClick={() => nav('/residents/notices')}>Send a notice</Button>
      </>}>
        <div className="grid grid-cols-[minmax(0,1fr)_384px] gap-4">
          <TrendCard title="Occupancy" badge={e ? '0%' : '86%'} value={e ? '0' : '2,481'} of={e ? 'of 0 beds' : 'of 2,893 beds'} empty={e ? 'No beds let yet' : undefined} up="212 let" down="−18 released" kind="line" chartOnly
            points={OCC_POINTS} ticks={['16 Aug', '23 Aug', '30 Aug', '6 Sep', '14 Sep']} axis={[2200, 2300, 2400, 2500]} />
          <RankCard title="Pre-let by property" note="target 90%" more={2} empty={<><span>No properties yet</span><Button size="sm" onClick={() => nav('/inventory/properties')}>Add a property</Button></>} moreLabel="View all properties" moreTo="/inventory/properties"
            rows={e ? [] : PRELET.map((h) => ({ id: h.id, name: h.name, value: `${h.pct}%`, pct: h.pct, warn: h.pct < 80, to: `/inventory/properties?open=${h.id}` }))} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard title="Needs your action" foot={first?.due === 'overdue' ? 'Overdue' : 'Due first'} footValue={first ? first.title : 'Nothing due today'} footTone={first?.due === 'overdue' ? 'red' : 'ink'} action={<Button size="sm" onClick={() => nav('/tasks')}>Open tasks</Button>}>
            <Split value={String(due[0] + due[1] + due[2])} parts={[[`${due[0]} overdue`, due[0], '#EF4444'], [`${due[1]} due today`, due[1], '#F59E0B'], [`${due[2]} this week`, due[2], '#D1D5DB']]} />
          </SummaryCard>
          <SummaryCard title="Applications" foot="Funnel · 2027/28" footValue={e ? 'No applications yet' : '3,410 applied · 1,968 leases'} action={<ViewLink to="/allocations/applications" />}>
            <Stats items={e ? [['To review', '0'], ['Waiting 5+ days', '0'], ['Landlord', '0']] : [['To review', '128'], ['Waiting 5+ days', '31', 'red'], ['Landlord', '4']]} />
          </SummaryCard>
          <SummaryCard title="Maintenance" foot="Oldest unassigned" footValue={open.length ? 'Leaking radiator · 2 h' : 'None'} footTone={open.length ? 'red' : 'ink'} action={<ViewLink to="/residents/maintenance" />}>
            <Stats items={[['Open', String(open.length)], ['Urgent', String(urgent), 'red'], ['Overdue', String(overdue)]]} />
          </SummaryCard>
          <SummaryCard title="Arrivals this week" foot="Busiest day" footValue={e ? '—' : 'Sat · 340'} action={<Button size="sm" onClick={() => nav('/residents')}>Check-in</Button>}>
            <Split value={e ? '0' : '612'} parts={e ? [['0 checked in', 0, '#0B8A4C'], ['0 to come', 0, '#D1D5DB'], ['0 no-shows', 0, '#EF4444']] : [['208 checked in', 208, '#0B8A4C'], ['398 to come', 398, '#D1D5DB'], ['6 no-shows', 6, '#EF4444']]} />
          </SummaryCard>
          <SummaryCard title="Rent" foot="Oldest overdue" footValue={e ? 'None' : 'Lily Chen · 41 days'} footTone={e ? 'ink' : 'red'} action={<ViewLink to="/reports" />}>
            <Stats items={e ? [['Due this week', '£0'], ['Overdue', '0'], ['Paid', '0']] : [['Due this week', '£182k'], ['Overdue', '23', 'orange'], ['Paid', '1,204']]} />
          </SummaryCard>
          <SummaryCard title="Requests" foot="Next notice" footValue={e ? 'None scheduled' : 'Move-in notice · Wed 09:00'} action={<ViewLink to="/residents/requests" />}>
            <Stats items={e ? [['Open', '0'], ['Room swaps', '0'], ['Draft notices', '0']] : [['Open', '9'], ['Room swaps', '3'], ['Draft notices', '1']]} />
          </SummaryCard>
        </div>
      </OverviewPage>
    </>
  );
}

/* ---------- 3672:12883 · First day on Overview: a new workspace (?empty=1, or the Empty states demo) ---------- */
const TILES: [string, boolean][] = [['Occupancy', true], ['Applications to review', false], ['Offers expiring in 48 h', false], ['Arriving this week', true], ['Open maintenance', false]];
function FirstDay() {
  const nav = useNavigate();
  const campuses = useDb((s) => s.campuses.length);
  const props = useInv((s) => s.properties.length);
  const members = useOrg((s) => s.members.length);
  const cycles = useAlloc((s) => s.cycles.length);
  const steps = [
    { id: 's1', title: 'Choose the student site domain', sub: 'Portals · durham.amberstudent.com', done: true },
    { id: 's2', title: 'Add campuses', sub: `Organisation · ${campuses} campuses`, done: campuses > 0, cta: 'Add campuses', to: '/org/campuses' },
    { id: 's3', title: 'Add your first property', sub: 'Inventory · guided setup or a spreadsheet', done: props > 0, cta: 'Add a property', to: '/inventory/properties' },
    { id: 's4', title: 'Invite your team', sub: 'Roles and access · wardens, front desk, estates', done: members > 1, cta: 'Invite', to: '/org/people' },
    { id: 's5', title: 'Open an allocation cycle', sub: 'Allocations · needs at least one active property', done: cycles > 0, cta: 'Open a cycle', to: '/allocations/cycles' },
  ];
  const done = steps.filter((s) => s.done).length;
  const pct = Math.round((done / steps.length) * 100);
  /* Only the first unfinished step gets the primary button; it moves on as steps are done. */
  const next = steps.find((s) => !s.done)?.id;
  return (
    <>
      <Header />
      <div className="flex-1 overflow-auto px-14 pt-8 pb-8">
        <div className="max-w-[1040px]">
          <h2 className="text-xl leading-7 font-medium text-ink">Welcome, Priya</h2>
          <p className="text-sm text-[#646A78] mt-0.5">Durham’s workspace is new. The numbers fill in once halls and a cycle exist.</p>
          {/* Five metric tiles waiting for data: grey dash, empty meter where the tile has one, "No data yet". */}
          <div className="grid grid-cols-5 gap-3 mt-5">
            {TILES.map(([label, meter]) => (
              <Card key={label} className="px-4 py-3.5 flex flex-col gap-2">
                <div className="text-xs font-medium text-[#374151] truncate">{label}</div>
                <div className="pt-1 text-[26px] leading-[34px] font-semibold text-[#9CA3AF]">—</div>
                {meter && <div className="h-1.5 rounded-[3px] bg-[#F3F4F6]" />}
                <div className="text-xs text-[#9CA3AF]">No data yet</div>
              </Card>
            ))}
          </div>
          <Card className="mt-4 max-w-[640px] pt-4 pb-2 overflow-hidden">
            <div className="flex items-center gap-4 px-5 pb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-[#374151]">Set up Durham</h3>
                <p className="text-xs text-[#646A78] mt-0.5">{done} of {steps.length} done · in the order the day-one journey takes</p>
              </div>
              <div className="w-[120px] h-1.5 rounded-[3px] bg-[#F3F4F6] overflow-hidden"><div className="h-full rounded-[3px] bg-[#2563EB]" style={{ width: `${pct}%` }} /></div>
              <span className="text-xs font-medium text-[#374151] tabular-nums w-[26px] text-right">{pct}%</span>
            </div>
            {steps.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-5 h-14">
                {s.done
                  ? <span className="size-5 rounded-full bg-[#E8F7EE] text-[#0B8A4C] flex items-center justify-center shrink-0"><Check size={12} weight="bold" /></span>
                  : <span className="size-5 rounded-full border border-[#C4C8D0] shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className={cx('text-sm font-medium', s.done ? 'text-[#9CA3AF] line-through' : 'text-ink')}>{s.title}</div>
                  <div className="text-xs text-[#646A78]">{s.sub}</div>
                </div>
                {!s.done && s.cta && <Button variant={s.id === next ? 'primary' : 'secondary'} icon={s.id === next ? Plus : undefined} onClick={() => nav(s.to!)}>{s.cta}</Button>}
              </div>
            ))}
          </Card>
        </div>
      </div>
    </>
  );
}
