import { Navigate, Route, RouterProvider, Routes, createHashRouter, useLocation } from 'react-router-dom';
import { Toaster } from './components/shadcn/sonner';
import { Shell } from './shell/Shell';
import { Overview, Tasks } from './pages/Home';
import { InventoryRoutes } from './pages/Inventory';
import { AllocationsRoutes } from './pages/Allocations';
import { ResidentsRoutes } from './pages/Residents';
import { OffcampusRoutes } from './pages/Offcampus';
import { OrganisationRoutes } from './pages/Organisation';
import { ReportsRoutes, SettingsRoutes } from './pages/Workspace';
import { NotFound } from './pages/Misc';
import { Profile } from './pages/Profile';
import { SiteBuilder } from './pages/site/Builder';
import { Invite, Login } from './pages/auth/Login';
import { TooltipProvider } from './components/shadcn/tooltip';

/** Each module owns its own sub-routes, so a module can add detail pages and wizards without touching this file. */
/* A data router (not <HashRouter>) so Settings can hold navigation with useBlocker while a draft is unsaved. */
const router = createHashRouter([{ path: '*', element: <AppRoutes /> }]);
export function App() {
  return <RouterProvider router={router} />;
}

function AppRoutes() {
  return (
    /* One provider for the whole app: page content (number-band meters) has tooltips too, not just the sidebars. */
    <TooltipProvider delayDuration={300}>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route path="invite" element={<Invite />} />
        <Route element={<Shell />}>
          <Route index element={<Overview />} />
          <Route path="tasks/*" element={<Tasks />} />
          <Route path="activity" element={<Navigate to="/org/activity" replace />} />
          <Route path="properties/*" element={<InventoryRoutes />} />
          {/* Old links: the section moved from /inventory to /properties (2026-11-26). */}
          <Route path="inventory/*" element={<OldInventory />} />
          <Route path="allocations/*" element={<AllocationsRoutes />} />
          <Route path="residents/*" element={<ResidentsRoutes />} />
          <Route path="offcampus/*" element={<OffcampusRoutes />} />
          <Route path="site" element={<SiteBuilder tab="pages" />} />
          <Route path="site/theme" element={<SiteBuilder tab="theme" />} />
          <Route path="site/settings" element={<SiteBuilder tab="settings" />} />
          <Route path="reports/*" element={<ReportsRoutes />} />
          <Route path="org/*" element={<OrganisationRoutes />} />
          <Route path="settings/*" element={<SettingsRoutes />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster />
    </TooltipProvider>
  );
}

/** /inventory/units?p=x → /properties/units?p=x; /inventory/properties/col → /properties/col. */
function OldInventory() {
  const { pathname, search } = useLocation();
  const rest = pathname.replace(/^\/inventory/, '').replace(/^\/properties(?=\/|$)/, '');
  return <Navigate to={`/properties${rest}${search}`} replace />;
}
