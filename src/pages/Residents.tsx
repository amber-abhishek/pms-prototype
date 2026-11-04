import { Route, Routes } from 'react-router-dom';
import { NotFound } from './Misc';
import { ResidentDetail, ResidentsList } from './residents/ResidentsPage';
import { RequestDetail, RequestsList } from './residents/Requests';
import { NoticePage, NoticesList } from './residents/Notices';
import { FaultDetail, MaintenanceList } from './residents/Maintenance';

/**
 * Residents (RMS). Lists keep `?open=<id>` deep links working by redirecting to the
 * record's own page: /residents/maintenance?open=m1 → /residents/maintenance/m1.
 */
export function ResidentsRoutes() {
  return (
    <Routes>
      <Route index element={<ResidentsList />} />
      <Route path="maintenance" element={<MaintenanceList />} />
      <Route path="maintenance/:id" element={<FaultDetail />} />
      <Route path="requests" element={<RequestsList />} />
      <Route path="requests/:id" element={<RequestDetail />} />
      <Route path="notices" element={<NoticesList />} />
      <Route path="notices/:id" element={<NoticePage />} />
      <Route path=":id" element={<ResidentDetail />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
