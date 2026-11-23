import { useSearchParams } from 'react-router-dom';
import { ClipboardText } from '../../components/icons';
import { PageHeader, Tabs } from '../../components/ui';
import { useOc } from '../../data/offcampus';
import { Landlords } from './Landlords';
import { Reviews } from './Reviews';
import { Title } from './parts';

type Kind = 'landlords' | 'listings';

/** Approvals (2026-11-19): landlord applications and listing reviews are both approval queues, so they share one page.
 *  `?kind=` picks the queue; each keeps its own status tabs (`?tab=`) and open record (`?open=`). */
export function Approvals() {
  const [sp, setSp] = useSearchParams();
  const kind: Kind = sp.get('kind') === 'listings' ? 'listings' : 'landlords';
  const waitingLandlords = useOc((s) => s.landlords.filter((l) => l.status === 'Submitted').length);
  const waitingListings = useOc((s) => s.reviews.filter((r) => r.status === 'Under review').length);
  const pick = (k: Kind) => setSp((p) => { const n = new URLSearchParams(p); n.set('kind', k); n.delete('tab'); n.delete('open'); return n; }, { replace: true });
  return (
    <>
      {/* Landlords / Listings is a switch in the header (Figma 4159:17418); the status tabs below are the one row of tabs. */}
      <PageHeader icon={ClipboardText} crumbs={['Off-campus']} title="Approvals">
        <div className="[&_[role=tablist]]:!bg-[#EBEBEB]"><Tabs value={kind} onChange={pick} tabs={[{ id: 'landlords', label: 'Landlords', count: waitingLandlords || undefined }, { id: 'listings', label: 'Listings', count: waitingListings || undefined }]} /></div>
      </PageHeader>
      <div className="flex-1 min-h-0 flex flex-col">
        <Title title="Approvals" />
        {kind === 'listings' ? <Reviews bare /> : <Landlords bare />}
      </div>
    </>
  );
}
