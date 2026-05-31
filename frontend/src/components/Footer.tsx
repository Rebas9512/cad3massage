import { Link } from 'react-router-dom';
import { STORE } from '@cad3/shared';

const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STORE.addressLine)}`;

export function Footer() {
  return (
    <footer className="bg-forest text-on-dark-muted">
      <div className="container-wide grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            <img src="/images/logo-mark.png" width={40} height={40} alt="" />
            <span className="font-heading text-xl font-semibold text-on-dark">CAD3 Massage</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed">
            Personalized chair, foot, and full-body massage in the heart of Plano, Texas.
          </p>
        </div>
        <FootCol title="Explore" items={[
          { label: 'Services', to: '/menu' },
          { label: 'Book a Session', to: '/book' },
          { label: 'Manage booking', to: '/manage' },
        ]} />
        <div>
          <h4 className="eyebrow text-soft">Visit</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>6505 W Park Blvd, Plano</li>
            <li>Mon–Fri · 10 AM–10 PM</li>
            <li>Sat 11–10 · Sun 12–8</li>
          </ul>
        </div>
        <div>
          <h4 className="eyebrow text-soft">Contact</h4>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><a href={`tel:${STORE.phoneTel}`} className="hover:text-on-dark">{STORE.phone}</a></li>
            <li>Booking online 24/7</li>
            <li><a href={mapsUrl} target="_blank" rel="noreferrer" className="hover:text-on-dark">Get directions</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#3D4E43]">
        <div className="container-wide flex flex-col items-center justify-between gap-3 py-5 text-sm sm:flex-row">
          <span>© 2026 CAD3 Massage · Plano, TX</span>
          <span className="flex gap-6"><span>Privacy</span><span>Terms</span></span>
        </div>
      </div>
    </footer>
  );
}

function FootCol({ title, items }: { title: string; items: { label: string; to: string }[] }) {
  return (
    <div>
      <h4 className="eyebrow text-soft">{title}</h4>
      <ul className="mt-4 space-y-2.5 text-sm">
        {items.map((i) => (
          <li key={i.label}>
            <Link to={i.to} className="hover:text-on-dark">{i.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
