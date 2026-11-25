import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { TitleH1, cx } from './ui';

/* Page heading with a short line on what the page is for (trial, 2026-11-24). Shown under the breadcrumb bar on
   every module page; Overview, My tasks, Units (its own level heading), the Occupancy report and the Booking site editor get none. Set INTRO_ON to false to turn
   the whole trial off. A record route (/org/campuses/c1, a sheet or modal over the list) always keeps its list's intro, so the page
   behind an open record never shifts (2026-11-24); `sub` is kept on entries but no longer needed. */
export const INTRO_ON = true;

/** centred: the page's content is a centred column (Settings 864px, Library 720px), so the heading sits over it. */
type Intro = { text: string; sub?: boolean; centred?: boolean | 'narrow'; /** A hairline under the intro, when a band (a warning) follows rather than a toolbar or table. */ rule?: boolean };
const INTROS: Record<string, Intro> = {
  '/inventory/properties': { text: 'Every property you let, with its units, tags and how full it is for the coming year.', sub: true },
  '/inventory/occupancy': { text: 'Who is in each room and which beds are still free.' },
  '/inventory/structures': { text: 'Layouts set the levels a property is built from, such as building, floor, flat and room.' },
  '/inventory/custom-fields': { text: 'Extra details you record on properties, units and rooms, beyond the standard ones.' },
  '/inventory/tags': { text: 'Labels for grouping and filtering properties, like catered or self-catered.' },
  '/inventory/rent-fees': { text: 'Rent and fee rules that differ from a property’s standard prices.' },
  '/inventory/imports': { text: 'Bring properties and units in from a spreadsheet or another system, and see past imports.' },
  '/allocations/applications': { text: 'Applications for the coming year, ready to review and allocate a room.', sub: true },
  '/allocations/offers': { text: 'Room offers you have sent, and the students waiting for one.', sub: true },
  '/allocations/bookings': { text: 'Confirmed bookings, with the room, term and contract for each resident.', sub: true },
  '/allocations/cycles': { text: 'The terms students can book for, with their dates and when each one opens.', sub: true },
  '/residents': { text: 'Everyone living in your properties this year, with their room and contact details.' },
  '/residents/maintenance': { text: 'Faults reported in rooms and shared spaces, and who is fixing them.', sub: true },
  '/residents/requests': { text: 'Requests from residents, such as room moves or leaving early, waiting on a decision.', sub: true },
  '/residents/notices': { text: 'Messages to residents, sent now or scheduled, by property or group.', sub: true },
  '/offcampus/approvals': { text: 'Owners and listings waiting for your check before students can see them.', sub: true },
  '/offcampus/listings': { text: 'Private homes listed for your students, and how each one is doing.', sub: true },
  '/offcampus/enquiries': { text: 'Questions students have sent to owners about their listings.', sub: true },
  '/offcampus/portal': { text: 'How the off-campus site behaves, how it looks and where it lives.', sub: true, centred: true },
  '/reports/library': { text: 'Ready-made reports on lettings, rent, maintenance and notices.', centred: 'narrow' },
  '/reports/library?tab=scheduled': { text: 'Reports emailed on a schedule, and who gets each one.', rule: true },
  '/reports/library?tab=shared': { text: 'Reports other people in your team have shared with you.' },
  '/org/campuses': { text: 'The campuses and sites your properties belong to.' },
  '/org/people': { text: 'Who can sign in, and what each role can see and do.' },
  '/org/teams': { text: 'Groups of people who share work, like a site team or the allocations team.' },
  '/org/activity': { text: 'A record of changes made across the workspace, and who made them.' },
  '/settings': { text: 'Your organisation’s name, logo and workspace basics.', centred: true },
  '/settings/academic-year': { text: 'The letting years you run and the rent periods inside each one.', centred: true },
  '/settings/notifications': { text: 'What you hear about, and whether in the app, by email or by SMS.', centred: true },
  '/settings/payments': { text: 'How residents pay, and when payment reminders go out.', centred: true },
  '/settings/integrations': { text: 'Other systems connected to your workspace.', centred: true },
  '/settings/emails': { text: 'How emails to residents look, and who they come from.', centred: true },
};

function find(path: string, search: string): Intro | undefined {
  const p = path.replace(/\/+$/, '') || '/';
  /* A page whose views are ?tab= rows in the panel (Reports › Scheduled, Shared with me) can key a tab: '/path?tab=x'. */
  const tab = new URLSearchParams(search).get('tab');
  if (tab && INTROS[`${p}?tab=${tab}`]) return INTROS[`${p}?tab=${tab}`];
  if (INTROS[p]) return INTROS[p];
  const base = Object.keys(INTROS).filter((k) => !k.includes('?') && p.startsWith(k + '/')).sort((a, b) => b.length - a.length)[0];
  return base ? INTROS[base] : undefined;
}

export function PageIntro({ title, end }: { title: string; /** Controls level with the heading, on the right. */ end?: ReactNode }) {
  const { pathname, search } = useLocation();
  const intro = INTRO_ON ? find(pathname, search) : undefined;
  /* 24px to whatever comes next. A toolbar row (search, tabs) already has its own top padding, so when one sits
     straight under the intro (even inside a wrapper, past a hidden h1) the intro adds only 8px. */
  const ref = useRef<HTMLDivElement>(null);
  const [toolbarNext, setToolbarNext] = useState<boolean | 'band'>(true);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const tb = el.parentElement?.querySelector<HTMLElement>('[data-toolbar]');
    const next = !!tb && el.compareDocumentPosition(tb) & Node.DOCUMENT_POSITION_FOLLOWING ? Math.abs(tb.getBoundingClientRect().top - el.getBoundingClientRect().bottom) < 2 : false;
    /* Over a grey folder-tab band (2026-11-24) the intro sits on the same grey, so heading and tabs read as one block. */
    setToolbarNext(next && tb?.querySelector('[data-tab-band]') ? 'band' : next);
  });
  if (!intro) return null;
  const words = (
    <>
      <TitleH1 className="text-xl leading-7 font-medium text-[#0A0A0A]">{title}</TitleH1>
      <p className="mt-1 max-w-[640px] text-sm leading-5 text-[#737373]">{intro.text}</p>
    </>
  );
  const text = words;
  const body = end ? <div className="flex items-end gap-4"><div className="min-w-0 flex-1">{text}</div><div className="shrink-0 flex items-center gap-3">{end}</div></div> : text;
  /* A centred intro is only as wide as its column, so the band's grey is a full-width row around it. It used to be a
     100vmax shadow, which painted over the sidebar whenever the page area did not clip it (2026-11-25). */
  if (intro.centred) return (
    <div ref={ref} data-intro className={cx('shrink-0', toolbarNext === 'band' && 'bg-[#F5F5F5]')}>
      <div className={cx('w-full mx-auto px-8 pt-8', intro.centred === 'narrow' ? 'max-w-[720px]' : 'max-w-[864px]')}>{body}</div>
    </div>
  );
  return (
    <div ref={ref} data-intro className={cx('shrink-0 px-[var(--tx,24px)] pt-6', intro.rule ? 'pb-6 border-b border-[#E5E5E5]' : toolbarNext === 'band' ? 'bg-[#F5F5F5]' : toolbarNext ? 'pb-2' : 'pb-6')}>
      {body}
    </div>
  );
}
