import { Route, Routes } from 'react-router-dom';
import { NotFound } from './Misc';
import { ApplicationsReport, OccupancyReport, ReportsLibrary, SimpleReport } from './workspace/Reports';
import { SettingsAcademicYear, SettingsBranding, SettingsGeneral, SettingsIntegrations, SettingsNotifications, SettingsPayments } from './workspace/Settings';

export function ReportsRoutes() {
  return (
    <Routes>
      <Route index element={<OccupancyReport />} />
      <Route path="library" element={<ReportsLibrary />} />
      <Route path="applications" element={<ApplicationsReport />} />
      <Route path=":id" element={<SimpleReport />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export function SettingsRoutes() {
  return (
    <Routes>
      <Route index element={<SettingsGeneral />} />
      <Route path="academic-year" element={<SettingsAcademicYear />} />
      <Route path="notifications" element={<SettingsNotifications />} />
      <Route path="payments" element={<SettingsPayments />} />
      <Route path="integrations" element={<SettingsIntegrations />} />
      <Route path="branding" element={<SettingsBranding />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
