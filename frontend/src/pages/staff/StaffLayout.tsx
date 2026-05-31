import { useState } from 'react';
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LogOut, Menu, X, Search } from 'lucide-react';
import { STUDIO_TZ } from '@cad3/shared';
import { clearToken, getToken } from '../../lib/auth';
import { api } from '../../lib/api';
import { useT, useLang, setLang } from '../../lib/i18n';
import { requestLocate } from '../../lib/staffSearch';
import { staffPath } from '../../lib/host';

const nav = [
  { to: staffPath(''), key: 'nav.schedule', end: true },
  { to: staffPath('/hours'), key: 'nav.hours' },
  { to: staffPath('/time-off'), key: 'nav.timeoff' },
];

const ctDate = (d: string) => new Intl.DateTimeFormat('en-CA', { timeZone: STUDIO_TZ }).format(new Date(d));

function LangToggle() {
  const lang = useLang();
  return (
    <div className="flex shrink-0 overflow-hidden rounded-pill border border-[#3B4D41]">
      {(['en', 'zh'] as const).map((l) => (
        <button key={l} onClick={() => setLang(l)} className={`px-2.5 py-1 text-xs font-semibold ${lang === l ? 'bg-[#3B4D41] text-on-dark' : 'text-on-dark-muted'}`}>
          {l === 'en' ? 'EN' : '中'}
        </button>
      ))}
    </div>
  );
}

export function StaffLayout() {
  const navigate = useNavigate();
  const t = useT();
  const token = getToken();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [notFound, setNotFound] = useState(false);
  const { data: all = [] } = useQuery({ queryKey: ['staff-bookings'], queryFn: () => api.staffBookings(token!), enabled: !!token });

  if (!token) return <Navigate to={staffPath('/login')} replace />;
  const logout = () => { clearToken(); navigate(staffPath('/login')); };

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toUpperCase().replace(/\s/g, '');
    if (!q) return;
    const b = all.find((x) => x.confirmationCode.toUpperCase() === q || x.confirmationCode.toUpperCase().replace('CAD3-', '') === q);
    if (b) { requestLocate({ id: b.id, date: ctDate(b.startAt) }); navigate(staffPath('')); setQuery(''); setNotFound(false); }
    else setNotFound(true);
  };

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-30 bg-forest text-on-dark">
        <div className="relative mx-auto flex w-full max-w-5xl items-center gap-2 px-3 py-3 sm:gap-3 sm:px-6">
          {/* left: menu + brand */}
          <button onClick={() => setMenuOpen((o) => !o)} aria-label="Menu" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-on-dark hover:bg-[#3B4D41]">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <img src="/images/logo-mark.png" width={28} height={28} alt="" />
            <span className="hidden font-heading text-lg font-semibold text-on-dark md:inline">CAD3 Staff</span>
          </div>

          {/* center: search */}
          <form onSubmit={search} className="relative mx-auto w-full max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-dark-muted" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setNotFound(false); }}
              placeholder={t('sch.searchph')}
              className="w-full rounded-pill border border-[#3B4D41] bg-[#26342B] py-2 pl-9 pr-3 text-sm text-on-dark outline-none placeholder:text-on-dark-muted focus:border-soft"
            />
          </form>

          {/* right */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            <LangToggle />
            <img src="/images/therapist-anna.png" alt="" className="hidden h-8 w-8 rounded-pill object-cover sm:block" />
            <button onClick={logout} aria-label={t('nav.logout')} className="flex h-9 w-9 items-center justify-center text-on-dark-muted hover:text-on-dark">
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>

          {/* dropdown nav */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <nav className="absolute left-3 top-full z-40 mt-1 w-56 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-[0_10px_30px_rgba(40,48,39,0.2)] sm:left-6">
                {nav.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={n.end}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) => `block px-4 py-3 text-sm font-medium ${isActive ? 'bg-[#E7EEE7] text-sage-deep' : 'text-text hover:bg-bg'}`}
                  >
                    {t(n.key)}
                  </NavLink>
                ))}
              </nav>
            </>
          )}
        </div>
        {notFound && (
          <div className="mx-auto max-w-5xl px-4 pb-2 sm:px-6">
            <span className="text-xs font-medium text-[#F2C7BE]">{t('sch.notfound')}</span>
          </div>
        )}
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 min-h-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
