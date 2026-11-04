// Workspace › Settings. Figma Flow 9 (3040–3042), tabs 3054/3055/3056/3059/3060/3061, E3 integration stops syncing (3232–3234).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { rowAttrs, useRowMotion } from '../../components/rowMotion';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Archive, EnvelopeSimple, PencilSimple, DotsThree, ArrowUpRight, Calculator, ChatCenteredText, Key, SlidersHorizontal, ArrowsLeftRight, DeviceMobile, Bank, Bell, CalendarBlank, Check, Globe, Money, Moon, Sun, CreditCard, DoorOpen, Gear, GraduationCap, Info, Palette, Plug, Plus, Textbox, TreeStructure,
  UploadSimple, Warning, WarningCircle, WebhooksLogo, type Icon,
} from '../../components/icons';
import { toast } from 'sonner';
import { Button, DL, Input, Pill, Switch, Textarea, cx } from '../../components/ui';
import { BRAND, BrandTile } from '../../components/brandLogos';
import { useWorkspace, type Branding, type General, type Integration, type NotifRow, type Payments } from '../../data/workspace';
import { Alert, Header, IconSelect, ODialog } from '../org/parts';

const TABS: { id: string; label: string; to: string; icon: Icon; external?: boolean }[] = [
  { id: 'general', label: 'General', to: '/settings', icon: Gear },
  { id: 'academic-year', label: 'Academic year', to: '/settings/academic-year', icon: GraduationCap },
  { id: 'notifications', label: 'Notifications', to: '/settings/notifications', icon: Bell },
  { id: 'structures', label: 'Structures', to: '/inventory/structures', icon: TreeStructure, external: true },
  { id: 'custom-fields', label: 'Custom fields', to: '/inventory/custom-fields', icon: Textbox, external: true },
  { id: 'payments', label: 'Payments', to: '/settings/payments', icon: CreditCard },
  { id: 'integrations', label: 'Integrations', to: '/settings/integrations', icon: Plug },
  { id: 'branding', label: 'Branding', to: '/settings/branding', icon: Palette },
];

function Layout({ tab, title, sub, actions, children, wide }: { tab: string; title: string; sub: string; actions?: ReactNode; children: ReactNode; wide?: boolean }) {
  const t = TABS.find((x) => x.id === tab)!;
  return (
    <>
      <Header icon={t.icon} crumbs={[{ label: 'Settings', to: '/settings' }]} title={t.label}>{actions}</Header>
      {/* The design's in-page tab rail is the sidebar panel's job in this shell, so it isn't repeated here. */}
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 overflow-auto">
          <div className={cx('px-8 py-6 pb-12', wide ? 'max-w-[1080px]' : 'max-w-[820px]')}>
            <h2 className="text-base leading-6 font-semibold text-[#111827]">{title}</h2>
            <p className="text-sm leading-5 text-[#646A78] mt-1">{sub}</p>
            <div className="mt-6 space-y-7">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ title, sub, children, action, tone }: { title: string; sub?: ReactNode; children?: ReactNode; action?: ReactNode; tone?: 'red' }) {
  return (
    /* 3054:2: no card; 14px semibold title, 12px #646A78 sub, fields 16px below. `tone` kept for callers; the frame's Danger zone title is ink too. */
    <section data-tone={tone}>
      <div className="flex items-start gap-3">
        <div className="flex-1"><h3 className="text-sm leading-5 font-semibold text-[#111827]">{title}</h3>{sub && <p className="text-xs leading-4 text-[#646A78] mt-0.5">{sub}</p>}</div>{action}
      </div>
      {children && <div className="pt-4">{children}</div>}
    </section>
  );
}
const Lbl = ({ children }: { children: ReactNode }) => <div className="text-sm leading-5 font-medium text-[#111827] mb-1.5">{children}</div>;
const opts = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));
const HOURS = ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '06:00', '07:00', '08:00', '09:00'];

/** Draft of a settings slice with Discard / Save in the header. */
function useDraft<T>(value: T, save: (v: T) => void, msg: (prev: T, next: T) => string) {
  const [d, setD] = useState<T>(value);
  const dirty = JSON.stringify(d) !== JSON.stringify(value);
  const busy = useRef(false);
  const actions = (
    <>
      <Button disabled={!dirty} onClick={() => setD(value)}>Discard</Button>
      <Button variant="primary" icon={Check} disabled={!dirty} onClick={() => {
        if (busy.current) return; busy.current = true;
        const prev = value; save(d);
        toast.success(msg(prev, d), { action: { label: 'Undo', onClick: () => { save(prev); setD(prev); } } });
        window.setTimeout(() => { busy.current = false; }, 300);
      }}>Save</Button>
    </>
  );
  return { d, setD, actions };
}

/* ---------------- General (3054, 3040) ---------------- */
export function SettingsGeneral() {
  const { general, years, set } = useWorkspace();
  const { d, setD, actions } = useDraft<General>(general, (v) => set('general', v), () => 'Settings saved · every screen and scheduled send uses them now');
  const cur = years.find((y) => y.status === 'Current');
  const [archive, setArchive] = useState(false);
  const up = (p: Partial<General>) => setD({ ...d, ...p });
  return (
    <Layout tab="general" title="General" sub="What applies to the whole workspace." actions={actions}>
      <Section title="Organisation" sub="Shown to residents in emails and the portal">
        <div className="grid grid-cols-2 gap-3">
          <label><Lbl>Name</Lbl><Input value={d.name} onChange={(e) => up({ name: e.target.value })} /></label>
          <label><Lbl>Short name</Lbl><Input value={d.short} onChange={(e) => up({ short: e.target.value })} /></label>
        </div>
      </Section>
      <Section title="Regional" sub="Used for dates, rent and every scheduled send">
        <div className="grid grid-cols-3 gap-3">
          <div><Lbl>Timezone</Lbl><IconSelect icon={Globe} ariaLabel="Timezone" value={d.timezone} onChange={(v) => up({ timezone: v })} options={opts(['Europe/London (GMT+1)', 'Europe/Dublin (GMT+1)', 'UTC'])} /></div>
          <div><Lbl>Currency</Lbl><IconSelect icon={Money} ariaLabel="Currency" value={d.currency} onChange={(v) => up({ currency: v })} options={opts(['GBP · £', 'EUR · €'])} /></div>
          <div><Lbl>Week starts</Lbl><IconSelect icon={CalendarBlank} ariaLabel="Week starts" value={d.weekStarts} onChange={(v) => up({ weekStarts: v })} options={opts(['Monday', 'Sunday', 'Saturday'])} /></div>
        </div>
      </Section>
      {cur && (
        <Section title="Current academic year" sub="Sets what Overview, Occupancy and Reports show by default" action={<Link to="/settings/academic-year" className="text-sm text-primary hover:underline">Manage years</Link>}>
          <div className="grid grid-cols-3 gap-3">{([['Year', cur.name], ['Starts', cur.starts], ['Ends', cur.ends]] as const).map(([k, v]) => <div key={k}><Lbl>{k}</Lbl><div className="h-8 px-2.5 rounded-lg border border-line bg-gray-50 text-sm flex items-center">{v}</div></div>)}</div>
        </Section>
      )}
      <Section title="Quiet hours" sub="No notices or reminders go out in this window unless urgent">
        <div className="grid grid-cols-3 gap-3">
          <div><Lbl>From</Lbl><IconSelect icon={Moon} ariaLabel="Quiet hours from" value={d.quietFrom} onChange={(v) => up({ quietFrom: v })} options={opts(HOURS)} /></div>
          <div><Lbl>To</Lbl><IconSelect icon={Sun} ariaLabel="Quiet hours to" value={d.quietTo} onChange={(v) => up({ quietTo: v })} options={opts(HOURS)} /></div>
        </div>
      </Section>
      <Section tone="red" title="Danger zone" sub="Only the workspace owner can do these">
        <div className="flex items-center gap-4 rounded-[10px] border border-line px-3.5 py-3">
          <div className="flex-1"><div className="text-sm font-medium text-[#111827]">Archive the workspace</div><div className="text-xs text-[#646A78] mt-0.5">Stops sign-ins and portals; data is kept for 7 years</div></div>
          <Button variant="danger-outline" icon={Archive} onClick={() => setArchive(true)}>Archive</Button>
        </div>
      </Section>
      <ODialog open={archive} onClose={() => setArchive(false)} title="Archive Durham University Residences?" sub="Everyone is signed out and the student and resident portals go offline. Data is kept for 7 years."
        footer={<><Button onClick={() => setArchive(false)}>Cancel</Button><Button variant="danger" onClick={() => { setArchive(false); toast.error('Only the workspace owner can archive it', { description: 'Ask Amber support to transfer ownership first.' }); }}>Archive workspace</Button></>}>
        <Alert tone="red" icon={WarningCircle} title="This can’t be undone from here">Only Amber support can restore an archived workspace.</Alert>
      </ODialog>
    </Layout>
  );
}

/* ---------------- Academic year (3055) ---------------- */
export function SettingsAcademicYear() {
  const { years, terms, set } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(terms);
  const [adding, setAdding] = useState(false);
  const [ny, setNy] = useState({ name: '2028/29', starts: '16 Sep 2028', ends: '15 Jun 2029' });
  const busy = useRef(false);
  /* 3055:2: Upcoming blue + calendar, Current green + check, Ended grey + archive. */
  const tone = { Upcoming: 'blue', Current: 'green', Ended: 'grey' } as const;
  const yIcon = { Upcoming: CalendarBlank, Current: Check, Ended: Archive } as const;
  const { items: yearRows, bodyRef } = useRowMotion(years);
  return (
    <Layout tab="academic-year" title="Academic year" sub="Years and terms. Overview, Occupancy and Reports open on the current year; tenancies and cycles hang off a year."
      actions={<Button variant="primary" icon={Plus} onClick={() => { busy.current = false; setAdding(true); }}>New year</Button>}>
      <div className="rounded-xl border border-line overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-[#646A78] border-b border-line">{['Year', 'Starts', 'Ends', 'Status', 'Allocation cycle', ''].map((h, i) => <th key={i} className={cx('text-left font-medium h-9 px-3', i === 0 && 'pl-5', i === 5 && 'w-12')}>{h}</th>)}</tr></thead>
          <tbody ref={bodyRef}>{yearRows.map(({ row: y, motion }) => (
            <tr key={y.id} {...rowAttrs(y.id, motion)} className="border-b border-[#F3F4F6] last:border-0 text-[#374151]">
              <td className="h-10 pl-5 font-semibold text-[#111827]">{y.name}</td><td className="px-3">{y.starts}</td><td className="px-3">{y.ends}</td>
              <td className="px-3"><Pill tone={tone[y.status]} icon={yIcon[y.status]}>{y.status}</Pill></td>
              <td className="px-3">{y.cycle.includes('open') ? <Link to="/allocations/cycles" className="hover:underline">{y.cycle}</Link> : y.cycle}</td>
              <td className="pr-3 text-right"><button type="button" aria-label={`More for ${y.name}`} onClick={() => toast(`${y.name}`, { description: `${y.starts} – ${y.ends}` })} className="size-7 rounded-lg text-gray-500 hover:bg-gray-100 inline-flex items-center justify-center"><DotsThree size={16} weight="bold" /></button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <Section title="Terms in 2026/27" sub="Used for termly rent and for notices that go out at the start of a term"
        action={editing ? <div className="flex gap-2"><Button size="sm" onClick={() => { setDraft(terms); setEditing(false); }}>Cancel</Button><Button size="sm" variant="primary" onClick={() => { set('terms', draft); setEditing(false); toast.success('Terms saved', { description: 'Termly rent and term notices use the new dates.' }); }}>Save terms</Button></div>
          : <Button size="sm" icon={PencilSimple} onClick={() => { setDraft(terms); setEditing(true); }}>Edit terms</Button>}>
        <div className="rounded-xl border border-line overflow-hidden -mt-1">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-[#646A78] border-b border-line">{['Term', 'Starts', 'Ends', 'Weeks', 'Rent due'].map((h, i) => <th key={h} className={cx('font-medium h-9 px-3', i === 0 && 'pl-5', i === 3 ? 'text-right' : 'text-left')}>{h}</th>)}</tr></thead>
          <tbody>{(editing ? draft : terms).map((t, i) => (
            <tr key={t.id} className="border-b border-[#F3F4F6] last:border-0 text-[#374151]">
              <td className="h-10 pl-5 pr-3 font-medium text-[#111827]">{t.name}</td>
              {(['starts', 'ends', 'weeks', 'due'] as const).map((k) => (
                <td key={k} className={cx('px-3', k === 'weeks' && 'text-right tabular-nums')}>{editing ? <Input aria-label={`${t.name} ${k}`} className="h-8 w-32" value={String(t[k])} onChange={(e) => setDraft(draft.map((x, j) => (j === i ? { ...x, [k]: k === 'weeks' ? Number(e.target.value) || 0 : e.target.value } : x)))} /> : t[k]}</td>
              ))}
            </tr>
          ))}</tbody>
        </table>
        </div>
      </Section>
      <Alert tone="blue" icon={Info} title="2027/28 becomes current on 1 Sep 2027">Until then it is used only by the 2027/28 allocation cycle.</Alert>
      <ODialog open={adding} onClose={() => setAdding(false)} title="New academic year" sub="Add it before its allocation cycle opens. It becomes current on its start date."
        footer={<><Button onClick={() => setAdding(false)}>Cancel</Button><Button variant="primary" onClick={() => {
          if (busy.current) return;
          if (!ny.name.trim()) { toast.error('Name the year'); return; }
          if (years.some((y) => y.name === ny.name.trim())) { toast.error(`${ny.name} already exists`); return; }
          busy.current = true;
          set('years', (ys) => [{ id: `y${Date.now()}`, name: ny.name.trim(), starts: ny.starts, ends: ny.ends, cycle: 'No cycle yet', status: 'Upcoming' }, ...ys]);
          setAdding(false); toast.success(`${ny.name} added`, { description: 'Set its terms, then open its allocation cycle.' });
        }}>Add year</Button></>}>
        <div className="space-y-3">
          <label className="block"><Lbl>Year</Lbl><Input value={ny.name} onChange={(e) => setNy({ ...ny, name: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label><Lbl>Starts</Lbl><Input value={ny.starts} onChange={(e) => setNy({ ...ny, starts: e.target.value })} /></label>
            <label><Lbl>Ends</Lbl><Input value={ny.ends} onChange={(e) => setNy({ ...ny, ends: e.target.value })} /></label>
          </div>
        </div>
      </ODialog>
    </Layout>
  );
}

/* ---------------- Notifications (3056, 3041, 3042) ---------------- */
export function SettingsNotifications() {
  const { notifs, set } = useWorkspace();
  const { d, setD, actions } = useDraft<NotifRow[]>(notifs, (v) => set('notifs', v), (prev, next) => {
    const added = next.filter((n) => n.sms && !prev.find((p) => p.id === n.id)?.sms).map((n) => n.event.toLowerCase());
    return added.length ? `Notifications saved · ${added.join(', ')} now also by SMS` : 'Notifications saved';
  });
  const tog = (id: string, k: 'app' | 'email' | 'sms') => setD(d.map((n) => (n.id === id ? { ...n, [k]: !n[k] } : n)));
  return (
    <Layout tab="notifications" title="Notifications" sub="Your own notifications. Each member sets theirs; quiet hours from General still apply." actions={actions}>
      {/* 3056:2: table card (#F9FAFB 40px header), 52px rows, green toggles per channel; blue note with a phone icon below. */}
      <div className="rounded-xl border border-line overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-[#646A78] border-b border-line bg-[#F9FAFB]"><th className="text-left font-medium h-10 pl-4">Event</th>{['In the app', 'Email', 'SMS'].map((h) => <th key={h} className="font-medium w-[90px] text-center">{h}</th>)}</tr></thead>
          <tbody>{d.map((n) => (
            <tr key={n.id} className="border-b border-[#F3F4F6] last:border-0">
              <td className="h-[52px] pl-4"><div className="font-medium text-[#111827] leading-[18px]">{n.event}</div><div className="text-xs leading-4 text-[#646A78]">{n.sub}</div></td>
              {(['app', 'email', 'sms'] as const).map((k) => (
                <td key={k} className="text-center"><span className="inline-flex"><Switch checked={n[k]} onChange={() => tog(n.id, k)} label={`${n.event}: ${k}`} /></span></td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <Alert tone="blue" icon={DeviceMobile} title="SMS goes to +44 7700 900118">Only urgent maintenance can send SMS during quiet hours.</Alert>
    </Layout>
  );
}

/* ---------------- Payments (3059) ---------------- */
export function SettingsPayments() {
  const { payments, set } = useWorkspace();
  const { d, setD, actions } = useDraft<Payments>(payments, (v) => set('payments', v), () => 'Payment settings saved · new tenancies use them');
  const [manage, setManage] = useState(false);
  const up = (p: Partial<Payments>) => setD({ ...d, ...p });
  const methods = [['card', 'Card', CreditCard], ['bank', 'Bank transfer', Bank], ['dd', 'Direct Debit', ArrowsLeftRight]] as const;
  const rules = [['remind', 'Remind 7 days before rent is due', 'Email and the resident portal'], ['arrears', 'Flag arrears after 14 days', 'Shows in Residents and stops room swaps'], ['lateFee', 'Charge a late fee', d.lateFee ? '£25 after 14 days in arrears' : 'Off: Durham doesn’t charge late fees']] as const;
  return (
    <Layout tab="payments" title="Payments" sub="How residents pay rent and deposits, and when it’s due." actions={actions}>
      <Section title="Provider" sub="Card payments and payouts to the university account">
        <div className="rounded-[10px] border border-line px-3.5 h-[60px] flex items-center gap-3">
          <BrandTile id="stripe" />
          <div className="flex-1"><div className="text-sm font-medium text-[#111827]">Stripe</div><div className="text-xs text-[#646A78] mt-0.5">Connected 2 Aug 2026 · payouts to Durham University ••4410 · weekly</div></div>
          <Pill tone="green" icon={Check}>Connected</Pill>
          <Button size="sm" icon={ArrowUpRight} onClick={() => setManage(true)}>Manage</Button>
        </div>
      </Section>
      <Section title="How residents can pay" sub="Shown at checkout in the resident portal">
        <div className="grid grid-cols-3 gap-2">{methods.map(([k, l, I]) => (
          <div key={k} className="h-10 px-3 rounded-[10px] border border-line flex items-center gap-2.5 text-sm text-[#111827]">
            <I size={16} className="text-gray-500" /><span className="flex-1">{l}</span><Switch checked={d.methods[k]} onChange={(v) => up({ methods: { ...d.methods, [k]: v } })} label={l} />
          </div>
        ))}</div>
      </Section>
      <Section title="Rent" sub="Defaults for new tenancies; a room type can override them">
        <div className="grid grid-cols-3 gap-3">
          <div><Lbl>Billed</Lbl><IconSelect icon={CalendarBlank} ariaLabel="Billed" value={d.billed} onChange={(v) => up({ billed: v })} options={opts(['Termly, in advance', 'Monthly', 'Weekly', 'Whole year up front'])} /></div>
          <div><Lbl>Due</Lbl><IconSelect icon={CalendarBlank} ariaLabel="Due" value={d.due} onChange={(v) => up({ due: v })} options={opts(['Before each term starts', 'On the 1st', 'On move-in'])} /></div>
          <label><Lbl>Deposit</Lbl><span className="relative flex items-center"><Money size={14} className="absolute left-2.5 text-gray-500 pointer-events-none" /><span className="absolute left-8 text-sm text-[#111827] pointer-events-none">£</span><Input className="pl-[42px]" inputMode="numeric" value={String(d.deposit)} onChange={(e) => up({ deposit: Number(e.target.value.replace(/\D/g, '')) || 0 })} /></span></label>
        </div>
      </Section>
      <Section title="Reminders and arrears" sub="Sent outside quiet hours">
        <div className="space-y-2">{rules.map(([k, t, s]) => (
          <div key={k} className="px-3.5 h-[60px] rounded-[10px] border border-line flex items-center gap-3"><div className="flex-1"><div className="text-sm font-medium text-[#111827]">{t}</div><div className="text-xs text-[#646A78]">{s}</div></div><Switch checked={d[k]} onChange={(v) => up({ [k]: v })} label={t} /></div>
        ))}</div>
      </Section>
      <ODialog open={manage} onClose={() => setManage(false)} title="Stripe" sub="Card payments and payouts to the university account."
        footer={<><Button variant="ghost" className="mr-auto !text-[#E0243A]" onClick={() => { setManage(false); toast.error('Disconnecting Stripe stops card payments', { description: 'Ask Finance (James Reed) to do this.' }); }}>Disconnect</Button><Button variant="primary" onClick={() => { setManage(false); toast('Opening the Stripe dashboard', { description: 'It opens in a new tab in the real product.' }); }}>Open Stripe</Button></>}>
        <DL rows={[['Account', 'Durham University Residences'], ['Connected', '2 Aug 2026 by James Reed'], ['Payouts', 'Weekly to ••4410'], ['Last payout', '£184,220 on 11 Sep']]} />
      </ODialog>
    </Layout>
  );
}

/* ---------------- Integrations (3060, E3 3233–3234) ---------------- */
const INT_ICON: Record<string, Icon> = { sits: GraduationCap, entra: Key, salto: DoorOpen, xero: Calculator, slack: ChatCenteredText, webhooks: WebhooksLogo };
/** 3060:2 icon tiles: [ground, icon]. */
const INT_TINT: Record<string, [string, string]> = { sits: ['#F3EEFF', '#6E3BD8'], entra: ['#EFF6FF', '#2563EB'], salto: ['#E6F6F6', '#0E7A80'], xero: ['#E8F7EE', '#0B8A4C'], slack: ['#FDECF4', '#C0266D'], webhooks: ['#F3F4F6', '#6B7280'] };
const SKIPPED = [['Leo Grant', '000412883'], ['Amara Okafor', '000413207'], ['Finn Walker', '000415560']];
export function SettingsIntegrations() {
  const { integrations, set, restore } = useWorkspace();
  const [sp, setSp] = useSearchParams();
  const [reconnect, setReconnect] = useState(false);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState(false);
  const [open, setOpen] = useState<Integration | null>(null);
  const guard = useRef(false);
  useEffect(() => {
    if (sp.get('demo') === 'sits-failing') {
      set('integrations', (xs) => xs.map((x) => (x.id === 'sits' ? { ...x, state: 'failing' as const, meta: 'Last synced 30 Oct, 02:00' } : x)));
      setSp((p) => { const n = new URLSearchParams(p); n.delete('demo'); return n; }, { replace: true });
    }
  }, [sp, setSp, set]);
  const sits = integrations.find((x) => x.id === 'sits');
  const failing = sits?.state === 'failing';
  const connected = integrations.filter((x) => x.state !== 'available');
  const available = integrations.filter((x) => x.state === 'available');
  const doReconnect = () => {
    if (guard.current) return; guard.current = true; setBusy(true);
    const before = useWorkspace.getState().integrations;
    window.setTimeout(() => {
      set('integrations', (xs) => xs.map((x) => (x.id === 'sits' ? { ...x, state: 'connected' as const, meta: 'Synced just now · 41 new students' } : x)));
      setBusy(false); setReconnect(false); guard.current = false;
      toast.success('SITS reconnected · 41 students synced · 6 applications matched', { action: { label: 'Undo', onClick: () => restore({ integrations: before }) } });
    }, 1200);
  };
  const connect = (x: Integration) => {
    set('integrations', (xs) => xs.map((y) => (y.id === x.id ? { ...y, state: 'connected' as const, meta: 'Connected just now' } : y)));
    setOpen(null); toast.success(`${x.name} connected`);
  };
  return (
    <Layout wide tab="integrations" title="Integrations" sub="Connect the systems the university already uses.">
      {failing && (
        <Alert tone="red" icon={WarningCircle} title="Student records (SITS) stopped syncing" action={<Button variant="primary" size="sm" onClick={() => setReconnect(true)}>Reconnect</Button>}>
          The connection token expired on 30 Oct. 3 syncs failed; 41 new students aren’t in Applications yet.
        </Alert>
      )}
      {/* 3060:2: one grid of six cards (connected first), each with a tinted 32px icon tile, title + meta, Connected pill top right,
          13px description and a sm Manage (sliders) or Connect (plug) button; the amber sync note sits under the grid. */}
      <div className="grid grid-cols-3 gap-4">
        {[...connected, ...available].map((x) => { const I = INT_ICON[x.id] ?? Plug; const t = INT_TINT[x.id] ?? INT_TINT.webhooks; const on = x.state !== 'available'; return (
          <div key={x.id} className={cx('rounded-xl border bg-white p-4 flex flex-col', x.state === 'failing' ? 'border-[#E0243A4D]' : 'border-line')}>
            <div className="flex items-start gap-3">
              {BRAND[x.id] ? <BrandTile id={x.id} /> : <span className="size-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: t[0] }}><I size={16} style={{ color: t[1] }} /></span>}
              <span className={cx('flex-1 min-w-0', !on && 'self-center')}><span className="block text-sm leading-5 font-semibold text-[#111827]">{x.name}</span>{on && x.meta && <span className="block text-xs leading-4 text-[#646A78] mt-0.5">{x.meta}</span>}</span>
              {on && (x.state === 'failing' ? <Pill tone="red" icon={Warning}>Failing</Pill> : <Pill tone="green" icon={Check}>Connected</Pill>)}
            </div>
            <p className="text-xs leading-4 text-[#646A78] mt-3 flex-1">{x.desc}</p>
            <div className="mt-3">{x.state === 'failing' ? <Button size="sm" variant="primary" onClick={() => setReconnect(true)}>Reconnect</Button> : on ? <Button size="sm" icon={SlidersHorizontal} onClick={() => setOpen(x)}>Manage</Button> : <Button size="sm" icon={Plug} onClick={() => setOpen(x)}>Connect</Button>}</div>
          </div>
        ); })}
      </div>
      {!failing && sits?.meta === 'Synced 12 min ago' && (
        <Alert tone="amber" icon={Warning} title="SITS sync skipped 3 students last night" action={<Button size="sm" onClick={() => setLog(true)}>Open log</Button>}>Their course record has no term address. Open the sync log to see who.</Alert>
      )}

      <ODialog open={reconnect} onClose={() => !busy && setReconnect(false)} title="Reconnect Student records (SITS)" sub="Sign in with a SITS admin account. We get a new token and run the missed syncs."
        footer={<><Button disabled={busy} onClick={() => setReconnect(false)}>Cancel</Button><Button variant="primary" disabled={busy} onClick={doReconnect}>{busy ? 'Syncing…' : 'Sign in to SITS'}</Button></>}>
        <DL rows={[['Failed since', '30 Oct, 02:00'], ['Failed syncs', '3'], ['Affects', '41 new students aren’t in Applications']]} />
      </ODialog>
      <ODialog open={log} onClose={() => setLog(false)} title="SITS sync log · last night" sub="02:00 · 2,412 students checked · 3 skipped" footer={<Button variant="primary" onClick={() => setLog(false)}>Done</Button>}>
        <div className="rounded-lg border border-line divide-y divide-line">{SKIPPED.map(([n, id]) => (
          <div key={id} className="h-11 px-3 flex items-center gap-3 text-sm"><span className="font-medium flex-1">{n}</span><span className="text-[#646A78] tabular-nums">{id}</span><Pill tone="amber">No term address</Pill></div>
        ))}</div>
        <p className="text-xs text-[#646A78] mt-3">Fix the address in SITS; tonight’s sync picks them up.</p>
      </ODialog>
      <ODialog open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ''} sub={open?.desc}
        footer={open?.state === 'available'
          ? <><Button onClick={() => setOpen(null)}>Cancel</Button><Button variant="primary" onClick={() => open && connect(open)}>Connect {open?.name}</Button></>
          : <><Button variant="ghost" className="mr-auto !text-[#E0243A]" onClick={() => { const x = open!; set('integrations', (xs) => xs.map((y) => (y.id === x.id ? { ...y, state: 'available' as const, meta: '' } : y))); setOpen(null); toast.success(`${x.name} disconnected`); }}>Disconnect</Button>
            <Button onClick={() => { const x = open!; set('integrations', (xs) => xs.map((y) => (y.id === x.id ? { ...y, meta: x.id === 'sits' ? 'Synced just now' : y.meta } : y))); setOpen(null); toast.success(`${x.name} synced`); }}>Sync now</Button>
            <Button variant="primary" onClick={() => setOpen(null)}>Done</Button></>}>
        {open?.state === 'available' ? <p className="text-sm text-[#646A78]">You’ll sign in to {open.name} and pick what to share. You can disconnect at any time.</p>
          : open && <DL rows={[['Status', 'Connected'], ['Last activity', open.meta], ['Connected by', 'Priya Shah']]} />}
      </ODialog>
    </Layout>
  );
}

/* ---------------- Branding (3061) ---------------- */
export function SettingsBranding() {
  const { branding, general, set } = useWorkspace();
  const { d, setD, actions } = useDraft<Branding>(branding, (v) => set('branding', v), () => 'Branding saved · emails and the resident portal use it now');
  const up = (p: Partial<Branding>) => setD({ ...d, ...p });
  const okColour = /^#[0-9a-f]{6}$/i.test(d.colour);
  const c = okColour ? d.colour : '#68246D';
  return (
    <Layout wide tab="branding" title="Branding" sub="How emails, notices and the resident portal look. The off-campus student site has its own look, in Portals." actions={actions}>
      <div className="grid grid-cols-[1fr_400px] gap-5 items-start">
        {/* 3061:2: plain labelled fields (14px medium label, 16px gaps); 48px logo tile with name + hint; 36px colour swatch beside the hex field; reply-to with a mail icon. */}
        <div className="space-y-4">
          <div><Lbl>Logo</Lbl>
            <div className="flex items-center gap-3">
              <span className="size-12 rounded-lg text-white text-lg font-semibold flex items-center justify-center" style={{ background: c }}>D</span>
              <span className="flex-1"><span className="block text-sm text-[#111827]">{d.logo}</span><span className="block text-xs text-[#646A78]">SVG or PNG, at least 256px</span></span>
              <Button size="sm" icon={UploadSimple} onClick={() => { up({ logo: 'durham-crest-2026.svg' }); toast('durham-crest-2026.svg uploaded', { description: 'Save to use it.' }); }}>Replace</Button>
            </div>
          </div>
          <div><Lbl>Brand colour</Lbl>
            <div className="flex items-center gap-2">
              <label className="relative size-9 rounded-lg shrink-0 cursor-pointer" style={{ background: c }}><input type="color" aria-label="Pick brand colour" value={c} onChange={(e) => up({ colour: e.target.value.toUpperCase() })} className="absolute inset-0 opacity-0 cursor-pointer" /></label>
              <Input className={cx('flex-1', !okColour && 'border-[#E0243A]')} value={d.colour} onChange={(e) => up({ colour: e.target.value })} />
            </div>
            <p className={cx('text-xs mt-1.5', okColour ? 'text-[#646A78]' : 'text-[#E0243A]')}>{okColour ? 'Buttons and headers in emails and the portal' : 'Use a hex colour like #68246D'}</p>
          </div>
          <label className="block"><Lbl>Email sender name</Lbl><Input value={d.sender} onChange={(e) => up({ sender: e.target.value })} /></label>
          <label className="block"><Lbl>Reply-to</Lbl><span className="relative flex items-center"><EnvelopeSimple size={14} className="absolute left-2.5 text-gray-500 pointer-events-none" /><Input className="pl-8" type="email" value={d.replyTo} onChange={(e) => up({ replyTo: e.target.value })} /></span></label>
          <label className="block"><Lbl>Email footer</Lbl><Textarea value={d.footer} onChange={(e) => up({ footer: e.target.value })} /></label>
        </div>
        <div className="rounded-xl border border-line bg-[#F9FAFB] p-4 sticky top-0">
          <div className="text-xs text-[#646A78] mb-3">Email preview</div>
          <div className="rounded-lg bg-white border border-line overflow-hidden">
            <div className="h-12 px-3.5 flex items-center gap-2.5" style={{ background: c }}><span className="size-5 rounded bg-white text-[11px] font-semibold flex items-center justify-center" style={{ color: c }}>D</span><span className="text-xs font-semibold text-white">{d.sender || general.name}</span></div>
            <div className="p-3.5">
              <div className="text-sm font-semibold text-[#111827]">Your rent for Epiphany term is due</div>
              <p className="text-xs text-[#374151] mt-2 leading-[17px]">Hi Amira, £2,180 is due on 5 January. Pay in the resident portal by card or bank transfer.</p>
              <span className="inline-flex mt-3 h-7 px-3 rounded-md text-xs font-medium text-white items-center" style={{ background: c }}>Pay now</span>
            </div>
            <div className="px-3.5 py-3 border-t border-[#F3F4F6] text-xs leading-4 text-[#646A78] whitespace-pre-line">{d.footer.split('\n')[0]}</div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
