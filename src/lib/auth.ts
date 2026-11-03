import { hasStorage, read, write } from "@/lib/storage";

/* ================================================================== */
/* Session service: log out and delete account                          */
/* ================================================================== */
/*
 * The app has no sign-in backend yet, so the session is a single flag in
 * localStorage. Screens only talk to `authApi`, so when a real backend exists
 * only the bodies below change:
 *   - signOut()       -> POST /auth/logout   (revoke the session / token)
 *   - deleteAccount() -> DELETE /account     (server removes the customer's data)
 */

export type SessionStatus = "in" | "out" | "deleted";

const SESSION_KEY = "abraaj.session.v1";
/** Everything this app stores in the browser starts with this prefix. */
const APP_PREFIX = "abraaj.";

export const authApi = {
  status(): SessionStatus {
    return read<SessionStatus>(SESSION_KEY) ?? "in";
  },

  /** Ends the session. The customer's orders, wallet and points are kept for their next login. */
  signOut() {
    write(SESSION_KEY, "out" satisfies SessionStatus);
  },

  /** Starts a session again (mock: there is no password step yet). */
  signIn() {
    write(SESSION_KEY, "in" satisfies SessionStatus);
  },

  /**
   * Permanently deletes the account: orders, subscriptions, e-coupon booklets,
   * wallet, points and saved preferences. This cannot be undone.
   */
  deleteAccount() {
    if (hasStorage()) {
      try {
        const keys: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith(APP_PREFIX)) keys.push(k);
        }
        keys.forEach((k) => window.localStorage.removeItem(k));
      } catch {
        // Storage blocked: there is nothing stored to delete.
      }
    }
    write(SESSION_KEY, "deleted" satisfies SessionStatus);
  },
};
