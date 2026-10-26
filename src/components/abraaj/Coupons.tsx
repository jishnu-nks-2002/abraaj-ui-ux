import { useState } from "react";
import { Check, Copy, Droplets, Ticket, X } from "lucide-react";
import { products } from "@/lib/abraaj-data";
import { formatPrice } from "@/lib/cart";
import { couponMatchesLine, couponMinLabel, couponUnitPrice, type Coupon } from "@/lib/coupons";

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
/* Cart: shows an already-applied coupon                               */
/* ------------------------------------------------------------------ */

/**
 * The "Have a discount code?" entry box was removed. This card now only appears
 * when a coupon has been applied (for example from the E-coupons screen), so the
 * customer can still see the saving and remove it.
 */
export function CartCoupon({
  appliedCode,
  discount,
  reason,
  onRemove,
}: {
  appliedCode: string | null;
  discount: number;
  reason: string | null;
  /** Kept optional so existing call sites that still pass them keep compiling. */
  onApply?: (c: Coupon) => void;
  onRemove: () => void;
  onBrowse?: () => void;
}) {
  if (!appliedCode) return null;

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