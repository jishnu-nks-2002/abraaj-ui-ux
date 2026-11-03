import { useState } from "react";
import { ArrowRightLeft, Check, ChevronRight, Gift, History, ShoppingBag, Star, Wallet, type LucideIcon } from "lucide-react";
import { GALLON_ID, byId } from "@/lib/abraaj-data";
import { formatPrice } from "@/lib/cart";
import { formatDateTime } from "@/lib/dates";
import {
  MIN_REDEEM_POINTS,
  POINTS_PER_KWD,
  REDEEM_PRESETS,
  pointsToKwd,
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
};

/** One points row: icon, what happened, when, and the points. */
export function PointsEventRow({ event }: { event: PointsEvent }) {
  const Icon = EVENT_ICON[event.kind];
  const gained = event.points > 0;
  return (
    <div className="card-soft flex items-center gap-3 rounded-2xl p-3">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
          gained ? "bg-aqua-soft text-brand" : "bg-secondary text-muted-foreground"
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
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-f-sm font-extrabold ${gained ? "text-aqua" : "text-foreground"}`}>
          <span className="sr-only">{gained ? "Points earned: " : "Points redeemed: "}</span>
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
  onBack,
  onRedeem,
  onHistory,
  onWallet,
}: {
  /** Points that can be redeemed right now. */
  available: number;
  /** Points sitting in the cart, earned once the order is placed. */
  pending: number;
  events: PointsEvent[];
  onBack: () => void;
  /** Redeems points into the wallet. Returns an error message to show, or null when it worked. */
  onRedeem: (points: number) => string | null;
  onHistory: () => void;
  onWallet: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const points = text === "" ? 0 : Number(text);
  const canRedeemAny = available >= MIN_REDEEM_POINTS;
  const tooFew = text !== "" && points < MIN_REDEEM_POINTS;
  const tooMany = points > available;
  const valid = points >= MIN_REDEEM_POINTS && !tooMany;
  const hint = tooFew
    ? `Redeem at least ${MIN_REDEEM_POINTS} points.`
    : tooMany
      ? `You only have ${num(available)} points to redeem.`
      : null;

  const total = available + pending;
  const gallonPoints = byId(GALLON_ID)?.points ?? 0;
  const presets = REDEEM_PRESETS.filter((p) => p <= available);

  function submit() {
    if (!valid) return;
    const err = onRedeem(points);
    if (err) {
      setError(err);
      setDone(null);
    } else {
      setDone(`${num(points)} points redeemed. ${formatPrice(pointsToKwd(points))} added to your wallet.`);
      setError(null);
      setText("");
    }
  }

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
            <p className="text-f-xs font-semibold opacity-80">Worth {formatPrice(pointsToKwd(total))}</p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15">
            <Star className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
        <dl className="relative mt-4 grid grid-cols-2 gap-2 text-f-2xs">
          <div className="rounded-xl bg-white/15 px-3 py-2">
            <dt className="opacity-80">Ready to redeem</dt>
            <dd className="text-f-sm font-extrabold">{num(available)}</dd>
          </div>
          <div className="rounded-xl bg-white/15 px-3 py-2">
            <dt className="opacity-80">In your cart</dt>
            <dd className="text-f-sm font-extrabold">+{num(pending)}</dd>
          </div>
        </dl>
        {pending > 0 && (
          <p className="relative mt-2 text-f-2xs opacity-80">Cart points are added once you place the order.</p>
        )}
      </div>

      {/* Redeem */}
      <div className="card-soft mt-4 rounded-3xl p-3.5 xs:p-4">
        <SectionTitle Icon={ArrowRightLeft}>Redeem to wallet</SectionTitle>
        <p className="mt-1 text-f-xs text-muted-foreground">
          {num(POINTS_PER_KWD)} points = {formatPrice(1)}. Redeem {MIN_REDEEM_POINTS} points or more.
        </p>

        {!canRedeemAny ? (
          <p className="bg-secondary mt-3 rounded-xl px-3 py-2.5 text-f-xs font-semibold text-muted-foreground">
            You need {num(MIN_REDEEM_POINTS - available)} more points before you can redeem. Every order earns more.
          </p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Quick amounts">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={text === String(p)}
                  onClick={() => {
                    setText(String(p));
                    setError(null);
                    setDone(null);
                  }}
                  className={`rounded-full px-3.5 py-2 text-f-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                    text === String(p) ? "bg-brand text-primary-foreground" : "bg-secondary text-foreground"
                  }`}
                >
                  {num(p)}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={text === String(available)}
                onClick={() => {
                  setText(String(available));
                  setError(null);
                  setDone(null);
                }}
                className={`rounded-full px-3.5 py-2 text-f-xs font-bold transition-colors focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                  text === String(available) ? "bg-brand text-primary-foreground" : "bg-secondary text-foreground"
                }`}
              >
                All ({num(available)})
              </button>
            </div>

            <label htmlFor="redeem-points" className="mt-3 block text-f-xs font-semibold text-muted-foreground">
              Or enter points
            </label>
            <input
              id="redeem-points"
              value={text}
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              aria-invalid={hint ? true : undefined}
              aria-describedby="redeem-hint"
              onChange={(e) => {
                setText(e.target.value.replace(/\D/g, "").slice(0, 7).replace(/^0+(?=\d)/, ""));
                setError(null);
                setDone(null);
              }}
              /* 16px minimum stops iOS Safari zooming in on focus. */
              className="mt-1 h-12 w-full rounded-2xl bg-secondary px-4 text-base font-semibold text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-brand"
            />
            <p
              id="redeem-hint"
              className={`mt-1.5 text-f-2xs ${hint ? "font-semibold text-destructive" : "text-muted-foreground"}`}
            >
              {hint ?? (valid ? `You'll get ${formatPrice(pointsToKwd(points))} in your wallet.` : `Up to ${num(available)} points.`)}
            </p>

            {error && (
              <p role="alert" className="mt-3 text-f-xs font-semibold text-destructive">
                {error}
              </p>
            )}
            {done && (
              <div role="status" className="bg-aqua-soft mt-3 rounded-xl px-3 py-2.5">
                <p className="flex items-start gap-2 text-f-xs font-bold text-brand">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {done}
                </p>
                <button onClick={onWallet} className="mt-1.5 ml-6 text-f-xs font-bold text-brand underline-offset-2 hover:underline">
                  See my wallet
                </button>
              </div>
            )}

            <button
              onClick={submit}
              disabled={!valid}
              className="mt-4 w-full rounded-2xl bg-brand py-4 text-f-sm font-bold text-primary-foreground transition-opacity disabled:opacity-50"
            >
              {valid ? `Redeem ${num(points)} points` : "Redeem points"}
            </button>
          </>
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
            ["Redeem to your wallet", `${num(POINTS_PER_KWD)} points = ${formatPrice(1)}, from ${MIN_REDEEM_POINTS} points.`],
            ["Wallet money is yours", "Redeemed points are added to your wallet balance straight away."],
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

      {/* Wallet shortcut */}
      <button
        onClick={onWallet}
        className="card-soft mt-3 flex w-full items-center gap-3 rounded-3xl p-3.5 text-left focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none xs:p-4"
      >
        <span className="bg-aqua-soft grid h-11 w-11 shrink-0 place-items-center rounded-full">
          <Wallet className="h-5 w-5 text-brand" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 text-f-sm font-bold text-foreground">Open my wallet</span>
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

type PointsFilter = "all" | "earned" | "redeemed";

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
  const redeemed = events.filter((e) => e.points < 0);
  const earnedTotal = earned.reduce((n, e) => n + e.points, 0);
  const redeemedTotal = redeemed.reduce((n, e) => n - e.points, 0);
  const shown = filter === "all" ? events : filter === "earned" ? earned : redeemed;

  return (
    <section className="animate-rise">
      <BackLink label="Points" onClick={onBack} />
      <h1 className="mt-2 text-f-xl font-extrabold tracking-tight text-foreground">Points history</h1>
      <p className="mt-1 text-f-xs text-muted-foreground">
        Ready to redeem <span className="font-bold text-brand">{num(available)} points</span>
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <StatCard label="Total earned" value={`${num(earnedTotal)} points`} />
        <StatCard label="Total redeemed" value={`${num(redeemedTotal)} points`} tone="muted" />
      </div>

      <FilterChips<PointsFilter>
        label="Filter points history"
        value={filter}
        onChange={setFilter}
        options={[
          { id: "all", label: "All", count: events.length },
          { id: "earned", label: "Earned", count: earned.length },
          { id: "redeemed", label: "Redeemed", count: redeemed.length },
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
            Icon={filter === "earned" ? Star : Wallet}
            title={filter === "earned" ? "No points earned yet" : "Nothing redeemed yet"}
            text={
              filter === "earned"
                ? "Points from your orders will be listed here."
                : "Points you turn into wallet money will be listed here."
            }
          />
        )
      ) : (
        <DayGroups items={shown} row={(e) => <PointsEventRow event={e} />} />
      )}
    </section>
  );
}
