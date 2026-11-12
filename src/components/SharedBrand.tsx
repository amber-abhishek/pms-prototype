import { Link } from 'react-router-dom';
import { useWorkspace } from '../data/workspace';

/** The organisation's logo and brand colour. Set once in Settings › General; emails, the booking site and the
    off-campus portal all read it from here, so a university has one identity. */
export const useBrand = () => useWorkspace((s) => s.branding);

/** Read-only row for a screen that uses the shared logo and colour, with the way to change them. */
export function SharedBrand({ linkLabel = 'Change in Settings' }: { linkLabel?: string }) {
  const { logo, colour } = useBrand();
  return (
    <div className="flex items-center gap-3">
      <span className="size-10 rounded-lg text-white font-semibold flex items-center justify-center shrink-0" style={{ background: colour }}>D</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm text-[#0A0A0A] truncate">{logo}</span>
        <span className="block text-xs text-[#737373] font-mono uppercase">{colour}</span>
      </span>
      <Link to="/settings" className="text-sm text-primary hover:underline shrink-0">{linkLabel}</Link>
    </div>
  );
}
