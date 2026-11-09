import { useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowSquareOut, DownloadSimple, Tray } from '../../components/icons';
import { toast } from 'sonner';
import { Button, PageHeader, Table, Tabs } from '../../components/ui';
import { useTab } from '../hooks';
import { useOc, type Enquiry } from '../../data/offcampus';
import { EmptyArt, Tag, Title } from './parts';

type TabId = 'all' | 'hmo' | 'pbsa';

export function Enquiries() {
  const all = useOc((s) => s.enquiries);
  const live = useOc((s) => !!s.portal.liveSince);
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const empty = sp.get('demo') === 'empty';
  const list = empty ? [] : all;
  const [tab, setTab] = useTab<TabId>('all');
  const busy = useRef(false);
  const rows = list.filter((e) => tab === 'all' || (tab === 'hmo' ? e.source === 'HMO' : e.source === 'Amber PBSA'));

  const exportCsv = () => {
    if (busy.current) return;
    busy.current = true; setTimeout(() => { busy.current = false; }, 600);
    if (!rows.length) { toast.error('Nothing to export', { description: 'There are no enquiries in this view.' }); return; }
    const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = ['Student,Email,Phone,Property,Source,Move-in,Received', ...rows.map((e) => [e.student, e.email, e.phone, e.property, e.source, e.moveIn, e.received].map(q).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `enquiries-${tab === 'all' ? 'all' : tab === 'hmo' ? 'hmo' : 'amber-pbsa'}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success('CSV downloaded', { description: `${rows.length} ${rows.length === 1 ? 'enquiry' : 'enquiries'} · ${tab === 'all' ? 'All sources' : tab === 'hmo' ? 'HMO' : 'Amber PBSA'}` });
  };

  return (
    <>
      <PageHeader icon={Tray} crumbs={['Off-campus']} title="Enquiries">
        <Button icon={DownloadSimple} onClick={exportCsv}>Export CSV</Button>
      </PageHeader>
      <div className="flex-1 min-h-0 flex flex-col">
        <Title title="Enquiries" />
        <div className="px-[var(--tx,16px)] pb-3 empty:hidden">
          <Tabs value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All', count: list.length }, { id: 'hmo', label: 'HMO', count: list.filter((e) => e.source === 'HMO').length }, { id: 'pbsa', label: 'Amber PBSA', count: list.filter((e) => e.source === 'Amber PBSA').length }]} />
        </div>
        {!list.length ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
            <EmptyArt art="enquiries" />
            <div className="font-semibold mt-5">No enquiries yet</div>
            <p className="text-sm text-gray-500 mt-1 max-w-[430px]">
              {live ? 'Students’ questions from the site arrive here. Nobody has enquired yet.' : 'Students’ questions from the site arrive here once it’s published. The site is still a draft.'}
            </p>
            <div className="mt-4"><Button icon={ArrowSquareOut} onClick={() => nav('/offcampus/portal/site')}>{live ? 'Open the site' : 'Open the draft site'}</Button></div>
          </div>
        ) : (
          <Table<Enquiry> fill rows={rows}
            empty={<div className="py-16 text-center text-sm text-gray-500">No enquiries from this source yet.</div>}
            cols={[
              { key: 's', label: 'Student', render: (e) => <span className="font-medium">{e.student}</span> },
              { key: 'c', label: 'Contact', render: (e) => <div className="leading-5 py-2"><a href={`mailto:${e.email}`} className="hover:underline">{e.email}</a><div className="text-xs text-gray-500">{e.phone}</div></div> },
              { key: 'p', label: 'Property', render: (e) => e.property },
              { key: 'o', label: 'Source', render: (e) => (e.source === 'HMO' ? <Tag tone="green">HMO</Tag> : <Tag tone="blue">Amber PBSA</Tag>) },
              { key: 'm', label: 'Move-in', render: (e) => e.moveIn },
              { key: 'r', label: 'Received', render: (e) => <span className="text-gray-500">{e.received}</span> },
            ]} />
        )}
      </div>
    </>
  );
}
