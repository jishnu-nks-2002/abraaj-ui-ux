import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, MapPin, Navigation, Plus, Repeat, Search, ShoppingBag, X } from "lucide-react";
import { MosqueIcon } from "@/components/abraaj/HomeCategories";
import { money, plans, type Product } from "@/lib/abraaj-data";
import {
  DEFAULT_SUB_PLAN,
  GOV_LABEL,
  PLAN_OFF,
  TYPE_LABEL,
  TYPE_ORDER,
  areas,
  mapsUrl,
  norm,
  placeById,
  placeProducts,
  places,
  searchPlaces,
  subTotals,
  subUnitPrice,
  type Place,
  type PlaceType,
  type SubLine,
} from "@/lib/mosque-data";

const PAGE = 20;
const TYPE_COUNT = Object.fromEntries(TYPE_ORDER.map((t) => [t, places.filter((p) => p.type === t).length])) as Record<
  PlaceType,
  number
>;

export function MosqueScreen({
  placeId,
  onPlace,
  subLines,
  onSubscribe,
  onBuyOnce,
  onOpenSubCart,
  onBack,
}: {
  placeId: string | null;
  onPlace: (id: string) => void;
  subLines: SubLine[];
  /** Adds to the SUBSCRIPTION cart (never the normal cart). */
  onSubscribe: (product: Product, placeId: string, planId: string) => void;
  /** Adds a one-off purchase to the NORMAL cart, exactly like the Shop "+" button. */
  onBuyOnce: (product: Product) => void;
  onOpenSubCart: () => void;
  onBack: () => void;
}) {
  const place = placeById(placeId);
  const list = place ? placeProducts(place) : [];
  const totals = subTotals(subLines);

  // The picker is open until a place is chosen; "Change" re-opens it.
  const [picking, setPicking] = useState(!place);

  const [query, setQuery] = useState("");
  const [area, setArea] = useState<string | null>(null);
  const [gov, setGov] = useState<string | null>(null);
  const [type, setType] = useState<PlaceType | null>(null);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => setLimit(PAGE), [query, area, gov, type]);

  const results = useMemo(() => searchPlaces({ query, area, gov, type }), [query, area, gov, type]);

  // Area suggestions: match the typed text; otherwise the busiest areas (within the chosen governorate).
  const areaSuggestions = useMemo(() => {
    const tokens = norm(query).split(" ").filter(Boolean);
    const pool = areas.filter((a) => (!gov || a.governorate === gov) && tokens.every((t) => a.q.includes(t)));
    return pool.slice(0, tokens.length ? 8 : 10);
  }, [query, gov]);

  const hasFilter = !!(query.trim() || area || gov || type);

  function choose(p: Place) {
    onPlace(p.id);
    setPicking(false);
  }

  function clearAll() {
    setQuery("");
    setArea(null);
    setGov(null);
    setType(null);
  }

  return (
    <section className="animate-rise">
      <div className="mt-1 flex items-center justify-between gap-2">
        <button
          onClick={onBack}
          className="-ml-1 inline-flex items-center gap-1 rounded-full py-1 pr-2 text-f-xs font-semibold text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Home
        </button>
        <button
          onClick={onOpenSubCart}
          aria-label="Subscription cart"
          className="relative flex h-9 items-center gap-1.5 rounded-full bg-secondary px-3 text-f-2xs font-bold text-brand xs:h-10"
        >
          <Repeat className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">Subscriptions</span>
          {totals.count > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-primary-foreground">
              {totals.count}
            </span>
          )}
        </button>
      </div>

      <h1 className="mt-3 text-f-xl font-extrabold tracking-tight text-foreground">Mosque & community</h1>
      <p className="mt-1 text-f-sm text-muted-foreground">
        Find a place by area, then subscribe to regular deliveries.
      </p>

      {/* ------------------------------ Selected place ------------------------------ */}
      {place && !picking && (
        <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-secondary px-4 py-3">
          <MapPin className="h-4 w-4 shrink-0 text-brand" />
          <div className="min-w-0 flex-1">
            <span dir="auto" className="block truncate text-f-sm font-bold text-foreground">
              {place.name}
            </span>
            <span dir="auto" className="block truncate text-f-2xs text-muted-foreground">
              {place.area}
              {place.block ? ` · Block ${place.block}` : ""}
            </span>
          </div>
          <a
            href={mapsUrl(place)}
            target="_blank"
            rel="noreferrer"
            aria-label="Open in maps"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-background text-brand"
          >
            <Navigation className="h-4 w-4" />
          </a>
          <button
            onClick={() => setPicking(true)}
            className="shrink-0 rounded-full bg-brand px-3 py-1.5 text-f-2xs font-bold text-primary-foreground"
          >
            Change
          </button>
        </div>
      )}

      {/* ------------------------------ Picker ------------------------------ */}
      {picking && (
        <div className="mt-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-brand" />
            <input
              dir="auto"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search area or name (e.g. السالمية)"
              aria-label="Search by area or name"
              className="h-12 w-full rounded-2xl border-0 bg-secondary pr-10 pl-11 text-base text-foreground shadow-none outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-brand"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-3 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full bg-background text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Governorate */}
          <div className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Governorate">
            <Chip active={!gov} onClick={() => setGov(null)}>
              All Kuwait
            </Chip>
            {Object.entries(GOV_LABEL).map(([id, g]) => (
              <Chip key={id} active={gov === id} onClick={() => setGov(gov === id ? null : id)}>
                {g.en}
              </Chip>
            ))}
          </div>

          {/* Type */}
          <div className="no-scrollbar -mx-1 mt-1.5 flex gap-1.5 overflow-x-auto px-1 pb-1" role="group" aria-label="Place type">
            <Chip active={!type} onClick={() => setType(null)} subtle>
              All types
            </Chip>
            {TYPE_ORDER.map((t) => (
              <Chip key={t} active={type === t} onClick={() => setType(type === t ? null : t)} subtle>
                {TYPE_LABEL[t]} · {TYPE_COUNT[t]}
              </Chip>
            ))}
          </div>

          {/* Area suggestions */}
          {!area && areaSuggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-f-2xs font-bold text-muted-foreground">{query.trim() ? "Matching areas" : "Popular areas"}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {areaSuggestions.map((a) => (
                  <button
                    key={a.name}
                    onClick={() => {
                      setArea(a.name);
                      setQuery("");
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-aqua-soft px-3 py-1.5 text-f-2xs font-semibold text-foreground"
                  >
                    <MapPin className="h-3 w-3 text-brand" />
                    <span dir="auto">{a.name}</span>
                    <span className="text-muted-foreground">{a.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {area && (
            <div className="mt-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-f-2xs font-bold text-primary-foreground">
                <MapPin className="h-3 w-3" />
                <span dir="auto">{area}</span>
                <button onClick={() => setArea(null)} aria-label="Remove area filter">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          )}

          {/* Results */}
          <div className="mt-4 flex items-end justify-between gap-2">
            <h2 className="text-f-base font-bold text-foreground">{hasFilter ? "Results" : "All places"}</h2>
            <div className="flex items-center gap-2">
              <span className="text-f-2xs text-muted-foreground">{results.length} found</span>
              {hasFilter && (
                <button onClick={clearAll} className="text-f-2xs font-bold text-brand">
                  Clear
                </button>
              )}
            </div>
          </div>

          {results.length === 0 ? (
            <div className="mt-6 text-center">
              <p className="text-f-sm font-bold text-foreground">No places match</p>
              <p className="mx-auto mt-1 max-w-[16rem] text-f-xs text-muted-foreground">
                Try a different area name, or clear the filters. Names are in Arabic.
              </p>
            </div>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {results.slice(0, limit).map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => choose(p)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left transition-colors ${
                      p.id === placeId ? "bg-aqua-soft" : "bg-secondary"
                    }`}
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-background p-2 text-brand">
                      {p.kind === "mosque" ? <MosqueIcon /> : <MapPin className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span dir="auto" className="block truncate text-f-sm font-semibold text-foreground">
                        {p.name}
                      </span>
                      <span dir="auto" className="block truncate text-f-2xs text-muted-foreground">
                        {p.areaName}
                        {p.block ? ` · Block ${p.block}` : ""} · {TYPE_LABEL[p.type]}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {results.length > limit && (
            <button
              onClick={() => setLimit((n) => n + PAGE)}
              className="mt-3 w-full rounded-2xl border border-border bg-background py-2.5 text-f-xs font-bold text-foreground"
            >
              Show more ({results.length - limit} left)
            </button>
          )}
        </div>
      )}

      {/* ------------------------------ Products ------------------------------ */}
      {place && !picking && (
        <div key={place.id} className="animate-rise">
          <p className="bg-aqua-soft mt-3 rounded-2xl px-3.5 py-2.5 text-f-xs text-foreground">{place.note}</p>

          <div className="mt-5 flex items-end justify-between gap-2">
            <h2 className="text-f-base font-bold text-foreground">Needed here</h2>
            <span className="text-f-2xs text-muted-foreground">{list.length} products</span>
          </div>
          <div className="mt-3 space-y-3">
            {list.map((p) => (
              <PlaceProductCard
                key={p.id}
                product={p}
                inSub={subLines
                  .filter((l) => l.placeId === place.id && l.product.id === p.id)
                  .reduce((n, l) => n + l.qty, 0)}
                onSubscribe={(planId) => onSubscribe(p, place.id, planId)}
                onBuyOnce={() => onBuyOnce(p)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Sticky summary sits just above the promo bar + tab bar. */}
      {totals.count > 0 && (
        <div className="sticky bottom-[calc(var(--nav-h)+var(--promo-h)+0.75rem)] z-10 mt-5">
          <button
            onClick={onOpenSubCart}
            className="animate-rise flex w-full items-center gap-3 rounded-2xl bg-brand px-4 py-3 text-left text-primary-foreground shadow-[0_14px_30px_-12px_rgba(13,42,110,0.7)]"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15">
              <Repeat className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-f-sm font-bold">Subscription cart · {totals.count}</span>
              <span className="block truncate text-f-2xs text-primary-foreground/80">
                AED {money(totals.perDelivery)} per delivery round
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </button>
        </div>
      )}
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
  subtle,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  subtle?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full px-3 py-1.5 text-f-2xs font-semibold whitespace-nowrap transition-colors ${
        active
          ? "bg-brand text-primary-foreground"
          : subtle
            ? "border border-border bg-background text-muted-foreground"
            : "bg-secondary text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function PlaceProductCard({
  product,
  inSub,
  onSubscribe,
  onBuyOnce,
}: {
  product: Product;
  inSub: number;
  onSubscribe: (planId: string) => void;
  onBuyOnce: () => void;
}) {
  const [planId, setPlanId] = useState(DEFAULT_SUB_PLAN);
  const [flash, setFlash] = useState<"sub" | "once" | null>(null);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1400);
    return () => clearTimeout(t);
  }, [flash]);

  const price = subUnitPrice(product.price, planId);

  return (
    <div className="card-soft rounded-2xl p-3">
      <div className="flex items-start gap-3">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-xl">
          <img src={product.image} alt={product.name} className="max-h-[88%] w-auto object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-f-sm leading-snug font-bold text-foreground">{product.name}</p>
          <p className="truncate text-f-2xs text-muted-foreground">
            {product.size} · {product.pack}
          </p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
            <span className="text-f-base font-extrabold text-brand">AED {money(price)}</span>
            <span className="text-f-2xs text-muted-foreground line-through">AED {money(product.price)}</span>
          </div>
          <p className="text-f-2xs font-semibold text-aqua">Save {PLAN_OFF[planId]}% per delivery</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Delivery frequency">
        {plans.map((p) => (
          <button
            key={p.id}
            role="radio"
            aria-checked={planId === p.id}
            onClick={() => setPlanId(p.id)}
            className={`min-w-0 truncate rounded-xl px-1.5 py-2 text-center text-f-2xs font-semibold transition-colors ${
              planId === p.id ? "bg-brand text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <button
          onClick={() => {
            onSubscribe(planId);
            setFlash("sub");
          }}
          className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand py-2.5 text-f-xs font-bold text-primary-foreground transition-transform active:scale-[0.98]"
        >
          {flash === "sub" ? <Check className="h-4 w-4 shrink-0" /> : <Repeat className="h-4 w-4 shrink-0" />}
          <span className="truncate">{flash === "sub" ? "Added to subscriptions" : "Subscribe"}</span>
          {inSub > 0 && flash !== "sub" && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white/20 px-1 text-[10px] font-bold">
              {inSub}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            onBuyOnce();
            setFlash("once");
          }}
          aria-label={`Buy ${product.name} once`}
          className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-background px-3 py-2.5 text-f-xs font-bold text-foreground"
        >
          {flash === "once" ? <Check className="h-4 w-4 text-aqua" /> : <ShoppingBag className="h-4 w-4" />}
          <span className="hidden xs:inline">{flash === "once" ? "In cart" : "Buy once"}</span>
          {flash !== "once" && <Plus className="h-3 w-3 xs:hidden" />}
        </button>
      </div>
    </div>
  );
}