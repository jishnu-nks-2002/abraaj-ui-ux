import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { dayHeading } from "@/lib/wallet";

/* ------------------------------------------------------------------ */
/* Shared pieces for the Wallet and Points history screens             */
/* ------------------------------------------------------------------ */

/** Pill filter row (All / Added / Used ...). */
export function FilterChips<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string; count?: number }[];
  onChange: (id: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="no-scrollbar mx-screen-neg px-screen mt-4 flex gap-2 overflow-x-auto">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`shrink-0 rounded-full px-3.5 py-2 text-f-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none xs:px-4 ${
            value === o.id ? "bg-brand text-primary-foreground" : "bg-secondary text-muted-foreground"
          }`}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 opacity-70">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Splits a newest-first list into "Today" / "Yesterday" / "27 Oct 2026" groups. */
export function groupByDay<T extends { createdAt: string | null }>(items: T[], now = new Date()) {
  const groups: { heading: string; items: T[] }[] = [];
  for (const item of items) {
    const heading = item.createdAt ? (dayHeading(item.createdAt, now) ?? formatDate(item.createdAt)) : "Earlier";
    const last = groups[groups.length - 1];
    if (last && last.heading === heading) last.items.push(item);
    else groups.push({ heading, items: [item] });
  }
  return groups;
}

/** A list of rows under day headings. */
export function DayGroups<T extends { id: string; createdAt: string | null }>({
  items,
  row,
}: {
  items: T[];
  row: (item: T) => ReactNode;
}) {
  return (
    <div className="mt-4 space-y-5">
      {groupByDay(items).map((g) => (
        <section key={g.heading} aria-label={g.heading}>
          <h2 className="mb-2 text-f-2xs font-bold tracking-wide text-muted-foreground uppercase">{g.heading}</h2>
          <ul className="space-y-2">
            {g.items.map((item) => (
              <li key={item.id}>{row(item)}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Small tinted stat card ("Added" / "Used", "Earned" / "Redeemed"). */
export function StatCard({ label, value, tone = "aqua" }: { label: string; value: string; tone?: "aqua" | "muted" }) {
  return (
    <div className={`${tone === "aqua" ? "bg-aqua-soft" : "bg-secondary"} min-w-0 rounded-2xl px-3.5 py-3`}>
      <p className="text-f-2xs text-muted-foreground">{label}</p>
      <p className="truncate text-f-sm font-extrabold text-brand">{value}</p>
    </div>
  );
}

/** Centered empty state with an icon. */
export function EmptyState({ Icon, title, text }: { Icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="pt-10 text-center">
      <div className="bg-aqua-soft mx-auto grid h-16 w-16 place-items-center rounded-full">
        <Icon className="h-7 w-7 text-brand" />
      </div>
      <h2 className="mt-3 text-f-base font-bold text-foreground">{title}</h2>
      <p className="mx-auto mt-1 max-w-[17rem] text-f-sm text-muted-foreground">{text}</p>
    </div>
  );
}
