// Organisation › Roles and access. Figma "Organisation — flows": Flow 1 (3030–3033), empty 3096, E1–E4.
import { useEffect, useMemo, useRef, useState } from 'react';
import { rowAttrs, useRowMotion } from '../../components/rowMotion';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Buildings, ClockCounterClockwise, EnvelopeSimple, Info, PaperPlaneTilt, Plus, Shield, ShieldCheck, User, UserPlus, Warning } from '../../components/icons';
import { toast } from 'sonner';
import { Avatar, Button, Field, FilterButton, inFilter, type Filters, Input, Pill, Sheet, Table, Tabs, Toolbar, cx, type Col, SheetHero, SheetSection, listNav, type SheetNav } from '../../components/ui';
import { Checkbox } from '../../components/shadcn/checkbox';
import { useTab } from '../hooks';
import { HALLS, hallById, hallsLabel, nameFromEmail, oid, roleCan, roleSummary, snapOrg, undoSince, useOrg, type Member, type Role, type Scenario } from '../../data/org';
import { Alert, EmptyState, Header, IconSelect, ODialog, RowMenu } from './parts';

type TabId = 'members' | 'roles' | 'audit';
const FOOT = 'Members sign in with their operator account; a role sets what they can do, halls set where.';

export function RoleTag({ role }: { role?: Role }) {
  if (!role) return <span className="text-gray-400">—</span>;
  return <Pill tone={role.id === 'admin' ? 'purple' : role.createdByYou ? 'green' : 'blue'}>{role.name}</Pill>;
}

/** Snapshot for Undo. */
const snap = snapOrg;
/* Undo reverts only this action's records, so a later invite or change survives it. */
const undoable = (msg: string, before: ReturnType<typeof snap>, extra?: { description?: string; area?: 'Members' | 'Roles' }) =>
  toast.success(msg, { description: extra?.description, action: { label: 'Undo', onClick: undoSince(before, msg.split(' · ')[0], extra?.area ?? 'Members') } });

export function AccessPage() {
  const { members, roles, audit, load, set, audit_ } = useOrg();
  const [tab, setTab] = useTab<TabId>('members');
  const [sp, setSp] = useSearchParams();
  const loc = useLocation();
  const nav = useNavigate();
  const [f, setF] = useState<Filters>({});
  const [invite, setInvite] = useState<{ open: boolean; roleId?: string }>({ open: false });
  const [access, setAccess] = useState<{ m: Member; addHall?: string; roleId?: string } | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState<Role | null>(null);

  // ?demo=edge|empty|flow loads the member list the edge-case / empty-state frames use.
  useEffect(() => {
    const d = sp.get('demo') as Scenario | null;
    if (d && ['flow', 'edge', 'empty'].includes(d)) { load(d); setSp((p) => { const n = new URLSearchParams(p); n.delete('demo'); return n; }, { replace: true }); }
  }, [sp, setSp, load]);
  // Arriving from "Save role" → open the invite with the new role.
  useEffect(() => {
    const st = loc.state as { invite?: string } | null;
    if (st?.invite) { setInvite({ open: true, roleId: st.invite }); nav(loc.pathname + loc.search, { replace: true, state: null }); }
  }, [loc, nav]);

  const roleOf = (m: Member) => roles.find((r) => r.id === m.roleId);
  const shown = members.filter((m) => inFilter(f.role, roleOf(m)?.name) && (!f.hall?.length || m.halls === 'all' || m.halls.some((h) => inFilter(f.hall, hallById(h)?.short))) && inFilter(f.status, m.status));

  const resend = (m: Member) => {
    const before = snap();
    set('members', (ms) => ms.map((x) => (x.id === m.id ? { ...x, status: 'Invited' as const, invitedAgo: 'just now' } : x)));
    audit_(`resent the invite to ${m.name}`, 'Members');
    undoable(`Invite to ${m.name} resent · it lasts 7 days`, before);
    if (m.status === 'Invite expired') {
      // In the prototype the invitee accepts a few seconds later (E4 · 03).
      window.setTimeout(() => {
        const cur = useOrg.getState().members.find((x) => x.id === m.id);
        if (cur?.status !== 'Invited') return;
        const b = snap();
        useOrg.getState().set('members', (ms) => ms.map((x) => (x.id === m.id ? { ...x, status: 'Active' as const, lastActive: 'Just now' } : x)));
        const r = useOrg.getState().roles.find((x) => x.id === m.roleId);
        undoable(`${m.name} joined · ${r?.name ?? ''} at ${hallsLabel(m.halls)}`, b);
      }, 6000);
    }
  };

  const memberCols: Col<Member>[] = [
    { key: 'm', label: 'Member', className: 'w-[36%]', render: (m) => (
      <div className="flex items-center gap-2.5"><Avatar name={m.name} size={24} /><div className="leading-tight"><div className="text-sm font-medium">{m.name}</div><div className="text-xs text-[#737373]">{m.email}</div></div></div>
    ) },
    { key: 'r', label: 'Role', className: 'w-[22%]', render: (m) => <RoleTag role={roleOf(m)} /> },
    { key: 'h', label: 'Halls', className: 'w-[19%]', render: (m) => <span className="text-sm text-gray-700">{roleOf(m)?.scope === 'all' ? 'All halls' : hallsLabel(m.halls)}</span> },
    { key: 'a', label: 'Last active', render: (m) => m.status === 'Invited' ? <Pill tone="amber" icon={EnvelopeSimple}>Invited</Pill>
      : m.status === 'Invite expired' ? <span className="flex items-center gap-2"><Pill tone="orange" icon={Warning}>Invite expired</Pill><Button size="sm" onClick={(e) => { e.stopPropagation(); resend(m); }}>Resend</Button></span>
      : <span className="text-sm text-[#737373]">{m.lastActive}</span> },
    { key: 'x', label: '', className: 'w-12 text-right', render: (m) => (
      <RowMenu items={[
        { label: 'Change role', onClick: () => setAccess({ m }) },
        { label: 'Change halls', onClick: () => setAccess({ m }) },
        ...(m.status !== 'Active' ? [{ label: 'Resend invite', onClick: () => resend(m) }] : []),
        { label: 'Remove from workspace', danger: true, onClick: () => setRemoving(m) },
      ]} />
    ) },
  ];

  const roleCols: Col<Role>[] = [
    { key: 'n', label: 'Role', className: 'w-[30%]', render: (r) => <div className="flex items-center gap-2"><Shield size={14} className="text-gray-400" /><span className="text-sm font-medium">{r.name}</span>{r.createdByYou && <Pill tone="green">New</Pill>}</div> },
    { key: 'c', label: 'Members', className: 'w-[14%]', render: (r) => <span className="text-sm tabular-nums">{members.filter((m) => m.roleId === r.id).length}</span> },
    { key: 'w', label: 'Can', render: (r) => <span className="text-sm text-[#737373]">{roleCan(r)}</span> },
    { key: 'x', label: '', className: 'w-12 text-right', render: (r) => (
      <RowMenu items={[
        { label: 'Edit permissions', disabled: r.id === 'admin', onClick: () => nav(`/org/people/roles/${r.id}`) },
        { label: 'Duplicate', onClick: () => {
          const before = snap(); const id = oid('r');
          set('roles', (rs) => [...rs, { ...r, id, name: `${r.name} copy`, builtIn: false, createdByYou: true }]);
          audit_(`duplicated the role ${r.name}`, 'Roles'); undoable(`${r.name} duplicated`, before, { area: 'Roles' });
        } },
        { label: 'Delete role', danger: true, disabled: r.id === 'admin', onClick: () => setDeleting(r) },
      ]} />
    ) },
  ];

  const onlyYou = members.length === 1;
  return (
    <>
      <Header icon={ShieldCheck} crumbs={[{ label: 'Organisation' }]} title="Roles and access">
        <Button icon={Plus} onClick={() => nav('/org/people/roles/new')}>New role</Button>
        {!(tab === 'members' && onlyYou) && <Button variant="primary" icon={UserPlus} onClick={() => setInvite({ open: true })}>Invite member</Button>}
      </Header>
      <Toolbar right={tab === 'members' && !onlyYou ? <FilterButton value={f} onChange={setF} defs={[
        { id: 'role', label: 'Role', options: roles.map((r) => r.name) },
        { id: 'hall', label: 'Hall', options: HALLS.map((h) => h.short) },
        { id: 'status', label: 'Status', options: ['Active', 'Invited', 'Invite expired'] },
      ]} /> : undefined}>
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'members', label: 'Members', count: members.length }, { id: 'roles', label: 'Roles', count: roles.length }, { id: 'audit', label: 'Audit log' }]} />
      </Toolbar>

      {tab === 'members' && (onlyYou ? (
        <div className="flex-1 overflow-auto">
          <div data-inset className="px-[var(--gx,16px)]"><PlainTable cols={memberCols} rows={members} /></div>
          <EmptyState art="team" icon={User} title="It’s just you so far" sub="Each person gets a role and the halls they cover.">
            <Button variant="primary" icon={UserPlus} onClick={() => setInvite({ open: true })}>Invite member</Button>
            <Button icon={Shield} onClick={() => setTab('roles')}>Review roles</Button>
          </EmptyState>
        </div>
      ) : <Table cols={memberCols} rows={shown} onRow={(m) => setAccess({ m })} selected={access?.m.id} summary={FOOT} />)}

      {tab === 'roles' && <Table cols={roleCols} rows={roles} onRow={(r) => r.id !== 'admin' ? nav(`/org/people/roles/${r.id}`) : toast('Admin can do everything. It can’t be edited.')} />}

      {tab === 'audit' && <Table cols={[
        { key: 'w', label: 'When', className: 'w-44', render: (a) => <span className="text-sm text-[#737373]">{a.when}</span> },
        { key: 'p', label: 'Who', className: 'w-48', render: (a) => <span className="flex items-center gap-2 text-sm"><Avatar name={a.who} size={20} />{a.who}</span> },
        { key: 'x', label: 'Change', render: (a) => <span className="text-sm">{a.what}</span> },
        { key: 'a', label: 'Area', className: 'w-32', render: (a) => <Pill>{a.area}</Pill> },
      ]} rows={audit} summary={<span className="flex items-center gap-1.5"><ClockCounterClockwise size={13} />Every change to members and roles is kept for 7 years</span>} />}

      <InviteDialog open={invite.open} initialRole={invite.roleId} onClose={() => setInvite({ open: false })}
        onExisting={(m, roleId, hall) => { setInvite({ open: false }); setAccess({ m, addHall: hall === 'all' ? undefined : hall, roleId }); }} />
      {access && <AccessSheet key={access.m.id} m={access.m} nav={listNav(shown, (x) => x.id === access.m.id, (x) => setAccess({ m: x }))} addHall={access.addHall} onClose={() => setAccess(null)} />}
      <RemoveDialog m={removing} onClose={() => setRemoving(null)} />
      <DeleteRoleDialog r={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}

function PlainTable<T extends { id: string }>({ cols, rows }: { cols: Col<T>[]; rows: T[] }) {
  const { items, bodyRef } = useRowMotion(rows);
  return (
    <table className="w-full text-sm">
      <thead><tr className="text-left text-xs text-[#737373]">{cols.map((c, i) => <th key={c.key} className={cx('font-medium h-9 border-b border-line px-3', i === 0 && 'pl-[var(--cx,12px)]', i === cols.length - 1 && 'pr-[var(--cx,12px)]', c.className)}>{c.label}</th>)}</tr></thead>
      <tbody ref={bodyRef}>{items.map(({ row: r, motion }) => <tr key={r.id} {...rowAttrs(r.id, motion)} className="border-b border-line">{cols.map((c, i) => <td key={c.key} className={cx('h-10 px-3 py-1.5', i === 0 && 'pl-[var(--cx,12px)]', i === cols.length - 1 && 'pr-[var(--cx,12px)]', c.className)}>{c.render(r)}</td>)}</tr>)}</tbody>
    </table>
  );
}

/* ---------- Invite a member (F1 · 03, E1 · 02) ---------- */
function InviteDialog({ open, initialRole, onClose, onExisting }: { open: boolean; initialRole?: string; onClose: () => void; onExisting: (m: Member, roleId: string, hall: string) => void }) {
  const { roles, members, set, audit_ } = useOrg();
  const newest = [...roles].reverse().find((r) => r.createdByYou);
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('');
  const [hall, setHall] = useState('p1');
  const busy = useRef(false);
  useEffect(() => { if (open) { setEmail(''); setRoleId(initialRole ?? newest?.id ?? 'frontdesk'); setHall('p1'); busy.current = false; } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const role = roles.find((r) => r.id === roleId) ?? roles[0];
  const halls: Member['halls'] = role?.scope === 'all' || hall === 'all' ? 'all' : [hall];
  const existing = members.find((m) => m.email.toLowerCase() === email.trim().toLowerCase());
  const exRole = existing && roles.find((r) => r.id === existing.roleId);
  const first = existing?.name.split(' ')[0];

  const send = () => {
    if (busy.current) return;
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { toast.error('Enter an email address'); return; }
    if (!e.endsWith('@durham.ac.uk')) { toast.error('Use a Durham address', { description: 'Members sign in with their operator account.' }); return; }
    busy.current = true;
    const before = snap();
    const name = nameFromEmail(e);
    set('members', (ms) => [...ms, { id: oid('m'), name, email: e, roleId: role.id, halls, lastActive: '—', status: 'Invited', since: 'Sep 2026', invitedAgo: 'just now' }]);
    audit_(`invited ${name} as ${role.name} ${halls === 'all' ? 'in all halls' : `at ${hallsLabel(halls)}`}`, 'Members');
    onClose();
    undoable(`Invite sent to ${name} · ${role.name} ${halls === 'all' ? 'in all halls' : `at ${hallsLabel(halls)}`} · expires in 7 days`, before);
  };

  return (
    <ODialog open={open} onClose={onClose} title="Invite a member" sub="They get an email and sign in with their Durham account."
      footer={<><Button onClick={onClose}>Cancel</Button>
        {existing ? <Button variant="primary" icon={ShieldCheck} onClick={() => onExisting(existing, role.id, hall)}>Change {first}’s access</Button>
          : <Button variant="primary" icon={PaperPlaneTilt} onClick={send}>Send invite</Button>}</>}>
      <div className="space-y-4">
        <Field label="Email">
          <label className="relative flex items-center">
            <EnvelopeSimple size={14} className="absolute left-2.5 text-[#737373]" />
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@durham.ac.uk" className="pl-8" onKeyDown={(e) => e.key === 'Enter' && !existing && send()} />
          </label>
        </Field>
        {existing && <Alert tone="amber" icon={Info} title={<>{existing.name} is already a member: {exRole?.name} {existing.halls === 'all' ? 'in all halls' : `at ${hallsLabel(existing.halls).replace(/, ([^,]*)$/, ' and $1')}`}.</>}>Change their access instead; they keep one account.</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <div><div className="text-sm font-medium text-gray-700 mb-1.5">Role</div>
            <IconSelect ariaLabel="Role" icon={Shield} value={roleId} onChange={setRoleId} options={roles.map((r) => ({ value: r.id, label: r.name }))} /></div>
          <div><div className="text-sm font-medium text-gray-700 mb-1.5">Halls</div>
            {role?.scope === 'all' ? <div className="h-8 px-2.5 rounded-lg border border-line bg-gray-50 text-sm text-[#737373] flex items-center gap-2"><Buildings size={14} />All halls</div>
              : <IconSelect ariaLabel="Halls" icon={Buildings} value={hall} onChange={setHall} options={[...HALLS.map((h) => ({ value: h.id, label: h.name })), { value: 'all', label: 'All halls' }]} />}</div>
        </div>
        {role && !existing && (
          <div className="rounded-lg border border-line p-3 flex gap-2.5">
            <Info size={16} className="text-primary shrink-0 mt-0.5" />
            <div><div className="text-sm font-medium text-primary">{role.createdByYou ? 'New role: ' : ''}{role.name}</div><div className="text-xs text-[#737373] mt-0.5">{roleSummary(role, halls)}</div></div>
          </div>
        )}
      </div>
    </ODialog>
  );
}

/* ---------- Member access sheet (E1 · 03) ---------- */
function AccessSheet({ m, addHall, onClose , nav }: { nav?: SheetNav;  m: Member; addHall?: string; onClose: () => void }) {
  const { roles, set, audit_ } = useOrg();
  const [roleId, setRoleId] = useState(m.roleId);
  const orig = m.halls === 'all' ? HALLS.map((h) => h.id) : m.halls;
  const [halls, setHalls] = useState<string[]>(() => (addHall && !orig.includes(addHall) ? [...orig, addHall] : orig));
  const role = roles.find((r) => r.id === roleId);
  const allScope = role?.scope === 'all';
  const save = () => {
    if (!allScope && !halls.length) { toast.error('Pick at least one hall'); return; }
    const before = snap();
    const nh: Member['halls'] = allScope || halls.length === HALLS.length ? 'all' : HALLS.map((h) => h.id).filter((id) => halls.includes(id));
    set('members', (ms) => ms.map((x) => (x.id === m.id ? { ...x, roleId, halls: nh } : x)));
    const added = halls.filter((h) => !orig.includes(h));
    if (roleId !== m.roleId) audit_(`changed ${m.name}’s role to ${role?.name}`, 'Members');
    if (added.length || halls.length !== orig.length) audit_(`changed ${m.name}’s halls to ${hallsLabel(nh)}`, 'Members');
    onClose();
    if (added.length && roleId === m.roleId) undoable(`${m.name} can now work at ${added.map((h) => hallById(h)?.name).join(' and ')}`, before, { description: `We’ve emailed ${m.name.split(' ')[0]}.` });
    else undoable(`${m.name}’s access saved`, before);
  };
  const ordered = [...HALLS].sort((a, b) => Number(orig.includes(b.id)) - Number(orig.includes(a.id)));
  return (
    <Sheet open onClose={onClose} nav={nav} width={480} title="Access"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Save</Button></>}>
      <SheetHero name={m.name} meta={`${m.email} · ${m.status === 'Active' ? `member since ${m.since}` : m.status.toLowerCase()}`} />
      <SheetSection title="Role">
        <IconSelect ariaLabel="Role" icon={Shield} value={roleId} onChange={setRoleId} options={roles.map((r) => ({ value: r.id, label: r.name }))} />
        {role && <p className="text-xs text-[#737373] mt-1.5">{roleCan(role)}</p>}
      </SheetSection>
      <SheetSection title="Halls">
        {allScope ? <p className="text-sm text-[#737373]">{role?.name} covers every hall.</p> : (
          <div className="divide-y divide-[#F5F5F5]">
            {ordered.map((h) => { const on = halls.includes(h.id); const isNew = on && !orig.includes(h.id); return (
              <label key={h.id} className="flex items-center gap-3 h-12 cursor-pointer">
                <Checkbox checked={on} onCheckedChange={(v) => setHalls((v === true) ? [...halls, h.id] : halls.filter((x) => x !== h.id))} />
                <Buildings size={15} className="text-gray-400" />
                <span className="flex-1"><span className="block text-sm font-medium">{h.name}</span><span className={cx('block text-xs', isNew ? 'text-[#0B8A4C]' : 'text-[#737373]')}>{h.rooms} rooms{isNew ? ' · added' : ''}</span></span>
              </label>
            ); })}
          </div>
        )}
        <p className="text-xs text-[#737373] mt-3">Applies straight away; {m.name.split(' ')[0]} gets an email.</p>
      </SheetSection>
    </Sheet>
  );
}

/* ---------- Remove, and the last-admin block (E2) ---------- */
function RemoveDialog({ m, onClose }: { m: Member | null; onClose: () => void }) {
  const { members, roles, teams, set, audit_ } = useOrg();
  const admins = members.filter((x) => x.roleId === 'admin' && x.status === 'Active');
  const leads = m ? teams.filter((t) => t.leadId === m.id) : [];
  const inTeams = m ? teams.filter((t) => t.memberIds.includes(m.id)) : [];
  const lastAdmin = !!m && m.roleId === 'admin' && admins.length <= 1;
  const candidates = members.filter((x) => x.id !== m?.id && x.status === 'Active');
  const [pick, setPick] = useState('');
  useEffect(() => { setPick(candidates[0]?.id ?? ''); }, [m?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m) return null;
  const first = m.name.split(' ')[0];
  if (lastAdmin) {
    const n = members.find((x) => x.id === pick);
    return (
      <ODialog open onClose={onClose} title={`You can’t remove ${m.name}`} sub={`${first} is the only Admin. A workspace always needs one.`}
        footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={Shield} disabled={!n} onClick={() => {
          if (!n) return; const before = snap();
          set('members', (ms) => ms.map((x) => (x.id === n.id ? { ...x, roleId: 'admin', halls: 'all' as const } : x)));
          audit_(`made ${n.name} an Admin`, 'Members'); onClose();
          undoable(`${n.name} is now an Admin · you can remove yourself`, before);
        }}>Make {n?.name.split(' ')[0] ?? 'them'} Admin</Button></>}>
        <div className="space-y-4">
          <Alert tone="amber" icon={ShieldCheck} title="Make someone else Admin first">Then you can change {first}’s role or remove them.</Alert>
          <div><div className="text-sm font-medium text-gray-700 mb-1.5">New admin</div>
            <IconSelect ariaLabel="New admin" icon={User} value={pick} onChange={setPick} options={candidates.map((c) => ({ value: c.id, label: `${c.name} · ${roles.find((r) => r.id === c.roleId)?.name ?? ''}` }))} /></div>
        </div>
      </ODialog>
    );
  }
  return (
    <ODialog open onClose={onClose} title={`Remove ${m.name}?`} sub="They lose access straight away. What they did stays in the audit log."
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="danger" onClick={() => {
        const before = snap();
        set('members', (ms) => ms.filter((x) => x.id !== m.id));
        /* They come off every team; a team they led passes to its next member, or has no lead. */
        if (inTeams.length) set('teams', (ts) => ts.map((t) => {
          if (!t.memberIds.includes(m.id)) return t;
          const ids = t.memberIds.filter((x) => x !== m.id);
          return { ...t, memberIds: ids, leadId: t.leadId === m.id ? (ids[0] ?? '') : t.leadId };
        }));
        audit_(`removed ${m.name} from the workspace`, 'Members'); onClose();
        undoable(`${m.name} removed from the workspace`, before);
      }}>Remove</Button></>}>
      {inTeams.length > 0 && (
        <Alert tone="amber" icon={Warning} title={leads.length ? `${m.name.split(' ')[0]} leads ${leads.map((t) => t.name).join(' and ')}` : `${m.name.split(' ')[0]} is in ${inTeams.length === 1 ? 'a team' : `${inTeams.length} teams`}`}>
          {`They come off ${inTeams.map((t) => t.name).join(', ')}.`}{leads.length ? ` ${leads.map((t) => { const next = t.memberIds.find((x) => x !== m.id); return next ? `${members.find((x) => x.id === next)?.name} leads ${t.name}` : `${t.name} has no lead`; }).join('; ')}.` : ''}
        </Alert>
      )}
    </ODialog>
  );
}

/* ---------- Delete a role still in use (E3) ---------- */
function DeleteRoleDialog({ r, onClose }: { r: Role | null; onClose: () => void }) {
  const { members, roles, set, audit_ } = useOrg();
  const users = useMemo(() => (r ? members.filter((m) => m.roleId === r.id) : []), [r, members]);
  const others = roles.filter((x) => x.id !== r?.id);
  const [to, setTo] = useState('');
  useEffect(() => { setTo(others.find((x) => x.id === 'hallmgr')?.id ?? others.find((x) => x.id !== 'admin')?.id ?? ''); }, [r?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!r) return null;
  const target = roles.find((x) => x.id === to);
  const more = target && r && target.perms.some((p) => !r.perms.includes(p));
  const firsts = users.map((u) => u.name.split(' ')[0]);
  const names = firsts.length > 1 ? `${firsts.slice(0, -1).join(', ')} and ${firsts.at(-1)}` : firsts[0];
  const del = () => {
    const before = snap();
    if (users.length && target) set('members', (ms) => ms.map((m) => (m.roleId === r.id ? { ...m, roleId: target.id, halls: target.scope === 'all' ? ('all' as const) : m.halls } : m)));
    set('roles', (rs) => rs.filter((x) => x.id !== r.id));
    audit_(users.length ? `moved ${users.length} members to ${target?.name} and deleted the role ${r.name}` : `deleted the role ${r.name}`, 'Roles');
    onClose();
    undoable(users.length ? `${users.length} ${users.length === 1 ? 'member' : 'members'} moved to ${target?.name} · ${r.name} deleted` : `${r.name} deleted`, before, { area: 'Roles', description: 'Undo lasts 10 seconds.' });
  };
  return (
    <ODialog open onClose={onClose} title={`Delete ${r.name}?`}
      sub={users.length ? `${users.length} ${users.length === 1 ? 'member has' : 'members have'} this role. Move them to another role first; nobody is left without access.` : 'Nobody has this role. You can’t undo this after 10 seconds.'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="danger" disabled={!!users.length && !target} onClick={del}>{users.length ? `Move ${users.length} and delete` : 'Delete role'}</Button></>}>
      {users.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-1.5">{users.slice(0, 5).map((u) => <span key={u.id} className="ring-2 ring-white rounded-full"><Avatar name={u.name} size={24} /></span>)}</div>
            <span className="text-sm text-gray-700">{names}</span>
          </div>
          <div><div className="text-sm font-medium text-gray-700 mb-1.5">Move them to</div>
            <IconSelect ariaLabel="Move them to" icon={Shield} value={to} onChange={setTo} options={others.map((x) => ({ value: x.id, label: x.name }))} /></div>
          {more && <Alert tone="amber" icon={Warning} title={`${target!.name} can do more than ${r.name}: check this is what you want.`} />}
        </div>
      )}
    </ODialog>
  );
}

