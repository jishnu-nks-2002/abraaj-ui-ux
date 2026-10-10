import { DEFAULT_DURATION, durationById, plans, type Product } from "@/lib/abraaj-data";
import { evaluateCoupon, type Coupon } from "@/lib/coupons";

/* ------------------------------------------------------------------ */
/* Mixed cart                                                          */
/* ------------------------------------------------------------------ */

/**
 * One line in the (single, mixed) cart.
 * - No `planId`  -> one-time purchase.
 * - With `planId` -> subscription: `planId` is the delivery frequency and
 *   `durationId` is how long the subscription runs.
 */
export type CartLine = {
  product: Product;
  qty: number;
  planId?: string | undefined;
  durationId?: string | undefined;
};

export const CURRENCY = "AED";
/** Subscription discount on the list price (matches the product sheet's "Subscribe" price). */
export const CART_SUB_OFF = 10;
export const FREE_DELIVERY_OVER = 50;
export const DELIVERY_FEE = 5;
/** One-time orders arrive within this many days. */
export const ONE_TIME_DELIVERY_DAYS = 1;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** "AED 12" for whole amounts, "AED 10.80" otherwise. */
export function formatPrice(n: number) {
  const r = round2(n);
  return `${CURRENCY} ${Number.isInteger(r) ? r.toLocaleString("en-US") : r.toFixed(2)}`;
}

export function isSubscription(l: Pick<CartLine, "planId">) {
  return Boolean(l.planId);
}

export function lineKey(l: Pick<CartLine, "planId" | "durationId"> & { product: { id: string } }) {
  return l.planId ? `${l.product.id}:${l.planId}:${l.durationId ?? DEFAULT_DURATION}` : `${l.product.id}:once`;
}

export function lineUnitPrice(l: Pick<CartLine, "planId" | "product">) {
  return isSubscription(l) ? round2(l.product.price * (1 - CART_SUB_OFF / 100)) : l.product.price;
}

export function lineTotal(l: CartLine) {
  return round2(lineUnitPrice(l) * l.qty);
}

/** "Weekly · 1 year" for subscriptions, "One-time" otherwise. */
export function lineLabel(l: Pick<CartLine, "planId" | "durationId">) {
  if (!l.planId) return "One-time";
  const plan = plans.find((p) => p.id === l.planId);
  return `${plan?.name ?? "Subscription"} · ${durationById(l.durationId).label}`;
}

export function cartPricing(lines: CartLine[], coupon?: Coupon | null) {
  const subtotal = round2(lines.reduce((n, l) => n + l.product.price * l.qty, 0));
  const itemsTotal = round2(lines.reduce((n, l) => n + lineTotal(l), 0));
  const saving = round2(subtotal - itemsTotal);
  const delivery = subtotal > FREE_DELIVERY_OVER || subtotal === 0 ? 0 : DELIVERY_FEE;

  // Optional e-coupon. `couponReason` explains why a picked coupon isn't applying yet.
  const evaluation = coupon
    ? evaluateCoupon(
        coupon,
        lines.map((l) => ({
          productId: l.product.id,
          category: l.product.category,
          isSub: isSubscription(l),
          amount: lineTotal(l),
        })),
        { delivery },
      )
    : null;
  const couponDiscount = evaluation?.ok ? evaluation.discount : 0;
  const couponReason = evaluation && !evaluation.ok ? evaluation.reason : null;

  return {
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotal,
    saving,
    delivery,
    couponDiscount,
    couponReason,
    appliedCoupon: evaluation?.ok ? (coupon ?? null) : null,
    total: round2(Math.max(0, itemsTotal + delivery - couponDiscount)),
    coins: lines.reduce((n, l) => n + l.qty * l.product.coins, 0),
  };
}
