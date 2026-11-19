import { useSearchParams } from 'react-router-dom';
import { ClipboardText } from '../../components/icons';
import { PageHeader } from '../../components/ui';
import { LineTabs } from '../inventory/common';
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
      <PageHeader icon={ClipboardText} crumbs={['Off-campus']} title="Approvals" />
      <div className="flex-1 min-h-0 flex flex-col">
        <Title title="Approvals" />
        <LineTabs value={kind} onChange={pick} className="px-[var(--tx,16px)] shrink-0"
          tabs={[{ id: 'landlords', label: `Landlords · ${waitingLandlords}` }, { id: 'listings', label: `Listings · ${waitingListings}` }]} />
        {kind === 'listings' ? <Reviews bare /> : <Landlords bare />}
      </div>
    </>
  );
}
