import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Building, CaretDown, CaretRight, ChartColumnIcon, ChartLine, TableIcon, type Icon } from './icons';
import { Card, cx, Pill, TitleH1 } from './ui';

/* Overview kit (Home 3783:47863, Allocations 3783:43143): a 1040px column of cards, 16px apart, 20px inside. */

export function OverviewPage({ title, sub, actions, children }: { title: string; sub: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-[1088px] mx-auto px-6 pt-6 pb-8">
        <TitleH1 className="text-xl leading-7 font-medium tracking-[-0.24px] text-ink">{title}</TitleH1>
        <p className="text-sm text-[#737373] mt-0.5">{sub}</p>
        {actions && <div className="flex flex-wrap items-center gap-2 mt-4">{actions}</div>}
        <div className="mt-4 flex flex-col gap-4">{children}</div>
      </div>
    </div>
  );
}

const tone = { green: 'text-[#087A43]', orange: 'text-[#C2410C]', red: 'text-[#B91C1C]', ink: 'text-ink' } as const;
type ToneKey = keyof typeof tone;

/** Two-icon segmented switch: raised white tab on the #F5F5F5 track (pms-filter-tabs-style). */
function ViewSwitch({ value, onChange, chart }: { value: 'chart' | 'table'; onChange: (v: 'chart' | 'table') => void; chart: Icon }) {
  const opts: ['chart' | 'table', Icon, string][] = [['chart', chart, 'Chart'], ['table', TableIcon, 'Table']];
  return (
    <div role="radiogroup" aria-label="View" className="flex p-0.5 rounded-lg bg-[#F5F5F5] shadow-[0_1px_0_#FFFFFF,inset_0_0_0_1px_rgba(3,7,18,0.04),inset_0_1px_2px_rgba(3,7,18,0.07)]">
      {opts.map(([id, I, label]) => (
        <button key={id} type="button" role="radio" aria-checked={value === id} aria-label={label} onClick={() => onChange(id)}
          className={cx('size-7 rounded-[7px] flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-colors',
            value === id ? 'bg-white text-ink border border-[#E5E5E5] shadow-[0_2px_5px_rgba(3,7,18,0.04),0_1px_2px_rgba(3,7,18,0.06)]' : 'text-[#737373] hover:text-ink')}>
          <I size={14} />
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
  return (
    <Card className="p-5 flex flex-col min-w-0 h-[356px]">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-ink">{title}</h3>
        <Pill tone="blue">{badge}</Pill>
        {!chartOnly && <div className="ml-auto"><ViewSwitch value={view} onChange={setView} chart={kind === 'line' ? ChartLine : ChartColumnIcon} /></div>}
      </div>
      <div className="flex items-baseline gap-1.5 mt-1">
        <span className="text-[32px] leading-10 font-semibold tracking-[-0.64px] tabular-nums text-ink">{value}</span>
        <span className="text-sm text-[#737373]">{of}</span>
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs">
        <button type="button" className="flex items-center gap-1 text-[#404040] hover:text-ink">Last 30 days<CaretDown size={12} className="text-gray-400" /></button>
        {!empty && <><span className="ml-auto flex items-center gap-1 text-[#087A43]"><ArrowUpRight size={14} />{up}</span>
        <span className="flex items-center gap-1 text-[#C2410C]"><ArrowDownRight size={14} />{down}</span></>}
      </div>
      {empty ? (
        <div className="mt-4 flex-1 min-h-0 relative">
          {[0, 1, 2, 3].map((i) => <div key={i} className="absolute inset-x-0 border-t border-dashed border-[#F0F0F0]" style={{ top: `${(i / 3) * 100}%` }} />)}
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[#737373]">{empty}</div>
        </div>
      ) : view === 'table' ? (
        <div className="mt-3 flex-1 min-h-0 overflow-auto -mx-1 px-1">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-[#737373] h-8 border-b border-line"><th className="text-left font-medium pl-1">Day</th><th className="text-right font-medium">{kind === 'line' ? 'Beds let' : 'Beds allocated'}</th><th className="text-right font-medium pr-1">Change</th></tr></thead>
            <tbody>{[...points].reverse().map((p) => (
              <tr key={p.label} className="h-9 border-b border-[#F5F5F5] last:border-0"><td className="pl-1 text-[#404040]">{p.label}</td><td className="text-right tabular-nums text-ink">{p.value.toLocaleString('en-GB')}</td><td className="text-right tabular-nums text-[#737373] pr-1">{p.note}</td></tr>
            ))}</tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 flex-1 min-h-0 grid grid-cols-[40px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_20px]">
          <div className="relative text-xs text-[#737373] tabular-nums">
            {axis.map((a) => <span key={a} className="absolute right-2 -translate-y-1/2" style={{ top: `${y(a)}%` }}>{a.toLocaleString('en-GB')}</span>)}
          </div>
          <div ref={box} className="relative" onMouseMove={(e) => pick(e.clientX)} onMouseLeave={() => setHover(null)}>
            {axis.map((a) => <div key={a} className="absolute inset-x-0 border-t border-dashed border-[#F0F0F0]" style={{ top: `${y(a)}%` }} />)}
            {kind === 'line' ? (
              <svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                <defs><linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2563EB" stopOpacity="0.16" /><stop offset="1" stopColor="#2563EB" stopOpacity="0.02" /></linearGradient></defs>
                <path d={`${line} L100,100 L0,100 Z`} fill="url(#trend-fill)" />
                <path d={line} fill="none" stroke="#2563EB" strokeWidth="1.75" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              </svg>
            ) : (
              <div className="absolute inset-0 flex items-end gap-[3px]">
                {points.map((p, i) => (
                  <div key={p.label} className={cx('flex-1 rounded-t-[3px] transition-opacity', hover !== null && hover !== i && 'opacity-60')}
                    style={{ height: `${Math.max(1.5, 100 - y(p.value))}%`, background: 'linear-gradient(180deg,#4A86F8,#2563EB)' }} />
                ))}
              </div>
            )}
            {hp && <>
              {kind === 'line' && <>
                <div className="absolute top-0 bottom-0 border-l border-dashed border-[#A3A3A3]" style={{ left: `${hx}%` }} />
                <div className="absolute size-2.5 rounded-full bg-[#2563EB] ring-2 ring-white -translate-x-1/2 -translate-y-1/2" style={{ left: `${hx}%`, top: `${y(hp.value)}%` }} />
              </>}
              <div className="absolute z-[1] top-1 pointer-events-none rounded-lg border border-line bg-white px-2.5 py-1.5 shadow-[0_4px_12px_rgba(17,24,39,0.08)] whitespace-nowrap"
                style={{ left: `${hx}%`, transform: `translateX(${hx > 70 ? 'calc(-100% - 10px)' : '10px'})` }}>
                <div className="text-xs font-semibold text-ink">{hp.label}</div>
                <div className="text-xs text-[#737373]">{hp.note}</div>
              </div>
            </>}
          </div>
          <div />
          <div className="relative text-xs text-[#737373]">
            {ticks.map((t, i) => <span key={t} className={cx('absolute top-1 whitespace-nowrap', i === 0 ? '' : i === ticks.length - 1 ? '-translate-x-full' : '-translate-x-1/2')} style={{ left: `${(i / (ticks.length - 1)) * 100}%` }}>{t}</span>)}
          </div>
        </div>
      )}
    </Card>
  );
}

const HALL_TONES = ['#2563EB', '#0B8A4C', '#8B2CF5', '#E5530C', '#0E7A80', '#DB2777', '#B45309'];
export type RankRow = { id: string; name: string; value: string; pct: number; warn?: boolean; to: string };
/** Ranked list beside the chart: hall, a short meter, the number. */
export function RankCard({ title, note, rows, more, moreLabel, moreTo, empty }: { title: string; note: string; rows: RankRow[]; more: number; moreLabel: string; moreTo: string; /** Shown when there are no rows. */ empty?: ReactNode }) {
  return (
    <Card className="py-5 px-3 flex flex-col min-w-0 h-[356px]">
      <div className="flex items-center justify-between px-2 mb-2"><h3 className="text-sm font-medium text-ink">{title}</h3><span className="text-xs text-[#737373]">{note}</span></div>
      {!rows.length && empty ? <div className="flex-1 flex flex-col items-center justify-center text-center px-4 gap-3 text-sm text-[#737373]">{empty}</div> : <div className="flex-1 flex flex-col">
        {rows.map((r, i) => (
          <Link key={r.id} to={r.to} className="h-9 px-2 rounded-lg flex items-center gap-3 text-sm hover:bg-[#FAFAFA] outline-none focus-visible:bg-[#FAFAFA]">
            <Building size={16} className="shrink-0" style={{ color: HALL_TONES[i % HALL_TONES.length] }} />
            <span className="flex-1 min-w-0 truncate text-ink">{r.name}</span>
            <span className="w-[60px] h-1 rounded-full bg-[#F0F0F0] overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${r.pct}%`, background: r.warn ? '#F59E0B' : '#2563EB' }} /></span>
            <span className={cx('w-9 text-right tabular-nums', r.warn ? 'text-[#C2410C]' : 'text-ink')}>{r.value}</span>
          </Link>
        ))}
        <Link to={moreTo} className="h-9 px-2 rounded-lg flex items-center gap-3 text-sm text-[#404040] hover:bg-[#FAFAFA]">
          <span className="size-5 -mx-0.5 rounded-full border border-line text-xs text-[#737373] flex items-center justify-center">+{more}</span>{moreLabel}
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
    <Card className="p-5">
      <h3 className="text-sm font-medium text-ink">Allocation funnel</h3>
      <div className="grid grid-cols-5 gap-3 mt-3">
        {steps.map(([label, n], i) => (
          <Link key={label} to={to} className="min-w-0 group">
            <div className="text-xs text-[#737373] truncate group-hover:text-ink">{label}{i > 0 && steps[i - 1][1] > 0 && ` · ${Math.round((n / steps[i - 1][1]) * 100)}%`}</div>
            <div className="text-xl leading-7 font-semibold tracking-tight tabular-nums text-ink">{n.toLocaleString('en-GB')}</div>
            <div className="mt-3 h-12 flex items-end"><div className="w-full rounded-md group-hover:opacity-85" style={{ height: `${steps[0][1] ? Math.round(40 + (n / steps[0][1]) * 60) : 6}%`, background: steps[0][1] ? FUNNEL_FILL[i] : '#F0F0F0' }} data-funnel={i} /></div>
          </Link>
        ))}
      </div>
      <div className="flex items-end justify-between mt-3">
        <div><div className="text-xs text-[#737373]">{caption}</div><div className="text-sm text-ink">{summary}</div></div>
        <ViewLink to={to} />
      </div>
    </Card>
  );
}

export const ViewLink = ({ to, label = 'View' }: { to: string; label?: string }) => (
  <Link to={to} className="flex items-center gap-1 text-sm font-medium text-[#2563EB] hover:underline underline-offset-2">{label}<CaretRight size={14} /></Link>
);

/** 196px summary card: title, body (a big number or three stats), a ruled footer line with one action. */
export function SummaryCard({ title, children, foot, footValue, footTone = 'ink', action }: { title: string; children: ReactNode; foot: string; footValue: string; footTone?: ToneKey; action: ReactNode }) {
  return (
    <Card className="p-5 h-[196px] flex flex-col min-w-0">
      <h3 className="text-sm font-medium text-ink">{title}</h3>
      <div className="flex-1 min-h-0 mt-2">{children}</div>
      <div className="flex items-end justify-between gap-3 pt-3 border-t border-[#F5F5F5]">
        <div className="min-w-0"><div className="text-xs text-[#737373]">{foot}</div><div className={cx('text-sm truncate', tone[footTone])}>{footValue}</div></div>
        <div className="shrink-0">{action}</div>
      </div>
    </Card>
  );
}

export function Stats({ items }: { items: [string, string, ToneKey?][] }) {
  return (
    <div className="grid grid-cols-3 gap-3 pt-1">
      {items.map(([l, v, t]) => <div key={l} className="min-w-0"><div className="text-xs text-[#737373] truncate">{l}</div><div className={cx('text-xl leading-7 font-semibold tabular-nums', tone[t ?? 'ink'])}>{v}</div></div>)}
    </div>
  );
}

/** Big number over a split meter and its legend (Needs your action, To review). */
export function Split({ value, parts }: { value: string; parts: [string, number, string][] }) {
  const total = parts.reduce((a, [, n]) => a + n, 0);
  return (
    <div>
      <div className="text-xl leading-7 font-semibold tabular-nums text-ink">{value}</div>
      <div className="flex gap-0.5 h-1.5 mt-2 rounded-full overflow-hidden bg-[#F0F0F0]">{total > 0 && parts.map(([l, n, c]) => n > 0 && <span key={l} style={{ flex: n / total, background: c }} />)}</div>
      <div className="flex flex-wrap gap-x-3 mt-2 text-xs text-[#737373]">{parts.map(([l, , c]) => <span key={l} className="flex items-center gap-1.5"><span className="size-1.5 rounded-full" style={{ background: c }} />{l}</span>)}</div>
    </div>
  );
}
