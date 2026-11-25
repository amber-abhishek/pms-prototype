import { useEffect, useState } from 'react';
import { CalendarRange, CaretDown, CaretLeft, CaretRight } from './icons';
import { Popover, PopoverContent, PopoverTrigger } from './shadcn/popover';
import { Button as UIButton } from './shadcn/button';
import { cx } from './ui';

/** A date range, both ends inclusive, as UTC midnights. */
export type Range = { from: Date; to: Date };
export type RangePreset = { id: string; label: string; range: Range };

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
export const fmtDay = (x: Date) => `${x.getUTCDate()} ${MON[x.getUTCMonth()]} ${x.getUTCFullYear()}`;
/** Short: "1 – 30 Sep 2026" in one month, "5 Oct – 11 Dec 2026" in one year, "1 Sep 26 – 31 Aug 27" across years. */
export const fmtRange = ({ from, to }: Range) => {
  const dm = (x: Date) => `${x.getUTCDate()} ${MON[x.getUTCMonth()]}`;
  if (from.getUTCFullYear() !== to.getUTCFullYear()) return `${dm(from)} ${String(from.getUTCFullYear()).slice(2)} – ${dm(to)} ${String(to.getUTCFullYear()).slice(2)}`;
  if (from.getUTCMonth() === to.getUTCMonth()) return `${from.getUTCDate()} – ${dm(to)} ${to.getUTCFullYear()}`;
  return `${dm(from)} – ${dm(to)} ${to.getUTCFullYear()}`;
};
export const sameRange = (a: Range, b: Range) => a.from.getTime() === b.from.getTime() && a.to.getTime() === b.to.getTime();

const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const now = new Date();
const TODAY = utc(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

/** One month of days, Monday first, in the app's style: month name with ‹ ›, mono weekday letters, the picked day a
 *  blue square, today a small dot. Days between `from` and `to` (when given) sit on a light blue band. */
function MonthCalendar({ value, onPick, from, to }: { value: Date; onPick: (d: Date) => void; from?: Date; to?: Date }) {
  const [month, setMonth] = useState(utc(value.getUTCFullYear(), value.getUTCMonth(), 1));
  const y = month.getUTCFullYear(), m = month.getUTCMonth();
  const lead = (month.getUTCDay() + 6) % 7;
  const days = Array.from({ length: 42 }, (_, i) => utc(y, m, 1 - lead + i));
  const weeks = days[35].getUTCMonth() === m ? 6 : 5;
  return (
    <div className="w-[272px]">
      <div className="h-11 pl-4 pr-2 flex items-center border-b border-[#E5E5E5]">
        <span className="text-sm leading-5 font-medium text-[#0A0A0A]">{MONTH[m]} {y}</span>
        <span className="ml-auto flex items-center">
          {([[-1, CaretLeft, 'Previous month'], [1, CaretRight, 'Next month']] as const).map(([n, I, l]) => (
            <button key={n} type="button" aria-label={l} onClick={() => setMonth(utc(y, m + n, 1))}
              className="size-7 rounded-md flex items-center justify-center text-[#525252] hover:bg-[#F5F5F5] hover:text-[#0A0A0A] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"><I size={16} strokeWidth={1.75} /></button>
          ))}
        </span>
      </div>
      <div className="px-3 pt-1 pb-3">
        <div className="grid grid-cols-7">
          {DOW.map((d) => <span key={d} className="h-8 flex items-center justify-center font-mono text-[11px] leading-4 uppercase text-[#737373]">{d}</span>)}
        </div>
        <div role="grid" aria-label={`${MONTH[m]} ${y}`} className="grid grid-cols-7 gap-y-0.5">
          {days.slice(0, weeks * 7).map((x) => {
            const t = x.getTime(), out = x.getUTCMonth() !== m, on = t === value.getTime(), today = t === TODAY.getTime();
            const band = !!from && !!to && x >= from && x <= to && !on;
            return (
              <div key={t} className={cx('h-8 flex items-center justify-center', band && 'bg-[#EFF6FF]')}>
                <button type="button" aria-label={fmtDay(x)} aria-pressed={on} onClick={() => onPick(x)}
                  className={cx('relative size-8 rounded-lg text-sm tabular-nums transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    on ? 'bg-[#2563EB] text-white font-medium' : out ? 'text-[#A3A3A3] hover:bg-[#F5F5F5]' : band ? 'text-[#1E40AF] hover:bg-[#DBEAFE]' : 'text-[#0A0A0A] hover:bg-[#F5F5F5]')}>
                  {x.getUTCDate()}
                  {today && <span aria-hidden className={cx('absolute bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full', on ? 'bg-white' : 'bg-[#2563EB]')} />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** A date field in the app's input style (32px, r8, #E5E5E5 edge, blue focus) that opens MonthCalendar. */
function DateField({ label, value, onChange, from, to }: { label: string; value: Date; onChange: (d: Date) => void; from?: Date; to?: Date }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1 text-xs leading-4 text-[#737373]">
      {label}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" aria-label={`${label}: ${fmtDay(value)}`}
            className="h-8 px-2.5 rounded-lg border border-[#E5E5E5] bg-white flex items-center gap-2 text-left text-sm text-[#0A0A0A] tabular-nums shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-[border-color,box-shadow] duration-150 outline-none hover:border-[#D4D4D4] data-[state=open]:border-[#2563EB] data-[state=open]:shadow-[0_0_0_1px_#2563EB] focus-visible:border-[#2563EB] focus-visible:shadow-[0_0_0_1px_#2563EB]">
            <span className="flex-1">{fmtDay(value)}</span>
            <CalendarRange size={16} strokeWidth={1.5} className="text-[#737373]" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="w-auto p-0 overflow-hidden">
          <MonthCalendar value={value} from={from} to={to} onPick={(d) => { onChange(d); setOpen(false); }} />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** The page's main date control: a 32px trigger reading the preset's name or short dates, opening presets on the left
 *  and a custom From / To on the right, each field opening the app's own calendar (no native date input).
 *  Presets apply at once; custom dates apply with Apply. */
export function DateRangePicker({ value, onChange, presets }: { value: Range; onChange: (r: Range) => void; presets: RangePreset[] }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(value.from);
  const [to, setTo] = useState(value.to);
  useEffect(() => { if (open) { setFrom(value.from); setTo(value.to); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const bad = to < from;
  const active = presets.find((p) => sameRange(p.range, value));
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Date range: ${fmtRange(value)}`}
          className="shrink-0 h-8 pl-2.5 pr-2 rounded-lg border border-[#D4D4D4] bg-white text-sm font-medium text-[#0A0A0A] flex items-center gap-2 shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:bg-[#F5F5F5] data-[state=open]:bg-[#F5F5F5] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <CalendarRange size={16} strokeWidth={1.5} className="text-[#404040]" />
          {/* A preset reads as its name alone; a custom range as short dates. */}
          <span className="tabular-nums">{active ? active.label : fmtRange(value)}</span>
          <CaretDown size={16} strokeWidth={1.5} className="text-[#737373]" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[460px] p-0 overflow-hidden">
        <div className="flex">
          <div role="menu" aria-label="Presets" className="w-[200px] py-1 border-r border-[#E5E5E5]">
            {presets.map((p) => {
              const on = active?.id === p.id;
              return (
                <button key={p.id} type="button" role="menuitemradio" aria-checked={on} onClick={() => { onChange(p.range); setOpen(false); }}
                  className={cx('w-full px-4 py-2 text-left text-sm hover:bg-[#F5F5F5] focus-visible:bg-[#F5F5F5] outline-none transition-colors', on ? 'text-[#2563EB]' : 'text-[#0A0A0A]')}>{p.label}</button>
              );
            })}
          </div>
          <div className="flex-1 p-4 flex flex-col gap-3">
            <div className="font-mono text-xs leading-4 font-medium uppercase tracking-[0.48px] text-[#737373]">Custom</div>
            <DateField label="From" value={from} onChange={setFrom} from={from} to={to} />
            <DateField label="To" value={to} onChange={setTo} from={from} to={to} />
            {bad && <p className="text-xs leading-4 text-[#E0243A]">The end is before the start.</p>}
            <UIButton size="sm" className="h-8 mt-auto" disabled={bad} onClick={() => { onChange({ from, to }); setOpen(false); }}>Apply</UIButton>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
