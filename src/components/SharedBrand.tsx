import { useNavigate } from 'react-router-dom';
import { Button, cx } from './ui';
import { ArrowUpRight } from './icons';
import { useWorkspace } from '../data/workspace';

/** The organisation's logo and brand colour. Set once in Settings › General; emails, the booking site and the
    off-campus portal all read it from here, so an operator has one identity. */
export const useBrand = () => useWorkspace((s) => s.branding);

/** Read-only row for a screen that uses the shared logo and colour, with the way to change them. */
export function SharedBrand({ linkLabel = 'Change in Settings', stacked }: { linkLabel?: string; /** Narrow panels: the button goes under the name, full width. */ stacked?: boolean }) {
  const { logo, colour } = useBrand();
  const nav = useNavigate();
  return (
    /* Inherited value (2026-11-24): a read-only bordered row like a set file field; the place to change it is a button on the right. */
    <div className={cx('flex items-center gap-3 rounded-xl border border-[#E5E5E5] bg-white p-3', stacked && 'flex-wrap')}>
      <span className="size-10 rounded-lg text-white font-semibold flex items-center justify-center shrink-0" style={{ background: colour }}>D</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-5 font-medium text-[#0A0A0A] truncate">{logo}</span>
        <span className="block text-xs leading-4 text-[#737373] font-mono uppercase">{colour}</span>
      </span>
      <Button size="sm" icon={ArrowUpRight} className={stacked ? 'w-full' : undefined} onClick={() => nav('/settings')}>{linkLabel}</Button>
    </div>
  );
}
