import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from '../../components/icons';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/shadcn/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/shadcn/tooltip';
import { Avatar, Button, Pill, cx, type Tone } from '../../components/ui';
import { useRms } from '../../data/residents';

/* Occupancy as a Gantt (exploration, 2026-11-17): rooms down the side, grouped by floor; the academic year across the
   top (Sep → Aug) with month rules and a "today" line; each tenancy, hold or block is a bar in its status tint.
   Rows don't react to hover (they do nothing); a bar opens a details card. The bars are dummy data made steadily
   from each room's status today, so the timeline agrees with the grid. */

export type TlStatus = 'in' | 'arriving' | 'held' | 'vacant' | 'blocked';
export type TlRoom = { code: string; st: TlStatus; who?: string; floor: string };
type Kind = 'in' | 'booked' | 'held' | 'blocked' | 'summer';
type Bar = { kind: Kind; from: Date; to: Date; label: string; who?: string };

const BAR: Record<Kind, { cls: string; text: string; name: string; tone: Tone }> = {
  in: { cls: 'bg-[#F0FDF4] border-[#16A34A]/30 hover:border-[#16A34A]/60', text: 'text-[#166534]', name: 'In residence', tone: 'green' },
  booked: { cls: 'bg-[#EFF6FF] border-[#2563EB]/30 hover:border-[#2563EB]/60', text: 'text-[#1E40AF]', name: 'Booked', tone: 'blue' },
  held: { cls: 'bg-[#FFFBEB] border-dashed border-[#F59E0B]/50 hover:border-[#F59E0B]', text: 'text-[#92400E]', name: 'Held for offer', tone: 'amber' },
  blocked: { cls: 'border-[#E5E5E5] hover:border-[#A3A3A3] bg-[repeating-linear-gradient(135deg,#F5F5F5_0_6px,#EBEBEB_6px_12px)]', text: 'text-[#737373]', name: 'Blocked', tone: 'grey' },
  summer: { cls: 'bg-[#F5F3FF] border-[#8B5CF6]/30 hover:border-[#8B5CF6]/60', text: 'text-[#5B21B6]', name: 'Summer let', tone: 'purple' },
};
export const TIMELINE_EXTRA = { label: 'Summer let', dot: '#8B5CF6' };

const NAMES = ['S. Patel', 'O. Wright', 'E. Morgan', 'J. Okafor', 'L. Moreau', 'C. Byrne'];
const MONTHS = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
const DAY = 86_400_000;
const d = (y: number, m: number, day: number) => new Date(Date.UTC(y, m, day));
/* Own month names: en-GB writes "Sept", which sits oddly beside "Jun". */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (x: Date) => `${x.getUTCDate()} ${MON[x.getUTCMonth()]}`;
const fmtY = (x: Date) => `${fmt(x)} ${x.getUTCFullYear()}`;
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/* Today is the real date (UTC midnight). The bars that hang on "now" (arrivals, holds, blocks) are placed around it;
   a year that doesn't contain today uses 14 Sep of that year instead. */
const now = new Date();
const TODAY = d(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
const plus = (x: Date, days: number) => new Date(x.getTime() + days * DAY);
const yearHas = (y: number, x: Date) => x >= d(y, 8, 1) && x < d(y + 1, 8, 1);

function barsFor(room: TlRoom, y: number): Bar[] {
  const h = hash(room.code);
  const t = yearHas(y, TODAY) ? TODAY : d(y, 8, 14);
  const end = h % 3 === 0 ? d(y + 1, 6, 16) : d(y + 1, 5, 25);
  const summer = (from: Date): Bar[] => (h % 3 === 1 ? [{ kind: 'summer', from, to: d(y + 1, 7, 22), label: 'Summer let', who: NAMES[h % NAMES.length] }] : []);
  switch (room.st) {
    case 'in': return [{ kind: 'in', from: d(y, 8, 5 + (h % 4)), to: end, label: room.who ?? '', who: room.who }, ...summer(d(y + 1, 6, 4))];
    case 'arriving': return [{ kind: 'booked', from: plus(t, 1 + (h % 5)), to: end, label: room.who ?? '', who: room.who }, ...summer(d(y + 1, 6, 4))];
    case 'held': return [{ kind: 'held', from: plus(t, -7 - (h % 5)), to: plus(t, 14), label: 'Held' }];
    case 'blocked': return [{ kind: 'blocked', from: plus(t, -21), to: plus(t, 30), label: 'Maintenance' }];
    case 'vacant': { const who = NAMES[(h >>> 3) % NAMES.length]; return h % 2 ? [{ kind: 'booked', from: t < d(y + 1, 0, 4) ? d(y + 1, 0, 4) : plus(t, 28), to: d(y + 1, 5, 25), label: who, who }] : []; }
  }
}

/* The details card a bar opens (Connect drawer in small): mono strip with room and status; who; the stay as a
   from → to band with a progress line to today; then label/value rows (label ink, value grey right); footer action. */
const STAY: Record<Kind, [string, string]> = { in: ['Move in', 'Move out'], booked: ['Move in', 'Move out'], summer: ['Move in', 'Move out'], held: ['Held from', 'Offer expires'], blocked: ['Blocked from', 'Back in use'] };
const FILL: Record<Kind, string> = { in: '#16A34A', booked: '#2563EB', summer: '#8B5CF6', held: '#F59E0B', blocked: '#A3A3A3' };

function BarCard({ bar, room, hall }: { bar: Bar; room: TlRoom; hall: string }) {
  const nav = useNavigate();
  /* A block links to a real open job (dummy pairing): the card shows its ref and title, and Open job opens it in the
     Maintenance side panel (?job=<id>). */
  const faults = useRms((st) => st.faults);
  const open = faults.filter((x) => x.status !== 'Fixed');
  const sameHall = open.filter((x) => x.where.startsWith(hall.split(' ')[0]));
  const openJobs = sameHall.length ? sameHall : open;
  const job = bar.kind === 'blocked' && openJobs.length ? openJobs[hash(room.code) % openJobs.length] : undefined;
  const s = BAR[bar.kind], h = hash(room.code + bar.kind);
  const wk = 7 * DAY, total = Math.max(1, Math.round((bar.to.getTime() - bar.from.getTime()) / wk));
  const done = Math.round((TODAY.getTime() - bar.from.getTime()) / wk);
  const pct = Math.max(0, Math.min(100, ((TODAY.getTime() - bar.from.getTime()) / (bar.to.getTime() - bar.from.getTime())) * 100));
  const progress = TODAY < bar.from ? `Starts in ${Math.max(1, -done)} ${-done === 1 ? 'week' : 'weeks'}` : TODAY > bar.to ? 'Ended' : `Week ${Math.max(1, done)} of ${total}`;
  const rows: [string, string][] = bar.kind === 'blocked'
    ? [['Reason', job?.title ?? 'Damp repair, bathroom'], ['Job', job?.ref ?? `MT-${1200 + (h % 90)}`]]
    : bar.kind === 'held'
      ? [['Offer', `OF-${3400 + (h % 200)}`], ['Applicant', NAMES[h % NAMES.length]]]
      : [['Rent', `£${165 + (h % 6) * 10} / week`], ['Contract', bar.kind === 'summer' ? 'Summer licence' : `${hall.split(' ')[0]} AY 26/27`]];
  const [fromL, toL] = STAY[bar.kind];
  const action = bar.kind === 'blocked' ? ['Open job', job ? `/residents/maintenance?job=${job.id}` : '/residents/maintenance'] : bar.kind === 'held' ? ['Open offer', '/allocations/offers'] : bar.kind === 'in' ? ['Open resident', '/residents'] : ['Open booking', '/allocations/bookings'];
  return (
    <div className="flex flex-col">
      <div className="h-9 px-4 flex items-center gap-2 bg-[#FAFAFA] border-b border-[#E5E5E5]">
        <span className="font-mono text-xs leading-4 font-medium uppercase tracking-[0.48px] text-[#171717]">{room.code}</span>
        <span className="text-xs leading-4 text-[#737373] truncate">· {hall}</span>
        <span className="ml-auto shrink-0"><Pill tone={s.tone}>{s.name}</Pill></span>
      </div>

      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        {bar.who ? <Avatar name={bar.who} size={36} /> : null}
        <div className="min-w-0">
          <div className="text-base leading-6 font-medium text-[#0A0A0A] truncate">{bar.who ?? bar.label}</div>
          <div className="text-xs leading-4 text-[#737373]">{bar.kind === 'summer' ? 'Summer guest' : bar.kind === 'blocked' ? 'Room out of use' : bar.kind === 'held' ? 'Held for an offer' : 'Student · Year 2'}</div>
        </div>
      </div>

      {/* The stay: two dates either side, a thin line filled up to today, and where we are in it. */}
      <div className="mx-4 rounded-xl border border-[#E5E5E5] p-3 flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-3">
          <div><div className="text-xs leading-4 text-[#737373]">{fromL}</div><div className="mt-0.5 font-mono text-sm leading-5 text-[#0A0A0A] tabular-nums">{fmtY(bar.from)}</div></div>
          <div className="text-right"><div className="text-xs leading-4 text-[#737373]">{toL}</div><div className="mt-0.5 font-mono text-sm leading-5 text-[#0A0A0A] tabular-nums">{fmtY(bar.to)}</div></div>
        </div>
        <div className="h-1 rounded-full bg-[#F0F0F0] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: FILL[bar.kind] }} /></div>
        <div className="flex items-center justify-between text-xs leading-4 text-[#737373]"><span>{progress}</span><span className="font-mono tabular-nums">{total} weeks</span></div>
      </div>

      <dl className="px-4 py-4 flex flex-col gap-3 text-sm leading-5">
        {rows.map(([k, v]) => <div key={k} className="flex items-center justify-between gap-4"><dt className="text-[#0A0A0A]">{k}</dt><dd className="min-w-0 truncate text-right font-medium text-[#737373]">{v}</dd></div>)}
      </dl>

      <div className="h-14 px-4 flex items-center justify-end border-t border-[#E5E5E5]">
        <Button size="sm" onClick={() => nav(action[1])}>{action[0]}</Button>
      </div>
    </div>
  );
}

const COLS = 'grid grid-cols-[200px_minmax(0,1fr)]';

export function OccupancyTimeline({ rooms, floors, year, hall }: { rooms: TlRoom[]; floors: readonly string[]; year: string; hall: string }) {
  const y = Number(year.slice(0, 4));
  /* The year starts on 1 Sep so September's rule falls on the room column's own border (no second line beside it). */
  const start = d(y, 8, 1), span = d(y + 1, 8, 1).getTime() - start.getTime();
  const at = (x: Date) => Math.max(0, Math.min(100, ((x.getTime() - start.getTime()) / span) * 100));
  const months = MONTHS.map((m, i) => ({ m, left: at(d(i < 4 ? y : y + 1, (8 + i) % 12, 1)) }));
  /* The today line shows only on the academic year that contains today. */
  const today = yearHas(y, TODAY) ? at(TODAY) : null;
  /* This week (Mon–Sun) as a faint blue column behind the bars, like Miro's current-period highlight. */
  const monday = plus(TODAY, -((TODAY.getUTCDay() + 6) % 7));
  const week = today != null ? { left: at(monday), width: at(plus(monday, 7)) - at(monday) } : null;
  const [shut, setShut] = useState<string[]>([]);
  const toggle = (f: string) => setShut((x) => (x.includes(f) ? x.filter((v) => v !== f) : [...x, f]));
  const Rules = () => <>{week && <span aria-hidden className="absolute inset-y-0 bg-[#2563EB]/[0.05]" style={{ left: `${week.left}%`, width: `${week.width}%` }} />}{months.slice(1).map((x) => <span key={x.m} aria-hidden className="absolute inset-y-0 border-l border-[#F0F0F0]" style={{ left: `${x.left}%` }} />)}
    {today != null && <span aria-hidden className="absolute inset-y-0 w-px bg-[#2563EB]/60 z-[1]" style={{ left: `${today}%` }} />}</>;

  return (
    /* overflow-clip (not auto/hidden) rounds the corners without making the card a scroll box, so the month header
       can stick to the top of the page's scroll area. The header carries its own top rule, pulled up 1px under the
       card's border at rest, so it still has an edge once stuck. */
    <div className="rounded-2xl border border-[#E5E5E5] bg-white overflow-clip">
      <div className="min-w-[1080px]">
        {/* Header: room column, then the months in Geist Mono; this week is tinted blue and a small arrowhead on the
            bottom rule marks today (hover for the date). The terms row was tried and removed (2026-11-17). */}
        <div className={cx(COLS, 'sticky top-0 z-[5] h-10 -mt-px border-t border-t-[#E5E5E5] bg-[#FAFAFA] border-b border-[#E5E5E5] font-mono text-[11px] leading-4 uppercase tracking-[0.48px] text-[#737373]')}>
          <div className="px-5 flex items-center border-r border-[#E5E5E5]">Room</div>
          <div className="relative">
            {week && <span aria-hidden className="absolute inset-y-0 bg-[#2563EB]/[0.08] pointer-events-none" style={{ left: `${week.left}%`, width: `${week.width}%` }} />}
            {months.map((x, i) => <span key={x.m} className={cx('absolute inset-y-0 pl-2.5 flex items-center', i > 0 && 'border-l border-[#E5E5E5]')} style={{ left: `${x.left}%` }}>{x.m}</span>)}
            {today != null && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  {/* A 24px-wide hover target around the 10px arrowhead, so the date is easy to reach. */}
                  <span aria-label={`Today, ${fmtY(TODAY)}`} className="absolute bottom-0 -translate-x-1/2 z-[3] w-6 h-4 flex items-end justify-center cursor-default" style={{ left: `calc(${today}% + 0.5px)` }}>
                    <span aria-hidden className="w-0 h-0 -mb-px border-x-[5px] border-x-transparent border-t-[6px] border-t-[#2563EB]" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">Today · {fmtY(TODAY)}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        {floors.map((floor, fi) => {
          const fr = rooms.filter((x) => x.floor === floor);
          if (!fr.length) return null;
          const n = (s: TlStatus) => fr.filter((x) => x.st === s).length;
          const closed = shut.includes(floor);
          return (
            <section key={floor} aria-label={`${floor} floor`}>
              {/* Floor band: a grey strip with a firm rule above it (after the first floor), the floor name and its counts. */}
              {/* The band folds its floor away (Miro swimlanes); folded, the counts still read. */}
              <div className={cx(COLS, 'h-10 bg-[#FAFAFA]', !closed && 'border-b border-[#E5E5E5]', fi > 0 && 'border-t border-t-[#E5E5E5]')}>
                <button type="button" aria-expanded={!closed} onClick={() => toggle(floor)} className="pl-3 pr-5 flex items-center gap-2 border-r border-[#E5E5E5] text-left hover:bg-[#F5F5F5] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                  <ChevronDown size={14} className={cx('text-[#737373] transition-transform duration-150', closed && '-rotate-90')} />
                  <span className="font-mono text-xs leading-4 font-medium uppercase tracking-[0.48px] text-[#0A0A0A]">{floor} floor</span>
                  <span className="font-mono text-[11px] leading-4 text-[#737373] tabular-nums">{fr.length}</span>
                </button>
                <div className="relative flex items-center gap-4 px-3 text-xs leading-4 text-[#737373]">
                  {([['in', 'in residence', FILL.in], ['arriving', 'arriving', FILL.booked], ['held', 'held', FILL.held], ['vacant', 'vacant', ''], ['blocked', 'blocked', FILL.blocked]] as [TlStatus, string, string][])
                    .filter(([k]) => n(k) > 0 || k === 'in' || k === 'arriving' || k === 'vacant')
                    .map(([k, label, c]) => <span key={k} className="flex items-center gap-1.5"><span aria-hidden className={cx('size-1.5 rounded-full', !c && 'border border-[#A3A3A3]')} style={c ? { background: c } : undefined} />{n(k)} {label}</span>)}
                </div>
              </div>
              {!closed && <div className="relative">
                {/* The room column's rule, the month rules and the today line run the floor's full height, each room on a light row rule. */}
                <span aria-hidden className="absolute inset-y-0 left-0 w-[200px] border-r border-[#E5E5E5] pointer-events-none" />
                <div aria-hidden className="absolute inset-y-0 left-[200px] right-0 pointer-events-none"><Rules /></div>
                {fr.map((room) => (
                  <div key={room.code} className={cx(COLS, 'h-12 border-b border-[#F0F0F0] last:border-b-0')}>
                    <div className="px-5 flex flex-col justify-center">
                      <span className="font-mono text-xs leading-4 font-medium text-[#0A0A0A]">{room.code}</span>
                      <span className={cx('text-xs leading-4 truncate', room.who ? 'text-[#737373]' : 'text-[#A3A3A3]')}>{room.who ?? (room.st === 'vacant' ? 'Vacant now' : room.st === 'held' ? 'Held' : 'Blocked')}</span>
                    </div>
                    <div className="relative">
                      {barsFor(room, y).map((b) => {
                        /* Bars keep 6px off the room column's edge (a stay from 1 Sep would otherwise touch it); the end stays on its date. */
                        const s = BAR[b.kind], left = at(b.from), width = Math.max(1.2, at(b.to) - left);
                        return (
                          <Popover key={b.kind + b.from.getTime()}>
                            <PopoverTrigger asChild>
                              <button type="button" aria-label={`${room.code} · ${s.name}${b.who ? ` · ${b.who}` : ''} · ${fmt(b.from)} to ${fmt(b.to)}`}
                                className={cx('absolute top-2 bottom-2 z-[1] rounded-md border pr-2.5 flex items-center gap-1.5 min-w-0 text-left text-xs leading-4 font-medium cursor-pointer transition-[border-color,box-shadow] duration-150 hover:shadow-[0_1px_3px_rgba(0,0,0,0.10)] data-[state=open]:shadow-[0_1px_3px_rgba(0,0,0,0.10)] outline-none focus-visible:ring-2 focus-visible:ring-ring', 'pl-2.5', s.cls, s.text)}
                                style={{ left: `max(6px, ${left}%)`, right: `${100 - left - width}%` }}>
                                <span className="truncate">{b.label}</span>
                                {width > 14 && <span className="ml-auto shrink-0 font-mono text-[11px] font-normal opacity-70">{fmt(b.to)}</span>}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" sideOffset={6} collisionPadding={16} onOpenAutoFocus={(e) => e.preventDefault()} className="w-[340px] p-0 overflow-hidden rounded-2xl shadow-[0_12px_32px_-4px_rgba(0,0,0,0.14),0_4px_8px_-2px_rgba(0,0,0,0.06)]">
                              <BarCard bar={b} room={room} hall={hall} />
                            </PopoverContent>
                          </Popover>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
