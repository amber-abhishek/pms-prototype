import { FooterZone } from '../../components/headerCtx';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { FileText, FirstAid, Warning, Wheelchair, type Icon } from '../../components/icons';
import { toast } from 'sonner';
import { Avatar, Button, Dialog, Pill, SheetHero, SheetRow, SheetSection } from '../../components/ui';
import { available, firstName, hallFull, roomTerms, unitsFor, useAlloc, type App, type Req } from '../../data/allocations';
import { St } from './common';
import { LineTabs } from '../inventory/common';
import { useAllocActions } from './actions';

export const statusLabel: Record<App['status'], string> = { review: 'In review', manual: 'Flagged', allocated: 'Allocated', rejected: 'Rejected', waitlist: 'Waitlist', declined: 'Declined' };
const ord = ['1st', '2nd', '3rd'];
export type Pref = { rank: number; hall: string; room: string; sub: string; avail: number; weeks: number };

export function prefsOf(a: App, d: Parameters<typeof available>[0]): Pref[] {
  return a.prefs.map(([hall, room], i) => {
    const t = roomTerms(hall, room);
    return { rank: i + 1, hall, room, weeks: t.weeks, sub: `${room} · ${t.weeks} weeks · £${t.rate}/wk`, avail: stepFree(a) && hall === 'Hild Bede' ? 0 : available(d, hall, room) };
  });
}
const stepFree = (a: App) => a.reqs.includes('Step-free access');
export const bestPref = (ps: Pref[]) => ps.find((p) => p.avail > 0);
export const ordinal = (n: number) => ord[n - 1] ?? `${n}th`;

const DETAIL_TABS = ['Overview', 'Documents', 'Messages', 'Activity'] as const;
type DetailTab = typeof DETAIL_TABS[number];
/** The application (Figma "Side panel · Application" 4073:17179): hero with a status row, Overview / Documents / Messages /
 *  Activity tabs, and the action bar. Used as the split-view detail and inside the Application sheet. */
export function AppDetail({ a, onAllocate, onReject, onAfter }: { a: App; onAllocate: (p: Pref) => void; onReject: () => void; onAfter: () => void }) {
  const d = useAlloc();
  const act = useAllocActions();
  const ps = prefsOf(a, d);
  const best = bestPref(ps);
  const canAct = a.status === 'review' || a.status === 'manual';
  const [tab, setTab] = useState<DetailTab>('Overview');
  const allocateBest = () => (best ? onAllocate(best) : toast.error(`No free unit in any of ${firstName(a.name)}’s choices`, { description: 'Pick a unit from another hall, or add them to the waitlist.' }));
  /* Five tabs instead of one long scroll: the hero stays put, the tab's content scrolls under it. */
  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <div className="shrink-0 px-5 pt-5">
        <SheetHero name={a.name} meta={`${a.year} · Applied ${a.submitted}`}
          tags={<>
            <St s={statusLabel[a.status]} />{a.tag && <Pill tone="amber">{a.tag}</Pill>}
          </>}
          facts={[['1st choice', a.prefs[0]?.[0] ?? a.hall], ['Room type', a.prefs[0]?.[1] ?? a.room], canAct ? ['Waiting', `${a.waiting} ${a.waiting === 1 ? 'day' : 'days'}`, a.waiting >= 5 ? 'amber' : undefined] : ['Fee', a.fee]]} />
      </div>
      <LineTabs value={tab} onChange={setTab} tabs={DETAIL_TABS.map((t) => ({ id: t, label: t }))} />
      <div className="flex-1 overflow-auto px-5 py-5">
        {tab === 'Overview' && <>
          <AppNote a={a} />
          <Preferences ps={ps} />
          {canAct && best && <MatchingUnits a={a} best={best} onAllocate={onAllocate} />}
          {(a.reqs.length > 0 || !!a.toCheck?.length || a.why === 'Under 18 at arrival') && <Requirements a={a} onVerify={(r) => act.verify(a, r)} />}
          <SheetSection title="Applicant" rows={[['Course', a.course], ['Fee status', a.fee], ['Arrival', a.arrival], ['Email', <span className="break-all">{a.email}</span>], ['Guarantee', a.guarantee ? 'Guaranteed' : 'Not guaranteed']]} />
          <RoomAndContract a={a} />
        </>}
        {tab === 'Documents' && <Documents a={a} onVerify={(r) => act.verify(a, r)} />}
        {tab === 'Messages' && <Messages a={a} />}
        {tab === 'Activity' && <Activity a={a} />}
      </div>
      <FooterZone.Provider value><div className="h-16 shrink-0 px-5 flex items-center gap-2 border-t border-line">
        {canAct ? (
          <>
            {/* The two decisions on the right (Reject / Send offer); routing it is a quiet extra on the left. */}
            {a.status === 'review'
              ? <Button variant="ghost" icon={null} className="mr-auto" onClick={() => { act.manual(a); onAfter(); }}>Flag</Button>
              : <Button variant="ghost" icon={null} className="mr-auto" onClick={() => act.toQueue(a)}>Back to To review</Button>}
            <Button icon={null} onClick={onReject}>Reject</Button>
            <Button variant="primary" icon={null} onClick={allocateBest}>Send offer</Button>
          </>
        ) : a.status === 'allocated' ? (
          <>
            <span className="text-xs text-gray-500">Allocated {a.unit} · by {a.allocBy} on {a.allocOn}</span>
            <div className="ml-auto"><Link to="/allocations/offers?tab=Open"><Button>View offer</Button></Link></div>
          </>
        ) : a.status === 'rejected' ? (
          <>
            <span className="text-xs text-gray-500">Rejected · {a.reason}</span>
            <div className="ml-auto"><Button onClick={() => act.toQueue(a)}>Reopen</Button></div>
          </>
        ) : (
          <>
            <span className="text-xs text-gray-500">{a.status === 'waitlist' ? 'On the waitlist · offered the next unit that frees up' : 'Declined the offer'}</span>
            <div className="ml-auto"><Link to="/allocations/offers?tab=Waitlist"><Button>Open waitlist</Button></Link></div>
          </>
        )}
      </div></FooterZone.Provider>
    </div>
  );
}

/* ---------- pieces ---------- */
function AppNote({ a }: { a: App }) {
  if (stepFree(a)) return <Callout icon={Wheelchair} title="Needs a ground-floor or lift-access room" sub="Verified by Disability Support, 20 Oct" />;
  if (a.tag === 'No study offer') return <Callout icon={Warning} title="No offer to study at Durham" sub="UCAS checked 27 Oct" />;
  if (a.toCheck?.length) return <Callout icon={FirstAid} title="Medical evidence to check" sub="GP note uploaded" />;
  if (a.why) return <Callout icon={Warning} title={a.why} sub="Left out of auto-allocate" />;
  return null;
}
function Callout({ icon: I, title, sub }: { icon: Icon; title: string; sub: string }) {
  return (
    <div className="rounded-lg border border-[#C47A00]/35 bg-white px-3.5 py-2.5 flex gap-2.5 mb-5">
      <I size={16} className="shrink-0 mt-0.5 text-[#C47A00]" />
      <div><div className="text-sm font-medium text-[#9A5B00]">{title}</div><div className="text-xs text-gray-500 mt-0.5">{sub}</div></div>
    </div>
  );
}

function Preferences({ ps }: { ps: Pref[] }) {
  return (
    <SheetSection title={`Preferences · ${ps.length}`}>
      {ps.map((p) => (
        <SheetRow key={p.rank} title={`${p.rank} · ${hallFull[p.hall]}`} sub={`${p.room} · ${p.avail ? `${p.avail} free` : 'full'}`}
          end={p.avail ? <Pill tone="green">{`${p.avail} match`}</Pill> : <Pill tone="red">Full</Pill>} />
      ))}
    </SheetSection>
  );
}
/** The best choice's free units: the top three, each one click from the allocate sheet. */
function MatchingUnits({ a, best, onAllocate }: { a: App; best: Pref; onAllocate: (p: Pref) => void }) {
  const d = useAlloc();
  const units = unitsFor(d, a, best.hall, best.room);
  if (!units.length) return null;
  return (
    <SheetSection title={`Matching units · ${units.length}`}>
      {units.slice(0, 3).map((u) => <SheetRow key={u.code} title={u.code} sub={`${u.where} · ${best.room}`} end={<Button size="sm" icon={null} onClick={() => onAllocate(best)}>Allocate</Button>} />)}
    </SheetSection>
  );
}

function RoomAndContract({ a }: { a: App }) {
  const t = roomTerms(a.hall, a.room);
  const words = a.ref === '11873' ? '“I use a wheelchair on some days, so a lift or a ground-floor room matters more to me than which college.”'
    : a.tag === 'No study offer' ? '“I’m waiting on my clearing place and hope to hear this week.”' : a.why ? `“${a.why}.”` : null;
  return (
    <SheetSection title="Room and contract" rows={[
      ['Room type', a.room === 'Accessible ensuite' ? 'Ensuite or better' : a.room],
      ['Contract', t.weeks === 51 ? '51 weeks' : '44 weeks, term time'],
      ['Budget', `Up to £${t.rate + 8}/wk`],
      ['Catering', a.hall === 'Hild Bede' ? 'Catered' : 'Self-catered'],
      ['Living with', a.why === 'Asks to live with a sibling' ? 'A sibling' : 'No request'],
      ...(words ? [[`In ${firstName(a.name)}’s words`, <span className="text-gray-700">{words}</span>] as [string, ReactNode]] : []),
    ]} />
  );
}

function reqRows(a: App) {
  const st = (r: Req) => (a.toCheck?.includes(r) ? 'check' : a.reqs.includes(r) ? 'ok' : 'none');
  return [
    { r: 'Step-free access' as Req, sub: a.reqs.includes('Step-free access') ? 'Disability Support, 20 Oct' : 'Not requested', s: st('Step-free access') },
    { r: 'Medication fridge' as Req, sub: a.reqs.includes('Medication fridge') ? 'GP note, 19 Oct' : 'Not requested', s: st('Medication fridge') },
    { r: 'Year-round stay' as Req, sub: a.reqs.includes('Year-round stay') ? 'Care leaver · Resident Support' : 'Not requested', s: st('Year-round stay') },
  ];
}
function ReqPill({ s, onCheck }: { s: string; onCheck?: () => void }) {
  if (s === 'ok') return <Pill tone="green">Verified</Pill>;
  if (s === 'met') return <Pill tone="green">Met</Pill>;
  if (s === 'check') return <button type="button" title="Mark as verified" onClick={onCheck}><Pill tone="amber">To check</Pill></button>;
  return <span className="text-xs text-gray-500">None</span>;
}
function Requirements({ a, onVerify }: { a: App; onVerify: (r: Req) => void }) {
  return (
    <SheetSection title="Requirements">
      {reqRows(a).map((x) => <SheetRow key={x.r} title={x.r} sub={x.sub} end={<ReqPill s={x.s} onCheck={() => onVerify(x.r)} />} />)}
      <SheetRow title="Age at arrival" sub={a.why === 'Under 18 at arrival' ? '17 on 19 Sep 2027 · guardian form needed' : '19 on 19 Sep 2027'}
        end={a.why === 'Under 18 at arrival' ? <Pill tone="amber">To check</Pill> : <ReqPill s="met" />} />
    </SheetSection>
  );
}

type Doc = { name: string; meta: string; s: 'ok' | 'check' | 'missing'; req?: Req };
function docsOf(a: App): Doc[] {
  const out: Doc[] = [];
  if (stepFree(a)) out.push({ name: 'Disability Support letter', meta: `PDF · 182 KB · ${a.submitted}`, s: 'ok' });
  if (a.reqs.includes('Medication fridge')) out.push({ name: 'GP note — medication fridge', meta: 'PDF · 96 KB · 19 Oct', s: a.toCheck?.includes('Medication fridge') ? 'check' : 'ok', req: 'Medication fridge' });
  out.push({ name: 'Passport', meta: `JPG · 1.2 MB · ${a.submitted}`, s: 'ok' });
  out.push(a.tag === 'No study offer' ? { name: 'Offer letter', meta: 'Not uploaded', s: 'missing' } : { name: `Offer letter · ${a.course === '—' ? 'course' : a.course}`, meta: `PDF · 240 KB · ${a.submitted}`, s: 'ok' });
  return out;
}
function Documents({ a, onVerify }: { a: App; onVerify: (r: Req) => void }) {
  const docs = docsOf(a);
  const [view, setView] = useState<Doc | null>(null);
  return (
    <SheetSection title={`Documents · ${docs.length}`}>
      {docs.map((x) => (
        <SheetRow key={x.name} title={x.name} sub={x.s === 'missing' ? 'Not uploaded' : `Uploaded ${x.meta.split(' · ').pop()}`} onClick={x.s === 'missing' ? undefined : () => setView(x)}
          end={x.s === 'ok' ? <Pill tone="green">Checked</Pill> : x.s === 'check' ? <Pill tone="orange">To review</Pill> : <Pill tone="red">Missing</Pill>} />
      ))}
      <Dialog open={!!view} onClose={() => setView(null)} title={view?.name ?? ''} width={560}
        footer={view && <><Button onClick={() => setView(null)}>Close</Button>{view.s === 'check' && view.req && <Button variant="primary" icon={null} onClick={() => { onVerify(view.req!); setView(null); }}>Mark verified</Button>}</>}>
        <div className="rounded-lg border border-line bg-[#FAFAFA] h-72 flex flex-col items-center justify-center text-gray-400 gap-2"><FileText size={40} weight="duotone" /><span className="text-sm">{view?.meta}</span></div>
      </Dialog>
    </SheetSection>
  );
}

/* Prototype dummy thread per application: the applicant's note, then the team's reply. */
function Messages({ a }: { a: App }) {
  const first = firstName(a.name);
  const msgs = [
    { who: a.name, when: a.submitted, t: a.reqs.length ? 'Hi, I’ve added a note about what I need from my room. Is there anything else you need?' : 'Hi, just checking my application came through. Is there anything else you need from me?' },
    { who: 'Arjun Mehta', when: a.opened ? '27 Oct' : a.submitted, t: `Thanks ${first}, that’s all we need. We’ll be in touch once rooms are offered.` },
  ];
  return (
    <SheetSection title={`Messages · ${msgs.length}`}>
      {msgs.map((m, i) => (
        <div key={i} className="py-3 border-t border-[#EBEBEB] first:border-t-0 first:pt-0 last:pb-0">
          <div className="flex items-baseline gap-2"><span className="text-sm font-medium text-[#0A0A0A]">{m.who}</span><span className="text-[13px] text-[#737373]">{m.when}</span></div>
          <p className="mt-1 text-sm leading-5 text-[#0A0A0A]">{m.t}</p>
        </div>
      ))}
    </SheetSection>
  );
}

function Activity({ a }: { a: App }) {
  type E = { who: string; t: string; when: string; sub?: string };
  const items: E[] = [
    ...(a.log ?? []).map((l) => ({ who: l.t.match(/\bby ([A-Z][a-z]+ [A-Z][a-z]+)/)?.[1] ?? 'System', t: l.t, when: l.when, sub: l.sub })),
    ...(a.opened ? [{ who: 'Arjun Mehta', t: 'Arjun Mehta opened the application', when: '27 Oct, 10:42' }] : []),
    ...(a.tag ? [{ who: 'System', t: `Auto-allocate skipped ${firstName(a.name)}`, when: '22 Oct, 02:00', sub: a.tag === 'Requirements' ? 'Step-free requirement' : a.tag === 'No study offer' ? 'No study offer' : 'Flagged' }] : []),
    ...(stepFree(a) ? [{ who: 'Disability Support', t: 'Disability Support verified step-free access', when: '20 Oct, 15:18' }] : []),
    ...(a.reqs.includes('Medication fridge') ? [{ who: a.name, t: `${a.name} uploaded a GP note`, when: '19 Oct, 09:05' }] : []),
    { who: a.name, t: `${a.name} applied with ${a.prefs.length} ${a.prefs.length === 1 ? 'choice' : 'choices'}`, when: `${a.submitted}, 21:37` },
  ];
  return (
    <SheetSection title="Activity">
      {items.map((e, i) => <SheetRow key={i} lead={<Avatar name={e.who} size={24} />} title={e.t} sub={`${e.when}${e.sub ? ` · ${e.sub}` : ''}`} />)}
    </SheetSection>
  );
}
