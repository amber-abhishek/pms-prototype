import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Buildings, CalendarRange, Grid3x3, Stack } from '../../components/icons';
import { Button, MultiFilter, PageHeader, SelectFilter, StatStrip, cx, type StatItem, type Tone } from '../../components/ui';
import { useEmpty } from '../../data/empty';
import { HALL_OCC } from '../../data/occupancy';
import { EmptyArea } from '../allocations/common';
import { useNavigate } from 'react-router-dom';
import { DownloadSimple } from '../../components/icons';
import { Seg } from './common';
import { OccupancyTimeline, TIMELINE_EXTRA } from './OccupancyTimeline';

/* Occupancy, floor plan (frame 3355:105349): hall tabs with bed counts, five stat tiles, then one
   block's floors as rows of room tiles coloured by status. */

type St = 'in' | 'arriving' | 'held' | 'vacant' | 'blocked';
type Room = { code: string; st: St; who?: string; floor: string };
type Hall = { id: string; name: string; beds: number; inRes: number; arriving: number; vacant: number; blocked: number; blocks: string[] };

/* Bed counts come from data/occupancy (HALL_OCC), the same rows Reports › Occupancy reads; this page adds its names and blocks. */
const HALL_EXTRA: Record<string, { name: string; blocks: string[] }> = {
  ust: { name: 'Ustinov College', blocks: ['Block G', 'Block H', 'Block J'] },
  col: { name: 'Collingwood', blocks: ['Block A', 'Block B', 'Block C'] },
  stm: { name: 'St Mary’s', blocks: ['Main house', 'Garden wing'] },
  jb: { name: 'Josephine Butler', blocks: ['Block A', 'Block B'] },
  vm: { name: 'Van Mildert', blocks: ['Block A', 'Block B', 'Block C'] },
};
const HALLS: Hall[] = ['ust', 'col', 'stm', 'jb', 'vm'].map((id) => {
  const o = HALL_OCC.find((x) => x.id === id)!;
  return { id, ...HALL_EXTRA[id], beds: o.beds, inRes: o.res, arriving: o.arr, vacant: o.vac, blocked: o.blk };
});

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

export function OccupancyPage() {
  const [hid, setHid] = useState('ust');
  const [year, setYear] = useState('2026/27');
  const h = HALLS.find((x) => x.id === hid)!;
  /* Block is a picker (the plan shows one block at a time), not a filter; Status is the one filter and starts empty. */
  const [blockSel, setBlock] = useState('Block G');
  const [statusF, setStatusF] = useState<string[]>([]);
  const [view, setView] = useState<'Grid' | 'Timeline'>('Timeline');
  const block = h.blocks.includes(blockSel) ? blockSel : h.blocks[0];
  const rooms = useMemo(() => roomsFor(h, block).filter((x) => !statusF.length || statusF.includes(ST[x.st].label)), [h, block, statusF]);
  const empty = useEmpty((s) => s.on);
  const nav = useNavigate();
  const pickHall = (id: string) => { const nh = HALLS.find((x) => x.id === id)!; setHid(id); setBlock(nh.blocks[0]); };

  /* The Overview / Reports number band: each figure with a thin meter in its status colour, out of the hall's beds. */
  const share = (n: number) => `${Math.round((n / h.beds) * 100)}% of beds`;
  const held = Math.max(0, h.beds - h.inRes - h.arriving - h.vacant - h.blocked);
  const stats: StatItem[] = [
    { label: 'Beds', value: h.beds.toLocaleString('en-GB'), sub: `${h.blocks.length} ${h.blocks.length === 1 ? 'block' : 'blocks'}`,
      meter: { kind: 'split', parts: [{ label: 'In residence', value: h.inRes, color: '#16A34A' }, { label: 'Arriving', value: h.arriving, color: '#2563EB' }, { label: 'Held', value: held, color: '#F59E0B' }, { label: 'Vacant', value: h.vacant, color: '#F97316' }, { label: 'Blocked', value: h.blocked, color: '#A3A3A3' }] } },
    { label: 'In residence', value: h.inRes.toLocaleString('en-GB'), sub: share(h.inRes), meter: { kind: 'progress', value: h.inRes, max: h.beds, color: '#16A34A', tip: share(h.inRes) } },
    { label: 'Arriving this week', value: h.arriving.toLocaleString('en-GB'), sub: share(h.arriving), meter: { kind: 'progress', value: h.arriving, max: h.beds, color: '#2563EB', tip: share(h.arriving) } },
    { label: 'Vacant', value: h.vacant.toLocaleString('en-GB'), sub: share(h.vacant), meter: { kind: 'progress', value: h.vacant, max: h.beds, color: '#F97316', tip: share(h.vacant) } },
    { label: 'Blocked', value: h.blocked.toLocaleString('en-GB'), sub: share(h.blocked), meter: { kind: 'progress', value: h.blocked, max: h.beds, color: '#A3A3A3', tip: share(h.blocked) } },
  ];

  /* Empty-states demo: no halls yet, so no plan to show. */
  if (empty) return (
    <>
      <PageHeader icon={Grid3x3} title="Occupancy" crumbs={['Inventory']} />
      <EmptyArea art="noData" icon={Grid3x3} title="No rooms to show yet" sub="Add properties and rooms to see who lives where.">
        <Button variant="primary" onClick={() => nav('/inventory/properties')}>Add a property</Button>
      </EmptyArea>
    </>
  );
  return (
    <>
      <PageHeader icon={Grid3x3} title="Occupancy" crumbs={['Inventory']}>
        <SelectFilter icon={CalendarRange} width={160} value={year} onChange={setYear} options={['2025/26', '2026/27', '2027/28'].map((y) => ({ value: y }))} />
        <Button icon={DownloadSimple} onClick={() => toast.success(`${h.name.toLowerCase().replace(/\W+/g, '-')}-occupancy-${year.replace('/', '-')}.csv exported`)}>Export</Button>
      </PageHeader>

      {/* Connect toolbar (as Properties, 3884:39809): one 68px row, 16/24 padding, every control 34px.
          Hall and block pick what the plan shows on the left; the Status filter sits on the right. */}
      <div className="shrink-0 px-6 py-4 flex items-center gap-3">
        <SelectFilter icon={Buildings} width={260} value={h.id} onChange={pickHall} suffix={<span className="text-[#737373] font-mono tabular-nums">{h.beds}</span>}
          options={HALLS.map((x) => ({ value: x.id, label: x.name, meta: x.beds }))} />
        {h.blocks.length > 1 && <SelectFilter icon={Stack} width={180} value={block} onChange={setBlock} options={h.blocks.map((b) => ({ value: b }))} />}
        <div className="ml-auto flex items-center gap-3">
          <Seg value={view} onChange={setView} options={['Timeline', 'Grid']} className="w-[180px]" />
          <MultiFilter label="Status" width={220} value={statusF} onChange={setStatusF} options={ORDER.map((st) => ({ value: ST[st].label, tone: ST[st].tone }))} />
        </div>
      </div>

      <div data-fill className="flex-1 overflow-auto">
        <div className="px-[var(--tx,16px)]"><StatStrip bleed items={stats} /></div>

        <div className="px-[var(--tx,16px)] pt-5 flex items-center">
          <div className="text-sm leading-5 font-medium text-[#0A0A0A]">{block} · {h.id === 'ust' && block === 'Block G' ? 'Ground and first floor' : `${FLOORS.length} floors`}</div>
          <div className="ml-auto flex items-center gap-4">
            {ORDER.map((st) => <span key={st} className="flex items-center gap-1.5 text-xs leading-4 text-[#737373]"><Dot st={st} />{st === 'arriving' && view === 'Timeline' ? 'Booked' : ST[st].label}</span>)}
            {view === 'Timeline' && <span className="flex items-center gap-1.5 text-xs leading-4 text-[#737373]"><span aria-hidden className="inline-block size-2 rounded-full" style={{ background: TIMELINE_EXTRA.dot }} />{TIMELINE_EXTRA.label}</span>}
            {view === 'Timeline' && year === '2026/27' && <span className="flex items-center gap-1.5 text-xs leading-4 text-[#737373]"><span aria-hidden className="inline-block w-px h-3 bg-[#2563EB]" />Today</span>}
          </div>
        </div>

          {view === 'Timeline' ? (
            <div className="px-[var(--tx,16px)] py-3 pb-6">
              <OccupancyTimeline rooms={rooms} floors={FLOORS.map(([f]) => f)} year={year} hall={h.name} />
            </div>
          ) : (
          <div className="px-[var(--tx,16px)] py-3 flex flex-col gap-4">
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
    </>
  );
}
