import { HashRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from './components/shadcn/sonner';
import { Shell } from './shell/Shell';
import { ActivityFeed, Overview, Tasks } from './pages/Home';
import { InventoryRoutes } from './pages/Inventory';
import { AllocationsRoutes } from './pages/Allocations';
import { ResidentsRoutes } from './pages/Residents';
import { OffcampusRoutes } from './pages/Offcampus';
import { OrganisationRoutes } from './pages/Organisation';
import { ReportsRoutes, SettingsRoutes } from './pages/Workspace';
import { NotFound } from './pages/Misc';
import { SiteBuilder } from './pages/site/Builder';
import { Invite, Login } from './pages/auth/Login';

/** Each module owns its own sub-routes, so a module can add detail pages and wizards without touching this file. */
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route path="invite" element={<Invite />} />
        <Route element={<Shell />}>
          <Route index element={<Overview />} />
          <Route path="tasks/*" element={<Tasks />} />
          <Route path="activity" element={<ActivityFeed />} />
          <Route path="inventory/*" element={<InventoryRoutes />} />
          <Route path="allocations/*" element={<AllocationsRoutes />} />
          <Route path="residents/*" element={<ResidentsRoutes />} />
          <Route path="offcampus/*" element={<OffcampusRoutes />} />
          <Route path="site" element={<SiteBuilder tab="pages" />} />
          <Route path="site/theme" element={<SiteBuilder tab="theme" />} />
          <Route path="site/settings" element={<SiteBuilder tab="settings" />} />
          <Route path="reports/*" element={<ReportsRoutes />} />
          <Route path="org/*" element={<OrganisationRoutes />} />
          <Route path="settings/*" element={<SettingsRoutes />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster />
    </HashRouter>
  );
}
