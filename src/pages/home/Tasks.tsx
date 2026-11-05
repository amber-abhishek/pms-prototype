import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlarmClock, AlarmClockOff, ArrowsDownUp, ArrowsLeftRight, Bell, CalendarBlank, CalendarX, Check, CheckCircle, Plus, XCircle } from '../../components/icons';
import { toast } from 'sonner';
import { Button, Empty, Field, FilterButton, Input, PageHeader, Select, Sheet, Tabs, cx } from '../../components/ui';
import { useOpen } from '../hooks';
import { DONE_EARLIER, EXTRAS, ME, PEOPLE, TOM_HIDDEN, useHome, type CaseId, type Due, type HTask } from '../../data/home';
import { Box, CaughtUp, DuePill, Who, fromIcon } from './parts';
import { ROW_IN_MS, TaskSheet, useChange, useReturned } from './TaskSheet';
import { rowAttrs, useRowMotion } from '../../components/rowMotion';
import { SnoozeMenu, useSnooze } from './Snooze';

const order: Record<Due, number> = { overdue: 0, today: 1, week: 2 };
const groupLabel: Record<Due, string> = { overdue: 'Overdue', today: 'Today', week: 'This week' };

function NewTaskButton({ scope }: { scope: 'main' | CaseId }) {
  const patch = useHome((s) => s.patch);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [due, setDue] = useState<Due>('today');
  const [owner, setOwner] = useState(ME);
  const busy = useRef(false);
  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy.current || !title.trim()) return;
    busy.current = true;
    const dueLabel = due === 'today' ? 'Today' : due === 'overdue' ? 'Overdue' : 'Fri 18 Sep';
    const id = `n${Date.now()}`;
    /* The new task opens into the list the same way an undone one comes back. */
    useReturned.setState({ ids: [id] });
    window.setTimeout(() => useReturned.setState({ ids: [] }), ROW_IN_MS + 50);
    patch(scope, (rows) => [{ id, title: title.trim(), sub: scope === 'main' ? undefined : 'Added by you', from: { icon: 'task', label: 'Added by you' }, due, dueLabel, dueTone: due === 'today' ? 'orange' : due === 'overdue' ? 'red' : 'grey', owner, done: false }, ...rows]);
    toast.success(owner === ME ? 'Task added to your list' : `Task added for ${owner}`);
    setOpen(false); setTitle(''); setDue('today'); setOwner(ME);
    setTimeout(() => { busy.current = false; }, 0);
  };
  return (
    <>
      <Button variant="primary" icon={Plus} onClick={() => setOpen(true)}>New task</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="New task" sub="Tasks made here are not tied to a record" width={480}
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" type="submit" form="new-task" disabled={!title.trim()}>Add task</Button></>}>
        <form id="new-task" onSubmit={create} className="space-y-4">
          <Field label="Task"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Call the lift engineer about Ustinov B block" /></Field>
          <Field label="Due"><Select value={due} onChange={(e) => setDue(e.target.value as Due)}><option value="today">Today</option><option value="week">This week</option></Select></Field>
          <Field label="Owner"><Select value={owner} onChange={(e) => setOwner(e.target.value)}>{Object.keys(PEOPLE).map((p) => <option key={p}>{p}</option>)}</Select></Field>
        </form>
      </Sheet>
    </>
  );
}

/* ================= My tasks (Flow 1: 2994–2997, caught-up 3087) ================= */
type MainTab = 'mine' | 'team' | 'snoozed' | 'done';
export function TasksPage() {
  const [sp] = useSearchParams();
  const c = sp.get('case') as CaseId | null;
  if (c && c in EXTRAS) return <TeamBoard scope={c} />;
  return <MyTasks />;
}

function MyTasks() {
  const rows = useHome((s) => s.rows.main);
  const change = useChange('main');
  const [open, setOpen] = useOpen();
  const [tab, setTab] = useState<MainTab>('mine');
  const [f, setF] = useState<Record<string, string>>({});
  const [desc, setDesc] = useState(false);
  const [showWeek, setShowWeek] = useState(false);

  const openRows = rows.filter((r) => !r.done && !r.snoozed);
  const mineRows = openRows.filter((r) => r.owner === ME || r.handedFrom === ME);
  const mineCount = openRows.filter((r) => r.owner === ME).length;
  /* Snoozing is personal: it hides a task from your list, not the team's. */
  const snoozedRows = rows.filter((r) => !r.done && r.snoozed && r.owner === ME).sort((a, b) => a.snoozed!.until.localeCompare(b.snoozed!.until));
  const { wake } = useSnooze('main');
  const doneRows = rows.filter((r) => r.done);
  const areas = [...new Set(rows.map((r) => r.from?.label.split(' · ')[0]).filter(Boolean) as string[])];
  const owners = [...new Set(openRows.map((r) => r.owner))];

  const shown = useMemo(() => {
    let base = tab === 'mine' ? mineRows : tab === 'team' ? openRows : tab === 'snoozed' ? snoozedRows : doneRows;
    if (f.from) base = base.filter((r) => r.from?.label.startsWith(f.from));
    if (f.owner) base = base.filter((r) => r.owner === f.owner);
    return base;
  }, [tab, rows, f]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = (['overdue', 'today', 'week'] as Due[]).map((g) => {
    const list = shown.filter((r) => r.due === g);
    return { g, list: desc ? [...list].reverse() : list };
  }).filter((x) => x.list.length);
  const ordered = desc ? [...groups].reverse() : groups;
  const caughtUp = tab === 'mine' && !shown.some((r) => r.due !== 'week' && r.owner === ME) && !showWeek;

  const toggleDone = (t: HTask, v: boolean) =>
    change((rs) => rs.map((r) => (r.id === t.id ? { ...r, done: v, doneBy: v ? ME : undefined, doneLabel: v ? 'Mon 14 Sep' : undefined } : r)), v ? <span>Done · {t.title}</span> : <span>Moved back to My tasks</span>);

  const task = rows.find((r) => r.id === open);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <PageHeader icon={CheckCircle} title="My tasks"><NewTaskButton scope="main" /></PageHeader>
      <div className="h-[52px] shrink-0 px-4 flex items-center gap-2 border-b border-[#F3F4F6]">
        <Tabs value={tab} onChange={(v) => { setTab(v); setShowWeek(false); }} tabs={[
          { id: 'mine', label: 'Mine', count: mineCount },
          { id: 'team', label: 'Team', count: openRows.length },
          { id: 'snoozed', label: 'Snoozed', count: snoozedRows.length },
          { id: 'done', label: 'Done', count: DONE_EARLIER + doneRows.length },
        ]} />
        <div className="ml-auto flex items-center gap-2">
          <FilterButton value={f} onChange={setF} defs={[{ id: 'from', label: 'From', options: areas }, { id: 'owner', label: 'Owner', options: owners }]} />
          <Button size="sm" icon={ArrowsDownUp} onClick={() => setDesc((d) => !d)} aria-label={`Sort by due date, ${desc ? 'latest' : 'soonest'} first`}>Due date</Button>
        </div>
      </div>

      {caughtUp ? (
        <CaughtUp>
          <Button icon={CalendarBlank} onClick={() => setShowWeek(true)}>See this week</Button>
          <Button icon={Check} onClick={() => setTab('done')}>See done</Button>
        </CaughtUp>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-[48px_minmax(0,1fr)_302px_203px_108px_48px] h-9 items-center text-xs font-medium text-gray-500 border-b border-line sticky top-0 bg-white z-[1] [&>span]:px-3">
            <span /><span>Task</span><span>From</span><span>{tab === 'done' ? 'Done' : tab === 'snoozed' ? 'Back' : 'Due'}</span><span>Owner</span><span />
          </div>
          {tab === 'snoozed' ? (
            shown.length ? shown.map((r) => <MainRow key={r.id} t={r} onOpen={() => setOpen(r.id)} onCheck={(v) => toggleDone(r, v)} onWake={() => wake(r)} />)
              : <Empty icon={AlarmClock} title="Nothing snoozed" sub="Snooze a task to hide it from Mine until later. It comes back on its own." />
          ) : tab === 'done' ? (
            doneRows.length ? doneRows.filter((r) => shown.includes(r)).map((r) => <MainRow key={r.id} t={r} onOpen={() => setOpen(r.id)} onCheck={(v) => toggleDone(r, v)} />)
              : <Empty icon={CheckCircle} title="Nothing done yet" sub="Tasks you tick off show up here." />
          ) : ordered.length === 0 ? (
            <Empty title="No tasks match these filters" sub="Try another filter or clear them." />
          ) : ordered.map(({ g, list }) => (
            <div key={g}>
              <div className="h-8 px-5 flex items-center text-xs bg-[#F9FAFB] border-b border-line"><span className="font-medium text-ink">{groupLabel[g]}</span><span className="text-gray-500 ml-1">· {list.length}</span></div>
              {list.map((r) => <MainRow key={r.id} t={r} handed={tab === 'mine' && r.owner !== ME} onOpen={() => setOpen(r.id)} onCheck={(v) => toggleDone(r, v)} />)}
            </div>
          ))}
        </div>
      )}
      <div className="h-10 shrink-0 px-5 flex items-center border-t border-line text-xs text-gray-500">Tasks come from every area of the PMS: anything that waits on you lands here</div>
      <TaskSheet scope="main" task={task} onClose={() => setOpen(null)} />
    </div>
  );
}

/* Ticking a task: show it ticked and struck through for a beat, then the row fades and closes up, then it moves to Done.
   Unticking (on the Done tab) leaves the same way. */
const HOLD_MS = 550;
const LEAVE_MS = 200;

function MainRow({ t, handed, onOpen, onCheck, onWake }: { t: HTask; handed?: boolean; onOpen: () => void; onCheck: (v: boolean) => void; onWake?: () => void }) {
  const I = t.from ? fromIcon[t.from.icon] : CheckCircle;
  const [phase, setPhase] = useState<'idle' | 'ticked' | 'leaving'>('idle');
  const check = (v: boolean) => {
    if (phase !== 'idle') return;
    setPhase('ticked');
    window.setTimeout(() => setPhase('leaving'), HOLD_MS);
    window.setTimeout(() => onCheck(v), HOLD_MS + LEAVE_MS);
  };
  const done = phase === 'idle' ? t.done : !t.done;
  /* Brought back by Undo: mount closed, then open up to full height on the next frame (the exit, reversed). */
  const [entering, setEntering] = useState(() => useReturned.getState().ids.includes(t.id));
  useEffect(() => {
    if (!entering) return;
    const f = requestAnimationFrame(() => requestAnimationFrame(() => setEntering(false)));
    return () => cancelAnimationFrame(f);
  }, [entering]);
  const closed = phase === 'leaving' || entering;
  return (
    <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}
      style={{ transitionDuration: `${phase === 'leaving' ? LEAVE_MS : ROW_IN_MS}ms` }}
      className={cx('group grid grid-cols-[48px_minmax(0,1fr)_302px_203px_108px_48px] items-center border-b border-[#F3F4F6] text-sm cursor-pointer hover:bg-[#F9FAFB] focus-visible:bg-[#F9FAFB] outline-none overflow-hidden transition-[height,opacity,border-color,background-color] ease-snappy',
        closed ? 'h-0 opacity-0 border-transparent' : 'h-10 opacity-100')}>
      <span className="pl-5"><Box checked={done} disabled={handed} label={done ? `Mark “${t.title}” not done` : `Mark “${t.title}” done`} onChange={check} /></span>
      <span className={cx('truncate px-3 font-medium transition-colors duration-150', handed || done ? 'text-gray-400' : 'text-ink', done && 'line-through')}>{t.title}</span>
      <span className="flex items-center gap-1.5 px-3 text-gray-500 truncate">{I && <I size={14} className="text-gray-400 shrink-0" />}{t.from?.label}</span>
      <span className="px-3">{t.done ? <span className="text-xs text-gray-500">{t.doneLabel}</span> : t.snoozed ? <span className="inline-flex items-center gap-1.5 text-[#646A78]"><AlarmClock size={14} className="text-gray-400" />{t.snoozed.label}</span> : <DuePill t={t} />}</span>
      <span className="px-3" title={t.owner}><Who name={t.owner} grad /></span>
      <span className="flex justify-center">
        {t.snoozed && onWake ? (
          <RowAction label={`Unsnooze “${t.title}”`} onClick={(e) => { e.stopPropagation(); onWake(); }}><AlarmClockOff size={16} /></RowAction>
        ) : !t.done && !handed && t.owner === ME ? (
          <SnoozeMenu t={t} scope="main"><RowAction label={`Snooze “${t.title}”`}><AlarmClock size={16} /></RowAction></SnoozeMenu>
        ) : null}
      </span>
    </div>
  );
}

/* ================= Team board with Overdue / Today / This week / Done (E1–E3, 3087) ================= */
type BoardTab = 'overdue' | 'today' | 'week' | 'done';
function TeamBoard({ scope }: { scope: CaseId }) {
  const rows = useHome((s) => s.rows[scope]);
  const change = useChange(scope);
  const x = EXTRAS[scope];
  const [open, setOpen] = useOpen();
  const [tab, setTab] = useState<BoardTab>(x.tab);
  const [desc, setDesc] = useState(false);
  const tomOverdue = rows.filter((r) => !r.done && r.owner === 'Tom Baker' && r.due === 'overdue');
  const showBanner = scope === 'e3' && tomOverdue.length > 0;
  const [sel, setSel] = useState<string[]>(() => (scope === 'e3' ? tomOverdue.map((r) => r.id) : []));
  const [reassign, setReassign] = useState(false);
  const busy = useRef(false);

  const openRows = rows.filter((r) => !r.done);
  const n = (d: Due) => x[d] + openRows.filter((r) => r.due === d).length;
  const doneCount = x.done + rows.filter((r) => r.done).length;
  const nothingNow = n('overdue') === 0 && n('today') === 0;

  let shown = tab === 'done' ? rows.filter((r) => r.done)
    // The default Overdue tab lists everything open, overdue first, as the frames show.
    : tab === 'overdue' ? [...openRows].sort((a, b) => order[a.due] - order[b.due])
    : openRows.filter((r) => r.due === tab);
  if (desc) shown = [...shown].reverse();
  const { items: moving, bodyRef } = useRowMotion<HTask, HTMLDivElement>(shown);
  const emptyNow = (tab === 'overdue' || tab === 'today') && nothingNow;
  const selTom = tomOverdue.filter((r) => sel.includes(r.id));
  const pile = TOM_HIDDEN + selTom.length;

  const doReassign = () => {
    if (busy.current) return;
    busy.current = true;
    const picked = selTom;
    const toAisha = picked.filter((r) => r.detail?.hall !== 'Ustinov').map((r) => r.id);
    const toMe = picked.filter((r) => r.detail?.hall === 'Ustinov').map((r) => r.id);
    const hiddenUstinov = 1;
    change((rs) => rs.map((r) => (toAisha.includes(r.id) ? { ...r, owner: 'Aisha Khan' } : toMe.includes(r.id) ? { ...r, owner: ME } : r)),
      `${toAisha.length + TOM_HIDDEN - hiddenUstinov} tasks to Aisha Khan · ${toMe.length + hiddenUstinov} to you · Tom gets a summary on Monday`);
    setSel([]); setReassign(false);
    setTimeout(() => { busy.current = false; }, 0);
  };

  const task = rows.find((r) => r.id === open);
  const toAishaN = selTom.filter((r) => r.detail?.hall !== 'Ustinov').length + TOM_HIDDEN - 1;
  const toMeN = pile - toAishaN;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <PageHeader icon={CheckCircle} title="My tasks">
        <FilterButton value={{}} onChange={() => toast('Filters apply to the full list')} defs={[{ id: 'owner', label: 'Owner', options: Object.keys(PEOPLE) }]} />
        <NewTaskButton scope={scope} />
      </PageHeader>
      {showBanner && (
        <div className="px-5 pt-4">
          <div className="rounded-lg border border-[#A16207]/35 bg-white px-3 py-2.5 flex items-center gap-3">
            <CalendarX size={16} className="text-[#A16207] shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm leading-5 font-medium text-[#A16207]">{TOM_HIDDEN + tomOverdue.length} overdue tasks belong to Tom Baker, who is on leave until Monday</div>
              <div className="text-xs text-gray-500">Tasks don’t move on their own when someone is away. Pick them and hand them on together.</div>
            </div>
            <Button size="sm" icon={ArrowsLeftRight} disabled={selTom.length === 0} onClick={() => setReassign(true)}>Reassign {pile}</Button>
          </div>
        </div>
      )}
      <div className="h-[52px] shrink-0 px-4 flex items-center gap-2 border-b border-[#F3F4F6]">
        <Tabs value={tab} onChange={setTab} tabs={[
          { id: 'overdue', label: 'Overdue', count: n('overdue') },
          { id: 'today', label: 'Today', count: n('today') },
          { id: 'week', label: 'This week', count: n('week') },
          { id: 'done', label: 'Done', count: doneCount },
        ]} />
        <div className="ml-auto"><Button size="sm" icon={ArrowsDownUp} onClick={() => setDesc((d) => !d)}>Due date</Button></div>
      </div>
      {emptyNow ? (
        <CaughtUp>
          <Button icon={CalendarBlank} onClick={() => setTab('week')}>See this week</Button>
          <Button icon={Check} onClick={() => setTab('done')}>See done</Button>
        </CaughtUp>
      ) : (
        <div ref={bodyRef} className="flex-1 overflow-auto">
          <div className="grid grid-cols-[48px_minmax(0,1fr)_263px_271px] h-9 items-center text-xs font-medium text-gray-500 border-b border-line [&>span]:px-3">
            <span /><span>Task</span><span>{tab === 'done' ? 'Done' : 'Due'}</span><span>Owner</span>
          </div>
          {shown.length === 0 && (tab === 'done'
            ? <Empty icon={CheckCircle} title="Nothing done in this list yet" sub="Tasks you tick off show up here." />
            : <Empty title="Nothing in this list" sub="Try another tab or clear the filters." />)}
          {moving.map(({ row: r, motion }) => (
            <div key={r.id} {...rowAttrs(r.id, motion)} role="button" tabIndex={0} onClick={() => setOpen(r.id)} onKeyDown={(e) => { if (e.key === 'Enter') setOpen(r.id); }}
              className="grid grid-cols-[48px_minmax(0,1fr)_263px_271px] h-10 items-center border-b border-[#F3F4F6] text-sm cursor-pointer hover:bg-[#F9FAFB] outline-none focus-visible:bg-[#F9FAFB]">
              <span className="pl-5">
                <Box checked={sel.includes(r.id) || r.done} disabled={r.done} label={`Select “${r.title}”`}
                  onChange={(v) => setSel((s) => (v ? [...s, r.id] : s.filter((id) => id !== r.id)))} />
              </span>
              <span className="min-w-0 px-3">
                <span className={cx('block truncate leading-[18px] font-medium', r.done ? 'text-gray-400 line-through' : 'text-ink')}>{r.title}</span>
                {r.sub && <span className="block truncate text-xs leading-4 text-gray-500">{r.sub}</span>}
              </span>
              <span className="px-3">{r.done ? <span className="text-xs text-gray-500">by {r.doneBy === ME ? 'you' : r.doneBy}</span> : <DuePill t={r} clock />}</span>
              <span className="px-3 flex items-center gap-2 font-medium text-ink"><Who name={r.owner} />{r.owner}</span>
            </div>
          ))}
        </div>
      )}
      {sel.length > 0 && !showBanner && (
        <div className="h-12 shrink-0 px-5 flex items-center gap-3 border-t border-line text-sm">
          <span className="text-gray-600">{sel.length} selected</span>
          <Button size="sm" icon={Check} onClick={() => { change((rs) => rs.map((r) => (sel.includes(r.id) ? { ...r, done: true, doneBy: ME } : r)), `${sel.length} marked as done`); setSel([]); }}>Mark done</Button>
          <Button size="sm" variant="ghost" onClick={() => setSel([])}>Clear</Button>
        </div>
      )}
      <TaskSheet scope={scope} task={task} onClose={() => setOpen(null)} />

      {/* E3 step 2: choose who */}
      <Sheet open={reassign} onClose={() => setReassign(false)} width={520}
        title={<span className="flex items-center gap-2.5"><span className="size-8 rounded-lg bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center"><ArrowsLeftRight size={16} /></span><span><span className="block text-sm font-semibold">Reassign {pile} tasks</span><span className="block text-xs font-normal text-gray-500">From Tom Baker · on leave until Mon 21 Sep</span></span></span>}
        footer={<><Button onClick={() => setReassign(false)}>Cancel</Button><Button variant="primary" icon={Check} onClick={doReassign}>Reassign {pile}</Button></>}>
        <div className="text-sm font-medium mb-2.5">Hand them to</div>
        <div className="rounded-[10px] border border-primary bg-[#EFF6FF] px-3 py-2.5 flex items-center gap-2.5" aria-selected="true" role="option">
          <Who name="Aisha Khan" size={24} />
          <div className="flex-1"><div className="text-sm leading-5 font-semibold">Aisha Khan</div><div className="text-xs text-gray-500">Hall manager · Van Mildert, Collingwood · 7 tasks today</div></div>
          <Check size={16} className="text-primary" />
        </div>
        <div className="mt-4 rounded-xl border border-line px-3.5 py-1 divide-y divide-[#F3F4F6]">
          <div className="flex items-center gap-2.5 py-2 text-sm"><CheckCircle size={16} className="text-[#0B8A4C]" /><span className="flex-1 font-medium">{toAishaN} tasks at Collingwood</span><span className="text-xs text-gray-500">Aisha covers Collingwood</span></div>
          <div className="flex items-center gap-2.5 py-2 text-sm"><XCircle size={16} className="text-[#B91C1C]" /><span className="flex-1 font-medium">{toMeN} tasks at Ustinov</span><span className="text-xs text-[#B91C1C] max-w-[180px]">Aisha doesn’t cover Ustinov · they come to you</span></div>
        </div>
        <div className="mt-4 rounded-lg border border-[#2563EB]/30 px-3 h-10 flex items-center gap-2 text-sm font-medium text-[#2563EB]">
          <Bell size={16} />Tom will see who has his tasks when he’s back
        </div>
      </Sheet>
    </div>
  );
}

/* Shows on row hover or keyboard focus, and stays while its menu is open. */
const RowAction = ({ label, children, ...p }: { label: string; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button type="button" aria-label={label} title={label.split(' “')[0]} {...p}
    className="size-7 rounded-md flex items-center justify-center text-gray-500 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 data-[state=open]:bg-[#F3F4F6] hover:bg-[#F3F4F6] hover:text-ink outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
    {children}
  </button>
);
