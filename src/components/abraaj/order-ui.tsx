import type { ReactNode } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { byId } from "@/lib/abraaj-data";

export function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-1 -ml-1 inline-flex items-center gap-1 rounded-full py-1 pr-2 text-f-xs font-semibold text-muted-foreground focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      <ChevronLeft className="h-4 w-4" /> {label}
    </button>
  );
}

export function SectionTitle({ children, Icon }: { children: ReactNode; Icon?: typeof Check }) {
  return (
    <h2 className="flex items-center gap-1.5 text-f-sm font-bold text-foreground">
      {Icon && <Icon className="h-4 w-4 shrink-0 text-brand" />}
      {children}
    </h2>
  );
}

/** Label / value pair used in summaries and detail cards. */
export function InfoRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={`min-w-0 text-right ${strong ? "font-bold text-brand" : "font-semibold text-foreground"}`}>
        {value}
      </dd>
    </div>
  );
}

export function SumRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="truncate text-muted-foreground">{label}</span>
      <span className={`shrink-0 font-semibold ${accent ? "text-aqua" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

type ChipTone = "brand" | "aqua" | "muted" | "done";

export function StatusChip({ children, tone = "brand" }: { children: ReactNode; tone?: ChipTone }) {
  const cls =
    tone === "done"
      ? "bg-brand text-primary-foreground"
      : tone === "aqua"
        ? "bg-aqua-soft text-brand"
        : tone === "muted"
          ? "bg-secondary text-muted-foreground"
          : "bg-brand-soft text-brand";
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-f-2xs font-bold whitespace-nowrap ${cls}`}>
      {children}
    </span>
  );
}

export function ProductThumb({ productId, name, size = "md" }: { productId: string; name: string; size?: "sm" | "md" }) {
  const img = byId(productId)?.image;
  const box = size === "sm" ? "h-11 w-11" : "h-14 w-14 xs:h-16 xs:w-16";
  return (
    <div className={`grid shrink-0 place-items-center rounded-xl bg-secondary/60 ${box}`}>
      {img && <img src={img} alt={name} className="max-h-[84%] w-auto object-contain" />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vertical tracking timeline                                           */
/* ------------------------------------------------------------------ */

export type TimelineStep = {
  key: string;
  label: string;
  detail?: string | undefined;
  state: "done" | "current" | "upcoming";
};

export function Timeline({ steps, label }: { steps: TimelineStep[]; label: string }) {
  return (
    <ol aria-label={label} className="relative">
      {steps.map((s, i) => {
        const last = i === steps.length - 1;
        return (
          <li
            key={s.key}
            className="relative flex gap-3 pb-4 last:pb-0"
            aria-current={s.state === "current" ? "step" : undefined}
          >
            {!last && (
              <span
                aria-hidden="true"
                className={`absolute top-6 bottom-0 left-[11px] w-0.5 rounded-full ${
                  s.state === "done" ? "bg-brand" : "bg-border"
                }`}
              />
            )}
            <span
              aria-hidden="true"
              className={`relative z-[1] grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${
                s.state === "done"
                  ? "border-brand bg-brand text-primary-foreground"
                  : s.state === "current"
                    ? "border-brand bg-background ring-4 ring-brand-soft"
                    : "border-border bg-background"
              }`}
            >
              {s.state === "done" && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              {s.state === "current" && <span className="h-2 w-2 rounded-full bg-brand" />}
            </span>
            <div className="min-w-0 pt-0.5">
              <p
                className={`text-f-sm leading-tight ${
                  s.state === "upcoming" ? "font-semibold text-muted-foreground" : "font-bold text-foreground"
                }`}
              >
                {s.label}
                <span className="sr-only">
                  {s.state === "done" ? " (completed)" : s.state === "current" ? " (current)" : " (upcoming)"}
                </span>
              </p>
              {s.detail && <p className="mt-0.5 text-f-2xs text-muted-foreground">{s.detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
