/* ------------------------------------------------------------------ */
/* Digital e-coupons                                                   */
/* ------------------------------------------------------------------ */
/*
 * Pure data + rules. This file deliberately doesn't import from cart.ts (cart.ts
 * imports from here), so the cart hands over a plain list of `CouponLine`s.
 */

export type CouponKind = "percent" | "flat" | "delivery";

export type Coupon = {
  id: string;
  code: string;
  kind: CouponKind;
  /** Percent (0-100) for "percent", AED for "flat", ignored for "delivery". */
  value: number;
  /** Largest discount a percentage coupon can give, in AED. */
  maxOff?: number;
  /** Minimum amount of eligible items in the cart, in AED. */
  minSpend: number;
  title: string;
  description: string;
  /** Short big label shown on the ticket stub, e.g. "10%" / "AED 5" / "FREE". */
  stub: string;
  stubSub: string;
  /** Who it applies to. Omit a field = no restriction on that axis. */
  scope: {
    categories?: string[];
    productIds?: string[];
    purchase?: "once" | "sub";
    label: string;
  };
  /** Human-readable expiry, e.g. "31 Dec 2026". */
  validUntil: string;
  /** ISO date used for the real expiry check when a code is redeemed. */
  expiresAt: string;
  tag?: string;
};

/**
 * Promo coupons removed: the only coupon product now is the single
 * 20-gallon e-coupon booklet (handled in lib/booklets).
 */
export const coupons: Coupon[] = [];

export const couponByCode = (code: string) =>
  coupons.find((c) => c.code.toLowerCase() === code.trim().toLowerCase());

/** One cart line, flattened to what coupon rules need. `amount` is what the customer pays for it. */
export type CouponLine = {
  productId: string;
  category: string;
  isSub: boolean;
  amount: number;
};

export type CouponEvaluation =
  | { ok: true; discount: number }
  | { ok: false; discount: 0; reason: string };

const round2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) => `AED ${Number.isInteger(round2(n)) ? round2(n) : round2(n).toFixed(2)}`;

export function couponMatchesLine(c: Coupon, l: CouponLine) {
  const s = c.scope;
  if (s.categories && !s.categories.includes(l.category)) return false;
  if (s.productIds && !s.productIds.includes(l.productId)) return false;
  if (s.purchase === "once" && l.isSub) return false;
  if (s.purchase === "sub" && !l.isSub) return false;
  return true;
}

/** Works out the discount for a cart, or says why the coupon can't be used yet. */
export function evaluateCoupon(
  c: Coupon,
  lines: CouponLine[],
  ctx: { delivery: number },
  now: Date = new Date(),
): CouponEvaluation {
  if (now.getTime() > new Date(c.expiresAt).getTime()) {
    return { ok: false, discount: 0, reason: "This coupon has expired." };
  }
  if (lines.length === 0) {
    return { ok: false, discount: 0, reason: "Add items to your cart to use this coupon." };
  }

  if (c.kind === "delivery") {
    if (ctx.delivery <= 0) return { ok: false, discount: 0, reason: "Delivery is already free on this order." };
    return { ok: true, discount: round2(ctx.delivery) };
  }

  const eligible = round2(lines.filter((l) => couponMatchesLine(c, l)).reduce((n, l) => n + l.amount, 0));
  if (eligible === 0) {
    return { ok: false, discount: 0, reason: `This coupon is for ${c.scope.label.toLowerCase()}.` };
  }
  if (eligible < c.minSpend) {
    return {
      ok: false,
      discount: 0,
      reason: `Add ${money(c.minSpend - eligible)} more${
        c.scope.label === "All products" ? "" : ` of ${c.scope.label.toLowerCase()}`
      } to use this.`,
    };
  }

  let off = c.kind === "percent" ? eligible * (c.value / 100) : c.value;
  if (c.maxOff !== undefined) off = Math.min(off, c.maxOff);
  return { ok: true, discount: round2(Math.min(off, eligible)) };
}

/** Price of one unit of a product after a coupon, for the "applicable prices" display. */
export function couponUnitPrice(c: Coupon, price: number) {
  if (c.kind === "percent") return round2(price * (1 - c.value / 100));
  if (c.kind === "flat") return round2(Math.max(0, price - c.value));
  return price;
}

export function couponMinLabel(c: Coupon) {
  return c.kind === "delivery" ? "No minimum spend" : `Min. spend ${money(c.minSpend)}`;
}