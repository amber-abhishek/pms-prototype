import { useId, type ReactNode } from 'react';
import * as I from '../components/icons';
import type { Icon } from '../components/icons';

/**
 * Solid versions of the panel's Lucide icons, for the selected row. The Figma icon set (3315:22) has only
 * `icon/house-fill`, so these follow the same Lucide geometry (24 grid), filled, with inner details cut
 * out through a mask so the row background shows through.
 */
type Spec = { body: ReactNode; cut?: ReactNode; over?: ReactNode };
const C = 'currentColor';
const sk = (w = 2) => ({ stroke: C, strokeWidth: w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });
const cutSk = (w = 1.8) => ({ stroke: '#000', strokeWidth: w, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' });

const specs = new Map<Icon, Spec>([
  [I.LayoutDashboard, { body: <>{[[3, 3, 7, 9], [14, 3, 7, 5], [14, 12, 7, 9], [3, 16, 7, 5]].map(([x, y, w, h]) => <rect key={`${x}${y}`} x={x - 0.5} y={y - 0.5} width={w + 1} height={h + 1} rx="1.5" fill={C} />)}</> }],
  [I.CircleCheck, { body: <circle cx="12" cy="12" r="10.5" fill={C} />, cut: <path d="m8.5 12 2.5 2.5 4.5-4.5" {...cutSk(2)} /> }],
  [I.History, { body: <circle cx="13" cy="12.5" r="9" fill={C} />, cut: <><path d="M13 7.5v5l3.5 2" {...cutSk(2)} /><path d="M2.5 3v5h5" {...cutSk(5.5)} /></>, over: <path d="M2.5 3v5h5" fill="none" {...sk()} /> }],
  [I.Inbox, { body: <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" fill={C} {...sk()} />, cut: <path d="M3 12h5l2 3h4l2-3h5" {...cutSk()} /> }],
  [I.Wrench, { body: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill={C} {...sk()} /> }],
  [I.UserCheck, { body: <><circle cx="9" cy="7" r="4.5" fill={C} /><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2z" fill={C} {...sk()} /></>, over: <path d="m16 11 2 2 4-4" fill="none" {...sk()} /> }],
  [I.Building, { body: <rect x="3.5" y="1.5" width="17" height="21" rx="3" fill={C} />, cut: <>{[8, 12, 16].flatMap((x) => [6, 10, 14].map((y) => <rect key={`${x}${y}`} x={x - 1} y={y - 1} width="2" height="2" rx="0.6" fill="#000" />))}<rect x="9.5" y="17.5" width="5" height="6" rx="1" fill="#000" /></> }],
  [I.Grid3x3, { body: <rect x="2.5" y="2.5" width="19" height="19" rx="3" fill={C} />, cut: <path d="M3 9h18M3 15h18M9 3v18M15 3v18" {...cutSk(1.6)} /> }],
  [I.ChartColumn, { body: <>{[[6.5, 12, 6], [11.5, 4, 14], [16.5, 8, 10]].map(([x, y, h]) => <rect key={x} x={x} y={y} width="3.5" height={h} rx="1" fill={C} />)}</>, over: <path d="M3 3v16a2 2 0 0 0 2 2h16" fill="none" {...sk()} /> }],
  [I.Network, { body: <>{[[16, 16], [2, 16], [9, 2]].map(([x, y]) => <rect key={`${x}${y}`} x={x - 0.5} y={y - 0.5} width="7" height="7" rx="1.5" fill={C} />)}</>, over: <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3M12 12V8" fill="none" {...sk()} /> }],
  [I.TextCursorInput, { body: <rect x="2" y="7.5" width="20" height="9" rx="2" fill={C} />, cut: <rect x="6.5" y="6" width="5" height="12" fill="#000" />, over: <path d="M6 4h1a2 2 0 0 1 2 2 2 2 0 0 1 2-2h1M12 20h-1a2 2 0 0 1-2-2 2 2 0 0 1-2 2H6M9 6v12" fill="none" {...sk()} /> }],
  [I.Wallet, { body: <path d="M3 5a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3h1.5a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5H5a2 2 0 0 1-2-2z" fill={C} />, cut: <><path d="M5 7h14" {...cutSk(1.6)} /><circle cx="16.5" cy="14" r="1.6" fill="#000" /></> }],
  [I.FileText, { body: <path d="M15 1.5H6A2.5 2.5 0 0 0 3.5 4v16A2.5 2.5 0 0 0 6 22.5h12a2.5 2.5 0 0 0 2.5-2.5V7Z" fill={C} />, cut: <path d="M14.5 2v4a2 2 0 0 0 2 2h4M8 13h8M8 17h8M8 9h2" {...cutSk(1.6)} /> }],
  [I.Calendar, { body: <rect x="2.5" y="4" width="19" height="18" rx="3" fill={C} />, cut: <path d="M2.5 9.5h19" {...cutSk(1.6)} />, over: <path d="M8 2v4M16 2v4" {...sk()} /> }],
  [I.CalendarCheck, { body: <rect x="2.5" y="4" width="19" height="18" rx="3" fill={C} />, cut: <><path d="M2.5 9.5h19" {...cutSk(1.6)} /><path d="m9 15.5 2 2 4-4" {...cutSk(2)} /></>, over: <path d="M8 2v4M16 2v4" {...sk()} /> }],
  [I.Send, { body: <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" fill={C} {...sk()} />, cut: <path d="m21.854 2.147-10.94 10.939" {...cutSk(1.6)} /> }],
  [I.Users, { body: <><circle cx="9" cy="7" r="4.5" fill={C} /><path d="M1.5 21v-1.5A5 5 0 0 1 6.5 14.5h5a5 5 0 0 1 5 5V21a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1Z" fill={C} /></>, over: <path d="M16 3.13a4 4 0 0 1 0 7.75M22 21v-2a4 4 0 0 0-3-3.87" fill="none" {...sk()} /> }],
  [I.ArrowsLeftRight, { body: <path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4" fill="none" {...sk(2.6)} /> }],
  [I.Megaphone, { body: <path d="m3 11 18-5v12L3 14v-3z" fill={C} {...sk()} />, over: <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" fill="none" {...sk()} /> }],
  [I.ClipboardCheck, { body: <rect x="3.5" y="3.5" width="17" height="19" rx="2.5" fill={C} />, cut: <><rect x="6.5" y="0.5" width="11" height="7" rx="2.5" fill="#000" /><path d="m9 14 2 2 4-4" {...cutSk(2)} /></>, over: <rect x="8" y="2" width="8" height="4" rx="1" fill={C} /> }],
  [I.LayoutTemplate, { body: <>{[[3, 3, 18, 7], [3, 14, 9, 7], [16, 14, 5, 7]].map(([x, y, w, h]) => <rect key={`${x}${y}`} x={x - 0.5} y={y - 0.5} width={w + 1} height={h + 1} rx="1.5" fill={C} />)}</> }],
  [I.MessageSquare, { body: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill={C} {...sk()} /> }],
  [I.Settings, { body: <path fill={C} d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />, cut: <circle cx="12" cy="12" r="3" fill="#000" /> }],
  [I.MapPin, { body: <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" fill={C} {...sk()} />, cut: <circle cx="12" cy="10" r="3" fill="#000" /> }],
  [I.Shield, { body: <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" fill={C} {...sk()} /> }],
  [I.Mail, { body: <rect x="1.5" y="3.5" width="21" height="17" rx="2.5" fill={C} />, cut: <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" {...cutSk(1.6)} /> }],
  [I.Plug, { body: <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" fill={C} {...sk()} />, over: <path d="M12 22v-5M9 8V2M15 8V2" fill="none" {...sk()} /> }],
  [I.Store, { body: <><path d="M3 7.5 5 3h14l2 4.5V9a3 3 0 0 1-3 3 3 3 0 0 1-2.5-1.3A3 3 0 0 1 12 12a3 3 0 0 1-3.5-1.3A3 3 0 0 1 6 12a3 3 0 0 1-3-3z" fill={C} /><rect x="4" y="13" width="16" height="9" rx="1.5" fill={C} /></>, cut: <rect x="9.5" y="16" width="5" height="7" rx="0.8" fill="#000" /> }],
  [I.Palette, { body: <path d="M12 2a10 10 0 0 0 0 20 2.5 2.5 0 0 0 2.5-2.5c0-.6-.2-1.1-.6-1.6a1.6 1.6 0 0 1 1.3-2.7H17a5 5 0 0 0 5-5C22 5.9 17.5 2 12 2" fill={C} />, cut: <>{[[13.5, 6.5], [17.5, 10.5], [8.5, 7.5], [6.5, 12.5]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.5" fill="#000" />)}</> }],
]);
specs.set(I.House, { body: <path fill={C} transform="scale(1.5)" d="M7.09109 2.17608C7.6149 1.72831 8.38666 1.72831 8.91047 2.17608L13.7105 6.2793C14.0216 6.54529 14.2008 6.93413 14.2008 7.34347V13.1984C14.2008 13.9716 13.574 14.5984 12.8008 14.5984H11.4008C10.6276 14.5984 10.0008 13.9716 10.0008 13.1984V11.7984C10.0008 11.0252 9.37398 10.3984 8.60078 10.3984H7.40078C6.62758 10.3984 6.00078 11.0252 6.00078 11.7984V13.1984C6.00078 13.9716 5.37398 14.5984 4.60078 14.5984H3.20078C2.42758 14.5984 1.80078 13.9716 1.80078 13.1984V7.34347C1.80078 6.93413 1.97994 6.54529 2.29109 6.2793L7.09109 2.17608Z" /> });

export const hasSolidIcon = (icon: Icon) => specs.has(icon);

export function SolidIcon({ icon, size = 16, className }: { icon: Icon; size?: number; className?: string }) {
  const id = useId();
  const s = specs.get(icon);
  if (!s) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden fill="none">
      {s.cut && <mask id={id} maskUnits="userSpaceOnUse" x="-2" y="-2" width="28" height="28"><rect x="-2" y="-2" width="28" height="28" fill="#fff" />{s.cut}</mask>}
      <g mask={s.cut ? `url(#${id})` : undefined}>{s.body}</g>
      {s.over}
    </svg>
  );
}
