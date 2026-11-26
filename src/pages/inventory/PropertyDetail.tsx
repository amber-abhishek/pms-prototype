import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, ArrowsLeftRight, Bed, Copy, BuildingOffice, CalendarBlank, CheckCircle, Check, CircleNotch, CurrencyGbp,
  DotsThree, DownloadSimple, FileCsv, Image, ImageSquare, LinkSimple, ListDashes, MapPin, PencilSimple, Plus, Archive, UploadSimple, Warning, WarningCircle,
} from '../../components/icons';
import { Avatar, Button, Card, DL, Empty, Field, Input, Note, Sheet, SheetNavButtons, Textarea, cx, listNav, Pill, SheetHero, SheetRow, SheetSection } from '../../components/ui';
import { layoutOf } from './LevelSheet';
import { allUnits, invId, logAct, money, per, toMonthly, useInv, type Property, type RoomType, type Tag, type Template } from '../../data/inventory';
import { useTab } from '../hooks';
import { NotFound } from '../Misc';
import { EditLink, FieldErr, TagPicker, addTagChip, LineTabs, Menu, Modal, MoneyInput, PanelModal, PropStatus, Progress, RadioCard, Tags, moneyErr, parseDay } from './common';
import { EmptyArt, PRE_LET, shownOrder } from './Properties';
import { photoOf } from './photos';
import { TemplateDialog, draftTemplate } from './RentFees';
import { Checkbox } from '../../components/shadcn/checkbox';
import { AMENITIES, AMENITY_ICON, PhotosCards, photoOrder } from './PropertyPhotos';
import { GhostZone } from '../../components/headerCtx';
import { Dialog as UIDialog, DialogCloseButton, DialogContent, DialogHeader, DialogTitle } from '../../components/shadcn/dialog';

type TabId = 'overview' | 'units' | 'tenancies' | 'photos' | 'activity';
const shortName = (p: Property) => p.name.replace(/ College$/, '');

/* Opened from Units (2026-11-26) it takes the id and a close of its own, and steps through nothing. */
export function PropertyDetail({ id: idProp, onClose }: { id?: string; onClose?: () => void } = {}) {
  const params = useParams();
  const id = idProp ?? params.id ?? '';
  const p = useInv((s) => s.properties.find((x) => x.id === id));
  const allTpl = useInv((s) => s.templates);
  const templates = useMemo(() => allTpl.filter((t) => t.propertyId === id), [allTpl, id]);
  /* Add template: when other properties already have templates, start by offering to copy one; a blank template is
     the alternative (2026-11-20). With none anywhere else, go straight to the blank one. */
  const otherTpl = allTpl.filter((t) => t.propertyId !== id);
  const addTemplate = () => (otherTpl.length ? setCopyTpl(true) : setNewTpl(draftTemplate(id)));
  const patchProp = useInv((s) => s.patchProp);
  const removeTag = (t: Tag) => {
    if (!id) return;
    patchProp(id, (x) => ({ tags: x.tags.filter((y) => y.label !== t.label), activity: logAct(x, `Untagged ${t.label}`) }));
    toast.success(`${t.label} removed`, { action: { label: 'Undo', onClick: () => patchProp(id, (x) => ({ tags: x.tags.some((y) => y.label === t.label) ? x.tags : [...x.tags, t] })) } });
  };
  /* A tag on the record. No remove × on the tag (2026-11-23): tags come off from the Add tag picker, where ticked ones click off. */
  const TagX = ({ t }: { t: Tag }) => <Tags tags={[t]} />;
  const addTag = (t: Tag, created: boolean) => { if (!id) return; patchProp(id, (x) => ({ tags: [...x.tags, t], activity: logAct(x, `Tagged ${t.label}`) })); toast.success(created ? `${t.label} created and added` : `Tagged ${t.label}`); };
  const nav = useNavigate();
  const loc = useLocation();
  const close = onClose ?? (() => nav('/inventory/properties'));
  /* ↑ ↓ (and the keys) step through the Properties list as it is shown; straight from a link, through every unarchived property. */
  const allIds = useInv((s) => s.properties).filter((x) => x.status !== 'Archived').map((x) => x.id);
  const stepper = onClose ? undefined : listNav(shownOrder.ids.length ? shownOrder.ids : allIds, (x) => x === id, (x) => nav(`/inventory/properties/${x}${loc.search}`));
  const [tab, setTab] = useTab<TabId>('overview');
  const [checks, setChecks] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [lettingOpen, setLettingOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<null | 'basics' | 'address'>(null);
  const [newTpl, setNewTpl] = useState<Template | null>(null);
  const [copyTpl, setCopyTpl] = useState(false);
  const [rentFor, setRentFor] = useState<RoomType | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [archiveAsk, setArchiveAsk] = useState(false);
  const fees = useInv((s) => s.fees);
  const unitEdits = useInv((s) => s.unitEdits);
  const asModal = new URLSearchParams(loc.search).get('view') === 'modal';

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
        patchProp(cur.id, (x) => ({ build: null, activity: logAct(x, `Built ${total} rooms and tenancies`) }));
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
    patchProp(p.id, (x) => ({ status: 'Active', counts: { ...x.counts, active: x.counts.all - x.counts.archived - x.counts.inactive, draft: 0 }, activity: logAct(x, `Made ${x.name} active`) }));
    toast.success(`${p.name} is active`);
  };
  const archiveNow = () => {
    const was = p.status;
    patchProp(p.id, (x) => ({ status: 'Archived', archivedFrom: x.status, activity: logAct(x, `Archived ${x.name}`) }));
    setArchiveAsk(false);
    close();
    toast.success(`${p.name} archived`, { action: { label: 'Undo', onClick: () => patchProp(p.id, () => ({ status: was })) } });
  };
  const setupRows = [
    { k: 'Name, location and layout', v: `${p.campus} · ${p.structure}`, ok: true, cta: 'Edit', go: () => setEditOpen('basics') },
    { k: 'Address', v: p.address || 'Not set', ok: !!p.address, cta: 'Add address', go: () => setEditOpen('address') },
    { k: 'Units', v: building ? `Building ${p.build!.done} of ${p.build!.total}` : p.units ? `${p.units} rooms in ${p.blocks.length} ${p.blocks.length === 1 ? 'block' : 'blocks'}` : 'No rooms yet', ok: hasRooms, cta: building ? 'View' : 'Add rooms', go: () => setTab('units') },
    { k: 'Tenancies', v: p.tenancies === false ? 'Rooms have no tenancy yet' : !templates.length ? 'No tenancy templates yet' : rentless.length ? `${rentless.map((r) => r.name).join(', ')} has no rent` : `${templates.length} ${templates.length === 1 ? 'template' : 'templates'}${!hasRooms ? ' · waiting for rooms' : ''}`, ok: tenanciesOk,
      /* Templates and rent are in but rooms aren't built yet: nothing to do here, so no link (2026-11-20). */
      cta: !templates.length ? 'Add template' : p.tenancies !== false && rentless.length ? 'Set rent' : p.tenancies === false ? 'Apply templates' : null, go: () => { setTab('tenancies'); if (!templates.length) addTemplate(); } },
    { k: 'Photos and description', v: p.photos ? `${p.photos} photos${p.description ? ' · description' : ''}${p.amenities.length ? ` · ${p.amenities.length} amenities` : ''}` : 'Not added', ok: p.photos > 0 && !!p.description, cta: !p.photos ? 'Add photos' : 'Add description', go: () => setTab('photos') },
  ];
  const doneCount = setupRows.filter((r) => r.ok).length;
  /* Set-up is a to-do list: once all five are done it goes (2026-11-23). Campus and address stay in the hero; units,
     tenancies and photos have their own tabs, so nothing it showed is lost. */
  const setupDone = doneCount === setupRows.length;
  /* A checklist, not a form: done steps carry no link (their details are edited in Details or on their tab); a step
     still to do gets one action that names what's missing (2026-11-20). */
  const setupAction = (r: typeof setupRows[number]) => (r.ok || !r.cta ? null : <EditLink onClick={r.go}>{r.cta}</EditLink>);

  const extras = (
    <>
      <Modal open={archiveAsk} onClose={() => setArchiveAsk(false)} icon={Archive} width={440} title={`Archive ${p.name}?`}
        sub={p.liveTenancies > 0 ? `${p.liveTenancies} tenancies are live, so it can’t be archived yet. Close it to allocations first, from the Properties list.` : 'It leaves your properties and can’t be booked. You can undo straight after.'}
        footer={p.liveTenancies > 0 ? <><Button onClick={() => setArchiveAsk(false)}>Cancel</Button><Button variant="primary" icon={null} onClick={() => nav(`/inventory/properties?archive=${p.id}`)}>Close to allocations</Button></>
          : <><Button onClick={() => setArchiveAsk(false)}>Keep</Button><Button variant="danger" icon={null} onClick={archiveNow}>Archive</Button></>}>{null}</Modal>
      {/* E2: not ready to go active */}
      <Modal open={checks} onClose={() => setChecks(false)} title={`${short} can’t go active yet`} width={520}
        footer={<><Button onClick={() => setChecks(false)}>Later</Button>{(() => { const f = problems.find((x) => !x.ok); return f ? <Button variant="primary" icon={null} onClick={() => { setChecks(false); setTab(f.tab); }}>Fix the {f.title.toLowerCase()}</Button> : null; })()}</>}>
        <div>
          {problems.map((x) => (
            <SheetRow key={x.title} title={x.title}
              lead={x.ok ? <CheckCircle size={17} weight="fill" className="shrink-0 text-[#16A34A]" /> : <WarningCircle size={17} weight="fill" className="shrink-0 text-[#E0243A]" />}
              end={<span className={cx('shrink-0 text-sm', x.ok ? 'text-[#737373]' : 'text-[#E0243A]')}>{x.ok ? x.okText : x.fail}</span>} />
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
  /* Default: a 640px right-hand side sheet over the Properties list (like a resident). ?view=modal keeps the centred modal. */
  if (!asModal) return (
    <>
      {/* Record panel (2026-11-19): read-only. Archive sits in the control bar; edits open centred modals from the
          section Edit links; the footer only carries a draft's Make active. Open in Inventory lives on the Units tab. */}
      <Sheet open onClose={close} title="Property" width={576} nav={stepper}
        onDelete={{ label: 'Archive property', icon: Archive, onClick: () => setArchiveAsk(true) }}
        footer={p.status === 'Draft' ? <Button variant="primary" icon={null} onClick={activate}>Make active</Button> : undefined}>
        {/* Status is the record's state, so it sits on the name line (2026-11-23); the tag row below holds only tags and Add tag. */}
        <SheetHero name={p.name} meta={`${p.campus} · ${p.address || 'No address'}`}
          lead={photoOf(p.id)
            ? <img src={photoOf(p.id, photoOrder(p)[0] ?? 0)} alt="" className="size-14 shrink-0 rounded-xl object-cover bg-[#F5F5F5]" />
            : <div className="size-14 shrink-0 rounded-xl bg-[#F5F5F5] flex items-center justify-center"><Image size={24} className="text-[#A3A3A3]" /></div>}
          tags={<>
            {p.tags.map((t) => <TagX key={t.label} t={t} />)}
            <TagPicker have={p.tags} onPick={addTag} onRemove={removeTag} trigger={addTagChip()} />
          </>}
          facts={[['Units', String(p.units)], ['Pre-let', PRE_LET[p.id] != null ? `${PRE_LET[p.id]}%` : '—', PRE_LET[p.id] != null ? (PRE_LET[p.id] < 85 ? 'amber' : 'green') : undefined], ['Letting', p.letting]]}>
          <PropStatus s={p.status} />
        </SheetHero>
        <div className="-mx-5">
          <LineTabs value={tab} onChange={setTab} tabs={[
            { id: 'overview', label: 'Overview' }, { id: 'units', label: 'Units' }, { id: 'tenancies', label: 'Tenancies' }, { id: 'photos', label: 'Photos' }, { id: 'activity', label: 'Activity' },
          ]} />
        </div>
        {tab === 'overview' && (
          <div className="-mx-5 px-5 pt-5">
            {building && (
              <div className="mb-5">
                <div className="flex items-center gap-3">
                  <CircleNotch size={18} className="text-primary animate-spin" />
                  <div className="flex-1 text-sm font-medium">Creating {p.build!.total} rooms and their tenancies</div>
                  <span className="text-sm tabular-nums">{p.build!.done} / {p.build!.total}</span>
                </div>
                <Progress value={(p.build!.done / p.build!.total) * 100} className="mt-3" />
              </div>
            )}
            {p.pendingRows ? <div className="mb-5"><Note tone="amber" icon={Warning} title={`${p.pendingRows} rows still to add`}>Fix them and import again from the Units tab.</Note></div> : null}
{!setupDone && (
            <SheetSection title={`Set-up · ${doneCount} of 5`}>
              {setupRows.map((r) => (
                <SheetRow key={r.k} title={r.k} sub={r.v} end={setupAction(r)}
                  lead={r.ok ? <span className="size-5 rounded-full bg-[#0B8A4C] flex items-center justify-center shrink-0"><Check size={12} weight="bold" className="text-white" /></span> : <span className="size-5 rounded-full border border-dashed border-gray-400 shrink-0" />} />
              ))}
            </SheetSection>
            )}
            {/* What the property is (reference, layout, zone); units and letting period are in the key facts above, so they
                aren't said twice (2026-11-23). Who created it is record history, so it closes the card as one quiet line. */}
            <SheetSection title="Details" action={<EditLink onClick={() => setEditOpen('basics')} />}>
              <div className="-my-2.5">
                <DL rows={[
                  ['Inventory no.', p.invNo ? <span className="font-mono">{p.invNo}</span> : '—'],
                  ['Layout', `${layoutOf(p)} · ${useInv.getState().structures.find((x) => x.name === layoutOf(p))?.levels.length ?? (p.structure === 'Building' ? 5 : 3)} levels`],
                  ['Zone', p.zone || '—'],
                ]} />
                <p className="mt-3 pb-2.5 pt-1 text-xs leading-4 text-[#737373]">Created by {p.createdBy} on {p.created}</p>
              </div>
            </SheetSection>
          </div>
        )}
        {tab === 'units' && (
          <div className="-mx-5 px-5 pt-5">
            {p.blocks.length ? <>
              <SheetSection title={`Blocks · ${p.blocks.length}`}>
                {p.blocks.map((b) => {
                  const t = templates.find((x) => x.name === b.roomType);
                  return <SheetRow key={b.name} title={b.name} sub={`${p.structure === 'House' ? '' : `${b.floors} floors · `}${b.rooms} rooms · ${b.roomType}`}
                    end={<span className="shrink-0 text-sm text-[#737373] tabular-nums">{p.tenancies === false ? 'No tenancy' : t ? `${money(t.rent)} / ${per(p)} · ${t.weeks} wk` : '—'}</span>} />;
                })}
              </SheetSection>
              <SheetSection title={`Rooms · ${p.units}`} action={<EditLink onClick={() => nav(`/inventory/units?p=${p.id}`)}>Open in Units</EditLink>}>
                {allUnits(p, unitEdits).slice(0, 12).map((u) => (
                  <SheetRow key={u.id} title={<span className="font-mono text-[13px]">{u.code}</span>} sub={`${u.block} · ${u.type}`} end={<PropStatus s={u.status} />}
                    onClick={() => nav(`/inventory/units?p=${p.id}&open=${encodeURIComponent(u.id)}`)} />
                ))}
                {p.units > 12 && <p className="pt-3 text-sm text-[#737373]">And {p.units - 12} more</p>}
              </SheetSection>
            </> : <div className="-mx-5 -mt-5"><UnitsTab p={p} onImport={() => setImportOpen(true)} /></div>}
          </div>
        )}
        {tab === 'tenancies' && (
          <div className="-mx-5 px-5 pt-5">
            {p.tenancies === false && <div className="mb-5"><Note tone="amber" icon={WarningCircle} title="These rooms have no tenancy yet">Apply a template to each room type first.</Note></div>}
            <SheetSection title={`Room types · ${p.roomTypes.length}`}>
              {p.roomTypes.map((r) => (
                <SheetRow key={r.name} title={r.name} end={<EditLink onClick={() => setRentFor(r)}>Change rent</EditLink>}
                  sub={<>{r.rooms} rooms · {r.rent == null ? <span className="text-[#E0243A]">No rent</span> : `${money(r.rent)} / ${per(p)}`}{r.next ? ` → ${money(r.next.rent)} from ${r.next.from}` : ''}</>} />
              ))}
              {!p.roomTypes.length && <p className="text-sm text-[#737373]">No room types yet</p>}
            </SheetSection>
            <SheetSection title={`Templates · ${templates.length}`} action={<EditLink onClick={addTemplate}><Plus size={14} />Add template</EditLink>}>
              {templates.length ? templates.map((t) => (
                <SheetRow key={t.id} title={t.name} end={<PropStatus s={t.status} />}
                  sub={`${p.letting === 'Monthly' ? `${money(toMonthly(t.rent, t.weeks).rent, true)} / mo · ${toMonthly(t.rent, t.weeks).months} mo` : `${money(t.rent)} / wk · ${t.weeks} wk`} · deposit ${money(t.deposit)} · ${t.linked} linked`} />
              )) : <p className="text-sm text-[#737373]">No templates for {short} yet.</p>}
            </SheetSection>
            {newTpl && <TemplateDialog t={newTpl} isNew open onClose={() => setNewTpl(null)} siblings={templates} />}
            <CopyTemplatesDialog p={p} open={copyTpl} onClose={() => setCopyTpl(false)} onBlank={() => { setCopyTpl(false); setNewTpl(draftTemplate(p.id)); }} />
          </div>
        )}
        {tab === 'photos' && <div className="-mx-5 px-5 pt-5"><PhotosCards p={p} /></div>}
        {tab === 'activity' && (
          <div className="-mx-5 px-5 pt-5">
            <SheetSection title="Activity">
              {/* Figma "Property · Activity": avatar, "Name did something", the time under it in grey. */}
              {p.activity.map((a, i) => (
                <SheetRow key={i} lead={<Avatar name={a.who} size={24} />} title={<><span className="font-medium">{a.who}</span> <span className="text-[#525252]">{actText(a.what)}</span></>} sub={a.when} />
              ))}
            </SheetSection>
          </div>
        )}
      </Sheet>
      {extras}
    </>
  );
  return (
    <>
      {/* A centred modal over the Properties list, like Add property: the Connect header band (record type, actions, ✕), then the property. */}
      <UIDialog open onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent aria-describedby={undefined} onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement | null)?.focus(); }} className="max-w-[1120px] h-[min(880px,calc(100vh-32px))] max-h-none [--gx:28px] [--cx:20px]">
      <DialogHeader className="py-3 px-6">
        <SheetNavButtons nav={stepper} />
        <DialogTitle>Property</DialogTitle>
        <Menu width={200} trigger={(o) => <button type="button" onClick={o} aria-label="More" className="size-7 rounded-lg text-gray-700 hover:bg-gray-100 flex items-center justify-center"><DotsThree size={16} /></button>} items={[
          { label: 'Edit details', icon: PencilSimple, onClick: () => setEditOpen('basics') },
          { label: 'Copy link', icon: LinkSimple, onClick: () => { void navigator.clipboard?.writeText(window.location.href); toast.success('Link copied'); } },
          { label: 'Pricing', icon: CurrencyGbp, onClick: () => nav('/inventory/rent-fees') },
          { label: 'Change letting period', icon: ArrowsLeftRight, onClick: () => setLettingOpen(true) },
          'sep',
          { label: 'Archive', icon: Archive, danger: true, onClick: () => setArchiveAsk(true) },
        ]} />
        <Button icon={ListDashes} onClick={() => nav(`/inventory/units?p=${p.id}`)}>Open in Units</Button>
        {p.status === 'Draft' && <Button variant="primary" icon={CheckCircle} onClick={activate}>Make active</Button>}
        <DialogCloseButton />
      </DialogHeader>

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
          { id: 'overview', label: 'Overview' }, { id: 'units', label: 'Units' }, { id: 'tenancies', label: 'Tenancies' }, { id: 'photos', label: 'Photos & details' }, { id: 'activity', label: 'Activity' },
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
              {!setupDone && (
              <Card>
                <div className="h-12 px-4 flex items-center border-b border-[#F5F5F5]"><span className="text-sm font-semibold">Set-up</span><span className="ml-auto text-xs text-[#737373]">{doneCount} of 5 done</span><Progress value={doneCount * 20} className="w-24 ml-2" /></div>
                {/* 2822:71: 56px rows, 20px green circle with a white tick (dashed grey circle when not done), two-line label. */}
                {setupRows.map((r) => (
                  <div key={r.k} className="h-14 px-4 flex items-center gap-3 border-b border-[#F5F5F5] last:border-0">
                    {r.ok ? <span className="size-5 rounded-full bg-[#0B8A4C] flex items-center justify-center shrink-0"><Check size={12} weight="bold" className="text-white" /></span> : <span className="size-5 rounded-full border border-dashed border-gray-400 shrink-0" />}
                    <span className="flex-1 min-w-0"><span className="block text-sm leading-5 font-medium text-[#0A0A0A]">{r.k}</span><span className="block text-xs leading-4 text-[#737373] truncate">{r.v}</span></span>
                    {setupAction(r)}
                  </div>
                ))}
              </Card>
              )}
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
                <dt className="text-[#737373]">Letting period</dt><dd>{p.letting}</dd>
                <dt className="text-[#737373]">Location</dt><dd>{p.campus}</dd>
                <dt className="text-[#737373]">Structure</dt><dd>{p.structure} · {p.structure === 'Building' ? 5 : 2} levels</dd>
                <dt className="text-[#737373]">Inventory no.</dt><dd className="font-mono">{p.invNo || '—'}</dd>
                <dt className="text-[#737373]">Zone</dt><dd>{p.zone || '—'}</dd>
                <dt className="text-[#737373]">Units</dt><dd>{p.units}</dd>
                <dt className="text-[#737373] self-start pt-0.5">Tags</dt>
                <dd className="flex flex-wrap gap-1.5 items-center">
                  {p.tags.length ? <span className="flex flex-wrap gap-1.5">{p.tags.map((t) => <TagX key={t.label} t={t} />)}</span> : <span className="text-[#737373]">None yet</span>}
                  <TagPicker have={p.tags} onPick={addTag} onRemove={removeTag} trigger={addTagChip()} />
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
              {!p.roomTypes.length ? <div className="h-16 flex items-center justify-center text-sm text-[#737373]">No room types yet</div> : <table className="w-full text-sm">
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
                </tbody></GhostZone.Provider>
              </table>}
            </Card>
            <Card className="overflow-hidden">
              <div className="h-12 px-4 flex items-center border-b border-[#F5F5F5]"><span className="text-sm font-semibold">Tenancy templates</span><button type="button" onClick={() => nav('/inventory/rent-fees')} className="ml-auto text-sm text-primary">Pricing</button></div>
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

      {extras}
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
          <div className="text-base leading-6 font-medium mt-5">No rooms in {short} yet</div>
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
        {p.units > units.length && <div className="h-10 px-4 flex items-center border-t border-line text-sm text-[#737373]">Showing {units.length} of {p.units} · <button type="button" className="text-primary ml-1" onClick={() => nav(`/inventory/units?p=${p.id}`)}>see them all in Units</button></div>}
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
      counts: { all: 142, active: 0, draft: 142, inactive: 0, archived: 0 }, activity: logAct(x, 'Imported 141 rooms from st-marys-rooms.csv'),
    }));
    onClose();
    toast.success(`141 rooms built in ${short} · all Draft`, { action: { label: 'Undo', onClick: () => patchProp(p.id, () => ({ blocks: p.blocks, units: p.units, tenancies: p.tenancies, pendingRows: p.pendingRows, counts: p.counts, roomTypes: p.roomTypes })) } });
  };
  return (
    <PanelModal open={open} onClose={onClose} eyebrow="Import rooms" icon={UploadSimple} title={`Import ${short} rooms`} meta="st-marys-rooms.csv · one row per room" width={576}
      right={stage === 'pick' ? <><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} onClick={() => setStage('check')}>Check the file</Button></> : <><Button onClick={() => setStage('pick')}>Choose another file</Button><Button variant="primary" icon={null} onClick={run}>Import 141 rooms</Button></>}>
      {stage === 'pick' ? (
        <>
          <SheetSection title="File">
            <button type="button" onClick={() => setStage('check')} className="w-full rounded-xl border-[1.5px] border-dashed border-[#D4D4D4] py-10 flex flex-col items-center gap-2 hover:bg-[#FAFAFA]">
              <FileCsv size={28} className="text-[#737373]" /><span className="text-sm font-medium">st-marys-rooms.csv</span><span className="text-xs text-[#737373]">146 rows · 18 KB · click to check it</span>
            </button>
          </SheetSection>
          <SheetSection title="Columns">
            <p className="text-sm leading-5 text-[#0A0A0A]">Block, Floor, Flat, Room, Room type, Room size (m²)</p>
            <p className="mt-1 text-sm leading-5 text-[#737373]">Rooms come in as Draft with no tenancy.</p>
          </SheetSection>
        </>
      ) : (
        <>
          <SheetSection title="Check">
            <SheetRow title="Rooms ready to import" end={<Pill tone="green">141</Pill>} />
            <SheetRow title="Rows left out" sub="Fix them and import again" end={<Pill tone="amber">5</Pill>} />
          </SheetSection>
          <SheetSection title={`Rows to fix · ${BAD_ROWS.length}`}>
            {BAD_ROWS.map((r) => (
              <SheetRow key={r.row} title={<>Row {r.row} · <span className="font-mono text-[13px]">{r.room}</span></>} sub={`${r.problem} · ${r.fix}`} end={<Pill tone="red">Error</Pill>} />
            ))}
          </SheetSection>
        </>
      )}
    </PanelModal>
  );
}

/* ---------------- F3: photos and description ---------------- */
/** Activity rows read "Arjun Mehta archived Collingwood": the action's leading verb goes lower-case; a row that starts with a name stays as written. */
const VERB = /^(Added|Archived|Built|Closed|Created|Edited|Imported|Made|Restored|Scheduled|Set|Started|Switched|Tagged|Untagged|Updated|Uploaded|Changed)\b/;
const actText = (w: string) => (VERB.test(w) ? w.charAt(0).toLowerCase() + w.slice(1) : w);

function PhotosTab({ p, narrow }: { p: Property; narrow?: boolean }) {
  const patchProp = useInv((s) => s.patchProp);
  const [photos, setPhotos] = useState(p.photos);
  const [desc, setDesc] = useState(p.description);
  const [am, setAm] = useState<string[]>(p.amenities);
  const dirty = photos !== p.photos || desc !== p.description || am.join() !== p.amenities.join();
  const saving = useRef(false);
  const save = () => {
    if (saving.current) return;
    saving.current = true;
    patchProp(p.id, (x) => ({ photos, description: desc, amenities: am, activity: logAct(x, 'Updated the photos and description') }));
    toast.success('Photos and description saved');
    window.setTimeout(() => { saving.current = false; }, 300);
  };
  return (
    <div className="flex flex-col flex-1">
      <div className={cx('grid gap-5 items-start flex-1', narrow ? 'p-5' : 'p-6 grid-cols-[1fr_340px]')}>
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
              const Ico = AMENITY_ICON[a];
              return <button key={a} type="button" aria-pressed={on} onClick={() => setAm(on ? am.filter((x) => x !== a) : [...am, a])} className={cx('h-7 px-2.5 rounded-full border text-sm flex items-center gap-1.5', on ? 'border-primary bg-[#EAF2FF] text-[#1D4ED8]' : 'border-line hover:bg-gray-50')}>{Ico && <Ico size={14} className={on ? undefined : 'text-[#737373]'} />}{a}</button>;
            })}
          </div>
        </Card>
      </div>
      {dirty && (
        <div className={cx('sticky h-14 shrink-0 border-t border-line bg-white px-6 flex items-center gap-2 animate-[rise_.2s_cubic-bezier(0.23,1,0.32,1)]', narrow ? '-bottom-5' : 'bottom-0')}>
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
    <Modal open={open} onClose={onClose} title={`${p.name} can’t be active yet`} sub="Resident manager phone is a required field." width={520}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} disabled={!v.trim()} onClick={save}>Save and make active</Button></>}>
      <Field label="Resident manager phone"><Input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} /></Field>
    </Modal>
  );
}

/* ---------------- F7: switch letting period ---------------- */
/* Copy templates from other properties (2026-11-20): every other property's templates, grouped by property, each with a
   checkbox. A name this property already uses can't be picked. Copies are new templates here, linked to no rooms yet;
   the originals don't change. "Start from scratch" in the footer opens the blank template instead. No Cancel: it's a
   choice between two ways forward, and ✕ / Esc already close it (2026-11-20). */
function CopyTemplatesDialog({ p, open, onClose, onBlank }: { p: Property; open: boolean; onClose: () => void; onBlank: () => void }) {
  const all = useInv((s) => s.templates);
  const props = useInv((s) => s.properties);
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => { if (open) setPicked([]); }, [open]);
  const mine = all.filter((t) => t.propertyId === p.id).map((t) => t.name.trim().toLowerCase());
  const groups = props.filter((x) => x.id !== p.id).map((x) => ({ x, tpls: all.filter((t) => t.propertyId === x.id) })).filter((g) => g.tpls.length);
  const toggle = (id: string) => setPicked((l) => (l.includes(id) ? l.filter((v) => v !== id) : [...l, id]));
  const fmt = (t: Template) => (p.letting === 'Monthly' ? `${money(toMonthly(t.rent, t.weeks).rent, true)} / mo · ${toMonthly(t.rent, t.weeks).months} mo` : `${money(t.rent)} / wk · ${t.weeks} wk`);
  const copy = () => {
    const src = all.filter((t) => picked.includes(t.id));
    useInv.getState().set('templates', (l) => [...l, ...src.map((t) => ({ ...t, id: invId('tp'), propertyId: p.id, linked: 0, own: 0, ownNote: undefined, status: 'Active' as const }))]);
    onClose();
    toast.success(src.length === 1 ? `${src[0].name} copied to ${shortName(p)}` : `${src.length} templates copied to ${shortName(p)}`);
  };
  return (
    <PanelModal open={open} onClose={onClose} width={560} eyebrow="Add template" icon={Copy} title={`Copy templates to ${shortName(p)}`}
      meta="Copies start with no rooms linked."
      left={<Button icon={Plus} onClick={onBlank}>Start from scratch</Button>}
      right={<Button variant="primary" icon={null} disabled={!picked.length} onClick={copy}>{picked.length > 1 ? `Copy ${picked.length} templates` : 'Copy template'}</Button>}>
      {groups.map(({ x, tpls }) => (
        <SheetSection key={x.id} title={`${x.name} · ${tpls.length}`}>
          {/* Rows run to the card's edges: cancel the card's own 14px so the first and last row keep just their 12px. */}
          <div className="-my-3.5">{tpls.map((t) => {
            const taken = mine.includes(t.name.trim().toLowerCase());
            const on = picked.includes(t.id);
            return (
              <label key={t.id} className={cx('-mx-4 px-4 py-3 flex items-center gap-3 border-b border-[#EBEBEB] last:border-0', taken ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[#FAFAFA]')}>
                <Checkbox checked={on} disabled={taken} onCheckedChange={() => !taken && toggle(t.id)} aria-label={`Copy ${t.name}`} />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm leading-5 text-[#0A0A0A] truncate">{t.name}</span>
                  <span className="block text-[13px] leading-[18px] text-[#737373]">{fmt(t)} · deposit {money(t.deposit)} · {t.billing.toLowerCase()}</span>
                </span>
                {taken && <span className="shrink-0 font-mono text-[11px] leading-4 uppercase tracking-[0.04em] text-[#737373]">Already here</span>}
              </label>
            );
          })}</div>
        </SheetSection>
      ))}
    </PanelModal>
  );
}

/* The Weekly / Monthly choice and, when it differs from the property's current period, what switching does. Used by the
   Edit property modal and the ⋯ › Change letting period dialog. */
function LettingChoice({ p, pick, setPick, section }: { p: Property; pick: Letting; setPick: (v: Letting) => void; /** Put the choice in a titled card, with the preview as its own card below (no card inside a card). */ section?: boolean }) {
  const allTpl = useInv((s) => s.templates);
  const templates = useMemo(() => allTpl.filter((t) => t.propertyId === p.id), [allTpl, p.id]);
  const n = p.counts.all;
  const fmt = (monthly: boolean, rent: number, weeks: number) => (monthly ? `${money(toMonthly(rent, weeks).rent, true)} / mo · ${toMonthly(rent, weeks).months} mo` : `${money(rent)} / wk · ${weeks} wk`);
  /* What the switch does to money, shown on real templates when there are some, else on a sample room's rent. */
  const sample = p.roomTypes.find((r) => r.rent);
  const examples = templates.length ? templates.map((t) => ({ k: t.id, name: t.name, rent: t.rent, weeks: t.weeks }))
    : [{ k: 'sample', name: sample ? `Example · ${sample.name}` : 'Example room', rent: sample?.rent ?? 182, weeks: 44 }];
  const toMo = pick === 'Monthly';
  const title = (t: Letting) => <span className="flex items-center gap-2">{t}{p.letting === t && <span className="font-mono text-[11px] leading-4 uppercase tracking-[0.04em] text-[#737373]">· Current</span>}</span>;
  const radios = (
    <div className="grid grid-cols-2 gap-2.5">
      <RadioCard checked={pick === 'Weekly'} onClick={() => setPick('Weekly')} title={title('Weekly')} sub="Rent per week, length in weeks" />
      <RadioCard checked={pick === 'Monthly'} onClick={() => setPick('Monthly')} title={title('Monthly')} sub="Rent per month, length in months" />
    </div>
  );
  return (
    <>
      {section ? <SheetSection title="Letting period">{radios}</SheetSection> : radios}
      {pick !== p.letting && (
        <>
          {/* Record-panel card: grey strip, then one row per template with the before → after figures. */}
          <section className={cx(section ? 'mt-3' : 'mt-4', 'rounded-2xl border border-[#E5E5E5] bg-white overflow-hidden')}>
            <div className="h-12 px-4 flex items-center gap-2 bg-[#FAFAFA] border-b border-[#EBEBEB]">
              <h3 className="text-base leading-6 font-semibold text-[#0A0A0A]">What changes</h3>
              <span className="text-sm leading-5 text-[#737373] tabular-nums">· {templates.length} {templates.length === 1 ? 'template' : 'templates'} · {n.toLocaleString('en-GB')} tenancies</span>
            </div>
            <div className="px-4">
              {examples.map((e) => (
                <div key={e.k} className="py-3 flex items-center gap-3 border-b border-[#EBEBEB]">
                  <span className="flex-1 min-w-0 text-sm leading-5 text-[#0A0A0A] truncate">{e.name}</span>
                  <span className="text-sm leading-5 text-[#737373] tabular-nums">{fmt(!toMo, e.rent, e.weeks)}</span>
                  <ArrowRight size={14} className="shrink-0 text-[#A3A3A3]" />
                  <span className="text-sm leading-5 font-medium text-[#0A0A0A] tabular-nums">{fmt(toMo, e.rent, e.weeks)}</span>
                </div>
              ))}
              <div className="py-3 grid grid-cols-[140px_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm leading-5">
                <span className="text-[#737373]">Rent</span><span className="text-[#0A0A0A]">{toMo ? 'Weekly rent × 52 ÷ 12, to the penny' : 'Monthly rent × 12 ÷ 52, to the penny'}</span>
                <span className="text-[#737373]">Length</span><span className="text-[#0A0A0A]">{toMo ? 'Rounded to whole months' : 'Rounded to whole weeks'}</span>
                <span className="text-[#737373]">Stays the same</span><span className="text-[#0A0A0A]">Deposits and billing frequency</span>
              </div>
            </div>
          </section>
          <div className="mt-3"><Note tone="amber" icon={Warning} title="Switching back won’t undo it exactly">A tenancy’s length can shift by a week.</Note></div>
        </>
      )}
    </>
  );
}
type Letting = 'Weekly' | 'Monthly';
const switchLetting = (p: Property, pick: Letting, templates: number) => {
  useInv.getState().patchProp(p.id, (x) => ({ letting: pick, activity: logAct(x, `Switched to ${pick.toLowerCase()} letting`) }));
  return `${templates} templates and ${p.counts.all} tenancies converted`;
};

function LettingDialog({ p, open, onClose }: { p: Property; open: boolean; onClose: () => void }) {
  const tplCount = useInv((s) => s.templates.filter((t) => t.propertyId === p.id).length);
  /* Opens on the property's current period (as Details shows it); picking the other one previews the switch. */
  const [pick, setPick] = useState<Letting>(p.letting);
  const busy = useRef(false);
  useEffect(() => { if (open) { setPick(p.letting); busy.current = false; } }, [open, p.letting]);
  const changing = pick !== p.letting;
  const save = () => {
    if (busy.current || !changing) return;
    busy.current = true;
    const what = switchLetting(p, pick, tplCount);
    onClose();
    toast.success(`${shortName(p)} is ${pick.toLowerCase()} · ${what}`);
  };
  return (
    <Modal open={open} onClose={onClose} icon={ArrowsLeftRight} title={changing ? `Switch ${shortName(p)} to ${pick.toLowerCase()}?` : 'Letting period'} width={580}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!changing} onClick={save}>{changing ? `Switch to ${pick.toLowerCase()}` : 'Save'}</Button></>}>
      <LettingChoice p={p} pick={pick} setPick={setPick} />
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
      activity: logAct(x, `Set ${rt.name} rent to ${money(+rent)} from ${fromShort}`),
    }));
    onClose();
    toast.success(apply === 'new' ? `${rt.name} is ${money(+rent)} from ${fromShort} for new tenancies · ${signed} signed stay at ${money(rt.rent ?? 0)}` : `${rt.name} is ${money(+rent)} from ${fromShort} for all ${rt.rooms} tenancies`,
      { action: { label: 'Undo', onClick: () => patchProp(p.id, () => ({ roomTypes: old })) } });
  };
  return (
    <PanelModal open onClose={onClose} width={576} eyebrow="Change rent" title={rt.name} icon={CurrencyGbp} meta={`${p.name} · ${rt.rooms} rooms · now ${rt.rent != null ? `${money(rt.rent)} / ${unit}` : 'no rent'}`}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} disabled={!!rentErr || !!fromErr} onClick={save}>{apply === 'new' ? `Save ${money(+rent || 0)} for new tenancies` : `Save ${money(+rent || 0)} for all`}</Button></>}>
      <>
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
          {apply === 'all' && <div className="mt-4"><Note tone="amber" icon={Warning} title={`${signed} residents have signed at ${rt.rent != null ? money(rt.rent) : '—'}`}>Each is emailed the change and can object.</Note></div>}
        </SheetSection>
      </>
    </PanelModal>
  );
}

/* ---------------- Edit name/campus or address ---------------- */
export function EditSheet({ p, which, onClose }: { p: Property; which: null | 'basics' | 'address'; onClose: () => void }) {
  const patchProp = useInv((s) => s.patchProp);
  const [name, setName] = useState(p.name);
  const [invNo, setInvNo] = useState(p.invNo);
  const [address, setAddress] = useState(p.address);
  const [zone, setZone] = useState(p.zone);
  const [letting, setLetting] = useState<Letting>(p.letting);
  const tplCount = useInv((s) => s.templates.filter((t) => t.propertyId === p.id).length);
  useEffect(() => { if (which) { setName(p.name); setInvNo(p.invNo); setAddress(p.address); setZone(p.zone); setLetting(p.letting); } }, [which, p]);
  const switching = letting !== p.letting;
  const others = useInv((s) => s.properties);
  const nameErr = !name.trim() ? 'Enter a property name.' : others.some((x) => x.id !== p.id && x.name.trim().toLowerCase() === name.trim().toLowerCase()) ? `A property called ${name.trim()} already exists.` : '';
  const save = () => {
    if (nameErr) return;
    patchProp(p.id, (x) => ({ name: name.trim(), invNo, address, zone, activity: logAct(x, which === 'address' ? 'Edited the address' : 'Edited the details') }));
    const what = switching ? switchLetting(p, letting, tplCount) : '';
    onClose();
    toast.success(switching ? `${name.trim()} saved · now ${letting.toLowerCase()}, ${what}` : which === 'address' ? `${name.trim()} address saved` : `${name.trim()} details saved`);
  };
  /* One centred edit modal for the property (2026-11-19): every editable part in one place; the section the user came
     from (Address, or Name, campus and layout) comes first. */
  const details = (
    <SheetSection key="details" title="Details">
      <div className="space-y-4">
        <Field label="Property name"><Input value={name} onChange={(e) => setName(e.target.value)} /><FieldErr>{nameErr}</FieldErr></Field>
        <Field label="Inventory number" hint="Optional"><Input className="font-mono" value={invNo} onChange={(e) => setInvNo(e.target.value)} /></Field>
        <Field label="Location"><Input value={p.campus} disabled /></Field>
        {/* Read-only like Campus, so it sits with it as a field rather than a label/value row in its own card. */}
        <Field label="Layout" hint="Can’t change once rooms are built"><Input value={layoutOf(p)} disabled /></Field>
      </div>
    </SheetSection>
  );
  const location = (
    <SheetSection key="location" title="Address">
      <div className="space-y-4">
        <Field label="Address"><Input value={address} onChange={(e) => setAddress(e.target.value)} /></Field>
        <Field label="Zone" hint="Optional"><Input value={zone} onChange={(e) => setZone(e.target.value)} /></Field>
      </div>
    </SheetSection>
  );
  return (
    <PanelModal open={!!which} onClose={onClose} width={576} eyebrow="Edit property" title={p.name}
      lead={photoOf(p.id) ? <img src={photoOf(p.id, photoOrder(p)[0] ?? 0)} alt="" className="size-10 shrink-0 rounded-[10px] object-cover bg-[#F5F5F5]" /> : undefined} icon={Image}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} disabled={!!nameErr} onClick={save}>{switching ? `Save and switch to ${letting.toLowerCase()}` : 'Save'}</Button></>}>
      {/* Letting period is part of Edit (2026-11-20); picking the other period shows what switching converts, and Save says so.
          It sits second, straight after the section that was opened (2026-11-23). */}
      {which === 'address' ? location : details}
      <LettingChoice key="letting" section p={p} pick={letting} setPick={setLetting} />
      {which === 'address' ? details : location}
    </PanelModal>
  );
}

