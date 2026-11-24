import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Approvals } from './offcampus/Approvals';
import { NotFound } from './Misc';
import { Listings } from './offcampus/Listings';
import { Enquiries } from './offcampus/Enquiries';
import { Portal } from './offcampus/Portal';

export function OffcampusRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="approvals" replace />} />
      <Route path="approvals" element={<Approvals />} />
      {/* Owner applications and Listing reviews are one Approvals page now; old links keep their ?tab / ?open. */}
      <Route path="landlords" element={<Moved kind="owners" />} />{/* old link */}
      <Route path="owners" element={<Moved kind="owners" />} />
      <Route path="reviews" element={<Moved kind="listings" />} />
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

function Moved({ kind }: { kind: 'owners' | 'listings' }) {
  const { search } = useLocation();
  const sp = new URLSearchParams(search);
  sp.set('kind', kind);
  return <Navigate to={`/offcampus/approvals?${sp}`} replace />;
}
