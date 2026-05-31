import { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { SiteLayout } from './components/SiteLayout';
import { Home } from './pages/Home';
import { FullMenu } from './pages/FullMenu';
import { ManageLookup } from './pages/manage/ManageLookup';
import { ManageDetails } from './pages/manage/ManageDetails';
import { BookingFlow } from './pages/booking/BookingFlow';
import { StaffLogin } from './pages/staff/StaffLogin';
import { StaffLayout } from './pages/staff/StaffLayout';
import { Schedule } from './pages/staff/Schedule';
import { WorkingHoursPage } from './pages/staff/WorkingHoursPage';
import { TimeOffPage } from './pages/staff/TimeOffPage';
import { NotFound } from './pages/NotFound';
import { onStaffHost, staffPath, STAFF_ORIGIN } from './lib/host';

// React Router doesn't scroll to #hash anchors — do it ourselves (and scroll to
// top on plain route changes). Sections offset via `scroll-mt-*` for the sticky header.
function ScrollManager() {
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      const go = () => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return !!el;
      };
      if (!go()) {
        const t = setTimeout(go, 80); // wait for the target page to mount
        return () => clearTimeout(t);
      }
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [hash, pathname]);
  return null;
}

// Full-page redirect to another origin (customer ⇆ staff subdomain in prod).
function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => { window.location.replace(to); }, [to]);
  return null;
}

// Staff console routes. Paths come from staffPath(): rooted at '/' on the staff
// subdomain, under '/staff' on the customer domain / in dev — so this same tree
// works on both hosts.
const staffRoutes = (
  <>
    <Route path={staffPath('/login')} element={<StaffLogin />} />
    <Route element={<StaffLayout />}>
      <Route path={staffPath('')} element={<Schedule />} />
      <Route path={staffPath('/hours')} element={<WorkingHoursPage />} />
      <Route path={staffPath('/time-off')} element={<TimeOffPage />} />
    </Route>
  </>
);

export function App() {
  return (
    <>
      <ScrollManager />
      {onStaffHost ? (
        // staff.cad3massage.com → staff console only.
        <Routes>
          {staffRoutes}
          <Route path="*" element={<Navigate to={staffPath('')} replace />} />
        </Routes>
      ) : (
        // www / apex (and local dev) → customer site.
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<FullMenu />} />
            <Route path="/manage" element={<ManageLookup />} />
            <Route path="/manage/booking" element={<ManageDetails />} />
          </Route>

          <Route path="/book/*" element={<BookingFlow />} />

          {/* Dev: serve the staff console under /staff too. Prod: send /staff to the
              dedicated subdomain so there's one canonical staff URL. */}
          {import.meta.env.DEV ? (
            staffRoutes
          ) : (
            <Route path="/staff/*" element={<ExternalRedirect to={`${STAFF_ORIGIN}/`} />} />
          )}

          <Route path="*" element={<NotFound />} />
        </Routes>
      )}
    </>
  );
}
