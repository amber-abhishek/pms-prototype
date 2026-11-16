// Your profile: opened from the account menu's Profile row (Connect 2.0 profile menu, 3095:20284). Same card stack as Settings.
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Camera, Monitor, Moon, Sun, Trash, UploadSimple, UserCircle } from '../components/icons';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/shadcn/dropdown-menu';
import { Button, Input, Pill, Switch, TitleH1, cx } from '../components/ui';
import { PersonPhoto, genderOf } from '../components/Logo';
import { useAuth } from '../data/auth';
import { useDb } from '../data/store';
import { useTheme, type ThemeMode } from '../data/theme';
import { Header } from './org/parts';
import { Lbl, Section } from './workspace/Settings';

const ROLE = { admin: { label: 'Super admin', scope: 'Every module' }, offcampus: { label: 'Off-campus reviewer', scope: 'Home, Off-campus and Settings' } } as const;
const THEMES: { id: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', Icon: Sun },
  { id: 'dark', label: 'Dark', Icon: Moon },
  { id: 'system', label: 'System', Icon: Monitor },
];

export function Profile() {
  const me = useAuth((s) => s.remembered) ?? { name: 'Priya Shah', email: 'priya.shah@durham.ac.uk' };
  const role = useDb((s) => s.role);
  const { mode, setMode } = useTheme();
  const saved = { name: me.name, title: 'Head of Residential Services', phone: '+44 191 334 2000' };
  const [base, setBase] = useState(saved);
  const [d, setD] = useState(saved);
  const [twoStep, setTwoStep] = useState(true);
  const dirty = d.name !== base.name || d.title !== base.title || d.phone !== base.phone;
  const nameErr = d.name.trim() ? undefined : 'Add your name; colleagues see it on tasks and notes';

  const save = () => {
    if (nameErr) return;
    const name = d.name.trim();
    useAuth.setState((s) => ({ remembered: { ...(s.remembered ?? me), name } }));
    setBase({ ...d, name });
    setD({ ...d, name });
    toast.success('Profile saved');
  };

  return (
    <>
      <Header icon={UserCircle} crumbs={[]} title="Profile">
        {dirty && <Button variant="ghost" onClick={() => setD(base)}>Discard</Button>}
        <Button variant="primary" disabled={!dirty || !!nameErr} onClick={save}>Save</Button>
      </Header>
      <div className="flex-1 overflow-auto">
        <div className="px-8 pt-8 pb-16 max-w-[960px] flex flex-col gap-4">
          <TitleH1 className="sr-only">Profile</TitleH1>
          <Section title="Profile">
            <div className="flex items-center gap-4 mb-5">
              <PhotoPicker name={base.name} />
              <div className="min-w-0">
                <div className="text-base leading-6 font-medium text-[#0A0A0A] truncate">{d.name || me.name}</div>
                <div className="text-sm leading-5 text-[#737373] truncate">{me.email}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label>
                <Lbl>Full name</Lbl>
                <Input aria-invalid={!!nameErr} className={cx(nameErr && 'border-[#E0243A] focus-visible:ring-[#E0243A]/25')} value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
                {nameErr && <p role="alert" className="text-xs leading-4 text-[#E0243A] mt-1.5">{nameErr}</p>}
              </label>
              <label><Lbl>Job title</Lbl><Input value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></label>
              <div>
                <Lbl>Email</Lbl>
                <div className="h-8 px-2.5 rounded-lg border border-line bg-gray-50 text-sm flex items-center text-[#737373] truncate">{me.email}</div>
              </div>
              <label><Lbl>Phone</Lbl><Input type="tel" value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} /></label>
            </div>
          </Section>

          <Section title="Role and access">
            <div className="flex items-center gap-3">
              <Pill tone="blue">{ROLE[role].label}</Pill>
              <span className="text-sm leading-5 text-[#737373]">{ROLE[role].scope}</span>
            </div>
          </Section>

          <Section title="Sign-in">
            <div className="flex flex-col divide-y divide-[#F0F0F0]">
              <div className="pb-4 flex items-center gap-3">
                <div className="flex-1 min-w-0"><div className="text-sm leading-5 font-medium text-[#0A0A0A]">Password</div><div className="text-sm leading-5 text-[#737373]">Changed 3 months ago</div></div>
                <Button size="sm" onClick={() => toast('Password reset link sent', { description: me.email })}>Change password</Button>
              </div>
              <div className="pt-4 flex items-center gap-3">
                <div className="flex-1 min-w-0"><div className="text-sm leading-5 font-medium text-[#0A0A0A]">Two-step verification</div><div className="text-sm leading-5 text-[#737373]">A code from your authenticator app</div></div>
                <Switch checked={twoStep} onChange={(v) => { setTwoStep(v); toast.success(v ? 'Two-step verification on' : 'Two-step verification off'); }} label="Two-step verification" />
              </div>
            </div>
          </Section>

          <Section title="Appearance">
            <div className="flex items-center gap-3">
              <div className="flex-1 text-sm leading-5 font-medium text-[#0A0A0A]">Theme</div>
              <div role="group" aria-label="Theme" className="flex gap-0.5 p-[3px] rounded-lg bg-[#F5F5F5]">
                {THEMES.map(({ id, label, Icon }) => (
                  <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)}
                    className={cx('h-6 px-2.5 rounded-md flex items-center gap-1.5 text-sm leading-5 outline-none focus-visible:ring-2 focus-visible:ring-ring', mode === id ? 'bg-white text-[#0A0A0A] shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'text-[#737373] hover:text-[#0A0A0A]')}>
                    <Icon size={16} strokeWidth={1.5} />{label}
                  </button>
                ))}
              </div>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}

const BASE = import.meta.env.BASE_URL;
const MENU_ROW = 'gap-2 text-sm [&>svg]:text-[#404040]';

/** Downscale a picked image to a 256px square (centre crop) so it fits in session storage. */
function toSquare(file: File): Promise<string> {
  return new Promise((ok, fail) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      c.getContext('2d')!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 256, 256);
      URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); fail(new Error('not an image')); };
    img.src = url;
  });
}

/* The profile photo: hovering shows a dark veil with a camera and "Change"; clicking opens upload, the two
   illustrations, and Remove once you have your own photo. Saved straight away (the account menu updates too). */
function PhotoPicker({ name }: { name: string }) {
  const photo = useAuth((s) => s.remembered?.photo);
  const file = useRef<HTMLInputElement>(null);
  const set = (p: string | undefined, msg: string) => {
    useAuth.setState((s) => (s.remembered ? { remembered: { ...s.remembered, photo: p } } : s));
    toast.success(msg);
  };
  const onFile = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Pick a PNG, JPG or GIF'); return; }
    try { set(await toSquare(f), 'Photo updated'); } catch { toast.error('That file could not be read as an image'); }
  };
  const mine = genderOf(name) === 'm' ? `${BASE}avatars/man.svg` : `${BASE}avatars/woman.svg`;
  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger aria-label="Change photo" className="group relative size-16 shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <PersonPhoto name={name} size={64} />
          <span className="absolute inset-0 rounded-full bg-black/45 text-white flex flex-col items-center justify-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[state=open]:opacity-100">
            <Camera size={16} strokeWidth={1.5} />
            <span className="text-[11px] leading-3 font-medium">Change</span>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} className="w-52">
          <DropdownMenuItem className={MENU_ROW} onSelect={() => file.current?.click()}><UploadSimple size={16} strokeWidth={1.5} />Upload photo</DropdownMenuItem>
          <DropdownMenuSeparator />
          {([['woman', 'Woman, bun'], ['woman-2', 'Woman, ponytail'], ['man', 'Man, short hair'], ['man-2', 'Man, curly hair']] as const).map(([k, label]) => {
            const src = `${BASE}avatars/${k}.svg`;
            const on = (photo ?? mine) === src;
            return (
              <DropdownMenuItem key={k} className={cx(MENU_ROW, on && 'font-medium text-[#0A0A0A]')} onSelect={() => set(src, 'Photo updated')}>
                <img src={src} alt="" className="size-5 rounded-full" />{label}
              </DropdownMenuItem>
            );
          })}
          {photo?.startsWith('data:') && <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className={cx(MENU_ROW, 'text-[#DC2626] focus:text-[#B91C1C] [&>svg]:text-[#DC2626]')} onSelect={() => set(undefined, 'Photo removed')}><Trash size={16} strokeWidth={1.5} />Remove photo</DropdownMenuItem>
          </>}
        </DropdownMenuContent>
      </DropdownMenu>
      <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
    </>
  );
}
