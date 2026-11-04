import { useState, type CSSProperties } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowsLeftRight, Bed, CalendarBlank, CalendarX, Check, CheckCircle, Clock, MapPin, Megaphone, NotePencil, PencilSimple, Plus, SquaresFour, Timer, Tray, TrendDown, UserCheck, Warning, Wrench, type Icon } from '../../components/icons';
import { useDb } from '../../data/store';
import { ME, NEEDS, useHome, type Need } from '../../data/home';
import { useRms } from '../../data/residents';
import { Bar, Button, Card, CardHead, Empty, PageHeader, Pill, cx, occColor, pressCard } from '../../components/ui';
import { MenuButton, Who } from './parts';

const needIcon: Record<Need['icon'], [Icon, string, string]> = {
  alert: [Warning, '#FDEDED', '#B91C1C'], swap: [ArrowsLeftRight, '#F3EEFF', '#6E3BD8'], lease: [NotePencil, '#EFF6FF', '#1F45E0'],
  inbox: [Tray, '#E3F6F6', '#0E7A80'], notice: [Megaphone, '#F3F4F6', '#374151'], landlord: [UserCheck, '#FFF0E0', '#E5530C'], conflict: [CalendarX, '#FFF6E0', '#B45309'],
};
const badgeIcon: Record<Need['badge']['icon'], Icon> = { clock: Clock, calendar: CalendarBlank, timer: Timer, trend: TrendDown, pencil: PencilSimple };

function Tile({ label, icon: I, value, sub, tone, to }: { label: string; icon?: Icon; value: string; sub: string; tone?: 'green' | 'orange' | 'red'; to?: string }) {
  const body = (
    <Card className={cx('px-4 py-3.5 h-full', to && pressCard)}>
      <div className="flex items-center justify-between text-xs leading-4 font-medium text-gray-500">{label}{I && <I size={14} className="text-gray-400" />}</div>
      <div className={cx('text-2xl leading-8 font-semibold tracking-[-0.24px] mt-1.5', value === '—' && 'text-gray-300')}>{value}</div>
      <div className={cx('text-xs leading-4 mt-1.5', tone === 'green' ? 'text-[#0B8A4C]' : tone === 'orange' ? 'text-[#E5530C]' : tone === 'red' ? 'text-[#B91C1C]' : 'text-gray-500')}>{sub}</div>
    </Card>
  );
  return to ? <Link to={to} className="block rounded-xl focus-visible:ring-2 focus-visible:ring-primary/40 outline-none">{body}</Link> : body;
}

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
  if (sp.get('empty') === '1') return <FirstDay />;
  return <Today />;
}

/* ---------- 2993:2 · Start the day ---------- */
function Today() {
  const open = useRms((st) => st.faults).filter((f) => f.status !== 'Fixed');
  const properties = useDb((s) => s.properties);
  const activity = useDb((s) => s.activity);
  const tasks = useHome((s) => s.rows.main);
  const stillMine = (id?: string) => !id || tasks.some((t) => t.id === id && !t.done && t.owner === ME);
  const needs = NEEDS.filter((n) => stillMine(n.taskId)).slice(0, 7);
  /* The five halls furthest from full: the ones that need attention. */
  const halls = [...properties].map((p) => ({ ...p, pct: Math.round((p.let / p.beds) * 100) })).sort((a, b) => a.pct - b.pct).slice(0, 5);

  return (
    <>
      <Header />
      <div className="flex-1 overflow-auto px-6 pt-6 pb-5 flex flex-col">
        <h2 className="text-xl font-semibold tracking-[-0.24px]">Good morning, Priya</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">Monday 14 September · 5 days to move-in weekend</p>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Tile label="Occupancy" icon={Bed} value="86%" sub="2,481 of 2,893 beds" tone="green" to="/inventory/occupancy" />
          <Tile label="Applications to review" icon={Tray} value="128" sub="31 waiting more than 5 days" tone="orange" to="/allocations/applications?tab=To%20review" />
          <Tile label="Open maintenance" icon={Wrench} value={String(open.length)} sub={`${open.filter((f) => f.priority === 'Urgent').length} urgent · ${open.filter((f) => f.slaMins < 0).length} past its SLA`} tone="red" to="/residents/maintenance" />
        </div>
        <div className="flex-1 grid grid-cols-[minmax(0,1fr)_500px] gap-4 min-h-[460px]">
          <Card className="flex flex-col overflow-hidden">
            <CardHead title="Needs you today" />
            {needs.length ? needs.map((n) => {
              const [I, bg, fg] = needIcon[n.icon];
              const B = badgeIcon[n.badge.icon];
              return (
                <Link key={n.id} to={n.to} className="flex items-center gap-3 px-3 h-14 border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                  <span className="tint size-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg, color: fg, '--tint': fg } as CSSProperties}><I size={16} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm leading-5 font-medium text-ink truncate">{n.title}</span><span className="block text-xs text-gray-500 truncate">{n.sub}</span></span>
                  <Pill tone={n.badge.tone} icon={B}>{n.badge.label}</Pill>
                </Link>
              );
            }) : (
              <div className="flex-1 flex items-center justify-center"><Empty icon={CheckCircle} title="Nothing needs you today" sub="New applications, issues and requests show up here." /></div>
            )}
          </Card>
          <div className="flex flex-col gap-4">
            <Card>
              <CardHead title="Occupancy by hall"><Link to="/inventory/occupancy" className="text-xs font-medium text-[#646A78] hover:text-ink">View all</Link></CardHead>
              <div className="px-4 py-4 space-y-3">
                {halls.map((p) => (
                  <Link key={p.id} to={`/inventory/properties?open=${p.id}`} className="grid grid-cols-[150px_1fr_48px_64px] items-center gap-3 h-[22px] text-sm hover:text-primary">
                    <span className="truncate text-ink">{p.name}</span><Bar value={p.pct} color={occColor(p.pct)} /><span className="text-right text-ink">{p.pct}%</span><span className="text-right text-xs text-[#646A78] tabular-nums">{p.let}/{p.beds}</span>
                  </Link>
                ))}
              </div>
            </Card>
            <Card className="flex-1">
              <CardHead title="Team activity"><Link to="/activity" className="text-xs font-medium text-[#646A78] hover:text-ink">View all</Link></CardHead>
              <div className="px-4 py-4 space-y-4">
                {activity.slice(0, 3).map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5">
                    <Who name={a.who === 'You' ? 'Priya Shah' : a.who} size={24} />
                    <div className="text-sm leading-5"><span className="text-ink"><span className="font-medium">{a.who}</span> {a.what}</span><div className="text-xs text-gray-500">{a.when}</div></div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- 3088:2 · First day on a new workspace (?empty=1) ---------- */
const steps = [
  { id: 's1', title: 'Choose the student site domain', sub: 'Portals · durham.amberstudent.com', done: true },
  { id: 's2', title: 'Add campuses', sub: 'Organisation · 3 campuses', done: true },
  { id: 's3', title: 'Add your first property', sub: 'Inventory · guided setup or a spreadsheet', done: false, cta: 'Add a property', to: '/inventory/properties' },
  { id: 's4', title: 'Invite your team', sub: 'Roles and access · wardens, front desk, estates', done: false, cta: 'Invite', to: '/org/people' },
  { id: 's5', title: 'Open an allocation cycle', sub: 'Allocations · needs at least one active property', done: false, cta: 'Open a cycle', to: '/allocations/cycles' },
];
function FirstDay() {
  const nav = useNavigate();
  const done = steps.filter((s) => s.done).length;
  /* Only the first unfinished step gets the primary button; it moves on as steps are done. */
  const next = steps.find((s) => !s.done)?.id;
  return (
    <>
      <Header />
      <div className="flex-1 overflow-auto px-6 pt-6 pb-5">
        <h2 className="text-xl font-semibold tracking-[-0.24px]">Welcome, Priya</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">Durham’s workspace is new. Once a hall and a cycle are set up, your day’s numbers show here.</p>
        <Card className="max-w-[820px] overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <h3 className="text-sm font-semibold">Set up your workspace</h3>
            <p className="text-sm text-gray-500 mt-0.5">{done} of {steps.length} done</p>
          </div>
          {steps.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-4 h-16 border-t border-line first-of-type:border-t-0">
              {s.done
                ? <span className="size-5 rounded-full bg-[#E8F7EE] text-[#0B8A4C] flex items-center justify-center shrink-0"><Check size={12} weight="bold" /></span>
                : <span className="size-5 rounded-full border border-gray-300 shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className={cx('text-sm', s.done ? 'text-gray-500 line-through' : 'text-ink')}>{s.title}</div>
                <div className="text-xs text-gray-500">{s.sub}</div>
              </div>
              {!s.done && s.cta && <Button variant={s.id === next ? 'primary' : 'secondary'} icon={s.id === next ? Plus : undefined} onClick={() => nav(s.to!)}>{s.cta}</Button>}
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
