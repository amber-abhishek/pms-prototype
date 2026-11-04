import { Navigate, Route, Routes } from 'react-router-dom';
import { NotFound } from './Misc';
import { Applications } from './allocations/Applications';
import { Bookings } from './allocations/Bookings';
import { Cycles } from './allocations/Cycles';
import { Offers } from './allocations/Offers';

/** Allocations (BMS): cycles, the application queue, offers and the waitlist, bookings. Data lives in data/allocations.ts. */
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
