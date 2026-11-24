import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowsLeftRight, CalendarBlank, CaretRight, Check, FileText, MapPin, Megaphone, Plus, SquaresFour, Tray, UserCheck, Wrench, type Icon } from '../../components/icons';
import { useDb } from '../../data/store';
import { useRms } from '../../data/residents';
import { useInv } from '../../data/inventory';
import { useOrg } from '../../data/org';
import { useAlloc } from '../../data/allocations';
import { Button, ButtonGroup, Card, PageHeader, Pill, cx } from '../../components/ui';
import { KpiCards, RankCard, Strip, TrendCard } from '../../components/overview';
import { HomeBand, MenuButton } from './parts';
import { useEmpty } from '../../data/empty';
import { PersonPhoto } from '../../components/Logo';
import { ME, NEEDS, useHome, type Need } from '../../data/home';
import type { Tone } from '../../data/seed';

function Header() {
  const campuses = useDb((s) => s.campuses);
  const [year, setYear] = useState('2026/27');
  const [campus, setCampus] = useState('All locations');
  return (
    <PageHeader icon={SquaresFour} title="Overview" search>
      <ButtonGroup>
        <MenuButton icon={CalendarBlank} value={year} options={['2025/26', '2026/27', '2027/28']} onChange={setYear} />
        <MenuButton icon={MapPin} value={campus} options={['All locations', ...campuses.map((c) => c.name)]} onChange={setCampus} />
      </ButtonGroup>
    </PageHeader>
  );
}

export function Overview() {
  const [sp] = useSearchParams();
  const empty = useEmpty((s) => s.on);
  if (empty || sp.get('empty') === '1') return <FirstDay />;
  return <Today />;
}

/* ---------- 3783:47863 · Start the day: occupancy trend, pre-let, funnel, three summary cards ---------- */
const DAYS = Array.from({ length: 30 }, (_, i) => new Date(Date.UTC(2026, 7, 16 + i)));
const dayLabel = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
/* Beds let: slow first week, a block of college offers on 23 Aug, a late-applicant batch on 5 Sep. */
const LET = DAYS.map((_, i) => Math.round(i < 7 ? 2290 + i * 1.6 : i < 20 ? 2378 + (i - 7) * 3 : i === 20 ? 2453 : 2453 + (i - 20) * 2.8));
const OCC_POINTS = DAYS.map((d, i) => {
  const delta = i ? LET[i] - LET[i - 1] : 0;
  return { label: dayLabel(d), value: LET[i], note: `${LET[i].toLocaleString('en-GB')} beds let · ${delta >= 0 ? '+' : ''}${delta}` };
});
/* Lowest first, so the property furthest from target leads; Elvet isn't letting this term (Figma 4192:31036). */
const PRELET = [
  { id: 'jb', name: 'Josephine Butler', pct: 78 }, { id: 'hb', name: 'Hild Bede', pct: 86 }, { id: 'col', name: 'Collingwood College', pct: 88 },
  { id: 'js', name: 'John Snow College', pct: 89 }, { id: 'ste', name: 'Stephenson College', pct: 91 }, { id: 'ust', name: 'Ustinov College', pct: 94 },
];

/* ---------- 4192:31036 · Overview (2026-11-23): queues strip, what needs you + move-in weekend, occupancy + pre-let ---------- */
const NEED_ICON: Record<Need['icon'], Icon> = { alert: Wrench, swap: ArrowsLeftRight, lease: FileText, inbox: Tray, notice: Megaphone, landlord: UserCheck, conflict: ArrowsLeftRight, import: FileText };
const dueOf = (n: Need): [string, Tone] => n.badge.label === 'Overdue' ? ['Overdue', 'red'] : n.when === 'today' ? ['Due today', 'amber'] : ['This week', 'grey'];

function NeedsCard({ open }: { open: number }) {
  const rows = NEEDS.filter((n) => n.mine).slice(0, 5);
  return (
    <Card className="overflow-hidden flex flex-col min-w-0">
      <Strip title="Needs your action" right={<Link to="/tasks" className="text-sm font-medium text-[#2563EB] hover:underline underline-offset-2 normal-case">All {open} tasks</Link>} />
      {rows.length ? <div className="px-5 py-1 flex flex-col">
        {rows.map((n, i) => {
          const I = NEED_ICON[n.icon]; const [due, tone] = dueOf(n);
          return (
            <Link key={n.id} to={n.to} className={cx('group -mx-2 px-2 py-3 flex items-center gap-3 rounded-lg hover:bg-[#FAFAFA] outline-none focus-visible:bg-[#FAFAFA]', i < rows.length - 1 && 'border-b border-[#F0F0F0] rounded-b-none')}>
              <span className="size-8 shrink-0 rounded-lg bg-[#F5F5F5] flex items-center justify-center text-[#404040]"><I size={16} /></span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm leading-5 font-medium text-[#0A0A0A] truncate">{n.title}</span>
                <span className="block text-[13px] leading-[18px] text-[#737373] truncate">{n.sub}</span>
              </span>
              <Pill tone={tone}>{due}</Pill>
              <CaretRight size={16} className="shrink-0 text-[#A3A3A3] group-hover:text-[#404040]" />
            </Link>
          );
        })}
      </div> : <div className="flex-1 flex items-center justify-center p-8 text-sm text-[#737373]">Nothing needs you today</div>}
    </Card>
  );
}

function MoveInCard({ empty }: { empty: boolean }) {
  const nav = useNavigate();
  const parts = empty ? [] : [{ label: 'Checked in', value: 208, color: '#16A34A' }, { label: 'To come', value: 398, color: '#D4D4D4' }, { label: 'No-shows', value: 6, color: '#DC2626', red: true }];
  const total = parts.reduce((a, p) => a + p.value, 0);
  return (
    <Card className="overflow-hidden flex flex-col min-w-0">
      <Strip title="Move-in weekend" right={<span className="font-mono text-xs leading-4 uppercase tracking-[0.48px] text-[#737373]">Sat 19 – Sun 20 Sep</span>} />
      <div className="flex-1 p-5 flex flex-col gap-3">
        <div className="flex items-baseline gap-2"><span className="font-mono text-[32px] leading-10 font-semibold tracking-[-0.02em] tabular-nums text-[#0A0A0A]">{total}</span><span className="text-sm text-[#737373]">arrivals</span></div>
        <div className="flex gap-0.5 h-2 rounded overflow-hidden bg-[#F0F0F0]">
          {parts.map((p) => <span key={p.label} className="h-full min-w-1" style={{ flexGrow: p.value, background: p.color }} />)}
        </div>
        <div className="flex flex-col gap-2 pt-1">
          {parts.map((p) => (
            <div key={p.label} className="flex items-center gap-2 text-sm leading-5">
              <span className="size-2 rounded-full shrink-0" style={{ background: p.color }} />
              <span className="flex-1 text-[#404040]">{p.label}</span>
              <span className={cx('font-medium tabular-nums', p.red ? 'text-[#DC2626]' : 'text-[#0A0A0A]')}>{p.value}</span>
            </div>
          ))}
        </div>
        {/* What stops people collecting keys at the desk: the move-in blockers, not a per-day split (2026-11-23). */}
        {!empty && <Link to="/allocations/bookings?tab=Awaiting%20signature" className="mt-1 block rounded-lg border border-[#D97706]/30 bg-white px-3 py-2.5 hover:bg-[#FFFBEB] outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div className="text-sm leading-5 font-medium text-[#B45309]">23 can’t collect keys yet</div>
          <div className="text-[13px] leading-[18px] text-[#737373]">14 leases not signed · 9 deposits unpaid</div>
        </Link>}
        <div className="mt-auto pt-3 border-t border-[#E5E5E5] flex items-center gap-3">
          <div className="flex-1 min-w-0"><div className="text-[13px] leading-[18px] text-[#737373]">Busiest slot</div><div className="text-sm leading-5 font-medium text-[#0A0A0A]">{empty ? '—' : 'Sat 10:00–12:00'}</div></div>
          <Button variant="secondary" icon={UserCheck} onClick={() => nav('/residents')}>Check-in</Button>
        </div>
      </div>
    </Card>
  );
}

function Today() {
  const nav = useNavigate();
  const open = useRms((st) => st.faults).filter((f) => f.status !== 'Fixed');
  /* Empty-states demo: a workspace with no beds, applications or residents yet, so every number reads zero. */
  const e = useEmpty((s) => s.on);
  /* The same open tasks My tasks counts: Arjun's, not done, not snoozed. */
  const mine = useHome((s) => s.rows.main).filter((r) => !r.done && !r.snoozed && r.owner === ME);
  const urgent = open.filter((f) => f.priority === 'Urgent').length;
  const red = (s: string) => <span className="font-medium text-[#DC2626]">{s}</span>;
  return (
    <>
      <Header />
      <div className="flex-1 overflow-auto flex flex-col">
        <HomeBand />
        {/* The queues, one figure each: what it is made of underneath, the urgent part first and in red. */}
        <KpiCards items={[
          { label: 'Applications', to: '/allocations/applications?tab=To%20review', value: e ? '0' : '128', unit: 'to review',
            note: e ? 'None waiting' : <>{red('31 waiting 5+ days')} · 4 with owner</>,
            meter: e ? undefined : { kind: 'split', parts: [{ label: 'To review', value: 93, color: '#2563EB' }, { label: 'Waiting 5+ days', value: 31, color: '#DC2626' }, { label: 'With owner', value: 4, color: '#93C5FD' }] } },
          { label: 'Rent', to: '/reports/rent', value: e ? '£0' : '£182k', unit: 'due this week',
            note: e ? 'Nothing due' : <>{red('23 overdue')} · 1,204 paid</>,
            meter: e ? undefined : { kind: 'split', parts: [{ label: 'Paid', value: 1204, color: '#16A34A' }, { label: 'Due this week', value: 180, color: '#D97706' }, { label: 'Overdue', value: 23, color: '#DC2626' }] } },
          { label: 'Maintenance', to: '/residents/maintenance', value: String(open.length), unit: 'open',
            note: urgent ? <>{red(`${urgent} urgent`)} · {open.length - urgent} other</> : 'Nothing urgent',
            meter: { kind: 'split', parts: [{ label: 'Urgent', value: urgent, color: '#DC2626' }, { label: 'High', value: open.filter((f) => f.priority === 'High').length, color: '#D97706' }, { label: 'Normal', value: open.filter((f) => f.priority === 'Normal').length, color: '#E5E5E5' }] } },
        ]} />
        <div className="px-6 py-6 flex flex-col gap-4">
          <div className="grid grid-cols-[minmax(0,1fr)_376px] gap-4">
            <NeedsCard open={mine.length} />
            <MoveInCard empty={e} />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_376px] gap-4">
            <TrendCard title="Occupancy" badge={e ? '0%' : '86%'} value={e ? '0' : '2,481'} of={e ? 'of 0 beds' : 'of 2,893 beds'} empty={e ? 'No beds let yet' : undefined} up="212 let" down="18 released" kind="line" chartOnly
              points={OCC_POINTS} ticks={['16 Aug', '23 Aug', '30 Aug', '6 Sep', '14 Sep']} axis={[2200, 2300, 2400, 2500]} />
            <RankCard title="Pre-let by property" note="Target 90%" target={90} more={0} empty={<><span>No properties yet</span><Button size="sm" onClick={() => nav('/inventory/properties')}>Create a property</Button></>} moreLabel="View all properties" moreTo="/inventory/properties"
              rows={e ? [] : [...PRELET.map((h) => ({ id: h.id, name: h.name, value: `${h.pct}%`, pct: h.pct, warn: h.pct < 80, to: `/inventory/properties?open=${h.id}` })),
                { id: 'erh', name: 'Elvet Riverside Houses', value: 'Not letting', pct: 0, muted: true, to: '/inventory/properties?open=erh' }]} />
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- 3672:12883 · First day on Overview: a new workspace (?empty=1, or the Empty states demo) ---------- */
function FirstDay() {
  const nav = useNavigate();
  const campuses = useDb((s) => s.campuses.length);
  const props = useInv((s) => s.properties.length);
  const members = useOrg((s) => s.members.length);
  const cycles = useAlloc((s) => s.cycles.length);
  const steps = [
    { id: 's1', title: 'Choose the resident site domain', sub: 'Portals · durham.residents.app', done: true },
    { id: 's2', title: 'Add locations', sub: `Organisation · ${campuses} locations`, done: campuses > 0, cta: 'Add locations', to: '/org/campuses' },
    { id: 's3', title: 'Create your first property', sub: 'Properties · one, many at once, or an import', done: props > 0, cta: 'Create a property', to: '/inventory/properties/new' },
    { id: 's4', title: 'Invite your team', sub: 'Roles and access · resident managers, front desk, estates', done: members > 1, cta: 'Invite', to: '/org/people' },
    { id: 's5', title: 'Open an allocation term', sub: 'Allocations · needs at least one active property', done: cycles > 0, cta: 'Open a term', to: '/allocations/cycles' },
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
          {/* Greeting with the profile photo, as on the populated Overview; no metric tiles until there is data. */}
          <div className="flex items-center gap-4">
            <PersonPhoto name="Arjun Mehta" size={48} square />
            <div className="min-w-0">
              <h2 className="text-xl leading-7 font-medium text-ink">Welcome, Arjun</h2>
              <p className="text-sm text-[#737373] mt-0.5">Durham’s workspace is new. The numbers fill in once properties and a term exist.</p>
            </div>
          </div>
          <Card className="mt-6 max-w-[640px] pt-4 pb-2 overflow-hidden">
            <div className="flex items-center gap-4 px-5 pb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-[#404040]">Set up Durham</h3>
                <p className="text-xs text-[#737373] mt-0.5">{done} of {steps.length} done · in the order the day-one journey takes</p>
              </div>
              <div className="w-[120px] h-1.5 rounded-[3px] bg-[#F5F5F5] overflow-hidden"><div className="h-full rounded-[3px] bg-[#2563EB]" style={{ width: `${pct}%` }} /></div>
              <span className="text-xs font-medium text-[#404040] tabular-nums w-[26px] text-right">{pct}%</span>
            </div>
            {steps.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-5 h-14">
                {s.done
                  ? <span className="size-5 rounded-full bg-[#E8F7EE] text-[#0B8A4C] flex items-center justify-center shrink-0"><Check size={12} weight="bold" /></span>
                  : <span className="size-5 rounded-full border border-[#C4C8D0] shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className={cx('text-sm font-medium', s.done ? 'text-[#A3A3A3] line-through' : 'text-ink')}>{s.title}</div>
                  <div className="text-xs text-[#737373]">{s.sub}</div>
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
