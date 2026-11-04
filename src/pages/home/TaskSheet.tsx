import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowSquareOut, ArrowUpRight, ArrowsLeftRight, CalendarBlank, Check, CheckCircle, Info, PlusCircle, Shield, ShieldWarning, User } from '../../components/icons';
import { toast } from 'sonner';
import { create } from 'zustand';
import { Button, Note, Pill, Sheet, Textarea, cx } from '../../components/ui';
import { HALLS, ME, PEOPLE, useHome, type HTask, type Scope } from '../../data/home';
import { Box, Picker, Who, fromIcon } from './parts';

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

function SheetTitle({ t, tone, title, sub }: { t: HTask; tone: 'purple' | 'blue' | 'green'; title: string; sub: string }) {
  const I = t.from ? fromIcon[t.from.icon] : ArrowsLeftRight;
  const cls = { purple: 'bg-[#F3EEFF] text-[#6E3BD8]', blue: 'bg-[#DBEAFE] text-[#2563EB]', green: 'bg-[#E8F7EE] text-[#0B8A4C]' }[tone];
  return (
    <span className="flex items-center gap-2.5">
      <span className={cx('size-8 rounded-lg flex items-center justify-center shrink-0', cls)}><I size={16} /></span>
      <span className="min-w-0"><span className="block text-sm font-semibold truncate">{title}</span><span className="block text-xs font-normal text-gray-500 truncate">{sub}</span></span>
    </span>
  );
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[132px_1fr] gap-y-3.5 text-sm leading-5">
      {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-gray-500">{k}</dt><dd className="text-ink flex items-center gap-2">{v}</dd></div>)}
    </dl>
  );
}

export function TaskSheet({ scope, task, onClose }: { scope: Scope; task: HTask | undefined; onClose: () => void }) {
  const nav = useNavigate();
  const patch = useHome((s) => s.patch);
  const change = useChange(scope);
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
      <Sheet open onClose={close} width={520} title={<SheetTitle t={task} tone="green" title={title} sub={sub} />}
        footer={<>
          <Button icon={ArrowSquareOut} onClick={() => { close(); nav(task.to ?? '/residents/requests'); }}>Open the request</Button>
          <Button variant="primary" onClick={close}>Close</Button>
        </>}>
        <div className="space-y-5 pt-1">
          <Note tone="blue" icon={CheckCircle} title="Already done in Requests">{task.elsewhere.by.split(' ')[0]} approved this swap in Requests {task.elsewhere.ago}, so the task closed itself. Nothing for you to do.</Note>
          <Facts rows={dt.facts ?? []} />
        </div>
      </Sheet>
    );
  }

  /* ---- E1 step 3: give Aisha the hall ---- */
  if (mode === 'halls') {
    const jb = halls.includes('Josephine Butler College');
    return (
      <Sheet open onClose={() => setMode('pick')} width={520}
        title={<span className="flex items-center gap-2.5"><span className="size-8 rounded-lg bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center"><Shield size={16} /></span><span><span className="block text-sm font-semibold">Aisha Khan · halls</span><span className="block text-xs font-normal text-gray-500">Hall manager</span></span></span>}
        footer={<>
          <Button onClick={() => setMode('pick')}>Cancel</Button>
          <Button variant="primary" icon={Check} onClick={saveHalls}>{jb ? 'Save and hand over the task' : 'Save'}</Button>
        </>}>
        <p className="text-sm text-gray-600 mb-3">Aisha can do everything a Hall manager can, in these halls</p>
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
      {!task.done && <Button icon={main ? User : ArrowsLeftRight} onClick={() => setMode(mode === 'pick' ? 'detail' : 'pick')}>Reassign</Button>}
      {dt.primary === 'approve' && !task.done
        ? <Button variant="primary" icon={Check} onClick={() => finish('Swap approved · both residents told')}>Approve</Button>
        : task.to
          ? <Button variant="primary" icon={ArrowUpRight} onClick={() => { onClose(); nav(task.to!); }}>{task.openLabel ?? 'Open'}</Button>
          : !task.done && <Button variant="primary" icon={Check} onClick={() => finish('Marked as done')}>Mark done</Button>}
    </>
  );

  return (
    <Sheet open onClose={onClose} width={520} title={<SheetTitle t={task} tone={main ? 'purple' : 'blue'} title={title} sub={sub} />} footer={footer}>
      <div className="space-y-5 pt-1">
        {!(mode === 'pick' && nobody) && (
          <>
            {pills.length > 0 && (
              <div className="flex gap-2">
                {task.done ? <Pill tone="green" icon={CheckCircle}>Done{task.doneBy && task.doneBy !== ME ? ` by ${task.doneBy}` : ''}</Pill>
                  : pills.map((p) => <Pill key={p.label} tone={p.tone} icon={p.icon === 'check' ? Check : CalendarBlank}>{p.label}</Pill>)}
              </div>
            )}
            <Facts rows={main && mode === 'detail' ? [...facts, ownerRow] : facts} />
          </>
        )}

        {mode === 'pick' ? (
          <div>
            <div className="text-sm font-medium mb-2.5">Hand it to</div>
            <Picker title={picker.title} can={picker.can} cant={picker.cant} onPick={handTo} />
            {nobody && (
              <div className="mt-4">
                <Note tone="amber" icon={ShieldWarning} title={`Only you can approve swaps at ${hall}`}>Give someone the hall in Roles and access, or keep the task. The picker never offers someone who couldn’t finish it.</Note>
              </div>
            )}
          </div>
        ) : main && (
          <>
            <div className="border-t border-[#F3F4F6]" />
            {dt.decide && task.to && (
              <button type="button" onClick={() => { onClose(); nav(task.to!); }} className="block w-full text-left rounded-xl hover:ring-2 hover:ring-primary/15">
                <Note tone="blue" icon={Info} title={dt.decide.title}>{dt.decide.sub}</Note>
              </button>
            )}
            <label className="block">
              <span className="block text-sm font-medium mb-2">Note for the team</span>
              <Textarea defaultValue={dt.teamNote ?? ''} placeholder="Add context for whoever picks this up" className="text-sm leading-5 min-h-[72px]"
                onBlur={(e) => { const v = e.target.value; if (v !== (dt.teamNote ?? '')) { patch(scope, (rows) => rows.map((r) => (r.id === task.id ? { ...r, detail: { ...dt, teamNote: v } } : r))); toast.success('Note saved'); } }} />
            </label>
            {dt.activity && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-2">Activity</div>
                <ul className="space-y-2">
                  {dt.activity.map((a) => (
                    <li key={a.text} className="flex items-center gap-2 text-xs text-gray-500">{a.icon === 'plus' ? <PlusCircle size={12} className="text-gray-400" /> : <User size={12} className="text-gray-400" />}{a.text}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
