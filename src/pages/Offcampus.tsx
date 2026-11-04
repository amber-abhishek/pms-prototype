import { Navigate, Route, Routes } from 'react-router-dom';
import { NotFound } from './Misc';
import { Landlords } from './offcampus/Landlords';
import { Reviews } from './offcampus/Reviews';
import { Listings } from './offcampus/Listings';
import { Enquiries } from './offcampus/Enquiries';
import { Portal } from './offcampus/Portal';

export function OffcampusRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="landlords" replace />} />
      <Route path="landlords" element={<Landlords />} />
      <Route path="reviews" element={<Reviews />} />
      <Route path="listings" element={<Listings />} />
      <Route path="enquiries" element={<Enquiries />} />
      <Route path="portal" element={<Portal sec="behaviour" />} />
      <Route path="portal/appearance" element={<Portal sec="appearance" />} />
      <Route path="portal/site" element={<Portal sec="site" />} />
      <Route path="portal/domain" element={<Portal sec="domain" />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
