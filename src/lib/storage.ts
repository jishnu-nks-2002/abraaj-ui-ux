/*
 * Tiny localStorage wrapper used by the client-side services (orders, e-coupon
 * booklets). Swap the service bodies for fetch() calls when a backend exists.
 */

export const hasStorage = () => typeof window !== "undefined" && !!window.localStorage;

export function read<T>(key: string): T | null {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function write(key: string, value: unknown) {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode) — the order still exists in memory.
  }
}
