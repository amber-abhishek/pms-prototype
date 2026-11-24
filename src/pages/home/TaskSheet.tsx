import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlarmClock, CheckCircle, Info, ShieldWarning, ListChecks } from '../../components/icons';
import { toast } from 'sonner';
import { create } from 'zustand';
import { Avatar, Button, Note, Pill, Sheet, SheetHero, SheetRow, SheetSection, Textarea, cx, type Fact, type SheetNav } from '../../components/ui';
import { EditActions, EditLink, LineTabs, PanelModal } from '../inventory/common';
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
    const next = useHome.getState().rows[scope];
    /* Undo puts back only the rows this change touched, so undoing one tick never reopens a task ticked after it. */
    const before = new Map(prev.map((r) => [r.id, r]));
    const nextIds = new Set(next.map((r) => r.id));
    const touched = next.filter((r) => before.get(r.id) !== r).map((r) => r.id);
    const removed = prev.filter((r) => !nextIds.has(r.id));
    if (!touched.length && !removed.length) return;
    toast.success(msg, { action: { label: 'Undo', onClick: () => {
      useReturned.setState({ ids: [...touched.filter((id) => before.has(id)), ...removed.map((r) => r.id)] });
      patch(scope, (cur) => [...removed, ...cur.flatMap((r) => (touched.includes(r.id) ? (before.has(r.id) ? [before.get(r.id)!] : []) : [r]))]);
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
  const [tab, setTab] = useState<'overview' | 'activity'>('overview');
  const [halls, setHalls] = useState<string[]>(['Van Mildert College', 'Collingwood College', 'Josephine Butler College']);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const busy = useRef(false);
  useEffect(() => { setMode('detail'); setTab('overview'); setEditingNote(false); busy.current = false; }, [task?.id]);
  if (!task) return null;

  const dt = task.detail ?? {};
  const main = scope === 'main';
  const title = dt.title ?? task.title;
  const sub = dt.sub ?? task.sub ?? (task.from ? (task.from.icon === 'task' ? task.from.label : `Task from ${task.from.label}`) : '');
  const short = dt.short ?? 'Task';
  const others = ['Arjun Mehta', 'Tom Baker', 'Aisha Khan'].filter((n) => n !== task.owner);
  const loads: Record<string, string> = { 'Arjun Mehta': '9 tasks today', 'Tom Baker': '3 tasks today', 'Aisha Khan': '7 tasks today', 'Grace Evans': '5 tasks today' };
  const picker = dt.picker
    ? { ...dt.picker, can: dt.picker.can.filter((p) => p.name !== task.owner) }
    : { title: 'Can take this task', can: others.map((name) => ({ name, load: loads[name] })), cant: [{ name: 'James Reed', reason: 'No permission' }] };
  const nobody = picker.can.length === 0;
  const hall = dt.hall ?? 'this property';

  const close = () => {
    // E2: the work was done elsewhere, so the task closes itself when Arjun closes the sheet.
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
    if (!jb) { toast.success('Aisha’s properties saved'); setMode('pick'); return; }
    busy.current = true;
    change((rows) => rows.map((r) => (r.id === task.id ? { ...r, owner: 'Aisha Khan' } : r)), `Aisha can approve requests at ${hall} · swap handed to Aisha`);
    onClose();
  };

  /* ---- E2: already done somewhere else ---- */
  if (task.elsewhere) {
    return (
      <Sheet open onClose={close} width={520} title="Task" nav={sheetNav}
        footer={<Button variant="primary" icon={null} onClick={() => { close(); nav(task.to ?? '/residents/requests'); }}>Open the request</Button>}>
        <SheetHero icon={ListChecks} name={title} meta={sub} />
        <div className="mb-3"><Note tone="green" icon={CheckCircle} title="Already done in Requests">{task.elsewhere.by.split(' ')[0]} approved this swap {task.elsewhere.ago}.</Note></div>
        <SheetSection title="Details" rows={factRows(dt.facts ?? [])} />
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
  /* Key facts (Figma Task · Overview): where, when it's due (toned like its pill), who owns it. */
  const heroFacts: Fact[] = [
    ['Where', dt.hall ?? task.sub ?? '—'],
    ['Due', task.done ? 'Done' : task.dueLabel, task.done ? 'green' : task.dueTone === 'red' || task.dueTone === 'amber' ? task.dueTone : undefined],
    ['Owner', task.owner],
  ];
  const activity = [...(dt.activity ?? [{ icon: 'plus' as const, text: `Task created${task.from ? ` from ${task.from.label}` : ''}` }])].reverse();

  /* Two choices on the right (hand it on, or the task's own action); snoozing is a quiet extra on the left. */
  const footer = (
    <>
      {main && !task.done && task.owner === ME && (task.snoozed
        ? <Button className="mr-auto" variant="ghost" icon={null} onClick={() => { wake(task); onClose(); }}>Unsnooze</Button>
        : <SnoozeMenu t={task} scope={scope} align="start" onDone={onClose}><Button className="mr-auto" variant="ghost" icon={null}>Snooze</Button></SnoozeMenu>)}
      {!task.done && <Button icon={null} onClick={() => setMode('pick')}>Reassign</Button>}
      {dt.primary === 'approve' && !task.done
        ? <Button variant="primary" icon={null} onClick={() => finish('Swap approved · both residents told')}>Approve</Button>
        : task.to
          ? <Button variant="primary" icon={null} onClick={() => { onClose(); nav(task.to!); }}>{task.openLabel ?? 'Open'}</Button>
          : !task.done && <Button variant="primary" icon={null} onClick={() => finish('Marked as done')}>Mark done</Button>}
    </>
  );
  const jb = halls.includes('Josephine Butler College');
  const saveNote = () => {
    const v = noteDraft.trim();
    if (v !== (dt.teamNote ?? '')) { patch(scope, (rows) => rows.map((r) => (r.id === task.id ? { ...r, detail: { ...dt, teamNote: v } } : r))); toast.success('Note saved'); }
    setEditingNote(false);
  };

  return (
    <Sheet open onClose={onClose} width={520} title="Task" nav={sheetNav} footer={footer}>
      <SheetHero icon={ListChecks} name={title} meta={sub} facts={heroFacts}>
        {task.done ? <Pill tone="green">Done{task.doneBy && task.doneBy !== ME ? ` by ${task.doneBy}` : ''}</Pill>
          : pills.length > 0 && pills.map((p) => <Pill key={p.label} tone={p.tone}>{p.label}</Pill>)}
      </SheetHero>
      <div className="-mx-5 mb-5">
        <LineTabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'activity', label: 'Activity' }]} />
      </div>
      {tab === 'overview' ? <>
        {task.snoozed && !task.done && <div className="mb-3"><Note tone="grey" icon={AlarmClock} title={`Snoozed until ${task.snoozed.label}`}>Hidden from Mine until then.</Note></div>}
        {main && dt.decide && task.to && (
          <button type="button" onClick={() => { onClose(); nav(task.to!); }} className="block w-full mb-3 text-left rounded-lg hover:ring-2 hover:ring-black/5">
            <Note tone="grey" icon={Info} title={dt.decide.title}>{dt.decide.sub}</Note>
          </button>
        )}
        <SheetSection title="Details" rows={factRows([...(main ? [...facts, ownerRow] : facts), ...(task.from ? [['Raised by', task.from.label] as [string, React.ReactNode]] : [])])} />
        {/* The one editable thing on a task: Edit turns this section into a box, Done saves it. */}
        {main && (
          <SheetSection title="Note for the team" action={editingNote ? <EditActions onCancel={() => setEditingNote(false)} onSave={saveNote} /> : <EditLink onClick={() => { setNoteDraft(dt.teamNote ?? ''); setEditingNote(true); }}>Edit</EditLink>}>
            {editingNote
              ? <Textarea aria-label="Note for the team" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Add context for whoever picks this up" className="text-sm leading-5 min-h-[72px]" />
              : <p className={cx('text-sm leading-5 whitespace-pre-wrap', dt.teamNote ? 'text-[#0A0A0A]' : 'text-[#737373]')}>{dt.teamNote || 'No note yet'}</p>}
          </SheetSection>
        )}
      </> : (
        /* Activity (Figma 4076:17302): newest first; "text · when" splits into the row and its time. */
        <SheetSection title="Activity">
          {activity.map((a) => {
            const cut = a.text.lastIndexOf(' · ');
            const [text, when] = cut > 0 ? [a.text.slice(0, cut), a.text.slice(cut + 3)] : [a.text, ''];
            return <SheetRow key={a.text} lead={<Avatar name={a.icon === 'plus' ? 'System' : task.owner} size={24} />} title={text} sub={when || undefined} />;
          })}
        </SheetSection>
      )}

      {/* Handing it on is an action over the record: a centred modal, the panel stays read-only (2026-11-19). */}
      <PanelModal open={mode === 'pick'} onClose={() => setMode('detail')} eyebrow="Hand over task" icon={ListChecks} title={title} meta={sub || undefined} width={520}
        right={nobody ? <>
          <Button onClick={() => setMode('detail')}>Keep it</Button>
          <Button variant="primary" icon={null} onClick={() => setMode('halls')}>Open Roles and access</Button>
        </> : <Button onClick={() => setMode('detail')}>Cancel</Button>}>
        <Picker title={picker.title} can={picker.can} cant={picker.cant} onPick={handTo} />
        {nobody && <div className="mt-3"><Note tone="amber" icon={ShieldWarning} title={`Only you can approve swaps at ${hall}`}>Give someone the property, or keep the task.</Note></div>}
      </PanelModal>

      {/* E1 step 3: give Aisha the hall. */}
      <PanelModal open={mode === 'halls'} onClose={() => setMode('pick')} eyebrow="Edit properties" person="Aisha Khan" title="Aisha Khan’s properties" meta="Property manager" width={520}
        right={<>
          <Button onClick={() => setMode('pick')}>Cancel</Button>
          <Button variant="primary" icon={null} onClick={saveHalls}>{jb ? 'Save and hand over' : 'Save'}</Button>
        </>}>
        <SheetSection title={`Properties · ${halls.length} of ${HALLS.length}`}>
          {HALLS.map((h) => {
            const on = halls.includes(h.name);
            const added = on && h.name === 'Josephine Butler College';
            return (
              <label key={h.name} className="py-2.5 flex items-center gap-3 border-t border-[#EBEBEB] first:border-t-0 first:pt-0 last:pb-0 cursor-pointer">
                <Box checked={on} label={h.name} onChange={(v) => setHalls((cur) => (v ? [...cur, h.name] : cur.filter((x) => x !== h.name)))} />
                <span className="min-w-0"><span className="block text-sm leading-5 text-[#0A0A0A]">{h.name}</span><span className="block text-[13px] leading-5 text-[#737373]">{h.rooms} rooms{added && ' · added'}</span></span>
              </label>
            );
          })}
        </SheetSection>
        {jb && <p className="mt-3 text-sm leading-5 text-[#737373]">Aisha gets an email and sees Josephine Butler in Residents, Requests and Maintenance.</p>}
      </PanelModal>
    </Sheet>
  );
}
