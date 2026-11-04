import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarRange, Grid3x3, List } from '../../components/icons';
import { Button, FilterButton, PageHeader, Pill, Table, Tabs, cx, type Tone } from '../../components/ui';
import { Tabs as UITabs, TabsList, TabsTrigger } from '../../components/shadcn/tabs';
import { Menu } from './common';
import { DownloadSimple, LayoutGrid } from '../../components/icons';

/* Occupancy, floor plan (frame 3355:105349): hall tabs with bed counts, five stat tiles, then one
   block's floors as rows of room tiles coloured by status. "List" shows the same rooms as a table. */

type St = 'in' | 'arriving' | 'held' | 'vacant' | 'blocked';
type Room = { code: string; st: St; who?: string; floor: string };
type Hall = { id: string; name: string; beds: number; inRes: number; arriving: number; vacant: number; blocked: number; blocks: string[] };

const HALLS: Hall[] = [
  { id: 'ust', name: 'Ustinov College', beds: 600, inRes: 371, arriving: 211, vacant: 12, blocked: 6, blocks: ['Block G', 'Block H', 'Block J'] },
  { id: 'col', name: 'Collingwood', beds: 481, inRes: 455, arriving: 14, vacant: 9, blocked: 3, blocks: ['Block A', 'Block B', 'Block C'] },
  { id: 'stm', name: 'St Mary’s', beds: 144, inRes: 139, arriving: 2, vacant: 3, blocked: 0, blocks: ['Main house', 'Garden wing'] },
  { id: 'jb', name: 'Josephine Butler', beds: 450, inRes: 398, arriving: 40, vacant: 10, blocked: 2, blocks: ['Block A', 'Block B'] },
  { id: 'vm', name: 'Van Mildert', beds: 557, inRes: 520, arriving: 21, vacant: 14, blocked: 2, blocks: ['Block A', 'Block B', 'Block C'] },
];

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

const ST: Record<St, { label: string; tile: string; code: string; who: string; swatch: string; tone: Tone }> = {
  in: { label: 'In residence', tile: 'bg-[#E8F7EE] border-transparent', code: 'text-[#0B8A4C]', who: 'text-[#374151]', swatch: 'bg-[#E8F7EE] border-[#0B8A4C]', tone: 'green' },
  arriving: { label: 'Arriving', tile: 'bg-[#EFF6FF] border-transparent', code: 'text-[#1F45E0]', who: 'text-[#374151]', swatch: 'bg-[#EFF6FF] border-[#1F45E0]', tone: 'blue' },
  held: { label: 'Held for offer', tile: 'bg-[#FFF6E0] border-transparent', code: 'text-[#C47A00]', who: 'text-[#374151]', swatch: 'bg-[#FFF6E0] border-[#C47A00]', tone: 'amber' },
  vacant: { label: 'Vacant', tile: 'bg-white border-line', code: 'text-gray-400', who: 'text-gray-400', swatch: 'bg-white border-gray-300', tone: 'grey' },
  blocked: { label: 'Blocked', tile: 'bg-[#F3F4F6] border-transparent', code: 'text-gray-500', who: 'text-[#374151]', swatch: 'bg-[#F3F4F6] border-gray-500', tone: 'grey' },
};
const ORDER: St[] = ['in', 'arriving', 'held', 'vacant', 'blocked'];

function summary(rooms: Room[]) {
  const n = (s: St) => rooms.filter((x) => x.st === s).length;
  return [`${n('in')} in`, `${n('arriving')} arriving`, n('held') ? `${n('held')} held` : '', `${n('vacant')} vacant`].filter(Boolean).join(' · ');
}

export function OccupancyPage() {
  const [hid, setHid] = useState('ust');
  const [year, setYear] = useState('2026/27');
  const [view, setView] = useState<'plan' | 'list'>('plan');
  const h = HALLS.find((x) => x.id === hid)!;
  const [filters, setFilters] = useState<Record<string, string>>({ block: 'Block G' });
  const block = h.blocks.includes(filters.block) ? filters.block : h.blocks[0];
  const status = ORDER.find((s) => ST[s].label === filters.status);
  const rooms = useMemo(() => roomsFor(h, block).filter((x) => !status || x.st === status), [h, block, status]);
  const pickHall = (id: string) => { const nh = HALLS.find((x) => x.id === id)!; setHid(id); setFilters((f) => ({ ...f, block: nh.blocks[0] })); };

  const tiles: [string, number, string][] = [
    ['Beds', h.beds, 'text-[#111827]'], ['In residence', h.inRes, 'text-[#0B8A4C]'], ['Arriving this week', h.arriving, 'text-[#1F45E0]'],
    ['Vacant', h.vacant, 'text-[#E5530C]'], ['Blocked', h.blocked, 'text-[#111827]'],
  ];

  return (
    <>
      <PageHeader icon={Grid3x3} title="Occupancy" crumbs={['Inventory']}>
        <Menu width={140} trigger={(o) => <Button icon={CalendarRange} onClick={o}>{year}</Button>} items={['2025/26', '2026/27', '2027/28'].map((y) => ({ label: y, onClick: () => setYear(y) }))} />
        <Button icon={DownloadSimple} onClick={() => toast.success(`${h.name.toLowerCase().replace(/\W+/g, '-')}-occupancy-${year.replace('/', '-')}.csv exported`)}>Export</Button>
      </PageHeader>

      <div className="h-[52px] shrink-0 px-4 flex items-center gap-3 border-b border-[#F3F4F6]">
        <Tabs value={hid} onChange={pickHall} tabs={HALLS.map((x) => ({ id: x.id, label: x.name, count: x.beds }))} />
        <div className="ml-auto flex items-center gap-3">
          <FilterButton defs={[{ id: 'block', label: 'Block', options: h.blocks }, { id: 'status', label: 'Status', options: ORDER.map((s) => ST[s].label) }]} value={filters} onChange={setFilters} />
          <UITabs value={view} onValueChange={(v) => setView(v as typeof view)}>
            <TabsList aria-label="View">
              {([['plan', 'Floor plan', LayoutGrid], ['list', 'List', List]] as const).map(([id, label, I]) => (
                <TabsTrigger key={id} value={id} className="gap-1.5 text-xs"><I size={12} />{label}</TabsTrigger>
              ))}
            </TabsList>
          </UITabs>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-5 pt-4 grid grid-cols-5 gap-3">
          {tiles.map(([label, v, c]) => (
            <div key={label} className="rounded-xl border border-line bg-white px-3.5 py-2.5 flex flex-col gap-0.5">
              <div className="text-xs leading-4 font-medium text-[#646A78]">{label}</div>
              <div className={cx('text-xl leading-7 font-semibold tabular-nums', c)}>{v.toLocaleString('en-GB')}</div>
            </div>
          ))}
        </div>

        <div className="px-5 pt-3.5 flex items-center">
          <div className="text-sm leading-5 font-semibold text-[#111827]">{block} · {h.id === 'ust' && block === 'Block G' ? 'Ground and first floor' : `${FLOORS.length} floors`}</div>
          <div className="ml-auto flex items-center gap-4">
            {ORDER.map((s) => <span key={s} className="flex items-center gap-1.5 text-xs leading-4 text-[#646A78]"><span className={cx('size-2.5 rounded-[3px] border', ST[s].swatch)} />{ST[s].label}</span>)}
          </div>
        </div>

        {view === 'plan' ? (
          <div className="px-5 py-3 flex flex-col gap-4">
            {FLOORS.map(([floor]) => {
              const fr = rooms.filter((x) => x.floor === floor);
              if (!fr.length) return null;
              return (
                <section key={floor} className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-2"><h3 className="text-sm leading-5 font-semibold text-[#111827]">{floor}</h3><span className="text-xs leading-4 text-[#646A78]">{summary(fr)}</span></div>
                  <div className="grid grid-cols-10 gap-2">
                    {fr.map((x) => (
                      <button key={x.code} type="button" onClick={() => toast(`${h.name} · ${x.code}`, { description: x.who ? `${ST[x.st].label} · ${x.who}` : ST[x.st].label })}
                        className={cx('h-14 rounded-lg border px-2 py-1.5 flex flex-col gap-0.5 text-left text-xs leading-4 hover:ring-2 hover:ring-primary/20 transition-shadow', ST[x.st].tile)}>
                        <span className={cx('font-semibold', ST[x.st].code)}>{x.code}</span>
                        {x.st !== 'held' && <span className={cx('truncate', ST[x.st].who)}>{x.who ?? ST[x.st].label}</span>}
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="pt-3">
            <Table footer={false} rows={rooms.map((x) => ({ ...x, id: x.code }))} summary={`${rooms.length} rooms`}
              cols={[
                { key: 'code', label: 'Room', render: (x) => <span className="font-medium">{x.code}</span> },
                { key: 'floor', label: 'Floor', render: (x) => x.floor },
                { key: 'st', label: 'Status', render: (x) => <Pill tone={ST[x.st].tone}>{ST[x.st].label}</Pill> },
                { key: 'who', label: 'Resident', render: (x) => x.who ?? <span className="text-gray-400">—</span> },
              ]} />
          </div>
        )}
      </div>
    </>
  );
}
