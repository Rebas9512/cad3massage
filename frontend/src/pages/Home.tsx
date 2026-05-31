import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, HeartHandshake, Navigation, Moon, Check } from 'lucide-react';
import { STORE, type ServiceDTO } from '@cad3/shared';
import { api } from '../lib/api';
import { usd } from '../lib/format';
import { QuickInfo } from '../components/QuickInfo';

const HERO = '/images/generated-1780180438521.png';
const ABOUT = '/images/generated-1780180496349.png';

const CATEGORIES: { key: string; title: string; blurb: string }[] = [
  { key: 'Chair', title: 'Chair', blurb: 'Quick, seated relief for neck, shoulders, and back.' },
  { key: 'Foot', title: 'Foot', blurb: 'Reflexology-style pressure to reset tired feet.' },
  { key: 'Combo', title: 'Combo', blurb: 'Foot + body, balanced to your time.' },
  { key: 'Body', title: 'Body', blurb: 'Full-body work, gentle to firm — your call.' },
];

const HOURS = [
  ['Mon–Fri', '10:00 AM – 10:00 PM'],
  ['Saturday', '11:00 AM – 10:00 PM'],
  ['Sunday', '12:00 PM – 8:00 PM'],
];
const WHY_US = [
  { icon: CalendarCheck, title: 'Book in minutes', desc: "Choose your service and time online. No account, no phone tag — just pick a slot and you're set." },
  { icon: HeartHandshake, title: 'One therapist, every visit', desc: 'Consistent, personalized care from someone who remembers your body and your preferences.' },
  { icon: Navigation, title: 'Easy to reach in Plano', desc: 'Central W Park Blvd location with simple parking, tucked inside the IMAGE STUDIOS building.' },
  { icon: Moon, title: 'Open late, seven days', desc: 'Evenings and weekends included — book around your schedule, not the other way around.' },
];

const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(STORE.addressLine)}`;
// Keyless interactive Google Maps embed (no API key), centered on the studio with a marker.
const mapQuery = `${STORE.address.street}, ${STORE.address.city}, ${STORE.address.state} ${STORE.address.zip}`;
const mapEmbed = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&output=embed`;

export function Home() {
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: api.services });

  const fromPrice = (cat: string) => {
    const inCat = services.filter((s) => s.category === cat);
    return inCat.length ? Math.min(...inCat.map((s) => s.priceCents)) : 0;
  };

  return (
    <>
      {/* md+: hero + quick-info share the first screen (info bar flush at the bottom). Mobile is too tall
          for both stacked, so there the hero alone fills the screen and the info bar flows below it. */}
      <div className="flex flex-col lg:min-h-[calc(100dvh-4rem)]">
      {/* Hero */}
      <section className="container-wide flex h-[calc(100dvh-4rem)] flex-col overflow-hidden pt-10 pb-8 md:h-auto md:overflow-visible md:pt-14 md:pb-12 lg:min-h-0 lg:flex-1 lg:flex-row lg:items-center lg:pb-10">
        <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-10 md:flex-none lg:grid lg:min-h-0 lg:grid-cols-[1fr_minmax(0,520px)] lg:items-center lg:gap-16">
          <div>
            <p className="eyebrow">Massage Studio · Plano, TX</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] text-ink md:text-6xl">
              Unwind, restored — one focused session at a time.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-text">
              Personalized chair, foot, and full-body massage by Anna. No account, no deposit — just pick a time and come in.
            </p>
          </div>
          {/* Mobile: image flexes to fill the leftover height so the hero is exactly one screen on every
              device (object-cover crops). md+: fixed clamp height, original 2-col grid. */}
          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-line md:h-[clamp(360px,44vh,480px)] md:flex-none lg:h-[clamp(440px,60vh,580px)]">
            <img src={HERO} alt="Calm massage studio" className="h-full w-full object-cover object-center" />
          </div>
        </div>
      </section>

      {/* Quick info bar — full address + complete 7-day hours, flush at the bottom of the first screen */}
      <QuickInfo />
      </div>

      {/* Services */}
      <section className="container-wide py-16">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow">Services</p>
            <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Choose what suits you</h2>
          </div>
          <Link to="/menu" className="hidden text-sm font-semibold text-sage-deep hover:underline sm:block">
            View full menu →
          </Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => (
            <Link key={c.key} to="/menu" className="card group p-6 transition hover:border-sage">
              <div className="flex h-11 w-11 items-center justify-center rounded-pill bg-[#E7EEE7] font-heading text-sage-deep">
                {c.title[0]}
              </div>
              <h3 className="mt-4 text-xl font-semibold">{c.title} Massage</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.blurb}</p>
              {services.length > 0 && <p className="mt-4 text-sm font-semibold text-sage-deep">from {usd(fromPrice(c.key))}</p>}
            </Link>
          ))}
        </div>
        <Link to="/menu" className="mt-6 block text-sm font-semibold text-sage-deep hover:underline sm:hidden">
          View full menu →
        </Link>
      </section>

      {/* About — composition from the prototype: portrait image + copy, centered with whitespace */}
      <section id="about" className="scroll-mt-16 bg-bg">
        <div className="container-wide flex items-center py-16 lg:min-h-[calc(100dvh-4rem)]">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,520px)_1fr] lg:gap-20">
            <div className="overflow-hidden rounded-lg border border-line md:h-[clamp(380px,42vh,460px)] lg:h-[clamp(440px,60vh,580px)]">
              <img src={ABOUT} alt="Personalized massage therapy at CAD3" className="aspect-[13/14] w-full object-cover md:aspect-auto md:h-full" />
            </div>
            <div className="max-w-xl">
              <p className="eyebrow">About CAD3</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight md:text-[2.5rem]">Care that's personal, never rushed</h2>
              <p className="mt-5 leading-relaxed text-text">
                CAD3 Massage is a small, by-appointment studio in Plano where every session is given by one dedicated
                therapist. No conveyor belt, no upsells — just focused, skilled hands and the time to actually listen to
                what your body needs.
              </p>
              <p className="mt-4 leading-relaxed text-text">
                Because we work by appointment only, you're never waiting and never sharing your time. It's your hour,
                your pace, your kind of pressure.
              </p>
              <ul className="mt-6 space-y-3.5">
                {[
                  'One dedicated therapist, undivided attention',
                  'By appointment — no waiting, no crowds',
                  'Pressure and focus tailored to you each visit',
                ].map((p) => (
                  <li key={p} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-[#E7EEE7]">
                      <Check className="h-3.5 w-3.5 text-sage-deep" strokeWidth={2.5} />
                    </span>
                    <span className="font-medium text-ink">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Why us — copy from the prototype */}
      <section className="bg-forest text-on-dark">
        <div className="container-wide py-20 lg:py-24">
          <p className="font-body text-sm font-semibold uppercase tracking-[0.18em] text-soft">Why CAD3</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight text-on-dark md:text-5xl">
            A small studio that takes relief seriously
          </h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {WHY_US.map(({ icon: Icon, title, desc }) => (
              <div key={title}>
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#3B4D41]">
                  <Icon className="h-6 w-6 text-soft" strokeWidth={1.75} />
                </div>
                <h3 className="mt-5 font-heading text-xl font-semibold text-on-dark">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-on-dark-muted">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location & hours — fills one screen at lg+ (flex + min-h-0), natural below */}
      <section id="location" className="scroll-mt-16 bg-bg">
        <div className="container-wide flex flex-col py-12 lg:min-h-[calc(100dvh-4rem)]">
          <p className="eyebrow">Visit</p>
          <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Find us in Plano</h2>
          <div className="mt-8 grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[1.6fr_1fr]">
            {/* Map — live interactive embed, marker on the studio */}
            <div className="flex flex-col overflow-hidden rounded-lg border border-line lg:min-h-0">
              <iframe
                title="Map to CAD3 Massage in Plano"
                src={mapEmbed}
                className="block h-[clamp(320px,46vh,520px)] w-full border-0 lg:h-auto lg:min-h-0 lg:flex-1"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 bg-surface p-5">
                <div>
                  <p className="font-semibold text-ink">{STORE.name}</p>
                  <p className="text-sm text-muted">{STORE.addressLine}</p>
                </div>
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn-ghost shrink-0 text-sm">
                  View on Google Maps
                </a>
              </div>
            </div>
            {/* Right: hours + how to find */}
            <div className="flex flex-col gap-6 lg:min-h-0">
              <div className="card shrink-0 p-6">
                <h3 className="font-heading text-lg font-semibold">Hours</h3>
                <table className="mt-3 w-full text-sm">
                  <tbody>
                    {HOURS.map(([d, h]) => (
                      <tr key={d} className="border-b border-line last:border-0">
                        <td className="py-2.5 font-medium text-ink">{d}</td>
                        <td className="py-2.5 text-right text-muted">{h}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <a href={`tel:${STORE.phoneTel}`} className="mt-4 inline-block text-sm font-semibold text-sage-deep">
                  Call {STORE.phone}
                </a>
              </div>
              <div className="card flex items-center gap-5 p-6 lg:min-h-0 lg:flex-1">
                <img src="/images/BldFront.jpg" alt="IMAGE STUDIOS building" className="h-24 w-24 shrink-0 rounded-lg object-cover sm:h-28 sm:w-28" />
                <div>
                  <p className="eyebrow">How to find us</p>
                  <p className="mt-2 text-sm leading-relaxed text-text">
                    Inside <b className="text-ink">IMAGE STUDIOS</b> — enter the building and find <b className="text-ink">Studio 116</b>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-gradient-to-br from-[#7A9C80] to-sage-deep">
        <div className="container-wide flex flex-col items-center gap-5 py-16 text-center">
          <h2 className="max-w-xl text-3xl font-semibold text-white md:text-4xl">Ready when you are.</h2>
          <p className="max-w-md text-on-dark">Pick a time and book online in under two minutes.</p>
          <Link to="/book" className="btn bg-white px-8 py-3.5 text-forest hover:bg-bg">Book a Session →</Link>
        </div>
      </section>
    </>
  );
}

export type { ServiceDTO };
