import { useId, type ReactElement, type ReactNode } from 'react';

/**
 * Solid versions of the rail icons, shown on the active module (Figma `icon/house-fill`, 3327:1363).
 * The house is the frame's own path; the others follow the same Lucide shapes, filled, with details
 * cut out through a mask, so the active button's own background shows through in light and dark mode.
 * Inside a <mask>, black (#000) hides and white shows; `W` marks the details that become holes.
 */
const W = '#000';
const solid: Record<string, ReactNode> = {
  home: (
    <svg viewBox="0 0 16 16"><path fill="currentColor" d="M7.09109 2.17608C7.6149 1.72831 8.38666 1.72831 8.91047 2.17608L13.7105 6.2793C14.0216 6.54529 14.2008 6.93413 14.2008 7.34347V13.1984C14.2008 13.9716 13.574 14.5984 12.8008 14.5984H11.4008C10.6276 14.5984 10.0008 13.9716 10.0008 13.1984V11.7984C10.0008 11.0252 9.37398 10.3984 8.60078 10.3984H7.40078C6.62758 10.3984 6.00078 11.0252 6.00078 11.7984V13.1984C6.00078 13.9716 5.37398 14.5984 4.60078 14.5984H3.20078C2.42758 14.5984 1.80078 13.9716 1.80078 13.1984V7.34347C1.80078 6.93413 1.97994 6.54529 2.29109 6.2793L7.09109 2.17608Z" /></svg>
  ),
  inventory: (
    <svg viewBox="0 0 24 24">
      <rect x="3.5" y="1.5" width="17" height="21" rx="3" fill="currentColor" />
      {[[8.5, 6], [12, 6], [15.5, 6], [8.5, 10], [12, 10], [15.5, 10], [8.5, 14], [12, 14], [15.5, 14]].map(([x, y]) => <rect key={`${x}-${y}`} x={x - 1} y={y - 1} width="2" height="2" rx="0.6" fill={W} />)}
      <rect x="9.5" y="17.5" width="5" height="5" rx="1" fill={W} />
    </svg>
  ),
  allocations: (
    <svg viewBox="0 0 24 24">
      <rect x="2.5" y="4" width="19" height="18" rx="3" fill="currentColor" />
      <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M2.5 9.5h19" stroke={W} strokeWidth="1.6" />
      <path d="m9 15.5 2 2 4-4" stroke={W} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  residents: (
    <svg viewBox="0 0 24 24">
      <circle cx="9" cy="7" r="4.5" fill="currentColor" />
      <path d="M1.5 21v-1.5A5 5 0 0 1 6.5 14.5h5a5 5 0 0 1 5 5V21a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1Z" fill="currentColor" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75M22 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  offcampus: (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10.5" fill="currentColor" />
      <path d="M12 1.5a14.5 14.5 0 0 0 0 21 14.5 14.5 0 0 0 0-21M1.5 12h21" stroke={W} strokeWidth="1.6" fill="none" />
    </svg>
  ),
  site: (
    <svg viewBox="0 0 24 24">
      <rect x="1.5" y="2.5" width="21" height="15" rx="3" fill="currentColor" />
      <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24">
      <path d="M3 3v16a2 2 0 0 0 2 2h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      <rect x="6.5" y="12" width="3.5" height="6" rx="1" fill="currentColor" />
      <rect x="11.5" y="4" width="3.5" height="14" rx="1" fill="currentColor" />
      <rect x="16.5" y="8" width="3.5" height="10" rx="1" fill="currentColor" />
    </svg>
  ),
  org: (
    <svg viewBox="0 0 24 24">
      <path d="M11.1 1.7a2 2 0 0 1 1.8 0l7.9 4.1A1.2 1.2 0 0 1 20.3 8H3.7a1.2 1.2 0 0 1-.5-2.2Z" fill="currentColor" />
      {[4.5, 9, 13.5, 18].map((x) => <rect key={x} x={x} y="10" width="2.5" height="8.5" rx="1" fill="currentColor" />)}
      <rect x="2.5" y="20" width="19" height="2.5" rx="1.25" fill="currentColor" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24">
      <path fill="currentColor" d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" fill={W} />
    </svg>
  ),
};

export function RailSolid({ id, size = 16 }: { id: string; size?: number }) {
  const mid = 'rs' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const s = solid[id] as ReactElement<{ viewBox: string; children: ReactNode }> | undefined;
  if (!s) return null;
  const { viewBox, children } = s.props;
  const vb = viewBox.split(' ').map(Number);
  const kids = Array.isArray(children) ? children.flat() : [children];
  const isCut = (k: unknown) => { const p = (k as ReactElement<{ fill?: string; stroke?: string }> | null)?.props; return !!p && (p.fill === W || p.stroke === W); };
  const flat = kids.flatMap((k) => (Array.isArray(k) ? k : [k]));
  const cuts = flat.filter(isCut);
  const body = flat.filter((k) => !isCut(k));
  return (
    <span aria-hidden className="inline-flex [&>svg]:size-full" style={{ width: size, height: size }}>
      <svg viewBox={viewBox}>
        {cuts.length > 0 && <mask id={mid} maskUnits="userSpaceOnUse" x={vb[0] - 2} y={vb[1] - 2} width={vb[2] + 4} height={vb[3] + 4}><rect x={vb[0] - 2} y={vb[1] - 2} width={vb[2] + 4} height={vb[3] + 4} fill="#fff" />{cuts}</mask>}
        <g mask={cuts.length ? `url(#${mid})` : undefined}>{body}</g>
      </svg>
    </span>
  );
}
export const hasSolid = (id: string) => id in solid;
