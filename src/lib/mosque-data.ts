import { byId, plans, type Product } from "@/lib/abraaj-data";

/* ------------------------------------------------------------------ */
/* Mosques & community places                                          */
/* ------------------------------------------------------------------ */

export type PlaceKind = "mosque" | "place";

export type Place = {
  id: string;
  name: string;
  kind: PlaceKind;
  area: string;
  /** Short line shown under the selector once the place is picked. */
  note: string;
  /** Products this place accepts, in display order. */
  productIds: string[];
};

export const places: Place[] = [
  {
    id: "jumeirah",
    name: "Jumeirah Mosque",
    kind: "mosque",
    area: "Jumeirah 1, Dubai",
    note: "Dispenser gallons and small bottles for worshippers after prayer.",
    productIds: ["gal5", "ml200", "ml330", "tissue"],
  },
  {
    id: "al-farooq",
    name: "Al Farooq Omar Bin Al Khattab Mosque",
    kind: "mosque",
    area: "Al Safa, Dubai",
    note: "Large congregation on Fridays — gallons and 330 ml packs go fastest.",
    productIds: ["gal5", "ml330", "ml500", "tissue"],
  },
  {
    id: "al-barsha",
    name: "Al Barsha Community Mosque",
    kind: "mosque",
    area: "Al Barsha 2, Dubai",
    note: "Neighbourhood mosque close to your saved address.",
    productIds: ["gal5", "ml200", "tissue"],
  },
  {
    id: "bur-dubai",
    name: "Grand Mosque",
    kind: "mosque",
    area: "Bur Dubai",
    note: "Visitor-heavy — small bottles are handed out at the entrance.",
    productIds: ["ml200", "ml330", "gal5", "tissue"],
  },
  {
    id: "iftar-tent",
    name: "Ramadan Iftar Tent",
    kind: "place",
    area: "Al Barsha Pond Park, Dubai",
    note: "Daily iftar service — 200 ml bottles and tissues for every tray.",
    productIds: ["ml200", "ml330", "tissue"],
  },
  {
    id: "al-quoz",
    name: "Workers' Accommodation",
    kind: "place",
    area: "Al Quoz Industrial 3, Dubai",
    note: "Keep a site supplied through the hot months.",
    productIds: ["gal5", "ml500", "l15"],
  },
];

export function placeById(id: string | null | undefined) {
  return places.find((p) => p.id === id);
}

export function placeProducts(place: Place): Product[] {
  return place.productIds.map(byId).filter(Boolean) as Product[];
}

/* ------------------------------------------------------------------ */
/* Subscription pricing                                                */
/* ------------------------------------------------------------------ */

/** Discount per delivery frequency — mirrors the "Save x%" labels on `plans`. */
export const PLAN_OFF: Record<string, number> = {
  weekly: 15,
  biweekly: 10,
  monthly: 5,
};

export const DEFAULT_SUB_PLAN = "weekly";

export function subUnitPrice(price: number, planId: string) {
  const off = PLAN_OFF[planId] ?? 0;
  return Math.round(price * (1 - off / 100) * 100) / 100;
}

export function planLabel(planId: string) {
  return plans.find((p) => p.id === planId);
}

/* ------------------------------------------------------------------ */
/* Subscription cart                                                   */
/* ------------------------------------------------------------------ */

/**
 * A line in the Subscription Cart. Kept completely separate from the normal
 * product cart: one line per product + place + frequency, so the same product
 * can be subscribed for two different mosques.
 */
export type SubLine = {
  product: Product;
  placeId: string;
  planId: string;
  qty: number;
};

export function subLineKey(l: Pick<SubLine, "placeId" | "planId"> & { product: { id: string } }) {
  return `${l.placeId}:${l.product.id}:${l.planId}`;
}

export function subTotals(lines: SubLine[]) {
  const list = lines.reduce((n, l) => n + l.qty * l.product.price, 0);
  const perDelivery = lines.reduce((n, l) => n + l.qty * subUnitPrice(l.product.price, l.planId), 0);
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    list: round(list),
    perDelivery: round(perDelivery),
    saving: round(list - perDelivery),
    count: lines.reduce((n, l) => n + l.qty, 0),
  };
}

/** The next `days` calendar days, starting tomorrow, for the start-date picker. */
export function upcomingDays(days = 7, from = new Date()) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(from);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i + 1);
    return d;
  });
}

export const deliverySlots = ["After Fajr", "After Dhuhr", "After Asr", "Before Maghrib"] as const;
