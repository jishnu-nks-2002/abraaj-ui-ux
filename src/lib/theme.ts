import { useSyncExternalStore } from "react";

/*
 * Light / dark / system theme.
 *  - "system" follows the device setting and updates live when it changes.
 *  - The choice is saved in localStorage; an inline script in __root.tsx applies it
 *    before first paint so there is no light flash on dark devices.
 */

export type ThemePref = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_KEY = "abraaj.theme";

/** Same logic as the inline script in __root.tsx (keep the two in sync). */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_KEY}");var d=p==="dark"||((p!=="light")&&window.matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

const listeners = new Set<() => void>();
let pref: ThemePref = "system";
let loaded = false;

function readPref(): ThemePref {
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function systemDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(p: ThemePref): ResolvedTheme {
  return p === "dark" || (p === "system" && systemDark()) ? "dark" : "light";
}

function apply() {
  const dark = resolveTheme(pref) === "dark";
  const el = document.documentElement;
  el.classList.toggle("dark", dark);
  el.style.colorScheme = dark ? "dark" : "light";
}

function emit() {
  listeners.forEach((l) => l());
}

function init() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  pref = readPref();
  apply();
  // Follow the device while "system" is selected.
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (pref === "system") {
      apply();
      emit();
    }
  });
}

export function setThemePref(next: ThemePref) {
  init();
  pref = next;
  try {
    window.localStorage.setItem(THEME_KEY, next);
  } catch {
    /* storage blocked — the choice still applies for this visit */
  }
  apply();
  emit();
}

function subscribe(cb: () => void) {
  init();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Current preference ("light" | "dark" | "system") and the theme actually showing. */
export function useTheme() {
  const current = useSyncExternalStore(
    subscribe,
    () => pref,
    () => "system" as ThemePref,
  );
  return { pref: current, resolved: resolveTheme(current), setPref: setThemePref };
}
