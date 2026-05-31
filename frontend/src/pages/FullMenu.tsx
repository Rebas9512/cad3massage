import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CATEGORY_ORDER, type ServiceDTO } from '@cad3/shared';
import { api } from '../lib/api';
import { usd } from '../lib/format';

export function FullMenu() {
  const { data: services = [], isLoading, isError, refetch } = useQuery({ queryKey: ['services'], queryFn: api.services });
  const byCat = (cat: string) => services.filter((s) => s.category === cat);
  const cats = CATEGORY_ORDER.filter((c) => byCat(c).length > 0);

  return (
    <>
      <section className="container-x py-12 text-center md:py-16">
        <p className="eyebrow">Services &amp; Pricing</p>
        <h1 className="mt-3 text-4xl font-semibold md:text-5xl">The full menu</h1>
        <p className="mx-auto mt-4 max-w-xl leading-relaxed text-text">
          Chair, foot, combo, and full-body massage — every session tailored to your time and your body.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
          {['By appointment only', 'Pay in person', 'Prices in USD'].map((t) => (
            <span key={t} className="rounded-pill border border-line bg-surface px-4 py-1.5 font-medium text-text">{t}</span>
          ))}
        </div>
      </section>

      <section className="container-x max-w-3xl pb-16">
        {isLoading && <p className="py-8 text-center text-muted">Loading the menu…</p>}
        {isError && (
          <div className="mb-8 rounded-md bg-[#FBEAE7] px-4 py-3 text-center text-sm text-[#A23A2E]">
            We couldn’t load the menu right now. <button onClick={() => refetch()} className="font-semibold underline">Try again</button>.
          </div>
        )}
        {cats.map((cat) => (
          <div key={cat} className="mb-12">
            <div className="flex items-center gap-3 pb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-pill bg-[#E7EEE7] font-heading text-sage-deep">
                {cat[0]}
              </span>
              <h2 className="text-2xl font-semibold">{cat} Massage</h2>
            </div>
            <div className="h-px bg-line" />
            {byCat(cat).map((s) => (
              <Row key={s.id} s={s} />
            ))}
          </div>
        ))}

        <div className="rounded-lg bg-gradient-to-br from-[#7A9C80] to-sage-deep p-10 text-center">
          <h3 className="text-2xl font-semibold text-white">Have a service in mind?</h3>
          <p className="mx-auto mt-2 max-w-sm text-on-dark">Pick your time and book online in under two minutes.</p>
          <Link to="/book" className="btn mt-5 bg-white px-7 py-3 text-forest hover:bg-bg">Book a Session →</Link>
        </div>
      </section>
    </>
  );
}

function Row({ s }: { s: ServiceDTO }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="code-chip">{s.code}</span>
          <span className="font-heading text-base font-semibold text-ink">{s.description || s.category}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span className="text-sm text-muted">{s.durationMinutes} min</span>
        <span className="font-heading text-lg font-semibold text-sage-deep">{usd(s.priceCents)}</span>
      </div>
    </div>
  );
}
