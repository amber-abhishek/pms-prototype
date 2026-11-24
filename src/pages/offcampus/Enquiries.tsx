import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowSquareOut, DownloadSimple, Tray } from '../../components/icons';
import { toast } from 'sonner';
import { PersonName, Avatar, Button, PageHeader, SearchInput, SelectFilter, Sheet, SheetHero, SheetRow, SheetSection, Table, Tabs, PIN, listNav } from '../../components/ui';
import { useOpen } from '../hooks';
import { enquiryStatus, useOc, type Enquiry, type EnquiryStatus } from '../../data/offcampus';
import { EmptyArt, Tag, Title } from './parts';
import { LineTabs } from '../inventory/common';

type SourceView = 'All' | 'Owners' | 'Partners';
/* Tabs are All / New only (2026-11-23): with no actions in the panel, Replied and Closed were just archive views. */
type StatusView = 'All' | 'New';
const STATUS_TONE = { New: 'blue', Replied: 'green', Closed: 'grey' } as const;
const StatusTag = ({ s }: { s: EnquiryStatus }) => <Tag tone={STATUS_TONE[s]}>{s}</Tag>;

/* Stored sources stay 'Landlord' / 'Partner halls'; on screen they read Owners / Partners (2026-11-23). */
const srcLabel = (s: Enquiry['source']) => (s === 'Landlord' ? 'Owners' : 'Partners');

export function Enquiries() {
  const all = useOc((s) => s.enquiries);
  const hmos = useOc((s) => s.hmos);
  const live = useOc((s) => !!s.portal.liveSince);
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const empty = sp.get('demo') === 'empty';
  const list = empty ? [] : all;
  /* 2026-11-23: status is the tabs (so the table drops its Status column); source is a filter. Both open on All. */
  const [status, setStatus] = useState<StatusView>('All');
  const [source, setSource] = useState<SourceView>('All');
  const [open, setOpen] = useOpen();
  const busy = useRef(false);
  const [q, setQ] = useState('');
  const t = q.trim().toLowerCase();
  const bySource = list.filter((e) => source === 'All' || srcLabel(e.source) === source);
  const rows = bySource.filter((e) => (status === 'All' || enquiryStatus(e) === status)
    && (!t || [e.student, e.email, e.phone, e.property].some((x) => x.toLowerCase().includes(t))));
  const sel = list.find((e) => e.id === open) ?? null;
  const landlordOf = (e: Enquiry) => hmos.find((h) => h.title === e.property)?.landlord;
  const nStatus = (s: EnquiryStatus) => bySource.filter((e) => enquiryStatus(e) === s).length;

  const exportCsv = () => {
    if (busy.current) return;
    busy.current = true; setTimeout(() => { busy.current = false; }, 600);
    if (!rows.length) { toast.error('Nothing to export', { description: 'There are no enquiries in this view.' }); return; }
    const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = ['Resident,Email,Phone,Property,Source,Status,Move-in,Received,Message', ...rows.map((e) => [e.student, e.email, e.phone, e.property, srcLabel(e.source), enquiryStatus(e), e.moveIn, e.received, e.message ?? ''].map(q).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `enquiries-${source.toLowerCase()}${status === 'All' ? '' : `-${status.toLowerCase()}`}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success('CSV downloaded', { description: `${rows.length} ${rows.length === 1 ? 'enquiry' : 'enquiries'} · ${source === 'All' ? 'All sources' : source}${status === 'All' ? '' : ` · ${status}`}` });
  };

  return (
    <>
      <PageHeader icon={Tray} crumbs={['Off-campus']} title="Enquiries">
        <Button icon={DownloadSimple} onClick={exportCsv}>Export CSV</Button>
      </PageHeader>
      <div className="flex-1 min-h-0 flex flex-col">
        <Title title="Enquiries" />
        {/* Status tabs lead on the left (underline tabs, 2026-11-24); search and the source filter at the right edge. */}
        {list.length > 0 && (<div {...PIN} className="px-[var(--tx,16px)] py-4 flex items-center gap-3 empty:hidden">
          <Tabs value={status} onChange={setStatus} tabs={[{ id: 'All', label: 'All', count: bySource.length }, { id: 'New', label: 'New', count: nStatus('New') }]} />
          <div className="ml-auto flex items-center gap-2">
            <div className="w-[260px] min-w-[140px] shrink [&>label]:!w-full"><SearchInput value={q} onChange={setQ} placeholder="Search name, contact or property" /></div>
            <SelectFilter prefix="Source" value={source} onChange={(v) => setSource(v as SourceView)} width={200}
              options={[{ value: 'All', meta: String(list.length) }, { value: 'Owners', meta: String(list.filter((e) => e.source === 'Landlord').length) }, { value: 'Partners', meta: String(list.filter((e) => e.source === 'Partner halls').length) }]} />
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
            empty={<div className="py-16 text-center text-sm text-gray-500">{t ? 'No enquiry matches that search.' : status === 'New' ? 'Every enquiry has an answer.' : 'No enquiries from this source.'}</div>}
            cols={[
              { key: 's', label: 'Resident', render: (e) => <span className="flex items-center gap-2.5 min-w-0"><Avatar name={e.student} size={28} /><span className="font-medium truncate">{e.student}</span></span> },
              { key: 'c', label: 'Contact', render: (e) => <div className="leading-5 py-2"><div className="truncate">{e.email}</div><div className="text-xs text-gray-500">{e.phone}</div></div> },
              { key: 'p', label: 'Property', render: (e) => e.property },
              { key: 'o', label: 'Source', render: (e) => srcLabel(e.source) },
              { key: 'm', label: 'Move-in', render: (e) => e.moveIn },
              { key: 'r', label: 'Received', render: (e) => <span className="text-gray-500">{e.received}</span> },
            ]} />
        )}
      </div>

      {/* The enquiry: the resident's question, who they are, and what has happened to it. Read-only, no actions (2026-11-23). */}
      <Sheet open={!!sel} onClose={() => setOpen(null)} title="Enquiry" nav={sel ? listNav(rows, (e) => e.id === sel.id, (e) => setOpen(e.id)) : undefined}>
        {sel && <EnquiryDetail e={sel} landlord={landlordOf(sel)} />}
      </Sheet>

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
          ['Source', srcLabel(e.source)],
          ['Property', e.property],
          ['Received', e.received],
          ...(e.source === 'Landlord' ? [['Owner', landlord ? <PersonName name={landlord} /> : '—'] as [string, ReactNode]] : []),
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

