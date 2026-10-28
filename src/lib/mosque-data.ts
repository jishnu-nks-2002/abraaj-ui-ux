import { byId, plans, type Product } from "@/lib/abraaj-data";
import { rawPlaces } from "@/lib/kuwait-places-raw";

/* ------------------------------------------------------------------ */
/* Mosques & community places (Kuwait)                                 */
/* ------------------------------------------------------------------ */

export type PlaceKind = "mosque" | "place";
export type PlaceType = "mosque" | "hussainiya" | "health" | "hospital" | "church" | "cemetery";

export type Place = {
  id: string;
  name: string;
  kind: PlaceKind;
  type: PlaceType;
  /** Area name (Arabic, as in the source data). */
  areaName: string;
  governorate: string;
  /** "Area, Governorate" line shown under the name. */
  area: string;
  block: string;
  street: string;
  lat: number;
  lon: number;
  /** Short line shown under the selector once the place is picked. */
  note: string;
  /** Products this place accepts, in display order. */
  productIds: string[];
  /** Normalised haystack used by the search box. */
  q: string;
};

export const TYPE_LABEL: Record<PlaceType, string> = {
  mosque: "Mosque",
  hussainiya: "Hussainiya",
  health: "Health centre",
  hospital: "Hospital",
  church: "Church",
  cemetery: "Cemetery",
};

export const TYPE_ORDER: PlaceType[] = ["mosque", "hussainiya", "health", "hospital", "church", "cemetery"];

export const GOV_LABEL: Record<string, { en: string; ar: string }> = {
  capital: { en: "Capital", ar: "العاصمة" },
  hawalli: { en: "Hawalli", ar: "حولي" },
  farwaniya: { en: "Farwaniya", ar: "الفروانية" },
  ahmadi: { en: "Ahmadi", ar: "الأحمدي" },
  jahra: { en: "Jahra", ar: "الجهراء" },
  mubarak: { en: "Mubarak Al-Kabeer", ar: "مبارك الكبير" },
};

const TYPE_PRODUCTS: Record<PlaceType, string[]> = {
  mosque: ["gal5", "ml330", "ml200", "tissue"],
  hussainiya: ["gal5", "ml330", "ml200", "tissue"],
  health: ["ml200", "ml330", "ml500", "gal5"],
  hospital: ["ml200", "ml330", "ml500", "gal5"],
  church: ["ml330", "gal5", "tissue"],
  cemetery: ["ml500", "gal5", "ml330"],
};

const TYPE_NOTE: Record<PlaceType, string> = {
  mosque: "Dispenser gallons and small bottles for worshippers after prayer.",
  hussainiya: "Gallons and small bottles for gatherings and recitation nights.",
  health: "Small bottles for patients and visitors in the waiting area.",
  hospital: "Bottles and gallons for wards, visitors and staff.",
  church: "Bottles and gallons for the congregation.",
  cemetery: "Bottles and gallons for visitors, especially in the hot months.",
};

/** Arabic-friendly normaliser: strips diacritics and folds look-alike letters. */
export function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

export const places: Place[] = rawPlaces.map(([type, name, gov, areaName, block, street, lat, lon], i) => {
  const t = type as PlaceType;
  const g = GOV_LABEL[gov];
  return {
    id: `kw-${i}`,
    name,
    kind: t === "mosque" ? "mosque" : "place",
    type: t,
    areaName,
    governorate: gov,
    area: `${areaName}, ${g.ar}`,
    block,
    street,
    lat,
    lon,
    note: TYPE_NOTE[t],
    productIds: TYPE_PRODUCTS[t],
    q: norm(`${name} ${areaName} ${g.ar} ${g.en} ${TYPE_LABEL[t]} ${street} block ${block}`),
  };
});

const byPlaceId = new Map(places.map((p) => [p.id, p]));

export function placeById(id: string | null | undefined) {
  return id ? byPlaceId.get(id) : undefined;
}

export function placeProducts(place: Place): Product[] {
  return place.productIds.map(byId).filter(Boolean) as Product[];
}

/** Every area in the data with its place count, biggest first. */
export type AreaInfo = { name: string; governorate: string; count: number; q: string };

export const areas: AreaInfo[] = (() => {
  const m = new Map<string, AreaInfo>();
  for (const p of places) {
    const a = m.get(p.areaName);
    if (a) a.count++;
    else
      m.set(p.areaName, {
        name: p.areaName,
        governorate: p.governorate,
        count: 1,
        q: norm(`${p.areaName} ${GOV_LABEL[p.governorate].en}`),
      });
  }
  return [...m.values()].sort((a, b) => b.count - a.count);
})();

export function searchPlaces(opts: { query: string; area: string | null; gov: string | null; type: PlaceType | null }) {
  const tokens = norm(opts.query).split(" ").filter(Boolean);
  return places.filter(
    (p) =>
      (!opts.area || p.areaName === opts.area) &&
      (!opts.gov || p.governorate === opts.gov) &&
      (!opts.type || p.type === opts.type) &&
      tokens.every((t) => p.q.includes(t)),
  );
}

export function mapsUrl(p: Pick<Place, "lat" | "lon">) {
  return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`;
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