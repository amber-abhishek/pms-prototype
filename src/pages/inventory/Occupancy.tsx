import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Buildings, Grid3x3, Stack } from '../../components/icons';
import { Button, Meter, MultiFilter, Pill, PageHeader, SearchInput, SelectFilter, Sheet, SheetHero, StatStrip, Table, cx, inFilter, listNav, type Col, type Filters, type StatItem, type Tone } from '../../components/ui';
import { useDb } from '../../data/store';
import { DateRangePicker, utc, type Range, type RangePreset } from '../../components/DateRangePicker';
import { useEmpty } from '../../data/empty';
import { HALL_OCC } from '../../data/occupancy';
import { EmptyArea } from '../allocations/common';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DownloadSimple } from '../../components/icons';
import { Seg } from './common';
import { PHOTO, photoOf } from './photos';
import { OccupancyTimeline, TIMELINE_EXTRA } from './OccupancyTimeline';

/* Occupancy, floor plan (frame 3355:105349): hall tabs with bed counts, five stat tiles, then one
   block's floors as rows of room tiles coloured by status. */

type St = 'in' | 'arriving' | 'held' | 'vacant' | 'blocked';
type Room = { code: string; st: St; who?: string; floor: string };
type Hall = { id: string; name: string; campus: string; beds: number; inRes: number; arriving: number; vacant: number; blocked: number; blocks: string[] };

/* Bed counts come from data/occupancy (HALL_OCC), the same rows Reports › Occupancy reads; this page adds its names and blocks. */
/* campus is the seed campus id (c1 Durham City, c2 Queen's Campus): the Location filter narrows by it. */
/* A hall's cover photo (2026-11-26): its property's own where it has one; St Mary's and Van Mildert aren't in Properties,
   so they borrow a stock one (dummy data). */
const STOCK = Object.values(PHOTO);
const hallPhoto = (id: string) => photoOf(id) ?? STOCK[[...id].reduce((n, c) => n + c.charCodeAt(0), 0) % STOCK.length];
const HALL_EXTRA: Record<string, { name: string; campus: string; blocks: string[] }> = {
  ust: { name: 'Ustinov College', campus: 'c1', blocks: ['Block G', 'Block H', 'Block J'] },
  col: { name: 'Collingwood', campus: 'c1', blocks: ['Block A', 'Block B', 'Block C'] },
  stm: { name: 'St Mary’s', campus: 'c1', blocks: ['Main house', 'Garden wing'] },
  jb: { name: 'Josephine Butler', campus: 'c1', blocks: ['Block A', 'Block B'] },
  vm: { name: 'Van Mildert', campus: 'c1', blocks: ['Block A', 'Block B', 'Block C'] },
};
/* Queen's Campus halls: not in HALL_OCC (Reports covers Durham City only), so their counts live here. Dummy data. */
const QC_HALLS: Hall[] = [
  { id: 'ste', name: 'Stephenson College', campus: 'c2', beds: 610, inRes: 402, arriving: 148, vacant: 51, blocked: 9, blocks: ['Block A', 'Block B', 'Block C'] },
  { id: 'js', name: 'John Snow College', campus: 'c2', beds: 455, inRes: 431, arriving: 18, vacant: 4, blocked: 2, blocks: ['North', 'South'] },
];
const HALLS: Hall[] = [...['ust', 'col', 'stm', 'jb', 'vm'].map((id) => {
  const o = HALL_OCC.find((x) => x.id === id)!;
  return { id, ...HALL_EXTRA[id], beds: o.beds, inRes: o.res, arriving: o.arr, vacant: o.vac, blocked: o.blk };
}), ...QC_HALLS];
const heldOf = (h: Hall) => Math.max(0, h.beds - h.inRes - h.arriving - h.vacant - h.blocked);
/** Share of beds taken (in residence, arriving or held for an offer). */
const occOf = (h: Hall) => Math.max(0, h.beds - h.vacant - h.blocked) / h.beds;
const pct = (x: number) => `${(Math.round(x * 1000) / 10).toLocaleString('en-GB')}%`;
const BANDS = ['Below 95%', '95–98%', '98% and above'] as const;
const bandOf = (h: Hall) => { const o = occOf(h); return o < 0.95 ? BANDS[0] : o < 0.98 ? BANDS[1] : BANDS[2]; };
const NEEDS = ['Vacant', 'Blocked', 'Arriving'] as const;
const needsOf = (h: Hall) => [h.vacant > 0 && NEEDS[0], h.blocked > 0 && NEEDS[1], h.arriving > 0 && NEEDS[2]].filter(Boolean) as string[];

const FLOORS = [['Ground', 'G'], ['First', 'F'], ['Second', 'S']] as const;
const r = (floor: string, code: string, st: St, who?: string): Room => ({ floor, code, st, who });

/* Ustinov · Block G, exactly as the frame shows it. */
const BLOCK_G: Room[] = [
  r('Ground', 'G.01.A', 'in', 'R. Gupta'), r('Ground', 'G.01.B', 'in', 'B. Lewis'), r('Ground', 'G.02.A', 'arriving', 'K. Novak'), r('Ground', 'G.02.B', 'arriving', 'N. Haddad'),
  r('Ground', 'G.03.A', 'in', 'M. Rossi'), r('Ground', 'G.03.B', 'vacant'), r('Ground', 'G.04.A', 'arriving', 'A. Rahman'), r('Ground', 'G.04.B', 'arriving', 'D. Evans'),
  r('Ground', 'G.05.A', 'blocked'), r('Ground', 'G.05.B', 'in', 'H. Ali'),
  r('First', 'F.01.A', 'in', 'D. Evans'), r('First', 'F.01.B', 'arriving', 'T. Kim'), r('First', 'F.02.A', 'in', 'H. Ali'), r('First', 'F.02.B', 'in', 'I. Moreau'),
  r('First', 'F.03.A', 'held'), r('First', 'F.03.B', 'in', 'R. Gupta'), r('First', 'F.04.A', 'arriving', 'B. Lewis'), r('First', 'F.04.B', 'vacant'),
  r('First', 'F.05.A', 'in', 'N. Haddad'), r('First', 'F.05.B', 'in', 'M. Rossi'),
  r('Second', 'S.01.A', 'arriving', 'R. Gupta'), r('Second', 'S.01.B', 'in', 'B. Lewis'), r('Second', 'S.02.A', 'in', 'K. Novak'), r('Second', 'S.02.B', 'vacant'),
  r('Second', 'S.03.A', 'in', 'M. Rossi'), r('Second', 'S.03.B', 'in', 'F. Silva'), r('Second', 'S.04.A', 'arriving', 'L. Chen'), r('Second', 'S.04.B', 'in', 'D. Evans'),
  r('Second', 'S.05.A', 'in', 'T. Kim'), r('Second', 'S.05.B', 'arriving', 'H. Ali'),
];
const NAMES = ['R. Gupta', 'B. Lewis', 'K. Novak', 'N. Haddad', 'M. Rossi', 'A. Rahman', 'D. Evans', 'H. Ali', 'T. Kim', 'I. Moreau', 'F. Silva', 'L. Chen', 'S. Patel', 'O. Wright', 'E. Morgan'];

/** Rooms for one block. Other blocks are generated, steadily, with the hall's mix of statuses. */
function roomsFor(h: Hall, block: string): Room[] {
  if (h.id === 'ust' && block === 'Block G') return BLOCK_G;
  const seed = [...(h.id + block)].reduce((a, c) => a + c.charCodeAt(0), 0);
  return FLOORS.flatMap(([floor, p], fi) => Array.from({ length: 10 }, (_, i) => {
    const n = (seed + fi * 31 + i * 17) % 100;
    const st: St = n < 3 ? 'blocked' : n < 9 ? 'vacant' : n < 12 ? 'held' : n < 12 + Math.round((h.arriving / h.beds) * 100) ? 'arriving' : 'in';
    const code = `${p}.${String(Math.floor(i / 2) + 1).padStart(2, '0')}.${i % 2 ? 'B' : 'A'}`;
    return r(floor, code, st, st === 'in' || st === 'arriving' ? NAMES[(seed + fi * 7 + i) % NAMES.length] : undefined);
  }));
}

/* Connect language (2026-11-17): tiles filled with a light status tint, a soft tone edge and a tone dot, mono room code;
   no icons. Vacant is white with a dashed grey edge; blocked sits on light grey. */
const ST: Record<St, { label: string; dot: string; tile: string; tone: Tone }> = {
  in: { label: 'In residence', dot: '#16A34A', tile: 'border-[#16A34A]/20 bg-[#F0FDF4]', tone: 'green' },
  arriving: { label: 'Arriving', dot: '#2563EB', tile: 'border-[#2563EB]/20 bg-[#EFF6FF]', tone: 'blue' },
  held: { label: 'Held for offer', dot: '#F59E0B', tile: 'border-[#F59E0B]/30 bg-[#FFFBEB]', tone: 'amber' },
  vacant: { label: 'Vacant', dot: 'transparent', tile: 'border-dashed border-[#D4D4D4] bg-white', tone: 'grey' },
  blocked: { label: 'Blocked', dot: '#A3A3A3', tile: 'border-[#E5E5E5] bg-[#F5F5F5]', tone: 'grey' },
};
const Dot = ({ st }: { st: St }) => <span aria-hidden className={cx('inline-block size-2 rounded-full shrink-0', st === 'vacant' && 'ring-1 ring-inset ring-[#A3A3A3]')} style={{ background: ST[st].dot }} />;
const ORDER: St[] = ['in', 'arriving', 'held', 'vacant', 'blocked'];

function summary(rooms: Room[]) {
  const n = (s: St) => rooms.filter((x) => x.st === s).length;
  return [`${n('in')} in`, `${n('arriving')} arriving`, n('held') ? `${n('held')} held` : '', `${n('vacant')} vacant`].filter(Boolean).join(' · ');
}

/* Properties is the section here, not a parent page (Occupancy is not inside the properties list), so it is plain text. */
const SECTION = { label: 'Properties', plain: true };

/* Date range presets. Today is the real date; academic years run 1 Sep to 31 Aug. */
const NOW = new Date();
const TODAY = utc(NOW.getUTCFullYear(), NOW.getUTCMonth(), NOW.getUTCDate());
const addDays = (x: Date, n: number) => new Date(x.getTime() + n * 86_400_000);
const AY = (y: number): Range => ({ from: utc(y, 8, 1), to: utc(y + 1, 7, 31) });
const CUR_Y = TODAY.getUTCMonth() >= 8 ? TODAY.getUTCFullYear() : TODAY.getUTCFullYear() - 1;
const MONDAY = addDays(TODAY, -((TODAY.getUTCDay() + 6) % 7));
const PRESETS: RangePreset[] = [
  { id: 'week', label: 'This week', range: { from: MONDAY, to: addDays(MONDAY, 6) } },
  { id: 'month', label: 'This month', range: { from: utc(TODAY.getUTCFullYear(), TODAY.getUTCMonth(), 1), to: utc(TODAY.getUTCFullYear(), TODAY.getUTCMonth() + 1, 0) } },
  { id: 'next30', label: 'Next 30 days', range: { from: TODAY, to: addDays(TODAY, 29) } },
  { id: 'next90', label: 'Next 90 days', range: { from: TODAY, to: addDays(TODAY, 89) } },
  ...[CUR_Y, CUR_Y + 1, CUR_Y - 1].map((y) => ({ id: `ay${y}`, label: `${y}/${String(y + 1).slice(2)}`, range: AY(y) })),
];

/* A property's figures for a date range (dummy model, steady for the same inputs). The hall's stored counts are
   today's snapshot, used as-is when the range is a week or less around today. Otherwise each day of the range has a
   share of beds lived in (move-in on 19 Sep, full through the year, summer lets in Jul and Aug) and a share arriving
   (move-in week, January starters, summer guests), scaled by how full the hall is today:
   in residence = the average over the range, arriving = everyone who arrives inside it, vacant = beds not let at the
   range's fullest point. */
const DAY_MS = 86_400_000;
const livedIn = (x: Date) => { const m = x.getUTCMonth(), d = x.getUTCDate(); return m === 8 ? (d < 19 ? 0.12 : 0.96) : m === 6 || m === 7 ? 0.22 : 0.97; };
const arriving = (x: Date) => { const m = x.getUTCMonth(), d = x.getUTCDate();
  return m === 8 && d >= 19 && d < 26 ? 0.84 / 7 : m === 0 && d >= 6 && d < 13 ? 0.03 / 7 : m === 6 && d < 7 ? 0.2 / 7 : 0.0004; };
function forRange(h: Hall, r: Range): Hall {
  const span = Math.round((r.to.getTime() - r.from.getTime()) / DAY_MS) + 1;
  if (span <= 7 && TODAY >= r.from && TODAY <= r.to) return h;
  const f = Math.min(1.02, (1 - (h.vacant + h.blocked) / h.beds) / 0.97); /* how full this hall runs, against a typical 97% */
  const open = h.beds - h.blocked;
  let lived = 0, peak = 0, arr = 0;
  for (let i = 0; i < span; i++) { const x = addDays(r.from, i); const l = livedIn(x); lived += l; peak = Math.max(peak, l); arr += arriving(x); }
  const peakLet = Math.min(open, Math.round(open * peak * f));
  return { ...h, inRes: Math.min(peakLet, Math.round(open * (lived / span) * f)), arriving: Math.min(open, Math.round(open * arr * f)), vacant: open - peakLet };
}

/** A filter field for this page's toolbar. */
type Field = { id: string; label: string; options: { value: string; tone?: Tone; count?: number }[] };

/** Overall view: one row per property with its bed counts and how full it is. */
const HALL_COLS: Col<Hall>[] = [
  { key: 'name', label: 'Property', render: (h) => (
    /* A 48px photo (2026-11-26), the name over its blocks. */
    <span className="flex items-center gap-3 min-w-0 py-1">
      <img src={hallPhoto(h.id)} alt="" loading="lazy" className="size-12 shrink-0 rounded-lg object-cover bg-[#F5F5F5]" />
      <span className="min-w-0"><span className="block truncate font-medium">{h.name}</span><span className="block truncate text-xs leading-4 text-[#737373]">{h.blocks.length} {h.blocks.length === 1 ? 'block' : 'blocks'}</span></span>
    </span>
  ) },
  { key: 'beds', label: 'Beds', render: (h) => <span className="tabular-nums">{h.beds.toLocaleString('en-GB')}</span> },
  { key: 'occ', label: 'Occupancy', className: 'w-[240px]', render: (h) => (
    <span className="flex items-center gap-3">
      <span className="w-[120px] shrink-0"><Meter m={{ kind: 'split', parts: [{ label: 'In residence', value: h.inRes, color: '#16A34A' }, { label: 'Arriving', value: h.arriving, color: '#2563EB' }, { label: 'Held', value: heldOf(h), color: '#F59E0B' }, { label: 'Vacant', value: h.vacant, color: '#F97316' }, { label: 'Blocked', value: h.blocked, color: '#A3A3A3' }] }} /></span>
      <span className="tabular-nums">{pct(occOf(h))}</span>
    </span>
  ) },
  { key: 'in', label: 'In residence', render: (h) => <span className="tabular-nums">{h.inRes.toLocaleString('en-GB')}</span> },
  { key: 'arr', label: 'Arriving', render: (h) => <span className="tabular-nums">{h.arriving.toLocaleString('en-GB')}</span> },
  { key: 'vac', label: 'Vacant', render: (h) => <span className={cx('tabular-nums', h.vacant > 0 && 'text-[#E5530C]')}>{h.vacant || '—'}</span> },
  { key: 'blk', label: 'Blocked', render: (h) => <span className="tabular-nums">{h.blocked || '—'}</span> },
];

export function OccupancyPage() {
  const campuses = useDb((s) => s.campuses);
  /* 'all' is the overall view across every property in the location; a hall id is that property's plan. */
  /* No ?p: the overall view across every property in the location. ?p=<hall id>: that property's plan, opened
     from the table. It lives in the URL so the browser's back button comes out again too. */
  const [params, setParams] = useSearchParams();
  const hid = params.get('p') ?? 'all';
  const setHid = (id: string) => setParams((ps) => { const n = new URLSearchParams(ps); if (id === 'all') n.delete('p'); else n.set('p', id); return n; });
  /* The date range is the page's main control. */
  const [range, setRange] = useState<Range>(AY(CUR_Y));
  /* Every figure on the page (cards, table, filters) is for the picked range. */
  const ranged = useMemo(() => HALLS.map((x) => forRange(x, range)), [range]);
  const h = hid === 'all' ? null : ranged.find((x) => x.id === hid) ?? null;
  /* Block is a picker (the plan shows one block at a time), not a filter. Each view keeps its own filters. */
  const [blockSel, setBlock] = useState('Block G');
  const [hallF, setHallF] = useState<Filters>({});
  const [roomF, setRoomF] = useState<Filters>({});
  const [view, setView] = useState<'Grid' | 'Timeline'>('Timeline');
  const block = h ? (h.blocks.includes(blockSel) ? blockSel : h.blocks[0]) : '';
  const allRooms = useMemo(() => (h ? roomsFor(h, block) : []), [h, block]);
  /* The panel's search finds a room by its code or its resident. */
  const [q, setQ] = useState('');
  const rooms = useMemo(() => { const n = q.trim().toLowerCase();
    return allRooms.filter((x) => inFilter(roomF.status, ST[x.st].label) && inFilter(roomF.floor, x.floor) && (!n || x.code.toLowerCase().includes(n) || (x.who ?? '').toLowerCase().includes(n))); }, [allRooms, roomF, q]);
  const halls = useMemo(() => ranged.filter((x) => inFilter(hallF.location, campuses.find((c) => c.id === x.campus)?.name) && inFilter(hallF.band, bandOf(x))
    && (!hallF.needs?.length || hallF.needs.some((n) => needsOf(x).includes(n)))), [ranged, hallF, campuses]);
  const empty = useEmpty((s) => s.on);
  const nav = useNavigate();
  const back = () => setHid('all');
  const pickHall = (id: string) => { setHid(id); setRoomF({}); setQ(''); const nh = HALLS.find((x) => x.id === id); if (nh) setBlock(nh.blocks[0]); };

  /* Context-aware filters: the overall view filters properties, a property's plan filters its rooms. */
  const count = <T,>(xs: T[], f: (x: T) => boolean) => xs.filter(f).length;
  const hallFields: Field[] = [
    { id: 'location', label: 'Location', options: campuses.map((c) => ({ value: c.name, count: count(HALLS, (x) => x.campus === c.id) })) },
    { id: 'band', label: 'Occupancy', options: BANDS.map((b) => ({ value: b, count: count(ranged, (x) => bandOf(x) === b) })) },
    { id: 'needs', label: 'Beds', options: NEEDS.map((n) => ({ value: n, count: count(ranged, (x) => needsOf(x).includes(n)) })) },
  ];
  const roomFields: Field[] = [
    { id: 'status', label: 'Status', options: ORDER.map((st) => ({ value: ST[st].label, tone: ST[st].tone, count: count(allRooms, (x) => x.st === st) })) },
    { id: 'floor', label: 'Floor', options: FLOORS.map(([f]) => ({ value: f, count: count(allRooms, (x) => x.floor === f) })).filter((o) => o.count) },
  ];

  /* The Overview / Reports number band: each figure with a thin meter in its status colour, out of the beds in view.
     The page shows every property in view; the side panel shows the open property's own. */
  const statsOf = (t: Hall, sub: string): StatItem[] => {
    const share = (n: number) => `${t.beds ? Math.round((n / t.beds) * 100) : 0}% of beds`;
    const held = heldOf(t);
    return [
      { label: 'Beds', value: t.beds.toLocaleString('en-GB'), sub,
        meter: { kind: 'split', parts: [{ label: 'In residence', value: t.inRes, color: '#16A34A' }, { label: 'Arriving', value: t.arriving, color: '#2563EB' }, { label: 'Held', value: held, color: '#F59E0B' }, { label: 'Vacant', value: t.vacant, color: '#F97316' }, { label: 'Blocked', value: t.blocked, color: '#A3A3A3' }] } },
      { label: 'In residence', value: t.inRes.toLocaleString('en-GB'), sub: share(t.inRes), meter: { kind: 'progress', value: t.inRes, max: t.beds || 1, color: '#16A34A', tip: share(t.inRes) } },
      { label: 'Arriving', value: t.arriving.toLocaleString('en-GB'), sub: share(t.arriving), meter: { kind: 'progress', value: t.arriving, max: t.beds || 1, color: '#2563EB', tip: share(t.arriving) } },
      { label: 'Vacant', value: t.vacant.toLocaleString('en-GB'), sub: share(t.vacant), meter: { kind: 'progress', value: t.vacant, max: t.beds || 1, color: '#F97316', tip: share(t.vacant) } },
      { label: 'Blocked', value: t.blocked.toLocaleString('en-GB'), sub: share(t.blocked), meter: { kind: 'progress', value: t.blocked, max: t.beds || 1, color: '#A3A3A3', tip: share(t.blocked) } },
    ];
  };
  const all = halls.reduce<Hall>((a, x) => ({ ...a, beds: a.beds + x.beds, inRes: a.inRes + x.inRes, arriving: a.arriving + x.arriving, vacant: a.vacant + x.vacant, blocked: a.blocked + x.blocked }),
    { id: 'all', name: 'All properties', campus: '', beds: 0, inRes: 0, arriving: 0, vacant: 0, blocked: 0, blocks: [] });
  const stats = statsOf(all, `${halls.length} ${halls.length === 1 ? 'property' : 'properties'}`);

  /* Empty-states demo: no halls yet, so no plan to show. */
  if (empty) return (
    <>
      <PageHeader icon={Grid3x3} title="Occupancy" crumbs={[SECTION]} />
      <EmptyArea art="noData" icon={Grid3x3} title="No rooms to show yet" sub="Add properties and rooms to see who lives where.">
        <Button variant="primary" onClick={() => nav('/properties')}>Create a property</Button>
      </EmptyArea>
    </>
  );
  /* The standard multi-select filters (checkbox popover, Clear and Apply), one per field. */
  const filterEls = (fields: Field[], val: Filters, set: (v: Filters) => void) => fields.map((f) => (
    <MultiFilter key={f.id} label={f.label} width={Math.max(220, ...f.options.map((o) => o.value.length * 8 + 120))} value={val[f.id] ?? []}
      options={f.options} onChange={(v) => set({ ...val, [f.id]: v })} />
  ));
  const fileBase = 'all-properties';
  const hallNav = h ? listNav(halls, (x) => x.id === h.id, (x) => pickHall(x.id)) : undefined;
  return (
    <>
      {/* The date range leads the controls level with the heading, as the page's main control, then the property
          filters. Clicking a property opens its plan in a wide side panel (70% of the screen) over the table, so
          the list stays where it was; ?p keeps it in the URL so browser back closes it. */}
      <PageHeader icon={Grid3x3} title="Occupancy" crumbs={[SECTION]}
        introEnd={<>
          <DateRangePicker value={range} onChange={setRange} presets={PRESETS} />
          <span aria-hidden className="w-px h-5 bg-[#E5E5E5] shrink-0" />
          {filterEls(hallFields, hallF, setHallF)}
        </>}>
        <Button variant="primary" icon={DownloadSimple} onClick={() => toast.success(`${fileBase}-occupancy-${range.from.toISOString().slice(0, 10)}-to-${range.to.toISOString().slice(0, 10)}.csv exported`)}>Export</Button>
      </PageHeader>

      <div data-fill className="flex-1 overflow-auto">
        {/* The table's header draws its own top line, so the strip drops its bottom one (else the two stack into a 2px rule). */}
        <div className="px-[var(--tx,16px)]"><StatStrip bleed compact items={stats} className="border-b-0" /></div>
        <Table cols={HALL_COLS} rows={halls} onRow={(x) => pickHall(x.id)} columns={false}
          empty={<EmptyArea art="nothingToShow" icon={Buildings} title="No properties match" sub="Clear a filter to see more." />} />
      </div>

      <Sheet open={!!h} onClose={back} title="Property" width="max(70vw, 1124px)" nav={hallNav}
        more={<Button variant="primary" icon={DownloadSimple} onClick={() => h && toast.success(`${h.name.toLowerCase().replace(/\W+/g, '-')}-occupancy-${range.from.toISOString().slice(0, 10)}-to-${range.to.toISOString().slice(0, 10)}.csv exported`)}>Export</Button>}>
        {h && (
          /* The panel is 70% of the screen but never narrower than the timeline's 1080px (+ 40px padding, 2px border), so the
             chart fits without scrolling sideways. The whole panel scrolls, and the month header sticks to its top. */
          <div className="flex flex-col gap-5 [&>[data-sheet-hero]]:pb-0">
            <SheetHero name={h.name} icon={Buildings} lead={<img src={hallPhoto(h.id)} alt="" className="size-14 shrink-0 rounded-xl object-cover bg-[#F5F5F5]" />} meta={[campuses.find((c) => c.id === h.campus)?.name, `${h.blocks.length} ${h.blocks.length === 1 ? 'block' : 'blocks'}`, `${h.beds.toLocaleString('en-GB')} beds`].filter(Boolean).join(' · ')}
              tags={<>
                {/* The figures the number band used to show, as tags in the timeline key's colours; zero counts drop out. */}
                <Pill tone="green">{h.inRes.toLocaleString('en-GB')} in residence</Pill>
                {h.arriving > 0 && <Pill tone="blue">{h.arriving.toLocaleString('en-GB')} arriving</Pill>}
                {heldOf(h) > 0 && <Pill tone="amber">{heldOf(h)} held</Pill>}
                {h.vacant > 0 && <Pill tone="orange">{h.vacant} vacant</Pill>}
                {h.blocked > 0 && <Pill tone="grey">{h.blocked} blocked</Pill>}
              </>} />
            {/* A full-width rule splits the property's header from the plan's controls. */}
            <div aria-hidden className="-mx-5 h-px bg-[#E5E5E5]" />
            {/* Search on the left; the block, the room filters and the Timeline / Grid toggle on the right. */}
            <div className="flex items-center gap-3">
              <div className="w-[260px] min-w-[140px] shrink [&>label]:!w-full"><SearchInput value={q} onChange={setQ} placeholder="Room or resident" /></div>
              <div className="ml-auto flex items-center gap-3">
                {h.blocks.length > 1 && <SelectFilter icon={Stack} width={180} value={block} onChange={setBlock} options={h.blocks.map((b) => ({ value: b }))} />}
                {filterEls(roomFields, roomF, setRoomF)}
                <Seg value={view} onChange={setView} options={['Timeline', 'Grid']} className="w-[180px]" />
              </div>
            </div>
            <div>
        {/* The block's name and the key stick to the panel's top (its body has 20px top padding), the chart's month header under them. */}
        <div className="sticky top-[-20px] z-[6] -mx-5 px-5 h-12 bg-white flex items-center">
          <div className="text-sm leading-5 font-medium text-[#0A0A0A]">{block} · {h.id === 'ust' && block === 'Block G' ? 'Ground and first floor' : `${FLOORS.length} floors`}</div>
          <div className="ml-auto flex items-center gap-4">
            {ORDER.map((st) => <span key={st} className="flex items-center gap-1.5 text-xs leading-4 text-[#737373]"><Dot st={st} />{st === 'arriving' && view === 'Timeline' ? 'Booked' : ST[st].label}</span>)}
            {view === 'Timeline' && <span className="flex items-center gap-1.5 text-xs leading-4 text-[#737373]"><span aria-hidden className="inline-block size-2 rounded-full" style={{ background: TIMELINE_EXTRA.dot }} />{TIMELINE_EXTRA.label}</span>}
            {view === 'Timeline' && TODAY >= range.from && TODAY <= range.to && <span className="flex items-center gap-1.5 text-xs leading-4 text-[#737373]"><span aria-hidden className="inline-block w-px h-3 bg-[#2563EB]" />Today</span>}
          </div>
        </div>

          {view === 'Timeline' ? (
            <div>
              <OccupancyTimeline panel rooms={rooms} floors={FLOORS.map(([f]) => f)} range={range} hall={h.name} />
            </div>
          ) : (
          <div className="py-3 flex flex-col gap-4">
            {FLOORS.map(([floor]) => {
              const fr = rooms.filter((x) => x.floor === floor);
              if (!fr.length) return null;
              return (
                <section key={floor} className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-2"><h3 className="font-mono text-xs leading-4 font-medium uppercase tracking-[0.48px] text-[#0A0A0A]">{floor}</h3><span className="text-xs leading-4 text-[#737373]">{summary(fr)}</span></div>
                  <div className="grid grid-cols-10 gap-2">
                    {fr.map((x) => (
                      <button key={x.code} type="button" aria-label={`${x.code} · ${ST[x.st].label}${x.who ? ` · ${x.who}` : ''}`} onClick={() => toast(`${h.name} · ${x.code}`, { description: x.who ? `${ST[x.st].label} · ${x.who}` : ST[x.st].label })}
                        className={cx('h-14 rounded-lg border px-2.5 py-2 flex flex-col justify-between text-left hover:border-[#A3A3A3] hover:shadow-[0_1px_2px_rgba(0,0,0,0.06)] transition-[border-color,box-shadow] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring', ST[x.st].tile)}>
                        <span className="flex items-center gap-1.5"><span className={cx('font-mono text-xs leading-4 font-medium uppercase', x.st === 'vacant' ? 'text-[#737373]' : 'text-[#0A0A0A]')}>{x.code}</span><span className="ml-auto flex"><Dot st={x.st} /></span></span>
                        <span className={cx('truncate text-xs leading-4', x.who ? 'text-[#404040]' : 'text-[#A3A3A3]')}>{x.who ?? (x.st === 'held' ? 'Held' : ST[x.st].label)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          )}
            </div>
          </div>
        )}
      </Sheet>
    </>
  );
}
