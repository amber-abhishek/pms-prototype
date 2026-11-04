import { Navigate, Route, Routes } from 'react-router-dom';
import { ClockCounterClockwise } from '../components/icons';
import { NotFound } from './Misc';
import { ActivityFeed } from './Home';
import { AccessPage } from './org/Access';
import { RoleEditor } from './org/RoleEditor';
import { CampusForm, CampusesPage } from './org/Campuses';
import { TeamsPage } from './org/Teams';

export function OrganisationRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="campuses" replace />} />
      <Route path="campuses" element={<CampusesPage />} />
      <Route path="campuses/new" element={<CampusForm key="new" />} />
      <Route path="campuses/:id" element={<CampusForm />} />
      <Route path="people" element={<AccessPage />} />
      <Route path="people/roles/new" element={<RoleEditor key="new" />} />
      <Route path="people/roles/:id" element={<RoleEditor />} />
      <Route path="teams" element={<TeamsPage />} />
      <Route path="activity" element={<ActivityFeed title="Activity log" icon={ClockCounterClockwise} />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
