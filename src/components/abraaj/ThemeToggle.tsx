import { useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePref } from "@/lib/theme";

const OPTIONS: { id: ThemePref; label: string; Icon: typeof Sun }[] = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
  { id: "system", label: "System default", Icon: Monitor },
];

/** Round icon button for the top bar. Opens a small menu: Light / Dark / System default. */
export function ThemeMenuButton() {
  const { pref, resolved, setPref } = useTheme();
  const [open, setOpen] = useState(false);
  const Icon = resolved === "dark" ? Moon : Sun;

  return (
    <div className="relative">
      <button
        aria-label="Change theme"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-brand xs:h-8 xs:w-8"
      >
        <Icon className="h-3.5 w-3.5" />
      </button>

      {open && (
        <>
          <button aria-label="Close theme menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
          <div
            role="menu"
            className="animate-dropdown absolute top-full right-0 z-50 mt-2 w-44 origin-top-right rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-[0_18px_40px_-16px_rgba(4,20,60,0.5)]"
          >
            {OPTIONS.map(({ id, label, Icon: OptIcon }) => (
              <button
                key={id}
                role="menuitemradio"
                aria-checked={pref === id}
                onClick={() => {
                  setPref(id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-f-sm font-semibold transition-colors ${
                  pref === id ? "bg-secondary text-brand" : "text-foreground hover:bg-secondary/60"
                }`}
              >
                <OptIcon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {pref === id && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Three-way selector for the hamburger menu. */
export function ThemeSegmented() {
  const { pref, setPref } = useTheme();
  return (
    <div className="border-b border-border/70 py-4">
      <p className="mb-2.5 text-f-xs font-bold text-muted-foreground">Appearance</p>
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-background p-1" role="radiogroup" aria-label="Theme">
        {OPTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="radio"
            aria-checked={pref === id}
            onClick={() => setPref(id)}
            className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-f-2xs font-semibold transition-colors ${
              pref === id ? "bg-brand text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="max-w-full truncate">{id === "system" ? "System" : label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
