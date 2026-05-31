import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { STORE } from '@cad3/shared';
import { api } from '../../lib/api';
import { setToken } from '../../lib/auth';
import { staffPath } from '../../lib/host';
import { useT, useLang, setLang } from '../../lib/i18n';

// Centered, calm composition (prototype `gpTSp`): logo + card + footer.
export function StaffLogin() {
  const nav = useNavigate();
  const t = useT();
  const lang = useLang();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const r = await api.login(email.trim(), password);
    setBusy(false);
    if (r.status === 200 && r.data.accessToken) {
      setToken(r.data.accessToken);
      nav(staffPath(''));
    } else setErr(t('login.error'));
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center gap-8 bg-bg px-6 py-12">
      <div className="absolute right-5 top-5 flex overflow-hidden rounded-pill border border-line">
        {(['en', 'zh'] as const).map((l) => (
          <button key={l} onClick={() => setLang(l)} className={`px-3 py-1 text-xs font-semibold ${lang === l ? 'bg-sage text-white' : 'text-muted'}`}>
            {l === 'en' ? 'EN' : '中'}
          </button>
        ))}
      </div>
      <div className="flex flex-col items-center gap-3.5">
        <img src="/images/logo-mark.png" width={64} height={64} alt="" />
        <span className="font-heading text-2xl font-semibold text-ink">CAD3 Staff</span>
      </div>

      <form onSubmit={submit} className="w-full max-w-[420px] rounded-lg border border-line bg-surface p-9 shadow-[0_10px_34px_rgba(40,48,39,0.09)]">
        <div className="text-center">
          <h1 className="font-heading text-[1.75rem] font-semibold text-ink">{t('login.welcome')}</h1>
          <p className="mt-1.5 text-sm text-muted">{t('login.sub')}</p>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">{t('login.email')}</span>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-sm border border-line bg-bg px-4 py-3 text-sm outline-none focus:border-sage"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted">{t('login.password')}</span>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-sm border border-line bg-bg px-4 py-3 pr-11 text-sm outline-none focus:border-sage"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? t('login.hidepw') : t('login.showpw')}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-muted hover:text-ink"
              >
                {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>
          </label>
          {err && <p className="text-sm font-medium text-[#A23A2E]">{err}</p>}
          <button disabled={busy} className="btn-primary w-full disabled:opacity-60">{busy ? t('login.signingin') : t('login.signin')}</button>
        </div>
        <p className="mt-5 text-center text-xs leading-relaxed text-muted">{t('login.note')}</p>
      </form>

      <p className="text-sm font-medium text-muted">{STORE.address.city}, {STORE.address.state} · {t('login.tz')}</p>
    </div>
  );
}
