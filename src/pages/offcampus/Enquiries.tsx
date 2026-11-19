import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowSquareOut, DownloadSimple, Tray, XCircle } from '../../components/icons';
import { toast } from 'sonner';
import { PersonName, Avatar, Button, Dialog, PageHeader, SearchInput, SelectFilter, Sheet, SheetHero, SheetRow, SheetSection, Table, Tabs, Textarea, PIN, listNav } from '../../components/ui';
import { useOpen, useTab } from '../hooks';
import { enquiryStatus, stamp, useOc, type Enquiry, type EnquiryStatus } from '../../data/offcampus';
import { EmptyArt, Tag, Title } from './parts';
import { LineTabs } from '../inventory/common';

type TabId = 'all' | 'hmo' | 'pbsa';
type StatusView = EnquiryStatus | 'All';
const STATUS_TONE = { New: 'blue', Replied: 'green', Closed: 'grey' } as const;
const StatusTag = ({ s }: { s: EnquiryStatus }) => <Tag tone={STATUS_TONE[s]}>{s}</Tag>;

export function Enquiries() {
  const all = useOc((s) => s.enquiries);
  const hmos = useOc((s) => s.hmos);
  const set = useOc((s) => s.set);
  const live = useOc((s) => !!s.portal.liveSince);
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const empty = sp.get('demo') === 'empty';
  const list = empty ? [] : all;
  const [tab, setTab] = useTab<TabId>('all');
  /* Status opens on All (2026-11-18). */
  const [status, setStatus] = useState<StatusView>('All');
  const [open, setOpen] = useOpen();
  const [replying, setReplying] = useState<Enquiry | null>(null);
  const busy = useRef(false);
  const [q, setQ] = useState('');
  const t = q.trim().toLowerCase();
  const bySource = list.filter((e) => tab === 'all' || (tab === 'hmo' ? e.source === 'Landlord' : e.source === 'Partner halls'));
  const rows = bySource.filter((e) => (status === 'All' || enquiryStatus(e) === status)
    && (!t || [e.student, e.email, e.phone, e.property].some((x) => x.toLowerCase().includes(t))));
  const sel = list.find((e) => e.id === open) ?? null;
  const landlordOf = (e: Enquiry) => hmos.find((h) => h.title === e.property)?.landlord;
  const nStatus = (s: EnquiryStatus) => bySource.filter((e) => enquiryStatus(e) === s).length;

  const update = (id: string, status: EnquiryStatus, t: string) =>
    set('enquiries', (es) => es.map((e) => (e.id === id ? { ...e, status, history: [{ t, when: stamp() }, ...(e.history ?? [])] } : e)));
  const setStatusOf = (e: Enquiry, next: EnquiryStatus, t: string, msg: string) => {
    const prev = e;
    update(e.id, next, t);
    toast.success(msg, { action: { label: 'Undo', onClick: () => set('enquiries', (es) => es.map((x) => (x.id === prev.id ? prev : x))) } });
  };
  const forward = (e: Enquiry) => {
    const who = landlordOf(e) ?? 'the landlord';
    update(e.id, enquiryStatus(e) === 'New' ? 'Replied' : enquiryStatus(e), `Forwarded to ${who}`);
    toast.success(`Forwarded to ${who}`, { description: `${e.student}’s enquiry about ${e.property}. ${who.split(' ')[0]} replies to them directly.` });
  };

  const exportCsv = () => {
    if (busy.current) return;
    busy.current = true; setTimeout(() => { busy.current = false; }, 600);
    if (!rows.length) { toast.error('Nothing to export', { description: 'There are no enquiries in this view.' }); return; }
    const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = ['Resident,Email,Phone,Property,Source,Status,Move-in,Received,Message', ...rows.map((e) => [e.student, e.email, e.phone, e.property, e.source, enquiryStatus(e), e.moveIn, e.received, e.message ?? ''].map(q).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `enquiries-${tab === 'all' ? 'all' : tab === 'hmo' ? 'hmo' : 'amber-pbsa'}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success('CSV downloaded', { description: `${rows.length} ${rows.length === 1 ? 'enquiry' : 'enquiries'} · ${tab === 'all' ? 'All sources' : tab === 'hmo' ? 'Landlord' : 'Partner halls'}` });
  };

  return (
    <>
      <PageHeader icon={Tray} crumbs={['Off-campus']} title="Enquiries">
        <Button icon={DownloadSimple} onClick={exportCsv}>Export CSV</Button>
      </PageHeader>
      <div className="flex-1 min-h-0 flex flex-col">
        <Title title="Enquiries" />
        {/* Search on the left; the status picker and the source tabs at the right edge. */}
        {list.length > 0 && (<div {...PIN} className="px-[var(--tx,16px)] pt-6 pb-4 flex items-center gap-3 empty:hidden">
          <div className="w-[260px] min-w-[140px] shrink [&>label]:!w-full"><SearchInput value={q} onChange={setQ} placeholder="Search name, contact or property" /></div>
          <div className="ml-auto flex items-center gap-2">
            {!!list.length && <SelectFilter prefix="Status" value={status} onChange={(v) => setStatus(v as StatusView)} width={200}
              options={[{ value: 'All', meta: String(bySource.length) }, { value: 'New', meta: String(nStatus('New')) }, { value: 'Replied', meta: String(nStatus('Replied')) }, { value: 'Closed', meta: String(nStatus('Closed')) }]} />}
            <Tabs value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All', count: list.length }, { id: 'hmo', label: 'Landlord', count: list.filter((e) => e.source === 'Landlord').length }, { id: 'pbsa', label: 'Partner halls', count: list.filter((e) => e.source === 'Partner halls').length }]} />
          </div>
        </div>)}
        {!list.length ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
            <EmptyArt art="enquiries" />
            <div className="text-base leading-6 font-medium mt-5">No enquiries yet</div>
            <p className="text-sm text-gray-500 mt-1 max-w-[430px]">
              {live ? 'Residents’ questions from the site land here.' : 'Questions arrive once the site is published.'}
            </p>
            <div className="mt-4"><Button icon={ArrowSquareOut} onClick={() => nav('/offcampus/portal/site')}>{live ? 'Open the site' : 'Open the draft site'}</Button></div>
          </div>
        ) : (
          <Table<Enquiry> fill rows={rows} onRow={(e) => setOpen(e.id)} selected={open ?? undefined}
            empty={<div className="py-16 text-center text-sm text-gray-500">{t ? 'No enquiry matches that search.' : status === 'New' ? 'Every enquiry has an answer.' : `No ${status === 'All' ? '' : status.toLowerCase() + ' '}enquiries from this source.`}</div>}
            cols={[
              { key: 's', label: 'Resident', render: (e) => <span className="flex items-center gap-2.5 min-w-0"><Avatar name={e.student} size={28} /><span className="font-medium truncate">{e.student}</span></span> },
              { key: 'c', label: 'Contact', render: (e) => <div className="leading-5 py-2"><div className="truncate">{e.email}</div><div className="text-xs text-gray-500">{e.phone}</div></div> },
              { key: 'p', label: 'Property', render: (e) => e.property },
              { key: 'o', label: 'Source', render: (e) => e.source },
              { key: 'st', label: 'Status', render: (e) => <StatusTag s={enquiryStatus(e)} /> },
              { key: 'm', label: 'Move-in', render: (e) => e.moveIn },
              { key: 'r', label: 'Received', render: (e) => <span className="text-gray-500">{e.received}</span> },
            ]} />
        )}
      </div>

      {/* The enquiry: the resident's question, who they are, and what has happened to it. */}
      <Sheet open={!!sel} onClose={() => setOpen(null)} title="Enquiry" nav={sel ? listNav(rows, (e) => e.id === sel.id, (e) => setOpen(e.id)) : undefined}
        onDelete={sel && enquiryStatus(sel) !== 'Closed' ? { label: 'Close enquiry', icon: XCircle, onClick: () => setStatusOf(sel, 'Closed', 'Closed', `${sel.student}’s enquiry closed`) } : undefined}
        footer={sel && (enquiryStatus(sel) === 'Closed'
          ? <Button icon={null} className="ml-auto" onClick={() => setStatusOf(sel, 'New', 'Reopened', `${sel.student}’s enquiry reopened`)}>Reopen</Button>
          : <>
            {sel.source === 'Landlord' && <Button icon={null} className="ml-auto" onClick={() => forward(sel)}>Forward to landlord</Button>}
            <Button variant="primary" icon={null} className={sel.source === 'Landlord' ? undefined : 'ml-auto'} onClick={() => setReplying(sel)}>Reply</Button>
          </>)}>
        {sel && <EnquiryDetail e={sel} landlord={landlordOf(sel)} />}
      </Sheet>

      {replying && <ReplyDialog e={replying} onClose={() => setReplying(null)} onSend={() => {
        const e = replying;
        update(e.id, 'Replied', 'Reply sent');
        setReplying(null);
        toast.success(`Reply sent to ${e.student}`, { description: e.email });
      }} />}
    </>
  );
}

/* Enquiry panel (Figma "Side panel · Enquiry" 4073:17186): Overview (message, details) and Activity. */
const groupOf = (id: string) => 1 + ([...id].reduce((n, c) => n + c.charCodeAt(0), 0) % 5);
function EnquiryDetail({ e, landlord }: { e: Enquiry; landlord?: string }) {
  const [tab, setTab] = useState<'overview' | 'activity'>('overview');
  useEffect(() => setTab('overview'), [e.id]);
  const group = groupOf(e.id);
  const activity = [
    ...(e.history ?? []).map((h) => ({ who: 'Arjun Mehta', t: h.t, when: h.when })),
    { who: e.student, t: `${e.student} sent an enquiry`, when: e.received },
  ];
  return (
    <>
      <SheetHero name={e.student} meta={`${e.email} · ${e.phone}`} facts={[['Property', e.property], ['Move-in', e.moveIn], ['Group', group === 1 ? '1 student' : `${group} students`]]}>
        <StatusTag s={enquiryStatus(e)} />
      </SheetHero>
      <div className="-mx-5 mb-5">
        <LineTabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'activity', label: 'Activity' }]} />
      </div>
      {tab === 'overview' && <>
        <SheetSection title="Message">
          <p className="text-sm leading-6 text-[#0A0A0A] whitespace-pre-line">{e.message ?? 'No message, just a request to be contacted.'}</p>
        </SheetSection>
        <SheetSection title="Details" rows={[
          ['Source', e.source],
          ['Property', e.property],
          ...(e.source === 'Landlord' ? [['Landlord', landlord ? <PersonName name={landlord} /> : '—'] as [string, ReactNode]] : []),
          ['Received', e.received],
        ]} />
      </>}
      {tab === 'activity' && (
        <SheetSection title="Activity">
          {activity.map((a, i) => <SheetRow key={i} lead={<Avatar name={a.who} size={24} />} title={a.t} sub={a.when} />)}
        </SheetSection>
      )}
    </>
  );
}

/* Reply in a centred dialog (creation forms open as a modal): the resident's question quoted above a short draft. */
function ReplyDialog({ e, onClose, onSend }: { e: Enquiry; onClose: () => void; onSend: (text: string) => void }) {
  const first = e.student.split(' ')[0];
  const [text, setText] = useState(`Hi ${first},\n\nThanks for your enquiry about ${e.property}. `);
  const [err, setErr] = useState('');
  const sending = useRef(false);
  const send = () => {
    if (sending.current) return;
    if (text.trim().length < 20) { setErr('Write a little more before sending'); return; }
    sending.current = true;
    onSend(text.trim());
  };
  return (
    <Dialog open onClose={onClose} title={`Reply to ${e.student}`} sub={e.email} width={520}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={send}>Send reply</Button></>}>
      {e.message && <blockquote className="mb-4 border-l-2 border-[#E5E5E5] pl-3 text-sm leading-5 text-[#737373]">{e.message}</blockquote>}
      <Textarea aria-label="Reply" aria-invalid={!!err} rows={7} value={text} onChange={(ev) => { setText(ev.target.value); setErr(''); }} />
      {err && <p role="alert" className="text-xs leading-4 text-[#E0243A] mt-1.5">{err}</p>}
    </Dialog>
  );
}
