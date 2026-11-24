import { useEffect, useRef, useState } from 'react';
import { CalendarX, MagicWand, WarningCircle, XCircle } from '../../components/icons';
import { Button, Field, Input, Note, Pill, SheetRow, SheetSection, Switch, Tabs, cx } from '../../components/ui';
import { available, firstName, hallFull, unitsFor, useAlloc, type App } from '../../data/allocations';
import { Modal, Radio } from './common';
import { PanelModal } from '../inventory/common';
import { useAllocActions } from './actions';
import { ordinal, type Pref } from './AppDetail';

const DAYS = ['3 days', '5 days', '7 days'] as const;

/** Flow 2 · 06 and edge case E1: pick a unit, override overlaps with a reason, send the offer. */
export function AllocateSheet({ a, pref, onClose, onDone }: { a: App; pref: Pref; onClose: () => void; onDone: () => void }) {
  const d = useAlloc();
  const act = useAllocActions();
  const units = unitsFor(d, a, pref.hall, pref.room);
  const [taken, setTaken] = useState<string | null>(null);
  const [sel, setSel] = useState(units[0]?.code ?? '');
  const [reason, setReason] = useState('');
  const [days, setDays] = useState<(typeof DAYS)[number]>('5 days');
  const [email, setEmail] = useState(true);
  const busy = useRef(false);
  const u = units.find((x) => x.code === sel);
  const takenUnit = units.find((x) => x.code === taken);
  const needReason = !!u?.overlap && !reason.trim();
  const submit = () => {
    if (!u || busy.current) return;
    if (u.takenBy && !taken) {
      // Re-check at save: someone else took it while the sheet was open.
      setTaken(u.code);
      setSel(units.find((x) => !x.takenBy)?.code ?? '');
      return;
    }
    busy.current = true;
    act.allocate(a, pref.hall, pref.room, u.code, { days: +days[0], email, override: u.overlap ? reason.trim() : undefined });
    onDone();
  };
  /* Allocating is an action, not the record: a centred modal over the list (2026-11-19), never a side sheet. */
  return (
    <PanelModal open onClose={onClose} eyebrow="Allocate" title={a.name} person={a.name} meta={`${ordinal(pref.rank)} preference · ${hallFull[pref.hall]} · ${pref.room} · ${pref.weeks} weeks`} width={560}
      right={units.length ? <>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={null} disabled={!u || needReason} onClick={submit}>{taken ? `Allocate ${sel}` : email ? 'Allocate & send offer' : 'Allocate'}</Button>
      </> : <>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" icon={null} onClick={() => { act.waitlist(a, pref.hall, pref.room); onDone(); }}>Add to waitlist</Button>
      </>}>
      {!units.length ? (
        <Note tone="amber" icon={WarningCircle} title={`${hallFull[pref.hall]} has no free ${pref.room.toLowerCase()}`}>
          Add {firstName(a.name)} to the waitlist, or pick another property.
        </Note>
      ) : (
        <>
          {takenUnit?.takenBy && (<div className="mb-3">
            <Note tone="red" icon={XCircle} title={`${pref.hall} ${takenUnit.code} is taken`}>
              {takenUnit.takenBy.who} allocated it to {takenUnit.takenBy.to} 4 minutes ago.
            </Note>
          </div>)}
          <SheetSection title={`Unit · ${units.length} match`}>
          <div role="radiogroup" aria-label="Unit">
            {units.map((x) => {
              const on = x.code === sel;
              const gone = x.code === taken;
              return (
                <div key={x.code} className={cx('py-2.5 border-t border-[#EBEBEB] first:border-t-0 first:pt-0 last:pb-0', gone && 'opacity-60')}>
                  <label className={cx('flex items-start gap-3', gone ? 'cursor-not-allowed' : 'cursor-pointer')}>
                    <input type="radio" name="unit" checked={on} disabled={gone} onChange={() => setSel(x.code)} className="mt-0.5 size-4 accent-[#2563EB]" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><span className="text-sm leading-5 text-[#0A0A0A]">{x.code}</span><span className="text-[13px] text-[#737373] truncate">{x.where}</span><span className="ml-auto shrink-0 text-[13px] text-[#737373]">{gone ? <Pill tone="red">Taken</Pill> : `Match ${x.match}%`}</span></div>
                      {x.tags.length > 0 && <div className="flex flex-wrap gap-1.5 mt-1.5">{x.tags.map((t) => <Pill key={t.label} tone={t.tone}>{t.label}</Pill>)}</div>}
                    </div>
                  </label>
                  {on && x.overlap && (
                    <div className="mt-3 ml-7 space-y-3">
                      <Note tone="amber" icon={CalendarX} title={x.overlap.title}>{x.overlap.body}</Note>
                      <Field label="Reason for the override"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Jae Park leaves on 18 Sep · agreed with the Ustinov office" /></Field>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </SheetSection>
          <SheetSection title="Offer">
            <SheetRow title={`Email the offer to ${firstName(a.name)}`} sub={`Template: Offer · ${a.reqs.includes('Step-free access') ? 'accessible room' : 'standard'}`} end={<Switch checked={email} onChange={setEmail} label="Email the offer" />} />
            <SheetRow title="Offer expires in" end={<Tabs variant="segmented" value={days} onChange={setDays} tabs={DAYS.map((x) => ({ id: x, label: x }))} />} />
          </SheetSection>
        </>
      )}
    </PanelModal>
  );
}

const REASONS = [
  { r: 'Failed the eligibility check', sub: 'They can apply again once eligible', tpl: 'no study offer' },
  { r: 'Not eligible for this term', tpl: 'not eligible' },
  { r: 'Duplicate application', tpl: 'duplicate' },
  { r: 'Withdrawn by the applicant', tpl: 'withdrawn' },
  { r: 'Other', sub: 'Needs a note', tpl: 'other' },
];
/** Flow 2 · 07: reject with a structured reason, email, count it in the cycle report. */
export function RejectDialog({ a, onClose, onDone }: { a: App; onClose: () => void; onDone: () => void }) {
  const act = useAllocActions();
  const [reason, setReason] = useState(a.tag === 'Eligibility' ? REASONS[0].r : '');
  const [note, setNote] = useState('');
  const [email, setEmail] = useState(true);
  const busy = useRef(false);
  const fn = firstName(a.name);
  const ok = reason && (reason !== 'Other' || note.trim());
  return (
    <Modal open onClose={onClose} icon={XCircle} title={`Reject ${a.name}’s application`} sub={`${fn} sees the reason in the email and on the portal.`}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="danger" icon={null} disabled={!ok} onClick={() => {
        if (busy.current) return; busy.current = true;
        act.reject(a, reason === 'Other' ? `Other · ${note.trim()}` : reason, email); onDone();
      }}>Reject application</Button></>}>
      <div className="space-y-2">
        {REASONS.map((x) => <Radio key={x.r} checked={reason === x.r} onChange={() => setReason(x.r)} title={x.r} sub={x.sub} />)}
      </div>
      <label className="block mt-4">
        <span className="block text-sm font-medium mb-1.5">Note to {fn}</span>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={reason === 'Other' ? 'Required for Other' : 'Optional'} />
      </label>
      <div className="flex items-center justify-between mt-4">
        <div><div className="text-sm">Email {fn}</div><div className="text-xs text-gray-500">Template: Rejected · {REASONS.find((x) => x.r === reason)?.tpl ?? 'pick a reason'}</div></div>
        <Switch checked={email} onChange={setEmail} label={`Email ${fn}`} />
      </div>
    </Modal>
  );
}

/** Auto-allocate…: places every unflagged application that has a free unit in one of its choices. */
export function AutoAllocateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = useAlloc();
  const act = useAllocActions();
  const [days, setDays] = useState<(typeof DAYS)[number]>('5 days');
  const [email, setEmail] = useState(true);
  const busy = useRef(false);
  /* Re-arm only when the dialog opens again, so a double click can't run a second, empty pass. */
  useEffect(() => { if (open) busy.current = false; }, [open]);
  if (!open) return null;
  const queue = d.apps.filter((a) => a.status === 'review' && a.cycle === '2027/28'); // the dialog is for 2027/28 only
  const flagged = queue.filter((a) => a.tag || a.reqs.length);
  const free = queue.filter((a) => !a.tag && !a.reqs.length && a.prefs.some(([h, r]) => available(d, h, r) > 0));
  const none = queue.length - flagged.length - free.length;
  return (
    <Modal open onClose={onClose} tone="blue" icon={MagicWand} title="Auto-allocate 2027/28" width={520}
      sub="Flagged applications wait for a person."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={MagicWand} disabled={!free.length} onClick={() => {
        if (busy.current) return; busy.current = true;
        act.autoAllocate(+days[0], email); onClose();
      }}>Auto-allocate {free.length}</Button></>}>
      <div className="grid grid-cols-3 gap-2 mt-1">
        {[[free.length, 'can be allocated now', 'text-[#0B8A4C]'], [flagged.length, 'need a person', 'text-[#B45309]'], [none, 'have no free unit', 'text-gray-500']].map(([n, l, c]) => (
          <div key={l as string} className="rounded-xl border border-line p-3"><div className={cx('text-xl font-semibold', c as string)}>{n}</div><div className="text-xs text-gray-500 mt-0.5">{l}</div></div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-4"><span className="text-sm">Offers expire in</span><Tabs variant="segmented" value={days} onChange={setDays} tabs={DAYS.map((x) => ({ id: x, label: x }))} /></div>
      <div className="flex items-center justify-between mt-4">
        <div><div className="text-sm">Email the offers</div><div className="text-xs text-gray-500">Template: Offer · standard</div></div>
        <Switch checked={email} onChange={setEmail} label="Email the offers" />
      </div>
    </Modal>
  );
}
