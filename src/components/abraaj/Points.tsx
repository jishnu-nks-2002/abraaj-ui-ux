import { useState } from "react";
import { CalendarClock, ChevronRight, Gift, History, Hourglass, ShoppingBag, Star, Wallet, type LucideIcon } from "lucide-react";
import { GALLON_ID, byId } from "@/lib/abraaj-data";
import { daysUntil, formatDate, formatDateTime } from "@/lib/dates";
import {
  POINTS_EXPIRING_SOON_DAYS,
  POINTS_VALID_MONTHS,
  type PointsBatch,
  type PointsEvent,
} from "@/lib/wallet";
import { BackLink, SectionTitle } from "@/components/abraaj/order-ui";
import { DayGroups, EmptyState, FilterChips, StatCard } from "@/components/abraaj/ledger-ui";

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const num = (n: number) => n.toLocaleString("en-US");

const EVENT_ICON: Record<PointsEvent["kind"], LucideIcon> = {
  EARN: Star,
  REDEEM: Wallet,
  BROUGHT_FORWARD: Gift,
  EXPIRE: Hourglass,
};

/** "in 12 days", "tomorrow", "today" */
function dueIn(iso: string, now = new Date()) {
  const d = daysUntil(iso, now);
  if (d <= 0) return "today";
  if (d === 1) return "tomorrow";
  return `in ${d} days`;
}

/** One points row: icon, what happened, when, and the points. */
export function PointsEventRow({ event }: { event: PointsEvent }) {
  const Icon = EVENT_ICON[event.kind];
  const gained = event.points > 0;
  const expired = event.kind === "EXPIRE";
  return (
    <div className="card-soft flex items-center gap-3 rounded-2xl p-3">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
          gained ? "bg-aqua-soft text-brand" : expired ? "bg-destructive/10 text-destructive" : "bg-secondary text-muted-foreground"
        }`}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-f-sm font-bold text-foreground">{event.title}</p>
        <p className="truncate text-f-2xs text-muted-foreground">
          {event.detail}
          {event.createdAt ? ` · ${formatDateTime(event.createdAt)}` : ""}
        </p>
        {gained && event.expiresAt && (
          <p className="truncate text-f-2xs font-semibold text-brand">
            {new Date(event.expiresAt).getTime() <= Date.now() ? "Expired" : "Expires"} {formatDate(event.expiresAt)}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-f-sm font-extrabold ${gained ? "text-aqua" : expired ? "text-destructive" : "text-foreground"}`}>
          <span className="sr-only">{gained ? "Points earned: " : expired ? "Points expired: " : "Points redeemed: "}</span>
          {gained ? "+" : "−"}
          {num(Math.abs(event.points))}
        </p>
        <p className="text-f-2xs text-muted-foreground">points</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Points page                                                          */
/* ------------------------------------------------------------------ */

export function PointsScreen({
  available,
  pending,
  events,
  batches,
  onBack,
  onHistory,
  onShop,
}: {
  /** Points the customer has now (earned and not expired). */
  available: number;
  /** Points sitting in the cart, earned once the order is placed. */
  pending: number;
  events: PointsEvent[];
  /** Every lot of points with its expiry date (from `pointsBatches`). */
  batches: PointsBatch[];
  onBack: () => void;
  onHistory: () => void;
  onShop: () => void;
}) {
  const now = new Date();
  const total = available + pending;
  const gallonPoints = byId(GALLON_ID)?.points ?? 0;
  const upcoming = batches.filter((b) => !b.expired && b.remaining > 0);
  const next = upcoming[0];
  const nextSoon = next ? daysUntil(next.expiresAt, now) <= POINTS_EXPIRING_SOON_DAYS : false;
  const recent = events.slice(0, 3);

  return (
    <section className="animate-rise">
      <BackLink label="Account" onClick={onBack} />
      <h1 className="mt-2 text-f-xl font-extrabold tracking-tight text-foreground">Points</h1>

      {/* Balance */}
      <div className="relative mt-4 overflow-hidden rounded-3xl bg-brand p-4 text-primary-foreground xs:p-5">
        <span aria-hidden="true" className="bg-aqua/30 absolute -top-10 -right-8 h-36 w-36 rounded-full blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-f-xs font-semibold opacity-80">Your points</p>
            <p className="mt-1 truncate text-f-xl font-extrabold tracking-tight" aria-live="polite">
              {num(total)}
            </p>
            <p className="text-f-xs font-semibold opacity-80">Valid {POINTS_VALID_MONTHS} months from each order</p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15">
            <Star className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
        <dl className="relative mt-4 grid grid-cols-2 gap-2 text-f-2xs">
          <div className="rounded-xl bg-white/15 px-3 py-2">
            <dt className="opacity-80">Available</dt>
            <dd className="text-f-sm font-extrabold">{num(available)}</dd>
          </div>
          <div className="rounded-xl bg-white/15 px-3 py-2">
            <dt className="opacity-80">In your cart</dt>
            <dd className="text-f-sm font-extrabold">+{num(pending)}</dd>
          </div>
        </dl>
        {next && (
          <p className={`relative mt-3 flex items-center gap-1.5 rounded-xl px-3 py-2 text-f-2xs font-bold ${nextSoon ? "bg-white text-destructive" : "bg-white/15"}`}>
            <Hourglass className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {num(next.remaining)} points expire {formatDate(next.expiresAt)} ({dueIn(next.expiresAt, now)})
          </p>
        )}
        {pending > 0 && (
          <p className="relative mt-2 text-f-2xs opacity-80">Cart points are added once you place the order.</p>
        )}
      </div>

      {/* Expiry schedule */}
      <div className="card-soft mt-4 rounded-3xl p-3.5 xs:p-4">
        <SectionTitle Icon={CalendarClock}>Expiry dates</SectionTitle>
        <p className="mt-1 text-f-xs text-muted-foreground">
          Points from each order expire {POINTS_VALID_MONTHS} months after the order date.
        </p>
        {upcoming.length === 0 ? (
          <p className="mt-3 rounded-xl bg-secondary px-3 py-2.5 text-f-xs font-semibold text-muted-foreground">
            No points to expire. Every order earns more.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {upcoming.slice(0, 4).map((b) => {
              const soon = daysUntil(b.expiresAt, now) <= POINTS_EXPIRING_SOON_DAYS;
              return (
                <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-f-xs font-bold text-foreground">{b.title}</span>
                    <span className={`block text-f-2xs ${soon ? "font-bold text-destructive" : "text-muted-foreground"}`}>
                      Expires {formatDate(b.expiresAt)} · {dueIn(b.expiresAt, now)}
                    </span>
                  </span>
                  <span className="shrink-0 text-f-sm font-extrabold text-brand">{num(b.remaining)}</span>
                </li>
              );
            })}
          </ul>
        )}
        {upcoming.length > 4 && (
          <button onClick={onHistory} className="mt-1 text-f-xs font-bold text-brand underline-offset-2 hover:underline">
            See all {upcoming.length}
          </button>
        )}
      </div>

      {/* How it works */}
      <div className="card-soft mt-3 rounded-3xl p-3.5 xs:p-4">
        <SectionTitle Icon={ShoppingBag}>How points work</SectionTitle>
        <ol className="mt-3 space-y-3 text-f-xs">
          {[
            [
              "Order water",
              gallonPoints > 0
                ? `Every order earns points. A 5 Gallon refill earns ${num(gallonPoints)}.`
                : "Every order earns points.",
            ],
            ["Valid for " + POINTS_VALID_MONTHS + " months", "Points stay in your account for " + POINTS_VALID_MONTHS + " months from the order date."],
            ["Then they expire", "Unused points are removed on their expiry date. Check the dates above."],
          ].map(([title, text], i) => (
            <li key={title} className="flex items-start gap-3">
              <span className="bg-brand-soft grid h-6 w-6 shrink-0 place-items-center rounded-full text-f-2xs font-extrabold text-brand">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block font-bold text-foreground">{title}</span>
                <span className="block text-muted-foreground">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Shop shortcut */}
      <button
        onClick={onShop}
        className="card-soft mt-3 flex w-full items-center gap-3 rounded-3xl p-3.5 text-left focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none xs:p-4"
      >
        <span className="bg-aqua-soft grid h-11 w-11 shrink-0 place-items-center rounded-full">
          <ShoppingBag className="h-5 w-5 text-brand" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 text-f-sm font-bold text-foreground">Shop and earn more points</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>

      {/* Recent activity */}
      <div className="mt-6 flex items-center justify-between gap-2">
        <SectionTitle Icon={History}>Recent activity</SectionTitle>
        {events.length > 0 && (
          <button onClick={onHistory} className="text-f-xs font-bold text-brand underline-offset-2 hover:underline">
            View all
          </button>
        )}
      </div>
      {recent.length === 0 ? (
        <EmptyState Icon={Star} title="No points yet" text="Place an order to start earning points." />
      ) : (
        <ul className="mt-3 space-y-2">
          {recent.map((e) => (
            <li key={e.id}>
              <PointsEventRow event={e} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Points history page                                                  */
/* ------------------------------------------------------------------ */

type PointsFilter = "all" | "earned" | "expired";

export function PointsHistoryScreen({
  events,
  available,
  onBack,
  onShop,
}: {
  events: PointsEvent[];
  available: number;
  onBack: () => void;
  onShop: () => void;
}) {
  const [filter, setFilter] = useState<PointsFilter>("all");

  const earned = events.filter((e) => e.points > 0);
  // Anything that took points away: expiries (and wallet redemptions from older versions).
  const lost = events.filter((e) => e.points < 0);
  const earnedTotal = earned.reduce((n, e) => n + e.points, 0);
  const lostTotal = lost.reduce((n, e) => n - e.points, 0);
  const shown = filter === "all" ? events : filter === "earned" ? earned : lost;

  return (
    <section className="animate-rise">
      <BackLink label="Points" onClick={onBack} />
      <h1 className="mt-2 text-f-xl font-extrabold tracking-tight text-foreground">Points history</h1>
      <p className="mt-1 text-f-xs text-muted-foreground">
        Available now <span className="font-bold text-brand">{num(available)} points</span>
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <StatCard label="Total earned" value={`${num(earnedTotal)} points`} />
        <StatCard label="Total expired" value={`${num(lostTotal)} points`} tone="muted" />
      </div>

      <FilterChips<PointsFilter>
        label="Filter points history"
        value={filter}
        onChange={setFilter}
        options={[
          { id: "all", label: "All", count: events.length },
          { id: "earned", label: "Earned", count: earned.length },
          { id: "expired", label: "Expired", count: lost.length },
        ]}
      />

      {shown.length === 0 ? (
        events.length === 0 ? (
          <div>
            <EmptyState Icon={Star} title="No points yet" text="Place an order and the points you earn will be listed here." />
            <div className="text-center">
              <button onClick={onShop} className="mt-5 rounded-2xl bg-brand px-6 py-3 text-f-sm font-bold text-primary-foreground">
                Browse products
              </button>
            </div>
          </div>
        ) : (
          <EmptyState
            Icon={filter === "earned" ? Star : Hourglass}
            title={filter === "earned" ? "No points earned yet" : "No expired points"}
            text={
              filter === "earned"
                ? "Points from your orders will be listed here."
                : `Points expire ${POINTS_VALID_MONTHS} months after the order. Expired points will be listed here.`
            }
          />
        )
      ) : (
        <DayGroups items={shown} row={(e) => <PointsEventRow event={e} />} />
      )}
    </section>
  );
}
