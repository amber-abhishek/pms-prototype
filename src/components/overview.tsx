import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Building, ChartColumnIcon, ChartLine, TableIcon, type Icon } from './icons';
import { Card, cx, Meter, Pill, TitleH1, type MeterSpec } from './ui';
import { Tooltip, TooltipContent, TooltipTrigger } from './shadcn/tooltip';

/* Overview kit in the Amber Connect language (Figma 3884:39270):
   - a white greeting band (2026-11-16; was #F5F5F5) (48px r10 photo, 18px semibold title, 16px #737373 line, actions on the right),
   - optional 200×40 folder tabs on the same band,
   - a white content area, 24px padding, cards 16px apart. Every card is r16 with a 36px #FAFAFA mono strip
     (Geist Mono Medium 12 uppercase, #171717) and a 20px body; card figures are Geist Mono like the number band. */

export function OverviewPage({ title, sub, actions, avatar, tabs, children }: {
  title: string; sub: ReactNode; actions?: ReactNode; avatar?: ReactNode; tabs?: ReactNode; children?: ReactNode;
}) {
  return (
    <div className="flex-1 overflow-auto flex flex-col">
      <GreetingBand title={title} sub={sub} actions={actions} avatar={avatar} />
      {tabs ?? <div className="h-px shrink-0 bg-[#E5E5E5]" />}
      {children && <div className="p-6 flex flex-col gap-4">{children}</div>}
    </div>
  );
}

export function GreetingBand({ title, sub, actions, avatar }: { title: string; sub: ReactNode; actions?: ReactNode; avatar?: ReactNode }) {
  /* White like the page under it, so it has no bottom padding of its own: the content's 24px is the only gap to the cards. */
  return (
    <div className="shrink-0 bg-white px-6 pt-6 flex items-center gap-4">
      {avatar}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <TitleH1 className="text-xl leading-7 font-semibold text-[#0A0A0A] truncate">{title}</TitleH1>
        <p className="text-base leading-6 text-[#737373] truncate">{sub}</p>
      </div>
      {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Folder tabs on the #F5F5F5 band (Figma "Tabs", 44px): 200×40 tabs from 24px in; the active one is white with a
 *  #E5E5E5 edge on three sides and r10 top corners, sitting on the band's bottom line so it opens into the page. */
/* Connect's insights tabs: one SVG outline (the raised tab with r10 corners and outward r10 flares into the base line)
   slides to the chosen tab in 350ms on cubic-bezier(0.4,0,0.2,1); labels fade #737373 → ink in 300ms. Each tab is a route, so the
   bar remounts on every switch: it remembers where the tab last was and slides from there. */
const TAB_W = 200, TAB_H = 40, TAB_R = 10, TAB_PAD = 24, TAB_TOP = 3.5, TAB_Y = TAB_H + 3.5, FAR = 4000;
const TAB_PATH = [
  `M ${-FAR} ${TAB_Y}`, `L ${-TAB_R} ${TAB_Y}`, `Q 0 ${TAB_Y} 0 ${TAB_Y - TAB_R}`, `L 0 ${TAB_TOP + TAB_R}`, `Q 0 ${TAB_TOP} ${TAB_R} ${TAB_TOP}`,
  `L ${TAB_W - TAB_R} ${TAB_TOP}`, `Q ${TAB_W} ${TAB_TOP} ${TAB_W} ${TAB_TOP + TAB_R}`, `L ${TAB_W} ${TAB_Y - TAB_R}`, `Q ${TAB_W} ${TAB_Y} ${TAB_W + TAB_R} ${TAB_Y}`, `L ${FAR} ${TAB_Y}`,
].join(' ');
let lastTabX: number | null = null;
export function FolderTabs({ tabs }: { tabs: { to: string; label: string; count?: number; end?: boolean }[] }) {
  const { pathname } = useLocation();
  const idx = Math.max(0, tabs.findIndex((t) => (t.end ? pathname === t.to : pathname === t.to || pathname.startsWith(`${t.to}/`))));
  const target = TAB_PAD + idx * TAB_W;
  const [x, setX] = useState(lastTabX ?? target);
  useEffect(() => {
    const f = requestAnimationFrame(() => setX(target));
    lastTabX = target;
    return () => cancelAnimationFrame(f);
  }, [target]);
  return (
    <nav aria-label="Sections" className="relative h-11 shrink-0 bg-[#F5F5F5]">
      <svg aria-hidden className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <g style={{ transform: `translateX(${x}px)` }} className="transition-transform duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none">
          <path d={`${TAB_PATH} L ${FAR} ${TAB_Y + 1} L ${-FAR} ${TAB_Y + 1} Z`} style={{ fill: 'hsl(var(--background))' }} />
          {/* Theme variables, not literal colours: postcss-dark can't give an SVG attribute a dark twin. */}
          <path d={TAB_PATH} fill="none" style={{ stroke: 'hsl(var(--border))' }} strokeWidth={1} />
        </g>
      </svg>
      <div className="relative z-[1] h-full flex items-end" style={{ paddingLeft: TAB_PAD }}>
        {tabs.map((t, i) => (
          <NavLink key={t.to} to={t.to} end={t.end}
            className={cx('h-10 flex items-center justify-center gap-1.5 font-mono uppercase text-sm leading-5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring rounded-t-[10px] transition-colors duration-300',
              i === idx ? 'text-[#0A0A0A]' : 'text-[#737373] hover:text-[#0A0A0A]')} style={{ width: TAB_W }}>
            {t.label}
            {t.count !== undefined && t.count > 0 && <span className={cx('h-5 min-w-5 px-1.5 rounded-md font-mono text-xs leading-4 font-medium text-[#525252] flex items-center justify-center transition-colors duration-300', i === idx ? 'bg-[#F5F5F5]' : 'bg-white')}>{t.count}</span>}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

/** Card header (Connect insights overview): 16px medium title with an optional 14px grey line under it, and a note,
 *  range or tag on the right. No band and no rule: the card body follows straight on. */
export function Strip({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  /* Connect card strip (2026-11-17): 36px #FAFAFA band, Geist Mono Medium 12 uppercase #171717, 1px rule under it. */
  return (
    <div className="shrink-0 h-9 px-5 flex items-center gap-3 bg-[#FAFAFA] border-b border-[#E5E5E5]">
      <h3 className="flex-1 min-w-0 truncate font-mono text-xs leading-4 font-medium uppercase tracking-[0.48px] text-[#171717]">{title}{sub && <span className="ml-2 normal-case tracking-normal font-sans font-normal text-[#737373]">{sub}</span>}</h3>
      {right && <div className="shrink-0 flex items-center gap-2">{right}</div>}
    </div>
  );
}
const stripNote = 'font-mono text-xs leading-4 uppercase tracking-[0.48px] text-[#737373]';

/** Connect number band (Amber Connect bookings): one edge-to-edge strip, columns split by dashed rules. Each column is a
 *  14px grey label, a 32px mono figure, a filled caret with the change in green or red plus a grey "vs" line, and a
 *  `meter` along the foot: progress to a target or a breakdown (see Meter). */
export type Kpi = { label: string; value: string; delta?: string; good?: boolean; vs?: string; to?: string; meter?: MeterSpec;
  /** Grey word after the figure ("to review"). */ unit?: string;
  /** Replaces the change line: what the figure is made of, the urgent part first in red (2026-11-23, Figma 4192:31036). */ note?: ReactNode;
  /** Blue link word at the right of the label ("View"); the whole cell is the link. */ link?: string };
export function KpiCards({ items }: { items: Kpi[] }) {
  return (
    <div className="shrink-0 mt-6 grid border-y border-[#E5E5E5] px-6 py-5" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((k, i) => {
        const up = k.delta ? !/^[−-]/.test(k.delta) : false;
        const good = k.good ?? up;
        const body = (
          <>
            <div className="flex items-center gap-3 text-sm leading-5 text-[#737373]"><span className="flex-1 min-w-0 truncate">{k.label}</span>{k.link && <span className="shrink-0 font-medium text-[#2563EB] group-hover:underline underline-offset-2">{k.link}</span>}</div>
            <div className="mt-1 flex items-baseline gap-2 min-w-0">
              <span className="font-mono text-[32px] leading-10 font-semibold tracking-[-0.02em] tabular-nums text-[#0A0A0A] truncate">{k.value}</span>
              {k.unit && <span className="text-sm text-[#737373] whitespace-nowrap">{k.unit}</span>}
            </div>
            <div className={cx(k.note ? 'mt-2' : 'mt-4', 'h-5 flex items-center gap-1 text-sm leading-5 text-[#404040] whitespace-nowrap min-w-0')}>
              {k.note ? <span className="truncate text-[#737373]">{k.note}</span> : k.delta && <>
                <span className={cx('flex items-center gap-1 font-semibold tabular-nums', good ? 'text-[#16A34A]' : 'text-[#DC2626]')}>
                  <svg width="8" height="6" viewBox="0 0 8 6" aria-hidden className={up ? '' : 'rotate-180'}><path d="M4 0 8 6H0z" fill="currentColor" /></svg>
                  {k.delta.replace(/^[−+-]/, '')}
                </span>
                {k.vs ?? 'vs last 30 days'}
              </>}
            </div>
            <div className={cx(k.note ? 'mt-4' : 'mt-5', 'h-1')}>{k.meter && <Meter m={k.meter} />}</div>
          </>
        );
        const cell = cx('min-w-0 block outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md',
          i > 0 && 'pl-6 border-l border-dashed border-[#E5E5E5]', i < items.length - 1 && 'pr-6');
        return k.to
          ? <Link key={k.label} to={k.to} className={cx(cell, 'group [&>div:first-child]:transition-colors hover:[&>div:first-child]:text-[#0A0A0A]')}>{body}</Link>
          : <div key={k.label} className={cell}>{body}</div>;
      })}
    </div>
  );
}

const tone = { green: 'text-[#16A34A]', orange: 'text-[#DC2626]', red: 'text-[#DC2626]', ink: 'text-[#0A0A0A]' } as const;
type ToneKey = keyof typeof tone;

/** Two-icon segmented switch: raised white tab on the #F5F5F5 track. */
function ViewSwitch({ value, onChange, chart }: { value: 'chart' | 'table'; onChange: (v: 'chart' | 'table') => void; chart: Icon }) {
  const opts: ['chart' | 'table', Icon, string][] = [['chart', chart, 'Chart'], ['table', TableIcon, 'Table']];
  return (
    <div role="radiogroup" aria-label="View" className="flex p-0.5 gap-0.5 rounded-lg bg-[#F0F0F0]">
      {opts.map(([id, I, label]) => (
        <button key={id} type="button" role="radio" aria-checked={value === id} aria-label={label} onClick={() => onChange(id)}
          className={cx('size-5 rounded-md flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-colors',
            value === id ? 'bg-white text-ink shadow-[0_1px_3px_rgba(0,0,0,0.1)]' : 'text-[#737373] hover:text-ink')}>
          <I size={12} />
        </button>
      ))}
    </div>
  );
}

export type Point = { label: string; value: number; note: string };

/** Headline number with a 30-day chart (line or bars), a hover tooltip and a table view. */
export function TrendCard({ title, badge, value, of, up, down, kind, points, ticks, axis, chartOnly, empty }: {
  title: string; badge: string; value: string; of: string; up: string; down: string; kind: 'line' | 'bar';
  points: Point[]; ticks: string[]; axis: number[];
  /** Hide the chart/table switch and show the chart only. */ chartOnly?: boolean;
  /** No data yet: the plot keeps its frame and gridlines, with this one line in the middle instead of a series. */ empty?: string;
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const lo = axis[0], hi = axis[axis.length - 1];
  const y = (v: number) => 100 - ((v - lo) / (hi - lo)) * 100;
  const n = points.length;
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const pick = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    setHover(kind === 'bar' ? Math.min(n - 1, Math.floor(t * n)) : Math.round(t * (n - 1)));
  };
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ');
  const hp = hover === null ? null : points[hover];
  const hx = hover === null ? 0 : kind === 'bar' ? ((hover + 0.5) / n) * 100 : x(hover);
  const last = points[n - 1];
  return (
    <Card className="overflow-hidden flex flex-col min-w-0 h-[349px]">
      <Strip title={title} right={<div className="flex items-center gap-3">
        {!chartOnly && <ViewSwitch value={view} onChange={setView} chart={kind === 'line' ? ChartLine : ChartColumnIcon} />}
      </div>} />
      <div className="flex-1 min-h-0 p-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="flex items-baseline gap-2">
            <span className="font-mono text-[32px] leading-10 font-semibold tracking-[-0.96px] tabular-nums text-[#0A0A0A]">{value}</span>
            <span className="text-sm text-[#737373]">{of}</span>
          </span>
          <Pill tone="blue">{badge}</Pill>
          {!empty && <span className="ml-auto flex items-center gap-1.5">
            <Pill tone="green"><ArrowUpRight size={12} className="!block" />{up}</Pill>
            <Pill tone="red"><ArrowDownRight size={12} className="!block" />{down.replace(/^[−-]/, '')}</Pill>
          </span>}
        </div>
        {empty ? (
          <div className="flex-1 min-h-0 relative">
            {[0, 1, 2, 3].map((i) => <div key={i} className="absolute inset-x-0 border-t border-dashed border-[#E5E5E5]" style={{ top: `${(i / 3) * 100}%` }} />)}
            <div className="absolute inset-0 flex items-center justify-center text-sm text-[#737373]">{empty}</div>
          </div>
        ) : view === 'table' ? (
          <div className="flex-1 min-h-0 overflow-auto -mx-1 px-1">
            <table className="w-full text-sm">
              <thead><tr className="h-8"><th className="text-left pl-1">Day</th><th className="text-left">{kind === 'line' ? 'Beds occupied' : 'Beds allocated'}</th><th className="text-left pr-1">Change</th></tr></thead>
              <tbody>{[...points].reverse().map((p) => (
                <tr key={p.label} className="h-9 border-b border-[#F5F5F5] last:border-0"><td className="pl-1 text-[#404040]">{p.label}</td><td className="tabular-nums text-ink">{p.value.toLocaleString('en-GB')}</td><td className="tabular-nums text-[#737373] pr-1">{p.note}</td></tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <div className="flex-1 min-h-0 grid grid-cols-[44px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_20px]">
            {/* Axis labels: Geist Mono 11 #737373, no thousands separator (Figma "2500"). */}
            <div className="relative font-mono text-[11px] leading-4 text-[#737373] tabular-nums">
              {axis.map((a) => <span key={a} className="absolute left-0 -translate-y-1/2" style={{ top: `${y(a)}%` }}>{a}</span>)}
            </div>
            <div ref={box} className="relative" onMouseMove={(e) => pick(e.clientX)} onMouseLeave={() => setHover(null)}>
              {axis.map((a) => <div key={a} className="absolute inset-x-0 border-t border-dashed border-[#E5E5E5]" style={{ top: `${y(a)}%` }} />)}
              {kind === 'line' ? (
                <svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                  <defs><linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2563EB" stopOpacity="0.12" /><stop offset="1" stopColor="#2563EB" stopOpacity="0" /></linearGradient></defs>
                  <path d={`${line} L100,100 L0,100 Z`} fill="url(#trend-fill)" />
                  <path d={line} fill="none" stroke="#2563EB" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
                </svg>
              ) : (
                <div className="absolute inset-0 flex items-end gap-[3px]">
                  {points.map((p, i) => (
                    <div key={p.label} className={cx('flex-1 rounded-t-[3px] bg-[#2563EB] transition-opacity', hover !== null && hover !== i && 'opacity-60')}
                      style={{ height: `${Math.max(1.5, 100 - y(p.value))}%` }} />
                  ))}
                </div>
              )}
              {/* "Now": the latest point, a white dot with a blue ring. */}
              {kind === 'line' && last && hover === null && <span className="absolute size-2 rounded-full bg-white border-[1.5px] border-[#2563EB] -translate-x-1/2 -translate-y-1/2" style={{ left: '100%', top: `${y(last.value)}%` }} />}
              {hp && <>
                {kind === 'line' && <>
                  <div className="absolute top-0 bottom-0 border-l border-dashed border-[#A3A3A3]" style={{ left: `${hx}%` }} />
                  <div className="absolute size-2.5 rounded-full bg-[#2563EB] ring-2 ring-white -translate-x-1/2 -translate-y-1/2" style={{ left: `${hx}%`, top: `${y(hp.value)}%` }} />
                </>}
                <div className="absolute z-[1] top-1 pointer-events-none rounded-lg border border-[#E5E5E5] bg-white px-2.5 py-1.5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] whitespace-nowrap"
                  style={{ left: `${hx}%`, transform: `translateX(${hx > 70 ? 'calc(-100% - 10px)' : '10px'})` }}>
                  <div className="text-xs font-semibold text-ink">{hp.label}</div>
                  <div className="text-xs text-[#737373]">{hp.note}</div>
                </div>
              </>}
            </div>
            <div />
            <div className="relative font-mono uppercase text-[11px] leading-4 text-[#737373]">
              {ticks.map((t, i) => <span key={t} className={cx('absolute top-1 whitespace-nowrap', i === 0 ? '' : i === ticks.length - 1 ? '-translate-x-full' : '-translate-x-1/2')} style={{ left: `${(() => { const at = points.findIndex((p) => p.label === t); return (at >= 0 && points.length > 1 ? at / (points.length - 1) : i / (ticks.length - 1)) * 100; })()}%` }}>{t}</span>)}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export type RankRow = { id: string; name: string; value: string; pct: number; warn?: boolean; to: string; /** Not letting this term: grey name and value, no bar. */ muted?: boolean };
/** Ranked list beside the chart (Figma "Pre-let by property"): grey building, name, 72×4 meter, mono percentage. */
export function RankCard({ title, note, rows, more, moreLabel, moreTo, empty, target, className }: { title: string; note: string; rows: RankRow[]; more: number; moreLabel: string; moreTo: string; /** Shown when there are no rows. */ empty?: ReactNode;
  /** Draws a 96px bar per row with a tick at this percentage (2026-11-23). */ target?: number; className?: string }) {
  return (
    <Card className={cx('overflow-hidden flex flex-col min-w-0', className ?? 'h-[349px]')}>
      <Strip title={title} right={<span className={stripNote}>{note}</span>} />
      {!rows.length && empty ? <div className="flex-1 flex flex-col items-center justify-center text-center px-4 gap-3 text-sm text-[#737373]">{empty}</div> : <div className="flex-1 min-h-0 p-5 flex flex-col">
        <div className="flex flex-col gap-1">
          {rows.map((r) => (
            <Link key={r.id} to={r.to} className="h-[30px] -mx-2 px-2 rounded-lg flex items-center gap-2.5 text-sm hover:bg-[#FAFAFA] outline-none focus-visible:bg-[#FAFAFA]">
              <Building size={16} strokeWidth={1.5} className="shrink-0 text-[#737373]" />
              <span className={cx('flex-1 min-w-0 truncate', r.muted ? 'text-[#737373]' : 'text-[#0A0A0A]')}>{r.name}</span>
              {target != null && !r.muted && <span className="w-24 shrink-0"><Meter m={{ kind: 'progress', value: r.pct, max: 100, target, color: r.warn ? '#D97706' : '#2563EB', tip: `${r.pct}% · target ${target}%` }} /></span>}
              <span className={cx('text-right text-sm tabular-nums whitespace-nowrap', r.muted ? 'font-normal text-[#A3A3A3]' : 'w-9 font-mono font-medium', !r.muted && (r.warn ? 'text-[#D97706]' : 'text-[#0A0A0A]'))}>{r.value}</span>
            </Link>
          ))}
        </div>
        <Link to={moreTo} className="mt-auto self-start flex items-center gap-1.5 text-sm font-medium text-[#2563EB] hover:underline underline-offset-2">
          {moreLabel}{more > 0 && <span className="font-mono text-xs font-normal text-[#737373]">+{more}</span>}
        </Link>
      </div>}
    </Card>
  );
}

/* Light pastels → brand blue; dark gets a deep low-chroma ramp up to the softened brand (styles.css .dark [data-funnel]). */
const FUNNEL_FILL = ['#DCE6FF', '#C7D6FE', '#A9C1FC', '#5B8DFF', '#2B5CFF'];
/** Five steps, conversion from the step before, bars deepen towards the lease. */
export function FunnelCard({ steps, caption, summary, to }: { steps: [string, number][]; caption: string; summary: string; to: string }) {
  return (
    <Card className="overflow-hidden flex flex-col">
      <Strip title="Allocation funnel" />
      <div className="p-5">
        <div className="grid grid-cols-5 gap-3">
          {steps.map(([label, n], i) => (
            <Link key={label} to={to} className="min-w-0 group">
              <div className="text-sm text-[#737373] truncate group-hover:text-ink">{label}{i > 0 && steps[i - 1][1] > 0 && ` · ${Math.round((n / steps[i - 1][1]) * 100)}%`}</div>
              <div className="font-mono text-2xl leading-8 font-semibold tracking-[-0.72px] tabular-nums text-ink">{n.toLocaleString('en-GB')}</div>
              <div className="mt-3 h-12 flex items-end"><div className="w-full rounded-md group-hover:opacity-85" style={{ height: `${steps[0][1] ? Math.round(40 + (n / steps[0][1]) * 60) : 6}%`, background: steps[0][1] ? FUNNEL_FILL[i] : '#F0F0F0' }} data-funnel={i} /></div>
            </Link>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-[#E5E5E5]">
          <div><div className="text-xs text-[#737373]">{caption}</div><div className="text-sm font-medium text-ink">{summary}</div></div>
          <ViewLink to={to} />
        </div>
      </div>
    </Card>
  );
}

/** The card footer's small outline button (Figma "Button · View": 30px, 4/10, r8, 14px medium). */
export const smallOutline = 'h-[30px] px-2.5 rounded-lg border border-[#E5E5E5] bg-white text-sm font-medium text-[#0A0A0A] shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-[#F5F5F5] dark:hover:bg-[#31353F] inline-flex items-center gap-1.5 whitespace-nowrap active:scale-[0.97] transition-[background-color,transform]';
export const ViewLink = ({ to, label = 'View' }: { to: string; label?: string }) => <Link to={to} className={smallOutline}>{label}</Link>;
export const CardButton = ({ onClick, children }: { onClick: () => void; children: ReactNode }) => <button type="button" onClick={onClick} className={smallOutline}>{children}</button>;

/** Summary card (Figma "Card · Applications", 247px): strip with an optional tag, the body, then a ruled footer
 *  line (12px #737373 label over a 14px medium value) with one small outline action. */
export function SummaryCard({ title, tag, children, foot, footValue, footTone = 'ink', action }: { title: string; tag?: ReactNode; children: ReactNode; foot: string; footValue: string; footTone?: ToneKey; action: ReactNode }) {
  return (
    <Card className="overflow-hidden h-[216px] flex flex-col min-w-0">
      <Strip title={title} right={tag} />
      <div className="flex-1 min-h-0 px-5 py-4 flex flex-col">
        <div className="flex-1 min-h-0">{children}</div>
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E5E5E5]">
          <div className="min-w-0"><div className="text-xs leading-4 text-[#737373]">{foot}</div><div className={cx('text-sm leading-5 font-medium truncate', tone[footTone])}>{footValue}</div></div>
          <div className="shrink-0">{action}</div>
        </div>
      </div>
    </Card>
  );
}

/** Three stats: 14px #737373 label over a 24px semibold number. */
export function Stats({ items }: { items: [string, string, ToneKey?][] }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map(([l, v, t]) => <div key={l} className="min-w-0 flex flex-col gap-1"><div className="text-sm leading-5 text-[#737373] truncate">{l}</div><div className={cx('font-mono text-2xl leading-8 font-semibold tracking-[-0.72px] tabular-nums', tone[t ?? 'ink'])}>{v}</div></div>)}
    </div>
  );
}

/** Donut beside its legend (Applications, Rent on Overview): a 96px ring, 12px thick, 2px surface gaps between
 *  segments, the headline in the hole; each legend row is dot · label · value. Hovering a segment or its row
 *  lights that part and dims the rest. Every part shows at least a sliver so a small count stays visible. */
export type DonutPart = { label: string; value: number; display?: string; color: string; tone?: ToneKey };
export function DonutStats({ center, centerLabel, parts }: { center: string; centerLabel: string; parts: DonutPart[] }) {
  const [hot, setHot] = useState<number | null>(null);
  const R = 42, C = 2 * Math.PI * R, GAP = 2;
  const total = parts.reduce((a, x) => a + x.value, 0);
  const raw = parts.map((x) => (total ? Math.max(x.value ? 0.025 : 0, x.value / total) : 0));
  const sum = raw.reduce((a, x) => a + x, 0) || 1;
  let off = 0;
  const arcs = raw.map((f) => { const len = (f / sum) * C; const a = { len, off }; off += len; return a; });
  return (
    <div className="flex items-center gap-6 select-none cursor-default">
      <div className="relative size-[84px] shrink-0">
        <svg viewBox="0 0 100 100" className="size-[84px] -rotate-90" role="img" aria-label={`${center} ${centerLabel}: ${parts.map((x) => `${x.display ?? x.value} ${x.label}`).join(', ')}`}>
          <circle cx="50" cy="50" r={R} fill="none" strokeWidth="12" className="stroke-[#F0F0F0]" />
          {total > 0 && arcs.map((a, i) => parts[i].value > 0 && (
            <circle key={parts[i].label} cx="50" cy="50" r={R} fill="none" strokeWidth={hot === i ? 14 : 12} stroke={parts[i].color}
              strokeDasharray={`${Math.max(0.5, a.len - GAP)} ${C}`} strokeDashoffset={-a.off}
              className="transition-[opacity,stroke-width] duration-150 cursor-default" style={{ opacity: hot == null || hot === i ? 1 : 0.3 }}
              onMouseEnter={() => setHot(i)} onMouseLeave={() => setHot(null)}>
              <title>{`${parts[i].label}: ${parts[i].display ?? parts[i].value.toLocaleString('en-GB')}`}</title>
            </circle>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-mono text-base leading-5 font-semibold tabular-nums text-ink">{center}</span>
          <span className="text-[11px] leading-4 text-[#737373]">{centerLabel}</span>
        </div>
      </div>
      <ul className="flex-1 min-w-0 flex flex-col gap-2">
        {parts.map((x, i) => (
          <li key={x.label} onMouseEnter={() => setHot(i)} onMouseLeave={() => setHot(null)}
            className={cx('flex items-center gap-2 text-sm leading-5 select-none cursor-default transition-opacity duration-150', hot != null && hot !== i && 'opacity-40')}>
            <span aria-hidden className="size-2 rounded-full shrink-0" style={{ background: x.color }} />
            <span className="flex-1 min-w-0 truncate text-[#737373]">{x.label}</span>
            <span className={cx('font-mono font-semibold tabular-nums', tone[x.tone ?? 'ink'])}>{x.display ?? x.value.toLocaleString('en-GB')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Big number over a segmented meter (6px, 2px gaps, r3) and its legend as tags (Needs your action, Arrivals). */
export function Split({ value, parts }: { value: string; parts: [string, number, 'red' | 'amber' | 'grey' | 'green' | 'blue'][] }) {
  const total = parts.reduce((a, [, n]) => a + n, 0);
  const fill = { blue: '#2563EB', red: '#DC2626', amber: '#D97706', grey: '#D4D4D4', green: '#16A34A' } as const;
  return (
    <div className="flex flex-col gap-3">
      <div className="font-mono text-2xl leading-8 font-semibold tracking-[-0.72px] tabular-nums text-[#0A0A0A]">{value}</div>
      {/* Each segment names itself on hover; the hit area is taller than the 6px bar so it's easy to reach. */}
      <div className="flex gap-0.5">{total > 0 ? parts.map(([l, n, t]) => n > 0 && (
        <Tooltip key={l} delayDuration={0}>
          <TooltipTrigger asChild>
            <span aria-label={l} className="py-2 -my-2 cursor-default group" style={{ flex: n / total }}><span className="block h-1.5 rounded-[3px] transition-opacity group-hover:opacity-80" style={{ background: fill[t] }} /></span>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={4}>{l}</TooltipContent>
        </Tooltip>
      )) : <span className="flex-1 h-1.5 rounded-[3px] bg-[#F5F5F5]" />}</div>
    </div>
  );
}
