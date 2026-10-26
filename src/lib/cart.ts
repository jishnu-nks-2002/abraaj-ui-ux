import { DEFAULT_DURATION, GALLON_ID, durationById, plans, type Product } from "@/lib/abraaj-data";
import { evaluateCoupon, type Coupon, type CouponEvaluation } from "@/lib/coupons";

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

/** Digital lines (e-coupon booklets) are issued at checkout, not delivered. */
export function isDigital(l: Pick<CartLine, "product">) {
  return Boolean(l.product.digital);
}

/**
 * How many gallons in the cart can be paid with e-coupons: every one-time
 * 5 Gallon unit. (Subscription deliveries are billed per delivery instead.)
 */
export function couponEligibleUnits(lines: CartLine[]) {
  return lines.reduce((n, l) => (l.product.id === GALLON_ID && !isSubscription(l) ? n + l.qty : n), 0);
}

/** "Weekly · 1 year" for subscriptions, "One-time" otherwise. */
export function lineLabel(l: Pick<CartLine, "planId" | "durationId" | "product">) {
  if (isDigital(l)) return "Digital booklet";
  if (!l.planId) return "One-time";
  const plan = plans.find((p) => p.id === l.planId);
  return `${plan?.name ?? "Subscription"} · ${durationById(l.durationId).label}`;
}

/**
 * Prices the cart. `bookletCoupons` is how many e-coupons the customer wants to
 * use; each pays for one one-time 5 Gallon bottle (extra coupons are ignored).
 */
export function cartPricing(lines: CartLine[], coupon?: Coupon | null, bookletCoupons = 0) {
  const subtotal = round2(lines.reduce((n, l) => n + l.product.price * l.qty, 0));
  const itemsTotal = round2(lines.reduce((n, l) => n + lineTotal(l), 0));
  const saving = round2(subtotal - itemsTotal);
  // Booklets are digital: they don't count towards (or trigger) the delivery fee.
  const physical = round2(lines.filter((l) => !isDigital(l)).reduce((n, l) => n + l.product.price * l.qty, 0));
  const delivery = physical > FREE_DELIVERY_OVER || physical === 0 ? 0 : DELIVERY_FEE;

  // E-coupons from a booklet: each one covers a whole one-time 5 Gallon bottle.
  const gallonLine = lines.find((l) => l.product.id === GALLON_ID && !isSubscription(l));
  const couponsUsed = Math.max(0, Math.min(Math.floor(bookletCoupons), couponEligibleUnits(lines)));
  const bookletDiscount = gallonLine ? round2(couponsUsed * lineUnitPrice(gallonLine)) : 0;

  // Optional promo code, on what's left to pay. Booklets are already discounted,
  // so promo codes don't apply to them. `couponReason` explains why a picked
  // promo code isn't applying yet.
  const promoLines = lines
    .filter((l) => !isDigital(l))
    .map((l) => ({
      productId: l.product.id,
      category: l.product.category,
      isSub: isSubscription(l),
      amount: l === gallonLine ? round2(lineTotal(l) - bookletDiscount) : lineTotal(l),
    }))
    .filter((l) => l.amount > 0);
  const evaluation: CouponEvaluation | null = !coupon
    ? null
    : promoLines.length === 0 && lines.length > 0 && coupon.kind !== "delivery"
      ? {
          ok: false,
          discount: 0,
          reason: lines.some(isDigital)
            ? "Promo codes don't apply to booklets, which are already discounted."
            : "Your e-coupons already cover everything in the cart.",
        }
      : evaluateCoupon(coupon, promoLines, { delivery });
  const couponDiscount = evaluation?.ok ? evaluation.discount : 0;
  const couponReason = evaluation && !evaluation.ok ? evaluation.reason : null;

  // Gallons paid with e-coupons already earned their coins when the booklet was bought.
  const coins = lines.reduce((n, l) => n + l.qty * l.product.coins, 0) - couponsUsed * (gallonLine?.product.coins ?? 0);

  return {
    count: lines.reduce((n, l) => n + l.qty, 0),
    subtotal,
    saving,
    delivery,
    couponDiscount,
    couponReason,
    appliedCoupon: evaluation?.ok ? (coupon ?? null) : null,
    /** E-coupons actually applied, and the gallons' value they cover. */
    couponsUsed,
    bookletDiscount,
    total: round2(Math.max(0, itemsTotal + delivery - couponDiscount - bookletDiscount)),
    coins,
  };
}
