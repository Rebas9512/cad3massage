import { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from './Logo';

type NavItem = { to: string; label: string } | { section: string; label: string };

const links: NavItem[] = [
  { to: '/menu', label: 'Services' },
  { section: 'about', label: 'About' },
  { section: 'location', label: 'Visit' },
  { to: '/manage', label: 'Manage booking' },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // In-page section jumps: always scroll (even if the hash is already set),
  // and hop to the home page first when on another route.
  const goToSection = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    if (pathname !== '/') {
      navigate(`/#${id}`); // ScrollManager scrolls once Home mounts
      return;
    }
    // The open mobile menu occupies layout space (the sticky header reserves its
    // flow height), so scrolling before it collapses overshoots by the menu's
    // height. Defer to the next frame so the menu is gone and layout has settled.
    requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };

  const renderLink = (l: NavItem, cls: string) =>
    'section' in l ? (
      <a key={l.label} href={`/#${l.section}`} onClick={goToSection(l.section)} className={cls}>
        {l.label}
      </a>
    ) : (
      <NavLink key={l.label} to={l.to} onClick={() => setOpen(false)} className={cls}>
        {l.label}
      </NavLink>
    );

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="container-wide flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => renderLink(l, 'font-body text-sm font-medium text-text hover:text-sage-deep'))}
          <Link to="/book" className="btn-primary text-sm">
            Book a Session
          </Link>
        </nav>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-md md:hidden"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-2xl leading-none text-ink">{open ? '×' : '☰'}</span>
        </button>
      </div>
      {open && (
        <nav className="border-t border-line bg-surface px-5 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => renderLink(l, 'rounded-md px-2 py-3 text-text'))}
            <Link to="/book" className="btn-primary mt-2" onClick={() => setOpen(false)}>
              Book a Session
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
