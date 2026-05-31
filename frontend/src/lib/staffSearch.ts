import { useSyncExternalStore } from 'react';

// Bridges the header search bar (in StaffLayout) to the Schedule page so it can
// jump to a booking's day and open its detail, without prop-drilling.
type Target = { id: string; date: string } | null;
let target: Target = null;
const subs = new Set<() => void>();

export const getLocate = (): Target => target;
export function requestLocate(t: { id: string; date: string }) {
  target = t;
  subs.forEach((f) => f());
}
export function consumeLocate() {
  target = null;
  subs.forEach((f) => f());
}
function subscribe(cb: () => void) { subs.add(cb); return () => { subs.delete(cb); }; }
export function useLocateTarget(): Target {
  return useSyncExternalStore(subscribe, getLocate, getLocate);
}
