import { loadStripe } from "@stripe/stripe-js";

export const STRIPE_PK = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "";

let _inst = null;
let _loading = null;

// Returns a promise that resolves to a Stripe instance or null.
// Catches rejections so they never become unhandled — safe to call without .catch().
// If the previous attempt failed, the next call automatically retries.
export function requestStripe() {
  if (!STRIPE_PK) return Promise.resolve(null);
  if (_inst) return Promise.resolve(_inst);
  if (_loading) return _loading;

  _loading = loadStripe(STRIPE_PK).then(
    (inst) => { _loading = null; if (inst) _inst = inst; return inst; },
    ()     => { _loading = null; return null; }
  );

  return _loading;
}
