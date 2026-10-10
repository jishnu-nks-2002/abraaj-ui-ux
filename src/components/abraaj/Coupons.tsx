import { useState } from "react";
import { Check, ChevronRight, Copy, Droplets, Scissors, Ticket, X } from "lucide-react";
import { products } from "@/lib/abraaj-data";
import { formatPrice } from "@/lib/cart";
import {
  couponByCode,
  couponMatchesLine,
  couponMinLabel,
  couponUnitPrice,
  coupons,
  type Coupon,
} from "@/lib/coupons";
import { BackLink } from "@/components/abraaj/order-ui";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

/** Products a coupon applies to, with before/after prices. */
function applicableProducts(c: Coupon) {
  return products.filter((p) => couponMatchesLine(c, { productId: p.id, category: p.category, isSub: c.scope.purchase === "sub", amount: p.price }));
}

function CopyCode({ code, className = "" }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      /* clipboard can be blocked; the visual confirmation still helps */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }
  return (
    <button
      onClick={copy}
      aria-label={`Copy code ${code}`}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-dashed border-brand/40 bg-brand-soft px-2.5 py-1.5 text-f-xs font-extrabold tracking-wider text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${className}`}
    >
      {code}
      {copied ? <Check className="h-3.5 w-3.5 shrink-0" /> : <Copy className="h-3.5 w-3.5 shrink-0 opacity-70" />}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Ticket card                                                         */
/* ------------------------------------------------------------------ */

export function CouponTicket({
  coupon,
  applied,
  onApply,
  onRemove,
  detailed = false,
  compact = false,
}: {
  coupon: Coupon;
  applied: boolean;
  onApply: (c: Coupon) => void;
  onRemove: () => void;
  /** Show the "applicable prices" list (full coupons screen). */
  detailed?: boolean;
  /** Narrower card for the home carousel. */
  compact?: boolean;
}) {
  const items = detailed ? applicableProducts(coupon) : [];
  return (
    <article
      className={`card-soft relative flex overflow-hidden rounded-2xl ${compact ? "w-[17.5rem] shrink-0 snap-start" : "w-full"} ${
        applied ? "ring-2 ring-brand" : ""
      }`}
    >
      {/* Stub: discount value */}
      <div className="relative flex w-[5.25rem] shrink-0 flex-col items-center justify-center bg-gradient-to-br from-brand to-aqua px-2 py-4 text-center text-primary-foreground xs:w-24">
        <Droplets className="pointer-events-none absolute -bottom-3 -left-3 h-14 w-14 text-white/10" />
        <span className="text-f-lg leading-none font-extrabold">{coupon.stub}</span>
        <span className="mt-1 text-f-2xs font-bold tracking-widest opacity-90">{coupon.stubSub}</span>
      </div>

      {/* Tear line with ticket notches */}
      <div className="relative w-0 border-l-2 border-dashed border-border">
        <span className="absolute -top-2 -left-2.5 h-4 w-4 rounded-full border border-border bg-background" />
        <span className="absolute -bottom-2 -left-2.5 h-4 w-4 rounded-full border border-border bg-background" />
      </div>

      <div className="min-w-0 flex-1 p-3 xs:p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h4 className="min-w-0 text-f-sm leading-tight font-extrabold text-foreground">{coupon.title}</h4>
          {coupon.tag && (
            <span className="bg-aqua-soft shrink-0 rounded-full px-2 py-0.5 text-f-2xs font-bold text-brand">
              {coupon.tag}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-f-2xs text-muted-foreground">{coupon.description}</p>

        <p className="mt-1.5 text-f-2xs font-semibold text-foreground/80">
          {coupon.scope.label} · {couponMinLabel(coupon)}
        </p>

        {items.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Applicable prices">
            {coupon.kind === "delivery" ? (
              <li className="bg-secondary rounded-lg px-2 py-1 text-f-2xs font-semibold text-foreground">
                Delivery <s className="text-muted-foreground">AED 5</s> <b className="text-brand">Free</b>
              </li>
            ) : (
              items.map((p) => (
                <li key={p.id} className="bg-secondary rounded-lg px-2 py-1 text-f-2xs font-semibold text-foreground">
                  {p.name.replace("Abraaj ", "")}{" "}
                  <s className="text-muted-foreground">{formatPrice(p.price)}</s>{" "}
                  <b className="text-brand">{formatPrice(couponUnitPrice(coupon, p.price))}</b>
                </li>
              ))
            )}
          </ul>
        )}

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <CopyCode code={coupon.code} />
          {applied ? (
            <button
              onClick={onRemove}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-f-xs font-bold text-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
            >
              <Check className="h-3.5 w-3.5" /> Applied
            </button>
          ) : (
            <button
              onClick={() => onApply(coupon)}
              className="rounded-full bg-brand px-3.5 py-1.5 text-f-xs font-bold text-primary-foreground focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Apply
            </button>
          )}
        </div>
        <p className="mt-1.5 text-f-2xs text-muted-foreground">Valid till {coupon.validUntil}</p>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Home: e-coupon banner + swipeable tickets                           */
/* ------------------------------------------------------------------ */

export function CouponBanner({
  appliedCode,
  onApply,
  onRemove,
  onSeeAll,
}: {
  appliedCode: string | null;
  onApply: (c: Coupon) => void;
  onRemove: () => void;
  onSeeAll: () => void;
}) {
  const featured = coupons[0]!;
  return (
    <section className="mt-6" aria-label="E-coupons">
      <button
        onClick={onSeeAll}
        className="relative block w-full overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand to-aqua p-4 text-left text-primary-foreground shadow-[0_14px_30px_-18px_rgba(13,42,110,0.7)] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none xs:p-5"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_0%_0%,rgba(255,255,255,0.2),transparent_55%)]" />
        <Droplets className="pointer-events-none absolute -right-4 -bottom-5 h-28 w-28 text-white/10" />
        {/* Ticket notches echo the coupon cards below */}
        <span className="absolute top-1/2 -left-2.5 h-5 w-5 -translate-y-1/2 rounded-full bg-background" />
        <span className="absolute top-1/2 -right-2.5 h-5 w-5 -translate-y-1/2 rounded-full bg-background" />

        <div className="relative flex items-center gap-1.5 text-f-2xs font-extrabold tracking-widest uppercase opacity-90">
          <Ticket className="h-3.5 w-3.5" /> E-coupon
        </div>
        <p className="relative mt-1.5 text-f-xl font-extrabold tracking-tight">Save on every sip</p>
        <p className="relative mt-0.5 max-w-[16rem] text-f-xs opacity-90">
          Digital coupons for bottles, gallons, alkaline and subscriptions.
        </p>
        <div className="relative mt-3 flex items-center gap-2">
          <span className="rounded-lg border border-dashed border-white/60 bg-white/15 px-2.5 py-1.5 text-f-xs font-extrabold tracking-wider">
            {featured.code}
          </span>
          <span className="inline-flex items-center gap-0.5 text-f-xs font-bold">
            View all coupons <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      </button>

      <div className="mx-screen-neg px-screen no-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
        {coupons.map((c) => (
          <CouponTicket
            key={c.id}
            coupon={c}
            compact
            applied={appliedCode === c.code}
            onApply={onApply}
            onRemove={onRemove}
          />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Cart: apply a coupon by code or pick one                            */
/* ------------------------------------------------------------------ */

export function CartCoupon({
  appliedCode,
  discount,
  reason,
  onApply,
  onRemove,
  onBrowse,
}: {
  appliedCode: string | null;
  discount: number;
  reason: string | null;
  onApply: (c: Coupon) => void;
  onRemove: () => void;
  onBrowse: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const c = couponByCode(code);
    if (!c) {
      setError("That code isn't valid. Check it and try again.");
      return;
    }
    if (new Date().getTime() > new Date(c.expiresAt).getTime()) {
      setError("This coupon has expired.");
      return;
    }
    setError(null);
    setCode("");
    onApply(c);
  }

  if (appliedCode) {
    const working = discount > 0;
    return (
      <div className="card-soft mt-5 rounded-2xl p-3.5">
        <div className="flex items-center gap-3">
          <div className="bg-aqua-soft grid h-10 w-10 shrink-0 place-items-center rounded-full">
            <Ticket className="h-5 w-5 text-brand" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-f-sm font-extrabold text-foreground">{appliedCode}</p>
            <p className={`text-f-2xs font-semibold ${working ? "text-aqua" : "text-muted-foreground"}`}>
              {working ? `You save ${formatPrice(discount)}` : (reason ?? "Coupon added")}
            </p>
          </div>
          <button
            aria-label="Remove coupon"
            onClick={onRemove}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-soft mt-5 rounded-2xl p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-f-sm font-bold text-foreground">
          <Scissors className="h-4 w-4 text-brand" /> Have a coupon?
        </p>
        <button onClick={onBrowse} className="text-f-xs font-semibold text-brand">
          Browse coupons
        </button>
      </div>
      <div className="mt-2.5 flex gap-2">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Enter code"
          aria-label="Coupon code"
          autoCapitalize="characters"
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-f-sm font-semibold tracking-wider text-foreground placeholder:font-normal placeholder:tracking-normal focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
        />
        <button
          onClick={submit}
          disabled={!code.trim()}
          className="shrink-0 rounded-xl bg-brand px-4 text-f-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          Apply
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-f-2xs font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Full coupons screen                                                 */
/* ------------------------------------------------------------------ */

export function CouponsScreen({
  appliedCode,
  onApply,
  onRemove,
  onBack,
  onCart,
  onShop,
  cartCount,
}: {
  appliedCode: string | null;
  onApply: (c: Coupon) => void;
  onRemove: () => void;
  onBack: () => void;
  onCart: () => void;
  onShop: () => void;
  cartCount: number;
}) {
  const applied = appliedCode ? couponByCode(appliedCode) : undefined;
  return (
    <section className="animate-rise">
      <BackLink label="Back" onClick={onBack} />
      <h1 className="mt-2 text-f-xl font-extrabold tracking-tight text-foreground">E-coupons</h1>
      <p className="mt-0.5 text-f-sm text-muted-foreground">Tap Apply, then check out. One coupon per order.</p>

      <div className="relative mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-brand to-aqua p-4 text-primary-foreground xs:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_0%_0%,rgba(255,255,255,0.2),transparent_55%)]" />
        <Droplets className="pointer-events-none absolute -right-4 -bottom-5 h-28 w-28 text-white/10" />
        <div className="relative flex items-center gap-1.5 text-f-2xs font-extrabold tracking-widest uppercase opacity-90">
          <Ticket className="h-3.5 w-3.5" /> {applied ? "Coupon applied" : `${coupons.length} coupons available`}
        </div>
        <p className="relative mt-1.5 text-f-lg font-extrabold">
          {applied ? `${applied.code} · ${applied.title}` : "Pick a coupon and save"}
        </p>
        <div className="relative mt-3">
          <button
            onClick={applied && cartCount > 0 ? onCart : onShop}
            className="rounded-full bg-white px-4 py-2 text-f-xs font-extrabold text-brand"
          >
            {applied && cartCount > 0 ? "Go to cart" : "Shop now"}
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {coupons.map((c) => (
          <CouponTicket
            key={c.id}
            coupon={c}
            detailed
            applied={appliedCode === c.code}
            onApply={onApply}
            onRemove={onRemove}
          />
        ))}
      </div>
      <p className="mt-4 text-center text-f-2xs text-muted-foreground">
        Discounts are calculated on the price you pay and shown at checkout.
      </p>
    </section>
  );
}
