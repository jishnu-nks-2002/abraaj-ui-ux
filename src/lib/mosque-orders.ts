import { PLAN_INTERVAL_DAYS } from "@/lib/abraaj-data";
import { HOUR, MIN, addDays, startOfDay } from "@/lib/dates";
import { hasStorage, read, write } from "@/lib/storage";
import { PLAN_ONCE, placeById, subUnitPrice, type SubLine } from "@/lib/mosque-data";

/* ================================================================== */
/* Mosque orders — kept completely separate from the personal orders.   */
/* There is no fulfilment backend yet, so tracking is derived from the  */
/* order time and the chosen first-delivery day / window.               */
/* ================================================================== */

const KEY = "abraaj.mosque.orders.v1";

export type MosqueOrderItem = {
  id: string;
  productId: string;
  name: string;
  size: string;
  pack: string;
  qty: number;
  /** "once" or a subscription frequency id. */
  planId: string;
  unitPrice: number;
  listUnitPrice: number;
  placeId: string;
  placeName: string;
  placeArea: string;
  /** Subscription state (ignored for one-time items). */
  paused: boolean;
  cancelled: boolean;
};

export type MosqueOrder = {
  id: string;
  createdAt: string;
  /** First delivery day (ISO, midnight). */
  startDate: string;
  slot: string;
  payment: string;
  contact: { name: string; phone: string; notes: string };
  items: MosqueOrderItem[];
  total: number;
  saving: number;
};

/** Hour each delivery window ends its run (24h clock). */
const SLOT_HOUR: Record<string, number> = {
  "After Fajr": 7,
  "After Dhuhr": 14,
  "After Asr": 17,
  "Before Maghrib": 18,
};

export type MosqueStage = "PLACED" | "CONFIRMED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED";

export const STAGES: MosqueStage[] = ["PLACED", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"];

export const STAGE_LABEL: Record<MosqueStage, string> = {
  PLACED: "Order placed",
  CONFIRMED: "Order confirmed",
  PREPARING: "Preparing your delivery",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
};

export function isSubscriptionItem(i: MosqueOrderItem) {
  return i.planId !== PLAN_ONCE;
}

function slotHour(slot: string) {
  return SLOT_HOUR[slot] ?? 14;
}

/** When a delivery on `day` is expected to arrive. */
function deliveryAt(day: Date, slot: string) {
  const d = new Date(day);
  d.setHours(slotHour(slot), 0, 0, 0);
  return d;
}

/** Every delivery day of an item: one for one-time, a repeating series for subscriptions. */
export function deliveryDays(order: MosqueOrder, item: MosqueOrderItem, count = 60): Date[] {
  const start = startOfDay(new Date(order.startDate));
  if (!isSubscriptionItem(item)) return [start];
  const step = PLAN_INTERVAL_DAYS[item.planId] ?? 7;
  return Array.from({ length: count }, (_, i) => addDays(start, i * step));
}

/** Stage times of a single delivery on `day`. */
export function stageTimes(order: MosqueOrder, day: Date, isFirst: boolean): Record<MosqueStage, Date> {
  const created = new Date(order.createdAt);
  const arrive = deliveryAt(day, order.slot);
  const placed = isFirst ? created : addDays(startOfDay(day), -1);
  return {
    PLACED: placed,
    CONFIRMED: new Date(placed.getTime() + (isFirst ? 20 * MIN : 2 * HOUR)),
    PREPARING: new Date(Math.min(startOfDay(day).getTime(), arrive.getTime() - 3 * HOUR) + (isFirst ? 0 : 1 * HOUR)),
    OUT_FOR_DELIVERY: new Date(arrive.getTime() - 1 * HOUR),
    DELIVERED: new Date(arrive.getTime() + 1 * HOUR),
  };
}

export function currentStage(times: Record<MosqueStage, Date>, now = new Date()): MosqueStage {
  let cur: MosqueStage = "PLACED";
  for (const s of STAGES) if (now.getTime() >= times[s].getTime()) cur = s;
  return cur;
}

export type ItemStatus = {
  /** Short label for chips. */
  label: string;
  tone: "brand" | "aqua" | "muted" | "done";
  /** Stage of the delivery being tracked now (next undelivered one, or the last). */
  stage: MosqueStage;
  /** Day of the delivery being tracked. */
  trackingDay: Date;
  delivered: number;
  nextDelivery: Date | null;
  lastDelivery: Date | null;
  finished: boolean;
};

export function itemStatus(order: MosqueOrder, item: MosqueOrderItem, now = new Date()): ItemStatus {
  const days = deliveryDays(order, item);
  const doneAt = (d: Date, idx: number) => stageTimes(order, d, idx === 0).DELIVERED.getTime() <= now.getTime();
  const delivered = days.filter((d, i) => doneAt(d, i)).length;
  const lastDelivery = delivered > 0 ? days[delivered - 1]! : null;

  if (!isSubscriptionItem(item)) {
    const times = stageTimes(order, days[0]!, true);
    const stage = currentStage(times, now);
    const finished = stage === "DELIVERED";
    return {
      label: finished ? "Delivered" : STAGE_LABEL[stage],
      tone: finished ? "done" : "brand",
      stage,
      trackingDay: days[0]!,
      delivered: finished ? 1 : 0,
      nextDelivery: finished ? null : days[0]!,
      lastDelivery: finished ? days[0]! : null,
      finished,
    };
  }

  const next = days[delivered] ?? null;
  const trackIdx = Math.min(delivered, days.length - 1);
  const trackingDay = days[trackIdx]!;
  const stage = currentStage(stageTimes(order, trackingDay, trackIdx === 0), now);
  const base = { stage, trackingDay, delivered, nextDelivery: next, lastDelivery, finished: false };
  if (item.cancelled) return { ...base, label: "Cancelled", tone: "muted", nextDelivery: null, finished: true };
  if (item.paused) return { ...base, label: "Paused", tone: "aqua" };
  return { ...base, label: "Active", tone: "aqua" };
}

export function orderIsOpen(order: MosqueOrder, now = new Date()) {
  return order.items.some((i) => {
    const s = itemStatus(order, i, now);
    return isSubscriptionItem(i) ? !i.cancelled && s.delivered === 0 : !s.finished;
  });
}

export function orderStatusLabel(order: MosqueOrder, now = new Date()) {
  const statuses = order.items.map((i) => ({ i, s: itemStatus(order, i, now) }));
  const subs = statuses.filter((x) => isSubscriptionItem(x.i));
  const once = statuses.filter((x) => !isSubscriptionItem(x.i));
  if (once.length && once.every((x) => x.s.finished) && subs.length === 0) return { label: "Delivered", tone: "done" as const };
  if (once.some((x) => !x.s.finished) || subs.some((x) => x.s.delivered === 0 && !x.i.cancelled)) {
    const first = statuses.find((x) => !x.s.finished && x.s.delivered === 0);
    return { label: first ? STAGE_LABEL[first.s.stage] : "In progress", tone: "brand" as const };
  }
  if (subs.some((x) => !x.i.cancelled)) return { label: "Subscription active", tone: "aqua" as const };
  return { label: "Completed", tone: "muted" as const };
}

/* ------------------------------------------------------------------ */
/* Storage                                                              */
/* ------------------------------------------------------------------ */

function loadAll(): MosqueOrder[] {
  return read<MosqueOrder[]>(KEY) ?? [];
}

export type MosqueCheckoutInput = {
  lines: SubLine[];
  startDate: Date;
  slot: string;
  payment: string;
  name: string;
  phone: string;
  notes: string;
};

export const mosqueOrdersApi = {
  list(): MosqueOrder[] {
    if (!hasStorage()) return [];
    return [...loadAll()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  get(id: string) {
    return this.list().find((o) => o.id === id);
  },

  create(input: MosqueCheckoutInput): MosqueOrder {
    const now = new Date();
    const id = `ABJ-MOS-${Math.floor(100000 + Math.random() * 900000)}`;
    const items: MosqueOrderItem[] = input.lines.map((l, n) => {
      const place = placeById(l.placeId);
      return {
        id: `${id}-${n + 1}`,
        productId: l.product.id,
        name: l.product.name,
        size: l.product.size,
        pack: l.product.pack,
        qty: l.qty,
        planId: l.planId,
        unitPrice: subUnitPrice(l.product.price, l.planId),
        listUnitPrice: l.product.price,
        placeId: l.placeId,
        placeName: place?.name ?? "Unknown place",
        placeArea: place?.area ?? "",
        paused: false,
        cancelled: false,
      };
    });
    const round = (n: number) => Math.round(n * 1000) / 1000;
    const total = round(items.reduce((n, i) => n + i.unitPrice * i.qty, 0));
    const list = round(items.reduce((n, i) => n + i.listUnitPrice * i.qty, 0));
    const order: MosqueOrder = {
      id,
      createdAt: now.toISOString(),
      startDate: startOfDay(input.startDate).toISOString(),
      slot: input.slot,
      payment: input.payment,
      contact: { name: input.name, phone: input.phone, notes: input.notes },
      items,
      total,
      saving: round(list - total),
    };
    write(KEY, [...loadAll(), order]);
    return order;
  },

  /** Pause, resume or cancel one subscription item. */
  updateItem(orderId: string, itemId: string, patch: Partial<Pick<MosqueOrderItem, "paused" | "cancelled">>) {
    write(
      KEY,
      loadAll().map((o) =>
        o.id === orderId ? { ...o, items: o.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) } : o,
      ),
    );
  },
};

/** A delivery that already happened (for the history list). */
export type PastDelivery = {
  key: string;
  orderId: string;
  at: Date;
  item: MosqueOrderItem;
};

export function pastDeliveries(orders: MosqueOrder[], now = new Date(), limit = 40): PastDelivery[] {
  const out: PastDelivery[] = [];
  for (const o of orders) {
    for (const item of o.items) {
      const days = deliveryDays(o, item);
      days.forEach((d, idx) => {
        const at = stageTimes(o, d, idx === 0).DELIVERED;
        if (at.getTime() > now.getTime()) return;
        if (item.cancelled && idx > 0) return;
        out.push({ key: `${item.id}:${idx}`, orderId: o.id, at, item });
      });
    }
  }
  return out.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}
