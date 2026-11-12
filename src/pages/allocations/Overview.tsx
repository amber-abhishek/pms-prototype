import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarBlank, MagicWand, MapPin, PaperPlaneTilt, Tray } from '../../components/icons';
import { Button, ButtonGroup, PageHeader } from '../../components/ui';
import { OverviewPage, RankCard, Split, Stats, SummaryCard, TrendCard, ViewLink } from '../../components/overview';
import { useDb } from '../../data/store';
import { MenuButton } from '../home/parts';
import { useEmpty } from '../../data/empty';
import { useInv } from '../../data/inventory';
import { appCounts, available, bookingCounts, fmtN, offerCounts, useAlloc } from '../../data/allocations';
import { Plus } from '../../components/icons';

/* 3783:43143 · Where the 2027/28 cycle stands: beds allocated per day, halls with beds free, three queues. */
const DAYS = Array.from({ length: 30 }, (_, i) => new Date(Date.UTC(2026, 8, 28 + i)));
/* Two auto-allocate runs (5 Oct, 19 Oct) stand out above the daily hand-allocations. */
const DAILY = [8, 14, 11, 18, 13, 10, 15, 310, 16, 12, 9, 14, 17, 11, 13, 18, 20, 16, 19, 15, 21, 142, 18, 14, 22, 17, 12, 19, 8, 6];
/* Running total, like the Home occupancy line: ends at today's 2,480 allocated. */
const START = 2480 - DAILY.reduce((t, v) => t + v, 0);
const TOTAL = DAILY.map((_, i) => START + DAILY.slice(0, i + 1).reduce((t, v) => t + v, 0));
const POINTS = DAYS.map((d, i) => ({ label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }), value: TOTAL[i], note: `${TOTAL[i].toLocaleString('en-GB')} beds allocated · +${DAILY[i]}` }));
const LO = Math.floor(START / 100) * 100, STEP = Math.ceil((2500 - LO) / 300) * 100;
const AXIS = [LO, LO + STEP, LO + STEP * 2, LO + STEP * 3];
const HALLS = [
  { id: 'p1', name: 'Ustinov College', free: 72, pct: 88 }, { id: 'p2', name: 'Collingwood College', free: 29, pct: 94, warn: true },
  { id: 'p6', name: 'Hild Bede', free: 39, pct: 86 }, { id: 'p4', name: 'Josephine Butler', free: 84, pct: 81 },
  { id: 'p7', name: 'Stephenson College', free: 79, pct: 87 }, { id: 'p8', name: 'John Snow College', free: 62, pct: 86 },
  { id: 'p5', name: 'Van Mildert', free: 48, pct: 91 },
];

export function AllocOverview() {
  const nav = useNavigate();
  const campuses = useDb((s) => s.campuses);
  const [year, setYear] = useState('2027/28');
  const [campus, setCampus] = useState('All campuses');
  const review = '/allocations/applications?tab=To%20review';
  /* Empty-states demo: nothing allocated yet, so the chart, halls and queues read zero. */
  const e = useEmpty((s) => s.on);
  const hasProps = useInv((s) => s.properties.length > 0);
  /* Every number comes from the same data the queues, tabs and Cycles read, so they always agree. */
  const d = useAlloc();
  const ac = appCounts(d), oc = offerCounts(d), bc = bookingCounts(d);
  const cyc = d.cycles.find((c) => c.name === '2027/28');
  const queue = d.apps.filter((a) => a.status === 'review' && a.cycle === '2027/28');
  const flagged = queue.filter((a) => a.tag || a.reqs.length).length;
  const ready = queue.filter((a) => !a.tag && !a.reqs.length && a.prefs.some(([h, r]) => available(d, h, r) > 0)).length;
  const noUnit = queue.length - flagged - ready;
  const oldest = Math.max(0, ...queue.map((a) => a.waiting));
  const expiring = d.offers.filter((o) => o.status === 'open' && (o.leftH ?? 99) <= 48).length;
  const signed = bc.all - bc.sent - bc.drafts;
  const points = POINTS.map((p, i) => (i === POINTS.length - 1 ? { ...p, value: ac.allocated, note: `${fmtN(ac.allocated)} beds allocated` } : p));
  return (
    <>
      <PageHeader icon={Tray} title="Applications" crumbs={['Allocations']} search>
        <ButtonGroup>
          <MenuButton icon={CalendarBlank} value={year} options={['2025/26', '2026/27', '2027/28']} onChange={setYear} />
          <MenuButton icon={MapPin} value={campus} options={['All campuses', ...campuses.map((c) => c.name)]} onChange={setCampus} />
        </ButtonGroup>
      </PageHeader>
      <OverviewPage title={`${year} allocations`} sub={e ? (hasProps ? 'Open a cycle to start taking applications' : 'Add a property, then open a cycle to start taking applications') : `Offers go out until 30 Nov · ${fmtN(ac.review)} ${ac.review === 1 ? 'application' : 'applications'} waiting`} actions={e ? (
        /* First login: the next real steps, in order. A cycle needs an active property, so that comes first. */
        hasProps ? <Button variant="primary" icon={Plus} onClick={() => nav('/allocations/cycles?new=1')}>Open a cycle</Button> : <>
          <Button variant="primary" icon={Plus} onClick={() => nav('/inventory/properties')}>Add a property</Button>
          <Button variant="tertiary" onClick={() => nav('/allocations/cycles?new=1')}>Open a cycle</Button>
        </>
      ) : <>
        <Button variant="primary" icon={MagicWand} onClick={() => nav('/allocations/applications?tab=To%20review&auto=1')}>Auto-allocate</Button>
        <Button variant="tertiary" icon={Tray} onClick={() => nav(review)}>Review queue</Button>
        <Button variant="tertiary" icon={PaperPlaneTilt} onClick={() => nav('/allocations/offers')}>Send offers</Button>
      </>}>
        <div className="grid grid-cols-[minmax(0,1fr)_384px] gap-4">
          <TrendCard title="Beds allocated" badge={year} value={e ? '0' : fmtN(ac.allocated)} of={e ? 'of 0 beds' : `of ${fmtN(cyc?.beds ?? 2893)} beds`} empty={e ? 'No beds allocated yet' : undefined} up="870 allocated" down="−64 released" kind="line" chartOnly
            points={points} ticks={['28 Sep', '5 Oct', '12 Oct', '19 Oct', '27 Oct']} axis={AXIS} />
          <RankCard title="Halls" note="beds free" more={2} empty={<span>No halls yet</span>} moreLabel="View all halls" moreTo="/inventory/occupancy"
            rows={e ? [] : HALLS.map((h) => ({ id: h.id, name: h.name, value: String(h.free), pct: h.pct, warn: h.warn, to: `/inventory/properties?open=${h.id}` }))} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard title="To review" foot="Oldest" footValue={e || !queue.length ? '—' : `${oldest} ${oldest === 1 ? 'day' : 'days'}`} footTone={e || oldest < 7 ? 'ink' : 'orange'} action={e ? null : <Button size="sm" onClick={() => nav(review)}>Review</Button>}>
            <Split value={e ? '0' : fmtN(queue.length)} parts={[[`${e ? 0 : ready} ready`, e ? 0 : ready, '#2563EB'], [`${e ? 0 : flagged} need a person`, e ? 0 : flagged, '#F59E0B'], [`${e ? 0 : noUnit} no unit`, e ? 0 : noUnit, '#D4D4D4']]} />
          </SummaryCard>
          <SummaryCard title="Offers out" foot="Waitlist" footValue={e || !oc.waitlist ? 'No one waiting' : `${fmtN(oc.waitlist)} waiting`} action={e ? null : <ViewLink to="/allocations/offers" />}>
            <Stats items={e ? [['Open', '0'], ['Expiring in 48 h', '0'], ['Accepted', '0']] : [['Open', fmtN(oc.open)], ['Expiring in 48 h', String(expiring), expiring ? 'orange' : undefined], ['Accepted', fmtN(oc.accepted)]]} />
          </SummaryCard>
          <SummaryCard title="Bookings" foot="Conflicts" footValue={e || !bc.conflicts ? 'None' : `${bc.conflicts} double ${bc.conflicts === 1 ? 'booking' : 'bookings'}`} footTone={e || !bc.conflicts ? 'ink' : 'red'} action={e ? null : <ViewLink to="/allocations/bookings" />}>
            <Stats items={e ? [['Leases signed', '0'], ['Sent', '0'], ['Drafts', '0']] : [['Leases signed', fmtN(signed)], ['Sent', fmtN(bc.sent)], ['Drafts', fmtN(bc.drafts)]]} />
          </SummaryCard>
        </div>
      </OverviewPage>
    </>
  );
}
