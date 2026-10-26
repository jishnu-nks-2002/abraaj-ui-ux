import { byId, durationById, PLAN_INTERVAL_DAYS, plans } from "@/lib/abraaj-data";
import {
  ONE_TIME_DELIVERY_DAYS,
  cartPricing,
  couponEligibleUnits,
  isDigital,
  lineUnitPrice,
  type CartLine,
} from "@/lib/cart";
import { GALLON_ID } from "@/lib/abraaj-data";
import { bookletsApi } from "@/lib/booklets";
import type { Coupon } from "@/lib/coupons";
import { HOUR, MIN, addDays, addMonths, atHour, startOfDay } from "@/lib/dates";
import { hasStorage, read, write } from "@/lib/storage";

// Date helpers moved to lib/dates.ts (shared with the booklet service); re-exported
// so existing imports from "@/lib/orders" keep working.
export { addDays, addMonths, dayAndDate, formatDate, formatDateTime, relativeDay, startOfDay } from "@/lib/dates";

/* ================================================================== */
/* Types                                                               */
/* ================================================================== */

export type PurchaseType = "ONE_TIME" | "SUBSCRIPTION";

export type DeliveryStatus =
  | "ORDER_PLACED"
  | "ORDER_CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED";

/** Timeline stages a subscription moves through. */
export type SubscriptionStage = "STARTED" | "ACTIVE" | "NEXT_DELIVERY" | "RENEWED" | "COMPLETED";
/** The subscription's current status. */
export type SubscriptionStatus = "STARTED" | "ACTIVE" | "COMPLETED";

export type OrderStatus =
  | "PLACED"
  | "IN_PROGRESS"
  | "PARTIALLY_DELIVERED"
  | "DELIVERED"
  | "ACTIVE"
  | "COMPLETED";

export type HistoryEntry<S extends string> = { status: S; at: string };

export type ItemDelivery = {
  status: DeliveryStatus;
  /** e.g. "Within 1 day" */
  window: string;
  expectedDate: string;
  statusHistory: HistoryEntry<DeliveryStatus>[];
};

export type ItemSubscription = {
  planId: string;
  /** "Weekly" */
  frequency: string;
  intervalDays: number;
  durationId: string;
  duration: number;
  unit: "MONTH" | "YEAR";
  startDate: string;
  endDate: string;
  status: SubscriptionStatus;
  firstDeliveryDate: string;
  nextDeliveryDate: string | null;
  totalDeliveries: number;
  deliveriesCompleted: number;
  statusHistory: HistoryEntry<SubscriptionStage>[];
};

export type OrderItem = {
  id: string;
  trackingNumber: string;
  product: { id: string; name: string; size: string; pack: string };
  purchaseType: PurchaseType;
  quantity: number;
  /** Per-unit price actually charged (per delivery for subscriptions). */
  unitPrice: number;
  listUnitPrice: number;
  price: number;
  delivery: ItemDelivery | null;
  subscription: ItemSubscription | null;
  /** Digital items (e-coupon booklets): issued instantly, no delivery. */
  digital?: { kind: "BOOKLET"; bookletIds: string[]; issuedAt: string };
  /** E-coupon codes that paid for some of this item's units (5 Gallon only). */
  paidWithCoupons?: string[];
};

export type Customer = { name: string; phone: string; email: string };
export type Address = { line: string; city: string; state: string; pincode: string };
export type PaymentMethod = "card" | "apple" | "cash";

export type Order = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  customer: Customer;
  address: Address;
  payment: PaymentMethod;
  items: OrderItem[];
  pricing: {
    subtotal: number;
    saving: number;
    delivery: number;
    total: number;
    /** E-coupon used on this order (absent on older orders). */
    couponCode?: string;
    couponDiscount?: number;
    /** Booklet e-coupons redeemed on this order, and the gallons' value they covered. */
    bookletCoupons?: string[];
    bookletDiscount?: number;
  };
  coinsEarned: number;
};

/* ================================================================== */
/* Labels                                                              */
/* ================================================================== */

export const DELIVERY_STEPS: DeliveryStatus[] = [
  "ORDER_PLACED",
  "ORDER_CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export const DELIVERY_LABEL: Record<DeliveryStatus, string> = {
  ORDER_PLACED: "Order placed",
  ORDER_CONFIRMED: "Order confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
};

export const SUBSCRIPTION_STEPS: SubscriptionStage[] = [
  "STARTED",
  "ACTIVE",
  "NEXT_DELIVERY",
  "RENEWED",
  "COMPLETED",
];

export const SUBSCRIPTION_STAGE_LABEL: Record<SubscriptionStage, string> = {
  STARTED: "Subscription started",
  ACTIVE: "Active",
  NEXT_DELIVERY: "Next delivery",
  RENEWED: "Renewed",
  COMPLETED: "Completed",
};

export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  STARTED: "Starting",
  ACTIVE: "Active",
  COMPLETED: "Completed",
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: "Placed",
  IN_PROGRESS: "In progress",
  PARTIALLY_DELIVERED: "Partly delivered",
  DELIVERED: "Delivered",
  ACTIVE: "Subscription active",
  COMPLETED: "Completed",
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  card: "Saved card",
  apple: "Apple Pay",
  cash: "Cash on delivery",
};

/** "One-time" or "1 year subscription". */
export function purchaseLabel(item: OrderItem) {
  if (item.digital) return "Digital booklet";
  if (!item.subscription) return "One-time";
  return `${durationById(item.subscription.durationId).label} subscription`;
}

/** Status of a single item, whatever its purchase type. */
export function itemStatusLabel(item: OrderItem) {
  if (item.digital) return "Issued";
  if (item.delivery) return DELIVERY_LABEL[item.delivery.status];
  if (item.subscription) return `Subscription ${SUBSCRIPTION_STATUS_LABEL[item.subscription.status].toLowerCase()}`;
  return "";
}

/** Whether an item has reached a settled, positive state (for colouring chips). */
export function itemIsSettled(item: OrderItem) {
  return Boolean(item.digital) || item.delivery?.status === "DELIVERED" || item.subscription?.status === "ACTIVE";
}

/* ================================================================== */
/* Dates                                                               */
/* ================================================================== */

/** Deliveries happen in a morning run and are complete by this hour. */
const DELIVERED_BY_HOUR = 13;
const OUT_FOR_DELIVERY_HOUR = 9;

/* ================================================================== */
/* Tracking engine                                                     */
/* ================================================================== */
/*
 * There's no fulfilment backend yet, so each item's status is derived from a
 * deterministic schedule anchored to when the order was placed. `syncOrder`
 * plays the role of the fulfilment service: every time orders are read it
 * advances each item and records the status history, exactly as webhook
 * updates from a courier/subscription system would. Replace the two
 * `*Schedule` functions with real events when a backend exists.
 */

function oneTimeSchedule(placedAt: Date, expected: Date): Record<DeliveryStatus, Date> {
  return {
    ORDER_PLACED: placedAt,
    ORDER_CONFIRMED: new Date(placedAt.getTime() + 2 * MIN),
    PROCESSING: new Date(placedAt.getTime() + 15 * MIN),
    SHIPPED: new Date(placedAt.getTime() + 3 * HOUR),
    OUT_FOR_DELIVERY: atHour(expected, OUT_FOR_DELIVERY_HOUR),
    DELIVERED: atHour(expected, DELIVERED_BY_HOUR),
  };
}

function subscriptionDeliveryDates(sub: Pick<ItemSubscription, "firstDeliveryDate" | "endDate" | "intervalDays">) {
  const dates: Date[] = [];
  const end = new Date(sub.endDate);
  for (let d = new Date(sub.firstDeliveryDate); d < end; d = addDays(d, sub.intervalDays)) dates.push(d);
  return dates;
}

function subscriptionSchedule(placedAt: Date, sub: ItemSubscription): Record<SubscriptionStage, Date | undefined> {
  const dates = subscriptionDeliveryDates(sub);
  return {
    STARTED: placedAt,
    ACTIVE: new Date(placedAt.getTime() + 2 * MIN),
    // Reached once the first scheduled delivery has been made.
    NEXT_DELIVERY: dates[0] ? atHour(dates[0], DELIVERED_BY_HOUR) : undefined,
    // The cycle renews with each delivery after the first.
    RENEWED: dates[1] ? atHour(dates[1], DELIVERED_BY_HOUR) : undefined,
    COMPLETED: new Date(sub.endDate),
  };
}

function syncItem(item: OrderItem, placedAt: Date, now: Date): OrderItem {
  if (item.delivery) {
    const sched = oneTimeSchedule(placedAt, new Date(item.delivery.expectedDate));
    const reached = DELIVERY_STEPS.filter((s) => sched[s] <= now);
    const history = reached.map((status) => ({ status, at: sched[status].toISOString() }));
    return {
      ...item,
      delivery: { ...item.delivery, status: reached[reached.length - 1] ?? "ORDER_PLACED", statusHistory: history },
    };
  }

  if (item.subscription) {
    const sub = item.subscription;
    const sched = subscriptionSchedule(placedAt, sub);
    const reached = SUBSCRIPTION_STEPS.filter((s) => sched[s] && sched[s]! <= now);
    const dates = subscriptionDeliveryDates(sub);
    const delivered = dates.filter((d) => atHour(d, DELIVERED_BY_HOUR) <= now);
    const next = dates.find((d) => atHour(d, DELIVERED_BY_HOUR) > now);
    const status: SubscriptionStatus = reached.includes("COMPLETED")
      ? "COMPLETED"
      : reached.includes("ACTIVE")
        ? "ACTIVE"
        : "STARTED";
    return {
      ...item,
      subscription: {
        ...sub,
        status,
        nextDeliveryDate: status === "COMPLETED" || !next ? null : next.toISOString(),
        totalDeliveries: dates.length,
        deliveriesCompleted: delivered.length,
        statusHistory: reached.map((s) => ({ status: s, at: sched[s]!.toISOString() })),
      },
    };
  }

  return item;
}

/** Overall status for list/summary display. Real tracking lives on each item. */
export function deriveOrderStatus(items: OrderItem[]): OrderStatus {
  const oneTimes = items.filter((i) => i.delivery);
  const subs = items.filter((i) => i.subscription);
  // Digital-only orders (just booklets) are complete the moment they're placed.
  if (oneTimes.length === 0 && subs.length === 0) return "DELIVERED";
  const allDelivered = oneTimes.every((i) => i.delivery!.status === "DELIVERED");
  const anyDelivered = oneTimes.some((i) => i.delivery!.status === "DELIVERED");
  const nothingMoved =
    oneTimes.every((i) => i.delivery!.status === "ORDER_PLACED") &&
    subs.every((i) => i.subscription!.status === "STARTED");

  if (nothingMoved) return "PLACED";
  if (!allDelivered) return anyDelivered ? "PARTIALLY_DELIVERED" : "IN_PROGRESS";
  if (subs.some((i) => i.subscription!.status !== "COMPLETED")) return "ACTIVE";
  return subs.length ? "COMPLETED" : "DELIVERED";
}

export function syncOrder(order: Order, now = new Date()): Order {
  const placedAt = new Date(order.createdAt);
  const items = order.items.map((i) => syncItem(i, placedAt, now));
  return { ...order, items, status: deriveOrderStatus(items) };
}

/* ================================================================== */
/* Order creation                                                      */
/* ================================================================== */

export type CheckoutInput = {
  lines: CartLine[];
  customer: Customer;
  address: Address;
  payment: PaymentMethod;
  coupon?: Coupon | null | undefined;
  /** Booklet e-coupon codes to redeem, one per one-time 5 Gallon bottle. */
  bookletCoupons?: string[] | undefined;
};

/** Expected delivery date for a one-time item placed at `placedAt`. */
export function oneTimeExpectedDate(placedAt = new Date()) {
  return startOfDay(addDays(placedAt, ONE_TIME_DELIVERY_DAYS));
}

/** Start / end / first-delivery dates for a subscription line placed at `placedAt`. */
export function subscriptionDates(line: Pick<CartLine, "planId" | "durationId">, placedAt = new Date()) {
  const duration = durationById(line.durationId);
  const start = startOfDay(placedAt);
  const months = duration.unit === "YEAR" ? duration.value * 12 : duration.value;
  return {
    start,
    end: addMonths(start, months),
    // First drop-off follows the same "within 1 day" promise as one-time items.
    firstDelivery: addDays(start, ONE_TIME_DELIVERY_DAYS),
    intervalDays: PLAN_INTERVAL_DAYS[line.planId ?? ""] ?? 30,
    duration,
  };
}

type ItemExtras = { bookletIds?: string[] | undefined; paidWithCoupons?: string[] | undefined };

function buildItem(line: CartLine, index: number, orderSeq: number, placedAt: Date, extras: ItemExtras = {}): OrderItem {
  const unitPrice = lineUnitPrice(line);
  const base = {
    id: `${orderSeq}-${index + 1}`,
    trackingNumber: `TRK${orderSeq}${String(index + 1).padStart(2, "0")}`,
    product: {
      id: line.product.id,
      name: line.product.name,
      size: line.product.size,
      pack: line.product.pack,
    },
    quantity: line.qty,
    unitPrice,
    listUnitPrice: line.product.price,
    price: Math.round(unitPrice * line.qty * 100) / 100,
  };

  if (isDigital(line)) {
    return {
      ...base,
      purchaseType: "ONE_TIME",
      delivery: null,
      subscription: null,
      digital: { kind: "BOOKLET", bookletIds: extras.bookletIds ?? [], issuedAt: placedAt.toISOString() },
    };
  }

  if (!line.planId) {
    return {
      ...base,
      ...(extras.paidWithCoupons?.length ? { paidWithCoupons: extras.paidWithCoupons } : {}),
      purchaseType: "ONE_TIME",
      delivery: {
        status: "ORDER_PLACED",
        window: `Within ${ONE_TIME_DELIVERY_DAYS} day`,
        expectedDate: oneTimeExpectedDate(placedAt).toISOString(),
        statusHistory: [{ status: "ORDER_PLACED", at: placedAt.toISOString() }],
      },
      subscription: null,
    };
  }

  const d = subscriptionDates(line, placedAt);
  const plan = plans.find((p) => p.id === line.planId);
  return {
    ...base,
    purchaseType: "SUBSCRIPTION",
    delivery: null,
    subscription: {
      planId: line.planId,
      frequency: plan?.name ?? line.planId,
      intervalDays: d.intervalDays,
      durationId: d.duration.id,
      duration: d.duration.value,
      unit: d.duration.unit,
      startDate: d.start.toISOString(),
      endDate: d.end.toISOString(),
      status: "STARTED",
      firstDeliveryDate: d.firstDelivery.toISOString(),
      nextDeliveryDate: d.firstDelivery.toISOString(),
      totalDeliveries: 0,
      deliveriesCompleted: 0,
      statusHistory: [{ status: "STARTED", at: placedAt.toISOString() }],
    },
  };
}

function buildOrder(input: CheckoutInput, seq: number, placedAt: Date, extras: ItemExtras[] = []): Order {
  const pricing = cartPricing(input.lines, input.coupon, input.bookletCoupons?.length ?? 0);
  const redeemed = (input.bookletCoupons ?? []).slice(0, pricing.couponsUsed);
  const order: Order = {
    id: `ORD-${seq}`,
    createdAt: placedAt.toISOString(),
    status: "PLACED",
    customer: { ...input.customer },
    address: { ...input.address },
    payment: input.payment,
    items: input.lines.map((l, i) => buildItem(l, i, seq, placedAt, extras[i])),
    pricing: {
      subtotal: pricing.subtotal,
      saving: pricing.saving,
      delivery: pricing.delivery,
      total: pricing.total,
      ...(pricing.appliedCoupon
        ? { couponCode: pricing.appliedCoupon.code, couponDiscount: pricing.couponDiscount }
        : {}),
      ...(redeemed.length ? { bookletCoupons: redeemed, bookletDiscount: pricing.bookletDiscount } : {}),
    },
    coinsEarned: pricing.coins,
  };
  return syncOrder(order, placedAt);
}

/* ================================================================== */
/* Orders service                                                      */
/* ================================================================== */
/*
 * The app has no server-side database yet — everything lives in client state —
 * so orders are persisted in localStorage behind this small service. Screens
 * only talk to `ordersApi`, so swapping these bodies for fetch() calls to a
 * real backend won't touch any UI.
 */

const ORDERS_KEY = "abraaj.orders.v1";
const SEQ_KEY = "abraaj.orderSeq.v1";
const PROFILE_KEY = "abraaj.checkoutProfile.v1";
const FIRST_ORDER_SEQ = 10001;

/**
 * Seeds one example order (placed yesterday: a delivered one-time item plus two
 * running subscriptions) the first time the app runs, so the Orders page shows
 * what mixed tracking looks like. Set to false to start with an empty history.
 */
const SEED_DEMO_ORDER = true;

function nextSeq() {
  const seq = read<number>(SEQ_KEY) ?? FIRST_ORDER_SEQ;
  write(SEQ_KEY, seq + 1);
  return seq;
}

function demoOrder(): Order {
  const placedAt = new Date(Date.now() - 26 * HOUR);
  const line = (id: string, qty: number, planId?: string, durationId?: string): CartLine => ({
    product: byId(id)!,
    qty,
    planId,
    durationId,
  });
  const order = buildOrder(
    {
      lines: [line("gal5", 2), line("ml500", 1, "weekly", "1y"), line("alk330", 1, "biweekly", "2y")],
      customer: { name: "Ahmed H.", phone: "+971 50 123 4567", email: "ahmed@example.com" },
      address: { line: "Villa 14, Street 21, Al Barsha 2", city: "Dubai", state: "Dubai", pincode: "00000" },
      payment: "card",
    },
    nextSeq(),
    placedAt,
  );
  // Past orders' coins are already part of BASE_COINS, so don't count them twice.
  return { ...order, coinsEarned: 0 };
}

function loadAll(): Order[] {
  let orders = read<Order[]>(ORDERS_KEY);
  if (!orders) {
    orders = SEED_DEMO_ORDER && hasStorage() ? [demoOrder()] : [];
    write(ORDERS_KEY, orders);
  }
  return orders;
}

export const ordersApi = {
  /** All orders, newest first, with every item's tracking brought up to date. */
  list(now = new Date()): Order[] {
    const synced = loadAll().map((o) => syncOrder(o, now));
    write(ORDERS_KEY, synced);
    return [...synced].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  get(id: string, now = new Date()): Order | undefined {
    return this.list(now).find((o) => o.id === id);
  },

  /**
   * Creates ONE order for the whole mixed cart. Also redeems the e-coupons paying
   * for gallons and issues any booklets bought. Throws a BookletError (with a
   * customer-facing message) if a chosen e-coupon can no longer be used.
   */
  create(input: CheckoutInput): Order {
    if (input.lines.length === 0) throw new Error("Cannot place an order with an empty cart.");
    const now = new Date();
    // Only as many coupons as there are one-time gallons are ever redeemed.
    const codes = (input.bookletCoupons ?? []).slice(0, couponEligibleUnits(input.lines));
    bookletsApi.assertRedeemable(codes, now);

    const seq = nextSeq();
    const orderId = `ORD-${seq}`;
    const extras: ItemExtras[] = input.lines.map((l) => {
      if (isDigital(l)) {
        const bookletIds = bookletsApi.issue(
          { productId: l.product.id, qty: l.qty, orderId, holder: input.customer.name, pricePaid: lineUnitPrice(l) },
          now,
        );
        return { bookletIds };
      }
      if (l.product.id === GALLON_ID && !l.planId && codes.length) return { paidWithCoupons: codes };
      return {};
    });

    const order = buildOrder({ ...input, bookletCoupons: codes }, seq, now, extras);
    write(ORDERS_KEY, [order, ...loadAll()]);
    bookletsApi.redeem(codes, order.id, now);
    write(PROFILE_KEY, { customer: input.customer, address: input.address });
    return order;
  },

  /** Contact + address from the last checkout, used to pre-fill the next one. */
  lastProfile(): { customer: Customer; address: Address } | null {
    return read(PROFILE_KEY);
  },
};
