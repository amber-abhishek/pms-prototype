import { useState, type DragEvent } from 'react';
import { toast } from 'sonner';
import { ArrowUp, CircleCheckBig, MapPin, Plus, Siren, Timer, UserPlus } from '../../components/icons';
import { cx, Pill } from '../../components/ui';
import { fmtSla, useRms, type Fault } from '../../data/residents';
import { undoToast } from './kit';

/* Maintenance board (Figma 2059:281), refined after Linear and Wrike boards on Refero:
   - each column is a soft borderless well with a status glyph, so the stage reads before the label;
   - the header counts the jobs and flags how many are past SLA;
   - cards lead with the ref and the assignee, then the title and room, then priority, category and time;
   - clicking a card opens it in a side sheet (the board stays put); dragging moves it, with Undo. */

type ColId = 'new' | 'assigned' | 'progress' | 'parts' | 'fixed';
const COLS: { id: ColId; label: string }[] = [
  { id: 'new', label: 'New' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'progress', label: 'In progress' },
  { id: 'parts', label: 'Waiting on parts' },
  { id: 'fixed', label: 'Resolved' },
];

export const colOf = (f: Fault): ColId =>
  f.status === 'Fixed' ? 'fixed' : f.status === 'Waiting on parts' ? 'parts' : f.status === 'In progress' ? 'progress' : f.assignee ? 'assigned' : 'new';

/** How many fixed jobs count as "resolved in the last 7 days" in the demo data. */
const RECENT_FIXED = 6;

const ini = (n: string) => (n === 'Front desk' ? 'FD' : n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase());
const isLate = (f: Fault) => f.slaMins < 0 && f.status !== 'Fixed' && f.status !== 'Waiting on parts';

/** What the move to a column changes on the job, or why it can't go there. */
function moveTo(f: Fault, col: ColId): Partial<Fault> | string {
  if (col === 'new') return { status: 'New', assignee: undefined, stage: 1 };
  if (!f.assignee) return 'Assign someone first';
  if (col === 'assigned') return { status: 'New', stage: 2 };
  if (col === 'progress') return { status: 'In progress', stage: 3 };
  if (col === 'parts') return { status: 'Waiting on parts', stage: 3 };
  return { status: 'Fixed', stage: 5, fixedIn: f.fixedIn ?? '1d 2h' };
}

/** Linear-style stage glyph: dashed (new), quarter (assigned), half (in progress), paused, done. */
function StageGlyph({ col }: { col: ColId }) {
  const c = { new: '#A3A3A3', assigned: '#2563EB', progress: '#F59E0B', parts: '#F97316', fixed: '#12A15A' }[col];
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="shrink-0">
      {col === 'fixed' ? (
        <><circle cx="7" cy="7" r="6.5" fill={c} /><path d="M4.4 7.2l1.8 1.8 3.4-3.6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></>
      ) : (
        <>
          <circle cx="7" cy="7" r="5.75" stroke={c} strokeWidth="1.5" strokeDasharray={col === 'new' ? '2.2 1.8' : undefined} />
          {col === 'assigned' && <path d="M7 7V3.5A3.5 3.5 0 0 1 10.5 7Z" fill={c} />}
          {col === 'progress' && <path d="M7 3.5A3.5 3.5 0 0 1 7 10.5Z" fill={c} />}
          {col === 'parts' && <path d="M5.75 5v4M8.25 5v4" stroke={c} strokeWidth="1.5" strokeLinecap="round" />}
        </>
      )}
    </svg>
  );
}

export function MaintenanceBoard({ faults, showResolved, onLog, selected, onOpen }: {
  faults: Fault[]; showResolved: boolean; onLog: () => void; selected: string | null; onOpen: (id: string) => void;
}) {
  const update = useRms((s) => s.update);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<ColId | null>(null);
  const cols = COLS.filter((c) => showResolved || c.id !== 'fixed');

  const drop = (col: ColId) => {
    const f = faults.find((x) => x.id === dragId);
    setDragId(null); setOver(null);
    if (!f || colOf(f) === col) return;
    const ch = moveTo(f, col);
    if (typeof ch === 'string') { toast.error(ch, { description: `Open ${f.ref} to choose who fixes it.` }); return; }
    const undo = update('faults', f.id, ch);
    undoToast(`${f.ref} moved to ${COLS.find((c) => c.id === col)!.label}`, undo);
  };

  return (
    <div className="flex-1 min-h-0 overflow-x-auto px-5 pt-3 pb-5">
      <div className="h-full min-w-[1080px] flex gap-3">
        {cols.map((c) => {
          /* Resolved holds the last 7 days only: the newest fixed jobs. */
          const all = faults.filter((f) => colOf(f) === c.id);
          const items = c.id === 'fixed' ? [...all].sort((a, z) => z.ref.localeCompare(a.ref, undefined, { numeric: true })).slice(0, RECENT_FIXED) : all;
          const late = items.filter(isLate).length;
          const on = over === c.id && !!dragId;
          return (
            <section key={c.id} aria-label={c.label}
              onDragOver={(e) => { if (!dragId) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (over !== c.id) setOver(c.id); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }}
              onDrop={(e) => { e.preventDefault(); drop(c.id); }}
              className={cx('w-0 flex-1 min-h-0 flex flex-col rounded-xl transition-colors',
                on ? 'bg-[#EFF6FF] shadow-[inset_0_0_0_1.5px_#93C5FD]' : 'bg-[#F7F8FA]')}>
              <header className="h-10 shrink-0 flex items-center gap-2 pl-3 pr-1.5">
                <StageGlyph col={c.id} />
                <h3 className="text-sm leading-5 font-semibold text-ink truncate">{c.label}</h3>
                <span className="text-xs tabular-nums text-[#737373]">{items.length}</span>
                {late > 0 && <Pill tone="red">{late} overdue</Pill>}
                {c.id === 'new' && (
                  <button type="button" aria-label="Log a fault" onClick={onLog}
                    className="ml-auto size-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-ink hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Plus size={14} />
                  </button>
                )}
              </header>
              <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2 flex flex-col gap-2">
                {items.map((f) => <JobCard key={f.id} f={f} col={c.id} selected={selected === f.id} dragging={dragId === f.id} onDrag={setDragId} onOpen={onOpen} />)}
                {!items.length && (
                  <div className={cx('h-20 shrink-0 rounded-lg border border-dashed flex items-center justify-center text-xs', on ? 'border-[#93C5FD] text-primary' : 'border-[#D4D4D4] text-gray-400')}>
                    {on ? 'Drop here' : 'No jobs'}
                  </div>
                )}
                {c.id === 'fixed' && all.length > items.length && (
                  <div className="pt-1 pb-0.5 text-center text-xs text-gray-400">Older fixes are in the table</div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* Job card (Figma 3396:29012): ref and a filled priority chip on top; title; room; then who has it on the
   left and the time on the right. Overdue shows as red "Unassigned" and red time, with no alert box; the
   category lives in the side panel. */
function JobCard({ f, col, selected, dragging, onDrag, onOpen }: {
  f: Fault; col: ColId; selected: boolean; dragging: boolean; onDrag: (id: string | null) => void; onOpen: (id: string) => void;
}) {
  const late = isLate(f);
  const fixed = col === 'fixed';
  const time = fixed ? `Fixed in ${f.fixedIn ?? '—'}` : col === 'parts' ? 'Deadline paused' : late ? `${fmtSla(-f.slaMins)} over` : `${fmtSla(f.slaMins)} left`;
  return (
    <button type="button" draggable aria-pressed={selected}
      onDragStart={(e: DragEvent) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', f.id); onDrag(f.id); }}
      onDragEnd={() => onDrag(null)}
      onClick={() => onOpen(f.id)}
      className={cx('shrink-0 w-full text-left rounded-[10px] border bg-white p-3 flex flex-col gap-1.5 cursor-pointer',
        'transition-[border-color,box-shadow,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected ? 'border-primary shadow-[0_0_0_3px_rgba(37,99,235,0.12)]' : 'border-[#E5E5E5] shadow-[0_1px_2px_rgba(17,24,39,0.04)] hover:shadow-[0_0_0_1px_rgba(17,24,39,0.04),0_1px_2px_rgba(17,24,39,0.12)]',
        dragging && 'opacity-40')}>
      <div className="min-h-[22px] flex items-center justify-between gap-2">
        <span className="font-mono text-xs leading-4 text-[#737373] whitespace-nowrap">{f.ref}</span>
        {!fixed && f.priority === 'Urgent' && <Chip className="bg-[#FDECEE] text-[#C81E30]"><Siren size={12} />Urgent</Chip>}
        {!fixed && f.priority === 'High' && <Chip className="bg-[#FFF0E0] text-[#C2410C]"><ArrowUp size={12} />High</Chip>}
      </div>
      <div className={cx('text-sm leading-5 font-semibold line-clamp-2', fixed ? 'text-[#525252]' : 'text-ink')}>{f.title}</div>
      <div className="flex items-center gap-1 text-xs leading-4 text-[#737373] min-w-0"><MapPin size={12} className="shrink-0" /><span className="truncate">{f.where}</span></div>
      <div className="pt-1.5 flex items-center justify-between gap-2 min-w-0">
        {f.assignee ? (
          <span title={f.assignee} className="flex items-center gap-1.5 min-w-0">
            <span className="size-6 shrink-0 rounded-full bg-[#EEF2FF] text-[11px] font-semibold text-[#3730A3] flex items-center justify-center">{ini(f.assignee)}</span>
            {/* Columns are narrow, so the card shows a short name ("Dave", "Estates"); the full name is on hover and in the panel. */}
            <span className="text-xs leading-4 font-medium text-[#404040] truncate">{f.assignee === 'Front desk' ? f.assignee : f.assignee.split(' ')[0]}</span>
          </span>
        ) : (
          <span className={cx('flex items-center gap-1.5 text-xs leading-4 font-medium', late ? 'text-[#C81E30]' : 'text-[#737373]')}>
            <span className={cx('size-6 shrink-0 rounded-full border border-dashed flex items-center justify-center', late ? 'border-[#C81E30]' : 'border-[#A3A3A3] text-gray-400')}><UserPlus size={12} /></span>
            Unassigned
          </span>
        )}
        <span className={cx('shrink-0 flex items-center gap-1 text-xs leading-4 tabular-nums',
          late ? 'font-semibold text-[#C81E30]' : fixed ? 'font-medium text-[#0B8A4C]' : 'font-medium text-[#737373]')}>
          {fixed ? <CircleCheckBig size={12} /> : <Timer size={12} />}{time}
        </span>
      </div>
    </button>
  );
}

function Chip({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cx('h-[22px] px-1.5 rounded-md text-xs font-medium flex items-center gap-1 whitespace-nowrap', className)}>{children}</span>;
}
