import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
      <p className="font-heading text-6xl font-semibold text-sage">404</p>
      <p className="text-text">We couldn’t find that page.</p>
      <Link to="/" className="btn-primary">Back home</Link>
    </div>
  );
}
