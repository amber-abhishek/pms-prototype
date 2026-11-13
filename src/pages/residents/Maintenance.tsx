import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowUp, Bell, Check, CheckCircle, Drop, Envelope, FileText, Fan, HardHat, Key, Lamp, LightbulbFilament, LightningSlash, Lock,
  Minus, PaperPlaneTilt, PawPrint, Plus, ArrowCounterClockwise, Shower, Siren, Snowflake, SpinnerGap, Thermometer, Timer, Toilet, User, UserMinus, UserPlus, WarningCircle, WashingMachine, WifiSlash, Wind, Wrench, Door, Package, Fire, type Icon,
} from '../../components/icons';
import { toast } from 'sonner';
import { useDb } from '../../data/store';
import { fmtSla, useRms, type Fault, type FaultIcon, type Priority } from '../../data/residents';
import { Avatar, Button, Card, Empty, Field, FilterButton, Input, Note, Pill, SearchInput, Select, Sheet, SheetHero, SheetSection, Table, Tabs, Textarea, Toolbar, cx, listNav, type SheetNav } from '../../components/ui';
import { Checkbox } from '../../components/shadcn/checkbox';
import { Tabs as UITabs, TabsList, TabsTrigger } from '../../components/shadcn/tabs';
import { Kanban, List } from '../../components/icons';
import { MaintenanceBoard } from './MaintenanceBoard';
import { KV, Modal, Panel, Person, Photo, RHeader, RadioCard, SideSheet, Timeline, ToggleRow, undoToast, useOnce } from './kit';
import { useTab } from '../hooks';

const faultIcon: Record<FaultIcon, Icon> = {
  leak: Drop, power: LightningSlash, lock: Lock, shower: Shower, lamp: Lamp, wifi: WifiSlash, cold: Thermometer, window: Wind, fan: Fan, toilet: Toilet,
  light: LightbulbFilament, laundry: WashingMachine, mould: Drop, wardrobe: Door, fridge: Snowflake, blind: Wind, alarm: Bell, hot: Fire,
};
export const PriorityPill = ({ p }: { p: Priority }) => (p === 'Urgent' ? <Pill tone="red" icon={Siren}>Urgent</Pill> : p === 'High' ? <Pill tone="orange" icon={ArrowUp}>High</Pill> : <Pill tone="grey" icon={Minus}>Normal</Pill>);
function Assignee({ name }: { name?: string }) {
  if (!name) return <span className="text-xs text-[#737373]">Not assigned</span>;
  return <span className="flex items-center gap-2"><Avatar name={name} size={20} />{name}</span>;
}
function Sla({ f }: { f: Fault }) {
  if (f.status === 'Fixed') return <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><CheckCircle size={13} className="text-[#0B8A4C]" />Fixed in {f.fixedIn}</span>;
  if (f.status === 'Waiting on parts') return <span className="text-xs font-medium text-gray-500 flex items-center gap-1.5"><Timer size={13} />Waiting on parts</span>;
  const late = f.slaMins < 0;
  const hot = late || f.priority === 'Urgent';
  return <span className={cx('text-xs font-medium flex items-center gap-1.5', hot ? (late || f.slaMins < 360 ? 'text-[#B91C1C]' : 'text-[#C2410C]') : 'text-gray-500')}><Timer size={13} />{late ? `Breached ${fmtSla(f.slaMins)} ago` : `Due in ${fmtSla(f.slaMins)}`}</span>;
}

/* ---------------- List: 3022, 3121 (empty), 3214 ---------------- */
type Tab = 'Open' | 'In progress' | 'Waiting on parts' | 'Fixed';
const STATUSES: Tab[] = ['Open', 'In progress', 'Waiting on parts', 'Fixed'];
const pastSla = (x: Fault) => x.slaMins < 0 && x.status !== 'Waiting on parts' && x.status !== 'Fixed';

export function MaintenanceList() {
  const [sp, setSp] = useSearchParams();
  const open = sp.get('open');
  /* ?job=<id> opens the job in a side sheet over the board or table. */
  const job = sp.get('job');
  const setJob = (id: string | null) => setSp((p) => { const n = new URLSearchParams(p); if (id) n.set('job', id); else n.delete('job'); return n; }, { replace: true });
  /* The SLA-sorted table is the default view; ?view=board shows the board (Figma 2059:281). */
  const view = sp.get('view') === 'board' ? 'board' : 'table';
  const setView = (v: string) => setSp((p) => { const n = new URLSearchParams(p); if (v === 'board') n.set('view', 'board'); else n.delete('view'); return n; }, { replace: true });
  const [q, setQ] = useState('');
  const [showResolved, setShowResolved] = useState(true);
  const faults = useRms((s) => s.faults);
  const [tab, setTab] = useTab<Tab>('Open');
  const [f, setF] = useState<Record<string, string>>({});
  const [slaFirst, setSlaFirst] = useState(true);
  const [logging, setLogging] = useState(() => sp.get('log') === '1');
  const [contractors, setContractors] = useState(false);
  const hallOf = (x: Fault) => x.where.split(' · ')[0];
  const needle = q.trim().toLowerCase();
  const scoped = faults.filter((x) => (!f.hall || hallOf(x) === f.hall) && (!f.priority || x.priority === f.priority)
    && (!f.assignee || (f.assignee === 'Not assigned' ? !x.assignee : x.assignee === f.assignee))
    && (!f.sla || (f.sla === 'Overdue' ? pastSla(x) : !pastSla(x)))
    && (!needle || [x.ref, x.title, x.where, x.reporter ?? ''].some((v) => v.toLowerCase().includes(needle))));
  const live = scoped.filter((x) => x.status !== 'Fixed');
  const rows = useMemo(() => {
    const r = scoped.filter((x) => (tab === 'Open' ? x.status !== 'Fixed' : x.status === tab));
    const key = (x: Fault) => (x.status === 'Waiting on parts' ? 1e9 : x.slaMins);
    return slaFirst ? [...r].sort((a, b) => key(a) - key(b)) : [...r].sort((a, b) => b.ref.localeCompare(a.ref));
  }, [scoped, tab, slaFirst]);
  /* Links from Home and elsewhere (?open=<id>) open the job in the side sheet over the board. */
  if (open) return <Navigate to={`/residents/maintenance?job=${open}`} replace />;
  const statusCount = (t: Tab) => (t === 'Open' ? live.length : scoped.filter((x) => x.status === t).length);
  return (
    <>
      <RHeader icon={Wrench} crumbs={[['Residents']]} title="Maintenance">
        {/* V3 (Figma 3918:47856): the Table/Board switch is a page-level choice, so it sits in the header, with its labels. */}
        <UITabs value={view} onValueChange={setView}>
          <TabsList aria-label="View" className="h-8 p-0.5 bg-[#EBEBEB]">
            {([['table', 'Table', List], ['board', 'Board', Kanban]] as const).map(([id, label, I]) => (
              <TabsTrigger key={id} value={id} className="h-7 gap-1.5"><I size={14} />{label}</TabsTrigger>
            ))}
          </TabsList>
        </UITabs>
        <Button icon={HardHat} onClick={() => setContractors(true)}>Contractors</Button>
        <Button variant="primary" icon={Plus} onClick={() => setLogging(true)}>Log a fault</Button>
      </RHeader>
      {/* One toolbar row (V3): status tabs on the left; a short search and the four filters on the right. */}
      <Toolbar right={<>
        <div className="w-[200px] min-w-[140px] shrink [&>label]:!w-full"><SearchInput value={q} onChange={setQ} placeholder="Search" /></div>
        <FilterButton value={f} onChange={setF} defs={[
          { id: 'priority', label: 'Priority', options: ['Urgent', 'High', 'Normal'], chips: true },
          { id: 'sla', label: 'Deadline', options: ['Overdue', 'On time'], chips: true },
          { id: 'hall', label: 'Hall', options: ['Ustinov', 'Collingwood', 'Van Mildert', 'St Mary’s', 'Josephine Butler'] },
          { id: 'assignee', label: 'Assignee', options: ['Not assigned', ...[...new Set(faults.map((x) => x.assignee).filter((a): a is string => !!a))].sort()] },
        ]} />
      </>}>
        {view === 'table' ? <Tabs value={tab} onChange={setTab} tabs={STATUSES.map((t) => ({ id: t, label: t, count: statusCount(t) }))} /> : (
          <label className="flex items-center gap-2 text-sm text-[#737373] cursor-pointer select-none whitespace-nowrap">
            <Checkbox checked={showResolved} onCheckedChange={(v) => setShowResolved(v === true)} />Show resolved (7 days)
          </label>
        )}
      </Toolbar>
      {view === 'board' ? <MaintenanceBoard faults={scoped} showResolved={showResolved} onLog={() => setLogging(true)} selected={job} onOpen={setJob} /> : (
      <Table rows={rows} onRow={(x) => setJob(x.id)} selected={job ?? undefined} sort={slaFirst ? { key: 's', dir: 'asc', onToggle: () => setSlaFirst(false) } : { key: 'r', dir: 'desc', onToggle: () => setSlaFirst(true) }} footer={false}
        empty={<Empty art="faults" icon={Wrench} title={tab === 'Open' ? 'No open faults' : `Nothing ${tab.toLowerCase()}`} sub="Everything reported has been fixed." action={<Button icon={Plus} onClick={() => setLogging(true)}>Log a fault</Button>} />}
        cols={[
          { key: 'r', label: 'Ref', className: 'w-[90px]', render: (x) => <span className="font-mono text-xs text-gray-500">{x.ref}</span> },
          { key: 't', label: 'Fault', render: (x) => { const I = faultIcon[x.icon]; return <span className="flex items-center gap-2 font-medium"><I size={14} className="text-gray-500" />{x.title}</span>; } },
          { key: 'w', label: 'Where', render: (x) => <span className="text-gray-500">{x.where}</span> },
          { key: 'p', label: 'Priority', render: (x) => <PriorityPill p={x.priority} /> },
          { key: 's', label: 'Deadline', render: (x) => <Sla f={x} /> },
          { key: 'a', label: 'Assigned', render: (x) => <Assignee name={x.assignee} /> },
        ]} />
      )}
      <LogFault open={logging} onClose={() => setLogging(false)} />
      <ContractorsSheet open={contractors} onClose={() => setContractors(false)} />
      <FaultPeek id={job} nav={listNav(rows, (x) => x.id === job, (x) => setJob(x.id))} onClose={() => setJob(null)} />
    </>
  );
}

function LogFault({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { patch } = useRms();
  const residents = useRms((s) => s.residents);
  const nav = useNavigate();
  const once = useOnce();
  const [title, setTitle] = useState('');
  const [who, setWho] = useState('');
  const [where, setWhere] = useState('');
  const [priority, setPriority] = useState<Priority>('Normal');
  const [desc, setDesc] = useState('');
  const submit = () => once(() => {
    const r = residents.find((x) => x.name === who);
    const place = r ? `${r.hall.replace(' College', '')} · ${r.room}` : where.trim();
    if (!title.trim() || !place) { toast.error('Add the fault and where it is'); return; }
    const n = 211 + useRms.getState().faults.filter((x) => x.id.startsWith('mn')).length;
    const id = `mn${n}`;
    patch('faults', (fs) => [{ id, ref: `MT-${n}`, title: title.trim(), icon: 'leak', where: place, priority, category: 'General', slaMins: priority === 'Urgent' ? 1440 : priority === 'High' ? 2880 : 7200, status: 'New', reporter: r?.name ?? 'Priya Shah', reporterRoom: r?.room ?? 'Staff', reported: 'Just now', report: desc.trim() || 'Logged by Priya Shah at the desk.', stage: 1 }, ...fs]);
    toast.success(`MT-${n} logged`, { description: `${priority} · deadline clock starts now` });
    setTitle(''); setWho(''); setWhere(''); setDesc('');
    onClose();
    nav(`/residents/maintenance/${id}`);
  });
  return (
    <Modal open={open} onClose={onClose} title="Log a fault" sub="For a resident who called or came to the desk."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={Plus} onClick={submit}>Log fault</Button></>}>
      <Field label="Fault"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Shower drains slowly" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="On behalf of"><Select value={who} onChange={(e) => setWho(e.target.value)}><option value="">Nobody (a shared area)</option>{residents.map((r) => <option key={r.id}>{r.name}</option>)}</Select></Field>
        <Field label="Priority"><Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{['Urgent', 'High', 'Normal'].map((p) => <option key={p}>{p}</option>)}</Select></Field>
      </div>
      {!who && <Field label="Where"><Input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="e.g. Collingwood · D kitchen" /></Field>}
      <Field label="What’s wrong"><Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
    </Modal>
  );
}

function ContractorsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <SideSheet open={open} onClose={onClose} icon={HardHat} title="Contractors" footer={<Button onClick={onClose}>Close</Button>}>
      <SheetSection title="In-house and contract">
      {[['Dave Hughes', 'In-house plumber · 2 jobs today', 'In-house'], ['Kim Lowe', 'In-house electrician · off today', 'In-house'], ['Northern Heating Ltd', 'Heating and plumbing · £85 call-out · £120 out of hours', 'Contract'], ['Estates helpdesk', 'Operator estates team · 3–5 days', 'Operator'], ['Campus IT', 'Wi-Fi and network', 'Operator']].map(([n, s, t]) => (
        <div key={n} className="flex items-center gap-3 py-1"><Avatar name={n} size={28} /><div className="flex-1"><div className="text-sm font-medium">{n}</div><div className="text-xs text-gray-500">{s}</div></div><Pill tone="grey" outline>{t}</Pill></div>
      ))}
      </SheetSection>
    </SideSheet>
  );
}

/* ---------------- Detail: 3023–3026, 3215, 3216 ---------------- */
const radiatorSteps = (f: Fault) => {
  const s = f.stage ?? 1;
  return [
    { title: 'Reported by Leo Grant', sub: 'Resident portal · 3 photos', when: 'Mon 08:12' },
    { title: `Assigned to ${f.assignee ?? 'Dave Hughes'} by Priya Shah`, sub: 'Visit today 14:00–16:00 · Leo told by email', when: 'Mon 09:05' },
    { title: 'Dave on site', sub: 'Leak stopped · valve needs replacing', when: 'Mon 14:10' },
    { title: 'Part ordered: TRV valve 15mm', sub: 'From stores · arrives Tuesday morning', when: 'Mon 14:40' },
    s > 4 ? { title: 'Valve replaced · tested for an hour', sub: '£42 parts · 1h labour', when: 'Tue 10:30' } : { title: 'Fit the new valve', sub: 'Booked Tue 09:00', when: 'Tue' },
    s > 5 ? { title: 'Leo confirmed it’s fixed', sub: '“All dry now, thanks!” · in the portal', when: 'Tue 11:20' } : { title: 'Leo confirms it’s fixed', sub: 'Asked automatically when Dave marks it done' },
  ].map((x, i) => ({ ...x, done: i < s }));
};
const genericSteps = (f: Fault) => {
  const s = f.stage ?? (f.status === 'Fixed' ? 5 : f.status === 'In progress' ? 3 : f.assignee ? 2 : 1);
  const who = f.reporter ?? 'a resident';
  return [
    { title: `Reported by ${who}`, sub: 'Resident portal', when: f.reported ?? 'Earlier' },
    { title: f.assignee ? `Assigned to ${f.assignee}` : 'Assign someone', sub: f.approvedNote ? 'Out-of-hours call-out approved by Aisha Khan' : f.assignee ? 'Visit booked · resident told by email' : 'Nobody on it yet', when: f.assignee ? 'Today' : undefined },
    { title: f.status === 'Waiting on parts' ? 'Waiting on parts' : 'On site', sub: f.status === 'Waiting on parts' ? 'Ordered · arrives this week' : 'Logged by the engineer' },
    { title: 'Fixed', sub: 'Marked done by the engineer' },
    { title: 'Resident confirms it’s fixed', sub: 'Asked automatically when it is marked done' },
  ].map((x, i) => ({ ...x, done: i < s }));
};

export function FaultDetail() {
  const { id } = useParams();
  const f = useRms((s) => s.faults.find((x) => x.id === id));
  if (!f) return <Navigate to="/residents/maintenance" replace />;
  return <FaultPage key={f.id} f={f} />;
}

/** The state, actions and dialogs the job page and the board's side panel share. */
function useFaultView(f: Fault) {
  const { update } = useRms();
  const { patch: patchDb, log } = useDb();
  const [assigning, setAssigning] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const once = useOnce();
  const isRad = f.id === 'm1';
  const first = (f.reporter ?? 'resident').split(' ')[0];
  const late = f.slaMins < 0 && f.status === 'New';
  const steps = isRad ? radiatorSteps(f) : genericSteps(f);

  const markFixed = () => once(() => {
    const undo = update('faults', f.id, { status: 'Fixed', stage: 6, fixedIn: isRad ? '19h 08m' : '1d 2h' });
    log(`marked ${f.ref} fixed · ${f.title}`, 'Residents');
    undoToast(isRad ? `${f.ref} fixed on time · Leo confirmed · £42 charged to Ustinov repairs` : `${f.ref} fixed · ${f.reporter ? `${first} asked to confirm` : 'logged against the hall'}`, undo);
  });
  const logUpdate = () => {
    const s = f.stage ?? 2;
    if (s >= 5) return;
    update('faults', f.id, { stage: s + 1 });
    toast.success(steps[s].title, { description: steps[s].sub });
  };
  const primary = !f.assignee
    ? <Button variant="primary" icon={UserPlus} onClick={() => setAssigning(true)}>Assign</Button>
    : f.status === 'Fixed'
      ? <Button icon={ArrowCounterClockwise} onClick={() => { update('faults', f.id, { status: 'In progress', stage: isRad ? 4 : 2 }); toast(`${f.ref} reopened`, { description: 'The deadline clock carries on from where it stopped.' }); }}>Reopen</Button>
      : <Button variant="primary" icon={Check} onClick={markFixed}>Mark fixed</Button>;
  /* Only a resident gets a message; staff reports (the porter at reception) don't. */
  const message = f.reporter && f.reporterRoom !== 'Staff' && !f.reporterRoom?.includes('reception') ?<Button icon={Envelope} onClick={() => setMessaging(true)}>Message {first}</Button> : null;

  const statusPill = f.status === 'Fixed' ? <Pill tone="green" icon={CheckCircle}>Fixed</Pill>
    : late && !f.assignee ? <Pill tone="red" icon={Timer}>Overdue</Pill>
      : !f.assignee ? <Pill tone="amber" icon={User}>Not assigned</Pill>
        : f.status === 'Waiting on parts' ? <Pill tone="amber" icon={Package}>Waiting on parts</Pill>
          : <Pill tone="blue" icon={SpinnerGap}>In progress</Pill>;
  const pills = <><PriorityPill p={f.priority} />{statusPill}<Pill tone="orange" outline>{f.category}</Pill></>;
  const sub = f.status === 'Fixed' && isRad
    ? 'Ustinov College · Block C · C.2.14 · reported by Leo Grant in the resident portal on Mon 21 Sep, 08:12 · fixed in 19h, within the 24h deadline'
    : f.sub ?? `${f.where} · reported by ${f.reporter ?? 'a resident'} in the resident portal · ${f.status === 'Fixed' ? `fixed in ${f.fixedIn}` : f.status === 'Waiting on parts' ? 'waiting on parts' : `due in ${fmtSla(f.slaMins)}`}`;

  const overlays = (
    <>
      <AssignSheet f={f} open={assigning} onClose={() => setAssigning(false)} onDone={(name, closeTask) => {
        if (closeTask) patchDb('tasks', (ts) => ts.map((t) => (t.id === 't1' ? { ...t, done: true } : t)));
        log(`assigned ${f.ref} to ${name}`, 'Residents');
      }} />
      <Modal open={messaging} onClose={() => setMessaging(false)} title={`Message ${f.reporter}`} sub="By email and in the resident portal."
        footer={<><Button onClick={() => setMessaging(false)}>Cancel</Button><Button variant="primary" icon={PaperPlaneTilt} onClick={() => { setMessaging(false); toast.success(`Message sent to ${first}`); }}>Send</Button></>}>
        <Textarea rows={4} defaultValue={`Hi ${first}, thanks for reporting this. ${f.assignee ? `${f.assignee.split(' ')[0]} is on it and` : 'We’re finding someone now and'} we’ll let you know the visit time.`} />
      </Modal>
    </>
  );
  return { isRad, late, steps, logUpdate, primary, message, pills, sub, overlays };
}
type FaultView = ReturnType<typeof useFaultView>;

/** The report, progress and details. The page lays them out in two columns; the side panel stacks them. */
function FaultSections({ f, v, stacked }: { f: Fault; v: FaultView; stacked?: boolean }) {
  const { isRad, late, steps, logUpdate } = v;
  const main = (
    <div className="space-y-4">
      {f.approvedNote && <Note tone="green" icon={CheckCircle} title={f.approvedNote}>Out-of-hours call-out · charged to Ustinov repairs.</Note>}
      <Card className="p-4">
        <div className="flex items-center gap-2.5">
          <Person name={f.reporter ?? 'Resident'} />
          <div className="flex-1"><div className="text-sm leading-5 font-semibold">{f.reporter ?? 'A resident'}</div><div className="text-xs text-gray-500">{f.reporterRoom ? (f.reporterRoom.includes('reception') ? f.reporterRoom : `Resident · ${f.reporterRoom}`) : `Resident · ${f.where.split(' · ')[1] ?? ''}`}</div></div>
          <span className="text-xs text-gray-500">{f.reported ?? 'Earlier'}</span>
        </div>
        <p className="text-sm leading-5 text-[#404040] mt-3">{f.report ?? `${f.title}. Please could someone take a look?`}</p>
        {isRad && <div className="flex gap-2 mt-3"><Photo /><Photo /><Photo /></div>}
        {isRad && <div className="flex gap-4 mt-3 text-xs text-gray-500"><span className="flex items-center gap-1.5"><Key size={13} className="text-gray-400" />OK to enter when I’m out</span><span className="flex items-center gap-1.5"><PawPrint size={13} className="text-gray-400" />No pets</span></div>}
      </Card>
      {f.assignee && (
        <Panel title="Progress" right={f.status === 'Fixed' ? (isRad ? 'fixed in 19h 08m' : `fixed in ${f.fixedIn}`) : f.status === 'Waiting on parts' ? 'Deadline paused' : `${isRad ? '15h' : fmtSla(Math.max(f.slaMins, 0))} left`}>
          <Timeline steps={steps} />
          {f.status !== 'Fixed' && isRad && (f.stage ?? 2) < 5 && <Button size="sm" className="mt-4" icon={Plus} onClick={logUpdate}>Log an update</Button>}
        </Panel>
      )}
    </div>
  );
  const side = (
    <div className="space-y-4">
      {isRad && !f.assignee && <Note tone="amber" icon={WarningCircle} title="Water near a socket">Marked urgent: 24-hour deadline.</Note>}
      {late && !f.assignee && <Note tone="red" icon={Timer} title={`Overdue by ${fmtSla(f.slaMins)}`}>Whole-block urgent faults have a 4-hour deadline.</Note>}
      <Panel title="Details">
        <KV rows={[
          ['Category', isRad ? 'Heating · radiator' : f.category],
          ['Room', isRad ? 'C.2.14 · Standard single' : f.rooms ? `Block C · ${f.rooms} rooms` : f.where.split(' · ')[1] ?? f.where],
          ...(isRad ? [['Asset', <span><span className="font-mono text-xs">RAD-C214-01</span> · fitted 2019</span>], ['Last job here', 'MT-088 · bled radiator · Jan 2026']] as [string, ReactNode][] : []),
          ['Assigned', f.assignee ? (f.assignee === 'Dave Hughes' ? 'Dave Hughes · in-house plumber' : f.assignee) : <span className="text-[#737373]">Nobody yet</span>],
        ]} />
      </Panel>
    </div>
  );
  if (!stacked) return <>{main}{side}</>;
  /* Side panel (Mercury hierarchy): notes, then Details, Report and Progress as titled sections. */
  const deadline = f.status === 'Fixed' ? (isRad ? 'Fixed in 19h 08m' : `Fixed in ${f.fixedIn}`) : f.status === 'Waiting on parts' ? 'Paused · waiting on parts' : `${isRad ? '15h' : fmtSla(Math.max(f.slaMins, 0))} left`;
  const notes = [
    f.approvedNote && <Note key="ok" tone="green" icon={CheckCircle} title={f.approvedNote}>Out-of-hours call-out · charged to Ustinov repairs.</Note>,
    isRad && !f.assignee && <Note key="rad" tone="amber" icon={WarningCircle} title="Water near a socket">Marked urgent: 24-hour deadline.</Note>,
    late && !f.assignee && <Note key="late" tone="red" icon={Timer} title={`Overdue by ${fmtSla(f.slaMins)}`}>Whole-block urgent faults have a 4-hour deadline.</Note>,
  ].filter(Boolean);
  return (
    <>
      {notes.length > 0 && <div className="space-y-2 mb-5">{notes}</div>}
      <SheetSection title="Details" rows={[
        ['Category', isRad ? 'Heating · radiator' : f.category],
        ['Room', isRad ? 'C.2.14 · Standard single' : f.rooms ? `Block C · ${f.rooms} rooms` : f.where.split(' · ')[1] ?? f.where],
        ...(isRad ? [['Asset', <span><span className="font-mono text-xs">RAD-C214-01</span> · fitted 2019</span>], ['Last job here', 'MT-088 · bled radiator · Jan 2026']] as [string, ReactNode][] : []),
        ['Assigned', f.assignee ? (f.assignee === 'Dave Hughes' ? 'Dave Hughes · in-house plumber' : f.assignee) : <span className="text-[#737373]">Nobody yet</span>],
        ['Deadline', deadline],
      ]} />
      <SheetSection title="Report">
        <div className="flex items-center gap-2.5">
          <Person name={f.reporter ?? 'Resident'} />
          <div className="flex-1 min-w-0"><div className="text-sm leading-5 font-medium">{f.reporter ?? 'A resident'}</div><div className="text-xs text-gray-500">{f.reporterRoom ? (f.reporterRoom.includes('reception') ? f.reporterRoom : `Resident · ${f.reporterRoom}`) : `Resident · ${f.where.split(' · ')[1] ?? ''}`}</div></div>
          <span className="text-xs text-gray-500">{f.reported ?? 'Earlier'}</span>
        </div>
        <p className="text-sm leading-5 text-[#404040] mt-3">{f.report ?? `${f.title}. Please could someone take a look?`}</p>
        {isRad && <div className="flex gap-2 mt-3"><Photo /><Photo /><Photo /></div>}
        {isRad && <div className="flex gap-4 mt-3 text-xs text-gray-500"><span className="flex items-center gap-1.5"><Key size={13} className="text-gray-400" />OK to enter when I’m out</span><span className="flex items-center gap-1.5"><PawPrint size={13} className="text-gray-400" />No pets</span></div>}
      </SheetSection>
      {f.assignee && (
        <SheetSection title="Progress">
          <Timeline steps={steps} />
          {f.status !== 'Fixed' && isRad && (f.stage ?? 2) < 5 && <Button size="sm" className="mt-4" icon={Plus} onClick={logUpdate}>Log an update</Button>}
        </SheetSection>
      )}
    </>
  );
}

function FaultPage({ f }: { f: Fault }) {
  const v = useFaultView(f);
  return (
    <>
      <RHeader icon={Wrench} crumbs={[['Residents', '/residents'], ['Maintenance', '/residents/maintenance']]} title={f.ref}>
        {v.message}{v.primary}
      </RHeader>
      <div className="flex-1 overflow-auto">
        <div className="px-6 pt-6 pb-5 border-b border-[#F5F5F5]">
          <div className="flex items-center gap-2 flex-wrap"><h2 className="text-[20px] font-medium tracking-tight mr-1">{f.title}</h2>{v.pills}</div>
          <p className="text-sm text-gray-500 mt-1">{v.sub}</p>
        </div>
        <div className="p-6 grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-5 items-start max-w-[1200px]">
          <FaultSections f={f} v={v} />
        </div>
      </div>
      {v.overlays}
    </>
  );
}

/** A job opened from the board or the table: the job page's content in a side sheet, so the board stays put. */
export function FaultPeek({ id, onClose , nav }: { nav?: SheetNav;  id: string | null; onClose: () => void }) {
  const f = useRms((s) => s.faults.find((x) => x.id === id));
  /* Keep the last job on screen while the sheet animates out. */
  const last = useRef<Fault | undefined>(undefined);
  if (f) last.current = f;
  const shown = f ?? last.current;
  return shown ? <PeekSheet key={shown.id} f={shown} open={!!f} nav={nav} onClose={onClose} /> : null;
}
function PeekSheet({ f, open, onClose , nav }: { nav?: SheetNav;  f: Fault; open: boolean; onClose: () => void }) {
  const v = useFaultView(f);
  return (
    <>
      <Sheet open={open} onClose={onClose} nav={nav} width={560} title="Fault"
        footer={<>{v.message}{v.primary}</>}>
        <SheetHero avatar={false} name={f.title} meta={<><span className="font-mono">{f.ref}</span> · {f.where}</>}>{v.pills}</SheetHero>
        <FaultSections f={f} v={v} stacked />
      </Sheet>
      {v.overlays}
    </>
  );
}

function AssignSheet({ f, open, onClose, onDone }: { f: Fault; open: boolean; onClose: () => void; onDone: (name: string, closeTask: boolean) => void }) {
  const { update } = useRms();
  const once = useOnce();
  const breached = f.slaMins < 0;
  const opts = breached
    ? [{ id: 'Northern Heating Ltd', title: 'Northern Heating Ltd · in 2h', sub: 'Contractor · £120 out-of-hours call-out · needs manager approval over £100', avatar: undefined as string | undefined, right: undefined as ReactNode },
      { id: 'Dave Hughes', title: 'Dave Hughes · from 18:00', sub: `In-house · residents without hot water for 7 more hours`, avatar: undefined, right: undefined }]
    : [{ id: 'Dave Hughes', title: 'Dave Hughes', sub: `In-house plumber · 2 jobs today · at ${f.where.split(' · ')[0]} now`, avatar: 'Dave Hughes', right: <Pill tone="green" icon={Timer}>Free from 13:00</Pill> },
      { id: 'Northern Heating Ltd', title: 'Northern Heating Ltd', sub: 'Contractor · £85 call-out · next day', avatar: 'Northern Heating', right: <Pill tone="grey" outline icon={FileText}>Contract</Pill> },
      { id: 'Estates helpdesk', title: 'Estates helpdesk', sub: 'Operator estates team · 3–5 days', avatar: 'Estates Services', right: undefined }];
  const [who, setWho] = useState(opts[0].id);
  const [visit, setVisit] = useState('Today, 14:00–16:00');
  const [sla, setSla] = useState(f.priority === 'Urgent' ? '24 hours · urgent' : '5 days · normal');
  const [enter, setEnter] = useState(true);
  const [tell, setTell] = useState(true);
  const first = (f.reporter ?? 'the resident').split(' ')[0];
  const [note, setNote] = useState(f.id === 'm1' ? 'Valve at the bottom of the radiator under the window. Bring a replacement TRV valve, it was bled in January.' : '');
  const needsOk = breached && who === 'Northern Heating Ltd';
  const short = who === 'Northern Heating Ltd' ? 'Northern Heating' : who;

  const submit = () => once(() => {
    onClose();
    if (needsOk) {
      toast('Asked Aisha Khan to approve £120', { description: 'She gets it on her phone. The job goes out as soon as she says yes.' });
      setTimeout(() => {
        const undo = useRms.getState().update('faults', f.id, {
          assignee: 'Northern Heating Ltd', status: 'In progress', stage: 2, approvedNote: 'Aisha Khan approved £120 at 11:02',
          sub: 'Ustinov · Block C · 24 rooms · Northern Heating Ltd · arriving 13:10',
        });
        onDone('Northern Heating Ltd', false);
        undoToast('Northern Heating assigned · 24 residents told the arrival time', undo);
      }, 2200);
      return;
    }
    const undo = update('faults', f.id, { assignee: who, status: 'In progress', stage: 2 });
    const closeTask = f.id === 'm1' && useDb.getState().tasks.some((t) => t.id === 't1' && !t.done);
    onDone(who, closeTask);
    undoToast(`${f.ref} assigned to ${short.split(' ')[0] === 'Estates' ? 'the Estates helpdesk' : short}${tell && f.reporter ? ` · ${first} told the visit time` : ''}`, () => {
      undo();
      if (closeTask) useDb.getState().patch('tasks', (ts) => ts.map((t) => (t.id === 't1' ? { ...t, done: false } : t)));
    });
  });

  return (
    <SideSheet open={open} onClose={onClose} icon={UserPlus} title={`Assign ${f.ref}`} sub={`${f.title.replace(' onto the floor', '')} · ${f.where.replace(' · ', ' ')}`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={needsOk ? PaperPlaneTilt : Check} onClick={submit}>{needsOk ? 'Ask Aisha and assign' : `Assign to ${who === 'Estates helpdesk' ? 'Estates' : short.split(' ')[0]}`}</Button></>}>
      {breached && <div className="mb-5"><Note tone="red" icon={UserMinus} title="No in-house plumber free before 18:00">Dave is on MT-204 and Kim is off today. The contractor can come in 2 hours at the out-of-hours rate.</Note></div>}
      <SheetSection title="Who fixes it">
        <div role="radiogroup" className="space-y-2">{opts.map((o) => <RadioCard key={o.id} checked={who === o.id} onClick={() => setWho(o.id)} title={o.title} sub={o.sub} avatar={o.avatar} right={o.right} />)}</div>
      </SheetSection>
      {breached ? (
        <SheetSection title="Approval">
          <Select aria-label="Approver" defaultValue="Aisha Khan · Hall manager"><option>Aisha Khan · Hall manager</option><option>Mark Dunn · Deputy hall manager</option></Select>
        </SheetSection>
      ) : (
        <>
          <SheetSection title="Visit">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Visit"><Select value={visit} onChange={(e) => setVisit(e.target.value)}>{['Today, 14:00–16:00', 'Today, 16:00–18:00', 'Tomorrow, 09:00–11:00'].map((v) => <option key={v}>{v}</option>)}</Select></Field>
            <Field label="Deadline"><Select value={sla} onChange={(e) => setSla(e.target.value)}>{['24 hours · urgent', '2 days · high', '5 days · normal'].map((v) => <option key={v}>{v}</option>)}</Select></Field>
          </div>
          </SheetSection>
          {f.reporter && <SheetSection title="Resident">
          <div className="space-y-3">
          <ToggleRow title={`Enter if ${first} is out`} sub={f.id === 'm1' ? 'He allowed it in the report · 24h notice waived for urgent jobs' : '24h notice is sent first'} checked={enter} onChange={setEnter} />
          <ToggleRow title={`Tell ${first} the visit time`} sub="Email and the resident portal" checked={tell} onChange={setTell} />
          </div>
          </SheetSection>}
          <SheetSection title={`Note for ${who === 'Estates helpdesk' ? 'Estates' : short.split(' ')[0]}`}>
            <Textarea aria-label="Note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </SheetSection>
        </>
      )}
    </SideSheet>
  );
}

