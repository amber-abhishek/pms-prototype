import { cloneElement, isValidElement, useMemo, useRef, useState, type ReactNode } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowUp, Bell, Check, CheckCircle, CircleDashed, Drop, Envelope, FileText, Fan, HardHat, ImageSquare, Key, Lamp, LightbulbFilament, LightningSlash, Lock,
  Minus, PaperPlaneTilt, PawPrint, Plus, RadioButton, ArrowCounterClockwise, Shower, Siren, Snowflake, SpinnerGap, Thermometer, Timer, Toilet, User, UserMinus, UserPlus, WarningCircle, WashingMachine, WifiSlash, Wind, Wrench, Door, Package, Fire, type Icon,
} from '../../components/icons';
import { toast } from 'sonner';
import { useDb } from '../../data/store';
import { fmtSla, useRms, type Fault, type FaultIcon, type FaultStatus, type Priority } from '../../data/residents';
import { PersonName, Avatar, Button, Card, Empty, Field, FilterButton, inFilter, type Filters, Input, Note, Pill, SearchInput, Select, Sheet, SheetHero, SheetRow, SheetSection, Table, Textarea, Toolbar, cx, listNav, type SheetNav } from '../../components/ui';
import { Tabs as UITabs, TabsList, TabsTrigger } from '../../components/shadcn/tabs';
import { MaintenanceBoard } from './MaintenanceBoard';
import { LineTabs, PanelModal } from '../inventory/common';
import { KV, Modal, Panel, Person, Photo, RHeader, RadioRow, Timeline, ToggleRow, undoToast, useOnce } from './kit';

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
const STATUSES: FaultStatus[] = ['New', 'In progress', 'Waiting on parts', 'Fixed'];
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
  const faults = useRms((s) => s.faults);
  const [f, setF] = useState<Filters>({ status: ['New', 'In progress', 'Waiting on parts'] });
  const [slaFirst, setSlaFirst] = useState(true);
  const [logging, setLogging] = useState(() => sp.get('log') === '1');
  const [contractors, setContractors] = useState(false);
  const hallOf = (x: Fault) => x.where.split(' · ')[0];
  const needle = q.trim().toLowerCase();
  const scoped = faults.filter((x) => inFilter(f.hall, hallOf(x)) && inFilter(f.priority, x.priority)
    && inFilter(f.assignee, x.assignee ?? 'Not assigned')
    && inFilter(f.sla, pastSla(x) ? 'Overdue' : 'On time')
    && (!needle || [x.ref, x.title, x.where, x.reporter ?? ''].some((v) => v.toLowerCase().includes(needle))));
  const rows = useMemo(() => {
    const r = scoped.filter((x) => inFilter(f.status, x.status));
    const key = (x: Fault) => (x.status === 'Waiting on parts' ? 1e9 : x.slaMins);
    return slaFirst ? [...r].sort((a, b) => key(a) - key(b)) : [...r].sort((a, b) => b.ref.localeCompare(a.ref));
  }, [scoped, f.status, slaFirst]);
  /* Links from Home and elsewhere (?open=<id>) open the job in the side sheet over the board. */
  if (open) return <Navigate to={`/residents/maintenance?job=${open}`} replace />;
  return (
    <>
      <RHeader icon={Wrench} crumbs={[['Residents']]} title="Maintenance">
        {/* V3 (Figma 3918:47856): the Table/Board switch is a page-level choice, so it sits in the header, with its labels. */}
        <Button icon={HardHat} onClick={() => setContractors(true)}>Contractors</Button>
        <Button variant="primary" icon={Plus} onClick={() => setLogging(true)}>Log a fault</Button>
      </RHeader>
      {/* Toolbar: search on the left; the filters and the Table/Board switch together on the right. */}
      {faults.length > 0 && (
        <Toolbar right={<>
          <FilterButton value={f} onChange={setF} defs={[
            ...(view === 'table' ? [{ id: 'status', label: 'Status', options: STATUSES, tones: { New: 'blue', 'In progress': 'amber', 'Waiting on parts': 'purple', Fixed: 'green' } as const }] : []),
            { id: 'priority', label: 'Priority', options: ['Urgent', 'High', 'Normal'], tones: { Urgent: 'red', High: 'orange', Normal: 'grey' } },
            { id: 'sla', label: 'Deadline', options: ['Overdue', 'On time'], tones: { Overdue: 'red', 'On time': 'green' } },
            { id: 'hall', label: 'Property', options: ['Ustinov', 'Collingwood', 'Van Mildert', 'St Mary’s', 'Josephine Butler'] },
            { id: 'assignee', label: 'Assignee', options: ['Not assigned', ...[...new Set(faults.map((x) => x.assignee).filter((a): a is string => !!a))].sort()] },
          ]} />
          <UITabs value={view} onValueChange={setView}>
            <TabsList aria-label="View">
              <TabsTrigger value="table">Table</TabsTrigger>
              <TabsTrigger value="board">Board</TabsTrigger>
            </TabsList>
          </UITabs>
        </>}>
          <div className="w-[260px] min-w-[140px] shrink [&>label]:!w-full"><SearchInput value={q} onChange={setQ} placeholder="Job, resident or room" /></div>
        </Toolbar>
      )}
      {view === 'board' ? <MaintenanceBoard faults={scoped} onLog={() => setLogging(true)} selected={job} onOpen={setJob} /> : (
      <Table rows={rows} onRow={(x) => setJob(x.id)} selected={job ?? undefined} sort={slaFirst ? { key: 's', dir: 'asc', onToggle: () => setSlaFirst(false) } : { key: 'r', dir: 'desc', onToggle: () => setSlaFirst(true) }} footer={false}
        empty={<Empty art="faults" icon={Wrench} title={faults.length ? 'No faults match' : 'No faults yet'} sub={faults.length ? 'Try another search or clear the filters.' : 'Faults residents report show here.'} action={<Button icon={Plus} onClick={() => setLogging(true)}>Log a fault</Button>} />}
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
    patch('faults', (fs) => [{ id, ref: `MT-${n}`, title: title.trim(), icon: 'leak', where: place, priority, category: 'General', slaMins: priority === 'Urgent' ? 1440 : priority === 'High' ? 2880 : 7200, status: 'New', reporter: r?.name ?? 'Arjun Mehta', reporterRoom: r?.room ?? 'Staff', reported: 'Just now', report: desc.trim() || 'Logged by Arjun Mehta at the desk.', stage: 1 }, ...fs]);
    toast.success(`MT-${n} logged`, { description: `${priority} · deadline clock starts now` });
    setTitle(''); setWho(''); setWhere(''); setDesc('');
    onClose();
    nav(`/residents/maintenance/${id}`);
  });
  return (
    <PanelModal open={open} onClose={onClose} eyebrow="New fault" width={560}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} onClick={submit}>Create fault</Button></>}>
      <SheetSection title="Fault">
        <div className="space-y-4">
          <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Shower drains slowly" /></Field>
          <Field label="What’s wrong"><Textarea rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        </div>
      </SheetSection>
      <SheetSection title="Who and where">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="On behalf of"><Select value={who} onChange={(e) => setWho(e.target.value)}><option value="">Nobody (a shared area)</option>{residents.map((r) => <option key={r.id}>{r.name}</option>)}</Select></Field>
            <Field label="Priority"><Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{['Urgent', 'High', 'Normal'].map((p) => <option key={p}>{p}</option>)}</Select></Field>
          </div>
          {!who && <Field label="Where"><Input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="e.g. Collingwood · D kitchen" /></Field>}
        </div>
      </SheetSection>
    </PanelModal>
  );
}

function ContractorsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Contractors">
      <SheetSection title="In-house and contract · 5">
      {[['Dave Hughes', 'In-house plumber · 2 jobs today', 'In-house'], ['Kim Lowe', 'In-house electrician · off today', 'In-house'], ['Northern Heating Ltd', 'Heating and plumbing · £85 call-out · £120 out of hours', 'Contract'], ['Estates helpdesk', 'Operator estates team · 3–5 days', 'Operator'], ['IT team', 'Wi-Fi and network', 'Operator']].map(([n, s, t]) => (
        <SheetRow key={n} lead={<Avatar name={n} size={24} />} title={n} sub={s} end={<Pill tone="grey">{t}</Pill>} />
      ))}
      </SheetSection>
    </Sheet>
  );
}

/* ---------------- Detail: 3023–3026, 3215, 3216 ---------------- */
const radiatorSteps = (f: Fault) => {
  const s = f.stage ?? 1;
  return [
    { title: 'Reported by Leo Grant', sub: 'Resident portal · 3 photos', when: 'Mon 08:12' },
    { title: `Assigned to ${f.assignee ?? 'Dave Hughes'} by Arjun Mehta`, sub: 'Visit today 14:00–16:00 · Leo told by email', when: 'Mon 09:05' },
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
    undoToast(isRad ? `${f.ref} fixed on time · Leo confirmed · £42 charged to Ustinov repairs` : `${f.ref} fixed · ${f.reporter ? `${first} asked to confirm` : 'logged against the property'}`, undo);
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

/** The report, progress and details, in the job page's two columns. The side panel has its own tabs (FaultPanelBody). */
function FaultSections({ f, v }: { f: Fault; v: FaultView }) {
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
          ['Assigned', f.assignee ? <PersonName name={f.assignee}>{f.assignee === 'Dave Hughes' && <span className="text-[#737373] whitespace-nowrap">· in-house plumber</span>}</PersonName> : <span className="text-[#737373]">Nobody yet</span>],
        ]} />
      </Panel>
    </div>
  );
  return <>{main}{side}</>;
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
  const [tab, setTab] = useState<'overview' | 'updates' | 'photos'>('overview');
  /* Footer per Figma: plain buttons, no icons. */
  const plain = (b: ReactNode) => (isValidElement<{ icon?: unknown }>(b) ? cloneElement(b, { icon: null }) : b);
  const statusPill = f.status === 'Fixed' ? <Pill tone="green">Fixed</Pill>
    : v.late && !f.assignee ? <Pill tone="red">Overdue</Pill>
      : !f.assignee ? <Pill tone="amber">Not assigned</Pill>
        : f.status === 'Waiting on parts' ? <Pill tone="amber">Waiting on parts</Pill>
          : <Pill tone="blue">In progress</Pill>;
  return (
    <>
      <Sheet open={open} onClose={onClose} nav={nav} width={520} title={`Fault · ${f.ref}`}
        footer={<>{plain(v.message)}{plain(v.primary)}</>}>
        <SheetHero icon={faultIcon[f.icon]} name={f.title}
          meta={`${f.where}${f.reporter ? ` · Reported by ${f.reporter}` : ''}`}
          facts={[
            ['SLA', f.status === 'Fixed' ? `Fixed in ${f.fixedIn ?? '—'}` : f.status === 'Waiting on parts' ? 'Paused' : f.slaMins < 0 ? `Overdue ${fmtSla(Math.abs(f.slaMins))}` : `${fmtSla(f.slaMins)} left`, f.status !== 'Fixed' && f.status !== 'Waiting on parts' && f.slaMins < 0 ? 'red' : undefined],
            ['Assigned', f.assignee ?? 'Nobody', f.assignee ? undefined : 'amber'],
            ['Logged', f.reported ?? '—'],
          ]}>
          {f.priority !== 'Normal' && <Pill tone={f.priority === 'Urgent' ? 'red' : 'orange'}>{f.priority}</Pill>}
          {statusPill}
        </SheetHero>
        <div className="-mx-5 mb-5">
          <LineTabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'updates', label: 'Updates' }, { id: 'photos', label: 'Photos' }]} />
        </div>
        <FaultPanelBody f={f} v={v} tab={tab} />
      </Sheet>
      {v.overlays}
    </>
  );
}

/* Prototype photo count for a job without the radiator's three: stable by id, 0–2. */
const photoCount = (f: Fault) => (f.id === 'm1' ? 3 : [...f.id].reduce((h, c) => h + c.charCodeAt(0), 0) % 3);
const STEP_ICON = {
  done: <CheckCircle size={20} weight="fill" className="shrink-0 text-[#0B8A4C]" />,
  now: <RadioButton size={20} className="shrink-0 text-primary" />,
  todo: <CircleDashed size={20} className="shrink-0 text-[#A3A3A3]" />,
};

/** The Fault panel's tabs (Figma 4067:18295, 4074:19110, 4074:19281). */
function FaultPanelBody({ f, v, tab }: { f: Fault; v: FaultView; tab: 'overview' | 'updates' | 'photos' }) {
  const { isRad, late, steps, logUpdate } = v;
  const notes = [
    f.approvedNote && <Note key="ok" tone="green" icon={CheckCircle} title={f.approvedNote}>Out-of-hours call-out · charged to Ustinov repairs.</Note>,
    isRad && !f.assignee && <Note key="rad" tone="amber" icon={WarningCircle} title="Water near a socket">Marked urgent: 24-hour deadline.</Note>,
    late && !f.assignee && <Note key="late" tone="red" icon={Timer} title={`Overdue by ${fmtSla(f.slaMins)}`}>Whole-block urgent faults have a 4-hour deadline.</Note>,
  ].filter(Boolean);
  const reporter = f.reporter ?? 'A resident';
  if (tab === 'updates') {
    /* Newest first: the steps that have happened, as people's updates. */
    const done = steps.filter((s) => s.done).reverse();
    const who = (t: string) => (t.startsWith('Reported') ? reporter : t.startsWith('Assigned') ? 'Arjun Mehta' : f.assignee ?? 'Arjun Mehta');
    return (
      <SheetSection title={`Updates · ${done.length}`}>
        {done.map((s) => <SheetRow key={s.title} lead={<Person name={who(s.title)} size={24} />} title={s.title} sub={[s.sub, s.when].filter(Boolean).join(' · ')} />)}
        {f.status !== 'Fixed' && isRad && (f.stage ?? 2) < 5 && <Button size="sm" className="mt-3" icon={Plus} onClick={logUpdate}>Log an update</Button>}
      </SheetSection>
    );
  }
  if (tab === 'photos') {
    const n = photoCount(f);
    return <>
      <SheetSection title={`Photos · ${n}`}>
        {n ? <div className="grid grid-cols-3 gap-2">{Array.from({ length: n }, (_, i) => <span key={i} className="aspect-[4/3] rounded-lg bg-[#F5F5F5] flex items-center justify-center text-[#A3A3A3]"><ImageSquare size={20} /></span>)}</div>
          : <p className="text-sm text-[#737373]">No photos with this report</p>}
      </SheetSection>
      {n > 0 && <SheetSection title="From" rows={[['Uploaded by', reporter], ['When', f.reported ?? 'Earlier']]} />}
    </>;
  }
  /* Overview: Logged → Assigned → On site → Fixed, then the job's details. */
  const onSite = f.status === 'Fixed' || (f.stage ?? 0) >= 3;
  const prog = [
    { title: 'Logged', sub: `${reporter} · ${f.reported ?? 'Earlier'}`, done: true },
    { title: 'Assigned', sub: f.assignee ? f.assignee : 'Nobody yet', done: !!f.assignee },
    { title: 'On site', sub: f.status === 'Waiting on parts' ? 'Waiting on parts' : onSite ? 'Engineer on site' : f.assignee ? 'Visit booked' : undefined, done: onSite },
    { title: 'Fixed', sub: f.status === 'Fixed' ? `Fixed in ${f.fixedIn ?? '—'}` : undefined, done: f.status === 'Fixed' },
  ];
  const now = prog.findIndex((x) => !x.done);
  return <>
    {notes.length > 0 && <div className="space-y-2 mb-3">{notes}</div>}
    <SheetSection title={`Progress · ${prog.filter((x) => x.done).length} / ${prog.length}`}>
      {prog.map((x, i) => (
        <SheetRow key={x.title} lead={x.done ? STEP_ICON.done : i === now ? STEP_ICON.now : STEP_ICON.todo}
          title={<span className={x.done || i === now ? undefined : 'text-[#737373]'}>{x.title}</span>} sub={x.sub} />
      ))}
    </SheetSection>
    <SheetSection title="Details" rows={[
      ['Category', isRad ? 'Heating · radiator' : f.category],
      ['Room', isRad ? 'C.2.14 · Standard single' : f.rooms ? `Block C · ${f.rooms} rooms` : f.where.split(' · ')[1] ?? f.where],
      ...(isRad ? [['Asset', 'RAD-C214-01 · fitted 2019'], ['Last job here', 'MT-088 · bled radiator · Jan 2026']] as [string, ReactNode][] : []),
      ['Report', f.report ?? `${f.title}. Please could someone take a look?`],
    ]} />
  </>;
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
    <PanelModal open={open} onClose={onClose} eyebrow={`Assign ${f.ref}`} icon={faultIcon[f.icon]} title={f.title.replace(' onto the floor', '')} meta={f.where} width={600}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} onClick={submit}>{needsOk ? 'Ask Aisha and assign' : `Assign to ${who === 'Estates helpdesk' ? 'Estates' : short.split(' ')[0]}`}</Button></>}>
      {breached && <div className="mb-3"><Note tone="red" icon={UserMinus} title="No in-house plumber free before 18:00">The contractor can come in 2 hours at the out-of-hours rate.</Note></div>}
      <SheetSection title="Who fixes it">
        <div role="radiogroup" aria-label="Who fixes it">{opts.map((o) => <RadioRow key={o.id} checked={who === o.id} onClick={() => setWho(o.id)} title={o.title} sub={o.sub} avatar={o.avatar} right={o.right} />)}</div>
      </SheetSection>
      {breached ? (
        <SheetSection title="Approval">
          <Select aria-label="Approver" defaultValue="Aisha Khan · Property manager"><option>Aisha Khan · Property manager</option><option>Mark Dunn · Deputy property manager</option></Select>
        </SheetSection>
      ) : (
        <>
          <SheetSection title="Visit">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Time slot"><Select value={visit} onChange={(e) => setVisit(e.target.value)}>{['Today, 14:00–16:00', 'Today, 16:00–18:00', 'Tomorrow, 09:00–11:00'].map((v) => <option key={v}>{v}</option>)}</Select></Field>
            <Field label="Deadline"><Select value={sla} onChange={(e) => setSla(e.target.value)}>{['24 hours · urgent', '2 days · high', '5 days · normal'].map((v) => <option key={v}>{v}</option>)}</Select></Field>
          </div>
          </SheetSection>
          {f.reporter && <SheetSection title="Resident">
          <ToggleRow title={`Enter if ${first} is out`} sub={f.id === 'm1' ? 'He allowed it in the report · 24h notice waived for urgent jobs' : '24h notice is sent first'} checked={enter} onChange={setEnter} />
          <ToggleRow title={`Tell ${first} the visit time`} sub="Email and the resident portal" checked={tell} onChange={setTell} />
          </SheetSection>}
          <SheetSection title={`Note for ${who === 'Estates helpdesk' ? 'Estates' : short.split(' ')[0]}`}>
            <Textarea aria-label="Note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </SheetSection>
        </>
      )}
    </PanelModal>
  );
}

