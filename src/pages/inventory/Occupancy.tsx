import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Buildings, CalendarRange, CaretDown, CircleDashed, Grid3x3, Hourglass, House, Prohibit, SignIn, Stack, type Icon } from '../../components/icons';
import { Button, MultiFilter, PageHeader, cx, type Tone } from '../../components/ui';
import { Menu } from './common';
import { useEmpty } from '../../data/empty';
import { HALL_OCC } from '../../data/occupancy';
import { EmptyArea } from '../allocations/common';
import { useNavigate } from 'react-router-dom';
import { DownloadSimple } from '../../components/icons';

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

const ST: Record<St, { label: string; icon: Icon; tile: string; code: string; who: string; swatch: string; tone: Tone }> = {
  in: { label: 'In residence', icon: House, tile: 'bg-[#E8F7EE] border-transparent', code: 'text-[#087A43]', who: 'text-[#404040]', swatch: 'bg-[#E8F7EE] border-[#087A43]', tone: 'green' },
  arriving: { label: 'Arriving', icon: SignIn, tile: 'bg-[#EFF6FF] border-transparent', code: 'text-[#1F45E0]', who: 'text-[#404040]', swatch: 'bg-[#EFF6FF] border-[#1F45E0]', tone: 'blue' },
  held: { label: 'Held for offer', icon: Hourglass, tile: 'bg-[#FFF6E0] border-transparent', code: 'text-[#9A5B00]', who: 'text-[#404040]', swatch: 'bg-[#FFF6E0] border-[#9A5B00]', tone: 'amber' },
  vacant: { label: 'Vacant', icon: CircleDashed, tile: 'bg-white border-line', code: 'text-[#737373]', who: 'text-[#737373]', swatch: 'bg-white border-gray-400', tone: 'grey' },
  blocked: { label: 'Blocked', icon: Prohibit, tile: 'bg-[#F5F5F5] border-transparent', code: 'text-[#525252]', who: 'text-[#404040]', swatch: 'bg-[#F5F5F5] border-gray-500', tone: 'grey' },
};
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
  const block = h.blocks.includes(blockSel) ? blockSel : h.blocks[0];
  const rooms = useMemo(() => roomsFor(h, block).filter((x) => !statusF.length || statusF.includes(ST[x.st].label)), [h, block, statusF]);
  const empty = useEmpty((s) => s.on);
  const nav = useNavigate();
  const pickHall = (id: string) => { const nh = HALLS.find((x) => x.id === id)!; setHid(id); setBlock(nh.blocks[0]); };

  const tiles: [string, number, string][] = [
    ['Beds', h.beds, 'text-[#0A0A0A]'], ['In residence', h.inRes, 'text-[#087A43]'], ['Arriving this week', h.arriving, 'text-[#1F45E0]'],
    ['Vacant', h.vacant, 'text-[#E5530C]'], ['Blocked', h.blocked, 'text-[#0A0A0A]'],
  ];

  /* Empty-states demo: no halls yet, so no plan to show. */
  if (empty) return (
    <>
      <PageHeader icon={Grid3x3} title="Occupancy" crumbs={['Inventory']} />
      <EmptyArea art="rooms" icon={Grid3x3} title="No rooms to show yet" sub="Add a property and its rooms, and who lives where shows here.">
        <Button variant="primary" onClick={() => nav('/inventory/properties')}>Add a property</Button>
      </EmptyArea>
    </>
  );
  return (
    <>
      <PageHeader icon={Grid3x3} title="Occupancy" crumbs={['Inventory']}>
        <Menu width={140} trigger={(o) => <Button variant="control" icon={CalendarRange} onClick={o}>{year}</Button>} items={['2025/26', '2026/27', '2027/28'].map((y) => ({ label: y, onClick: () => setYear(y) }))} />
        <Button icon={DownloadSimple} onClick={() => toast.success(`${h.name.toLowerCase().replace(/\W+/g, '-')}-occupancy-${year.replace('/', '-')}.csv exported`)}>Export</Button>
      </PageHeader>

      {/* Connect toolbar (as Properties, 3884:39809): one 68px row, 16/24 padding, every control 34px.
          Hall and block pick what the plan shows on the left; the Status filter sits on the right. */}
      <div className="shrink-0 px-6 py-4 flex items-center gap-3">
        <Menu align="left" width={240} trigger={(o) => (
          <Button variant="control" icon={Buildings} onClick={o}>{h.name}<span className="text-[#737373] font-mono tabular-nums">{h.beds}</span><CaretDown size={16} strokeWidth={1.75} className="opacity-60" /></Button>
        )} items={HALLS.map((x) => ({ label: `${x.name} · ${x.beds} beds`, onClick: () => pickHall(x.id) }))} />
        {h.blocks.length > 1 && (
          <Menu align="left" width={180} trigger={(o) => (
            <Button variant="control" icon={Stack} onClick={o}>{block}<CaretDown size={16} strokeWidth={1.75} className="opacity-60" /></Button>
          )} items={h.blocks.map((b) => ({ label: b, onClick: () => setBlock(b) }))} />
        )}
        <div className="ml-auto flex items-center gap-3">
          <MultiFilter label="Status" width={220} value={statusF} onChange={setStatusF} options={ORDER.map((st) => ({ value: ST[st].label, tone: ST[st].tone }))} />
        </div>
      </div>

      <div data-fill className="flex-1 overflow-auto">
        <div className="px-[var(--tx,16px)] pt-4 grid grid-cols-5 gap-3">
          {tiles.map(([label, v, c]) => (
            <div key={label} className="rounded-xl border border-line bg-white px-3.5 py-2.5 flex flex-col gap-0.5">
              <div className="text-xs leading-4 font-medium text-[#737373]">{label}</div>
              <div className={cx('text-xl leading-7 font-semibold tabular-nums', c)}>{v.toLocaleString('en-GB')}</div>
            </div>
          ))}
        </div>

        <div className="px-[var(--tx,16px)] pt-3.5 flex items-center">
          <div className="text-sm leading-5 font-semibold text-[#0A0A0A]">{block} · {h.id === 'ust' && block === 'Block G' ? 'Ground and first floor' : `${FLOORS.length} floors`}</div>
          <div className="ml-auto flex items-center gap-4">
            {ORDER.map((s) => { const I = ST[s].icon; return <span key={s} className="flex items-center gap-1.5 text-xs leading-4 text-[#737373]"><I size={14} className={ST[s].code} />{ST[s].label}</span>; })}
          </div>
        </div>

          <div className="px-[var(--tx,16px)] py-3 flex flex-col gap-4">
            {FLOORS.map(([floor]) => {
              const fr = rooms.filter((x) => x.floor === floor);
              if (!fr.length) return null;
              return (
                <section key={floor} className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-2"><h3 className="text-sm leading-5 font-semibold text-[#0A0A0A]">{floor}</h3><span className="text-xs leading-4 text-[#737373]">{summary(fr)}</span></div>
                  <div className="grid grid-cols-10 gap-2">
                    {fr.map((x) => (
                      <button key={x.code} type="button" aria-label={`${x.code} · ${ST[x.st].label}${x.who ? ` · ${x.who}` : ''}`} onClick={() => toast(`${h.name} · ${x.code}`, { description: x.who ? `${ST[x.st].label} · ${x.who}` : ST[x.st].label })}
                        className={cx('h-14 rounded-lg border px-2 py-1.5 flex flex-col gap-0.5 text-left text-xs leading-4 hover:ring-2 hover:ring-primary/20 transition-shadow', ST[x.st].tile)}>
                        <span className={cx('font-semibold flex items-center gap-1', ST[x.st].code)}>{(() => { const I = ST[x.st].icon; return <I size={12} className="shrink-0" />; })()}{x.code}</span>
                        <span className={cx('truncate', ST[x.st].who)}>{x.who ?? (x.st === 'held' ? 'Held' : ST[x.st].label)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
      </div>
    </>
  );
}
