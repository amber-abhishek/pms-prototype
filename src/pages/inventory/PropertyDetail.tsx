import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowsLeftRight, Bed, BuildingOffice, CalendarBlank, CheckCircle, Check, CircleNotch, CurrencyGbp,
  DotsThree, DownloadSimple, FileCsv, Image, ImageSquare, Info, LinkSimple, ListDashes, MapPin, PencilSimple, Plus, Archive, Tag as TagIcon, UploadSimple, Warning, WarningCircle,
} from '../../components/icons';
import { Avatar, Button, Card, Empty, Field, Input, Note, Sheet, SheetNavButtons, Textarea, cx, listNav, Pill, SheetSection } from '../../components/ui';
import { allUnits, logAct, money, per, toMonthly, useInv, type Property, type RoomType, type Tag } from '../../data/inventory';
import { useTab } from '../hooks';
import { NotFound } from '../Misc';
import { EditLink, FieldErr, LineTabs, Menu, Modal, MoneyInput, PropStatus, Progress, RadioCard, Tags, moneyErr, parseDay } from './common';
import { EmptyArt, shownOrder } from './Properties';
import { photoOf } from './photos';
import { GhostZone } from '../../components/headerCtx';
import { Dialog as UIDialog, DialogCloseButton, DialogContent, DialogHeader, DialogTitle } from '../../components/shadcn/dialog';

type TabId = 'overview' | 'units' | 'tenancies' | 'photos' | 'activity';
const AMENITIES = ['Laundry', 'Bike store', 'Gym', 'Library', 'Common room', 'Parking', 'Catered option'];
const TAG_CHOICES: Tag[] = [{ label: 'Catered', tone: 'orange' }, { label: 'Self-catered', tone: 'green' }, { label: 'Undergraduate', tone: 'blue' }, { label: 'Postgraduate', tone: 'blue' }, { label: 'Hill colleges', tone: 'purple' }, { label: 'Accessible', tone: 'purple' }, { label: 'Riverside', tone: 'green' }];
const shortName = (p: Property) => p.name.replace(/ College$/, '');

export function PropertyDetail() {
  const { id = '' } = useParams();
  const p = useInv((s) => s.properties.find((x) => x.id === id));
  const allTpl = useInv((s) => s.templates);
  const templates = useMemo(() => allTpl.filter((t) => t.propertyId === id), [allTpl, id]);
  const patchProp = useInv((s) => s.patchProp);
  const nav = useNavigate();
  const loc = useLocation();
  /* ↑ ↓ (and the keys) step through the Properties list as it is shown; straight from a link, through every unarchived property. */
  const allIds = useInv((s) => s.properties).filter((x) => x.status !== 'Archived').map((x) => x.id);
  const stepper = listNav(shownOrder.ids.length ? shownOrder.ids : allIds, (x) => x === id, (x) => nav(`/inventory/properties/${x}${loc.search}`));
  const [tab, setTab] = useTab<TabId>('overview');
  const [checks, setChecks] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [lettingOpen, setLettingOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<null | 'basics' | 'address'>(null);
  const [rentFor, setRentFor] = useState<RoomType | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [archiveAsk, setArchiveAsk] = useState(false);
  const fees = useInv((s) => s.fees);

  // Rooms build in the background after Create property; tick the progress until done.
  const building = !!p?.build && p.build.done < p.build.total;
  useEffect(() => {
    if (!building || !p) return;
    const t = window.setInterval(() => {
      const cur = useInv.getState().properties.find((x) => x.id === p.id);
      if (!cur?.build) return;
      const done = Math.min(cur.build.total, cur.build.done + Math.ceil(cur.build.total / 12));
      if (done >= cur.build.total) {
        const total = cur.build.total;
        patchProp(cur.id, (x) => ({ build: null, activity: logAct(x, `${total} rooms and tenancies built`) }));
        useInv.getState().set('imports', (l) => l.map((j) => (j.name === `${cur.name} · ${total} rooms` ? { ...j, status: 'Succeeded' as const, done: total } : j)));
        toast.success(`${total} rooms and tenancies ready · email sent`);
      } else patchProp(cur.id, () => ({ build: { done, total: cur.build!.total } }));
    }, 700);
    return () => window.clearInterval(t);
  }, [building, p?.id, patchProp]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p) return <NotFound />;
  const short = shortName(p);
  const hasRooms = p.units > 0 && !p.build;
  const feeCount = fees.filter((f) => f.appliesTo == null || f.appliesTo === p.id).length;
  const hasFees = feeCount > 0;
  const rentless = p.roomTypes.filter((r) => r.rent == null);
  const tenanciesOk = p.tenancies !== false && hasRooms && templates.length > 0 && rentless.length === 0;
  const problems = [
    { ok: hasRooms, title: 'Rooms built', fail: building ? 'Still building' : 'No rooms yet', okText: `${p.units} rooms`, tab: 'units' as TabId },
    { ok: p.photos > 0, title: 'Photos', fail: 'No photos', okText: `${p.photos} photos`, tab: 'photos' as TabId },
    { ok: !!p.description.trim(), title: 'Description', fail: 'Empty', okText: 'Written', tab: 'photos' as TabId },
    { ok: p.roomTypes.every((r) => r.rent != null), title: 'Rent on every room type', fail: `${p.roomTypes.filter((r) => r.rent == null).map((r) => r.name).join(', ')} has no rent`, okText: `${p.roomTypes.length} room types`, tab: 'tenancies' as TabId },
    { ok: hasFees, title: 'Fees', fail: 'No fees apply', okText: `${feeCount} ${feeCount === 1 ? 'fee applies' : 'fees apply'}`, tab: 'tenancies' as TabId },
  ];
  const activate = () => {
    if (problems.some((x) => !x.ok)) return setChecks(true);
    if (!p.wardenPhone.trim()) return setPhoneOpen(true);
    goActive();
  };
  const goActive = () => {
    patchProp(p.id, (x) => ({ status: 'Active', counts: { ...x.counts, active: x.counts.all - x.counts.archived - x.counts.inactive, draft: 0 }, activity: logAct(x, `${x.name} made active`) }));
    toast.success(`${p.name} is active`);
  };
  const archiveNow = () => {
    const was = p.status;
    patchProp(p.id, (x) => ({ status: 'Archived', activity: logAct(x, `${x.name} archived`) }));
    setArchiveAsk(false);
    nav('/inventory/properties');
    toast.success(`${p.name} archived`, { action: { label: 'Undo', onClick: () => patchProp(p.id, () => ({ status: was })) } });
  };
  const setupRows = [
    { k: 'Name, campus and layout', v: `${p.campus} · ${p.structure}`, ok: true, go: () => setEditOpen('basics') },
    { k: 'Address', v: p.address || 'Not set', ok: !!p.address, go: () => setEditOpen('address') },
    { k: 'Units', v: building ? `Building ${p.build!.done} of ${p.build!.total}` : p.units ? `${p.units} rooms in ${p.blocks.length} ${p.blocks.length === 1 ? 'block' : 'blocks'}` : 'No rooms yet', ok: hasRooms, go: () => setTab('units') },
    { k: 'Tenancies', v: p.tenancies === false ? 'Rooms have no tenancy yet' : !templates.length ? 'No tenancy templates yet' : rentless.length ? `${rentless.map((r) => r.name).join(', ')} has no rent` : `${templates.length} ${templates.length === 1 ? 'template' : 'templates'}`, ok: tenanciesOk, go: () => setTab('tenancies') },
    { k: 'Photos and description', v: p.photos ? `${p.photos} photos${p.description ? ' · description' : ''}${p.amenities.length ? ` · ${p.amenities.length} amenities` : ''}` : 'Not added', ok: p.photos > 0 && !!p.description, go: () => setTab('photos') },
  ];
  const doneCount = setupRows.filter((r) => r.ok).length;

  return (
    <>
      {/* A centred modal over the Properties list, like Add property: the Connect header band (record type, actions, ✕), then the property. */}
      <UIDialog open onOpenChange={(o) => { if (!o) nav('/inventory/properties'); }}>
      <DialogContent aria-describedby={undefined} onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement | null)?.focus(); }} className="max-w-[1120px] h-[min(880px,calc(100vh-32px))] max-h-none [--gx:28px] [--cx:20px]">
      <DialogHeader className="py-3 px-6">
        <SheetNavButtons nav={stepper} />
        <DialogTitle>Property</DialogTitle>
        <Menu width={200} trigger={(o) => <button type="button" onClick={o} aria-label="More" className="size-7 rounded-lg text-gray-700 hover:bg-gray-100 flex items-center justify-center"><DotsThree size={16} /></button>} items={[
          { label: 'Edit details', icon: PencilSimple, onClick: () => setEditOpen('basics') },
          { label: 'Copy link', icon: LinkSimple, onClick: () => { void navigator.clipboard?.writeText(window.location.href); toast.success('Link copied'); } },
          { label: 'Rent and fees', icon: CurrencyGbp, onClick: () => nav('/inventory/rent-fees') },
          'sep',
          { label: 'Archive', icon: Archive, danger: true, onClick: () => setArchiveAsk(true) },
        ]} />
        <Button icon={ListDashes} onClick={() => nav(`/inventory/units?p=${p.id}`)}>Open in Inventory</Button>
        {p.status === 'Draft' && <Button variant="primary" icon={CheckCircle} onClick={activate}>Make active…</Button>}
        <DialogCloseButton />
      </DialogHeader>

      <Modal open={archiveAsk} onClose={() => setArchiveAsk(false)} icon={Archive} width={440} title={`Archive ${p.name}?`}
        sub={p.liveTenancies > 0 ? `${p.liveTenancies} tenancies are live, so it can’t be archived yet. Close it to allocations first, from the Properties list.` : 'It leaves Inventory and can’t be booked. You can undo straight after.'}
        footer={p.liveTenancies > 0 ? <><Button onClick={() => setArchiveAsk(false)}>Cancel</Button><Button variant="primary" icon={null} onClick={() => nav(`/inventory/properties?archive=${p.id}`)}>Close to allocations…</Button></>
          : <><Button onClick={() => setArchiveAsk(false)}>Keep</Button><Button variant="danger" icon={null} onClick={archiveNow}>Archive</Button></>}>{null}</Modal>
      <div className="flex-1 min-h-0 overflow-auto flex flex-col">
        {/* 2822:71: 64px grey photo tile, 20px semibold title, 14px #737373 meta with 14px grey-400 icons and · separators. */}
        <div className="px-6 pt-6 pb-5 flex items-center gap-4">
          {/* The property's cover photo, as on the Properties list; the grey tile only while it has none. */}
          {photoOf(p.id)
            ? <img src={photoOf(p.id)} alt="" className="size-16 shrink-0 rounded-xl border border-line object-cover bg-[#F5F5F5]" />
            : <div className="size-16 shrink-0 rounded-xl bg-[#F5F5F5] border border-line flex items-center justify-center"><Image size={24} className="text-[#94A3B8]" /></div>}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5"><h2 className="text-xl leading-7 font-medium tracking-[-0.2px] text-[#0A0A0A]">{p.name}</h2><PropStatus s={p.status} /></div>
            <div className="mt-1 flex items-center gap-2 text-sm leading-5 text-[#737373]">
              <span className="flex items-center gap-2"><BuildingOffice size={14} className="text-gray-400" />{p.campus} campus</span><span>·</span>
              <span className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" />{p.address || 'No address'}</span><span>·</span>
              <span className="flex items-center gap-2"><ListDashes size={14} className="text-gray-400" />{p.structure} layout</span>
            </div>
          </div>
        </div>
        <LineTabs className="px-3.5" value={tab} onChange={setTab} tabs={[
          { id: 'overview', label: 'Overview' }, { id: 'units', label: `Units · ${p.units}` }, { id: 'tenancies', label: 'Tenancies' }, { id: 'photos', label: 'Photos & details' }, { id: 'activity', label: 'Activity' },
        ]} />

        {tab === 'overview' && (
          <div className="p-6 grid grid-cols-[1fr_340px] gap-5 items-start bg-white flex-1">
            <div className="space-y-5 min-w-0">
              {building && (
                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <CircleNotch size={18} className="text-primary animate-spin" />
                    <div className="flex-1"><div className="text-sm font-medium">Creating {p.build!.total} rooms and their tenancies</div><div className="text-xs text-[#737373]">You can leave this page; we’ll email you when it’s done.</div></div>
                    <span className="text-sm tabular-nums">{p.build!.done} / {p.build!.total}</span>
                  </div>
                  <Progress value={(p.build!.done / p.build!.total) * 100} className="mt-3" />
                </Card>
              )}
              {p.pendingRows ? <Note tone="amber" icon={Warning} title={`${p.pendingRows} rows still to add`}>Fix them and import again from the Units tab.</Note> : null}
              <Card>
                <div className="h-12 px-4 flex items-center border-b border-[#F5F5F5]"><span className="text-sm font-semibold">Set-up</span><span className="ml-auto text-xs text-[#737373]">{doneCount} of 5 done</span><Progress value={doneCount * 20} className="w-24 ml-2" /></div>
                {/* 2822:71: 56px rows, 20px green circle with a white tick (dashed grey circle when not done), two-line label. */}
                {setupRows.map((r) => (
                  <div key={r.k} className="h-14 px-4 flex items-center gap-3 border-b border-[#F5F5F5] last:border-0">
                    {r.ok ? <span className="size-5 rounded-full bg-[#0B8A4C] flex items-center justify-center shrink-0"><Check size={12} weight="bold" className="text-white" /></span> : <span className="size-5 rounded-full border border-dashed border-gray-400 shrink-0" />}
                    <span className="flex-1 min-w-0"><span className="block text-sm leading-5 font-medium text-[#0A0A0A]">{r.k}</span><span className="block text-xs leading-4 text-[#737373] truncate">{r.v}</span></span>
                    <EditLink onClick={r.go} />
                  </div>
                ))}
              </Card>
              <Card>
                <div className="h-12 px-4 flex items-center border-b border-[#F5F5F5]"><span className="text-sm font-semibold">Units</span></div>
                {p.blocks.length ? (
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-[#737373] border-b border-line"><th className="font-medium h-9 px-4">Block</th><th className="font-medium px-3">Floors</th><th className="font-medium px-3">Rooms</th><th className="font-medium px-3">Tenancy template</th><th className="font-medium px-3 pr-4">Rent</th></tr></thead>
                    <tbody>{p.blocks.map((b) => {
                      const t = templates.find((x) => x.name === b.roomType);
                      const rt = p.roomTypes.find((x) => x.name === b.roomType);
                      return (
                        <tr key={b.name} className="border-b border-[#F5F5F5] last:border-0 h-10">
                          <td className="px-4 font-medium text-[#0A0A0A]">{b.name}</td><td className="px-3 tabular-nums">{p.structure === 'House' ? '—' : b.floors}</td><td className="px-3 tabular-nums">{b.rooms}</td>
                          <td className="px-3 text-[#737373]">{p.tenancies === false ? <span className="text-gray-400">No tenancy</span> : `${b.roomType}${t ? ` · ${t.weeks} wk` : ''}`}</td>
                          <td className="px-3 pr-4">{p.tenancies === false ? '—' : t ? `${money(t.rent)} / ${per(p)} · ${t.weeks} wk` : rt?.rent ? `${money(rt.rent)} / ${per(p)}` : '—'}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                ) : <Empty art="beds" icon={Bed} title="No rooms yet" sub="Build them here or import a spreadsheet." action={<Button size="sm" onClick={() => setTab('units')}>Build or import rooms</Button>} />}
              </Card>
            </div>
            <Card>
              <div className="h-12 px-4 flex items-center border-b border-[#F5F5F5] text-sm font-semibold">Details</div>
              <dl className="px-4 py-2 grid grid-cols-[120px_1fr] text-sm leading-5 items-center [&>dt]:py-[7px] [&>dd]:py-[6px] [&>dd]:min-w-0">
                <dt className="text-[#737373]">Status</dt><dd><PropStatus s={p.status} /></dd>
                <dt className="text-[#737373]">Letting period</dt><dd className="flex items-center gap-2">{p.letting}<EditLink onClick={() => setLettingOpen(true)}>Change</EditLink></dd>
                <dt className="text-[#737373]">Campus</dt><dd>{p.campus}</dd>
                <dt className="text-[#737373]">Structure</dt><dd>{p.structure} · {p.structure === 'College' ? 5 : 2} levels</dd>
                <dt className="text-[#737373]">Inventory no.</dt><dd className="font-mono">{p.invNo || '—'}</dd>
                <dt className="text-[#737373]">Zone</dt><dd>{p.zone || '—'}</dd>
                <dt className="text-[#737373]">Units</dt><dd>{p.units}</dd>
                <dt className="text-[#737373] self-start pt-0.5">Tags</dt>
                <dd className="flex flex-wrap gap-1.5 items-center">
                  {p.tags.length ? <span className="flex flex-wrap gap-1.5">{p.tags.map((t) => <Tags key={t.label} tags={[t]} />)}</span> : <span className="text-[#737373]">None yet</span>}
                  <Menu align="left" width={180} trigger={(o) => <button type="button" onClick={o} className="text-xs font-medium text-primary inline-flex items-center gap-1">Add tag</button>}
                    items={TAG_CHOICES.filter((t) => !p.tags.some((x) => x.label === t.label)).map((t) => ({ label: t.label, icon: TagIcon, onClick: () => { patchProp(p.id, (x) => ({ tags: [...x.tags, t] })); toast.success(`Tagged ${t.label}`); } }))} />
                </dd>
                <dt className="text-[#737373]">Created</dt><dd className="flex items-center gap-1.5"><Avatar name={p.createdBy} size={20} />{p.createdBy} · {p.created}</dd>
              </dl>
            </Card>
          </div>
        )}

        {tab === 'units' && <UnitsTab p={p} onImport={() => setImportOpen(true)} />}
        {tab === 'tenancies' && (
          <div className="p-6 space-y-5">
            {p.tenancies === false && <Note tone="amber" icon={WarningCircle} title="These rooms have no tenancy yet">Apply a tenancy template to each room type before the property can go active.</Note>}
            <Card className="overflow-hidden">
              <div className="h-14 px-4 flex items-center gap-3 border-b border-[#F5F5F5]"><div className="min-w-0"><div className="text-sm leading-5 font-semibold">Room types</div><div className="mt-1 text-xs leading-4 text-[#737373] truncate">Rent applies to every room of that type</div></div></div>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-[#737373] border-b border-line"><th className="font-medium h-9 px-4">Room type</th><th className="font-medium px-3">Rooms</th><th className="font-medium px-3">Rent / {per(p) === 'wk' ? 'week' : 'month'}</th><th className="pr-4" /></tr></thead>
                <GhostZone.Provider value><tbody>
                  {p.roomTypes.map((r) => (
                    <tr key={r.name} className="border-b border-[#F5F5F5] last:border-0 h-12">
                      <td className="px-4"><span className="flex items-center gap-2 text-sm font-medium"><Bed size={15} className="text-[#737373]" />{r.name}</span></td>
                      <td className="px-3 tabular-nums">{r.rooms}</td>
                      <td className="px-3">{r.rent == null ? <span className="text-[#E0243A]">No rent</span> : r.next ? <span>{money(r.rent)} / {per(p) === 'wk' ? 'week' : 'month'} <span className="text-gray-400">→</span> <b className="font-medium">{money(r.next.rent)}</b> <span className="text-[#737373]">from {r.next.from} for new tenancies</span></span> : `${money(r.rent)} / ${per(p) === 'wk' ? 'week' : 'month'}`}</td>
                      <td className="pr-4 text-right"><Button size="sm" icon={null} onClick={() => setRentFor(r)}>Change rent</Button></td>
                    </tr>
                  ))}
                  {!p.roomTypes.length && <tr><td colSpan={4} className="h-16 text-center text-[#737373]">No room types yet</td></tr>}
                </tbody></GhostZone.Provider>
              </table>
            </Card>
            <Card className="overflow-hidden">
              <div className="h-12 px-4 flex items-center border-b border-[#F5F5F5]"><span className="text-sm font-semibold">Tenancy templates</span><button type="button" onClick={() => nav('/inventory/rent-fees')} className="ml-auto text-sm text-primary">Rent and fees</button></div>
              {templates.length ? templates.map((t) => (
                <div key={t.id} className="h-12 px-4 flex items-center gap-3 border-b border-[#F5F5F5] last:border-0 text-sm">
                  <span className="text-sm font-medium w-44">{t.name}</span><span className="text-[#737373] flex-1">{p.letting === 'Monthly' ? `${money(toMonthly(t.rent, t.weeks).rent, true)} / mo · ${toMonthly(t.rent, t.weeks).months} mo` : `${money(t.rent)} / wk · ${t.weeks} wk`} · deposit {money(t.deposit)} · {t.billing}</span>
                  <span className="text-[#737373]">{t.linked} linked</span><PropStatus s={t.status} />
                </div>
              )) : <div className="p-5 text-sm text-[#737373]">No templates for {short} yet.</div>}
            </Card>
          </div>
        )}
        {tab === 'photos' && <PhotosTab p={p} />}
        {tab === 'activity' && (
          <div className="p-6 max-w-3xl">
            <Card>
              {p.activity.map((a, i) => (
                <div key={i} className="px-4 py-3 flex items-center gap-3 border-b border-[#F5F5F5] last:border-0">
                  <Avatar name={a.who} size={24} /><span className="text-sm flex-1"><b className="font-medium">{a.who}</b> <span className="text-[#737373]">{a.what.charAt(0).toLowerCase() + a.what.slice(1)}</span></span><span className="text-sm text-[#737373]">{a.when}</span>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>
      </DialogContent>
      </UIDialog>

      {/* E2: not ready to go active */}
      <Modal open={checks} onClose={() => setChecks(false)} icon={WarningCircle} tone="amber" title={`${short} can’t go active yet`} sub="Do everything below first." width={520}
        footer={<><Button onClick={() => setChecks(false)}>Later</Button>{(() => { const f = problems.find((x) => !x.ok); return f ? <Button variant="primary" onClick={() => { setChecks(false); setTab(f.tab); }}>Fix the {f.title.toLowerCase()}</Button> : null; })()}</>}>
        <div className="rounded-xl border border-line divide-y divide-line">
          {problems.map((x) => (
            <div key={x.title} className="h-11 px-3.5 flex items-center gap-2.5 text-sm">
              {x.ok ? <CheckCircle size={17} weight="fill" className="text-[#16A34A]" /> : <WarningCircle size={17} weight="fill" className="text-[#E0243A]" />}
              <span className="font-medium flex-1">{x.title}</span><span className={x.ok ? 'text-[#737373]' : 'text-[#E0243A]'}>{x.ok ? x.okText : x.fail}</span>
            </div>
          ))}
        </div>
      </Modal>
      <WardenPhoneDialog p={p} open={phoneOpen} onClose={() => setPhoneOpen(false)} onDone={() => { setPhoneOpen(false); goActive(); }} />
      <LettingDialog p={p} open={lettingOpen} onClose={() => setLettingOpen(false)} />
      <EditSheet p={p} which={editOpen} onClose={() => setEditOpen(null)} />
      <ChangeRentSheet p={p} rt={rentFor} onClose={() => setRentFor(null)} />
      <ImportRoomsSheet p={p} open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}

/* ---------------- Units tab (incl. E1 empty + import result) ---------------- */
function UnitsTab({ p, onImport }: { p: Property; onImport: () => void }) {
  const nav = useNavigate();
  const edits = useInv((s) => s.unitEdits);
  const patchProp = useInv((s) => s.patchProp);
  const short = shortName(p);
  if (p.build && p.build.done < p.build.total) {
    return <div className="p-6"><Card className="p-6 text-center"><CircleNotch size={22} className="text-primary animate-spin mx-auto" /><div className="font-medium mt-2">Building {p.build.total} rooms</div><div className="text-sm text-[#737373] mt-1">{p.build.done} of {p.build.total} done</div><Progress value={(p.build.done / p.build.total) * 100} className="max-w-xs mx-auto mt-3" /></Card></div>;
  }
  if (!p.units) {
    const build = () => {
      patchProp(p.id, (x) => ({ blocks: [{ name: 'Main House', floors: 4, flats: 4, rooms: 96, roomType: 'Ensuite single', size: 14 }], units: 96, build: { done: 0, total: 96 }, roomTypes: x.roomTypes.length ? x.roomTypes : [{ name: 'Ensuite single', rooms: 96, rent: 212 }], counts: { all: 97, active: 0, draft: 97, inactive: 0, archived: 0 }, activity: logAct(x, 'Started building 96 rooms') }));
      toast.success(`Building 96 rooms in ${short}`);
    };
    return (
      <div className="py-16 flex justify-center">
        <div className="max-w-md text-center">
          <EmptyArt kind="clipboard" />
          <div className="font-semibold mt-5">No rooms in {short} yet</div>
          <p className="text-sm text-[#737373] mt-1">Build them block by block, or import a spreadsheet.</p>
          <div className="flex justify-center gap-2 mt-4">
            <Button variant="primary" icon={Plus} onClick={build}>Build rooms</Button>
            <Button icon={DownloadSimple} onClick={() => toast.success('rooms-template.csv downloaded')}>Download template</Button>
            <Button icon={UploadSimple} onClick={onImport}>Import</Button>
          </div>
        </div>
      </div>
    );
  }
  const units = allUnits(p, edits).slice(0, 60);
  return (
    <div className="p-6 space-y-4">
      {p.pendingRows ? (
        <Note tone="amber" icon={Warning} title={`${p.pendingRows} rows still to add`}>
          They weren’t imported. <button type="button" className="text-primary" onClick={() => toast.success(`${short.toLowerCase().replace(/[^a-z]+/g, '-')}-5-rows.csv downloaded`)}>Download the {p.pendingRows} rows</button>, fix them and import again.
        </Note>
      ) : null}
      <Card className="overflow-hidden">
        <div className="h-14 px-4 flex items-center gap-3 border-b border-[#F5F5F5]"><div className="min-w-0"><div className="text-sm leading-5 font-semibold">Rooms</div><div className="mt-1 text-xs leading-4 text-[#737373] truncate">{p.units} in {p.blocks.length} {p.blocks.length === 1 ? 'block' : 'blocks'}</div></div>
          <div className="ml-auto flex gap-2"><Button size="sm" variant="ghost" icon={UploadSimple} onClick={onImport}>Import</Button></div></div>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-[#737373] border-b border-line"><th className="font-medium h-9 px-4">Room</th><th className="font-medium">Block · flat</th><th className="font-medium">Room type</th><th className="font-medium">Rent / {per(p) === 'wk' ? 'week' : 'month'}</th><th className="font-medium pr-4">Status</th></tr></thead>
          <tbody>{units.map((u) => (
            <tr key={u.id} className="border-b border-[#F5F5F5] last:border-0 h-10 hover:bg-[#FAFAFA] cursor-pointer" onClick={() => nav(`/inventory/units?p=${p.id}&open=${encodeURIComponent(u.id)}`)}>
              <td className="px-4 font-mono">{p.tenancies === false ? `B.${u.code.split('.')[0]}.${String(units.indexOf(u) + 1).padStart(2, '0')}` : u.code}</td><td className="text-[#737373]">{u.block} · {u.flat}</td><td>{u.type}</td>
              <td>{u.rent != null ? money(u.rent) : <span className="text-gray-400">No tenancy</span>}</td><td className="pr-4"><PropStatus s={u.status} /></td>
            </tr>
          ))}</tbody>
        </table>
        {p.units > units.length && <div className="h-10 px-4 flex items-center border-t border-line text-sm text-[#737373]">Showing {units.length} of {p.units} · <button type="button" className="text-primary ml-1" onClick={() => nav(`/inventory/units?p=${p.id}`)}>see them all in Inventory</button></div>}
      </Card>
    </div>
  );
}

/* ---------------- E1: import rooms with bad rows ---------------- */
const BAD_ROWS = [
  { row: 14, room: 'B.1.14', problem: 'Room type “Ensuite sngl” doesn’t exist', fix: 'Use Ensuite single' },
  { row: 31, room: 'B.2.07', problem: 'Room size is empty', fix: 'Room size is required on Room' },
  { row: 58, room: 'B.2.07', problem: 'Same room code as row 31', fix: 'Room codes must be unique in a flat' },
  { row: 102, room: 'C.4.12', problem: 'Block “C” isn’t in this property', fix: 'Use Main House or Fenwick Block' },
  { row: 139, room: 'B.3.22', problem: 'Floor 9 is above the top floor', fix: 'Main House has 4 floors' },
];
function ImportRoomsSheet({ p, open, onClose }: { p: Property; open: boolean; onClose: () => void }) {
  const [stage, setStage] = useState<'pick' | 'check'>('pick');
  const busy = useRef(false);
  const patchProp = useInv((s) => s.patchProp);
  const short = shortName(p);
  useEffect(() => { if (open) { setStage('pick'); busy.current = false; } }, [open]);
  const run = () => {
    if (busy.current) return;
    busy.current = true;
    patchProp(p.id, (x) => ({
      blocks: [{ name: 'Main House', floors: 4, flats: 4, rooms: 96, roomType: 'Ensuite single', size: 14 }, { name: 'Fenwick Block', floors: 2, flats: 4, rooms: 45, roomType: 'Standard single', size: 12 }],
      units: 141, build: null, tenancies: false, pendingRows: 5, roomTypes: x.roomTypes.length ? x.roomTypes : [{ name: 'Ensuite single', rooms: 96, rent: null }, { name: 'Standard single', rooms: 45, rent: null }],
      counts: { all: 142, active: 0, draft: 142, inactive: 0, archived: 0 }, activity: logAct(x, '141 rooms imported from st-marys-rooms.csv'),
    }));
    onClose();
    toast.success(`141 rooms built in ${short} · all Draft`, { action: { label: 'Undo', onClick: () => patchProp(p.id, () => ({ blocks: p.blocks, units: p.units, tenancies: p.tenancies, pendingRows: p.pendingRows, counts: p.counts, roomTypes: p.roomTypes })) } });
  };
  return (
    <Sheet open={open} onClose={onClose} width={640} title={`Import ${short} rooms`} sub="One row per room · st-marys-rooms.csv"
      footer={stage === 'pick' ? <><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => setStage('check')}>Check the file</Button></> : <><Button onClick={() => setStage('pick')}>Choose another file</Button><Button variant="primary" onClick={run}>Import 141 rooms</Button></>}>
      {stage === 'pick' ? (
        <div className="[&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">
          <SheetSection title="File">
          <button type="button" onClick={() => setStage('check')} className="w-full rounded-xl border-[1.5px] border-dashed border-gray-300 py-10 flex flex-col items-center gap-2 hover:bg-gray-50">
            <FileCsv size={28} className="text-primary" /><span className="text-sm font-medium">st-marys-rooms.csv</span><span className="text-xs text-[#737373]">146 rows · 18 KB · click to check it</span>
          </button>
          </SheetSection>
          <SheetSection title="Columns">
          <Note tone="blue" icon={Info} title="One row per room">Block, Floor, Flat, Room, Room type, Room size (m²). Rooms come in as Draft with no tenancy.</Note>
          </SheetSection>
        </div>
      ) : (
        <div className="[&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">
          <SheetSection title="Check">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line p-3.5"><div className="text-[22px] font-semibold text-[#0B8A4C]">141</div><div className="text-sm text-[#737373]">rooms ready to import</div></div>
            <div className="rounded-xl border border-[#F59E0B4D] p-3.5"><div className="text-[22px] font-semibold text-[#B45309]">5</div><div className="text-sm text-[#737373]">rows need fixing · left out</div></div>
          </div>
          </SheetSection>
          <SheetSection title="Rows to fix">
          <div className="rounded-xl border border-line overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-[#737373] bg-[#FAFAFA] border-b border-line"><th className="font-medium h-9 px-3">Row</th><th className="font-medium">Room</th><th className="font-medium">Problem</th><th className="font-medium pr-3">Fix</th></tr></thead>
              <tbody>{BAD_ROWS.map((r) => <tr key={r.row} className="border-b border-[#F5F5F5] last:border-0"><td className="px-3 h-11 tabular-nums">{r.row}</td><td className="font-mono">{r.room}</td><td className="text-[#E0243A]">{r.problem}</td><td className="pr-3 text-[#737373]">{r.fix}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-[#737373]">Download the 5 rows after the import, fix them and import again.</p>
          </SheetSection>
        </div>
      )}
    </Sheet>
  );
}

/* ---------------- F3: photos and description ---------------- */
function PhotosTab({ p }: { p: Property }) {
  const patchProp = useInv((s) => s.patchProp);
  const [photos, setPhotos] = useState(p.photos);
  const [desc, setDesc] = useState(p.description);
  const [am, setAm] = useState<string[]>(p.amenities);
  const dirty = photos !== p.photos || desc !== p.description || am.join() !== p.amenities.join();
  const saving = useRef(false);
  const save = () => {
    if (saving.current) return;
    saving.current = true;
    patchProp(p.id, (x) => ({ photos, description: desc, amenities: am, activity: logAct(x, 'Photos and description updated') }));
    toast.success('Photos and description saved');
    window.setTimeout(() => { saving.current = false; }, 300);
  };
  return (
    <div className="flex flex-col flex-1">
      <div className="p-6 grid grid-cols-[1fr_340px] gap-5 items-start flex-1">
        <div className="space-y-5 min-w-0">
          <Card>
            <div className="h-14 px-4 flex items-center gap-3 border-b border-[#F5F5F5]"><div className="min-w-0"><div className="text-sm leading-5 font-semibold">Photos</div><div className="mt-1 text-xs leading-4 text-[#737373] truncate">{photos ? `${photos} · the first is the cover` : 'None yet'}</div></div><Button size="sm" icon={UploadSimple} className="ml-auto" onClick={() => setPhotos(photos ? photos + 1 : 7)}>Add photos</Button></div>
            <div className="p-4">
              {photos ? (
                <div className="grid grid-cols-4 gap-3">
                  {Array.from({ length: Math.min(photos, 8) }, (_, i) => (
                    <div key={i} className={cx('relative overflow-hidden rounded-lg bg-[#EFF6FF] border border-line flex items-center justify-center', i === 0 ? 'col-span-2 row-span-2 aspect-[4/3]' : 'aspect-[4/3]')}>
                      {photoOf(p.id, i)
                        ? <img src={photoOf(p.id, i)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                        : <Image size={i === 0 ? 32 : 20} className="text-[#93C5FD]" />}
                      {i === 0 && <span className="absolute left-2 top-2"><Pill outline>Cover</Pill></span>}
                    </div>
                  ))}
                </div>
              ) : (
                <button type="button" onClick={() => setPhotos(7)} className="w-full rounded-xl border-[1.5px] border-dashed border-gray-300 py-10 flex flex-col items-center gap-2 hover:bg-gray-50">
                  <ImageSquare size={26} className="text-primary" /><span className="text-sm font-medium">Drop photos here</span><span className="text-xs text-[#737373]">JPG or PNG · the first one is the cover</span>
                </button>
              )}
            </div>
          </Card>
          <Card className="p-4">
            <Field label="Description" hint="Shown on the resident booking site."><Textarea rows={5} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={`What’s it like to live at ${p.name}?`} /></Field>
            {!desc && <button type="button" className="mt-2 text-sm text-primary" onClick={() => setDesc(`${p.name} sits on Elvet Hill, ten minutes’ walk from the Bill Bryson Library and the Science Site. Rooms are in flats of six with a shared kitchen; every room is ensuite.`)}>Use a starting draft</button>}
          </Card>
        </div>
        <Card className="p-4">
          <div className="text-sm font-semibold mb-3">Amenities</div>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((a) => {
              const on = am.includes(a);
              return <button key={a} type="button" onClick={() => setAm(on ? am.filter((x) => x !== a) : [...am, a])} className={cx('h-7 px-2.5 rounded-full border text-sm flex items-center gap-1', on ? 'border-primary bg-[#EAF2FF] text-[#1D4ED8]' : 'border-line hover:bg-gray-50')}>{on && <CheckCircle size={13} weight="fill" />}{a}</button>;
            })}
          </div>
        </Card>
      </div>
      {dirty && (
        <div className="sticky bottom-0 h-14 shrink-0 border-t border-line bg-white px-6 flex items-center gap-2 animate-[rise_.2s_cubic-bezier(0.23,1,0.32,1)]">
          <WarningCircle size={16} className="text-[#F59E0B]" /><span className="text-sm">Unsaved changes</span>
          <div className="ml-auto flex gap-2"><Button onClick={() => { setPhotos(p.photos); setDesc(p.description); setAm(p.amenities); }}>Discard</Button><Button variant="primary" onClick={save}>Save</Button></div>
        </div>
      )}
    </div>
  );
}

/* ---------------- F4: required custom field ---------------- */
function WardenPhoneDialog({ p, open, onClose, onDone }: { p: Property; open: boolean; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState('0191 334 5000');
  const busy = useRef(false);
  const patchProp = useInv((s) => s.patchProp);
  useEffect(() => { if (open) busy.current = false; }, [open]);
  const save = () => {
    if (busy.current || !v.trim()) return;
    busy.current = true;
    patchProp(p.id, () => ({ wardenPhone: v.trim() }));
    onDone();
  };
  return (
    <Modal open={open} onClose={onClose} icon={WarningCircle} tone="amber" title={`${p.name} can’t be active yet`} sub="Fill in the required field to make it active." width={520}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!v.trim()} onClick={save}>Save and make active</Button></>}>
      <div className="rounded-xl border border-line">
        <div className="h-10 px-3.5 flex items-center border-b border-line text-sm font-medium">1 thing to fix</div>
        <div className="p-3.5 space-y-3">
          <div className="flex items-start gap-2.5"><WarningCircle size={17} weight="fill" className="text-[#E0243A] mt-px" /><div><div className="text-sm font-medium">Warden phone is empty</div><div className="text-xs text-[#737373]">A required custom field on Property · <span className="font-mono">field.wardenPhone</span></div></div></div>
          <Field label="Warden phone"><Input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} /></Field>
        </div>
      </div>
    </Modal>
  );
}

/* ---------------- F7: switch letting period ---------------- */
function LettingDialog({ p, open, onClose }: { p: Property; open: boolean; onClose: () => void }) {
  const allTpl = useInv((s) => s.templates);
  const templates = useMemo(() => allTpl.filter((t) => t.propertyId === p.id), [allTpl, p.id]);
  const patchProp = useInv((s) => s.patchProp);
  const target = p.letting === 'Weekly' ? 'Monthly' : 'Weekly';
  const [pick, setPick] = useState<'Weekly' | 'Monthly'>(target);
  const busy = useRef(false);
  useEffect(() => { if (open) { setPick(target); busy.current = false; } }, [open, target]);
  const n = p.counts.all;
  const save = () => {
    if (busy.current) return;
    if (pick === p.letting) return onClose();
    busy.current = true;
    patchProp(p.id, (x) => ({ letting: pick, activity: logAct(x, `Switched to ${pick.toLowerCase()} letting`) }));
    onClose();
    toast.success(`${shortName(p)} is ${pick.toLowerCase()} · ${templates.length} templates and ${n} tenancies converted`);
  };
  const now = (rent: number, weeks: number) => (p.letting === 'Weekly' ? `${money(rent)} / wk · ${weeks} wk` : `${money(toMonthly(rent, weeks).rent, true)} / mo · ${toMonthly(rent, weeks).months} mo`);
  const after = (rent: number, weeks: number) => (pick === 'Monthly' ? `${money(toMonthly(rent, weeks).rent, true)} / mo · ${toMonthly(rent, weeks).months} mo` : `${money(rent)} / wk · ${weeks} wk`);
  return (
    <Modal open={open} onClose={onClose} icon={ArrowsLeftRight} title={`Switch ${p.name} to ${pick.toLowerCase()}?`} width={580}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={pick === p.letting} onClick={save}>Switch to {pick.toLowerCase()}</Button></>}>
      <div className="grid grid-cols-2 gap-2.5">
        <RadioCard checked={pick === 'Weekly'} onClick={() => setPick('Weekly')} title="Weekly" sub="Rent per week, length in weeks" />
        <RadioCard checked={pick === 'Monthly'} onClick={() => setPick('Monthly')} title="Monthly" sub="Rent per month, length in months" />
      </div>
      {pick !== p.letting && (
        <>
          <div className="rounded-xl border border-line overflow-hidden mt-4">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-[#737373] bg-[#FAFAFA] border-b border-line"><th className="font-medium h-9 px-3">Template</th><th className="font-medium">Now</th><th className="font-medium pr-3">After</th></tr></thead>
              <tbody>{templates.map((t) => <tr key={t.id} className="border-b border-[#F5F5F5] last:border-0 h-10"><td className="px-3 font-medium">{t.name}</td><td className="text-[#737373]">{now(t.rent, t.weeks)}</td><td className="pr-3 font-medium">{after(t.rent, t.weeks)}</td></tr>)}</tbody>
            </table>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-[#737373] list-disc pl-5">
            <li>Converts {templates.length} templates and {n} tenancies: rent × 52 ÷ 12 to the penny, length to whole months.</li>
            <li>Deposits and billing frequency stay as they are.</li>
          </ul>
          <div className="mt-3"><Note tone="amber" icon={Warning} title="Switching back won’t undo it exactly">A tenancy’s length can shift by a week.</Note></div>
        </>
      )}
    </Modal>
  );
}

/* ---------------- E4: change rent for a room type ---------------- */
function ChangeRentSheet({ p, rt, onClose }: { p: Property; rt: RoomType | null; onClose: () => void }) {
  const patchProp = useInv((s) => s.patchProp);
  const [rent, setRent] = useState('');
  const [from, setFrom] = useState('1 January 2027');
  const [apply, setApply] = useState<'new' | 'all'>('new');
  const busy = useRef(false);
  useEffect(() => { if (rt) { setRent(String((rt.rent ?? 182) + 8)); setFrom('1 January 2027'); setApply('new'); busy.current = false; } }, [rt]);
  if (!rt) return null;
  const signed = Math.round(rt.rooms * 0.92);
  const unit = per(p) === 'wk' ? 'week' : 'month';
  const fromShort = from.replace(/^(\d+) (\w{3})\w* \d{4}$/, '$1 $2');
  const rentErr = moneyErr(rent, 'a rent');
  const fromErr = parseDay(from) ? '' : 'Enter a date, e.g. 1 January 2027.';
  const save = () => {
    if (busy.current || rentErr || fromErr) return;
    busy.current = true;
    const old = p.roomTypes;
    patchProp(p.id, (x) => ({
      roomTypes: x.roomTypes.map((r) => (r.name !== rt.name ? r : apply === 'all' ? { ...r, rent: +rent, next: undefined } : { ...r, next: { rent: +rent, from: fromShort } })),
      activity: logAct(x, `${rt.name} rent set to ${money(+rent)} from ${fromShort}`),
    }));
    onClose();
    toast.success(apply === 'new' ? `${rt.name} is ${money(+rent)} from ${fromShort} for new tenancies · ${signed} signed stay at ${money(rt.rent ?? 0)}` : `${rt.name} is ${money(+rent)} from ${fromShort} for all ${rt.rooms} tenancies`,
      { action: { label: 'Undo', onClick: () => patchProp(p.id, () => ({ roomTypes: old })) } });
  };
  return (
    <Sheet open onClose={onClose} title={`Change rent · ${rt.name}`} sub={`${p.name} · ${rt.rooms} rooms · now ${rt.rent != null ? `${money(rt.rent)} / ${unit}` : 'no rent'}`} width={480}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!!rentErr || !!fromErr} onClick={save}>{apply === 'new' ? `Save ${money(+rent || 0)} for new tenancies` : `Save ${money(+rent || 0)} for all`}</Button></>}>
      <div className="[&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">
        <SheetSection title="New rent">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rent"><MoneyInput value={rent} onChange={setRent} suffix={`/ ${unit}`} /><FieldErr>{rentErr}</FieldErr></Field>
          <Field label="From"><label className="h-8 flex items-center gap-2 rounded-lg border border-gray-300 px-2.5 text-sm"><CalendarBlank size={14} className="text-[#737373]" /><input aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} className="flex-1 min-w-0 outline-none" /></label><FieldErr>{fromErr}</FieldErr></Field>
        </div>
        </SheetSection>
        <SheetSection title="Apply to">
          <div className="space-y-2">
            <RadioCard checked={apply === 'new'} onClick={() => setApply('new')} title="New tenancies only" sub={`${signed} signed tenancies stay at ${rt.rent != null ? money(rt.rent) : '—'}`} />
            <RadioCard checked={apply === 'all'} onClick={() => setApply('all')} title="Also signed tenancies" sub={`Changes ${signed} signed contracts · each resident is emailed`} />
          </div>
          {apply === 'all' && <div className="mt-4"><Note tone="amber" icon={Warning} title={`${signed} residents have signed at ${rt.rent != null ? money(rt.rent) : '—'}`}>Raising rent on a signed contract needs their agreement. They’re each emailed the change and can object.</Note></div>}
        </SheetSection>
      </div>
    </Sheet>
  );
}

/* ---------------- Edit name/campus or address ---------------- */
function EditSheet({ p, which, onClose }: { p: Property; which: null | 'basics' | 'address'; onClose: () => void }) {
  const patchProp = useInv((s) => s.patchProp);
  const [name, setName] = useState(p.name);
  const [invNo, setInvNo] = useState(p.invNo);
  const [address, setAddress] = useState(p.address);
  const [zone, setZone] = useState(p.zone);
  useEffect(() => { if (which) { setName(p.name); setInvNo(p.invNo); setAddress(p.address); setZone(p.zone); } }, [which, p]);
  const others = useInv((s) => s.properties);
  const nameErr = !name.trim() ? 'Enter a property name.' : others.some((x) => x.id !== p.id && x.name.trim().toLowerCase() === name.trim().toLowerCase()) ? `A property called ${name.trim()} already exists.` : '';
  const save = () => {
    if (nameErr) return;
    patchProp(p.id, (x) => ({ name: name.trim(), invNo, address, zone, activity: logAct(x, which === 'basics' ? 'Details edited' : 'Address edited') }));
    onClose();
    toast.success(which === 'address' ? `${name.trim()} address saved` : `${name.trim()} details saved`);
  };
  return (
    <Sheet open={!!which} onClose={onClose} title={which === 'address' ? 'Address' : 'Name, campus and layout'} sub={p.name} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!!nameErr} onClick={save}>Save</Button></>}>
      {which === 'basics' ? (
        <div className="[&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">
          <SheetSection title="Details">
          <div className="space-y-4">
          <Field label="Property name"><Input value={name} onChange={(e) => setName(e.target.value)} /><FieldErr>{nameErr}</FieldErr></Field>
          <Field label="Inventory number" hint="Optional · your own reference"><Input className="font-mono" value={invNo} onChange={(e) => setInvNo(e.target.value)} /></Field>
          <Field label="Campus"><Input value={p.campus} disabled /></Field>
          </div>
          </SheetSection>
          <SheetSection title="Layout">
          <Note tone="blue" icon={Info} title="The layout can’t change">{p.name} has rooms built from the {p.structure} layout.</Note>
          </SheetSection>
        </div>
      ) : (
        <div className="[&>section:first-child]:border-t-0 [&>section:first-child]:pt-0">
          <SheetSection title="Location">
          <div className="space-y-4">
          <Field label="Address"><Input value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
          <Field label="Zone" hint="Optional · groups nearby properties"><Input value={zone} onChange={(e) => setZone(e.target.value)} /></Field>
          </div>
          </SheetSection>
        </div>
      )}
    </Sheet>
  );
}

