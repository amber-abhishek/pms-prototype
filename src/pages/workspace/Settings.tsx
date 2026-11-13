// Workspace › Settings. Figma Flow 9 (3040–3042), tabs 3054/3055/3056/3059/3060/3061, E3 integration stops syncing (3232–3234).
import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react';
import { rowAttrs, useRowMotion } from '../../components/rowMotion';
import { Link, useBeforeUnload, useBlocker, useSearchParams } from 'react-router-dom';
import {
  Archive, EnvelopeSimple, PencilSimple, ArrowUpRight, Calculator, ChatCenteredText, Key, SlidersHorizontal, ArrowsLeftRight, DeviceMobile, Bank, Bell, CalendarBlank, Check, Globe, Money, Moon, Sun, CreditCard, DoorOpen, Gear, GraduationCap, Info, Plug, Plus, Textbox, TreeStructure,
  UploadSimple, Warning, WarningCircle, WebhooksLogo, type Icon,
} from '../../components/icons';
import { toast } from 'sonner';
import { Button, DL, Input, Pill, Switch, Textarea, TitleH1, cx } from '../../components/ui';
import { BRAND, BrandTile } from '../../components/brandLogos';
import { SharedBrand } from '../../components/SharedBrand';
import { usePins } from '../../data/pins';
import { useWorkspace, type Branding, type General, type Integration, type NotifRow, type Payments, type Term, type Year } from '../../data/workspace';
import { Alert, Header, IconSelect, ODialog, RowMenu } from '../org/parts';

const TABS: { id: string; label: string; to: string; icon: Icon; external?: boolean }[] = [
  { id: 'general', label: 'General', to: '/settings', icon: Gear },
  { id: 'academic-year', label: 'Academic year', to: '/settings/academic-year', icon: GraduationCap },
  { id: 'notifications', label: 'Notifications', to: '/settings/notifications', icon: Bell },
  { id: 'structures', label: 'Structures', to: '/inventory/structures', icon: TreeStructure, external: true },
  { id: 'custom-fields', label: 'Custom fields', to: '/inventory/custom-fields', icon: Textbox, external: true },
  { id: 'payments', label: 'Payments', to: '/settings/payments', icon: CreditCard },
  { id: 'integrations', label: 'Integrations', to: '/settings/integrations', icon: Plug },
  { id: 'emails', label: 'Emails', to: '/settings/emails', icon: EnvelopeSimple },
];

/* Settings page (Connect 2.0, 3095:22728): a stack of cards, each with a #FAFAFA header band. */
function Layout({ tab, title, actions, children, wide }: { tab: string; title: string; actions?: ReactNode; children: ReactNode; wide?: boolean }) {
  const t = TABS.find((x) => x.id === tab)!;
  return (
    <>
      <Header icon={t.icon} crumbs={[{ label: 'Settings' }]} title={t.label}>{actions}</Header>
      {/* The design's in-page tab rail is the sidebar panel's job in this shell, so it isn't repeated here. */}
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 overflow-auto">
          <div className={cx('px-8 pt-8 pb-16', wide ? 'max-w-[1080px]' : 'max-w-[960px]')}>
            <TitleH1 className="sr-only">{title}</TitleH1>
            <div className="-mt-2 flex flex-col gap-4">
              {/* Anything that isn't a Section (a table, a note, the Emails grid) sits in the stack outside a card.
                  A closed dialog renders nothing, so its slot is hidden rather than leaving an empty gap. */}
              {Children.toArray(children).map((c, i) => (isValidElement(c) && c.type === Section ? c : <div key={i} className="empty:hidden">{c}</div>))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ title, sub, children, action, tone }: { title: string; sub?: ReactNode; children?: ReactNode; action?: ReactNode; tone?: 'red' }) {
  return (
    /* Connect 2.0 card: r12, 1px #E5E5E5, 0 1 2 at 5%; 44px #FAFAFA header (12/12/12/16) with a 14px medium title. */
    <section data-tone={tone} className="rounded-xl border border-[#E5E5E5] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
      <header className="min-h-11 py-3 pl-4 pr-3 flex items-center gap-3 bg-[#FAFAFA] border-b border-[#E5E5E5] [&:last-child]:border-b-0">
        {/* `tone` kept for callers; the Danger zone title stays ink. */}
        <h2 className="text-sm leading-5 font-medium text-[#0A0A0A]">{title}</h2>
        {sub && <p className="text-sm leading-5 text-[#737373] truncate">{sub}</p>}
        {action && <div className="ml-auto shrink-0">{action}</div>}
      </header>
      {children && <div className="min-w-0 p-4">{children}</div>}
    </section>
  );
}
const Lbl = ({ children }: { children: ReactNode }) => <div className="text-sm leading-5 font-medium text-[#0A0A0A] mb-1.5">{children}</div>;
const opts = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));
/** Inline field error. */
const Err = ({ children }: { children?: ReactNode }) => (children ? <p role="alert" className="text-xs leading-4 text-[#E0243A] mt-1.5">{children}</p> : null);
const bad = (e?: string) => (e ? 'border-[#E0243A] focus-visible:ring-[#E0243A]/25' : undefined);

/* Dates are written "16 Sep 2028"; only a day that exists on the calendar parses. */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function parseDay(s: string): Date | null {
  const m = s.trim().match(/^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/);
  if (!m) return null;
  const mo = MON.findIndex((x) => x.toLowerCase() === m[2].toLowerCase());
  if (mo < 0) return null;
  const d = new Date(+m[3], mo, +m[1]);
  return d.getMonth() === mo && d.getDate() === +m[1] ? d : null;
}
const NOT_A_DATE = 'Use a real date like 16 Sep 2028';

/* WCAG contrast of white text on a hex colour. */
function whiteOn(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => { const v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
}
const HOURS = ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '06:00', '07:00', '08:00', '09:00'];

type DraftKey = 'general' | 'notifs' | 'payments' | 'branding';
const TAB_NAME: Record<DraftKey, string> = { general: 'General', notifs: 'Notifications', payments: 'Payments', branding: 'Emails' };
const FIELD: Record<string, string> = {
  name: 'Name', short: 'Short name', timezone: 'Timezone', currency: 'Currency', weekStarts: 'Week starts', quietFrom: 'Quiet hours from', quietTo: 'Quiet hours to',
  methods: 'How residents can pay', billed: 'Billed', due: 'Due', deposit: 'Deposit', remind: 'Rent reminder', arrears: 'Arrears flag', lateFee: 'Late fee',
  logo: 'Logo', colour: 'Brand colour', sender: 'Email sender name', replyTo: 'Reply-to', footer: 'Email footer', all: 'Notification choices',
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/* Field-level diff. A list (notifications) counts as one field. */
const parts = (v: unknown): Record<string, unknown> => (Array.isArray(v) ? { all: v } : (v as Record<string, unknown>));
const changed = (a: unknown, b: unknown) => { const A = parts(a), B = parts(b); return Object.keys({ ...A, ...B }).filter((k) => !same(A[k], B[k])); };
const shown = (v: unknown) => (typeof v === 'boolean' ? (v ? 'On' : 'Off') : v && typeof v === 'object' ? 'Changed' : String(v));
/* Their saved value with my fields laid over it. */
function merge<T>(theirs: T, mine: T, keys: string[]): T {
  if (Array.isArray(mine)) return mine;
  const m = mine as Record<string, unknown>;
  return { ...(theirs as Record<string, unknown>), ...Object.fromEntries(keys.map((k) => [k, m[k]])) } as T;
}

/* Prototype demos (?demo=…): `save-fails` makes the next save fail once; `other-admin` has James Reed save this tab 3 seconds later. */
let FAIL_NEXT = false;
const SAVED_BY = new Map<DraftKey, string>();
function theirEdit(k: DraftKey) {
  const s = useWorkspace.getState();
  SAVED_BY.set(k, 'James Reed');
  if (k === 'general') s.set('general', { ...s.general, name: 'Durham Accommodation' });
  if (k === 'payments') s.set('payments', { ...s.payments, deposit: 300 });
  if (k === 'branding') s.set('branding', { ...s.branding, sender: 'Durham Residences Office' });
  if (k === 'notifs') s.set('notifs', s.notifs.map((n, i) => (i === 0 ? { ...n, email: !n.email } : n)));
  toast(`James Reed saved ${TAB_NAME[k]}`, { description: 'Their change shows here. Anything you were editing is kept.' });
}

/**
 * Draft of a settings slice with Discard / Save in the header.
 * `check` returns field errors; any error blocks Save. Saves can fail (draft kept, Retry). If another admin saved since
 * the draft started, fields only they changed are kept, and a field both changed asks whose to keep. Leaving with
 * unsaved changes asks first.
 */
function useDraft<T>(key: DraftKey, value: T, save: (v: T) => void, msg: (prev: T, next: T) => string, check: (v: T) => Record<string, string | undefined> = () => ({})) {
  const [d, setD] = useState<T>(value);
  const [base, setBase] = useState<T>(value);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clash, setClash] = useState<{ keys: string[]; ours: string[]; by: string; theirs: T } | null>(null);
  const savingRef = useRef(false);
  const mine = !same(d, base);
  const live = useRef({ d, base, value });
  live.current = { d, base, value };
  /* Untouched, the form follows the saved settings, so another admin's save shows straight away. */
  /* Mid-edit, fields only they changed come in too; a field we both changed stays mine until Save asks. */
  useEffect(() => {
    const { d: cur, base: from } = live.current;
    if (same(cur, from)) { setD(value); setBase(value); return; }
    if (Array.isArray(value)) return;
    const ours = changed(from, cur);
    const take = changed(from, value).filter((k) => !ours.includes(k));
    if (take.length) { setD(merge(cur, value, take)); setBase(merge(from, value, take)); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(value)]);

  const [sp, setSp] = useSearchParams();
  useEffect(() => {
    const demo = sp.get('demo');
    if (demo !== 'save-fails' && demo !== 'other-admin') return;
    if (demo === 'save-fails') FAIL_NEXT = true; else window.setTimeout(() => theirEdit(key), 3000);
    setSp((p) => { const n = new URLSearchParams(p); n.delete('demo'); return n; }, { replace: true });
  }, [sp, setSp, key]);

  const all = Object.fromEntries(Object.entries(check(d)).filter(([, v]) => v)) as Record<string, string>;
  const err = mine || tried ? all : {};

  const write = (next: T, note?: string, done?: () => void, fail?: () => void) => {
    savingRef.current = true; setSaving(true);
    window.setTimeout(() => {
      savingRef.current = false; setSaving(false);
      if (FAIL_NEXT) {
        FAIL_NEXT = false; fail?.();
        toast.error('Couldn’t save · your changes are still here', { description: 'The connection dropped before it reached the server. Nothing changed.', duration: 10000, action: { label: 'Retry', onClick: () => { attempt(); } } });
        return;
      }
      const prev = live.current.value;
      save(next); setD(next); setBase(next); setTried(false); SAVED_BY.delete(key);
      toast.success(msg(prev, next), { description: note, action: { label: 'Undo', onClick: () => { save(prev); setD(prev); setBase(prev); } } });
      done?.();
    }, 700);
  };
  /** Starts a save; false when it was refused (errors, a clash, or already saving). */
  const attempt = (done?: () => void, fail?: () => void): boolean => {
    if (savingRef.current) return false;
    const { d: cur, base: from, value: saved } = live.current;
    const msgs = Object.values(check(cur)).filter(Boolean) as string[];
    if (msgs.length) { setTried(true); toast.error(msgs.length === 1 ? 'Fix this before saving' : `Fix ${msgs.length} things before saving`, { description: msgs[0] }); return false; }
    const theirs = changed(from, saved);
    const ours = changed(from, cur);
    const by = SAVED_BY.get(key) ?? 'Another admin';
    if (!theirs.length) { write(cur, undefined, done, fail); return true; }
    const both = ours.filter((k) => theirs.includes(k));
    if (both.length) { setClash({ keys: both, ours, by, theirs: saved }); return false; }
    write(merge(saved, cur, ours), `Kept ${by}’s change to ${theirs.map((k) => FIELD[k] ?? k).join(', ')}.`, done, fail);
    return true;
  };

  const blocker = useBlocker(({ currentLocation, nextLocation }) => mine && currentLocation.pathname !== nextLocation.pathname);
  /* The sidebar lights the clicked row before the route moves; a held navigation never moves, so put the light back. */
  useEffect(() => { if (blocker.state !== 'blocked') return; const t = window.setTimeout(() => usePins.setState({ pending: null }), 0); return () => window.clearTimeout(t); }, [blocker.state]);
  useBeforeUnload((e) => { if (!same(live.current.d, live.current.base)) e.preventDefault(); });
  const discard = () => { setD(value); setBase(value); setTried(false); };

  const actions = (
    <>
      {mine && <Button disabled={saving} onClick={discard}>Discard</Button>}
      <Button variant="primary" icon={Check} disabled={!mine || saving} onClick={() => { attempt(); }}>{saving ? 'Saving…' : 'Save'}</Button>
    </>
  );
  const dialogs = (
    <>
      <ODialog open={blocker.state === 'blocked'} onClose={() => !saving && blocker.reset?.()} title="Leave without saving?" sub={`Your changes to ${TAB_NAME[key]} aren’t saved.`}
        footer={<>
          <Button variant="danger-ghost" className="mr-auto" disabled={saving} onClick={() => { discard(); blocker.proceed?.(); }}>Discard changes</Button>
          <Button disabled={saving} onClick={() => blocker.reset?.()}>Stay</Button>
          <Button variant="primary" disabled={saving} onClick={() => { const b = blocker; if (!attempt(() => b.proceed?.(), () => b.reset?.())) b.reset?.(); }}>{saving ? 'Saving…' : 'Save and leave'}</Button>
        </>} />
      <ODialog open={!!clash} onClose={() => setClash(null)} title={clash ? `${clash.by} changed ${clash.keys.map((k) => FIELD[k] ?? k).join(', ')} while you were editing` : ''} sub="Pick which to keep. Your other changes stay in the form either way."
        footer={clash && <>
          <Button onClick={() => { const c = clash; setClash(null); setD(Array.isArray(c.theirs) ? c.theirs : merge(d, c.theirs, c.keys)); setBase(c.theirs); }}>Keep theirs</Button>
          <Button variant="primary" onClick={() => { const c = clash; setClash(null); write(merge(c.theirs, live.current.d, c.ours), `Replaced ${c.by}’s ${c.keys.map((k) => FIELD[k] ?? k).join(', ')}.`); }}>Save mine</Button>
        </>}>
        {clash && <div className="rounded-lg border border-line divide-y divide-line">{clash.keys.map((k) => (
          <div key={k} className="px-3 py-2.5 text-sm">
            <div className="font-medium text-[#0A0A0A]">{FIELD[k] ?? k}</div>
            <div className="mt-1 grid grid-cols-[64px_1fr] gap-x-2 gap-y-0.5 text-[#404040]"><span className="text-[#737373]">{clash.by.split(' ')[0]}</span><span className="truncate">{shown(parts(clash.theirs)[k])}</span><span className="text-[#737373]">You</span><span className="truncate">{shown(parts(d)[k])}</span></div>
          </div>
        ))}</div>}
      </ODialog>
    </>
  );
  return { d, setD, actions, dialogs, err };
}

/* ---------------- General (3054, 3040) ---------------- */
type GeneralDraft = General & Pick<Branding, 'logo' | 'colour'>;
export function SettingsGeneral() {
  const { general, branding, years, set } = useWorkspace();
  /* The logo and brand colour live in `branding` (emails, the booking site and the off-campus portal read them there);
     they are edited here with the rest of the organisation's identity. */
  const value: GeneralDraft = { ...general, logo: branding.logo, colour: branding.colour };
  const save = ({ logo, colour, ...g }: GeneralDraft) => {
    set('general', g);
    set('branding', (cur) => ({ ...cur, logo, colour }));
  };
  const { d, setD, actions, dialogs, err } = useDraft<GeneralDraft>('general', value, save, () => 'Settings saved · emails, the booking site and the off-campus portal use them now', (v) => ({
    name: v.name.trim() ? undefined : 'Name the organisation; residents see it on every email',
    short: v.short.trim() ? undefined : 'Add a short name for SMS and tight spaces',
    colour: /^#[0-9a-f]{6}$/i.test(v.colour) ? undefined : 'Use a hex colour like #68246D',
    quiet: v.quietFrom === v.quietTo ? 'Quiet hours need different start and end times' : undefined,
  }));
  const cur = years.find((y) => y.status === 'Current');
  const [archive, setArchive] = useState(false);
  const up = (p: Partial<GeneralDraft>) => setD({ ...d, ...p });
  const okColour = /^#[0-9a-f]{6}$/i.test(d.colour);
  const c = okColour ? d.colour : branding.colour;
  return (
    <Layout tab="general" title="General" actions={actions}>
      <Section title="Organisation" sub="Used on emails, the booking site and the off-campus portal">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label><Lbl>Name</Lbl><Input aria-invalid={!!err.name} className={bad(err.name)} value={d.name} onChange={(e) => up({ name: e.target.value })} /><Err>{err.name}</Err></label>
            <label><Lbl>Short name</Lbl><Input aria-invalid={!!err.short} className={bad(err.short)} value={d.short} onChange={(e) => up({ short: e.target.value })} /><Err>{err.short}</Err></label>
          </div>
          <div><Lbl>Logo</Lbl>
            <div className="flex items-center gap-3">
              <span className="size-12 rounded-lg text-white text-lg font-semibold flex items-center justify-center" style={{ background: c }}>D</span>
              <span className="flex-1"><span className="block text-sm text-[#0A0A0A]">{d.logo}</span><span className="block text-xs text-[#737373]">SVG or PNG, at least 256px</span></span>
              <Button size="sm" icon={UploadSimple} onClick={() => { up({ logo: 'durham-crest-2026.svg' }); toast('durham-crest-2026.svg uploaded', { description: 'Save to use it.' }); }}>Replace</Button>
            </div>
          </div>
          <div><Lbl>Brand colour</Lbl>
            <div className="flex items-center gap-2 max-w-[280px]">
              <label className="relative size-9 rounded-lg shrink-0 cursor-pointer" style={{ background: c }}><input type="color" aria-label="Pick brand colour" value={c} onChange={(e) => up({ colour: e.target.value.toUpperCase() })} className="absolute inset-0 opacity-0 cursor-pointer" /></label>
              <Input aria-label="Brand colour" aria-invalid={!!err.colour} className={cx('flex-1', bad(err.colour))} value={d.colour} onChange={(e) => up({ colour: e.target.value })} />
            </div>
            {/* A pale colour is allowed, but the admin is told white text on it will be hard to read. */}
            {err.colour ? <Err>{err.colour}</Err>
              : okColour && whiteOn(d.colour) < 4.5 ? <p role="status" className="flex items-start gap-1.5 text-xs leading-4 mt-1.5 text-[#B45309]"><Warning size={14} className="shrink-0" />White text on {d.colour.toUpperCase()} is {whiteOn(d.colour).toFixed(1)}:1, under the 4.5:1 emails and sites need.</p>
              : null}
          </div>
        </div>
      </Section>
      <Section title="Regional">
        <div className="grid grid-cols-3 gap-3">
          <div><Lbl>Timezone</Lbl><IconSelect icon={Globe} ariaLabel="Timezone" value={d.timezone} onChange={(v) => up({ timezone: v })} options={opts(['Europe/London (GMT+1)', 'Europe/Dublin (GMT+1)', 'UTC'])} /></div>
          <div><Lbl>Currency</Lbl><IconSelect icon={Money} ariaLabel="Currency" value={d.currency} onChange={(v) => up({ currency: v })} options={opts(['GBP · £', 'EUR · €'])} /></div>
          <div><Lbl>Week starts</Lbl><IconSelect icon={CalendarBlank} ariaLabel="Week starts" value={d.weekStarts} onChange={(v) => up({ weekStarts: v })} options={opts(['Monday', 'Sunday', 'Saturday'])} /></div>
        </div>
      </Section>
      {cur && (
        <Section title="Current academic year" sub="Default for Overview, Occupancy and Reports" action={<Link to="/settings/academic-year" className="inline-flex items-center h-6 text-sm text-primary hover:underline">Manage years</Link>}>
          <div className="grid grid-cols-3 gap-3">{([['Year', cur.name], ['Starts', cur.starts], ['Ends', cur.ends]] as const).map(([k, v]) => <div key={k}><Lbl>{k}</Lbl><div className="h-8 px-2.5 rounded-lg border border-line bg-gray-50 text-sm flex items-center">{v}</div></div>)}</div>
        </Section>
      )}
      <Section title="Quiet hours" sub="Only urgent notices go out">
        <div className="grid grid-cols-3 gap-3">
          <div><Lbl>From</Lbl><IconSelect icon={Moon} ariaLabel="Quiet hours from" value={d.quietFrom} onChange={(v) => up({ quietFrom: v })} options={opts(HOURS)} /></div>
          <div><Lbl>To</Lbl><IconSelect icon={Sun} ariaLabel="Quiet hours to" value={d.quietTo} onChange={(v) => up({ quietTo: v })} options={opts(HOURS)} /></div>
        </div>
        <Err>{err.quiet}</Err>
      </Section>
      <Section tone="red" title="Danger zone" sub="Only the workspace owner can do these">
        <div className="flex items-center gap-4 rounded-[10px] border border-line px-3.5 py-3">
          <div className="flex-1"><div className="text-sm font-medium text-[#0A0A0A]">Archive the workspace</div><div className="text-xs text-[#737373] mt-0.5">Stops sign-ins and portals; data is kept for 7 years</div></div>
          <Button variant="danger-outline" icon={Archive} onClick={() => setArchive(true)}>Archive</Button>
        </div>
      </Section>
      <ODialog open={archive} onClose={() => setArchive(false)} title={`Archive ${general.name}?`} sub="Everyone is signed out and the resident portals go offline. Data is kept for 7 years."
        footer={<><Button onClick={() => setArchive(false)}>Cancel</Button><Button variant="danger" onClick={() => { setArchive(false); toast.error('Only the workspace owner can archive it', { description: 'Ask support to transfer ownership first.' }); }}>Archive workspace</Button></>}>
        <Alert tone="red" icon={WarningCircle} title="This can’t be undone from here">Only support can restore an archived workspace.</Alert>
      </ODialog>
      {dialogs}
    </Layout>
  );
}

/* ---------------- Academic year (3055) ---------------- */
export function SettingsAcademicYear() {
  const { years, terms, set, restore } = useWorkspace();
  type TermDraft = Omit<Term, 'weeks'> & { weeks: string };
  const toDraft = (ts: Term[]): TermDraft[] => ts.map((t) => ({ ...t, weeks: String(t.weeks) }));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TermDraft[]>(toDraft(terms));
  const [termTried, setTermTried] = useState(false);
  /* null = closed; '' = adding; otherwise the id of the year being edited. */
  const [yearDlg, setYearDlg] = useState<string | null>(null);
  const [yTried, setYTried] = useState(false);
  const [ny, setNy] = useState({ name: '2028/29', starts: '16 Sep 2028', ends: '15 Jun 2029' });
  const busy = useRef(false);

  /* Every problem with one term, keyed by field. */
  const termErrs = (t: TermDraft) => {
    const s = parseDay(t.starts), e = parseDay(t.ends);
    return {
      starts: s ? undefined : `${t.name} start: ${NOT_A_DATE}`,
      ends: !e ? `${t.name} end: ${NOT_A_DATE}` : s && e <= s ? `${t.name} ends before it starts` : undefined,
      weeks: /^\d{1,2}$/.test(t.weeks.trim()) && +t.weeks >= 1 && +t.weeks <= 52 ? undefined : `${t.name} weeks: use a number from 1 to 52`,
      due: parseDay(`${t.due} 2027`) ? undefined : `${t.name} rent due: use a day like 1 Oct`,
    } as Record<'starts' | 'ends' | 'weeks' | 'due', string | undefined>;
  };
  const termMsgs = draft.flatMap((t) => Object.values(termErrs(t)).filter(Boolean) as string[]);
  const saveTerms = () => {
    if (termMsgs.length) { setTermTried(true); toast.error(termMsgs.length === 1 ? 'Fix this before saving' : `Fix ${termMsgs.length} things before saving`, { description: termMsgs[0] }); return; }
    const before = terms;
    set('terms', draft.map((t) => ({ ...t, weeks: +t.weeks }))); setEditing(false); setTermTried(false);
    toast.success('Terms saved', { description: 'Termly rent and term notices use the new dates.', action: { label: 'Undo', onClick: () => restore({ terms: before }) } });
  };

  /* The year dialog's problems: a name, real dates in order, and no overlap with another year. */
  const editingYear = yearDlg ? years.find((y) => y.id === yearDlg) : undefined;
  const yErr = (() => {
    const s = parseDay(ny.starts), e = parseDay(ny.ends);
    const others = years.filter((y) => y.id !== yearDlg);
    const clash = s && e ? others.find((y) => { const a = parseDay(y.starts), b = parseDay(y.ends); return a && b && s <= b && e >= a; }) : undefined;
    return {
      name: !ny.name.trim() ? 'Name the year, like 2028/29' : others.some((y) => y.name === ny.name.trim()) ? `${ny.name.trim()} already exists` : undefined,
      starts: s ? undefined : NOT_A_DATE,
      ends: !e ? NOT_A_DATE : s && e <= s ? 'It has to end after it starts' : clash ? `Overlaps ${clash.name} (${clash.starts} – ${clash.ends})` : undefined,
    };
  })();
  const yShow = yTried ? yErr : { name: undefined, starts: undefined, ends: undefined };
  const openYear = (y?: Year) => { busy.current = false; setYTried(false); setNy(y ? { name: y.name, starts: y.starts, ends: y.ends } : { name: '2028/29', starts: '16 Sep 2028', ends: '15 Jun 2029' }); setYearDlg(y ? y.id : ''); };
  const saveYear = () => {
    if (busy.current) return;
    if (yErr.name || yErr.starts || yErr.ends) { setYTried(true); return; }
    busy.current = true;
    const before = years;
    const v = { name: ny.name.trim(), starts: ny.starts.trim(), ends: ny.ends.trim() };
    if (editingYear) {
      set('years', (ys) => ys.map((y) => (y.id === editingYear.id ? { ...y, ...v } : y)));
      toast.success(`${v.name} updated`, { action: { label: 'Undo', onClick: () => restore({ years: before }) } });
    } else {
      set('years', (ys) => [{ id: `y${Date.now()}`, ...v, cycle: 'No cycle yet', status: 'Upcoming' }, ...ys]);
      toast.success(`${v.name} added`, { description: 'Set its terms, then open its allocation cycle.', action: { label: 'Undo', onClick: () => restore({ years: before }) } });
    }
    setYearDlg(null);
  };
  const deleteYear = (y: Year) => {
    const before = years;
    set('years', (ys) => ys.filter((x) => x.id !== y.id));
    toast.success(`${y.name} deleted`, { duration: 8000, action: { label: 'Undo', onClick: () => restore({ years: before }) } });
  };
  /* Only an upcoming year with no allocation cycle can go; the others carry bookings and reports. */
  const whyKeep = (y: Year) => (y.status !== 'Upcoming' ? `${y.status} years stay for reports` : y.cycle !== 'No cycle yet' ? 'It has an allocation cycle' : null);
  /* 3055:2: Upcoming blue + calendar, Current green + check, Ended grey + archive. */
  const tone = { Upcoming: 'blue', Current: 'green', Ended: 'grey' } as const;
  const yIcon = { Upcoming: CalendarBlank, Current: Check, Ended: Archive } as const;
  const { items: yearRows, bodyRef } = useRowMotion(years);
  return (
    <Layout tab="academic-year" title="Academic year"
      actions={<Button variant="primary" icon={Plus} onClick={() => openYear()}>New year</Button>}>
      <div className="rounded-xl border border-line overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-[#737373] border-b border-line">{['Year', 'Starts', 'Ends', 'Status', 'Allocation cycle', ''].map((h, i) => <th key={i} className={cx('text-left font-medium h-9 py-0 px-3', i === 0 && 'pl-5', i === 5 && 'w-12')}>{h}</th>)}</tr></thead>
          <tbody ref={bodyRef}>{yearRows.map(({ row: y, motion }) => (
            <tr key={y.id} {...rowAttrs(y.id, motion)} className="border-b border-[#F5F5F5] last:border-0 text-[#404040]">
              <td className="h-10 pl-5 font-medium text-[#0A0A0A]">{y.name}</td><td className="px-3">{y.starts}</td><td className="px-3">{y.ends}</td>
              <td className="px-3"><Pill tone={tone[y.status]} icon={yIcon[y.status]}>{y.status}</Pill></td>
              <td className="px-3">{y.cycle.includes('open') ? <Link to="/allocations/cycles" className="inline-flex items-center h-6 hover:underline">{y.cycle}</Link> : y.cycle}</td>
              <td className="pr-3 text-right"><RowMenu label={`More for ${y.name}`} items={[
                { label: 'Edit dates', icon: PencilSimple, onClick: () => openYear(y) },
                { label: whyKeep(y) ? `Delete · ${whyKeep(y)}` : 'Delete year', danger: true, disabled: !!whyKeep(y), onClick: () => deleteYear(y) },
              ]} /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <Section title="Terms in 2026/27"
        action={editing ? <div className="flex gap-2"><Button size="sm" onClick={() => { setDraft(toDraft(terms)); setEditing(false); setTermTried(false); }}>Cancel</Button><Button size="sm" variant="primary" onClick={saveTerms}>Save terms</Button></div>
          : <Button size="sm" icon={PencilSimple} onClick={() => { setDraft(toDraft(terms)); setEditing(true); }}>Edit terms</Button>}>
        <div className="rounded-xl border border-line overflow-hidden -mt-1">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-[#737373] border-b border-line">{['Term', 'Starts', 'Ends', 'Weeks', 'Rent due'].map((h, i) => <th key={h} className={cx('font-medium h-9 py-0 px-3', i === 0 && 'pl-5', 'text-left')}>{h}</th>)}</tr></thead>
          <tbody>{(editing ? draft : toDraft(terms)).map((t, i) => { const te = editing && termTried ? termErrs(t) : undefined; return (
            <tr key={t.id} className="border-b border-[#F5F5F5] last:border-0 text-[#404040]">
              <td className="h-10 pl-5 pr-3 font-medium text-[#0A0A0A]">{t.name}</td>
              {(['starts', 'ends', 'weeks', 'due'] as const).map((k) => (
                <td key={k} className={cx('px-3', k === 'weeks' && 'tabular-nums')}>{editing ? <Input aria-label={`${t.name} ${k}`} aria-invalid={!!te?.[k]} className={cx('h-8 w-32', bad(te?.[k]))} value={t[k]} onChange={(e) => setDraft(draft.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} /> : t[k]}</td>
              ))}
            </tr>
          ); })}</tbody>
        </table>
        </div>
        {editing && termTried && termMsgs.length > 0 && <div role="alert" className="mt-2 space-y-1">{termMsgs.map((m) => <p key={m} className="text-xs leading-4 text-[#E0243A]">{m}</p>)}</div>}
      </Section>
      <Alert tone="blue" icon={Info} title="2027/28 becomes current on 1 Sep 2027">Until then it is used only by the 2027/28 allocation cycle.</Alert>
      <ODialog open={yearDlg !== null} onClose={() => setYearDlg(null)} title={editingYear ? `Edit ${editingYear.name}` : 'New academic year'} sub={editingYear ? 'Reports and Occupancy use the new dates.' : 'It becomes current on its start date.'}
        footer={<><Button onClick={() => setYearDlg(null)}>Cancel</Button><Button variant="primary" onClick={saveYear}>{editingYear ? 'Save year' : 'Add year'}</Button></>}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); saveYear(); }}>
          <label className="block"><Lbl>Year</Lbl><Input aria-invalid={!!yShow.name} className={bad(yShow.name)} value={ny.name} onChange={(e) => setNy({ ...ny, name: e.target.value })} /><Err>{yShow.name}</Err></label>
          <div className="grid grid-cols-2 gap-3 items-start">
            <label><Lbl>Starts</Lbl><Input aria-invalid={!!yShow.starts} className={bad(yShow.starts)} value={ny.starts} placeholder="16 Sep 2028" onChange={(e) => setNy({ ...ny, starts: e.target.value })} /><Err>{yShow.starts}</Err></label>
            <label><Lbl>Ends</Lbl><Input aria-invalid={!!yShow.ends} className={bad(yShow.ends)} value={ny.ends} placeholder="15 Jun 2029" onChange={(e) => setNy({ ...ny, ends: e.target.value })} /><Err>{yShow.ends}</Err></label>
          </div>
          <button type="submit" hidden />
        </form>
      </ODialog>
    </Layout>
  );
}

/* ---------------- Notifications (3056, 3041, 3042) ---------------- */
export function SettingsNotifications() {
  const { notifs, set } = useWorkspace();
  const { d, setD, actions, dialogs } = useDraft<NotifRow[]>('notifs', notifs, (v) => set('notifs', v), (prev, next) => {
    const added = next.filter((n) => n.sms && !prev.find((p) => p.id === n.id)?.sms).map((n) => n.event.toLowerCase());
    return added.length ? `Notifications saved · ${added.join(', ')} now also by SMS` : 'Notifications saved';
  });
  const tog = (id: string, k: 'app' | 'email' | 'sms') => setD(d.map((n) => (n.id === id ? { ...n, [k]: !n[k] } : n)));
  return (
    <Layout tab="notifications" title="Notifications" actions={actions}>
      {/* 3056:2: table card (#FAFAFA 40px header), 52px rows, green toggles per channel; blue note with a phone icon below. */}
      <div className="rounded-xl border border-line overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-[#737373] border-b border-line bg-[#FAFAFA]"><th className="text-left font-medium h-10 py-0 pl-4">Event</th>{['In the app', 'Email', 'SMS'].map((h) => <th key={h} className="font-medium w-[90px] py-0 text-center">{h}</th>)}</tr></thead>
          <tbody>{d.map((n) => (
            <tr key={n.id} className="border-b border-[#F5F5F5] last:border-0">
              <td className="h-[52px] pl-4"><div className="font-medium text-[#0A0A0A] leading-[18px]">{n.event}</div><div className="text-xs leading-4 text-[#737373]">{n.sub}</div></td>
              {(['app', 'email', 'sms'] as const).map((k) => (
                <td key={k} className="text-center"><span className="inline-flex"><Switch checked={n[k]} onChange={() => tog(n.id, k)} label={`${n.event}: ${k}`} /></span></td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <Alert tone="blue" icon={DeviceMobile} title="SMS goes to +44 7700 900118">Only urgent maintenance can send SMS during quiet hours.</Alert>
      {dialogs}
    </Layout>
  );
}

/* ---------------- Payments (3059) ---------------- */
export function SettingsPayments() {
  const { payments, set } = useWorkspace();
  const { d, setD, actions, dialogs, err } = useDraft<Payments>('payments', payments, (v) => set('payments', v), () => 'Payment settings saved · new tenancies use them', (v) => ({
    methods: v.methods.card || v.methods.bank || v.methods.dd ? undefined : 'Residents need at least one way to pay',
    deposit: v.deposit > 5000 ? `£${v.deposit.toLocaleString('en-GB')} is above the £5,000 limit. Check the amount.` : undefined,
  }));
  const [manage, setManage] = useState(false);
  const up = (p: Partial<Payments>) => setD({ ...d, ...p });
  const methods = [['card', 'Card', CreditCard], ['bank', 'Bank transfer', Bank], ['dd', 'Direct Debit', ArrowsLeftRight]] as const;
  const rules = [['remind', 'Remind 7 days before rent is due', 'Email and the resident portal'], ['arrears', 'Flag arrears after 14 days', 'Shows in Residents and stops room swaps'], ['lateFee', 'Charge a late fee', d.lateFee ? '£25 after 14 days in arrears' : 'Off: Durham doesn’t charge late fees']] as const;
  return (
    <Layout tab="payments" title="Payments" actions={actions}>
      <Section title="Provider">
        <div className="rounded-[10px] border border-line px-3.5 h-[60px] flex items-center gap-3">
          <BrandTile id="stripe" />
          <div className="flex-1"><div className="text-sm font-medium text-[#0A0A0A]">Stripe</div><div className="text-xs text-[#737373] mt-0.5">Connected 2 Aug 2026 · payouts to Durham Residences ••4410 · weekly</div></div>
          <Pill tone="green" icon={Check}>Connected</Pill>
          <Button size="sm" icon={ArrowUpRight} onClick={() => setManage(true)}>Manage</Button>
        </div>
      </Section>
      <Section title="How residents can pay">
        <div className="grid grid-cols-3 gap-2">{methods.map(([k, l, I]) => (
          <div key={k} className="h-10 px-3 rounded-[10px] border border-line flex items-center gap-2.5 text-sm text-[#0A0A0A]">
            <I size={16} className="text-gray-500" /><span className="flex-1">{l}</span><Switch checked={d.methods[k]} onChange={(v) => up({ methods: { ...d.methods, [k]: v } })} label={l} />
          </div>
        ))}</div>
        <Err>{err.methods}</Err>
      </Section>
      <Section title="Rent" sub="A room type can override these">
        <div className="grid grid-cols-3 gap-3">
          <div><Lbl>Billed</Lbl><IconSelect icon={CalendarBlank} ariaLabel="Billed" value={d.billed} onChange={(v) => up({ billed: v })} options={opts(['Termly, in advance', 'Monthly', 'Weekly', 'Whole year up front'])} /></div>
          <div><Lbl>Due</Lbl><IconSelect icon={CalendarBlank} ariaLabel="Due" value={d.due} onChange={(v) => up({ due: v })} options={opts(['Before each term starts', 'On the 1st', 'On move-in'])} /></div>
          <label><Lbl>Deposit</Lbl><span className="relative flex items-center"><Money size={14} className="absolute left-2.5 text-gray-500 pointer-events-none" /><span className="absolute left-8 text-sm text-[#0A0A0A] pointer-events-none">£</span><Input aria-invalid={!!err.deposit} className={cx('pl-[42px]', bad(err.deposit))} inputMode="numeric" value={String(d.deposit)} onChange={(e) => up({ deposit: Number(e.target.value.replace(/\D/g, '').slice(0, 9)) || 0 })} /></span><Err>{err.deposit}</Err></label>
        </div>
      </Section>
      <Section title="Reminders and arrears" sub="Sent outside quiet hours">
        <div className="space-y-2">{rules.map(([k, t, s]) => (
          <div key={k} className="px-3.5 h-[60px] rounded-[10px] border border-line flex items-center gap-3"><div className="flex-1"><div className="text-sm font-medium text-[#0A0A0A]">{t}</div><div className="text-xs text-[#737373]">{s}</div></div><Switch checked={d[k]} onChange={(v) => up({ [k]: v })} label={t} /></div>
        ))}</div>
      </Section>
      <ODialog open={manage} onClose={() => setManage(false)} title="Stripe" sub="Card payments and payouts to the operator account."
        footer={<><Button variant="danger-ghost" className="mr-auto" onClick={() => { setManage(false); toast.error('Disconnecting Stripe stops card payments', { description: 'Ask Finance (James Reed) to do this.' }); }}>Disconnect</Button><Button variant="primary" onClick={() => { setManage(false); toast('Opening the Stripe dashboard', { description: 'It opens in a new tab in the real product.' }); }}>Open Stripe</Button></>}>
        <DL rows={[['Account', 'Durham Residences'], ['Connected', '2 Aug 2026 by James Reed'], ['Payouts', 'Weekly to ••4410'], ['Last payout', '£184,220 on 11 Sep']]} />
      </ODialog>
      {dialogs}
    </Layout>
  );
}

/* ---------------- Integrations (3060, E3 3233–3234) ---------------- */
const INT_ICON: Record<string, Icon> = { sits: GraduationCap, entra: Key, salto: DoorOpen, xero: Calculator, slack: ChatCenteredText, webhooks: WebhooksLogo };
/** 3060:2 icon tiles: [ground, icon]. */
const INT_TINT: Record<string, [string, string]> = { sits: ['#F3EEFF', '#6E3BD8'], entra: ['#EFF6FF', '#2563EB'], salto: ['#E6F6F6', '#0E7A80'], xero: ['#E8F7EE', '#0B8A4C'], slack: ['#FDECF4', '#C0266D'], webhooks: ['#F5F5F5', '#737373'] };
const SKIPPED = [['Leo Grant', '000412883'], ['Amara Okafor', '000413207'], ['Finn Walker', '000415560']];
export function SettingsIntegrations() {
  const { integrations, set, restore } = useWorkspace();
  const [sp, setSp] = useSearchParams();
  const [reconnect, setReconnect] = useState(false);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState(false);
  const [open, setOpen] = useState<Integration | null>(null);
  const [off, setOff] = useState<Integration | null>(null);
  const guard = useRef(false);
  const disconnect = (x: Integration) => {
    const before = useWorkspace.getState().integrations;
    set('integrations', (xs) => xs.map((y) => (y.id === x.id ? { ...y, state: 'available' as const, meta: '' } : y)));
    setOff(null);
    toast.success(`${x.name} disconnected`, { duration: 8000, action: { label: 'Undo', onClick: () => restore({ integrations: before }) } });
  };
  useEffect(() => {
    if (sp.get('demo') === 'sits-failing') {
      set('integrations', (xs) => xs.map((x) => (x.id === 'sits' ? { ...x, state: 'failing' as const, meta: 'Last synced 30 Oct, 02:00' } : x)));
      setSp((p) => { const n = new URLSearchParams(p); n.delete('demo'); return n; }, { replace: true });
    }
  }, [sp, setSp, set]);
  const sits = integrations.find((x) => x.id === 'sits');
  const failing = sits?.state === 'failing';
  const doReconnect = () => {
    if (guard.current) return; guard.current = true; setBusy(true);
    const before = useWorkspace.getState().integrations;
    window.setTimeout(() => {
      set('integrations', (xs) => xs.map((x) => (x.id === 'sits' ? { ...x, state: 'connected' as const, meta: 'Synced just now · 41 new residents' } : x)));
      setBusy(false); setReconnect(false); guard.current = false;
      toast.success('SITS reconnected · 41 residents synced · 6 applications matched', { action: { label: 'Undo', onClick: () => restore({ integrations: before }) } });
    }, 1200);
  };
  const connect = (x: Integration) => {
    set('integrations', (xs) => xs.map((y) => (y.id === x.id ? { ...y, state: 'connected' as const, meta: 'Connected just now' } : y)));
    setOpen(null); toast.success(`${x.name} connected`);
  };
  return (
    <Layout wide tab="integrations" title="Integrations">
      {failing && (
        <Alert tone="red" icon={WarningCircle} title="Resident records (SITS) stopped syncing" action={<Button variant="primary" size="sm" onClick={() => setReconnect(true)}>Reconnect</Button>}>
          The connection token expired on 30 Oct. 3 syncs failed; 41 new residents aren’t in Applications yet.
        </Alert>
      )}
      {/* 3060:2: one grid of six cards (connected first), each with a tinted 32px icon tile, title + meta, Connected pill top right,
          13px description and a sm Manage (sliders) or Connect (plug) button; the amber sync note sits under the grid. */}
      <div className="grid grid-cols-3 gap-4">
        {integrations.map((x) => { const I = INT_ICON[x.id] ?? Plug; const t = INT_TINT[x.id] ?? INT_TINT.webhooks; const on = x.state !== 'available'; return (
          <div key={x.id} className={cx('rounded-xl border bg-white p-4 flex flex-col', x.state === 'failing' ? 'border-[#E0243A4D]' : 'border-line')}>
            <div className="flex items-start gap-3">
              {BRAND[x.id] ? <BrandTile id={x.id} /> : <span className="size-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: t[0] }}><I size={16} style={{ color: t[1] }} /></span>}
              <span className={cx('flex-1 min-w-0', !on && 'self-center')}><span className="block text-sm leading-5 font-medium text-[#0A0A0A]">{x.name}</span>{on && x.meta && <span className="block text-xs leading-4 text-[#737373] mt-0.5">{x.meta}</span>}</span>
              {on && (x.state === 'failing' ? <Pill tone="red" icon={Warning}>Failing</Pill> : <Pill tone="green" icon={Check}>Connected</Pill>)}
            </div>
            <p className="text-xs leading-4 text-[#737373] mt-3 flex-1">{x.desc}</p>
            <div className="mt-3">{x.state === 'failing' ? <Button size="sm" variant="primary" className="w-[112px]" onClick={() => setReconnect(true)}>Reconnect</Button> : on ? <Button size="sm" icon={SlidersHorizontal} className="w-[112px]" onClick={() => setOpen(x)}>Manage</Button> : <Button size="sm" icon={Plug} className="w-[112px]" onClick={() => setOpen(x)}>Connect</Button>}</div>
          </div>
        ); })}
      </div>
      {!failing && sits?.meta === 'Synced 12 min ago' && (
        <Alert tone="amber" icon={Warning} title="SITS sync skipped 3 residents last night" action={<Button size="sm" onClick={() => setLog(true)}>Open log</Button>}>Their course record has no term address. Open the sync log to see who.</Alert>
      )}

      <ODialog open={reconnect} onClose={() => !busy && setReconnect(false)} title="Reconnect Resident records (SITS)" sub="Sign in with a SITS admin account to run the missed syncs."
        footer={<><Button disabled={busy} onClick={() => setReconnect(false)}>Cancel</Button><Button variant="primary" disabled={busy} onClick={doReconnect}>{busy ? 'Syncing…' : 'Sign in to SITS'}</Button></>}>
        <DL rows={[['Failed since', '30 Oct, 02:00'], ['Failed syncs', '3'], ['Affects', '41 new residents aren’t in Applications']]} />
      </ODialog>
      <ODialog open={log} onClose={() => setLog(false)} title="SITS sync log · last night" sub="02:00 · 2,412 residents checked · 3 skipped" footer={<Button variant="primary" onClick={() => setLog(false)}>Done</Button>}>
        <div className="rounded-lg border border-line divide-y divide-line">{SKIPPED.map(([n, id]) => (
          <div key={id} className="h-11 px-3 flex items-center gap-3 text-sm"><span className="font-medium flex-1">{n}</span><span className="text-[#737373] tabular-nums">{id}</span><Pill tone="amber">No term address</Pill></div>
        ))}</div>
        <p className="text-xs text-[#737373] mt-3">Fix the address in SITS; tonight’s sync picks them up.</p>
      </ODialog>
      <ODialog open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ''} sub={open?.desc}
        footer={open?.state === 'available'
          ? <><Button onClick={() => setOpen(null)}>Cancel</Button><Button variant="primary" onClick={() => open && connect(open)}>Connect {open?.name}</Button></>
          : <><Button variant="danger-ghost" className="mr-auto" onClick={() => { setOff(open); setOpen(null); }}>Disconnect</Button>
            <Button onClick={() => { const x = open!; set('integrations', (xs) => xs.map((y) => (y.id === x.id ? { ...y, meta: x.id === 'sits' ? 'Synced just now' : y.meta } : y))); setOpen(null); toast.success(`${x.name} synced`); }}>Sync now</Button>
            <Button variant="primary" onClick={() => setOpen(null)}>Done</Button></>}>
        {open?.state === 'available' ? <p className="text-sm text-[#737373]">You’ll sign in to {open.name} and pick what to share. You can disconnect at any time.</p>
          : open && <DL rows={[['Status', 'Connected'], ['Last activity', open.meta], ['Connected by', 'Priya Shah']]} />}
      </ODialog>
      <ODialog open={!!off} onClose={() => setOff(null)} title={`Disconnect ${off?.name ?? ''}?`} sub={off ? `What stops: ${off.desc.charAt(0).toLowerCase()}${off.desc.slice(1)}. Reconnecting needs an admin sign-in.` : undefined}
        footer={<><Button onClick={() => setOff(null)}>Cancel</Button><Button variant="danger" onClick={() => off && disconnect(off)}>Disconnect</Button></>} />
    </Layout>
  );
}

/* ---------------- Emails (3061) ---------------- */
type EmailFields = Pick<Branding, 'sender' | 'replyTo' | 'footer'>;
export function SettingsEmails() {
  const { branding, general, set } = useWorkspace();
  const value: EmailFields = { sender: branding.sender, replyTo: branding.replyTo, footer: branding.footer };
  /* Only the email fields: the logo and colour are shared and edited in General, so saving here never overwrites them. */
  const { d, setD, actions, dialogs, err } = useDraft<EmailFields>('branding', value, (v) => set('branding', (cur) => ({ ...cur, ...v })), () => 'Email settings saved · new emails use them now', (v) => ({
    sender: v.sender.trim() ? undefined : 'Add the name residents see in their inbox',
    replyTo: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.replyTo.trim()) ? undefined : 'Use a full email like residences@durham.ac.uk',
  }));
  const up = (p: Partial<EmailFields>) => setD({ ...d, ...p });
  const c = branding.colour;
  return (
    <Layout wide tab="emails" title="Emails" actions={actions}>
      <div className="grid grid-cols-[1fr_400px] gap-5 items-start">
        {/* 3061:2: plain labelled fields (14px medium label, 16px gaps); reply-to with a mail icon. Logo and colour come from General. */}
        <div className="space-y-4">
          <div><Lbl>Logo and brand colour</Lbl><SharedBrand linkLabel="Change in General" /></div>
          <label className="block"><Lbl>Email sender name</Lbl><Input aria-invalid={!!err.sender} className={bad(err.sender)} value={d.sender} onChange={(e) => up({ sender: e.target.value })} /><Err>{err.sender}</Err></label>
          <label className="block"><Lbl>Reply-to</Lbl><span className="relative flex items-center"><EnvelopeSimple size={14} className="absolute left-2.5 text-gray-500 pointer-events-none" /><Input aria-invalid={!!err.replyTo} className={cx('pl-8', bad(err.replyTo))} type="email" value={d.replyTo} onChange={(e) => up({ replyTo: e.target.value })} /></span><Err>{err.replyTo}</Err></label>
          <label className="block"><Lbl>Email footer</Lbl><Textarea value={d.footer} onChange={(e) => up({ footer: e.target.value })} /></label>
        </div>
        <div className="rounded-xl border border-line bg-[#FAFAFA] p-4 sticky top-0">
          <div className="text-xs text-[#737373] mb-3">Email preview</div>
          <div className="rounded-lg bg-white border border-line overflow-hidden">
            <div className="h-12 px-3.5 flex items-center gap-2.5" style={{ background: c }}><span className="size-5 rounded bg-white text-[11px] font-semibold flex items-center justify-center" style={{ color: c }}>D</span><span className="text-xs font-semibold text-white">{d.sender || general.name}</span></div>
            <div className="p-3.5">
              <div className="text-sm font-semibold text-[#0A0A0A]">Your rent for Epiphany term is due</div>
              <p className="text-xs text-[#404040] mt-2 leading-[17px]">Hi Amira, £2,180 is due on 5 January. Pay in the resident portal by card or bank transfer.</p>
              <span className="inline-flex mt-3 h-7 px-3 rounded-md text-xs font-medium text-white items-center" style={{ background: c }}>Pay now</span>
            </div>
            <div className="px-3.5 py-3 border-t border-[#F5F5F5] text-xs leading-4 text-[#737373] whitespace-pre-line">{d.footer.split('\n')[0]}</div>
          </div>
        </div>
      </div>
      {dialogs}
    </Layout>
  );
}
