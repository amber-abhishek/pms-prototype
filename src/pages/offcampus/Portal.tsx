import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowsClockwise, CheckCircle, Clock, Copy, EnvelopeSimple, Eye, Gear, Globe, MapPin, UploadSimple, XCircle } from '../../components/icons';
import { toast } from 'sonner';
import { Button, Input, PageHeader, PIN, Select, Switch, Tabs, cx } from '../../components/ui';
import { Section, Lbl as SLbl } from '../workspace/Settings';
import { Checkbox } from '../../components/shadcn/checkbox';
import { AMBER_REGIONS, TAKEN_DOMAINS, regionOf, stamp, useOc, type Campus, type Portal as P } from '../../data/offcampus';
import { useWorkspace } from '../../data/workspace';
import { Combo, ODialog, Tag, Thumb, Title } from './parts';

type Sec = 'behaviour' | 'appearance' | 'site' | 'domain';
const SECS: { id: Sec; label: string; path: string }[] = [
  { id: 'behaviour', label: 'Behaviour', path: '/offcampus/portal' }, { id: 'appearance', label: 'Appearance', path: '/offcampus/portal/appearance' },
  { id: 'site', label: 'Site details', path: '/offcampus/portal/site' }, { id: 'domain', label: 'Domain', path: '/offcampus/portal/domain' },
];

export function Portal({ sec }: { sec: Sec }) {
  const nav = useNavigate();
  const { search } = useLocation();
  return (
    <>
      <PageHeader icon={Gear} crumbs={['Off-campus']} title="Off-campus portal" />
      <div className="flex-1 min-h-0 flex flex-col">
        <Title title="Off-campus portal" />
        {/* Folder tabs on the grey band (Connect 2.0 3095:25465, 2026-11-24), lined up with the centred column below. */}
        <div {...PIN} className="shrink-0 flex !pl-0">
          <div className="w-full max-w-[864px] mx-auto pl-5 pr-8 flex items-end"><Tabs value={sec} onChange={(s) => nav(SECS.find((x) => x.id === s)!.path + search)} tabs={SECS} /></div>
        </div>
        <div className="flex-1 overflow-auto bg-white"><div className="max-w-[864px] mx-auto px-8 pt-8 pb-16">
          {sec === 'behaviour' && <Behaviour />}
          {sec === 'appearance' && <Appearance />}
          {sec === 'site' && <SiteDetails />}
          {sec === 'domain' && <Domain />}
        </div></div>
      </div>
    </>
  );
}

const Lbl = ({ children }: { children: ReactNode }) => <div className="text-sm font-medium text-gray-800 mb-1.5">{children}</div>;
const inp = 'h-8 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25';

/* ---------------- Behaviour (flow 5) ---------------- */
/** A settings group: 240px label column (title + one grey line), controls on the right. */
/* Settings card language (2026-11-24): every portal tab is a centred column of Section cards (grey 44px header with
   title and a short sub, content padded 16px). Row lists inside a card sit straight in it (-m-4), never in a second box. */
function Group({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return <Section title={title} sub={sub.replace(/\.$/, '')}>{children}</Section>;
}
// Nearest Partner region within 50 km of each campus, as GET amber-regions would return it.
const NEAREST: Record<string, { region: string; km: number; exact?: boolean }> = { 'c-durham': { region: 'Durham', km: 0, exact: true }, 'c-queens': { region: 'Newcastle upon Tyne', km: 34 } };

function Behaviour() {
  const portal = useOc((s) => s.portal);
  const setPortal = useOc((s) => s.setPortal);
  const [sender, setSender] = useState({ name: portal.senderName, reply: portal.replyTo });
  const saveCampuses = (campuses: Campus[], extra: Partial<P> = {}) => setPortal({ campuses, ...extra });
  const upd = (id: string, p: Partial<Campus>) => portal.campuses.map((c) => (c.id === id ? { ...c, ...p } : c));
  const resolve = (c: Campus): Partial<Campus> => { const n = NEAREST[c.id]; return n ? { resolved: n.region, match: n.exact ? 'Exact' : 'Nearest', km: n.km, override: null } : { resolved: null, match: null, override: null }; };

  const tick = (c: Campus, on: boolean) => {
    if (c.isDefault) return;
    const next = upd(c.id, on ? { ticked: true, ...(c.resolved || c.override ? {} : resolve(c)) } : { ticked: false });
    const left = next.some((x) => x.ticked && regionOf(x));
    saveCampuses(next, !left ? { showPbsa: false } : {});
    toast.success('Settings saved', { description: on ? `${c.name} added to this portal.` : `${c.name} removed from this portal.` });
  };
  const override = (c: Campus, region: string | null) => {
    saveCampuses(upd(c.id, region ? { override: region, match: 'Manual', ticked: true } : { override: null, match: c.resolved ? (NEAREST[c.id]?.exact ? 'Exact' : 'Nearest') : null }));
    toast.success('Partner region updated', { description: region ? `${c.name} now uses ${region}.` : `${c.name} uses the nearest region again.` });
  };
  const reresolve = (c: Campus) => { saveCampuses(upd(c.id, resolve(c))); toast.success('Region re-resolved', { description: `${c.name} matched to ${NEAREST[c.id]?.region ?? 'no region'}.` }); };
  const togglePbsa = (on: boolean) => {
    if (on && !portal.campuses.some((c) => c.ticked && regionOf(c))) { toast.error('Tick a campus with a partner region first'); return; }
    setPortal({ showPbsa: on });
    toast.success('Settings saved', { description: on ? 'Residents now see partners.' : 'Partners are off your site.' });
  };

  const dirty = sender.name !== portal.senderName || sender.reply !== portal.replyTo;
  const saveSender = () => {
    if (!sender.name.trim() || !/^\S+@\S+\.\S+$/.test(sender.reply)) { toast.error('Add a sender name and a valid reply-to email'); return; }
    setPortal({ senderName: sender.name.trim(), replyTo: sender.reply.trim() }); toast.success('Sender identity saved');
  };
  {
    const cancelSender = () => setSender({ name: portal.senderName, reply: portal.replyTo });
    return (
      <div className="flex flex-col gap-4">
        <Group title="Campuses" sub="Partner listings come from each ticked campus’s region.">
          <div className="-m-4 divide-y divide-[#F0F0F0]">
            {portal.campuses.map((c) => {
              const region = c.ticked ? regionOf(c) : null;
              return (
                <div key={c.id} className="group h-16 px-4 flex items-center gap-3">
                  <Checkbox aria-label={`Show ${c.name}`} title={c.isDefault ? 'The default campus is always on the portal' : undefined} className="disabled:opacity-100 disabled:cursor-default" checked={c.ticked} disabled={c.isDefault} onCheckedChange={(v) => tick(c, v === true)} />
                  <div className="min-w-0 flex-1">
                    {/* One pill per row (the match, a status), on the name line; "Default campus" is plain grey text below, so two pills never stack. */}
                    <div className="flex items-center gap-2"><span className="text-sm leading-5 font-medium text-[#0A0A0A] truncate">{c.name}</span>{region && c.match === 'Exact' && <Tag tone="green">Exact</Tag>}{region && c.match === 'Nearest' && <Tag tone="grey" outline>Nearest, {c.km} km</Tag>}</div>
                    {/* The region itself is in the picker on the right ("Durham · auto"), so this line only says the campus's standing. */}
                    <div className="text-sm leading-5 text-[#737373] truncate">{!c.ticked ? 'Not on the portal' : c.isDefault ? 'Default campus' : 'On the portal'}</div>
                  </div>
                  {c.ticked && <button type="button" onClick={() => reresolve(c)} className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity inline-flex items-center gap-1.5 h-7 px-2 rounded-md text-sm font-medium text-[#404040] whitespace-nowrap hover:bg-[#F5F5F5]"><ArrowsClockwise size={16} className="shrink-0" />Re-resolve</button>}
                  <Combo value={c.override} auto={c.resolved ?? NEAREST[c.id]?.region ?? null} options={AMBER_REGIONS} onPick={(v) => override(c, v)} icon={MapPin} />
                </div>
              );
            })}
          </div>
        </Group>
        <Group title="Listings" sub="What residents see on the portal.">
          <div className="-m-4 divide-y divide-[#F0F0F0]">
            <div className="h-16 px-4 flex items-center gap-4">
              <div className="flex-1 min-w-0"><div className="text-sm leading-5 font-medium text-[#0A0A0A]">Show partners</div><div className="text-sm leading-5 text-[#737373]">Shown alongside your owner listings</div></div>
              <Switch checked={portal.showPbsa} onChange={togglePbsa} label="Show partners" />
            </div>
            <div className="h-16 px-4 flex items-center gap-4">
              <div className="flex-1 min-w-0"><div className="text-sm leading-5 font-medium text-[#0A0A0A]">Default campus</div><div className="text-sm leading-5 text-[#737373]">Sets the listings on the home page</div></div>
              <Select className="!w-[220px]" aria-label="Default campus" value={portal.defaultCampus} onChange={(e) => { setPortal({ defaultCampus: e.target.value }); toast.success('Settings saved'); }}>
                {portal.campuses.filter((c) => c.ticked).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
          </div>
        </Group>
        <Group title="Sender identity" sub="On every email the portal sends.">
          <div className="flex flex-col gap-4">
            <label><SLbl>Sender name</SLbl><Input value={sender.name} onChange={(e) => setSender({ ...sender, name: e.target.value })} /></label>
            <label><SLbl>Reply-to email</SLbl><Input type="email" value={sender.reply} onChange={(e) => setSender({ ...sender, reply: e.target.value })} /></label>
            {dirty && <div className="flex items-center justify-end gap-2"><Button onClick={cancelSender}>Cancel</Button><Button variant="primary" icon={null} onClick={saveSender}>Save</Button></div>}
          </div>
        </Group>
      </div>
    );
  }
}

/* ---------------- Appearance (flow 6) ---------------- */
export const missingForPublish = (p: P) => [!p.heroBanner && 'Hero banner', !p.siteTitle.trim() && 'Site title', !p.pageTitle.trim() && 'Page title'].filter(Boolean) as string[];

/* Standard file field (2026-11-24). Empty: a dashed drop zone you click or drop an image on, with the rules under the
   prompt. Set: one bordered row with the preview, file name and size, then Replace (secondary) and Remove (ghost). */
function ImageRow({ has, name, meta, wide, preview, onUpload, onDrop, onRemove, hint }: {
  has: boolean; name: string; meta: string; /** Banner-shaped preview instead of a square icon. */ wide?: boolean;
  /** Own preview (the logo tile) instead of the image placeholder. */ preview?: ReactNode;
  onUpload: () => void; onDrop: (f: File | undefined) => void; /** Left out for a required image (the logo): Replace only. */ onRemove?: () => void; hint?: string;
}) {
  const [over, setOver] = useState(false);
  if (has) return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E5E5E5] bg-white p-3">
      {preview ?? <Thumb tint="#E3EAE6" w={wide ? 72 : 40} h={40} size={16} />}
      <div className="min-w-0 flex-1">
        <div className="text-sm leading-5 font-medium text-[#0A0A0A] truncate">{name}</div>
        <div className="text-xs leading-4 text-[#737373]">{meta}</div>
      </div>
      <Button size="sm" onClick={onUpload}>Replace</Button>
      {onRemove && <Button size="sm" variant="ghost" onClick={onRemove}>Remove</Button>}
    </div>
  );
  return (
    <button type="button" onClick={onUpload}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onDrop(e.dataTransfer.files?.[0]); }}
      className={cx('w-full flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-5 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary/25',
        over ? 'border-primary bg-[#EFF6FF]' : 'border-[#D4D4D4] bg-[#FAFAFA] hover:border-[#A3A3A3]')}>
      <span className="size-8 mb-1 rounded-lg border border-[#E5E5E5] bg-white flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.04)]"><UploadSimple size={16} className="text-[#404040]" /></span>
      <span className="text-sm leading-5 text-[#404040]">Drop an image here or <span className="font-medium text-primary">browse</span></span>
      {hint && <span className="text-xs leading-4 text-[#737373]">{hint}</span>}
    </button>
  );
}

/* Only a full hex colour reaches the store; anything else stays in the field with a reason. */
const HEX = /^#[0-9A-F]{6}$/;
const normHex = (v: string) => { const x = v.trim().toUpperCase(); return x.startsWith('#') ? x : `#${x}`; };
function ColourField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [txt, setTxt] = useState(value);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (normHex(txt) !== value) setTxt(value); }, [value]);
  const bad = !HEX.test(normHex(txt));
  return (
    <label className="block"><Lbl>{label}</Lbl>
      <span className={cx('h-8 w-[180px] flex items-center gap-2 rounded-lg border bg-white px-2.5 focus-within:ring-2', bad ? 'border-[#EF4444] focus-within:ring-[#EF4444]/25' : 'border-gray-300 focus-within:border-primary focus-within:ring-primary/25')}>
        <span className="relative size-4 rounded shrink-0 overflow-hidden" style={{ background: value }}><input type="color" aria-label={`${label} picker`} value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="absolute inset-0 opacity-0 cursor-pointer" /></span>
        <input aria-invalid={bad} value={txt} onChange={(e) => { setTxt(e.target.value); const n = normHex(e.target.value); if (HEX.test(n)) onChange(n); }}
          onBlur={() => { if (!bad) setTxt(normHex(txt)); }} className="flex-1 min-w-0 outline-none text-sm font-mono uppercase" />
      </span>
      {bad && <span role="alert" className="block text-xs text-[#E0243A] mt-1">Use a hex colour like #68246D. The site keeps {value}.</span>}
    </label>
  );
}

function Appearance() {
  const p = useOc((s) => s.portal);
  const setPortal = useOc((s) => s.setPortal);
  const file = useRef<HTMLInputElement>(null);
  const logoFile = useRef<HTMLInputElement>(null);
  const target = useRef<'favicon' | 'heroBanner'>('heroBanner');
  /* Logo and brand colour are the organisation's (Settings › General), edited here too (2026-11-24): a change goes live
     at once on emails and the booking site as well, so the field says where else it shows. */
  const brand = useWorkspace((s) => s.branding);
  const setWs = useWorkspace((s) => s.set);
  const setBrand = (x: Partial<typeof brand>) => setWs('branding', (cur) => ({ ...cur, ...x }));
  const onLogo = (f: File | undefined) => {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast.error('That logo is over 2 MB'); return; }
    setBrand({ logo: f.name });
    toast.success('Logo replaced', { description: 'Emails and the booking site use it too.' });
  };
  const busy = useRef(false);
  const missing = missingForPublish(p);
  const edit = (x: Partial<P>) => setPortal({ ...x, draftSaved: false });
  const upload = (k: 'favicon' | 'heroBanner') => { target.current = k; file.current?.click(); };
  /* Name and size shown on a set image; seeded images get a plausible name. */
  const [files, setFiles] = useState<Record<'favicon' | 'heroBanner', { name: string; meta: string }>>({ heroBanner: { name: 'hero-banner.webp', meta: 'WebP · 1.4 MB' }, favicon: { name: 'favicon.png', meta: 'PNG · 12 KB' } });
  const dropOn = (k: 'favicon' | 'heroBanner') => (f: File | undefined) => { target.current = k; onFile(f); };
  const onFile = (f: File | undefined) => {
    if (!f) return;
    const max = target.current === 'heroBanner' ? 25 : 5;
    if (f.size > max * 1024 * 1024) { toast.error(`That image is over ${max} MB`); return; }
    const kb = f.size / 1024;
    setFiles((x) => ({ ...x, [target.current]: { name: target.current === 'heroBanner' ? f.name.replace(/\.[^.]+$/, '.webp') : f.name, meta: `${target.current === 'heroBanner' ? 'WebP' : (f.name.split('.').pop() ?? '').toUpperCase()} · ${kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(kb))} KB`}` } }));
    edit({ [target.current]: true });
    toast.success('Image uploaded', { description: `${f.name} was converted to WebP.` });
  };
  const publish = () => {
    if (busy.current || missing.length) return;
    busy.current = true; setTimeout(() => { busy.current = false; }, 500);
    setPortal({ liveSince: stamp(), draftSaved: true });
    toast.success('Site published', { description: 'Residents now see this version. Later edits stay in the draft.' });
  };
  const colour = (label: string, k: 'ctaColour') => <ColourField label={label} value={p[k]} onChange={(v) => edit({ [k]: v })} />;
  /* What publishing still needs is said once, on the field itself (2026-11-23). */
  const need = (label: string) => missing.includes(label) && <p className="mt-1.5 text-xs leading-4 font-medium text-[#B45309]">Needed to publish</p>;
  const row = (title: string, control: ReactNode) => <div className="h-12 px-4 flex items-center gap-4"><span className="flex-1 text-sm leading-5 font-medium text-[#0A0A0A]">{title}</span>{control}</div>;
  return (
    <div>
      <input ref={logoFile} type="file" accept="image/svg+xml,image/png" className="hidden" onChange={(e) => { onLogo(e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={file} type="file" accept="image/png,image/jpeg,image/webp,image/x-icon" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
      {/* Publish bar: where the site stands on the left, the two actions on the right. */}
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <div className="text-sm leading-5 font-medium text-[#0A0A0A]">{p.liveSince ? `Live since ${p.liveSince}` : 'Not published yet'}</div>
          <div className="text-sm leading-5 text-[#737373]">{p.draftSaved ? 'Draft saved' : 'Unsaved changes'}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button onClick={() => { setPortal({ draftSaved: true }); toast.success('Draft saved'); }}>Save draft</Button>
          <Button variant="primary" disabled={missing.length > 0} title={missing.length ? `Add ${missing.join(', ').toLowerCase()} to publish` : undefined} onClick={publish}>Publish</Button>
        </div>
      </div>
      <div className="flex flex-col gap-4 pt-6">
        <Group title="Home page" sub="The first thing residents see.">
          <div className="flex flex-col gap-4">
            <label className="block"><Lbl>Page title</Lbl><input className={inp} value={p.pageTitle} onChange={(e) => edit({ pageTitle: e.target.value })} />{need('Page title')}</label>
            <label className="block"><Lbl>Hero text</Lbl><textarea rows={2} className={cx(inp, 'h-auto py-2 resize-none')} value={p.heroText} onChange={(e) => edit({ heroText: e.target.value })} /></label>
            <div><Lbl>Hero banner</Lbl><ImageRow wide has={p.heroBanner} {...files.heroBanner} onUpload={() => upload('heroBanner')} onDrop={dropOn('heroBanner')} onRemove={() => edit({ heroBanner: false })} hint="PNG, JPEG or WebP, up to 25 MB · saved as WebP" />{need('Hero banner')}</div>
          </div>
        </Group>
        <Group title="Brand" sub="Logo and brand colour also show on emails and the booking site.">
          <div className="flex flex-col gap-4">
            <div><Lbl>Logo</Lbl><ImageRow has name={brand.logo} meta={`${(brand.logo.split('.').pop() ?? '').toUpperCase()}`}
              preview={<span className="size-10 rounded-lg text-white font-semibold flex items-center justify-center shrink-0" style={{ background: brand.colour }}>D</span>}
              onUpload={() => logoFile.current?.click()} onDrop={onLogo} /></div>
            {/* The two colours side by side: the shared brand colour, then the portal's own button colour. */}
            <div className="flex flex-wrap gap-x-6 gap-y-4">
              <ColourField label="Brand colour" value={brand.colour} onChange={(v) => setBrand({ colour: v })} />
              {colour('Listing CTA colour', 'ctaColour')}
            </div>
          </div>
        </Group>
        <Group title="Browser tab" sub="Shown in search results and tabs.">
          <div className="flex flex-col gap-4">
            <label className="block"><Lbl>Site title</Lbl><input className={inp} value={p.siteTitle} onChange={(e) => edit({ siteTitle: e.target.value })} />{need('Site title')}</label>
            <div><Lbl>Favicon</Lbl><ImageRow has={p.favicon} {...files.favicon} onUpload={() => upload('favicon')} onDrop={dropOn('favicon')} onRemove={() => edit({ favicon: false })} hint="PNG, ICO or WebP, square, up to 5 MB" /></div>
          </div>
        </Group>
        <Group title="Links and footer" sub="Extra sections on every page.">
          <div className="-m-4 divide-y divide-[#F0F0F0]">
            {([['customLinks', 'Custom links'], ['announcements', 'Announcement banners'], ['footerLinks', 'Footer links']] as const).map(([k, l]) => <div key={k}>{row(l, <Switch checked={p[k]} onChange={(v) => edit({ [k]: v })} label={l} />)}</div>)}
          </div>
        </Group>
      </div>
    </div>
  );
}

/* ---------------- Site details: resident site + publish check (E2) ---------------- */
function SiteDetails() {
  const p = useOc((s) => s.portal);
  const hmos = useOc((s) => s.hmos);
  const reviews = useOc((s) => s.reviews);
  const setPortal = useOc((s) => s.setPortal);
  const nav = useNavigate();
  const [checking, setChecking] = useState(false);
  const busy = useRef(false);
  const campuses = p.campuses.filter((c) => c.ticked);
  const live = hmos.filter((h) => h.status === 'Active').length;
  const waiting = reviews.filter((r) => r.status === 'Under review').length;
  const host = p.domainState === 'verified' && p.customDomain ? p.customDomain : `${p.subdomain}.pmsoffcampushousing.com`;
  const missing = missingForPublish(p);
  const checks = [
    { label: 'Branding', ok: !missing.length, note: missing.length ? `Missing: ${missing.join(', ')}` : 'Crest and colours set', fix: () => nav('/offcampus/portal/appearance'), fixLabel: 'Finish branding' },
    { label: 'Campuses shown', ok: campuses.length > 0, note: campuses.length ? campuses.map((c) => c.name).join(', ') : 'None chosen', fix: () => nav('/offcampus/portal'), fixLabel: 'Choose campuses' },
    { label: 'Approved listings', ok: live > 0, note: `${live} live · ${waiting} waiting for review`, fix: () => nav('/offcampus/approvals?kind=listings'), fixLabel: 'Review listings' },
    { label: 'Domain', ok: true, note: host, fix: () => nav('/offcampus/portal/domain'), fixLabel: 'Set up domain' },
  ];
  const firstFail = checks.find((c) => !c.ok);
  const publish = () => {
    if (busy.current) return;
    if (firstFail) { setChecking(true); return; }
    busy.current = true; setTimeout(() => { busy.current = false; }, 500);
    const prev = p.liveSince;
    setPortal({ liveSince: stamp(), draftSaved: true });
    toast.success(`Resident site published · ${campuses.length} ${campuses.length === 1 ? 'campus' : 'campuses'} · ${live} listings`, { action: { label: 'Undo', onClick: () => setPortal({ liveSince: prev }) } });
  };
  return (
    <div>
      {/* Same publish bar as Appearance: where the site stands on the left, actions on the right. */}
      <div className="flex items-center gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm leading-5 font-medium text-[#0A0A0A]">Resident site {p.liveSince ? <Tag tone="green">Live</Tag> : <Tag tone="grey">Draft</Tag>}</div>
          <div className="text-sm leading-5 text-[#737373] truncate">{host}</div>
        </div>
        <div className="ml-auto flex gap-2">
          <Button icon={Eye} onClick={() => window.open(`https://${host}`, '_blank', 'noopener')}>Preview</Button>
          <Button variant="primary" icon={Globe} onClick={publish}>Publish</Button>
        </div>
      </div>
      <div className="flex flex-col gap-4 pt-6">
        {/* The publish checks were only visible after a failed Publish; they now sit on the page (2026-11-23). */}
        <Group title="Before you publish" sub="Residents land on an empty site until these are done.">
          <div className="-m-4 divide-y divide-[#F0F0F0]">
            {checks.map((c) => (
              <div key={c.label} className="h-14 px-4 flex items-center gap-3">
                {c.ok ? <CheckCircle size={18} className="text-[#0B8A4C] shrink-0" /> : <XCircle size={18} className="text-[#E0243A] shrink-0" />}
                <div className="flex-1 min-w-0"><div className="text-sm leading-5 font-medium text-[#0A0A0A]">{c.label}</div><div className={cx('text-sm leading-5 truncate', c.ok ? 'text-[#737373]' : 'text-[#C8102E]')}>{c.note}</div></div>
                {!c.ok && <Button size="sm" icon={null} onClick={c.fix}>{c.fixLabel}</Button>}
              </div>
            ))}
          </div>
        </Group>
        <Group title="Home page" sub={p.liveSince ? `Live since ${p.liveSince}.` : 'How the draft looks to residents.'}>
          {/* A small frame of the real home page from Appearance: address bar, crest, title, hero text and the CTA colour. */}
          <div className="rounded-xl border border-[#E5E5E5] overflow-hidden">
            <div className="h-9 px-3 flex items-center gap-2 bg-[#FAFAFA] border-b border-[#E5E5E5]">
              <span className="flex gap-1.5">{[0, 1, 2].map((i) => <span key={i} className="size-2.5 rounded-full bg-[#E5E5E5]" />)}</span>
              <span className="ml-2 flex-1 h-6 rounded-md bg-white border border-[#EBEBEB] px-2.5 flex items-center text-xs text-[#737373] truncate">https://{host}</span>
            </div>
            <div className="px-8 py-10 bg-gradient-to-b from-[#F7F8FA] to-white">
              <div className="text-xl leading-7 font-medium text-[#0A0A0A]">{p.pageTitle}</div>
              <p className="mt-1.5 max-w-[420px] text-sm leading-5 text-[#525252]">{p.heroText}</p>
              <span className="mt-4 inline-flex h-8 px-3.5 rounded-lg text-sm font-medium text-white items-center" style={{ background: p.ctaColour }}>See homes</span>
            </div>
          </div>
        </Group>
      </div>
      <ODialog open={checking} onClose={() => setChecking(false)} title="The site can’t be published yet" sub="Residents would land on an empty site."
        footer={<><Button onClick={() => { setPortal({ draftSaved: true }); setChecking(false); toast.success('Draft saved'); }}>Save draft</Button>{firstFail && <Button variant="primary" icon={ArrowRight} onClick={() => { setChecking(false); firstFail.fix(); }}>{firstFail.fixLabel}</Button>}</>}>
        <div>
          {checks.map((c) => (
            <div key={c.label} className="h-9 flex items-center gap-2.5 border-b border-line text-sm">
              {c.ok ? <CheckCircle size={16} className="text-[#0B8A4C]" /> : <XCircle size={16} className="text-[#E0243A]" />}
              <span className="flex-1 text-ink">{c.label}</span>
              <span className={cx('w-[200px] text-xs truncate', c.ok ? 'text-gray-500' : 'text-[#E0243A]')}>{c.note}</span>
            </div>
          ))}
        </div>
      </ODialog>
    </div>
  );
}

/* ---------------- Domain (flow 7 + E1) ---------------- */
const TXT = { name: (d: string) => `_pms-verify.${d}`, value: 'pms-verify=7f3c9a12e84b4d06b1c5' };

function Domain() {
  const p = useOc((s) => s.portal);
  const setPortal = useOc((s) => s.setPortal);
  const [sub, setSub] = useState(p.subdomain);
  const [dom, setDom] = useState(p.customDomain ?? '');
  const [err, setErr] = useState('');
  const [subErr, setSubErr] = useState('');
  const busy = useRef(false);
  const once = (fn: () => void) => { if (busy.current) return; busy.current = true; fn(); setTimeout(() => { busy.current = false; }, 500); };
  const base = `${p.subdomain}.pmsoffcampushousing.com`;

  const saveSub = () => once(() => {
    const v = sub.trim().toLowerCase();
    if (!/^(?=.{2,31}$)[a-z0-9]+(-[a-z0-9]+)*$/.test(v)) { setSubErr('Use 2–31 letters or numbers. A hyphen can only sit between them.'); return; }
    if (['www', 'admin', 'api', 'app', 'mail'].includes(v)) { setSubErr(`“${v}” is reserved. Pick another.`); return; }
    setSubErr(''); setPortal({ subdomain: v }); toast.success('Subdomain saved', { description: `Your site is at https://${v}.pmsoffcampushousing.com` });
  });
  const claim = () => once(() => {
    const v = dom.trim().toLowerCase();
    if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(v)) { setErr('Enter a domain like housing.durham.ac.uk'); return; }
    if (TAKEN_DOMAINS.includes(v)) { setErr('Another portal already uses this domain.'); return; }
    setErr(''); setPortal({ customDomain: v, domainState: 'pending' }); toast.success('Domain claimed');
  });
  const verify = () => once(() => {
    // The first check fails (E1: record not there yet); checking again finds it.
    if (p.domainState === 'pending') { setPortal({ domainState: 'failed' }); toast.error('We can’t see the TXT record yet'); return; }
    setPortal({ domainState: 'verified' }); toast.success('Domain verified', { description: `${p.customDomain} is live · ${base} redirects` });
  });
  const remove = () => { setPortal({ customDomain: null, domainState: 'none' }); setDom(''); toast.success('Custom domain removed', { description: `The site is back on ${base}.` }); };
  const emailIt = () => {
    const body = encodeURIComponent(`Please add this DNS record for ${p.customDomain}:\n\nType: TXT\nName: ${TXT.name(p.customDomain ?? '')}\nValue: ${TXT.value}\n`);
    window.location.href = `mailto:?subject=${encodeURIComponent(`DNS record for ${p.customDomain}`)}&body=${body}`;
    toast.success('Email drafted', { description: 'Send it to your IT team.' });
  };
  const copy = (t: string) => { navigator.clipboard?.writeText(t).catch(() => undefined); toast.success('Copied'); };

  const Radio = ({ id, title, sub: s }: { id: P['domainMode']; title: string; sub: string }) => (
    <button type="button" role="radio" aria-checked={p.domainMode === id} onClick={() => setPortal({ domainMode: id })}
      className={cx('text-left rounded-xl border bg-white px-4 py-3 flex items-start gap-3 min-w-0', p.domainMode === id ? 'border-primary' : 'border-line hover:border-gray-300')}>
      <span className={cx('mt-0.5 size-4 rounded-full bg-white shrink-0', p.domainMode === id ? 'border-[5px] border-primary' : 'border border-gray-300')} />
      <span className="min-w-0"><span className="block text-sm font-medium">{title}</span><span className="block text-xs text-gray-500 mt-0.5 truncate">{s}</span></span>
    </button>
  );

  return (
    <div>
    <Group title="Site address" sub="Where residents find the portal.">
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Site address">
        <Radio id="standard" title="Standard subdomain" sub={base} />
        <Radio id="custom" title="Custom domain" sub="An address the operator owns" />
      </div>
      {p.domainMode === 'standard' ? (
        <div>
          <h2 className="text-sm font-medium mb-1.5">Subdomain</h2>
          <div className="flex gap-2">
            <label className={cx('h-8 flex-1 min-w-0 flex items-center rounded-lg border bg-white pl-3 pr-3 focus-within:ring-2', subErr ? 'border-[#EF4444] focus-within:ring-[#EF4444]/25' : 'border-gray-300 focus-within:border-primary focus-within:ring-primary/25')}>
              <input aria-label="Subdomain" aria-invalid={!!subErr} value={sub} onChange={(e) => { setSub(e.target.value); setSubErr(''); }} onKeyDown={(e) => e.key === 'Enter' && saveSub()} className="flex-1 min-w-0 outline-none font-mono text-sm" />
              <span className="text-sm text-gray-500">.pmsoffcampushousing.com</span>
            </label>
            <Button variant="primary" onClick={saveSub}>Save</Button>
          </div>
          {subErr ? <p role="alert" className="text-xs text-[#E0243A] mt-1.5">{subErr}</p> : <p className="text-xs text-gray-500 mt-2.5">Your site: https://{base}</p>}
        </div>
      ) : (
        <div>
          <h2 className="text-sm font-medium">Custom domain</h2>
          {p.domainState === 'none' && (
            <>
              <p className="text-xs text-gray-500 mt-0.5">Your standard address keeps working until the custom domain is verified.</p>
              <div className="flex gap-2 mt-3">
                <input aria-label="Custom domain" value={dom} onChange={(e) => { setDom(e.target.value); setErr(''); }} onKeyDown={(e) => e.key === 'Enter' && claim()} placeholder="housing.durham.ac.uk"
                  className={cx(inp, 'flex-1', err && 'border-[#EF4444]')} />
                <Button variant="primary" onClick={claim}>Claim</Button>
              </div>
              {err && <p className="text-xs text-[#E0243A] mt-1.5">{err}</p>}
            </>
          )}
          {(p.domainState === 'pending' || p.domainState === 'failed') && (
            <>
              <div className="flex items-center gap-2 mt-3 text-sm">{p.customDomain}
                {p.domainState === 'pending' ? <Tag tone="blue" icon={Clock}>Pending</Tag> : <Tag tone="red" icon={XCircle}>DNS not found</Tag>}
              </div>
              {p.domainState === 'failed' && (
                <div className="mt-3 rounded-lg border border-[#E0243A]/30 bg-white px-3.5 py-2.5 flex gap-2.5">
                  <Globe size={16} className="text-[#E0243A] shrink-0 mt-0.5" />
                  <div><div className="text-sm font-medium text-[#E0243A]">We can’t see the TXT record yet</div><div className="text-xs text-gray-500 mt-0.5">Last checked just now. DNS changes can take up to 24 hours; the site stays on {base} until then.</div></div>
                </div>
              )}
              <div className="mt-3 rounded-lg border border-line bg-[#FAFAFA] p-3.5">
                <div className="text-sm font-medium mb-2.5">Add this TXT record to verify domain ownership</div>
                {([['Name', TXT.name(p.customDomain ?? '')], ['Value', TXT.value]] as const).map(([k, v]) => (
                  <div key={k} className="h-8 flex items-center gap-4 text-sm"><span className="w-14 text-gray-500">{k}</span><span className="font-mono text-xs flex-1">{v}</span>
                    <button type="button" aria-label={`Copy ${k}`} onClick={() => copy(v)} className="size-7 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-500"><Copy size={14} /></button></div>
                ))}
                {p.domainState === 'failed' && <div className="h-8 flex items-center gap-4 text-sm"><span className="w-14 text-gray-500">Status</span><Tag tone="red">Not found</Tag></div>}
              </div>
              <div className="flex gap-2 mt-3">
                {p.domainState === 'failed' && <Button icon={EnvelopeSimple} onClick={emailIt}>Email this to IT</Button>}
                <Button variant="primary" icon={p.domainState === 'failed' ? ArrowsClockwise : undefined} onClick={verify}>{p.domainState === 'failed' ? 'Check again' : 'I’ve added the record — verify'}</Button>
                <button type="button" onClick={remove} className="ml-auto self-center h-7 px-2 rounded-lg text-sm text-gray-500 hover:bg-[#F5F5F5] hover:text-ink">Use a different domain</button>
              </div>
            </>
          )}
          {p.domainState === 'verified' && (
            <div className="flex items-center gap-2 mt-3 text-sm">{p.customDomain}<Tag tone="green" icon={CheckCircle}>Verified</Tag>
              <Button className="ml-auto text-[#E0243A]" onClick={remove}>Remove custom domain</Button>
            </div>
          )}
        </div>
      )}
    </div>
    </Group>
    </div>
  );
}

