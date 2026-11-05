import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlarmClock, ArrowsLeftRight, Bed, CaretRight, Eye, CalendarBlank, CalendarX, Check, CheckCircle, FileArrowUp, MapPin, Megaphone, NotePencil, Plus, SquaresFour, Tray, TrendDown, UserCheck, Warning, Wrench, type Icon } from '../../components/icons';
import { useDb } from '../../data/store';
import { ME, NEEDS, useHome, type Need } from '../../data/home';
import { useRms } from '../../data/residents';
import { Button, Card, CardHead, Empty, PageHeader, Pill, Tabs, cx, pressCard } from '../../components/ui';
import { toast } from 'sonner';
import { useSnooze } from './Snooze';
import { MenuButton } from './parts';

const needIcon: Record<Need['icon'], [Icon, string, string]> = {
  alert: [Warning, '#FDEDED', '#B91C1C'], swap: [ArrowsLeftRight, '#F3EEFF', '#6E3BD8'], lease: [NotePencil, '#EFF6FF', '#1F45E0'],
  inbox: [Tray, '#E3F6F6', '#0E7A80'], notice: [Megaphone, '#F3F4F6', '#374151'], landlord: [UserCheck, '#FFF0E0', '#E5530C'], conflict: [CalendarX, '#FFF6E0', '#B45309'], import: [FileArrowUp, '#FDEDED', '#B91C1C'],
};

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
  const tasks = useHome((s) => s.rows.main);
  const stillMine = (id?: string) => !id || tasks.some((t) => t.id === id && !t.done && !t.snoozed && t.owner === ME);

  return (
    <>
      <Header />
      <div className="flex-1 overflow-auto px-6 pt-6 pb-5 flex flex-col">
        <h2 className="text-xl font-semibold tracking-[-0.24px]">Good morning, Priya</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">Monday 14 September · 5 days to move-in weekend</p>
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Tile label="Occupancy" icon={Bed} value="86%" sub="2,481 of 2,893 beds" tone="green" to="/inventory/occupancy" />
          <Tile label="Applications to review" icon={Tray} value="128" sub="31 waiting more than 5 days" tone="orange" to="/allocations/applications?tab=To%20review" />
          <Tile label="Open maintenance" icon={Wrench} value={String(open.length)} sub={`${open.filter((f) => f.priority === 'Urgent').length} urgent · ${open.filter((f) => f.slaMins < 0).length} overdue`} tone="red" to="/residents/maintenance" />
        </div>
        <div className="shrink-0 grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4">
          <div className="flex flex-col gap-4 min-w-0">
            <PreLet />
            <Funnel />
          </div>
          {/* Sized by the left column; the list scrolls if it runs longer. */}
          <div className="relative min-h-[420px]"><NeedsCard stillMine={stillMine} /></div>
        </div>
      </div>
    </>
  );
}

/* ---------- Needs your action (ref 2926:1415): grouped by when, action and snooze on hover ---------- */
function NeedsCard({ stillMine }: { stillMine: (id?: string) => boolean }) {
  const nav = useNavigate();
  const { snooze } = useSnooze('main');
  const tasks = useHome((s) => s.rows.main);
  const [who, setWho] = useState<'all' | 'me'>('all');
  const [hidden, setHidden] = useState<string[]>([]);
  const live = NEEDS.filter((n) => stillMine(n.taskId) && !hidden.includes(n.id));
  const shown = who === 'me' ? live.filter((n) => n.mine) : live;
  const snoozeNeed = (n: Need) => {
    const t = n.taskId && tasks.find((x) => x.id === n.taskId);
    if (t) return snooze(t, '2026-09-15T09:00');
    setHidden((h) => [...h, n.id]);
    toast.success(`Snoozed until Tue 15 Sep, 9:00 · ${n.title}`, { action: { label: 'Undo', onClick: () => setHidden((h) => h.filter((x) => x !== n.id)) } });
  };
  return (
    <Card className="absolute inset-0 flex flex-col overflow-hidden">
      <CardHead title={<span>Needs your action <span className="font-normal text-[#646A78] tabular-nums">{live.length}</span></span>}>
        <Tabs value={who} onChange={setWho} tabs={[{ id: 'all', label: 'All' }, { id: 'me', label: 'Assigned to me' }]} />
      </CardHead>
      <div className="flex-1 min-h-0 overflow-auto py-1">
        {shown.length === 0 ? (
          <div className="h-full flex items-center justify-center"><Empty icon={CheckCircle} title="Nothing needs you" sub="New applications, issues and requests show up here." /></div>
        ) : (['today', 'week'] as const).map((g) => {
          const list = shown.filter((n) => n.when === g);
          if (!list.length) return null;
          return (
            <div key={g}>
              <div className="px-4 pt-2.5 pb-1 text-xs text-[#646A78]">{g === 'today' ? 'Today' : 'This week'}</div>
              {list.map((n) => {
                const [I, , fg] = needIcon[n.icon];
                return (
                  <div key={n.id} role="link" tabIndex={0} onClick={() => nav(n.to)} onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) nav(n.to); }}
                    className="group mx-1.5 px-2.5 h-[52px] rounded-lg flex items-center gap-3 cursor-pointer hover:bg-[#F9FAFB] focus-within:bg-[#F9FAFB] outline-none">
                    <I size={16} className="shrink-0" style={{ color: fg }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm leading-5 font-medium text-ink truncate">{n.title}</span>
                      <span className="block text-xs leading-4 text-[#646A78] truncate">{n.sub}</span>
                    </span>
                    <CaretRight size={16} className="shrink-0 text-gray-400 group-hover:hidden group-focus-within:hidden" />
                    <span className="hidden group-hover:flex group-focus-within:flex items-center gap-1.5 shrink-0">
                      <button type="button" aria-label={`Snooze “${n.title}” until tomorrow 9:00`} title="Snooze until tomorrow 9:00"
                        onClick={(e) => { e.stopPropagation(); snoozeNeed(n); }}
                        className="size-8 rounded-md flex items-center justify-center text-gray-500 hover:bg-[#F3F4F6] hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                        <AlarmClock size={16} />
                      </button>
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); nav(n.to); }}>{n.action}</Button>
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------- Pre-let by property (ref 2880:348): next year's beds or rent booked so far, against a target ---------- */
const PRELET = [
  { id: 'p1', name: 'Ustinov College', beds: 600, rent: 3.42, pct: 94, rev: 92, target: 95 },
  { id: 'p2', name: 'Collingwood', beds: 481, rent: 3.05, pct: 88, rev: 90, target: 90 },
  { id: 'p5', name: 'Van Mildert', beds: 557, rent: 3.38, pct: 71, rev: 69, target: 85 },
  { id: 'p4', name: 'Josephine Butler', beds: 450, rent: 2.61, pct: 83, rev: 84, target: 90 },
  { id: 'p3', name: "St Mary's College", beds: 144, rent: 0.94, pct: 97, rev: 98, target: 95 },
];
const preletState = (v: number, target: number) =>
  v >= target ? { tone: 'green' as const, icon: Check, label: 'On track', bar: '#0B8A4C' }
    : target - v <= 8 ? { tone: 'blue' as const, icon: Eye, label: 'Watch', bar: '#2563EB' }
      : { tone: 'orange' as const, icon: TrendDown, label: 'Behind', bar: '#E5530C' };

function PreLet() {
  const [by, setBy] = useState<'beds' | 'revenue'>('beds');
  return (
    <Card className="overflow-hidden flex flex-col">
      <CardHead title="Pre-let by property">
        <Tabs value={by} onChange={setBy} tabs={[{ id: 'beds', label: 'Beds' }, { id: 'revenue', label: 'Revenue' }]} />
      </CardHead>
      <div className="grid grid-cols-[minmax(140px,1fr)_56px_minmax(0,2fr)_56px_100px] items-center gap-x-4 px-4 h-9 text-xs text-[#646A78] border-b border-line">
        <span>Property</span><span className="text-right">{by === 'beds' ? 'Beds' : 'Rent roll'}</span><span>Pre-let · marker is target</span><span className="text-right">Target</span><span>Status</span>
      </div>
      {PRELET.map((h) => {
        const v = by === 'beds' ? h.pct : h.rev;
        const st = preletState(v, h.target);
        return (
          <Link key={h.id} to={`/inventory/properties?open=${h.id}`} className="grid grid-cols-[minmax(140px,1fr)_56px_minmax(0,2fr)_56px_100px] items-center gap-x-4 px-4 h-11 text-sm border-b border-[#F3F4F6] last:border-0 hover:bg-[#F9FAFB] flex-1 min-h-11 h-auto">
            <span className="truncate text-ink" title={h.name}>{h.name}</span>
            <span className="text-right tabular-nums text-[#646A78]">{by === 'beds' ? h.beds.toLocaleString('en-GB') : `£${h.rent.toFixed(2)}m`}</span>
            <span className="flex items-center gap-3">
              <span className="relative flex-1 h-1.5 rounded-full bg-[#F3F4F6]" title={`Target ${h.target}%`}>
                <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${v}%`, background: st.bar }} />
                <span aria-hidden className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-ink" style={{ left: `calc(${h.target}% - 1px)` }} />
              </span>
              <span className="w-10 text-right font-medium tabular-nums text-ink">{v}%</span>
            </span>
            <span className="text-right tabular-nums text-[#646A78]">{h.target}%</span>
            <span><Pill tone={st.tone} icon={st.icon}>{st.label}</Pill></span>
          </Link>
        );
      })}
    </Card>
  );
}

/* ---------- Allocation funnel (ref 2880:348), drawn as bars so it fits the 500px column ---------- */
const FUNNEL = [['Applied', 3410], ['Allocated', 2480], ['Offer sent', 2390], ['Accepted', 2214], ['Lease approved', 1968]] as const;
const FUNNEL_FILL = ['#DBE4FF', '#DBE4FF', '#DBE4FF', '#5B8DFF', '#2563EB'];
function Funnel() {
  return (
    <Card>
      <CardHead title="Allocation funnel"><span className="text-xs text-[#646A78]">2027/28 · conversion from previous step</span></CardHead>
      <div className="px-4 pt-4 pb-4 grid grid-cols-5 gap-3">
        {FUNNEL.map(([label, n], i) => (
          <Link key={label} to="/allocations/applications" className="min-w-0 flex flex-col group">
            <div className="flex items-baseline justify-between gap-2 text-xs text-[#646A78]">
              <span className="truncate group-hover:text-primary">{label}</span>
              {i > 0 && <span className="tabular-nums">{Math.round((n / FUNNEL[i - 1][1]) * 100)}%</span>}
            </div>
            <div className="text-xl font-semibold tracking-tight tabular-nums text-ink mt-1">{n.toLocaleString('en-GB')}</div>
            <div className="mt-3 h-16 flex items-end">
              <div className="w-full rounded-md transition-opacity group-hover:opacity-85" style={{ height: `${Math.round((n / FUNNEL[0][1]) * 100)}%`, background: FUNNEL_FILL[i] }} />
            </div>
          </Link>
        ))}
      </div>
    </Card>
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
