// Organisation › Teams. No Figma frame; styled like Roles and access (header, toolbar, full-bleed table, sheet).
import { useEffect, useRef, useState } from 'react';
import { Empty } from '../../components/ui';
import { Buildings, Plus, UsersThree } from '../../components/icons';
import { toast } from 'sonner';
import { Avatar, Button, Field, Input, Pill, SearchInput, Sheet, Table, PageHeading, cx, SheetHero, SheetRow, SheetSection, listNav, type SheetNav } from '../../components/ui';
import { EditLink, LineTabs, PanelModal } from '../inventory/common';
import { Checkbox } from '../../components/shadcn/checkbox';
import { HALLS, hallsLabel, oid, snapOrg, undoSince, useOrg, type Team } from '../../data/org';
import { Header, IconSelect, RowMenu } from './parts';

export function TeamsPage() {
  const { teams, members, set, audit_ } = useOrg();
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Team | 'new' | null>(null);
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? 'Former member';
  const rows = teams.filter((t) => `${t.name} ${t.purpose}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <>
      <Header icon={UsersThree} crumbs={[{ label: 'Organisation' }]} title="Teams">
        {/* Search is the page's only control, so it sits in the header (no toolbar row). */}
        {teams.length > 0 && <div className="w-[240px] [&>label]:!w-full"><SearchInput value={q} onChange={setQ} placeholder="Search teams" /></div>}
        <Button variant="primary" icon={Plus} onClick={() => setEdit('new')}>New team</Button>
      </Header>
      <PageHeading />
      <Table rows={rows} empty={<Empty art="team" title="No teams yet" sub="Group people who work together, like a front desk." />} onRow={(t) => setEdit(t)} selected={edit && edit !== 'new' ? edit.id : undefined} cols={[
        { key: 'n', label: 'Team', className: 'w-[30%]', render: (t) => <div className="leading-tight"><div className="text-sm font-medium">{t.name}</div><div className="text-xs text-[#737373]">{t.purpose}</div></div> },
        { key: 'l', label: 'Lead', render: (t) => t.leadId && members.some((m) => m.id === t.leadId) ? <span className="flex items-center gap-2 text-sm"><Avatar name={name(t.leadId)} size={20} />{name(t.leadId)}</span> : <span className="text-sm text-[#C2410C]">No lead</span> },
        { key: 'm', label: 'Members', render: (t) => (
          <span className="flex items-center gap-2"><span className="flex -space-x-1.5">{t.memberIds.slice(0, 5).map((id) => <span key={id} className="ring-2 ring-white rounded-full"><Avatar name={name(id)} size={24} /></span>)}</span><span className="text-sm text-[#737373]">{t.memberIds.length}</span></span>
        ) },
        { key: 'h', label: 'Properties', render: (t) => <span className="text-sm text-gray-700">{hallsLabel(t.halls)}</span> },
        { key: 'x', label: '', className: 'w-12 text-right', render: (t) => <RowMenu items={[
          { label: 'Edit team', onClick: () => setEdit(t) },
          { label: 'Delete team', danger: true, onClick: () => {
            const before = snapOrg();
            set('teams', (ts) => ts.filter((x) => x.id !== t.id)); audit_(`deleted the team ${t.name}`, 'Teams');
            toast.success(`${t.name} deleted`, { action: { label: 'Undo', onClick: undoSince(before, `deleted the team ${t.name}`, 'Teams') } });
          } },
        ]} /> },
      ]} />
      {edit === 'new' && <TeamDialog open onClose={() => setEdit(null)} />}
      {edit && edit !== 'new' && <TeamSheet key={edit.id} team={edit} nav={listNav(rows, (x) => x.id === edit.id, (x) => setEdit(x))} onClose={() => setEdit(null)} />}
    </>
  );
}

/* Team panel (Figma "Side panel · Team" 4073:17189): read-only record with Overview (Halls, Members) and Activity. Edit on
   either section opens the centred team modal; a new team uses the same modal. Delete is in the control bar. */
function TeamSheet({ team: t0, onClose, nav }: { nav?: SheetNav; team: Team; onClose: () => void }) {
  const { members, roles, audit, teams, set, audit_ } = useOrg();
  /* The live record, so a save shows straight away in the panel. */
  const team = teams.find((t) => t.id === t0.id) ?? t0;
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<'overview' | 'activity'>('overview');
  const del = () => {
    const before = snapOrg();
    set('teams', (ts) => ts.filter((x) => x.id !== team.id)); audit_(`deleted the team ${team.name}`, 'Teams');
    toast.success(`${team.name} deleted`, { action: { label: 'Undo', onClick: undoSince(before, `deleted the team ${team.name}`, 'Teams') } });
    onClose();
  };
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? 'Former member';
  const hallList = team.halls === 'all' ? HALLS : HALLS.filter((h) => (team.halls as string[]).includes(h.id));
  const leadName = team.leadId && members.some((m) => m.id === team.leadId) ? name(team.leadId) : 'No lead';
  const ordered = [...team.memberIds].sort((a, b) => Number(b === team.leadId) - Number(a === team.leadId));
  const acts = audit.filter((a) => a.what.includes(team.name)).slice(0, 6);
  const activity = acts.length ? acts.map((a) => ({ who: a.who, what: a.what, when: a.when }))
    : [...team.memberIds.slice(-1).map((id) => ({ who: 'Arjun Mehta', what: `added ${name(id)}`, when: '12 Nov' })),
       ...hallList.slice(-1).map((h) => ({ who: 'Arjun Mehta', what: `added ${h.name}`, when: '3 Nov' })),
       { who: leadName === 'No lead' ? 'Arjun Mehta' : leadName, what: 'created the team', when: 'Mar 2025' }];
  return (
    <Sheet open onClose={onClose} nav={nav} title="Team" onDelete={{ label: 'Delete team', onClick: del }}>
      <SheetHero icon={UsersThree} name={team.name} meta={team.purpose || `${team.memberIds.length} ${team.memberIds.length === 1 ? 'member' : 'members'}`}
        facts={[['Members', String(team.memberIds.length)], ['Properties', team.halls === 'all' ? 'All' : String(hallList.length)], ['Lead', leadName]]} />
      <div className="-mx-5 mb-5"><LineTabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'activity', label: 'Activity' }]} /></div>
      {tab === 'overview' && <>
        <SheetSection title={`Properties · ${hallList.length}`} action={<EditLink onClick={() => setEditing(true)}>Edit</EditLink>}>
          {hallList.map((h) => <SheetRow key={h.id} title={h.name} sub={`${h.rooms} rooms`} />)}
        </SheetSection>
        <SheetSection title={`Members · ${team.memberIds.length}`} action={<EditLink onClick={() => setEditing(true)}>Edit</EditLink>}>
          {ordered.map((id) => { const m = members.find((x) => x.id === id); return (
            <SheetRow key={id} lead={<Avatar name={name(id)} size={24} />} title={name(id)} sub={roles.find((r) => r.id === m?.roleId)?.name ?? '—'} end={id === team.leadId ? <Pill tone="grey">Lead</Pill> : undefined} />
          ); })}
        </SheetSection>
      </>}
      {tab === 'activity' && (
        <SheetSection title="Activity">
          {activity.map((a, i) => <SheetRow key={i} lead={<Avatar name={a.who} size={24} />} title={`${a.who} ${a.what}`} sub={a.when} />)}
        </SheetSection>
      )}
      <TeamDialog team={team} open={editing} onClose={() => setEditing(false)} />
    </Sheet>
  );
}

/** Create or edit a team in a centred modal: name and purpose, halls, members (with the lead). */
function TeamDialog({ team, open, onClose }: { team?: Team; open: boolean; onClose: () => void }) {
  const { members, set, audit_ } = useOrg();
  const [n, setN] = useState(team?.name ?? '');
  const [purpose, setPurpose] = useState(team?.purpose ?? '');
  const [ids, setIds] = useState<string[]>(team?.memberIds ?? []);
  const [lead, setLead] = useState(team?.leadId ?? members[0]?.id ?? '');
  const [hall, setHall] = useState(team ? (team.halls === 'all' ? 'all' : team.halls[0]) : 'all');
  const busy = useRef(false);
  useEffect(() => {
    if (!open) return;
    busy.current = false;
    setN(team?.name ?? ''); setPurpose(team?.purpose ?? ''); setIds(team?.memberIds ?? []); setLead(team?.leadId ?? members[0]?.id ?? ''); setHall(team ? (team.halls === 'all' ? 'all' : team.halls[0]) : 'all');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = () => {
    if (busy.current) return;
    if (!n.trim()) { toast.error('Name the team'); return; }
    const twin = useOrg.getState().teams.find((t) => t.id !== team?.id && t.name.trim().toLowerCase() === n.trim().toLowerCase());
    if (twin) { toast.error(`There’s already a team called ${twin.name}`); return; }
    if (!ids.length) { toast.error('Add at least one member'); return; }
    busy.current = true;
    const rec: Team = { id: team?.id ?? oid('t'), name: n.trim(), purpose: purpose.trim(), leadId: ids.includes(lead) ? lead : ids[0], memberIds: ids, halls: hall === 'all' ? 'all' : [hall] };
    set('teams', (ts) => (team ? ts.map((t) => (t.id === team.id ? rec : t)) : [...ts, rec]));
    audit_(team ? `edited the team ${rec.name}` : `created the team ${rec.name}`, 'Teams');
    toast.success(team ? `${rec.name} saved` : `${rec.name} created`);
    onClose();
  };
  return (
    <PanelModal open={open} onClose={onClose} eyebrow={team ? 'Edit team' : 'New team'} title={team?.name} width={600}
      right={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={null} onClick={save}>{team ? 'Save' : 'Create team'}</Button></>}>
      <SheetSection title="Team">
        <div className="space-y-4">
          <Field label="Name"><Input value={n} onChange={(e) => setN(e.target.value)} placeholder="e.g. Van Mildert" /></Field>
          <Field label="What it’s for"><Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="One line" /></Field>
        </div>
      </SheetSection>
      <SheetSection title="Properties">
        <IconSelect ariaLabel="Properties" icon={Buildings} value={hall} onChange={setHall} options={[{ value: 'all', label: 'All properties' }, ...HALLS.map((h) => ({ value: h.id, label: h.name }))]} />
      </SheetSection>
      <SheetSection title={`Members · ${ids.length}`}>
        <div className="divide-y divide-[#EBEBEB] -my-1">
          {members.map((m) => { const on = ids.includes(m.id); return (
            <label key={m.id} className="flex items-center gap-3 h-11 cursor-pointer">
              <Checkbox checked={on} onCheckedChange={(v) => setIds((v === true) ? [...ids, m.id] : ids.filter((x) => x !== m.id))} />
              <Avatar name={m.name} size={24} /><span className="flex-1 text-sm">{m.name}</span>
              {on && <button type="button" onClick={(e) => { e.preventDefault(); setLead(m.id); }} className={cx('text-xs', lead === m.id ? 'text-[#0A0A0A] font-medium' : 'text-[#737373] hover:text-[#0A0A0A]')}>{lead === m.id ? 'Lead' : 'Make lead'}</button>}
            </label>
          ); })}
        </div>
      </SheetSection>
    </PanelModal>
  );
}
