// One SPA bundle serves both the customer site (www / apex) and the staff console
// (staff.cad3massage.com). The staff console lives at the ROOT of the staff
// subdomain in production, but under /staff in dev and on the customer domain.
// These helpers keep every internal link correct regardless of which host serves.
export const onStaffHost =
  typeof location !== 'undefined' && location.hostname.startsWith('staff.');

/** Path for a staff route. `staffPath('/hours')` → '/hours' on staff host, '/staff/hours' otherwise. */
export const staffPath = (p = '') => (onStaffHost ? p || '/' : `/staff${p}`);

export const CUSTOMER_ORIGIN = 'https://www.cad3massage.com';
export const STAFF_ORIGIN = 'https://staff.cad3massage.com';
