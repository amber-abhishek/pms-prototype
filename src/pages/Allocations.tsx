import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';
import { NotFound } from './Misc';
import { Applications } from './allocations/Applications';
import { Bookings } from './allocations/Bookings';
import { Cycles } from './allocations/Cycles';
import { Offers } from './allocations/Offers';
import { AllocOverview } from './allocations/Overview';

/** Allocations (BMS): overview, cycles, the application queue, offers and the waitlist, bookings. Data lives in data/allocations.ts. */
/** Applications with no tab is the overview; each tab (To review, Flagged…) is the queue. */
function ApplicationsHome() {
  const [sp] = useSearchParams();
  return sp.get('tab') ? <Applications /> : <AllocOverview />;
}
export function AllocationsRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="applications" replace />} />
      <Route path="cycles" element={<Cycles />} />
      <Route path="applications" element={<ApplicationsHome />} />
      <Route path="offers" element={<Offers />} />
      <Route path="bookings" element={<Bookings />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
