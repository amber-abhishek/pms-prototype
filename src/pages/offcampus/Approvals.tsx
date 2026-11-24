import { useSearchParams } from 'react-router-dom';
import { ClipboardText } from '../../components/icons';
import { PageHeader } from '../../components/ui';
import { useOc } from '../../data/offcampus';
import { Landlords } from './Landlords';
import { Reviews } from './Reviews';
import { StatusTabsBar, Title } from './parts';

type Kind = 'owners' | 'listings';

/** Approvals (2026-11-19): owner applications and listing reviews are both approval queues, so they share one page.
 *  Layout = Figma 4159:17532 "V3" (2026-11-23): Owners / Listings are underline tabs (counts = waiting on you); each queue
 *  then has its own toolbar (search, Status and date filters, Needs action / All). `?kind=` picks the queue, `?tab=` its
 *  Needs action / All view, `?open=` the open record. */
export function Approvals() {
  const [sp, setSp] = useSearchParams();
  const kind: Kind = sp.get('kind') === 'listings' ? 'listings' : 'owners';
  const waitingLandlords = useOc((s) => s.landlords.filter((l) => l.status === 'Submitted').length);
  const waitingListings = useOc((s) => s.reviews.filter((r) => r.status === 'Under review').length);
  const pick = (k: Kind) => setSp((p) => { const n = new URLSearchParams(p); n.set('kind', k); n.delete('tab'); n.delete('open'); return n; }, { replace: true });
  return (
    <>
      <PageHeader icon={ClipboardText} crumbs={['Off-campus']} title="Approvals" />
      <div className="flex-1 min-h-0 flex flex-col">
        <Title title="Approvals" />
        <StatusTabsBar value={kind} onChange={pick} tabs={[{ id: 'owners', label: 'Owners', count: waitingLandlords }, { id: 'listings', label: 'Listings', count: waitingListings }]} />
        {kind === 'listings' ? <Reviews key="listings" bare /> : <Landlords key="owners" bare />}
      </div>
    </>
  );
}
