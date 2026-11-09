// Sign-in, invite and the frame around them. Mirrors apps/accounts (LoginPage, TenantPicker, InvitePage):
// email → 6-digit code → university picker (only for accounts that reach more than one) → "You're in" → the app.
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CaretRight, Check, CheckCircle, CircleNotch, EnvelopeSimple, UserCircle, X } from '../../components/icons';
import { Button, Input, Note, cx, Pill } from '../../components/ui';
import { EXPIRED_CODE, RESEND_SECONDS, TENANTS, WRONG_CODE, nameFrom, needsPicker, useAuth, type Tenant } from '../../data/auth';

type Step =
  | { s: 'email' }
  | { s: 'code'; email: string; resendAt: number }
  | { s: 'tenant'; email: string }
  | { s: 'done'; name: string; portal: string };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Figma 3243:2: the form column on the left (brand row, a 400px block centred, footer), the campus photo on the right. */
export function AuthFrame({ children, demo = true }: { children: ReactNode; demo?: boolean }) {
  return (
    <main className="min-h-screen bg-white flex">
      <div className="w-full lg:w-[640px] shrink-0 min-h-screen flex flex-col justify-between gap-10 px-6 sm:px-[120px] py-10">
        <div className="flex items-center gap-2.5">
          <span className="size-7 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-white text-xs font-bold flex items-center justify-center">D</span>
          <span className="text-sm leading-5 font-semibold text-ink">Durham University</span>
          <span className="text-sm leading-5 text-[#9CA3AF]">on Amber</span>
        </div>
        <div className="w-full max-w-[400px]">
          {children}
          {demo && <DemoStrip />}
        </div>
        <footer className="flex items-center justify-between text-xs leading-5 text-[#9CA3AF]">
          <span>© 2026 Amber</span>
          <nav className="flex gap-4">{['Privacy', 'Terms', 'Help'].map((l) => <a key={l} href="#/login" className="hover:text-[#646A78]">{l}</a>)}</nav>
        </footer>
      </div>
      <div className="hidden lg:block flex-1 p-2 pl-0">
        <img src="auth/campus.png" alt="" className="sticky top-2 h-[calc(100vh-16px)] w-full rounded-2xl object-cover" />
      </div>
    </main>
  );
}

/** Prototype only: jump straight to each state, and the codes that show the errors. */
function DemoStrip() {
  const forget = useAuth((s) => s.forget);
  const remember = () => useAuth.setState({ remembered: { email: 'priya.shah@durham.ac.uk', name: 'Priya Shah', tenantId: 'durham' } });
  const link = 'text-[#646A78] hover:text-ink underline-offset-2 hover:underline';
  return (
    <div className="mt-10 pt-4 border-t border-[#F3F4F6] text-xs leading-5 text-[#9CA3AF]">
      <div>Prototype · any 6 digits sign you in · <span className="font-mono">{WRONG_CODE}</span> is a wrong code · <span className="font-mono">{EXPIRED_CODE}</span> has expired · an @amberstudent.com email gets the university picker</div>
      <div className="mt-1 flex flex-wrap gap-x-3">
        <a href="#/login" onClick={remember} className={link}>Returning user</a>
        <a href="#/login" onClick={forget} className={link}>First sign-in</a>
        <Link to="/invite" className={link}>Invite</Link>
        <Link to="/invite?expired=1" className={link}>Expired invite</Link>
      </div>
    </div>
  );
}

function Title({ icon, title, sub }: { icon?: ReactNode; title: string; sub?: ReactNode }) {
  return (
    <div className="mb-7">
      {icon}
      <h1 className="text-[32px] leading-10 font-semibold tracking-[-0.8px] text-ink">{title}</h1>
      {sub && <p className="text-base leading-6 text-[#646A78] mt-3">{sub}</p>}
    </div>
  );
}

const Spinner = () => <CircleNotch size={16} className="animate-spin" />;

/* Figma 3251:14: fields 48px, 10px radius, #D1D5DB edge, focus = blue edge + 3px 15% ring; the button is 44px, blue. */
const field = '!h-12 rounded-[10px] border-[#D1D5DB] bg-white pl-11 pr-11 text-base transition-[border-color,box-shadow] duration-150 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/15';
const bigBtn = 'w-full !h-11 rounded-[10px] gap-1.5 text-base font-medium transition-[background-color,transform] duration-150 ease-[cubic-bezier(.23,1,.32,1)] active:scale-[.99] motion-reduce:active:scale-100';

export function Login() {
  const signedIn = useAuth((s) => s.signedIn);
  const saved = useAuth((s) => s.remembered);
  const { forget, signIn } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<Step>({ s: 'email' });
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<string | null>(null); // which control is working: 'send', 'saved', 'verify' or a tenant id
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [other, setOther] = useState(false); // chose "Use another account" from the chooser

  /* Already in (and not mid-flow): the sign-in page has nothing to do. */
  if (signedIn && step.s !== 'done') return <Navigate to="/" replace />;

  const send = async (to: string, which: string) => {
    setBusy(which); setError(null);
    await wait(700);
    setBusy(null); setCode('');
    setStep({ s: 'code', email: to, resendAt: Date.now() + RESEND_SECONDS * 1000 });
  };
  const finish = async (to: string, tenant: Tenant) => {
    const name = saved?.email === to ? saved.name : nameFrom(to);
    setStep({ s: 'done', name, portal: tenant.name });
    await wait(1400);
    signIn({ email: to, name, tenantId: tenant.id });
    nav('/', { replace: true });
  };
  const verify = async (to: string, code: string) => {
    setBusy('verify'); setError(null);
    await wait(800);
    setBusy(null);
    if (code === WRONG_CODE) { setCode(''); return setError('That code isn’t right. Check the email and try again.'); }
    if (code === EXPIRED_CODE) { setCode(''); return setError('That code has expired. Send a new one.'); }
    if (needsPicker(to)) setStep({ s: 'tenant', email: to });
    else void finish(to, TENANTS[0]);
  };

  if (step.s === 'done') {
    return (
      <AuthFrame demo={false}>
        <Title
          icon={<div className="mb-5 size-12 rounded-full bg-[#E8F7EE] text-[#0B8A4C] flex items-center justify-center animate-[pop_240ms_cubic-bezier(.23,1,.32,1)]"><Check size={24} weight="bold" /></div>}
          title={`You’re in, ${step.name.split(' ')[0]}`} sub={`Opening ${step.portal}…`} />
        <div className="h-1 overflow-hidden rounded-full bg-[#F3F4F6]"><div className="h-full rounded-full bg-[#0B8A4C] animate-[creep_1400ms_cubic-bezier(.23,1,.32,1)_forwards] w-full origin-left" /></div>
      </AuthFrame>
    );
  }

  if (step.s === 'code') {
    return (
      <AuthFrame>
        <Title title="Check your email" sub={<>We sent a six-digit code to <span className="font-medium text-ink">{step.email}</span>. Enter it to sign in.</>} />
        <form noValidate onSubmit={(e) => { e.preventDefault(); if (code.length === 6 && !busy) void verify(step.email, code); }}>
          <label htmlFor="otp" className="block text-sm font-medium text-ink mb-2">One-time code</label>
          <CodeInput value={code} busy={busy === 'verify'} invalid={!!error}
            onChange={(c) => { setCode(c); if (error) setError(null); if (c.length === 6 && !busy) void verify(step.email, c); }} />
          {error && <p role="alert" className="mt-2 text-xs leading-4 text-[#E0243A]">{error}</p>}
          <Button type="submit" variant="primary" disabled={!!busy} className={cx(bigBtn, 'mt-7')}>
            {busy === 'verify' ? <><Spinner />Verifying…</> : <>Verify<ArrowRight size={16} /></>}
          </Button>
        </form>
        <div className="mt-3.5 flex items-center justify-between">
          <Resend at={step.resendAt} busy={busy === 'send'} onResend={() => send(step.email, 'send')} />
          <button type="button" onClick={() => { setError(null); setStep({ s: 'email' }); }} className="text-sm font-medium text-ink hover:underline underline-offset-2">Use a different email</button>
        </div>
      </AuthFrame>
    );
  }

  if (step.s === 'tenant') {
    const list = [...TENANTS].sort((a, b) => Number(b.id === saved?.tenantId) - Number(a.id === saved?.tenantId));
    return (
      <AuthFrame>
        <Title title="Choose a university" sub={`Your account has access to ${TENANTS.length} universities.`} />
        <div className="space-y-1 -mx-2">
          {list.map((t) => (
            <button key={t.id} type="button" disabled={!!busy} onClick={async () => { setBusy(t.id); await wait(600); setBusy(null); void finish(step.email, t); }}
              className="w-full flex items-center gap-3 rounded-lg p-2 text-left hover:bg-[#F9FAFB] disabled:opacity-60 disabled:cursor-default outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
              <span className="size-8 shrink-0 rounded-full bg-[#EFF6FF] text-[#1D4ED8] text-xs font-semibold flex items-center justify-center">{t.name.replace(/\b(University|of|the)\b/g, '').trim()[0]}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink">{t.name}</span><span className="block truncate text-xs text-[#646A78]">{t.host}</span></span>
              {t.id === saved?.tenantId && <Pill tone="blue">Last used</Pill>}
              <span className="text-gray-400">{busy === t.id ? <Spinner /> : <CaretRight size={16} />}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setStep({ s: 'email' })} className="mt-4 text-sm text-[#646A78] hover:text-ink hover:underline underline-offset-2">Start again</button>
      </AuthFrame>
    );
  }

  /* Email step: "Welcome back" when this browser remembers someone, "Sign in" otherwise. */
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.trim());
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!valid) return setError(email.trim() ? 'Enter a full email address, like name@durham.ac.uk.' : 'Enter your work email.');
    void send(email.trim(), 'send');
  };
  /* Google-style account chooser: the remembered account, then "Use another account" and "Remove an account". */
  if (saved && !other) {
    const row = 'w-full h-16 flex items-center gap-3 px-2 text-left transition-colors duration-150 hover:bg-[#F9FAFB] outline-none focus-visible:bg-[#F9FAFB] focus-visible:shadow-[inset_0_0_0_2px_rgba(37,99,235,0.4)] disabled:opacity-60';
    const iconTile = 'size-9 shrink-0 rounded-full flex items-center justify-center text-[#646A78]';
    return (
      <AuthFrame>
        <Title title="Choose an account" sub="to continue to Durham University" />
        <div className="border-y border-[#E5E7EB] divide-y divide-[#E5E7EB]">
          {/* The × to forget this account shows on hover or keyboard focus (always on touch, where there is no hover). */}
          <div className="group relative">
            <button type="button" disabled={!!busy} onClick={() => send(saved.email, 'saved')} className={row}>
              <span className="size-9 shrink-0 rounded-full bg-gradient-to-br from-[#F97316] to-[#EC4899] text-white text-sm font-semibold flex items-center justify-center">{saved.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm leading-5 font-medium text-ink">{saved.name}</span><span className="block truncate text-sm leading-5 text-[#646A78]">{saved.email}</span></span>
              {busy === 'saved'
                ? <span className="text-[#9CA3AF]"><Spinner /></span>
                : <span className="text-xs text-[#9CA3AF] transition-opacity duration-150 group-hover:opacity-0 group-focus-within:opacity-0 [@media(hover:none)]:opacity-0">Signed out</span>}
            </button>
            {busy !== 'saved' && (
              <button type="button" aria-label={`Remove ${saved.name} from this device`} title="Remove account" onClick={forget}
                className="absolute right-0 top-1/2 -translate-y-1/2 size-8 rounded-full flex items-center justify-center text-[#646A78] hover:bg-[#E5E7EB] hover:text-ink opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 outline-none focus-visible:shadow-[0_0_0_2px_rgba(37,99,235,0.4)]">
                <X size={16} />
              </button>
            )}
          </div>
          <button type="button" disabled={!!busy} onClick={() => { setError(null); setOther(true); }} className={row}>
            <span className={iconTile}><UserCircle size={22} /></span>
            <span className="text-sm leading-5 font-medium text-ink">Use another account</span>
          </button>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame>
      <Title title="Sign in" sub="Enter your work email and we’ll send you a one-time code." />
      <form onSubmit={submit} noValidate>
        <label htmlFor="email" className="block text-sm font-medium text-ink mb-2">Work email</label>
        <div className="relative">
          <EnvelopeSimple size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <Input id="email" type="email" autoComplete="email" placeholder="name@university.ac.uk" value={email}
            onChange={(e) => { setEmail(e.target.value); if (error) setError(null); }}
            aria-invalid={!!error} aria-describedby={error ? 'email-error' : undefined}
            className={cx(field, error && 'border-[#E0243A] hover:border-[#E0243A] focus-visible:border-[#E0243A] focus-visible:ring-[#E0243A]/15')} />
          {valid && <CheckCircle size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#0B8A4C]" />}
        </div>
        {error && <p id="email-error" role="alert" className="mt-2 text-xs leading-4 text-[#E0243A]">{error}</p>}
        <Button type="submit" variant="primary" disabled={!!busy} className={cx(bigBtn, 'mt-4')}>
          {busy === 'send' ? <><Spinner />Sending…</> : <>Send code<ArrowRight size={16} /></>}
        </Button>
      </form>
      {saved && <button type="button" onClick={() => { setError(null); setOther(false); }} className="mt-4 text-sm font-medium text-ink hover:underline underline-offset-2">Back to {saved.name}</button>}
    </AuthFrame>
  );
}

/** Six boxes over one real input, so paste, autofill (one-time-code) and backspace all just work. Six digits submit themselves. */
function CodeInput({ value: v, busy, invalid, onChange }: { value: string; busy: boolean; invalid: boolean; onChange: (code: string) => void }) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []); // the user just asked for this code: put them in the boxes
  return (
    <div className="relative">
      <input ref={ref} id="otp" inputMode="numeric" autoComplete="one-time-code" value={v} readOnly={busy}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-text" />
      <div className="flex justify-between" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => {
          const active = focused && !busy && (i === v.length || (v.length === 6 && i === 5));
          return (
            <div key={i} className={cx('h-12 w-14 rounded-[10px] border bg-white flex items-center justify-center font-mono text-[22px] leading-5 font-medium text-ink transition-[border-color,box-shadow] duration-150',
              invalid && !v ? 'border-[#E0243A]' : active ? 'border-primary shadow-[0_0_0_3px_rgba(37,99,235,0.15)]' : 'border-[#D1D5DB]', busy && 'opacity-60')}>
              {v[i] ?? (active ? <span className="w-px h-5 bg-ink animate-pulse" /> : '')}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** "Resend in 42s" with a ring that runs down, then "Resend code". */
function Resend({ at, busy, onResend }: { at: number; busy: boolean; onResend: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [at]);
  const left = Math.max(0, Math.ceil((at - now) / 1000));
  return (
    <button type="button" disabled={!!left || busy} onClick={onResend} className="inline-flex items-center gap-2 text-sm text-[#646A78] enabled:hover:text-ink enabled:hover:underline underline-offset-2 disabled:cursor-default">
      {busy ? <Spinner /> : left > 0 && (
        <svg className="size-4 -rotate-90" viewBox="0 0 20 20" aria-hidden>
          <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2" stroke="#E5E7EB" />
          <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2" stroke="#2563EB" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - left / RESEND_SECONDS} className="transition-[stroke-dashoffset] duration-1000 ease-linear" />
        </svg>
      )}
      {busy ? 'Sending…' : left ? `Resend in ${left}s` : 'Resend code'}
    </button>
  );
}

/** /invite: a new member activates their account. ?expired=1 shows the dead-link state. */
export function Invite() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const signIn = useAuth((s) => s.signIn);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const expired = sp.get('expired') === '1';
  const activate = async () => {
    setState('busy'); await wait(900); setState('done'); await wait(900);
    signIn({ email: 'priya.shah@durham.ac.uk', name: 'Priya Shah', tenantId: 'durham' });
    nav('/', { replace: true });
  };
  return (
    <AuthFrame>
      <Title title={expired ? 'This invite has expired' : 'You have been invited'} sub={expired ? 'Invites last 7 days. Ask whoever invited you to send a new one.' : 'Durham University’s housing workspace is ready. Activate your account to sign in and start setting it up.'} />
      {expired ? (
        <>
          <Note tone="red" title="Invite expired on 28 Oct 2026">Sent to priya.shah@durham.ac.uk</Note>
          <Link to="/login" className="mt-7 h-11 w-full rounded-[10px] bg-primary hover:bg-primary-hover text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(37,99,235,0.28)] text-base font-medium flex items-center justify-center gap-1.5">Go to sign in<ArrowRight size={16} /></Link>
        </>
      ) : (
        <>
          <dl className="border-b border-[#F3F4F6] text-sm">
            {([['Email', 'priya.shah@durham.ac.uk'], ['University', 'Durham University'], ['Role', 'Admin'], ['Expires', <>5 Nov 2026 <span className="font-normal text-[#9CA3AF]">· in 7 days</span></>]] as const).map(([k, v]) => (
              <div key={k} className="h-10 flex items-center border-t border-[#F3F4F6]"><dt className="w-28 shrink-0 text-[#646A78]">{k}</dt><dd className="min-w-0 truncate font-medium text-ink">{v}</dd></div>
            ))}
          </dl>
          <Button variant="primary" disabled={state !== 'idle'} onClick={activate} className={cx(bigBtn, 'mt-7')}>
            {state === 'busy' ? <><Spinner />Activating…</> : state === 'done' ? <><Check size={16} weight="bold" />Taking you in…</> : <>Activate account<ArrowRight size={16} /></>}
          </Button>
          <p className="mt-3.5 text-sm leading-5 text-[#646A78]">You’ll sign in with your Durham Microsoft account next. Not you? Ignore this and the invite expires on its own.</p>
        </>
      )}
    </AuthFrame>
  );
}

/** Covers the app while sign-out runs, then confirms it before the sign-in page loads (as UserMenu's SigningOut does). */
export function SigningOut({ name, done }: { name: string; done: boolean }) {
  const first = name.split(' ')[0];
  return (
    <div role="status" className="fixed inset-0 z-[100] bg-chrome flex items-center justify-center text-center p-6 animate-[fade_150ms_ease-out]">
      <div>
        {done
          ? <div className="mx-auto mb-4 size-16 rounded-full bg-[#E8F7EE] text-[#0B8A4C] flex items-center justify-center animate-[pop_240ms_cubic-bezier(.23,1,.32,1)]"><Check size={32} weight="bold" /></div>
          : <div className="mx-auto mb-4 size-16 rounded-full bg-[#EFF6FF] text-primary flex items-center justify-center"><CircleNotch size={32} className="animate-spin" /></div>}
        <p className="text-base font-semibold text-ink">{done ? 'You’re signed out' : 'Signing you out…'}</p>
        <p className="mt-1 text-sm text-[#646A78]">{done ? `See you soon, ${first}.` : `Hang on a second, ${first}.`}</p>
      </div>
    </div>
  );
}
