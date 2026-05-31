import { Link } from 'react-router-dom';

export function Logo({ dark = false, size = 34 }: { dark?: boolean; size?: number }) {
  return (
    <Link
      to="/"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="inline-flex items-center gap-2.5"
    >
      <img src="/images/logo-mark.png" width={size} height={size} alt="" className="object-contain" />
      <span className={`font-heading font-semibold text-[1.15rem] ${dark ? 'text-on-dark' : 'text-ink'}`}>
        CAD3 Massage
      </span>
    </Link>
  );
}
