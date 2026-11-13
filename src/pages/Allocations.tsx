import { Navigate, Route, Routes } from 'react-router-dom';
import { NotFound } from './Misc';
import { Applications } from './allocations/Applications';
import { Bookings } from './allocations/Bookings';
import { Cycles } from './allocations/Cycles';
import { Offers } from './allocations/Offers';

/** Allocations (BMS): the application queue (tabs: To review, Flagged…), offers and the waitlist, bookings, cycles. Data lives in data/allocations.ts. */
export function AllocationsRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="applications" replace />} />
      <Route path="cycles" element={<Cycles />} />
      <Route path="applications" element={<Applications />} />
      <Route path="offers" element={<Offers />} />
      <Route path="bookings" element={<Bookings />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
