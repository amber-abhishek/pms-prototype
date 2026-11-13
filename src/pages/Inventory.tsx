import { Navigate, Route, Routes } from 'react-router-dom';
import { NotFound } from './Misc';
import { ImportsPage } from './inventory/Imports';
import { OccupancyPage } from './inventory/Occupancy';
import { PropertiesPage } from './inventory/Properties';
import { PropertyDetail } from './inventory/PropertyDetail';
import { RentFeesPage } from './inventory/RentFees';
import { CustomFieldsPage, StructuresPage, TagsPage } from './inventory/Setup';
import { UnitsPage } from './inventory/Units';
import { AddPropertyWizard } from './inventory/Wizard';

export function InventoryRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="properties" replace />} />
      <Route path="properties" element={<PropertiesPage />} />
      {/* The wizard is a centred modal over the Properties list (Figma 3884:40957). */}
      <Route path="properties/new" element={<><PropertiesPage /><AddPropertyWizard /></>} />
      {/* A property opens as a centred modal over the list, not a page. */}
      <Route path="properties/:id" element={<><PropertiesPage /><PropertyDetail /></>} />
      <Route path="units" element={<UnitsPage />} />
      <Route path="occupancy" element={<OccupancyPage />} />
      <Route path="structures" element={<StructuresPage />} />
      <Route path="custom-fields" element={<CustomFieldsPage />} />
      <Route path="tags" element={<TagsPage />} />
      <Route path="rent-fees" element={<RentFeesPage />} />
      <Route path="imports" element={<ImportsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
