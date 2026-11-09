import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlarmClock, AlarmClockOff, ArrowSquareOut, ArrowUpRight, ArrowsLeftRight, CalendarBlank, Check, CheckCircle, Info, PlusCircle, Shield, ShieldWarning, User } from '../../components/icons';
import { toast } from 'sonner';
import { create } from 'zustand';
import { Button, Note, Pill, Sheet, SheetHero, SheetSection, Textarea, type SheetNav } from '../../components/ui';
import { HALLS, ME, PEOPLE, useHome, type HTask, type Scope } from '../../data/home';
import { Box, Picker, Who } from './parts';
import { SnoozeMenu, useSnooze } from './Snooze';

type Mode = 'detail' | 'pick' | 'halls';

/** Rows just brought back by Undo: they animate in once, then the flag clears so a tab switch doesn't replay it. */
export const useReturned = create<{ ids: string[] }>(() => ({ ids: [] }));
export const ROW_IN_MS = 240;

/** Undo-able change: snapshot the rows, apply, toast with Undo. */
export function useChange(scope: Scope) {
  const patch = useHome((s) => s.patch);
  return (fn: (rows: HTask[]) => HTask[], msg: React.ReactNode) => {
    const prev = useHome.getState().rows[scope];
    patch(scope, fn);
    toast.success(msg, { action: { label: 'Undo', onClick: () => {
      const cur = useHome.getState().rows[scope];
      const ids = prev.filter((p) => cur.find((c) => c.id === p.id) !== p).map((p) => p.id);
      useReturned.setState({ ids });
      patch(scope, () => prev);
      window.setTimeout(() => useReturned.setState({ ids: [] }), ROW_IN_MS + 50);
    } } });
  };
}

/** Detail rows for a SheetSection: values keep their inline icons/avatars on one line. */
const factRows = (rows: [string, React.ReactNode][]): [string, React.ReactNode][] => rows.map(([k, v]) => [k, <span key={k} className="flex items-center gap-2">{v}</span>]);

export function TaskSheet({ scope, task, onClose, nav: sheetNav }: { nav?: SheetNav; scope: Scope; task: HTask | undefined; onClose: () => void }) {
  const nav = useNavigate();
  const patch = useHome((s) => s.patch);
  const change = useChange(scope);
  const { wake } = useSnooze(scope);
  const [mode, setMode] = useState<Mode>('detail');
  const [halls, setHalls] = useState<string[]>(['Van Mildert College', 'Collingwood College', 'Josephine Butler College']);
  const busy = useRef(false);
  useEffect(() => { setMode('detail'); busy.current = false; }, [task?.id]);
  if (!task) return null;

  const dt = task.detail ?? {};
  const main = scope === 'main';
  const title = dt.title ?? task.title;
  const sub = dt.sub ?? task.sub ?? (task.from ? `Task from ${task.from.label}` : '');
  const short = dt.short ?? 'Task';
  const others = ['Priya Shah', 'Tom Baker', 'Aisha Khan'].filter((n) => n !== task.owner);
  const loads: Record<string, string> = { 'Priya Shah': '9 tasks today', 'Tom Baker': '3 tasks today', 'Aisha Khan': '7 tasks today', 'Grace Evans': '5 tasks today' };
  const picker = dt.picker
    ? { ...dt.picker, can: dt.picker.can.filter((p) => p.name !== task.owner) }
    : { title: 'Can take this task', can: others.map((name) => ({ name, load: loads[name] })), cant: [{ name: 'James Reed', reason: 'No permission' }] };
  const nobody = picker.can.length === 0;
  const hall = dt.hall ?? 'this hall';

  const close = () => {
    // E2: the work was done elsewhere, so the task closes itself when Priya closes the sheet.
    if (task.elsewhere && !task.done) {
      const by = task.elsewhere.by;
      change((rows) => rows.map((r) => (r.id === task.id ? { ...r, done: true, doneBy: by } : r)), `Closed · done by ${by} in Requests`);
    }
    onClose();
  };

  const handTo = (name: string) => {
    if (busy.current) return;
    busy.current = true;
    const p = PEOPLE[name]?.pronoun ?? 'they';
    change(
      (rows) => rows.map((r) => (r.id === task.id ? { ...r, owner: name, handedFrom: main && task.owner === ME ? ME : r.handedFrom } : r)),
      <span>{short} handed to <b>{name}</b> · {p === 'he' ? 'he’s' : p === 'she' ? 'she’s' : 'they’ve'} been notified</span>,
    );
    onClose();
  };

  const finish = (msg: string) => {
    if (busy.current) return;
    busy.current = true;
    change((rows) => rows.map((r) => (r.id === task.id ? { ...r, done: true, doneBy: ME } : r)), msg);
    onClose();
  };

  const saveHalls = () => {
    if (busy.current) return;
    const jb = halls.includes('Josephine Butler College');
    if (!jb) { toast.success('Aisha’s halls saved'); setMode('pick'); return; }
    busy.current = true;
    change((rows) => rows.map((r) => (r.id === task.id ? { ...r, owner: 'Aisha Khan' } : r)), `Aisha can approve requests at ${hall} · swap handed to Aisha`);
    onClose();
  };

  /* ---- E2: already done somewhere else ---- */
  if (task.elsewhere) {
    return (
      <Sheet open onClose={close} width={520} title="Task" nav={sheetNav}
        footer={<>
          <Button icon={ArrowSquareOut} onClick={() => { close(); nav(task.to ?? '/residents/requests'); }}>Open the request</Button>
          <Button variant="primary" onClick={close}>Close</Button>
        </>}>
        <SheetHero avatar={false} name={title} meta={sub} />
        <div className="pb-5"><Note tone="blue" icon={CheckCircle} title="Already done in Requests">{task.elsewhere.by.split(' ')[0]} approved this swap {task.elsewhere.ago}, so the task closed itself.</Note></div>
        <SheetSection title="Details" rows={factRows(dt.facts ?? [])} />
      </Sheet>
    );
  }

  /* ---- E1 step 3: give Aisha the hall ---- */
  if (mode === 'halls') {
    const jb = halls.includes('Josephine Butler College');
    return (
      <Sheet open onClose={() => setMode('pick')} width={520}
        title="Aisha Khan’s halls" sub="Hall manager"
        footer={<>
          <Button onClick={() => setMode('pick')}>Cancel</Button>
          <Button variant="primary" icon={Check} onClick={saveHalls}>{jb ? 'Save and hand over the task' : 'Save'}</Button>
        </>}>
        <div className="[&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">
        <SheetSection title="Halls">
        <div className="rounded-xl border border-line divide-y divide-line">
          {HALLS.map((h) => {
            const on = halls.includes(h.name);
            const added = on && h.name === 'Josephine Butler College';
            return (
              <label key={h.name} className="flex items-center gap-3 px-3 h-11 cursor-pointer hover:bg-gray-50">
                <Box checked={on} label={h.name} onChange={(v) => setHalls((cur) => (v ? [...cur, h.name] : cur.filter((x) => x !== h.name)))} />
                <span><span className="block text-sm text-ink">{h.name}</span><span className="block text-xs text-gray-500">{h.rooms} rooms{added && ' · added'}</span></span>
              </label>
            );
          })}
        </div>
        </SheetSection>
        </div>
        {jb && <div className="mt-4"><Note tone="blue" icon={Info} title="Aisha will see Josephine Butler in Residents, Requests and Maintenance">She gets an email saying so.</Note></div>}
      </Sheet>
    );
  }

  const pills = dt.pills ?? (task.dueTone !== 'plain' ? [{ label: task.dueLabel, tone: task.dueTone === 'grey' ? 'grey' as const : task.dueTone, icon: 'calendar' as const }] : []);
  const facts: [string, React.ReactNode][] = dt.facts ?? [
    ...(task.sub ? [['Where', task.sub] as [string, string]] : []),
    ['Due', task.dueLabel],
    ...(!main ? [['Owner', <><Who name={task.owner} size={18} grad />{task.owner}</>] as [string, React.ReactNode]] : []),
  ];
  const ownerRow: [string, React.ReactNode] = ['Owner', <><Who name={task.owner} size={18} grad />{task.owner}</>];

  const footer = mode === 'pick' && nobody ? (
    <>
      <Button onClick={() => setMode('detail')}>Keep it</Button>
      <Button variant="primary" icon={Shield} onClick={() => setMode('halls')}>Open Roles and access</Button>
    </>
  ) : (
    <>
      {main && !task.done && task.owner === ME && mode === 'detail' && (task.snoozed
        ? <Button className="mr-auto" icon={AlarmClockOff} onClick={() => { wake(task); onClose(); }}>Unsnooze</Button>
        : <SnoozeMenu t={task} scope={scope} align="start" onDone={onClose}><Button className="mr-auto" icon={AlarmClock}>Snooze</Button></SnoozeMenu>)}
      {!task.done && <Button icon={main ? User : ArrowsLeftRight} onClick={() => setMode(mode === 'pick' ? 'detail' : 'pick')}>Reassign</Button>}
      {dt.primary === 'approve' && !task.done
        ? <Button variant="primary" icon={Check} onClick={() => finish('Swap approved · both residents told')}>Approve</Button>
        : task.to
          ? <Button variant="primary" icon={ArrowUpRight} onClick={() => { onClose(); nav(task.to!); }}>{task.openLabel ?? 'Open'}</Button>
          : !task.done && <Button variant="primary" icon={Check} onClick={() => finish('Marked as done')}>Mark done</Button>}
    </>
  );

  return (
    <Sheet open onClose={onClose} width={520} title="Task" nav={sheetNav} footer={footer}>
      <div className="[&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">
      {!(mode === 'pick' && nobody) && (
        <>
          <SheetHero avatar={false} name={title} meta={sub}>
            {task.done ? <Pill tone="green" icon={CheckCircle}>Done{task.doneBy && task.doneBy !== ME ? ` by ${task.doneBy}` : ''}</Pill>
              : pills.length > 0 && pills.map((p) => <Pill key={p.label} tone={p.tone} icon={p.icon === 'check' ? Check : CalendarBlank}>{p.label}</Pill>)}
          </SheetHero>
          {task.snoozed && !task.done && <div className="pb-5"><Note tone="blue" icon={AlarmClock} title={`Snoozed until ${task.snoozed.label}`}>Hidden from Mine until then.</Note></div>}
          {main && mode === 'detail' && dt.decide && task.to && (
            <button type="button" onClick={() => { onClose(); nav(task.to!); }} className="block w-full mb-5 text-left rounded-xl hover:ring-2 hover:ring-primary/15">
              <Note tone="blue" icon={Info} title={dt.decide.title}>{dt.decide.sub}</Note>
            </button>
          )}
          <SheetSection title="Details" rows={factRows(main && mode === 'detail' ? [...facts, ownerRow] : facts)} />
        </>
      )}

      {mode === 'pick' ? (
        <SheetSection title="Hand it to">
          <Picker title={picker.title} can={picker.can} cant={picker.cant} onPick={handTo} />
          {nobody && (
            <div className="mt-4">
              <Note tone="amber" icon={ShieldWarning} title={`Only you can approve swaps at ${hall}`}>Give someone the hall in Roles and access, or keep the task.</Note>
            </div>
          )}
        </SheetSection>
      ) : main && (
        <>
          <SheetSection title="Note for the team">
            <Textarea aria-label="Note for the team" defaultValue={dt.teamNote ?? ''} placeholder="Add context for whoever picks this up" className="text-sm leading-5 min-h-[72px]"
              onBlur={(e) => { const v = e.target.value; if (v !== (dt.teamNote ?? '')) { patch(scope, (rows) => rows.map((r) => (r.id === task.id ? { ...r, detail: { ...dt, teamNote: v } } : r))); toast.success('Note saved'); } }} />
          </SheetSection>
          {dt.activity && (
            <SheetSection title="Activity">
              <ul className="space-y-2">
                {dt.activity.map((a) => (
                  <li key={a.text} className="flex items-center gap-2 text-xs text-gray-500">{a.icon === 'plus' ? <PlusCircle size={12} className="text-gray-400" /> : <User size={12} className="text-gray-400" />}{a.text}</li>
                ))}
              </ul>
            </SheetSection>
          )}
        </>
      )}
      </div>
    </Sheet>
  );
}
