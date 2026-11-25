// Workspace › Reports. Figma Flow 8 (3035–3038), empty 3130:2, E4 report bounces (3236, 3238, 3239).
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AirplaneLanding, ArrowsLeftRight, Car, DoorOpen, FileText, Lamp, Moon, SignOut,
  Bed, Buildings, CalendarBlank, CaretRight, ChartBar, ChatCircleText, Clock, CurrencyGbp, DownloadSimple, EnvelopeSimple, Funnel as FunnelIcon, Megaphone, Plus,
  ShareNetwork, UsersThree, Warning, Wrench, type Icon,
} from '../../components/icons';
import { toast } from 'sonner';
import { Avatar, avatarFx, Button, IconTile, type Tone, Note, Dropdown, Input, Pill, Sheet, Switch, Table, Toolbar, cx, SheetHero, SheetRow, SheetSection, StatStrip, listNav, type SheetNav, type MeterSpec } from '../../components/ui';
import { EditLink, PanelModal } from '../inventory/common';
import { useTab } from '../hooks';
import { useDb } from '../../data/store';
import { useAlloc, appCounts, offerCounts } from '../../data/allocations';
import { HALL_OCC, HALL_OCC_2025, type HallOcc } from '../../data/occupancy';
import { useInv } from '../../data/inventory';
import { useRms, type Fault } from '../../data/residents';
import { REPORTS, badgeLabel, scheduleUndo, useWorkspace, whenLabel, wid, type Recipient, type ReportDef, type Schedule } from '../../data/workspace';
import { EmptyState, Header, IconSelect, RowMenu } from '../org/parts';
import { useEmpty } from '../../data/empty';
import { Card, Empty } from '../../components/ui';
import { Strip } from '../../components/overview';
import { Dialog, DialogCloseButton, DialogContent, DialogTitle } from '../../components/shadcn/dialog';

/** Empty-states demo: a report with nothing to count yet. */
function NoReportData({ icon, title }: { icon: Icon; title: string }) {
  return <><RHeader icon={icon} title={title} /><div className="flex-1 flex items-center justify-center"><Empty icon={icon} title="No data yet" sub="Numbers appear once properties and residents are added." /></div></>;
}

const AREA_ICON: Record<string, Icon> = { occupancy: Bed, applications: FunnelIcon, rent: CurrencyGbp, sla: Wrench, requests: ChatCircleText, notices: Megaphone };
const LIB = '/reports/library';
const crumbs = [{ label: 'Reports', to: LIB }];
/** Set while a report shows in the library's centred modal: its close function. */
const InModal = createContext<(() => void) | null>(null);
/** A report's header. On its own page it is the page header; in the modal (2026-11-13) it is the modal's 56px header:
 *  title, the report's actions, then the bordered ✕ (no header icon, as every modal). */
function RHeader({ icon, title, children }: { icon?: Icon; title: string; children?: ReactNode }) {
  const close = useContext(InModal);
  if (!close) return <Header icon={icon} crumbs={crumbs} title={title}>{children}</Header>;
  return (
    <div className="h-14 shrink-0 border-b border-[#E5E5E5] pl-6 pr-4 flex items-center gap-3">
      <DialogTitle className="flex-1 min-w-0 truncate text-base leading-5 font-medium text-[#0A0A0A]">{title}</DialogTitle>
      {children && <div className="flex items-center gap-2">{children}</div>}
      <DialogCloseButton />
    </div>
  );
}
/** The library opens a report here, over the list, rather than as a page. `id` is the report's path segment. */
function ReportModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent aria-describedby={undefined} onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement | null)?.focus(); }}
        className="max-w-[1120px] [--tx:24px]">
        <InModal.Provider value={onClose}>
          {id === 'applications' ? <ApplicationsReport /> : id ? <SimpleReport id={id} /> : null}
        </InModal.Provider>
      </DialogContent>
    </Dialog>
  );
}
/** Runs fn at most once per `ms`: a double click on Export makes one file. */
function useOnceFor(ms: number) {
  const busy = useRef(false);
  return (fn: () => void) => { if (busy.current) return; busy.current = true; fn(); setTimeout(() => { busy.current = false; }, ms); };
}
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIMES = ['07:00', '08:00', '09:00', '12:00', '17:00', '18:00'];

/* ======================= Library / Scheduled / Shared ======================= */
type LibTab = 'library' | 'scheduled' | 'shared';
export function ReportsLibrary() {
  const nav = useNavigate();
  const schedules = useWorkspace((s) => s.schedules);
  const [tab, setTab] = useTab<LibTab>('library');
  const [fix, setFix] = useState<Schedule | null>(null);
  /* Change recipient / Edit schedule open the panel with its edit modal already up. */
  const [fixEdit, setFixEdit] = useState(false);
  const openFix = (s: Schedule, edit = false) => { setFix(s); setFixEdit(edit); };
  /* Occupancy is its own page in the Reports panel, so the library doesn't list it again (2026-11-13). */
  const list = REPORTS.filter((r) => r.id !== 'occupancy');
  const [sp, setSp] = useSearchParams();
  // ?demo=empty shows the "Nothing scheduled" state (3130:2).
  useEffect(() => {
    if (sp.get('demo') !== 'empty') return;
    useWorkspace.getState().set('schedules', []);
    setSp((p) => { const n = new URLSearchParams(p); n.delete('demo'); n.set('tab', 'scheduled'); return n; }, { replace: true });
  }, [sp, setSp]);
  /* A report opens in a centred modal over the list (2026-11-13); ?report= keeps it linkable. */
  const report = sp.get('report');
  const openReport = (to: string) => setSp((p) => { const n = new URLSearchParams(p); n.set('report', to.split('/').pop() ?? ''); return n; });
  const closeReport = () => setSp((p) => { const n = new URLSearchParams(p); n.delete('report'); return n; });
  return (
    <>
      <ReportModal id={report} onClose={closeReport} />
      <Header icon={ChartBar} crumbs={[{ label: 'Reports' }]} title={{ library: 'Library', scheduled: 'Scheduled', shared: 'Shared with me' }[tab]}>
        <Button variant="primary" icon={Plus} onClick={() => toast('Custom reports are coming soon', { description: 'Start from a library report and schedule it for now.' })}>New report</Button>
      </Header>
      {/* Library, Scheduled and Shared with me are rows in the Reports panel, so the page has no tabs. */}
      {tab === 'library' && (
        /* Same frame as Settings (2026-11-13): a 960px column 32px in, and the list in a Connect card with a 44px #FAFAFA header band. */
        <div className="flex-1 overflow-auto">
          <div className="max-w-[720px] mx-auto px-8 pt-6 pb-16">{/* 24px under the centred page heading (pageIntro). */}
            <section className="rounded-xl border border-[#E5E5E5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
              <header className="min-h-11 py-3 pl-4 pr-3 flex items-center gap-2 bg-[#FAFAFA] border-b border-[#E5E5E5]">
                <h2 className="text-sm leading-5 font-medium text-[#0A0A0A]">All reports</h2>
                <span className="font-mono text-xs font-medium tabular-nums text-[#737373]">{list.length}</span>
              </header>
              <ul className="divide-y divide-[#E5E5E5]">
                {list.map((r) => <ReportRow key={r.id} r={r} badge={schedules.find((s) => s.reportId === r.id)} onOpen={() => openReport(r.to)} />)}
              </ul>
            </section>
          </div>
        </div>
      )}
      {tab === 'scheduled' && (schedules.length === 0 ? (
        <div className="flex-1 overflow-auto flex items-center justify-center">
          <EmptyState art="calendar" icon={CalendarBlank} title="Nothing scheduled" sub="Open a report and choose Schedule to email it.">
            <Button variant="primary" onClick={() => setTab('library')}>Browse the library</Button>
          </EmptyState>
        </div>
      ) : <ScheduledList onFix={openFix} selected={fix?.id} />)}
      {tab === 'shared' && (<div className="flex-1 min-h-0 flex flex-col">
        <Table rows={[{ id: 'sh1' }]} onRow={() => nav('/reports')} cols={[
          { key: 'r', label: 'Report', render: () => <span className="flex items-center gap-2.5"><span className="size-7 rounded-lg bg-[#DBEAFE] flex items-center justify-center"><Bed size={14} className="text-[#2563EB]" /></span><span className="text-sm font-medium">Arrivals this week · Collingwood</span></span> },
          { key: 'b', label: 'Shared by', render: () => <span className="flex items-center gap-2 text-sm"><Avatar name="Tom Baker" size={20} />Tom Baker</span> },
          { key: 'f', label: 'From', render: () => <span className="text-sm text-[#737373]">Occupancy</span> },
          { key: 'w', label: 'Shared', render: () => <span className="text-sm text-[#737373]">12 Sep</span> },
        ]} />
      </div>)}
      {fix && <RecipientSheet key={`${fix.id}${fixEdit}`} s={fix} edit={fixEdit} nav={listNav(schedules, (x) => x.id === fix.id, (x) => openFix(x))} onClose={() => setFix(null)} />}
    </>
  );
}

/* Icon tints alternate blue and purple, as the Connect list does. */
const AREA_TINT: Record<string, string> = { occupancy: '#2563EB', applications: '#9333EA', rent: '#2563EB', sla: '#9333EA', requests: '#2563EB', notices: '#9333EA' };
/** One library row: 48px circle with the avatar finish, 16px medium name over a 14px grey line, the schedule tag, and a View button. */
function ReportRow({ r, badge, onOpen }: { r: ReportDef; badge?: Schedule; onOpen: () => void }) {
  const I = AREA_ICON[r.id] ?? ChartBar;
  return (
    /* The whole row opens the report (2026-11-13); six "View" buttons said the same thing, so only a quiet chevron stays. */
    <li>
     <button type="button" onClick={onOpen} aria-label={`View ${r.name}`} className="group w-full px-4 py-4 flex items-center gap-3.5 text-left hover:bg-[#FAFAFA] outline-none focus-visible:bg-[#FAFAFA] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring transition-colors">
      <span className="size-12 shrink-0 rounded-full flex items-center justify-center" style={avatarFx(AREA_TINT[r.id] ?? AREA_TINT.occupancy)}>
        <I size={22} strokeWidth={1.75} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2"><span className="text-base leading-6 font-medium text-[#0A0A0A] truncate">{r.name}</span>{badge && <Pill tone="green">{badgeLabel(badge)}</Pill>}</span>
        <span className="block mt-1 text-sm leading-5 text-[#737373] truncate">{r.desc}</span>
      </span>
      <CaretRight size={16} strokeWidth={1.75} className="shrink-0 text-[#A3A3A3] group-hover:text-[#0A0A0A] transition-colors" />
     </button>
    </li>
  );
}

function ScheduledList({ onFix, selected }: { onFix: (s: Schedule, edit?: boolean) => void; selected?: string }) {
  const { schedules, set } = useWorkspace();
  const nav = useNavigate();
  const bounced = schedules.filter((s) => s.lastSend === 'Not delivered');
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* As Property layouts' rule (2026-11-13): a plain line above the list, no box, the fix on the right. */}
      {bounced.length > 0 && (
        <div className="shrink-0 px-[calc(var(--gx,16px)+var(--cx,12px))] py-4 flex flex-col gap-4">
          {bounced.map((s) => (
            <div key={s.id} className="flex items-center gap-3">
              <Note plain tone="red" icon={Warning} title={`${s.sendsTo} bounced on ${s.bounced ?? 'Mon 08:00'}`}>The mailbox no longer exists.</Note>
              <Button size="sm" className="ml-auto" onClick={() => onFix(s, true)}>Change recipient</Button>
            </div>
          ))}
        </div>
      )}
      <div className={cx('flex-1 min-h-0 flex flex-col', !bounced.length && 'pt-6')}>
        <Table rows={schedules} onRow={(s) => onFix(s)} selected={selected} cols={[
          { key: 'r', label: 'Report', className: 'w-[26%]', render: (s) => <span className="text-sm font-medium">{s.name}</span> },
          { key: 't', label: 'Sends to', render: (s) => <span className="text-sm text-gray-700">{s.sendsTo}</span> },
          { key: 'w', label: 'When', render: (s) => <span className="text-sm text-gray-700">{whenLabel(s)}</span> },
          { key: 'l', label: 'Last send', render: (s) => s.lastSend === 'Delivered' ? <Pill tone="green" icon={EnvelopeSimple}>Delivered</Pill> : s.lastSend === 'Not delivered' ? <Pill tone="red" icon={Warning}>Not delivered</Pill> : <Pill tone="grey">Not sent yet</Pill> },
          { key: 'x', label: '', className: 'w-12 text-right', render: (s) => <RowMenu items={[
            { label: 'Edit schedule', onClick: () => onFix(s, true) },
            { label: 'Open report', onClick: () => nav(REPORTS.find((r) => r.id === s.reportId)?.to ?? '/reports') },
            { label: 'Send now', onClick: () => { set('schedules', (ss) => ss.map((x) => (x.id === s.id && x.lastSend !== 'Not delivered' ? { ...x, lastSend: 'Delivered' as const } : x))); if (s.lastSend === 'Not delivered') onFix(s, true); else toast.success(`${s.name} sent to ${s.sendsTo}`); } },
            { label: 'Stop sending', danger: true, onClick: () => { const u = scheduleUndo(); set('schedules', (ss) => ss.filter((x) => x.id !== s.id)); toast.success(`${s.name} won’t be sent any more`, { action: { label: 'Undo', onClick: u.arm() } }); } },
          ]} /> },
        ]} />
      </div>
    </div>
  );
}

/* Schedule panel (record-panel language, 2026-11-19): read-only Send to, When and Format; Edit on a section opens the
   centred schedule modal (E4 · 02: change a bounced recipient and send this week's copy). Stop sending is in the control bar. */
const LAST_SEND_PILL: Record<Schedule['lastSend'], ReactNode> = { Delivered: <Pill tone="green">Delivered</Pill>, 'Not delivered': <Pill tone="red">Not delivered</Pill>, 'Not sent yet': <Pill tone="grey">Not sent yet</Pill> };
function RecipientSheet({ s: s0, edit = false, onClose, nav }: { nav?: SheetNav; s: Schedule; edit?: boolean; onClose: () => void }) {
  const { schedules, set } = useWorkspace();
  /* The live record, so a save shows straight away in the panel. */
  const s = schedules.find((x) => x.id === s0.id) ?? s0;
  const [editing, setEditing] = useState(edit);
  const bounced = s.lastSend === 'Not delivered';
  const I = AREA_ICON[s.reportId] ?? ChartBar;
  const stop = () => {
    const u = scheduleUndo();
    set('schedules', (ss) => ss.filter((x) => x.id !== s.id)); onClose();
    toast.success(`${s.name} won’t be sent any more`, { action: { label: 'Undo', onClick: u.arm() } });
  };
  const sendNow = () => {
    if (bounced) { setEditing(true); return; }
    set('schedules', (ss) => ss.map((x) => (x.id === s.id ? { ...x, lastSend: 'Delivered' as const } : x)));
    toast.success(`${s.name} sent to ${s.sendsTo}`);
  };
  const editLink = <EditLink onClick={() => setEditing(true)}>Edit</EditLink>;
  return (
    <Sheet open onClose={onClose} nav={nav} width={500} title="Schedule" onDelete={{ label: 'Stop sending', onClick: stop }}
      footer={<Button variant="primary" icon={null} className="ml-auto" onClick={sendNow}>Send now</Button>}>
      <SheetHero icon={I} name={s.name} meta={whenLabel(s)}>{LAST_SEND_PILL[s.lastSend]}</SheetHero>
      {bounced && <div className="mb-3"><Note tone="red" icon={Warning} title={`${s.sendsTo} bounced on ${s.bounced ?? 'Mon 08:00'}`}>The mailbox no longer exists.</Note></div>}
      <SheetSection title={`Send to · ${s.recipients.length}`} action={editLink}>
        {s.recipients.map((r) => <SheetRow key={r.id} lead={r.count > 1 ? <span className="size-6 shrink-0 rounded-full bg-[#F5F5F5] flex items-center justify-center"><UsersThree size={12} className="text-[#737373]" /></span> : <Avatar name={r.name} size={24} />} title={r.name} sub={r.sub} />)}
      </SheetSection>
      <SheetSection title="When" action={editLink} rows={[['Every', s.day === '1st' ? '1st of the month' : s.day], ['At', s.time]]} />
      <SheetSection title="Format" rows={[['PDF summary', s.formats.pdf ? 'On' : 'Off'], ['CSV data', s.formats.csv ? 'On' : 'Off']]} />
      <RecipientDialog s={s} open={editing} onClose={() => setEditing(false)} />
    </Sheet>
  );
}

/** Edit a schedule in a centred modal: recipient (one address), day and time, and send this week's copy now. */
function RecipientDialog({ s, open, onClose }: { s: Schedule; open: boolean; onClose: () => void }) {
  const { set } = useWorkspace();
  const bouncedNow = s.lastSend === 'Not delivered';
  const [to, setTo] = useState(bouncedNow ? 'warden.collingwood@durham.ac.uk' : s.sendsTo);
  const [day, setDay] = useState(s.day);
  const [time, setTime] = useState(s.time);
  const [now, setNow] = useState(bouncedNow);
  const busy = useRef(false);
  useEffect(() => { if (open) { busy.current = false; setTo(bouncedNow ? 'warden.collingwood@durham.ac.uk' : s.sendsTo); setDay(s.day); setTime(s.time); setNow(bouncedNow); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const multi = s.recipients.length > 1 || s.recipients.some((r) => r.count > 1);
  const save = () => {
    if (busy.current) return;
    if (!multi && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())) { toast.error('Enter an email address'); return; }
    busy.current = true;
    const u = scheduleUndo();
    const email = to.trim();
    set('schedules', (ss) => ss.map((x) => (x.id === s.id ? {
      ...x, day, time, bounced: now ? undefined : x.bounced,
      ...(multi ? {} : { sendsTo: email, recipients: [{ id: wid('x'), name: email, sub: 'Email', count: 1, email }] }),
      lastSend: now ? 'Delivered' as const : x.lastSend,
    } : x)));
    onClose();
    toast.success(now ? `${s.name} sent to ${multi ? s.sendsTo : email}` : `${s.name} · schedule saved`, { action: { label: 'Undo', onClick: u.arm() } });
  };
  return (
    <PanelModal open={open} onClose={onClose} eyebrow="Edit schedule" title={s.name} icon={AREA_ICON[s.reportId] ?? ChartBar} width={560}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} onClick={save}>{now ? 'Save and send' : 'Save'}</Button></>}>
      <SheetSection title="Send to">
        {multi ? <div className="text-sm text-[#0A0A0A]">{s.sendsTo}</div> : (
          <label className="relative flex items-center"><EnvelopeSimple size={14} className="absolute left-2.5 text-[#737373]" /><Input aria-label="Send to" value={to} onChange={(e) => setTo(e.target.value)} className="pl-8" /></label>
        )}
        {bouncedNow && <p className="text-xs text-[#E0243A] mt-1.5">{s.sendsTo} bounced: the mailbox no longer exists.</p>}
      </SheetSection>
      <SheetSection title="When">
        <div className="grid grid-cols-2 gap-3">
          <IconSelect ariaLabel="Day" value={day} onChange={setDay} options={[...DAYS.map((d) => ({ value: d, label: `${d}s` })), { value: '1st', label: '1st of the month' }]} />
          <IconSelect ariaLabel="Time" icon={Clock} value={time} onChange={setTime} options={TIMES.map((t) => ({ value: t, label: t }))} />
        </div>
      </SheetSection>
      <SheetSection title="This week">
        <SwitchRow title="Send this week’s now" sub={bouncedNow ? 'Monday’s copy never arrived' : 'Sends the latest copy straight away'} checked={now} onChange={setNow} />
      </SheetSection>
    </PanelModal>
  );
}
/** A switch row inside a section card: label and grey sub, split from its neighbours by a hairline. */
function SwitchRow({ title, sub, checked, onChange, icon: I }: { title: string; sub?: string; checked: boolean; onChange: (v: boolean) => void; icon?: Icon }) {
  return (
    <div className="py-2.5 flex items-center gap-3 border-t border-[#EBEBEB] first:border-t-0 first:pt-0 last:pb-0">
      {I && <I size={16} className="shrink-0 text-[#737373]" />}
      <span className="flex-1 min-w-0"><span className="block text-sm leading-5 text-[#0A0A0A]">{title}</span>{sub && <span className="block text-[13px] leading-5 text-[#737373]">{sub}</span>}</span>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

/* ======================= Occupancy report (F8 · 02–04) ======================= */
/* Hall rows come from the same figures as Inventory › Occupancy (data/occupancy.ts). */
type HallRow = HallOcc;
const HALL_ROWS: HallRow[] = HALL_OCC;
/** 2025/26 is archived: only its final week is kept, so no weekly detail and no arrivals. */
const ARCHIVE_ROWS: HallRow[] = HALL_OCC_2025;
const CURRENT = '2026/27';
/** Bar heights (px of a 180px plot) for in residence / arriving, as drawn in 3036:2. No screen keeps weekly history,
    so this is a seed curve; the chart rescales it so the last week lands on today's live occupancy. */
const WEEKS: { label: string; pct: number; res: number; arr: number }[] = [
  { label: '31 Aug', pct: 28, res: 42, arr: 14 }, { label: '7 Sep', pct: 41, res: 62, arr: 27 }, { label: '14 Sep', pct: 63, res: 95, arr: 33 },
  { label: '21 Sep', pct: 88, res: 132, arr: 9 }, { label: '28 Sep', pct: 94, res: 141, arr: 3 }, { label: '5 Oct', pct: 95, res: 143, arr: 2 },
];
const MAIN = 'occ-main';
const fmt = (n: number) => n.toLocaleString('en-GB');
/** Weekly rent per bed and the room type most often empty, per hall (ref 2061:285). */
/* No rent ledger per hall exists yet, so these weekly rents are a seed; Collingwood's is its Standard single rent in Inventory. */
const MONEY: Record<string, { rent: number; type: string }> = {
  ust: { rent: 189, type: 'Ensuite single' }, col: { rent: 182, type: 'Standard single' }, vm: { rent: 182, type: 'Standard single' },
  jb: { rent: 168, type: 'Ensuite single' }, stm: { rent: 204, type: 'Standard single' },
};
/** Weeks left on a 44-week tenancy from mid-September: what an empty bed loses if it stays empty. */
const WEEKS_LEFT = 42;
const gbp = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;
const gbpM = (n: number) => `£${(n / 1e6).toFixed(2)}m`;
/** Occupancy target, as on the Overview's pre-let card. */
const OCC_TARGET = 98;
/** A breakdown meter by hall, biggest share first, each hall a step lighter along `ramp`. */
const byHall = (rows: HallRow[], v: (r: HallRow) => number, ramp: string[]): MeterSpec => ({
  kind: 'split',
  parts: [...rows].sort((a, b) => v(b) - v(a)).map((r, i) => ({ label: r.hall, value: v(r), color: ramp[Math.min(i, ramp.length - 1)] })),
});
const atRisk = (r: HallRow) => r.vac * MONEY[r.id].rent * WEEKS_LEFT;
const rentRoll = (r: HallRow) => (r.res + r.arr) * MONEY[r.id].rent * 44;

/* 3036:2: filter chips lead with a 14px gray-500 icon (calendar, building, calendar). */
function Chip({ value, onChange, options, label, icon }: { value: string; onChange: (v: string) => void; options: string[]; label: string; icon?: Icon }) {
  /* The dropdown trigger is w-full, which beats a width passed to it; a shrink-0 wrapper lets the chip hug its text. */
  return <div className="shrink-0"><Dropdown icon={icon} value={value} onChange={onChange} options={options.map((o) => ({ value: o, label: o }))} ariaLabel={label}
    className="border-line shadow-tile font-medium" /></div>;
}

export function OccupancyReport() {
  const nav = useNavigate();
  const props = useInv((s) => s.properties);
  const openHall = (id: string) => nav(props.some((p) => p.id === id) ? `/inventory/properties?open=${id}` : '/inventory/occupancy');
  const schedules = useWorkspace((s) => s.schedules);
  const [year, setYear] = useState('2026/27');
  const [hall, setHall] = useState('All properties');
  const [by, setBy] = useState('By week');
  const [sheet, setSheet] = useState(false);
  const exportOnce = useOnceFor(1000);
  /* A schedule sends the view you're looking at: each hall + grouping is its own schedule. */
  const viewId = hall === 'All properties' && by === 'By week' ? MAIN : `occ-${hall}-${by}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const mine = schedules.find((s) => s.id === viewId);
  if (useEmpty.getState().on) return <NoReportData icon={ChartBar} title="Occupancy" />;
  const archived = year !== CURRENT;
  const view = archived ? 'By property' : by;
  const pick = (src: HallRow[]) => (hall === 'All properties' ? src : src.filter((r) => r.hall === hall));
  const total = (rs: HallRow[]) => rs.reduce((a, r) => ({ beds: a.beds + r.beds, res: a.res + r.res, arr: a.arr + r.arr, vac: a.vac + r.vac, blk: a.blk + r.blk, risk: a.risk + atRisk(r), roll: a.roll + rentRoll(r) }), { beds: 0, res: 0, arr: 0, vac: 0, blk: 0, risk: 0, roll: 0 });
  const rows = pick(archived ? ARCHIVE_ROWS : HALL_ROWS);
  const t = total(rows);
  const voids = [...rows].filter((r) => r.vac > 0).sort((a, b) => atRisk(b) - atRisk(a));
  /* One definition everywhere: occupancy = beds let (in residence + arriving) ÷ beds. */
  const pct = (r: { res: number; arr: number; beds: number }) => Math.round(((r.res + r.arr) / r.beds) * 100);
  const occ = pct(t);
  const lastYear = pct(total(pick(ARCHIVE_ROWS)));
  /* Weekly detail exists for all halls; one hall's weeks follow the same curve, ending at its own occupancy. */
  const k = occ / WEEKS[WEEKS.length - 1].pct;
  const bars = view === 'By week' ? WEEKS.map((w) => ({ ...w, pct: Math.min(100, Math.round(w.pct * k)), res: w.res * k, arr: w.arr * k })) : rows.map((r) => ({ label: r.hall, pct: pct(r), res: (r.res / r.beds) * 150, arr: (r.arr / r.beds) * 150 }));
  const diff = occ - lastYear;

  return (
    <>
      <Header icon={ChartBar} crumbs={crumbs} title="Occupancy">
        <Button icon={DownloadSimple} onClick={() => exportOnce(() => toast.success('Occupancy.csv downloaded', { description: `${rows.length} ${rows.length === 1 ? 'hall' : 'halls'} · ${year} · ${view.toLowerCase()}` }))}>Export CSV</Button>
        {mine ? <Button icon={Clock} onClick={() => setSheet(true)}>Every {mine.day === '1st' ? '1st of the month' : mine.day} {mine.time}</Button>
          : <Button variant="primary" icon={Clock} onClick={() => setSheet(true)}>Schedule</Button>}
      </Header>
      <Toolbar right={<span className="text-xs text-[#737373] whitespace-nowrap shrink-0">Updated 5 min ago</span>}>
        <Chip icon={CalendarBlank} label="Letting year" value={year} onChange={setYear} options={[CURRENT, '2025/26']} />
        <Chip icon={Buildings} label="Properties" value={hall} onChange={setHall} options={['All properties', ...HALL_ROWS.map((r) => r.hall)]} />
        <Chip icon={CalendarBlank} label="Group by" value={view} onChange={setBy} options={archived ? ['By property'] : ['By week', 'By property']} />
        {archived && <span className="text-xs text-[#737373] whitespace-nowrap">Archived · final week only</span>}
      </Toolbar>
      <div className="flex-1 overflow-auto px-[var(--tx,16px)] pb-6 space-y-4">
        <StatStrip bleed items={[
          { label: 'Occupancy', value: `${occ}%`, sub: archived ? `Final week of ${year}` : `${diff >= 0 ? '+' : '−'}${Math.abs(diff)} ${Math.abs(diff) === 1 ? 'pt' : 'pts'} vs 2025/26`,
            meter: { kind: 'progress', value: t.res + t.arr, max: t.beds, target: OCC_TARGET, tip: `${occ}% · target ${OCC_TARGET}%` } },
          /* The same blues as the chart below: in residence, then arriving. */
          { label: 'Rent roll', value: gbpM(t.roll), sub: `${fmt(t.res + t.arr)} beds let · ${year}`,
            meter: { kind: 'split', parts: [{ label: 'In residence', value: t.res, color: '#2563EB' }, { label: 'Arriving', value: t.arr, color: '#93C5FD' }] } },
          /* Split by hall, largest first, so the biggest gap reads first. */
          { label: archived ? 'Void beds at year end' : 'Void beds today', value: fmt(t.vac), sub: archived ? 'the year has ended' : `${gbp(t.risk)} rent at risk`,
            meter: byHall(rows, (r) => r.vac, ['#C2410C', '#EA580C', '#F97316', '#FB923C', '#FDBA74']) },
          { label: 'Held units', value: fmt(t.blk), sub: 'excluded from occupancy', meter: byHall(rows, (r) => r.blk, ['#6D28D9', '#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD']) },
          { label: 'Avg days void', value: archived ? '—' : '11.6', sub: archived ? 'kept for the current year only' : 'from release to re-let' },
        ]} />
        <div className="grid grid-cols-[minmax(0,1fr)_460px] gap-4">
        {/* Connect cards (2026-11-17): r16, a #FAFAFA mono strip, 20px body, as on the Overview. */}
        <Card className="overflow-hidden min-w-0">
          <Strip title={view === 'By week' ? 'Beds filled by week' : 'Beds filled by property'}
            right={<span className="flex items-center gap-4 text-xs text-[#737373]"><span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-[#2563EB]" />In residence</span><span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-[#93C5FD]" />Arriving</span></span>} />
          <div className="p-5">
          <div className="h-[180px] border-b border-line flex items-end justify-around px-6">
            {bars.map((b) => (
              <div key={b.label} className="flex flex-col items-center w-11">
                <span className="font-mono text-xs font-medium tabular-nums mb-1.5">{b.pct}%</span>
                <div className="w-11 rounded-t-md bg-[#93C5FD]" style={{ height: b.arr }} />
                <div className="w-11 bg-[#2563EB]" style={{ height: b.res }} />
              </div>
            ))}
          </div>
          <div className="flex justify-around px-6 mt-2">{bars.map((b) => <span key={b.label} className="w-11 text-center font-mono uppercase text-[11px] leading-4 text-[#737373] whitespace-nowrap">{b.label}</span>)}</div>
          </div>
        </Card>
        <Card className="overflow-hidden flex flex-col">
          <Strip title="Voids by property" right={!archived && <span className="font-mono text-xs uppercase tracking-[0.48px] text-[#737373]">{WEEKS_LEFT} weeks left</span>} />
          <table className="w-full text-sm">
            <thead><tr className="font-mono uppercase tracking-[0.48px] text-xs font-medium text-[#737373] border-b border-line bg-white [&>th]:bg-white">
              <th className="text-left font-medium h-9 pl-5">Property</th><th className="text-left font-medium px-3">Void beds</th><th className="text-left font-medium px-3">Most void type</th><th className="text-left font-medium px-3 pr-5">{archived ? 'Rent lost' : 'Rent at risk'}</th>
            </tr></thead>
            <tbody>{voids.map((r) => (
              <tr key={r.id} className="border-b border-[#F5F5F5] last:border-0 hover:bg-[#FAFAFA] cursor-pointer" onClick={() => openHall(r.id)}>
                <td className="h-10 pl-5 font-medium whitespace-nowrap">{r.hall}</td>
                <td className="px-3 tabular-nums">{r.vac}</td>
                <td className="px-3 text-[#737373] whitespace-nowrap">{MONEY[r.id].type}</td>
                <td className="px-3 pr-5 font-semibold tabular-nums">{gbp(atRisk(r))}</td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
        </div>
        <Card className="overflow-hidden">
          <Strip title="Properties" right={<span className="font-mono text-xs uppercase tracking-[0.48px] text-[#737373]">{rows.length} {rows.length === 1 ? 'hall' : 'halls'}</span>} />
          <table className="w-full text-sm">
            <thead><tr className="font-mono uppercase tracking-[0.48px] text-xs font-medium text-[#737373] border-b border-line bg-white [&>th]:bg-white">
              <th className="text-left font-medium h-9 pl-5">Property</th>{['Beds', 'In residence', 'Arriving', 'Vacant', 'Blocked', 'Rent roll', 'Rent at risk'].map((h) => <th key={h} className="text-left font-medium px-3">{h}</th>)}<th className="text-left font-medium px-3 pr-5">Filled</th>
            </tr></thead>
            {/* Filled is a plain percentage; only the hall with the most rent at risk is red. */}
            <tbody>{rows.map((r) => { const p = pct(r); const worst = Math.max(...rows.map(atRisk)); return (
              <tr key={r.id} className="border-b border-[#F5F5F5] last:border-0 hover:bg-[#FAFAFA] cursor-pointer" onClick={() => openHall(r.id)}>
                <td className="h-11 pl-5 font-medium">{r.hall}</td>
                {[r.beds, r.res, r.arr, r.vac, r.blk].map((v, i) => <td key={i} className={cx('px-3 font-mono tabular-nums', v === 0 && 'text-[#A3A3A3]')}>{fmt(v)}</td>)}
                <td className="px-3 font-mono tabular-nums">{gbpM(rentRoll(r))}</td>
                <td className={cx('px-3 font-mono tabular-nums', atRisk(r) === worst && rows.length > 1 ? 'text-[#B91C1C] font-medium' : 'text-[#0A0A0A]')}>{gbp(atRisk(r))}</td>
                <td className="px-3 pr-5 font-mono tabular-nums">{p}%</td>
              </tr>
            ); })}</tbody>
          </table>
        </Card>
      </div>
      {sheet && <ScheduleSheet id={viewId} hall={hall} by={view} existing={mine} onClose={() => setSheet(false)} />}
    </>
  );
}

const DEFAULT_RECIPIENTS: Recipient[] = [
  { id: 'r1', name: 'Arjun Mehta', sub: 'You', count: 1 },
  { id: 'r2', name: 'James Reed', sub: 'Finance', count: 1 },
  { id: 'r3', name: 'Heads of college', sub: '5 people · group', count: 5 },
];

/** F8 · 03: schedule the occupancy report. */
function ScheduleSheet({ id, hall, by, existing, onClose }: { id: string; hall: string; by: string; existing?: Schedule; onClose: () => void }) {
  const { set } = useWorkspace();
  const what = `Occupancy · ${hall === 'All properties' ? 'all properties' : hall} · ${by.toLowerCase()}`;
  const [err, setErr] = useState('');
  const people = useDb((s) => s.people);
  const [day, setDay] = useState(existing?.day ?? 'Monday');
  const [time, setTime] = useState(existing?.time ?? '08:00');
  const [rec, setRec] = useState<Recipient[]>(existing?.recipients ?? DEFAULT_RECIPIENTS);
  const [fmts, setFmts] = useState(existing?.formats ?? { pdf: true, csv: true });
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const busy = useRef(false);
  const total = rec.reduce((a, r) => a + r.count, 0);
  const sugg = useMemo(() => {
    const t = q.trim().toLowerCase();
    const groups: Recipient[] = [{ id: 'g-wardens', name: 'Resident managers', sub: '4 people · group', count: 4 }, { id: 'g-estates', name: 'Estates', sub: '3 people · group', count: 3 }];
    const ps: Recipient[] = people.map((p) => ({ id: p.id, name: p.name, sub: p.role, count: 1 }));
    /* Hide anyone already on the list, by id or by name ("Arjun Mehta" is also "You"). */
    return [...groups, ...ps].filter((r) => !rec.some((x) => x.id === r.id || x.name === r.name) && (!t || r.name.toLowerCase().includes(t))).slice(0, 5);
  }, [q, people, rec]);
  const add = (r: Recipient) => { setRec([...rec, r]); setQ(''); setErr(''); setAdding(false); };
  const enter = () => {
    const v = q.trim();
    if (!v) return;
    if (v.includes('@')) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setErr('Enter a full email address, like name@durham.ac.uk'); return; }
      if (rec.some((x) => x.email?.toLowerCase() === v.toLowerCase())) { setErr(`${v} is already on the list`); return; }
      add({ id: wid('e'), name: v, sub: 'Email', count: 1, email: v }); return;
    }
    if (sugg[0]) add(sugg[0]); else setErr(`No one called “${v}”. Use their email address instead.`);
  };
  const save = () => {
    if (busy.current) return;
    if (!rec.length) { toast.error('Add at least one recipient'); return; }
    if (!fmts.pdf && !fmts.csv) { toast.error('Pick a format'); return; }
    busy.current = true;
    const u = scheduleUndo();
    const s: Schedule = { id, reportId: 'occupancy', name: what.replace(' · by week', ''), sendsTo: `${total} ${total === 1 ? 'person' : 'people'}`, recipients: rec, day, time, lastSend: 'Not sent yet', formats: fmts };
    set('schedules', (ss) => (ss.some((x) => x.id === id) ? ss.map((x) => (x.id === id ? s : x)) : [...ss, s]));
    onClose();
    toast.success(`${s.name} scheduled · every ${day === '1st' ? '1st of the month' : day} ${time} · ${s.sendsTo}`, { action: { label: 'Undo', onClick: u.arm() } });
  };
  const stop = () => {
    const u = scheduleUndo();
    set('schedules', (ss) => ss.filter((x) => x.id !== id)); onClose();
    toast.success(`${existing?.name ?? 'Occupancy'} won’t be sent any more`, { action: { label: 'Undo', onClick: u.arm() } });
  };
  return (
    <PanelModal open onClose={onClose} width={560} eyebrow={existing ? 'Edit schedule' : 'New schedule'} title={existing?.name ?? 'Schedule this report'} icon={AREA_ICON[existing?.reportId ?? 'occupancy'] ?? ChartBar} meta={what}
      left={existing && <Button variant="danger-ghost" icon={null} onClick={stop}>Stop sending</Button>}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} onClick={save}>{existing ? 'Save' : 'Schedule'}</Button></>}>
      <SheetSection title="When">
        <div className="grid grid-cols-2 gap-3">
          <div><div className="text-sm font-medium mb-1.5">Every</div><IconSelect ariaLabel="Every" icon={CalendarBlank} value={day} onChange={setDay} options={[...DAYS.map((d) => ({ value: d, label: d })), { value: '1st', label: '1st of the month' }]} /></div>
          <div><div className="text-sm font-medium mb-1.5">At</div><IconSelect ariaLabel="At" icon={Clock} value={time} onChange={setTime} options={TIMES.map((t) => ({ value: t, label: t }))} /></div>
        </div>
      </SheetSection>
      <SheetSection title={`Send to · ${total} ${total === 1 ? 'person' : 'people'}`}>
        {rec.map((r) => (
          <SheetRow key={r.id} lead={r.count > 1 ? <span className="size-6 shrink-0 rounded-full bg-[#F5F5F5] flex items-center justify-center"><UsersThree size={12} className="text-[#737373]" /></span> : <Avatar name={r.name} size={24} />}
            title={r.name} sub={r.sub}
            end={r.sub !== 'You' ? <button type="button" onClick={() => setRec(rec.filter((x) => x.id !== r.id))} className="text-sm text-[#737373] hover:text-[#E0243A]">Remove</button> : undefined} />
        ))}
        <div className="mt-2.5 pt-2.5 border-t border-[#EBEBEB]">
          {adding ? (
            <div className="relative">
              <Input value={q} aria-label="Add people or a group" aria-invalid={!!err || undefined} onChange={(e) => { setQ(e.target.value); setErr(''); }} placeholder="Name, group or email" onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); enter(); }
                if (e.key === 'Escape') setAdding(false);
              }} ref={(el) => el?.focus()} />
              {err && <p role="alert" className="text-xs text-[#C11F14] mt-1.5">{err}</p>}
              {sugg.length > 0 && <div className="mt-1 rounded-lg border border-line divide-y divide-line">{sugg.map((r) => <button key={r.id} type="button" onClick={() => add(r)} className="w-full h-8 px-2.5 flex items-center gap-2 text-left text-sm hover:bg-gray-50">{r.name}<span className="ml-auto text-xs text-[#737373]">{r.sub}</span></button>)}</div>}
            </div>
          ) : <button type="button" onClick={() => setAdding(true)} className="h-6 flex items-center gap-2 text-sm font-medium text-primary"><Plus size={13} />Add people or a group</button>}
        </div>
        <p className="mt-3 text-xs text-[#737373]">Recipients only see properties they have access to.</p>
      </SheetSection>
      <SheetSection title="Format">
        {([['pdf', 'PDF summary'], ['csv', 'CSV data']] as const).map(([k, l]) => (
          <SwitchRow key={k} icon={DownloadSimple} title={l} checked={fmts[k]} onChange={(v) => setFmts({ ...fmts, [k]: v })} />
        ))}
      </SheetSection>
    </PanelModal>
  );
}

/* ======================= Applications funnel ======================= */
export function ApplicationsReport() {
  const d = useAlloc();
  const [cycle, setCycle] = useState('2027/28');
  const exportOnce = useOnceFor(1000);
  if (useEmpty.getState().on || !d.apps.length) return <NoReportData icon={FunnelIcon} title="Applications funnel" />;
  /* The live cycle counts the same rows as Allocations › Applications and Offers; a closed cycle uses its totals
     from Allocations › Cycles (every application in it was reviewed; offers went to the allocated ones). */
  const live = d.cycles.find((c) => c.status === 'open')?.name ?? '2027/28';
  const f = (() => {
    if (cycle === live) {
      const ac = appCounts(d), oc = offerCounts(d);
      return { applied: ac.all, reviewed: ac.all - ac.review, offered: oc.open + oc.accepted + oc.declined + oc.lapsed, accepted: oc.accepted };
    }
    const c = d.cycles.find((x) => x.name === cycle);
    return { applied: c?.apps ?? 0, reviewed: c?.apps ?? 0, offered: c?.allocated ?? 0, accepted: c?.accepted ?? c?.allocated ?? 0 };
  })();
  const stages = [
    ['Applied', f.applied, '#2563EB'], ['Reviewed', f.reviewed, '#7E22CE'], ['Offered', f.offered, '#F59E0B'], ['Accepted', f.accepted, '#087A43'],
  ] as const;
  return (
    <>
      <RHeader icon={FunnelIcon} title="Applications funnel">
        <Button icon={ShareNetwork} onClick={() => { void navigator.clipboard?.writeText(location.href).catch(() => {}); toast.success('Link copied', { description: 'People see only the properties they have access to.' }); }}>Share</Button>
        <Button variant="primary" icon={DownloadSimple} onClick={() => exportOnce(() => toast.success('Applications funnel.csv downloaded'))}>Export CSV</Button>
      </RHeader>
      <Toolbar right={<span className="text-xs text-[#737373] whitespace-nowrap shrink-0">Updated 5 min ago</span>}>
        <Chip label="Term" value={cycle} onChange={setCycle} options={['2027/28', '2026/27']} />
      </Toolbar>
      <div className="flex-1 overflow-auto px-[var(--tx,16px)] pb-6 space-y-4">
        {/* Each stage keeps its chart colour on the bar. £182 a week is the seed average rent (Collingwood's Standard single). */}
        <StatStrip bleed items={[...stages.map(([l, n, c]) => ({ label: l, value: fmt(n), meter: { kind: 'progress' as const, value: n, max: f.applied, color: c, tip: `${Math.round((n / f.applied) * 100)}% of applied` } })), { label: 'Rent booked', value: gbpM(f.accepted * 182 * 44), sub: 'accepted × 44 weeks' }]} />
        <div className="rounded-xl border border-line bg-white p-5">
          <h2 className="text-sm font-semibold mb-4">From application to booking · {cycle} term</h2>
          <div className="space-y-3">
            {stages.map(([label, n, c]) => (
              <div key={label} className="grid grid-cols-[110px_1fr_60px] items-center gap-4 text-sm">
                <span className="font-medium">{label}</span>
                <div className="h-7 rounded-md bg-[#F5F5F5] overflow-hidden"><div className="h-full rounded-md" style={{ width: `${stages[0][1] ? (n / stages[0][1]) * 100 : 0}%`, background: c }} /></div>
                <span className="text-right font-semibold tabular-nums">{stages[0][1] ? Math.round((n / stages[0][1]) * 100) : 0}%</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#737373] mt-5">Median time from application to offer: 6 days. Target: 5.</p>
        </div>
      </div>
    </>
  );
}

/* ======================= The other library reports ======================= */
type Simple = { title: string; tiles: [string, string, string?, string?][]; cols: string[]; rows: (string | number)[][] };
/* The figures these reports had before they were derived; kept only as a fallback shape. Live builders below replace them. */
const SIMPLE: Record<string, Simple> = {
  rent: { title: 'Rent and arrears', tiles: [['Billed', '£4.12m', undefined, 'Autumn period'], ['Collected', '£3.86m', '#087A43', '94% of billed'], ['Overdue', '£61,240', '#E0243A', '£1,612 average'], ['Residents in arrears', '38', '#C2410C', '9 over 30 days']], cols: ['Property', 'Billed', 'Collected', 'Overdue', 'In arrears'],
    rows: [['Ustinov', '£1.09m', '£1.01m', '£22,180', 14], ['Collingwood', '£0.92m', '£0.88m', '£9,460', 6], ['Van Mildert', '£1.06m', '£0.99m', '£18,120', 11], ['Josephine Butler', '£0.79m', '£0.74m', '£8,980', 5], ["St Mary’s", '£0.26m', '£0.24m', '£2,500', 2]] },
  'maintenance-sla': { title: 'Maintenance deadlines', tiles: [['Jobs closed', '412'], ['On time', '91%', '#087A43', '+3 pts vs last period'], ['Open and overdue', '9', '#E0243A'], ['Cost', '£18,640', undefined, '£45 a job']], cols: ['Property', 'Jobs', 'On time', 'Median fix', 'Cost'],
    rows: [['Ustinov', 121, '88%', '50 h', '£5,980'], ['Collingwood', 84, '94%', '34 h', '£3,410'], ['Van Mildert', 97, '90%', '46 h', '£4,720'], ['Josephine Butler', 78, '93%', '38 h', '£3,220'], ["St Mary’s", 32, '97%', '26 h', '£1,310']] },
  requests: { title: 'Requests', tiles: [['Requests', '286'], ['Answered in 2 days', '84%', '#087A43'], ['Waiting', '6', '#C2410C'], ['Most asked', '112', undefined, 'Room swap']], cols: ['Kind', 'Requests', 'Approved', 'Median reply'],
    rows: [['Room swap', 112, '61%', '1.8 days'], ['Early arrival', 74, '89%', '0.9 days'], ['Guest stay', 63, '95%', '0.6 days'], ['Lease change', 37, '46%', '3.2 days']] },
  'notice-reach': { title: 'Notice reach', tiles: [['Notices sent', '18'], ['Delivered', '99%', '#087A43'], ['Opened', '72%', '#1F45E0'], ['Clicked', '31%']], cols: ['Notice', 'Sent', 'Delivered', 'Opened', 'Clicked'],
    rows: [['Fire alarm test, Thursday', '10 Sep', '1,876', '81%', '12%'], ['Welcome week timetable', '7 Sep', '2,098', '77%', '46%'], ['Rent due for Autumn', '1 Sep', '2,203', '69%', '38%'], ['Water off in Fenwick Block', '28 Aug', '47', '91%', '4%']] },
};

/* ---- Derived from the screens that own the data ---- */
const pctS = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : '—');
const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const hallOfFault = (f: Fault) => f.where.split(' · ')[0];
const hallKey = (h: string) => h.replace(/ College$/, '').replace("'", '’');
/** "1d 2h", "19h 08m", "6h" → hours. */
const hoursOf = (s?: string) => { if (!s) return null; const d = /(\d+)d/.exec(s), h = /(\d+)h/.exec(s), m = /(\d+)m/.exec(s); return (d ? +d[1] * 24 : 0) + (h ? +h[1] : 0) + (m ? +m[1] / 60 : 0); };
/* Deadlines by priority, as Residents › Maintenance sets them on a new job. */
const SLA_H: Record<string, number> = { Urgent: 24, High: 48, Normal: 120 };
/* No job-cost ledger exists yet: a seed average per closed job. */
const COST_PER_JOB = 45;
/* No billing ledger exists yet: overdue rent and residents in arrears per hall are a seed. Billed is live:
   beds let (Inventory › Occupancy) × weekly rent × Michaelmas weeks (Settings › Academic year). */
const OVERDUE: Record<string, [number, number]> = { ust: [22180, 14], col: [9460, 6], vm: [18120, 11], jb: [8980, 5], stm: [2500, 2] };

function useLiveSimple(id: string): Simple | undefined {
  const faults = useRms((s) => s.faults);
  const requests = useRms((s) => s.requests);
  const notices = useRms((s) => s.notices);
  const terms = useWorkspace((s) => s.terms);
  if (id === 'rent') {
    const weeks = terms[0]?.weeks ?? 10;
    const rows = HALL_OCC.map((h) => { const billed = (h.res + h.arr) * MONEY[h.id].rent * weeks; const [over, n] = OVERDUE[h.id]; return { h, billed, coll: billed - over, over, n }; });
    const t = rows.reduce((a, r) => ({ billed: a.billed + r.billed, coll: a.coll + r.coll, over: a.over + r.over, n: a.n + r.n }), { billed: 0, coll: 0, over: 0, n: 0 });
    return { title: 'Rent and arrears', tiles: [['Billed', gbpM(t.billed), undefined, `${terms[0]?.name ?? 'Autumn'} period`], ['Collected', gbpM(t.coll), '#087A43', `${pctS(t.coll, t.billed)} of billed`], ['Overdue', gbp(t.over), '#E0243A', `${gbp(t.n ? t.over / t.n : 0)} average`], ['Residents in arrears', fmt(t.n), '#C2410C']],
      cols: ['Property', 'Billed', 'Collected', 'Overdue', 'In arrears'], rows: rows.map((r) => [r.h.hall, gbpM(r.billed), gbpM(r.coll), gbp(r.over), r.n]) };
  }
  if (id === 'maintenance-sla') {
    const fixed = faults.filter((f) => f.status === 'Fixed');
    const onTime = (f: Fault) => (hoursOf(f.fixedIn) ?? 0) <= SLA_H[f.priority];
    /* Same rule as the Overdue filter in Residents › Maintenance. */
    const overdue = faults.filter((f) => f.slaMins < 0 && f.status !== 'Waiting on parts' && f.status !== 'Fixed').length;
    const halls = HALL_OCC.map((h) => {
      const mine = faults.filter((f) => hallKey(hallOfFault(f)) === h.hall), done = mine.filter((f) => f.status === 'Fixed');
      const med = median(done.map((f) => hoursOf(f.fixedIn) ?? 0));
      return [h.hall, mine.length, pctS(done.filter(onTime).length, done.length), med === null ? '—' : `${Math.round(med)} h`, gbp(done.length * COST_PER_JOB)];
    });
    return { title: 'Maintenance deadlines', tiles: [['Jobs closed', fmt(fixed.length)], ['On time', pctS(fixed.filter(onTime).length, fixed.length), '#087A43', 'fixed within the deadline'], ['Open and overdue', fmt(overdue), '#E0243A'], ['Cost', gbp(fixed.length * COST_PER_JOB), undefined, `£${COST_PER_JOB} a job`]],
      cols: ['Property', 'Jobs', 'On time', 'Median fix', 'Cost'], rows: halls };
  }
  if (id === 'requests') {
    const kinds = [...new Set(requests.map((r) => r.kind))].sort((a, b) => requests.filter((r) => r.kind === b).length - requests.filter((r) => r.kind === a).length);
    const decided = (rs: typeof requests) => rs.filter((r) => r.status === 'Approved' || r.status === 'Declined');
    const waiting = requests.filter((r) => r.status === 'Open' || r.status === 'Waiting on resident');
    return { title: 'Requests', tiles: [['Requests', fmt(requests.length)], ['Approved', pctS(requests.filter((r) => r.status === 'Approved').length, decided(requests).length), '#087A43', 'of decided requests'], ['Waiting', fmt(waiting.length), '#C2410C'], ['Most asked', kinds[0] ? fmt(requests.filter((r) => r.kind === kinds[0]).length) : '—', undefined, kinds[0]]],
      cols: ['Kind', 'Requests', 'Approved', 'Median wait'],
      rows: kinds.map((k) => { const rs = requests.filter((r) => r.kind === k); const w = median(rs.filter((r) => r.status === 'Open' || r.status === 'Waiting on resident').map((r) => r.waitDays)); return [k, rs.length, pctS(rs.filter((r) => r.status === 'Approved').length, decided(rs).length), w === null ? '—' : `${w.toFixed(1)} days`]; }) };
  }
  if (id === 'notice-reach') {
    const sent = notices.filter((n) => n.status === 'Sent');
    const reach = sent.reduce((a, n) => a + n.count, 0);
    const opened = sent.reduce((a, n) => a + n.count * (n.opened ?? 0), 0) / (reach || 1);
    return { title: 'Notice reach', tiles: [['Notices sent', fmt(sent.length)], ['Recipients', fmt(reach)], ['Opened', `${Math.round(opened)}%`, '#1F45E0'], ['Scheduled', fmt(notices.filter((n) => n.status === 'Scheduled').length)]],
      cols: ['Notice', 'Sent', 'Recipients', 'Opened'], rows: sent.map((n) => [n.title, (n.when ?? '').split(',')[0], fmt(n.count), n.opened === undefined ? '—' : `${n.opened}%`]) };
  }
  return undefined;
}

/* Colour in the simple reports: a toned icon on each row's name, rates as bars, money owed in red. */
const ROW_TONES: Tone[] = ['blue', 'purple', 'green', 'amber', 'orange'];
const KIND_ICON: Record<string, [Icon, Tone]> = {
  'Overnight guest': [Moon, 'purple'], 'Guest stay': [Moon, 'purple'], 'Room swap': [ArrowsLeftRight, 'blue'], 'Parking permit': [Car, 'amber'],
  'Room move': [DoorOpen, 'green'], Furniture: [Lamp, 'orange'], 'Early arrival': [AirplaneLanding, 'blue'], 'Leave early': [SignOut, 'red'], 'Lease change': [FileText, 'grey'],
};
/* Engagement rates have no pass mark, so they stay one blue; the rest go green, amber or red against it. */
const RATE_PLAIN = new Set(['Opened', 'Clicked']);
const RATE_COLS = new Set(['Approved', 'On time', 'Opened', 'Clicked']);
/* Dates read left to right, so they line up on their first letter rather than ragged on the right. */
const DATE_COLS = new Set(['Sent']);
const rateTone = (col: string, n: number) => (RATE_PLAIN.has(col) ? '#2563EB' : n >= 90 ? '#0B8A4C' : n >= 75 ? '#C47A00' : '#E0243A');
function cellFor(col: string, v: string | number, row: number): ReactNode {
  if (col === 'Property' || col === 'Kind' || col === 'Notice') {
    const [I, tone]: [Icon, Tone] = col === 'Kind' ? KIND_ICON[String(v)] ?? [ChatCircleText, 'grey'] : col === 'Notice' ? [Megaphone, ROW_TONES[row % ROW_TONES.length]] : [Buildings, ROW_TONES[row % ROW_TONES.length]];
    return <span className="flex items-center gap-2.5 min-w-0"><IconTile icon={I} tone={tone} size={28} /><span className="truncate">{v}</span></span>;
  }
  const m = typeof v === 'string' ? /^(\d+)%$/.exec(v) : null;
  if (m) {
    const n = +m[1], c = rateTone(col, n);
    /* Left-aligned like Occupancy's Filled column: every bar starts on one line and the value sits right after it. */
    return <span className="flex items-center gap-2.5"><span className="w-20 h-1.5 shrink-0 rounded-full bg-[#F5F5F5] overflow-hidden"><span className="block h-full rounded-full" style={{ width: `${n}%`, background: c }} /></span><span className="font-medium" style={{ color: c }}>{v}</span></span>;
  }
  if (v === '—' && RATE_COLS.has(col)) return <span className="text-[#A3A3A3]">—</span>;
  if (col === 'Overdue') return <span className="text-[#B91C1C] font-medium">{v}</span>;
  if (col === 'In arrears' && Number(v) > 0) return <span className="text-[#C2410C] font-medium">{v}</span>;
  return v;
}

export function SimpleReport({ id: idProp }: { id?: string } = {}) {
  const { id: idParam = '' } = useParams();
  const id = idProp ?? idParam;
  const live = useLiveSimple(id);
  const r = live ?? SIMPLE[id];
  const def = REPORTS.find((x) => x.to === `/reports/${id}`);
  if (!r) return <><RHeader icon={ChartBar} title="Report not found" /><div className="p-6 text-sm text-[#737373]">There’s no report here. Pick one from the library.</div></>;
  const I = (def && AREA_ICON[def.id]) ?? ChartBar;
  if (useEmpty.getState().on) return <NoReportData icon={I} title={r.title} />;
  return (
    <>
      <RHeader icon={I} title={r.title}>
        <Button icon={DownloadSimple} onClick={() => toast.success(`${r.title}.csv downloaded`)}>Export CSV</Button>
        <Button variant="primary" icon={CalendarBlank} onClick={() => toast('Scheduling is set up on Occupancy in the prototype', { description: 'Open Occupancy and choose Schedule.' })}>Schedule</Button>
      </RHeader>
      <Toolbar right={<span className="text-xs text-[#737373] whitespace-nowrap shrink-0">Updated 5 min ago</span>}><Chip label="Letting year" value="2026/27" onChange={() => {}} options={['2026/27']} /><Chip label="Properties" value="All properties" onChange={() => {}} options={['All properties']} /></Toolbar>
      <div className="flex-1 overflow-auto px-[var(--tx,16px)] pb-6 space-y-4">
        <StatStrip bleed items={r.tiles.map(([l, v, c, sub]) => ({ label: l, value: v, color: c, sub }))} />
        <div className="rounded-xl border border-line bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-[#737373] border-b border-line">{r.cols.map((c, i) => <th key={c} className={cx('font-medium h-9 px-3 text-left', i === 0 && 'pl-5', RATE_COLS.has(c) && 'w-[200px]', i === r.cols.length - 1 && 'pr-5')}>{c}</th>)}</tr></thead>
            <tbody>{r.rows.map((row, ri) => <tr key={String(row[0])} className="border-b border-[#F5F5F5] last:border-0">{row.map((v, i) => <td key={i} className={cx('h-12 px-3 tabular-nums', i === 0 ? 'pl-5 font-medium' : DATE_COLS.has(r.cols[i]) && 'whitespace-nowrap', i === row.length - 1 && 'pr-5')}>{cellFor(r.cols[i], v, ri)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}
