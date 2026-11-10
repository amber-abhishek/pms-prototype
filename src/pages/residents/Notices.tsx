import { Fragment, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChatText, Clock, DeviceMobile, Envelope, Megaphone, Moon, PaperPlaneTilt, PencilSimple, Plus, Siren, X } from '../../components/icons';
import { toast } from 'sonner';
import { useDb } from '../../data/store';
import { GROUPS, HALLS, MOVE_IN_BODY, audienceCount, useRms, type Channels, type Notice } from '../../data/residents';
import { Button, Card, Check as CheckBox, DL, Empty, Field, FilterButton, Input, Note, Pill, Select, Sheet, Switch, Table, Tabs, Textarea, Toolbar, SheetHero, SheetSection, listNav, type SheetNav } from '../../components/ui';
import { Modal, RHeader, ToggleRow, undoToast, useOnce } from './kit';
import { useTab } from '../hooks';

const statusPill = (n: Notice) =>
  n.urgent && n.status === 'Sent' ? <Pill tone="red" icon={Siren}>Urgent</Pill>
    : n.status === 'Sent' ? <Pill tone="green" icon={PaperPlaneTilt}>Sent</Pill>
      : n.status === 'Scheduled' ? <Pill tone="blue" icon={Clock}>Scheduled</Pill>
        : <Pill tone="grey" icon={PencilSimple}>Draft</Pill>;

const audienceOf = (hall: string, group: string) => `${hall} · ${group === 'All residents' ? 'all residents' : group.toLowerCase()}`;

/* ---------------- List: 3014, 3122 (empty), 3212 ---------------- */
type Tab = 'All' | 'Sent' | 'Scheduled' | 'Drafts';
export function NoticesList() {
  const [sp, setSp] = useSearchParams();
  const open = sp.get('open');
  const setOpen = (id: string | null) => setSp((p) => { const x = new URLSearchParams(p); if (id) x.set('open', id); else x.delete('open'); return x; }, { replace: !id });
  const notices = useRms((s) => s.notices);
  const nav = useNavigate();
  const [tab, setTab] = useTab<Tab>('All');
  const [f, setF] = useState<Record<string, string>>({});
  const inHall = notices.filter((n) => !f.hall || n.hall === f.hall);
  const st: Record<Tab, Notice['status'] | null> = { All: null, Sent: 'Sent', Scheduled: 'Scheduled', Drafts: 'Draft' };
  /* Mercury-style date order: scheduled first (soonest on top), then sent (newest first), drafts last. */
  const rank = (n: Notice) => (n.status === 'Scheduled' ? 0 : n.status === 'Sent' ? 1 : 2);
  const rows = inHall.filter((n) => !st[tab] || n.status === st[tab]).map((n, i) => ({ n, i })).sort((a, b) => rank(a.n) - rank(b.n) || a.i - b.i).map((x) => x.n);
  const openN = notices.find((x) => x.id === open);
  if (openN?.status === 'Draft') return <Navigate to={`/residents/notices/${openN.id}`} replace />;
  const c = (t: Tab) => inHall.filter((n) => !st[t] || n.status === st[t]).length;
  return (
    <>
      <RHeader icon={Megaphone} crumbs={[['Residents']]} title="Notices">
        <Button variant="primary" icon={Plus} onClick={() => nav('/residents/notices/new')}>New notice</Button>
      </RHeader>
      <Toolbar right={<FilterButton value={f} onChange={setF} defs={[{ id: 'hall', label: 'Hall', options: HALLS }]} />}>
        <Tabs value={tab} onChange={setTab} tabs={(['All', 'Sent', 'Scheduled', 'Drafts'] as Tab[]).map((t) => ({ id: t, label: t, count: c(t) }))} />
      </Toolbar>
      <Table fill rows={rows} selected={open ?? undefined} group={{ label: 'Date', get: (n) => (n.status === 'Draft' ? 'Drafts' : n.when?.split(',')[0] ?? '') }} onRow={(n) => (n.status === 'Draft' ? nav(`/residents/notices/${n.id}`) : setOpen(n.id))}
        empty={<Empty art="notices" icon={Megaphone} title={notices.length ? `No ${tab.toLowerCase()} notices` : 'No notices yet'} sub="Tell residents about outages, fire drills and events."
          action={<div className="flex gap-2"><Button variant="primary" icon={Plus} onClick={() => nav('/residents/notices/new')}>New notice</Button><Button onClick={() => nav('/residents/notices/new?template=move-in')}>Use a template</Button></div>} />}
        cols={[
          { key: 't', label: 'Notice', className: 'max-w-[320px]', render: (n) => <span className="block truncate font-medium" title={n.title}>{n.title}</span> },
          { key: 'a', label: 'Audience', className: 'max-w-[240px]', render: (n) => <span className="block truncate text-gray-500" title={n.audience}>{n.audience}</span> },
          { key: 'n', label: 'Residents', className: 'text-right w-[100px]', render: (n) => n.count.toLocaleString('en-GB') },
          { key: 's', label: 'Status', className: 'w-[150px] pl-6', render: statusPill },
          { key: 'o', label: 'Opened', className: 'w-[240px]', render: (n) => n.opened !== undefined ? <span className="flex items-center gap-3"><span className="w-[104px] h-1.5 rounded-full bg-gray-100 overflow-hidden"><span className="block h-full rounded-full bg-[#0B8A4C]" style={{ width: `${n.opened}%` }} /></span><span className="text-xs text-gray-500">{n.opened}%</span></span> : <span className="text-gray-400">—</span> },
        ]} />
      {openN && <NoticeSheet key={openN.id} n={openN} nav={listNav(rows.filter((x) => x.status !== 'Draft'), (x) => x.id === openN.id, (x) => setOpen(x.id))} onClose={() => setOpen(null)} />}
    </>
  );
}

/* ---------------- Detail router: draft → compose, else report ---------------- */
export function NoticePage() {
  const { id } = useParams();
  const n = useRms((s) => s.notices.find((x) => x.id === id));
  if (id === 'new') return <Compose key="new" />;
  if (!n) return <Navigate to="/residents/notices" replace />;
  return n.status === 'Draft' ? <Compose key={n.id} draft={n} /> : <Navigate to={`/residents/notices?open=${n.id}`} replace />;
}

/* ---------------- Compose: 3015, 3016, 3210, 3211 ---------------- */
type Cond = { field: 'Hall' | 'Status'; value: string };
const preview = (s: string) => s.replace(/\{first name\}/g, 'Amira').replace(/\{arrival slot\}/g, '\u000110:00–12:00\u0001').replace(/\{room\}/g, 'G.04.A');

function Compose({ draft }: { draft?: Notice }) {
  const [sp] = useSearchParams();
  const tpl = sp.get('template') === 'move-in';
  const nav = useNavigate();
  const { patch, update } = useRms();
  const { patch: patchDb, log } = useDb();
  const once = useOnce();
  const [title, setTitle] = useState(draft?.title ?? (tpl ? 'Move-in weekend: your arrival slot and what to bring' : ''));
  const [conds, setConds] = useState<Cond[]>(() => {
    const hall = draft?.hall ?? (tpl ? 'Ustinov College' : 'Ustinov College');
    const group = draft?.group ?? (tpl ? 'Arriving this week' : 'All residents');
    return [...(hall !== 'All halls' ? [{ field: 'Hall' as const, value: hall }] : []), ...(group !== 'All residents' ? [{ field: 'Status' as const, value: group }] : [])];
  });
  const [channels, setChannels] = useState<Channels>(draft?.channels ?? { email: true, portal: true, sms: false });
  const [body, setBody] = useState(draft?.body ?? (tpl ? MOVE_IN_BODY : ''));
  const [view, setView] = useState<'Email' | 'Portal'>('Email');
  const [scheduling, setScheduling] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const hall = conds.find((c) => c.field === 'Hall')?.value ?? 'All halls';
  const group = conds.find((c) => c.field === 'Status')?.value ?? 'All residents';
  const count = audienceCount(hall, group);
  const insert = (tok: string) => {
    const el = bodyRef.current; const at = el?.selectionStart ?? body.length;
    setBody(body.slice(0, at) + tok + body.slice(at));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(at + tok.length, at + tok.length); });
  };
  const build = (status: Notice['status'], extra: Partial<Notice> = {}): Notice => ({
    id: draft?.id ?? `nn${Date.now().toString(36)}`, title: title.trim(), audience: audienceOf(hall, group), hall, group, count, status, channels, body, ...extra,
  });
  const store = (n: Notice) => (draft ? update('notices', n.id, n) : patch('notices', (ns) => [n, ...ns]));
  const valid = () => { if (!title.trim() || !body.trim()) { toast.error('Add a title and a message'); return false; } return true; };

  const saveDraft = () => once(() => {
    if (!valid()) return;
    store(build('Draft'));
    log(`saved a draft notice “${title.trim()}”`, 'Residents');
    toast.success('Draft saved');
    nav('/residents/notices?tab=Drafts');
  });
  const schedule = (when: string, opts: { urgent: boolean; sendNow: boolean; pinned?: string }) => once(() => {
    const n = build(opts.sendNow ? 'Sent' : 'Scheduled', { when, urgent: opts.urgent || undefined, pinned: opts.pinned, opened: opts.sendNow ? 0 : undefined });
    const undo = store(n);
    const closesTask = n.id === 'n1' && useDb.getState().tasks.some((t) => t.id === 't5' && !t.done);
    if (closesTask) patchDb('tasks', (ts) => ts.map((t) => (t.id === 't5' ? { ...t, done: true } : t)));
    log(`${opts.sendNow ? 'sent' : 'scheduled'} “${n.title}”${opts.urgent ? ' as urgent' : ''}`, 'Residents');
    setScheduling(false);
    const msg = opts.sendNow ? `Sent to ${count.toLocaleString('en-GB')} residents · urgent, so quiet hours were skipped` : `Scheduled for ${when} · ${count.toLocaleString('en-GB')} residents${closesTask ? ' · task closed' : ''}`;
    undoToast(msg, () => { undo(); if (closesTask) patchDb('tasks', (ts) => ts.map((t) => (t.id === 't5' ? { ...t, done: false } : t))); });
    nav(opts.sendNow ? '/residents/notices?tab=Sent' : '/residents/notices?tab=Scheduled');
  });

  const shown = preview(body).split('\u0001');
  return (
    <>
      <RHeader icon={Megaphone} crumbs={[['Residents', '/residents'], ['Notices', '/residents/notices']]} title={draft ? 'Edit notice' : 'New notice'}>
        <Button onClick={saveDraft}>Save draft</Button>
        <Button variant="primary" icon={Clock} onClick={() => valid() && setScheduling(true)}>Schedule</Button>
      </RHeader>
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 overflow-auto p-6 space-y-5 min-w-0">
          <Field label="Title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Water off in Block D tomorrow 09:00–11:00" /></Field>
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1.5">Who gets it</div>
            <div className="rounded-xl border border-line p-3 space-y-2">
              {conds.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  {/* Sized wrappers: the trigger is w-full, which beats a width class passed to it. */}
                  <div className="w-36 shrink-0"><Select value={c.field} onChange={(e) => setConds(conds.map((x, j) => (j === i ? { field: e.target.value as Cond['field'], value: e.target.value === 'Hall' ? 'Ustinov College' : 'Arriving this week' } : x)))}>
                    <option>Hall</option><option>Status</option>
                  </Select></div>
                  <span className="text-sm text-gray-500">is</span>
                  <div className="flex-1 min-w-0"><Select aria-label={c.field} value={c.value} onChange={(e) => setConds(conds.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}>
                    {(c.field === 'Hall' ? HALLS.slice(1) : GROUPS.slice(1)).map((o) => <option key={o}>{o}</option>)}
                  </Select></div>
                  <button type="button" aria-label="Remove condition" onClick={() => setConds(conds.filter((_, j) => j !== i))} className="size-7 rounded-md text-gray-400 hover:bg-gray-100 hover:text-ink flex items-center justify-center"><X size={14} /></button>
                </div>
              ))}
              {conds.length < 2 && (
                <button type="button" className="text-sm text-primary flex items-center gap-1.5 px-1 h-7" onClick={() => setConds([...conds, conds.some((c) => c.field === 'Hall') ? { field: 'Status', value: 'Arriving this week' } : { field: 'Hall', value: 'Ustinov College' }])}><Plus size={13} /> Add a condition</button>
              )}
              {!conds.length && <div className="text-sm text-gray-500 px-1">Everyone in every hall</div>}
            </div>
            <p className="text-xs text-gray-500 mt-2"><b className="text-ink font-semibold">{count.toLocaleString('en-GB')} residents</b> match today; anyone added before sending gets it too</p>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700 mb-1.5">Send by</div>
            <div className="grid grid-cols-3 gap-2">
              {([['email', 'Email', Envelope], ['portal', 'Resident portal', DeviceMobile], ['sms', 'SMS', ChatText]] as const).map(([k, l, I]) => (
                <div key={k} className="h-10 rounded-xl border border-line px-3 flex items-center gap-2.5 text-sm">
                  <I size={16} className="text-gray-500" /><span className="flex-1">{l}</span>
                  <Switch label={l} checked={channels[k]} onChange={(v) => { setChannels({ ...channels, [k]: v }); if (k === 'sms' && v) toast('SMS is for urgent notices', { description: 'It costs 4p a message.' }); }} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center mb-1.5"><span className="text-sm font-medium text-gray-700">Message</span>
              <span className="ml-auto flex items-center gap-1 text-xs text-gray-500">Insert {['{first name}', '{arrival slot}', '{room}'].map((t) => <button key={t} type="button" onClick={() => insert(t)} className="h-6 px-1.5 rounded-md border border-line bg-white hover:bg-gray-50 text-ink">{t}</button>)}</span>
            </div>
            <textarea ref={bodyRef} rows={8} value={body} onChange={(e) => setBody(e.target.value)} className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm leading-relaxed outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 placeholder:text-gray-400" placeholder="Write to residents. Use {first name} to greet each one." />
          </div>
        </div>
        <aside className="w-[400px] shrink-0 border-l border-line bg-[#FAFAFB] p-5 overflow-auto">
          <div className="flex items-center mb-3"><span className="text-sm text-gray-500">Preview as Amira Rahman</span>
            <div className="ml-auto"><Tabs value={view} onChange={setView} tabs={[{ id: 'Email', label: 'Email' }, { id: 'Portal', label: 'Portal' }]} /></div></div>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><span className="size-5 rounded-md bg-[#4F46E5] text-white text-[11px] font-semibold flex items-center justify-center">D</span>Durham University Residences{view === 'Portal' && <span className="ml-auto text-xs text-gray-400 font-normal">Pinned</span>}</div>
            <div className="text-sm font-semibold mt-3">{title || 'Untitled notice'}</div>
            <div className="text-sm text-gray-700 mt-2.5 whitespace-pre-wrap leading-relaxed">
              {body ? shown.map((s, i) => (i % 2 ? <b key={i} className="font-semibold">{s}</b> : <Fragment key={i}>{s}</Fragment>)) : <span className="text-gray-400">Your message shows here, with merge fields filled in.</span>}
            </div>
          </Card>
        </aside>
      </div>
      <ScheduleDialog open={scheduling} onClose={() => setScheduling(false)} count={count} hall={hall} channels={channels} onSchedule={schedule} />
    </>
  );
}

const NOW_TIME = '11:20';
const TIMES = ['07:30', '08:00', '09:00', '12:00', '18:00', '22:30'];
function ScheduleDialog({ open, onClose, count, hall, channels, onSchedule }: { open: boolean; onClose: () => void; count: number; hall: string; channels: Channels; onSchedule: (when: string, o: { urgent: boolean; sendNow: boolean; pinned?: string }) => void }) {
  const [date, setDate] = useState('Wed 16 Sep');
  const [time, setTime] = useState('09:00');
  const [pin, setPin] = useState(true);
  /* It is 11:20 on Tue 15 Sep in the prototype: earlier times today have already gone. */
  const past = (d: string, t: string) => d === 'Today' && t < NOW_TIME;
  const pickDate = (d: string) => { setDate(d); if (past(d, time)) setTime(TIMES.find((t) => !past(d, t))!); };
  const [urgent, setUrgent] = useState(false);
  const quiet = useMemo(() => { const h = Number(time.slice(0, 2)); return h >= 21 || h < 8; }, [time]);
  const by = [channels.email && 'email', channels.portal && 'the resident portal', channels.sms && 'SMS'].filter(Boolean).join(' and ') || 'no channel yet';
  const sendNow = quiet && urgent && date === 'Today';
  const when = quiet && !urgent ? (date === 'Today' ? 'Wed 16 Sep, 08:00' : `${date}, 08:00 (next morning)`) : `${date}, ${time}`;
  return (
    <Modal open={open} onClose={onClose} title="Schedule the notice" sub={`${count.toLocaleString('en-GB')} residents${hall === 'All halls' ? ' in every hall' : ` at ${hall}`}, by ${by}.`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={sendNow ? PaperPlaneTilt : Clock} onClick={() => onSchedule(sendNow ? `Today ${time}` : when, { urgent: quiet && urgent, sendNow, pinned: pin ? 'Sat 19 Sep' : undefined })}>{sendNow ? 'Send now' : 'Schedule'}</Button></>}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date"><Select value={date} onChange={(e) => pickDate(e.target.value)}>{['Today', 'Wed 16 Sep', 'Thu 17 Sep', 'Fri 18 Sep'].map((d) => <option key={d}>{d}</option>)}</Select></Field>
        <Field label="Time" hint={date === 'Today' ? `It’s ${NOW_TIME} now` : undefined}><Select value={time} onChange={(e) => setTime(e.target.value)}>{TIMES.map((t) => <option key={t} disabled={past(date, t)}>{t}</option>)}</Select></Field>
      </div>
      <CheckBox checked={pin} onChange={setPin} label="Pin it on the resident portal until Sat 19 Sep" />
      {quiet ? (
        <>
          <Note tone="amber" icon={Moon} title={`${time} is inside quiet hours (21:00–08:00)`}>{urgent ? 'It goes at once, marked urgent. Your name and the reason are recorded.' : 'It will go at 08:00 the next morning. Mark it urgent to send now.'}</Note>
          <ToggleRow title="Urgent · send in quiet hours" sub="Only for safety and service outages" checked={urgent} onChange={setUrgent} />
        </>
      ) : <Note tone="blue" icon={Moon} title="Quiet hours are 21:00–08:00">Only urgent notices go out then.</Note>}
    </Modal>
  );
}

/* ---------------- Report: 3017 (sent) and the scheduled view ---------------- */
const notOpened = [['Leo Grant', 'G.02.B', 'Sat 10:00'], ['Hana Sato', 'G.05.A', 'Sat 12:00'], ['Ravi Mehta', 'F.01.A', 'Sat 14:00'], ['Chloé Martin', 'F.03.B', 'Sun 10:00'], ['Tunde Bello', 'S.04.A', 'Sun 12:00']];
/* Sent and scheduled notices open in a side sheet over the list (was a full page). */
function NoticeSheet({ n, onClose , nav: sheetNav }: { nav?: SheetNav;  n: Notice; onClose: () => void }) {
  const nav = useNavigate();
  const { update, patch } = useRms();
  const { log } = useDb();
  const once = useOnce();
  const [remind, setRemind] = useState(false);
  const short = n.title.split(':')[0];
  const opened = Math.round((n.count * (n.opened ?? 0)) / 100);
  const unopened = n.count - opened;
  const by = [n.channels.email && 'email', n.channels.portal && 'resident portal', n.channels.sms && 'SMS'].filter(Boolean).join(' and ');
  const dup = () => once(() => {
    const id = `nn${Date.now().toString(36)}`;
    patch('notices', (ns) => [{ ...n, id, title: `${n.title} (copy)`, status: 'Draft', opened: undefined, when: undefined, urgent: undefined }, ...ns]);
    toast.success('Duplicated as a draft');
    nav(`/residents/notices/${id}`);
  });
  const sendNow = () => once(() => {
    const undo = update('notices', n.id, { status: 'Sent', when: 'Today, 11:20', opened: n.id === 'n1' ? 70 : 0 });
    log(`sent “${n.title}”`, 'Residents');
    undoToast(`Sent to ${n.count.toLocaleString('en-GB')} residents`, undo);
  });
  const scheduled = n.status === 'Scheduled';
  const message = (
    <SheetSection title="Message">
      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{preview(n.body).replace(/\u0001/g, '')}</div>
    </SheetSection>
  );
  const clicks = n.id === 'n1' ? 63 : Math.round(opened * 0.3);
  return (
    <>
      <Sheet open onClose={onClose} nav={sheetNav} width={560} title="Notice"
        footer={scheduled
          ? <><Button variant="ghost" className="mr-auto" onClick={() => { update('notices', n.id, { status: 'Draft' }); toast('Unscheduled · back in Drafts'); nav(`/residents/notices/${n.id}`); }}>Edit</Button><Button onClick={onClose}>Close</Button><Button variant="primary" icon={PaperPlaneTilt} onClick={sendNow}>Send now</Button></>
          : <><Button variant="ghost" className="mr-auto" onClick={dup}>Duplicate</Button><Button onClick={onClose}>Close</Button><Button variant="primary" icon={PaperPlaneTilt} disabled={!unopened} onClick={() => setRemind(true)}>Send a reminder</Button></>}>
        <SheetHero avatar={false} name={n.title} meta={`${scheduled ? `Sends ${n.when}` : `Sent ${n.when}`} · ${n.audience}`}>
          {statusPill(n)}{n.urgent && <Pill tone="red">Urgent</Pill>}
        </SheetHero>
        {scheduled && (
          <div className="mb-5"><Note tone="blue" icon={Clock} title="The audience stays live">{n.count.toLocaleString('en-GB')} match today; new matches before it sends get it too.{n.pinned && ` Pinned on the portal until ${n.pinned}.`}</Note></div>
        )}
        <SheetSection title="Details" rows={[['Sent by', by], ...(n.urgent ? [['Urgent', 'Marked by Priya Shah'] as [string, string]] : []), ['Audience', `${n.audience} · ${n.count.toLocaleString('en-GB')}`]]} />
        {!scheduled && (
          <>
            <SheetSection title="Delivery">
              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                {([['Delivered', n.count.toLocaleString('en-GB'), '100%'], ['Opened', opened.toLocaleString('en-GB'), `${n.opened ?? 0}%`], [n.id === 'n1' ? 'Bedding packs ordered' : 'Clicked a link', clicks, 'from the link'], ['Bounced', 0, '']] as const).map(([l, v, sub]) => (
                  <div key={l}><div className="text-sm text-[#646A78]">{l}</div><div className="flex items-baseline gap-2 mt-1"><span className="text-xl font-semibold tracking-tight">{v}</span>{sub && <span className="text-xs text-[#646A78]">{sub}</span>}</div></div>
                ))}
              </div>
            </SheetSection>
            <SheetSection title="Not opened">
              {unopened > 0 && <div className="mb-2 flex items-center justify-between"><span className="text-sm text-ink">{unopened.toLocaleString('en-GB')} residents</span><Button size="sm" icon={ChatText} onClick={() => setRemind(true)}>Remind by SMS</Button></div>}
              {unopened > 0 ? (
                <div className="divide-y divide-[#F3F4F6]">
                  {notOpened.map(([nm, rm, ar]) => (
                    <div key={nm} className="h-10 flex items-center gap-3 text-sm">
                      <span className="flex-1 min-w-0 truncate text-[#111827]">{nm}</span>
                      <span className="w-16 text-[#646A78]">{rm}</span>
                      <span className="w-20 text-[#646A78]">{ar}</span>
                      <Envelope size={14} className="text-[#646A78]" aria-label="Delivered, not opened" />
                    </div>
                  ))}
                  {unopened > notOpened.length && <div className="h-10 flex items-center text-sm text-[#646A78]">and {(unopened - notOpened.length).toLocaleString('en-GB')} more</div>}
                </div>
              ) : <div className="text-sm text-[#646A78]">Everyone has opened it.</div>}
            </SheetSection>
          </>
        )}
        {message}
      </Sheet>
      <Modal open={remind} onClose={() => setRemind(false)} title="Send a reminder" sub={`To the ${unopened.toLocaleString('en-GB')} residents who haven’t opened it yet.`}
        footer={<><Button onClick={() => setRemind(false)}>Cancel</Button><Button variant="primary" icon={PaperPlaneTilt} onClick={() => once(() => { setRemind(false); log(`sent a reminder for “${n.title}”`, 'Residents'); toast.success(`Reminder sent to ${unopened.toLocaleString('en-GB')} residents by SMS`); })}>Send reminder</Button></>}>
        <Field label="SMS"><Textarea rows={3} defaultValue={`Durham Residences: ${short}. Read it in your email or the resident portal.`} /></Field>
        <DL rows={[['Cost', `About £${(unopened * 0.04).toFixed(2)} · 4p a message`]]} />
      </Modal>
    </>
  );
}
