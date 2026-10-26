import { GALLON_ID, bookletProducts, byId, type Product } from "@/lib/abraaj-data";
import { DAY, addMonths, daysUntil, endOfDay } from "@/lib/dates";
import { hasStorage, read, write } from "@/lib/storage";

/* ================================================================== */
/* E-coupon booklets                                                   */
/* ================================================================== */
/*
 * A booklet is bought like any other product (it's a line in the normal cart
 * and goes through the normal checkout). When the order is placed, the orders
 * service asks this service to issue the booklet: `coupons` unique e-coupons,
 * each worth one 5 Gallon bottle. Paying for gallons with e-coupons happens in
 * the same checkout: the order redeems the chosen coupons so they can't be used
 * again.
 *
 * Like `ordersApi`, everything persists in localStorage behind `bookletsApi`, so
 * swapping the bodies for fetch() calls to a backend won't touch any UI. On a
 * real server, `redeem` must run in the same transaction as order creation.
 */

export type BookletCouponStatus = "AVAILABLE" | "REDEEMED" | "EXPIRED";

export type BookletCoupon = {
  /** Unique, human-friendly redemption code, e.g. "AB7K-3Q9P". */
  code: string;
  bookletId: string;
  /** Position in the booklet, 1-based. */
  number: number;
  /** Product the coupon pays for. */
  productId: string;
  status: BookletCouponStatus;
  /** Set when redeemed. */
  redeemedAt?: string;
  orderId?: string;
};

export type Booklet = {
  /** Serial number printed on the cover, e.g. "BK-52001". */
  id: string;
  productId: string;
  label: string;
  couponCount: number;
  /** What the customer paid for the whole booklet. */
  pricePaid: number;
  /** Order that bought it (absent for gift / migrated booklets). */
  orderId?: string;
  holder: string;
  purchasedAt: string;
  expiresAt: string;
  coupons: BookletCoupon[];
};

export const COUPON_STATUS_LABEL: Record<BookletCouponStatus, string> = {
  AVAILABLE: "Available",
  REDEEMED: "Redeemed",
  EXPIRED: "Expired",
};

/** Booklets expiring within this many days are flagged. */
export const EXPIRING_SOON_DAYS = 14;

export class BookletError extends Error {
  override name = "BookletError";
}

/* ------------------------------------------------------------------ */
/* Rules                                                               */
/* ------------------------------------------------------------------ */

/** Coupon status right now: unused coupons expire with their booklet. */
export function couponStatus(c: BookletCoupon, booklet: Pick<Booklet, "expiresAt">, now = new Date()): BookletCouponStatus {
  if (c.status === "REDEEMED") return "REDEEMED";
  return now.getTime() > new Date(booklet.expiresAt).getTime() ? "EXPIRED" : "AVAILABLE";
}

/** Brings stored statuses up to date (expiry), like `syncOrder` does for tracking. */
export function syncBooklet(b: Booklet, now = new Date()): Booklet {
  let changed = false;
  const coupons = b.coupons.map((c) => {
    const status = couponStatus(c, b, now);
    if (status === c.status) return c;
    changed = true;
    return { ...c, status };
  });
  return changed ? { ...b, coupons } : b;
}

export type BookletStats = { total: number; available: number; redeemed: number; expired: number };

export function bookletStats(list: Booklet | Booklet[]): BookletStats {
  const coupons = (Array.isArray(list) ? list : [list]).flatMap((b) => b.coupons);
  return {
    total: coupons.length,
    available: coupons.filter((c) => c.status === "AVAILABLE").length,
    redeemed: coupons.filter((c) => c.status === "REDEEMED").length,
    expired: coupons.filter((c) => c.status === "EXPIRED").length,
  };
}

export function bookletIsExpired(b: Booklet, now = new Date()) {
  return now.getTime() > new Date(b.expiresAt).getTime();
}

/** Days left before an active booklet expires (null once it has expired). */
export function bookletDaysLeft(b: Booklet, now = new Date()) {
  return bookletIsExpired(b, now) ? null : Math.max(0, daysUntil(b.expiresAt, now));
}

export function bookletProduct(b: Pick<Booklet, "productId">): Product | undefined {
  return bookletProducts.find((p) => p.id === b.productId);
}

/** Price the customer effectively paid per gallon with this booklet. */
export function pricePerCoupon(p: Product) {
  return p.booklet ? Math.round((p.price / p.booklet.coupons) * 100) / 100 : p.price;
}

/** How much a booklet saves against buying every gallon at list price. */
export function bookletSaving(p: Product) {
  const gallon = byId(p.booklet?.redeemsFor ?? GALLON_ID);
  return p.booklet && gallon ? Math.round((gallon.price * p.booklet.coupons - p.price) * 100) / 100 : 0;
}

/** Every coupon that can be used right now, soonest-expiring first. */
export function availableCoupons(booklets: Booklet[], now = new Date()) {
  return booklets
    .filter((b) => !bookletIsExpired(b, now))
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt) || a.id.localeCompare(b.id))
    .flatMap((b) => b.coupons.filter((c) => couponStatus(c, b, now) === "AVAILABLE"));
}

/** Next `count` coupons to use, skipping ones already picked. */
export function pickCoupons(booklets: Booklet[], count: number, exclude: string[] = [], now = new Date()) {
  const skip = new Set(exclude);
  return availableCoupons(booklets, now)
    .filter((c) => !skip.has(c.code))
    .slice(0, Math.max(0, count))
    .map((c) => c.code);
}

export function findCoupon(booklets: Booklet[], code: string) {
  for (const b of booklets) {
    const c = b.coupons.find((x) => x.code === code);
    if (c) return { booklet: b, coupon: c };
  }
  return null;
}

/** The booklet that will run out first, for "expires soon" messaging. */
export function nextExpiringBooklet(booklets: Booklet[], now = new Date()) {
  return booklets
    .filter((b) => !bookletIsExpired(b, now) && b.coupons.some((c) => c.status === "AVAILABLE"))
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))[0];
}

/* ------------------------------------------------------------------ */
/* Codes                                                               */
/* ------------------------------------------------------------------ */

// No 0/O, 1/I/L so codes can be read out over the phone.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomChars(n: number) {
  const out: string[] = [];
  const bytes = new Uint8Array(n);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
  for (const b of bytes) out.push(ALPHABET[b % ALPHABET.length]!);
  return out.join("");
}

/** A code that doesn't clash with any code in `taken` (which it then joins). */
function uniqueCode(taken: Set<string>) {
  for (;;) {
    const raw = randomChars(8);
    const code = `${raw.slice(0, 4)}-${raw.slice(4)}`;
    if (!taken.has(code)) {
      taken.add(code);
      return code;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Creation                                                            */
/* ------------------------------------------------------------------ */

function buildBooklet(
  product: Product,
  serial: string,
  taken: Set<string>,
  opts: { holder: string; purchasedAt: Date; orderId?: string | undefined; pricePaid?: number },
): Booklet {
  const spec = product.booklet!;
  return {
    id: serial,
    productId: product.id,
    label: spec.label,
    couponCount: spec.coupons,
    pricePaid: opts.pricePaid ?? product.price,
    ...(opts.orderId ? { orderId: opts.orderId } : {}),
    holder: opts.holder,
    purchasedAt: opts.purchasedAt.toISOString(),
    expiresAt: endOfDay(addMonths(opts.purchasedAt, spec.validityMonths)).toISOString(),
    coupons: Array.from({ length: spec.coupons }, (_, i) => ({
      code: uniqueCode(taken),
      bookletId: serial,
      number: i + 1,
      productId: spec.redeemsFor,
      status: "AVAILABLE" as const,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Service                                                             */
/* ------------------------------------------------------------------ */

const BOOKLETS_KEY = "abraaj.booklets.v1";
const SERIAL_KEY = "abraaj.bookletSerial.v1";
const FIRST_SERIAL = 52001;

/**
 * Seeds two example booklets the first time the app runs (an active Family
 * booklet part-used, and an old Starter booklet that has expired), so the
 * booklet shows every coupon status. Set to false to start with none.
 */
const SEED_DEMO_BOOKLETS = true;

function nextSerial() {
  const n = read<number>(SERIAL_KEY) ?? FIRST_SERIAL;
  write(SERIAL_KEY, n + 1);
  return `BK-${n}`;
}

function demoBooklets(now: Date): Booklet[] {
  const taken = new Set<string>();
  const family = bookletProducts.find((p) => p.id === "bk20")!;
  const starter = bookletProducts.find((p) => p.id === "bk10")!;

  const old = buildBooklet(starter, nextSerial(), taken, {
    holder: "Ahmed H.",
    purchasedAt: new Date(now.getTime() - 205 * DAY),
    orderId: "ORD-9821",
  });
  // 7 used over its life; the last 3 expired unused.
  old.coupons.slice(0, 7).forEach((c, i) => {
    Object.assign(c, { status: "REDEEMED", redeemedAt: new Date(now.getTime() - (196 - i * 24) * DAY).toISOString(), orderId: `ORD-98${34 + i * 3}` });
  });

  const active = buildBooklet(family, nextSerial(), taken, {
    holder: "Ahmed H.",
    purchasedAt: new Date(now.getTime() - 38 * DAY),
    orderId: "ORD-9987",
  });
  active.coupons.slice(0, 5).forEach((c, i) => {
    Object.assign(c, { status: "REDEEMED", redeemedAt: new Date(now.getTime() - (33 - i * 6) * DAY).toISOString(), orderId: `ORD-99${90 + i * 2}` });
  });
  return [active, old].map((b) => syncBooklet(b, now));
}

function loadAll(): Booklet[] {
  let list = read<Booklet[]>(BOOKLETS_KEY);
  if (!list) {
    list = SEED_DEMO_BOOKLETS && hasStorage() ? demoBooklets(new Date()) : [];
    write(BOOKLETS_KEY, list);
  }
  return list;
}

export const bookletsApi = {
  /** All booklets, newest first, with expired coupons marked. */
  list(now = new Date()): Booklet[] {
    const synced = loadAll().map((b) => syncBooklet(b, now));
    write(BOOKLETS_KEY, synced);
    return [...synced].sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
  },

  get(id: string, now = new Date()) {
    return this.list(now).find((b) => b.id === id);
  },

  /**
   * Throws a BookletError if any of the codes can't be redeemed (unknown, already
   * redeemed, expired, or listed twice). Called before an order is written.
   */
  assertRedeemable(codes: string[], now = new Date()) {
    if (new Set(codes).size !== codes.length) throw new BookletError("The same e-coupon was picked twice.");
    const all = this.list(now);
    for (const code of codes) {
      const hit = findCoupon(all, code);
      if (!hit) throw new BookletError(`E-coupon ${code} wasn't found.`);
      const status = couponStatus(hit.coupon, hit.booklet, now);
      if (status === "REDEEMED") throw new BookletError(`E-coupon ${code} has already been used. Pick another coupon.`);
      if (status === "EXPIRED") throw new BookletError(`E-coupon ${code} has expired. Pick another coupon.`);
    }
  },

  /** Marks coupons as redeemed against an order. They can never be used again. */
  redeem(codes: string[], orderId: string, now = new Date()) {
    if (codes.length === 0) return;
    this.assertRedeemable(codes, now);
    const wanted = new Set(codes);
    const at = now.toISOString();
    const next = loadAll().map((b) => ({
      ...b,
      coupons: b.coupons.map((c) => (wanted.has(c.code) ? { ...c, status: "REDEEMED" as const, redeemedAt: at, orderId } : c)),
    }));
    write(BOOKLETS_KEY, next);
  },

  /** Issues `qty` booklets of `productId` for a placed order. Returns their serials. */
  issue(input: { productId: string; qty: number; orderId: string; holder: string; pricePaid: number }, now = new Date()) {
    const product = bookletProducts.find((p) => p.id === input.productId);
    if (!product?.booklet) throw new BookletError(`${input.productId} is not a booklet.`);
    const existing = loadAll();
    const taken = new Set(existing.flatMap((b) => b.coupons.map((c) => c.code)));
    const fresh = Array.from({ length: input.qty }, () =>
      buildBooklet(product, nextSerial(), taken, {
        holder: input.holder,
        purchasedAt: now,
        orderId: input.orderId,
        pricePaid: input.pricePaid,
      }),
    );
    write(BOOKLETS_KEY, [...fresh, ...existing]);
    return fresh.map((b) => b.id);
  },
};

/** Coupons paid for by an order, grouped for display ("2 × 5 Gallon"). */
export function couponsForOrder(booklets: Booklet[], orderId: string) {
  return booklets.flatMap((b) => b.coupons.filter((c) => c.orderId === orderId));
}
